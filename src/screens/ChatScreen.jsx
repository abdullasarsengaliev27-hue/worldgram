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
  'Какое событие тебя вдохновило?',
  'Что смотришь сейчас?',
  'Как настроение сегодня?',
];

export default function ChatScreen({ route, navigation }) {
  const { chatId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [chatBackground, setChatBackground] = useState('default');
  const flatListRef = useRef(null);

  useEffect(() => {
    getUser();
    fetchMessages();
    loadSuggestions();
    loadBackground();
  
    const subscription = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.find(m => m.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();
  
    return () => supabase.removeChannel(subscription);
  }, [chatId]);

  useEffect(() => {
    if (route.params?.chatBackground) {
      setChatBackground(route.params.chatBackground);
    }
  }, [route.params?.chatBackground]);

  const loadBackground = async () => {
    const { data } = await supabase
      .from('chats').select('chat_background').eq('id', chatId).single();
    if (data?.chat_background) setChatBackground(data.chat_background);
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
    const { data } = await supabase
      .from('messages').select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
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
            member.user_id,
            `💬 ${senderName}`,
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

    const tempMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId, sender_id: userId, content,
      created_at: new Date().toISOString(),
      reply_to_content: replyTo?.content || null,
      reply_to_sender: replyTo?.sender_id || null,
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { data } = await supabase.from('messages').insert({
      chat_id: chatId, sender_id: userId, content,
      reply_to_content: replyTo?.content || null,
      reply_to_sender: replyTo?.sender_id || null,
    }).select().single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
    }

    sendPushNotification(content);
    loadSuggestions();
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
      });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const showMediaOptions = () => {
    Alert.alert('Отправить фото', 'Выбери источник', [
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

  const bg = getBackground(chatBackground);

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === userId;
    const isImage = isImageMessage(item.content);
    const prevItem = messages[index - 1];
    const showTime = !prevItem ||
      new Date(item.created_at) - new Date(prevItem.created_at) > 300000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
        )}
        <TouchableOpacity
          style={[styles.messageRow, isMe && styles.messageRowMe]}
          onLongPress={() => setReplyTo(item)}
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
              <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                {formatTime(item.created_at)} {isMe && '✓'}
              </Text>
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
              <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                {formatTime(item.created_at)} {isMe && '✓'}
              </Text>
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

      {/* Фирменный фон Worldgram */}
      {bg.branded && (
        <View style={styles.brandedBg}>
          <Text style={styles.brandedLogo}>W</Text>
          <Text style={styles.brandedText}>Worldgram</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg.colors[0] }]}>
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
            <Text style={styles.headerStatus}>● Онлайн</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Call', { userName })}
          >
            <Ionicons name="videocam" size={20} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('ChatBackground', {
              chatId, currentBackground: chatBackground,
            })}
          >
            <Ionicons name="color-palette-outline" size={20} color="#6C63FF" />
          </TouchableOpacity>
          {route.params?.isGroup && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('GroupInfo', {
                chatId, groupName: userName,
                groupAvatar: route.params?.groupAvatar,
              })}
            >
              <Ionicons name="information-circle-outline" size={22} color="#6C63FF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI подсказки */}
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { backgroundColor: bg.colors[0] }]}>
          <View style={styles.suggestionsHeader}>
            <View style={styles.suggestionsTitleRow}>
              <Ionicons name="bulb" size={14} color="#6C63FF" />
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
              <Ionicons name="refresh" size={20} color="#6C63FF" />
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

      {/* Панель ответа */}
      {replyTo && (
        <View style={[styles.replyPanel, { backgroundColor: bg.colors[0] }]}>
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
      <View style={[styles.inputRow, { backgroundColor: bg.colors[0] }]}>
        {!showSuggestions && (
          <TouchableOpacity style={styles.aiBtn} onPress={() => setShowSuggestions(true)}>
            <Ionicons name="bulb" size={20} color="#6C63FF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.mediaBtn} onPress={showMediaOptions} disabled={uploading}>
          <Ionicons name={uploading ? 'hourglass' : 'camera'} size={20}
            color={uploading ? '#555' : '#6C63FF'} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            placeholderTextColor="#555"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandedBg: {
    position: 'absolute', alignSelf: 'center',
    top: '40%', alignItems: 'center', opacity: 0.05, zIndex: 0,
  },
  brandedLogo: { fontSize: 100, fontWeight: 'bold', color: '#6C63FF' },
  brandedText: { fontSize: 30, color: '#6C63FF', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
    gap: 10, zIndex: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(26,26,46,0.8)', alignItems: 'center', justifyContent: 'center',
  },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  avatarImage: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#0D0D1A',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: '#4CAF50', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(26,26,46,0.8)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  suggestionsContainer: {
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E', paddingVertical: 10, zIndex: 1,
  },
  suggestionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 8,
  },
  suggestionsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionsTitle: { color: '#6C63FF', fontSize: 12, fontWeight: 'bold' },
  suggestionCard: {
    backgroundColor: 'rgba(26,26,46,0.8)', borderRadius: 14,
    padding: 12, marginLeft: 12, maxWidth: 180,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  suggestionText: { color: '#fff', fontSize: 13, marginBottom: 6, lineHeight: 18 },
  suggestionSend: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  refreshCard: {
    backgroundColor: 'rgba(26,26,46,0.8)', borderRadius: 14,
    padding: 12, marginLeft: 12, marginRight: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E', width: 65, gap: 4,
  },
  refreshText: { color: '#6C63FF', fontSize: 11 },
  messagesList: { padding: 16, paddingBottom: 8 },
  timeLabel: {
    textAlign: 'center', color: 'rgba(255,255,255,0.3)',
    fontSize: 11, marginVertical: 12,
  },
  messageRow: { marginBottom: 4, alignItems: 'flex-start' },
  messageRowMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12, paddingBottom: 8 },
  replyPreviewInBubble: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8,
    padding: 6, marginBottom: 6,
    borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  replyPreviewText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  messageTime: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10,
    marginTop: 4, alignSelf: 'flex-end',
  },
  messageTimeMe: { color: 'rgba(255,255,255,0.6)' },
  imageBubble: {
    maxWidth: '75%', borderRadius: 18,
    overflow: 'hidden', borderBottomLeftRadius: 4,
  },
  imageBubbleMe: { borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  messageImage: { width: 220, height: 180 },
  replyPanel: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderTopWidth: 1, borderTopColor: '#1A1A2E', gap: 10,
  },
  replyPanelLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyPanelInfo: { flex: 1 },
  replyPanelLabel: { color: '#6C63FF', fontSize: 11, fontWeight: 'bold' },
  replyPanelText: { color: '#888', fontSize: 13, marginTop: 2 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 50, marginBottom: 12 },
  emptyChatText: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  inputRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
    alignItems: 'flex-end', gap: 8, zIndex: 1,
  },
  aiBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(26,26,46,0.8)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  mediaBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(26,26,46,0.8)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  inputContainer: {
    flex: 1, backgroundColor: 'rgba(26,26,46,0.8)',
    borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: { color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  sendBtnDisabled: { opacity: 0.3 },
});
