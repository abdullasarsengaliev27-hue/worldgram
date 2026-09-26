import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { sendPushToUser, showLocalNotification } from '../lib/notifications';
import { getBackground } from '../lib/backgrounds';

const AI_SUGGESTIONS = [
  'Как прошёл твой день?',
  'Что планируешь на выходные?',
  'Расскажи что нового у тебя!',
  'Как твои дела с работой?',
  'Куда собираешься в этом месяце?',
  'Что смотришь сейчас?',
  'Как настроение сегодня?',
];

export default function ChatScreen({ route, navigation }) {
  const { chatId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [chatBackground, setChatBackground] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    loadBackground(); // ← первым!
    getUser();
    fetchMessages();
    loadSuggestions();
  
    const msgSubscription = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        if (payload.new.deleted_for_all) return;
        setMessages(prev => {
          const exists = prev.find(m => m.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        // Отмечаем как прочитанное
        markAsRead(payload.new.id, payload.new.sender_id);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.new.id ? { ...m, ...payload.new } : m
        ));
      })
      .subscribe();

    // Подписка на статус печатает
    const typingSubscription = supabase
      .channel(`typing-${chatId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'typing_status',
        filter: `chat_id=eq.${chatId}`,
      }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (payload.new?.user_id !== user?.id) {
          setPartnerTyping(payload.new?.is_typing || false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSubscription);
      supabase.removeChannel(typingSubscription);
      clearTypingStatus();
    };
  }, [chatId]);

  useEffect(() => {
    if (route.params?.chatBackground) {
      setChatBackground(route.params.chatBackground);
    }
  }, [route.params?.chatBackground]);

  const markAsRead = async (messageId, senderId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (senderId !== user?.id) {
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    }
  };

  const loadBackground = async () => {
    try {
      const { data } = await supabase
        .from('chats')
        .select('chat_background')
        .eq('id', chatId)
        .single();
  
      if (data?.chat_background && data.chat_background !== 'default') {
        setChatBackground(data.chat_background);
      }
    } catch (e) { }
  };

  const loadSuggestions = () => {
    const shuffled = [...AI_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  };

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const { data } = await supabase
      .from('messages').select('*')
      .eq('chat_id', chatId)
      .eq('deleted_for_all', false)
      .order('created_at', { ascending: true });
  
    if (data) {
      const filtered = data.filter(m =>
        !m.deleted_for_me?.includes(user.id)
      );
      setMessages(filtered);
  
      // Помечаем все непрочитанные сообщения как прочитанные
      const unread = filtered.filter(m =>
        m.sender_id !== user.id && !m.is_read
      );
  
      if (unread.length > 0) {
        for (const msg of unread) {
          await supabase.from('messages')
            .update({ is_read: true })
            .eq('id', msg.id);
        }
      }
    }
  };

  const updateTypingStatus = async (typing) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('typing_status').upsert({
      chat_id: chatId,
      user_id: user.id,
      is_typing: typing,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chat_id,user_id' });
  };

  const clearTypingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('typing_status')
      .update({ is_typing: false })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const sendPushNotification = async (content) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: members } = await supabase
        .from('chat_members').select('user_id')
        .eq('chat_id', chatId).neq('user_id', user.id);
      if (members?.length > 0) {
        const { data: senderProfile } = await supabase
          .from('profiles').select('full_name, username')
          .eq('id', user.id).single();
        const senderName = senderProfile?.full_name || senderProfile?.username || 'Пользователь';
        for (const member of members) {
          await sendPushToUser(
            member.user_id, `💬 ${senderName}`,
            content.startsWith('[IMAGE]') ? '📸 Фото' : content,
            { type: 'message', chatId }
          );
        }
      }
    } catch (e) { }
  };

  const sendMessage = async (text) => {
    const content = text || newMessage.trim();
    if (!content) return;

    clearTimeout(typingTimer.current);
    setIsTyping(false);
    updateTypingStatus(false);

    const tempMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId, sender_id: userId, content,
      created_at: new Date().toISOString(),
      reply_to_content: replyTo?.content || null,
      reply_to_sender: replyTo?.sender_id || null,
      is_read: false, is_delivered: false,
      deleted_for_all: false, deleted_for_me: [],
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { data } = await supabase.from('messages').insert({
      chat_id: chatId, sender_id: userId, content,
      reply_to_content: replyTo?.content || null,
      reply_to_sender: replyTo?.sender_id || null,
      is_delivered: true,
    }).select().single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
    }

    sendPushNotification(content);
    loadSuggestions();
  };

  const deleteMessage = (message) => {
    const isMe = message.sender_id === userId;
    const options = [
      { text: 'Отмена', style: 'cancel' },
      {
        text: '🗑 Удалить у себя',
        onPress: async () => {
          const currentDeleted = message.deleted_for_me || [];
          if (!currentDeleted.includes(userId)) {
            await supabase.from('messages')
              .update({
                deleted_for_me: [...currentDeleted, userId]
              })
              .eq('id', message.id);
          }
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      },
    ];
  
    if (isMe) {
      options.push({
        text: '🗑 Удалить у всех',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages')
            .update({
              deleted_for_all: true,
              content: '🗑 Сообщение удалено',
            })
            .eq('id', message.id);
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      });
    }
  
    Alert.alert('Сообщение', 'Что сделать?', options);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа', 'Разреши доступ к галерее'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) await uploadImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа', 'Разреши доступ к камере'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) await uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);
      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { decode } = require('base64-arraybuffer');
      const arrayBuffer = decode(base64Data);
      const { error: uploadError } = await supabase.storage
        .from('chat-media').upload(fileName, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await supabase.from('messages').insert({
        chat_id: chatId, sender_id: userId,
        content: `[IMAGE]${urlData.publicUrl}`,
        is_delivered: true,
      });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const showMediaOptions = () => {
    Alert.alert('Отправить фото', '', [
      { text: '📷 Камера', onPress: takePhoto },
      { text: '🖼 Галерея', onPress: pickImage },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });

  const isImageMessage = (content) => content?.startsWith('[IMAGE]');
  const getImageUrl = (content) => content?.replace('[IMAGE]', '');
  const getReplyPreview = (content) => {
    if (!content) return '';
    if (isImageMessage(content)) return '📸 Фото';
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  };

  const getMessageStatus = (message) => {
    if (message.sender_id !== userId) return null;
    if (message.id?.startsWith('temp-')) return '🕐';
    if (message.is_read) return '✓✓';
    if (message.is_delivered) return '✓✓';
    return '✓';
  };

  const getStatusColor = (message) => {
    if (message.id?.startsWith('temp-')) return 'rgba(255,255,255,0.3)';
    if (message.is_read) return '#6C63FF';
    if (message.is_delivered) return 'rgba(255,255,255,0.5)';
    return 'rgba(255,255,255,0.3)';
  };

  const bg = getBackground(chatBackground);

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === userId;
    const isImage = isImageMessage(item.content);
    const prevItem = messages[index - 1];
    const showTime = !prevItem ||
      new Date(item.created_at) - new Date(prevItem.created_at) > 300000;
    const status = getMessageStatus(item);
    const statusColor = getStatusColor(item);

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
        )}
        <TouchableOpacity
          style={[styles.messageRow, isMe && styles.messageRowMe]}
          onLongPress={() => {
            Alert.alert('Сообщение', '', [
              { text: 'Отмена', style: 'cancel' },
              { text: '↩ Ответить', onPress: () => setReplyTo(item) },
              {
                text: '🗑 Удалить', style: 'destructive',
                onPress: () => deleteMessage(item)
              },
            ]);
          }}
          activeOpacity={0.8}
        >
          {isImage ? (
            <View style={[styles.imageBubble, isMe && styles.imageBubbleMe]}>
              {item.reply_to_content && (
                <View style={styles.replyPreviewInBubble}>
                  <Text style={styles.replyPreviewText}>↩ {getReplyPreview(item.reply_to_content)}</Text>
                </View>
              )}
              <Image
                source={{ uri: getImageUrl(item.content) }}
                style={styles.messageImage} resizeMode="cover"
              />
              <View style={styles.messageFooter}>
                <Text style={[styles.messageTime, { color: 'rgba(255,255,255,0.7)' }]}>
                  {formatTime(item.created_at)}
                </Text>
                {status && <Text style={[styles.statusIcon, { color: statusColor }]}>{status}</Text>}
              </View>
            </View>
          ) : (
            <View style={[styles.bubble, {
              backgroundColor: isMe ? bg.bubbleMe : bg.bubbleThem,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
            }]}>
              {item.reply_to_content && (
                <View style={styles.replyPreviewInBubble}>
                  <Text style={styles.replyPreviewText}>↩ {getReplyPreview(item.reply_to_content)}</Text>
                </View>
              )}
              <Text style={styles.messageText}>{item.content}</Text>
              <View style={styles.messageFooter}>
                <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                  {formatTime(item.created_at)}
                </Text>
                {status && (
                  <Text style={[styles.statusIcon, { color: statusColor }]}>{status}</Text>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg.colors[0] }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" />

      {/* Фирменный фон */}
      {bg.branded && (
        <View style={styles.brandedBg}>
          <Text style={styles.brandedLogo}>W</Text>
          <Text style={styles.brandedText}>Worldgram</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg.colors[0] + 'EE' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => {
            if (route.params?.userId) {
              navigation.navigate('UserProfile', { userId: route.params.userId });
            }
          }}
        >
          {route.params?.avatarUrl ? (
            <Image source={{ uri: route.params.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName?.[0]?.toUpperCase() || '?'}</Text>
              <View style={styles.onlineDot} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{userName}</Text>
            <Text style={styles.headerStatus}>
              {partnerTyping ? '✏️ печатает...' : '● Онлайн'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Call', { userName })}
          >
            <Ionicons name="videocam" size={18} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('ChatBackground', {
              chatId, currentBackground: chatBackground,
            })}
          >
            <Ionicons name="color-palette-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
          {route.params?.isGroup && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('GroupInfo', {
                chatId, groupName: userName,
                groupAvatar: route.params?.groupAvatar,
              })}
            >
              <Ionicons name="information-circle-outline" size={20} color="#6C63FF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI подсказки */}
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <View style={styles.suggestionsHeader}>
            <View style={styles.suggestionsTitleRow}>
              <Ionicons name="bulb" size={13} color="#6C63FF" />
              <Text style={styles.suggestionsTitle}>Идеи для разговора</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSuggestions(false)}>
              <Ionicons name="close" size={16} color="#555" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionCard} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
                <Text style={styles.suggestionSend}>Отправить →</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.refreshCard} onPress={loadSuggestions}>
              <Ionicons name="refresh" size={18} color="#6C63FF" />
              <Text style={styles.refreshText}>Ещё</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Сообщения */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>👋</Text>
            <Text style={styles.emptyChatText}>Начни разговор!</Text>
          </View>
        }
      />

      {/* Индикатор печатает */}
      {partnerTyping && (
        <View style={[styles.typingContainer, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>● ● ●</Text>
            <Text style={styles.typingText}>{userName} печатает</Text>
          </View>
        </View>
      )}

      {/* Панель ответа */}
      {replyTo && (
        <View style={[styles.replyPanel, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <View style={styles.replyPanelLeft}>
            <Ionicons name="return-up-back" size={16} color="#6C63FF" />
            <View style={styles.replyPanelInfo}>
              <Text style={styles.replyPanelLabel}>Ответ на сообщение</Text>
              <Text style={styles.replyPanelText} numberOfLines={1}>
                {getReplyPreview(replyTo.content)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: bg.colors[0] + 'EE' }]}>
        <TouchableOpacity
          style={styles.inputIconBtn}
          onPress={() => setShowSuggestions(!showSuggestions)}
        >
          <Ionicons name="bulb-outline" size={20} color={showSuggestions ? '#6C63FF' : '#555'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.inputIconBtn}
          onPress={showMediaOptions}
          disabled={uploading}
        >
          <Ionicons
            name={uploading ? 'hourglass' : 'camera-outline'}
            size={20} color={uploading ? '#555' : '#888'}
          />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            placeholderTextColor="#555"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={17} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandedBg: {
    position: 'absolute', alignSelf: 'center',
    top: '38%', alignItems: 'center', opacity: 0.04, zIndex: 0,
  },
  brandedLogo: { fontSize: 110, fontWeight: 'bold', color: '#6C63FF' },
  brandedText: { fontSize: 28, color: '#6C63FF', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10, zIndex: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#0D0D1A',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerStatus: { fontSize: 11, color: '#4CAF50', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionsContainer: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8, zIndex: 1,
  },
  suggestionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 8,
  },
  suggestionsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionsTitle: { color: '#6C63FF', fontSize: 12, fontWeight: '700' },
  suggestionCard: {
    backgroundColor: 'rgba(108,99,255,0.12)', borderRadius: 12,
    padding: 10, marginLeft: 12, maxWidth: 170,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
  },
  suggestionText: { color: '#fff', fontSize: 12, marginBottom: 5, lineHeight: 17 },
  suggestionSend: { color: '#6C63FF', fontSize: 10, fontWeight: '700' },
  refreshCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    padding: 10, marginLeft: 10, marginRight: 12,
    alignItems: 'center', justifyContent: 'center',
    width: 60, gap: 3,
  },
  refreshText: { color: '#6C63FF', fontSize: 10 },
  messagesList: { padding: 14, paddingBottom: 6 },
  timeLabel: {
    textAlign: 'center', color: 'rgba(255,255,255,0.25)',
    fontSize: 11, marginVertical: 10,
  },
  messageRow: { marginBottom: 3, alignItems: 'flex-start' },
  messageRowMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 10, paddingBottom: 6 },
  replyPreviewInBubble: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8,
    padding: 6, marginBottom: 5,
    borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.4)',
  },
  replyPreviewText: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 4, marginTop: 3,
  },
  messageTime: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  messageTimeMe: { color: 'rgba(255,255,255,0.55)' },
  statusIcon: { fontSize: 11, fontWeight: '700' },
  imageBubble: {
    maxWidth: '75%', borderRadius: 16,
    overflow: 'hidden', borderBottomLeftRadius: 4,
  },
  imageBubbleMe: { borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  messageImage: { width: 220, height: 180 },
  typingContainer: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  typingDots: { color: '#6C63FF', fontSize: 10, letterSpacing: 2 },
  typingText: { color: '#888', fontSize: 12 },
  replyPanel: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)', gap: 10,
  },
  replyPanelLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyPanelInfo: { flex: 1 },
  replyPanelLabel: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  replyPanelText: { color: '#666', fontSize: 12, marginTop: 2 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 10 },
  emptyChatText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  inputRow: {
    flexDirection: 'row', padding: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    alignItems: 'flex-end', gap: 6, zIndex: 1,
  },
  inputIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  inputContainer: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22, paddingHorizontal: 14,
    paddingVertical: 9, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: { color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  sendBtnDisabled: { opacity: 0.3 },
});
