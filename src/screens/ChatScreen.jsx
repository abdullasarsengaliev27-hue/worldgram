import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Image,
  Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { sendPushToUser } from '../lib/notifications';
import { getBackground } from '../lib/backgrounds';
import { formatLastSeen } from '../lib/presence';

const AI_SUGGESTIONS = [
  'Как прошёл твой день?',
  'Что планируешь на выходные?',
  'Расскажи что нового у тебя!',
  'Как твои дела с работой?',
  'Что смотришь сейчас?',
  'Как настроение сегодня?',
];

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '👏'];
const SELF_DESTRUCT_OPTIONS = [
  { label: '10 секунд', seconds: 10 },
  { label: '1 минута', seconds: 60 },
  { label: '1 час', seconds: 3600 },
  { label: '24 часа', seconds: 86400 },
  { label: 'Выкл', seconds: null },
];

// Человек онлайн, только если приложение недавно "отстукивалось"
const isUserOnline = (p) => {
  if (!p || p.online_visible === false || !p.is_online || !p.last_seen) return false;
  return Date.now() - new Date(p.last_seen).getTime() < 70000;
};

export default function ChatScreen({ route, navigation }) {
  const { chatId, userName } = route.params;
  const isGroup = !!route.params?.isGroup;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [chatBackground, setChatBackground] = useState('default');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partner, setPartner] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [selfDestructSeconds, setSelfDestructSeconds] = useState(null);
  const [showSelfDestruct, setShowSelfDestruct] = useState(false);
  const [, setTick] = useState(0);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const userIdRef = useRef(null);
  const myNameRef = useRef('Пользователь');
  const timersRef = useRef([]);

  // Раз в 30 секунд обновляем статус "в сети"
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Основная подписка на сообщения и "печатает"
  useEffect(() => {
    getUser();
    fetchMessages();
    loadSuggestions();
    loadBackground();

    const stamp = Date.now();

    const msgSub = supabase
      .channel(`chat-${chatId}-${stamp}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const msg = payload.new;
        if (msg.deleted_for_all) return;
        if (msg.deleted_for_me?.includes(userIdRef.current)) return;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scheduleExpiry(msg);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        markAsRead(msg.id, msg.sender_id);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        if (payload.new.deleted_for_all) {
          setMessages(prev => prev.filter(m => m.id !== payload.new.id));
        } else {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ));
        }
      })
      .subscribe();

    const typingSub = supabase
      .channel(`typing-${chatId}-${stamp}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'typing_status',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        if (payload.new?.user_id && payload.new.user_id !== userIdRef.current) {
          setPartnerTyping(!!payload.new.is_typing);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(typingSub);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      clearTimeout(typingTimer.current);
      clearTypingStatus();
    };
  }, [chatId]);

  // Фон перечитываем каждый раз, когда возвращаемся на этот экран
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadBackground);
    return unsub;
  }, [navigation, chatId]);

  // Профиль собеседника (статус онлайн) — только для личных чатов
  useEffect(() => {
    const partnerId = route.params?.userId;
    if (!partnerId || isGroup) return;

    supabase
      .from('profiles')
      .select('is_online, last_seen, online_visible, last_seen_visibility')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => { if (data) setPartner(data); });

    const ch = supabase
      .channel(`partner-${partnerId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `id=eq.${partnerId}`,
      }, (payload) => {
        setPartner(prev => ({ ...(prev || {}), ...payload.new }));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [route.params?.userId]);

  const scheduleExpiry = (msg) => {
    if (!msg.self_destruct_at || String(msg.id).startsWith('temp-')) return;
    const ms = new Date(msg.self_destruct_at).getTime() - Date.now();
    const remove = () => setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (ms <= 0) {
      remove();
    } else {
      timersRef.current.push(setTimeout(remove, ms));
    }
  };

  const loadBackground = async () => {
    try {
      const { data } = await supabase
        .from('chats').select('chat_background').eq('id', chatId).single();
      if (data?.chat_background) setChatBackground(data.chat_background);
    } catch (e) { }
  };

  const loadSuggestions = () => {
    const shuffled = [...AI_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  };

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('profiles').select('full_name, username').eq('id', user.id).single();
      myNameRef.current = data?.full_name || data?.username || 'Пользователь';
    }
  };

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('messages').select('*')
      .eq('chat_id', chatId)
      .eq('deleted_for_all', false)
      .order('created_at', { ascending: true });
    if (!data) return;

    const now = Date.now();
    const visible = data.filter(m =>
      !m.deleted_for_me?.includes(user.id) &&
      (!m.self_destruct_at || new Date(m.self_destruct_at).getTime() > now)
    );

    setMessages(visible);
    visible.forEach(scheduleExpiry);
    fetchReactions(visible.map(m => m.id));

    const unreadIds = visible
      .filter(m => m.sender_id !== user.id && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
    }
  };

  const fetchReactions = async (messageIds) => {
    if (!messageIds.length) return;
    const { data } = await supabase
      .from('message_reactions').select('*').in('message_id', messageIds);
    if (data) {
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = {};
        if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = [];
        grouped[r.message_id][r.emoji].push(r.user_id);
      });
      setMessageReactions(grouped);
    }
  };

  const markAsRead = async (messageId, senderId) => {
    if (senderId && senderId !== userIdRef.current) {
      await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
    }
  };

  const updateTypingStatus = async (typing) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase.from('typing_status').upsert({
      chat_id: chatId, user_id: uid,
      is_typing: typing, updated_at: new Date().toISOString(),
    }, { onConflict: 'chat_id,user_id' });
  };

  const clearTypingStatus = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase.from('typing_status')
      .update({ is_typing: false })
      .eq('chat_id', chatId).eq('user_id', uid);
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (!isTyping) { setIsTyping(true); updateTypingStatus(true); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false); updateTypingStatus(false);
    }, 2000);
  };

  const showSendError = () => {
    Alert.alert(
      'Сообщение не отправлено',
      'Проверь интернет. Возможно, пользователь ограничил получение сообщений.'
    );
  };

  const sendMessage = async (text) => {
    const content = text || newMessage.trim();
    if (!content) return;

    clearTimeout(typingTimer.current);
    setIsTyping(false);
    updateTypingStatus(false);

    // Режим редактирования
    if (editingMessage) {
      const { error } = await supabase.from('messages').update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      }).eq('id', editingMessage.id);
      if (error) {
        Alert.alert('Ошибка', 'Не удалось изменить сообщение');
        return;
      }
      setMessages(prev => prev.map(m =>
        m.id === editingMessage.id ? { ...m, content, is_edited: true } : m
      ));
      setEditingMessage(null);
      setNewMessage('');
      return;
    }

    let selfDestructAt = null;
    if (selfDestructSeconds) {
      selfDestructAt = new Date(Date.now() + selfDestructSeconds * 1000).toISOString();
    }

    const tempMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId, sender_id: userId, content,
      created_at: new Date().toISOString(),
      reply_to_content: replyTo?.content || null,
      is_read: false, is_delivered: false,
      is_edited: false, deleted_for_all: false, deleted_for_me: [],
      self_destruct_at: selfDestructAt,
    };

    const replySnapshot = replyTo;
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { data, error } = await supabase.from('messages').insert({
      chat_id: chatId, sender_id: userId, content,
      reply_to_content: replySnapshot?.content || null,
      reply_to_sender: replySnapshot?.sender_id || null,
      is_delivered: true,
      self_destruct_after: selfDestructSeconds,
      self_destruct_at: selfDestructAt,
    }).select().single();

    if (error || !data) {
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      if (!text) setNewMessage(content);
      showSendError();
      return;
    }

    // Заменяем временное сообщение настоящим (без дублей)
    setMessages(prev => {
      if (prev.some(m => m.id === data.id)) {
        return prev.filter(m => m.id !== tempMessage.id);
      }
      return prev.map(m => m.id === tempMessage.id ? data : m);
    });

    if (selfDestructSeconds) {
      timersRef.current.push(setTimeout(async () => {
        await supabase.from('messages')
          .update({ deleted_for_all: true }).eq('id', data.id);
        setMessages(prev => prev.filter(m => m.id !== data.id));
      }, selfDestructSeconds * 1000));
    }

    sendPushNotification(content);
    handleMentions(content, data.id);
    loadSuggestions();
  };

  const sendPushNotification = async (content) => {
    try {
      const { data: members } = await supabase
        .from('chat_members').select('user_id')
        .eq('chat_id', chatId).neq('user_id', userIdRef.current);
      if (members?.length > 0) {
        for (const member of members) {
          await sendPushToUser(
            member.user_id,
            `💬 ${myNameRef.current}`,
            content.startsWith('[IMAGE]') ? '📸 Фото' : content,
            { type: 'message', chatId }
          );
        }
      }
    } catch (e) { }
  };

  const handleMentions = async (content, messageId) => {
    try {
      const found = content.match(/@([\w.]+)/g);
      if (!found) return;
      const names = [...new Set(found.map(m => m.slice(1).toLowerCase()))];
      for (const name of names) {
        const { data: rows } = await supabase
          .from('profiles').select('id').eq('custom_username', name).limit(1);
        const target = rows?.[0];
        if (!target || target.id === userIdRef.current) continue;
        await supabase.from('mentions').insert({
          chat_id: chatId,
          message_id: messageId,
          mentioned_user_id: target.id,
        });
        await sendPushToUser(
          target.id,
          '📣 Тебя упомянули',
          `${myNameRef.current}: ${content}`,
          { type: 'mention', chatId }
        );
      }
    } catch (e) { }
  };

  const addReaction = async (messageId, emoji) => {
    if (!messageId || String(messageId).startsWith('temp-')) return;
    const existing = messageReactions[messageId]?.[emoji];
    const alreadyReacted = existing?.includes(userId);

    if (alreadyReacted) {
      await supabase.from('message_reactions')
        .delete().eq('message_id', messageId)
        .eq('user_id', userId).eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId, user_id: userId, emoji
      });
    }

    setShowReactions(false);
    setSelectedMessage(null);
    fetchReactions(messages.map(m => m.id));
  };

  const editMessage = (message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const clearChatHistory = () => {
    Alert.alert('Очистить историю?', 'Все сообщения исчезнут только у тебя', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('clear_chat_for_me', { cid: chatId });
          if (error) {
            Alert.alert('Ошибка', 'Не удалось очистить историю');
          } else {
            setMessages([]);
          }
        }
      }
    ]);
  };

  const deleteMessage = (message) => {
    if (!message) return;
    const isMe = message.sender_id === userId;
    Alert.alert('Сообщение', '', [
      { text: 'Отмена', style: 'cancel' },
      isMe ? { text: '✏️ Редактировать', onPress: () => editMessage(message) } : null,
      {
        text: '🗑 Удалить у себя',
        onPress: async () => {
          const currentDeleted = message.deleted_for_me || [];
          if (!currentDeleted.includes(userId)) {
            await supabase.from('messages')
              .update({ deleted_for_me: [...currentDeleted, userId] })
              .eq('id', message.id);
          }
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      },
      isMe ? {
        text: '🗑 Удалить у всех', style: 'destructive',
        onPress: async () => {
          await supabase.from('messages')
            .update({ deleted_for_all: true, content: '🗑 Сообщение удалено' })
            .eq('id', message.id);
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      } : null,
    ].filter(Boolean));
  };

  // На iPhone Alert сразу после закрытия Modal может не показаться — ждём чуть-чуть
  const closeReactionsThen = (fn) => {
    setShowReactions(false);
    setTimeout(() => { if (fn) fn(); }, 350);
  };

  const reportMessage = (message) => {
    if (!message) return;
    navigation.navigate('Report', {
      reportedUserId: message.sender_id,
      chatId,
      messageId: message.id,
      messageContent: message.content,
      userName: isGroup ? 'Участник группы' : userName,
    });
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
      const { error: insertError } = await supabase.from('messages').insert({
        chat_id: chatId, sender_id: userId,
        content: `[IMAGE]${urlData.publicUrl}`, is_delivered: true,
      });
      if (insertError) {
        showSendError();
      } else {
        sendPushNotification('[IMAGE]');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const showMediaOptions = () => {
    Alert.alert('Отправить', '', [
      { text: '📷 Камера', onPress: takePhoto },
      { text: '🖼 Галерея', onPress: pickImage },
      {
        text: `💣 Самоуничт. (${selfDestructSeconds ? SELF_DESTRUCT_OPTIONS.find(o => o.seconds === selfDestructSeconds)?.label : 'Выкл'})`,
        onPress: () => setShowSelfDestruct(true)
      },
      { text: '🗑 Очистить историю', onPress: clearChatHistory },
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
    if (message.id?.startsWith('temp-')) return '🕐';
    if (message.is_read) return '✓✓';
    if (message.is_delivered) return '✓✓';
    return '✓';
  };

  const getStatusColor = (message) => {
    if (message.is_read) return '#6C63FF';
    return 'rgba(255,255,255,0.5)';
  };

  const getHeaderStatus = () => {
    if (partnerTyping) return '✏️ печатает...';
    if (isGroup) return 'Групповой чат';
    if (!partner) return '';
    if (isUserOnline(partner)) return '● Онлайн';
    if (partner.online_visible === false || partner.last_seen_visibility === 'nobody') {
      return 'Был(а) недавно';
    }
    return `Был(а) ${formatLastSeen(partner.last_seen)}`;
  };

  const renderMessageContent = (content) => {
    const parts = (content || '').split(/(@[\w.]+)/g);
    return (
      <Text style={styles.messageText}>
        {parts.map((part, i) =>
          part.startsWith('@') ? (
            <Text key={i} style={styles.mention}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  const bg = getBackground(chatBackground);
  const partnerOnline = isUserOnline(partner);

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === userId;
    const isImage = isImageMessage(item.content);
    const prevItem = messages[index - 1];
    const showTime = !prevItem ||
      new Date(item.created_at) - new Date(prevItem.created_at) > 300000;
    const status = getMessageStatus(item);
    const statusColor = getStatusColor(item);
    const reactions = messageReactions[item.id] || {};
    const hasReactions = Object.keys(reactions).length > 0;
    const isSelfDestruct = item.self_destruct_at;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
        )}
        <TouchableOpacity
          style={[styles.messageRow, isMe && styles.messageRowMe]}
          onLongPress={() => {
            setSelectedMessage(item);
            setShowReactions(true);
          }}
          activeOpacity={0.8}
        >
          <View>
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
                    {isSelfDestruct && ' 💣'}
                  </Text>
                  {isMe && <Text style={[styles.statusIcon, { color: statusColor }]}>{status}</Text>}
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
                {renderMessageContent(item.content)}
                <View style={styles.messageFooter}>
                  <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                    {formatTime(item.created_at)}
                    {item.is_edited && ' ✏️'}
                    {isSelfDestruct && ' 💣'}
                  </Text>
                  {isMe && <Text style={[styles.statusIcon, { color: statusColor }]}>{status}</Text>}
                </View>
              </View>
            )}

            {hasReactions && (
              <View style={[styles.reactionsRow, isMe && styles.reactionsRowMe]}>
                {Object.entries(reactions).map(([emoji, users]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionChip, users.includes(userId) && styles.reactionChipActive]}
                    onPress={() => addReaction(item.id, emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
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
            } else if (isGroup) {
              navigation.navigate('GroupInfo', {
                chatId, groupName: userName, groupAvatar: route.params?.groupAvatar,
              });
            }
          }}
        >
          {route.params?.avatarUrl ? (
            <Image source={{ uri: route.params.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {isGroup ? (route.params?.groupAvatar || '👥') : (userName?.[0]?.toUpperCase() || '?')}
              </Text>
              {partnerOnline && <View style={styles.onlineDot} />}
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{userName}</Text>
            <Text style={[
              styles.headerStatus,
              !partnerOnline && !partnerTyping && { color: '#888' },
            ]}>
              {getHeaderStatus()}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}
            onPress={() => navigation.navigate('Call', { userName, chatId, isVideo: true })}>
            <Ionicons name="videocam" size={18} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}
            onPress={() => navigation.navigate('ChatBackground', {
              chatId, currentBackground: chatBackground,
            })}>
            <Ionicons name="color-palette-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
          {isGroup && (
            <TouchableOpacity style={styles.headerBtn}
              onPress={() => navigation.navigate('GroupInfo', {
                chatId, groupName: userName, groupAvatar: route.params?.groupAvatar,
              })}>
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

      {/* Печатает */}
      {partnerTyping && (
        <View style={[styles.typingContainer, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>● ● ●</Text>
            <Text style={styles.typingText}>
              {isGroup ? 'Кто-то печатает' : `${userName} печатает`}
            </Text>
          </View>
        </View>
      )}

      {/* Самоуничтожение включено */}
      {selfDestructSeconds && (
        <View style={[styles.selfDestructBanner, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <Ionicons name="timer-outline" size={14} color="#FF9F43" />
          <Text style={styles.selfDestructText}>
            💣 Самоуничт.: {SELF_DESTRUCT_OPTIONS.find(o => o.seconds === selfDestructSeconds)?.label}
          </Text>
          <TouchableOpacity onPress={() => setSelfDestructSeconds(null)}>
            <Ionicons name="close" size={14} color="#FF9F43" />
          </TouchableOpacity>
        </View>
      )}

      {/* Редактирование */}
      {editingMessage && (
        <View style={[styles.editingBanner, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <Ionicons name="create-outline" size={16} color="#6C63FF" />
          <Text style={styles.editingText}>Редактирование</Text>
          <TouchableOpacity onPress={() => { setEditingMessage(null); setNewMessage(''); }}>
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      )}

      {/* Ответ */}
      {replyTo && (
        <View style={[styles.replyPanel, { backgroundColor: bg.colors[0] + 'EE' }]}>
          <View style={styles.replyPanelLeft}>
            <Ionicons name="return-up-back" size={16} color="#6C63FF" />
            <View style={styles.replyPanelInfo}>
              <Text style={styles.replyPanelLabel}>Ответ</Text>
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
        <TouchableOpacity style={styles.inputIconBtn}
          onPress={() => setShowSuggestions(!showSuggestions)}>
          <Ionicons name="bulb-outline" size={20} color={showSuggestions ? '#6C63FF' : '#555'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputIconBtn} onPress={showMediaOptions} disabled={uploading}>
          <Ionicons name={uploading ? 'hourglass' : 'add-circle-outline'} size={22}
            color={uploading ? '#555' : '#888'} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
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
          <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={17} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Реакции и действия */}
      <Modal visible={showReactions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.reactionsOverlay}
          activeOpacity={1}
          onPress={() => { setShowReactions(false); setSelectedMessage(null); }}
        >
          <View style={styles.reactionsModal}>
            <Text style={styles.reactionsTitle}>Быстрые реакции</Text>
            <View style={styles.reactionsGrid}>
              {QUICK_REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOption}
                  onPress={() => addReaction(selectedMessage?.id, emoji)}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reactionActions}>
              <TouchableOpacity style={styles.reactionActionBtn}
                onPress={() => {
                  setReplyTo(selectedMessage);
                  setShowReactions(false);
                }}>
                <Ionicons name="return-up-back" size={18} color="#6C63FF" />
                <Text style={styles.reactionActionText}>Ответить</Text>
              </TouchableOpacity>

              {selectedMessage?.sender_id === userId &&
                !isImageMessage(selectedMessage?.content) && (
                <TouchableOpacity style={styles.reactionActionBtn}
                  onPress={() => {
                    const m = selectedMessage;
                    setShowReactions(false);
                    editMessage(m);
                  }}>
                  <Ionicons name="create-outline" size={18} color="#FFC107" />
                  <Text style={styles.reactionActionText}>Изменить</Text>
                </TouchableOpacity>
              )}

              {selectedMessage?.sender_id !== userId && (
                <TouchableOpacity style={styles.reactionActionBtn}
                  onPress={() => {
                    const m = selectedMessage;
                    closeReactionsThen(() => reportMessage(m));
                  }}>
                  <Ionicons name="flag-outline" size={18} color="#FF9F43" />
                  <Text style={styles.reactionActionText}>Жалоба</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.reactionActionBtn}
                onPress={() => {
                  const m = selectedMessage;
                  closeReactionsThen(() => deleteMessage(m));
                }}>
                <Ionicons name="trash-outline" size={18} color="#FF4444" />
                <Text style={[styles.reactionActionText, { color: '#FF4444' }]}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Самоуничтожение */}
      <Modal visible={showSelfDestruct} transparent animationType="slide">
        <TouchableOpacity
          style={styles.selfDestructOverlay}
          activeOpacity={1}
          onPress={() => setShowSelfDestruct(false)}
        >
          <View style={styles.selfDestructModal}>
            <Text style={styles.selfDestructTitle}>💣 Самоуничтожение</Text>
            <Text style={styles.selfDestructDesc}>
              Сообщение удалится автоматически после отправки
            </Text>
            {SELF_DESTRUCT_OPTIONS.map(option => (
              <TouchableOpacity
                key={String(option.seconds)}
                style={[styles.selfDestructOption,
                  selfDestructSeconds === option.seconds && styles.selfDestructOptionActive
                ]}
                onPress={() => {
                  setSelfDestructSeconds(option.seconds);
                  setShowSelfDestruct(false);
                }}
              >
                <Text style={[styles.selfDestructOptionText,
                  selfDestructSeconds === option.seconds && styles.selfDestructOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {selfDestructSeconds === option.seconds && (
                  <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
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
  suggestionText: { color: '#fff', fontSize: 12, marginBottom: 4 },
  suggestionSend: { color: '#6C63FF', fontSize: 10, fontWeight: '700' },
  refreshCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    padding: 10, marginLeft: 10, marginRight: 12,
    alignItems: 'center', justifyContent: 'center', width: 44,
  },
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
  mention: { color: '#A29BFE', fontWeight: 'bold' },
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
  reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  reactionsRowMe: { justifyContent: 'flex-end' },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionChipActive: { backgroundColor: 'rgba(108,99,255,0.3)', borderColor: '#6C63FF' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: '#fff' },
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
  selfDestructBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  selfDestructText: { flex: 1, color: '#FF9F43', fontSize: 12 },
  editingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  editingText: { flex: 1, color: '#6C63FF', fontSize: 13, fontWeight: '600' },
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
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  input: { color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  reactionsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  reactionsModal: {
    backgroundColor: '#111120', borderRadius: 20,
    padding: 20, width: '85%',
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  reactionsTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', marginBottom: 16,
  },
  reactionsGrid: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16,
  },
  reactionOption: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  reactionOptionEmoji: { fontSize: 26 },
  reactionActions: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  reactionActionBtn: { alignItems: 'center', gap: 4 },
  reactionActionText: { color: '#fff', fontSize: 11 },
  selfDestructOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  selfDestructModal: {
    backgroundColor: '#111120', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
  },
  selfDestructTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', marginBottom: 8,
  },
  selfDestructDesc: {
    fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 20,
  },
  selfDestructOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0D0D1A', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1A1A2E',
  },
  selfDestructOptionActive: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  selfDestructOptionText: { fontSize: 15, color: '#888' },
  selfDestructOptionTextActive: { color: '#6C63FF', fontWeight: '600' },
});
