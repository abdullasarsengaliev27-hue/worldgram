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
import { notifyNewMessage } from '../lib/notifications';

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
  const flatListRef = useRef(null);

  useEffect(() => {
    getUser();
    fetchMessages();
    loadSuggestions();

    const subscription = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'messages', filter: `chat_id=eq.${chatId}`
  }, async (payload) => {
    setMessages(prev => [...prev, payload.new]);

    // Уведомление только если сообщение не от меня
    const { data: { user } } = await supabase.auth.getUser();
    if (payload.new.sender_id !== user?.id) {
      await notifyNewMessage(userName, payload.new.content);
    }
  })
  .subscribe();

    return () => subscription.unsubscribe();
  }, []);

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

  const sendMessage = async (text) => {
    const content = text || newMessage.trim();
    if (!content) return;
    await supabase.from('messages').insert({
      chat_id: chatId, sender_id: userId, content
    });
    setNewMessage('');
    loadSuggestions();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разреши доступ к галерее в настройках');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разреши доступ к камере в настройках');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);
  
      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
  
      // Читаем файл как base64
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
  
      const { decode } = require('base64-arraybuffer');
      const arrayBuffer = decode(base64Data);
  
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, arrayBuffer, {
          contentType,
          upsert: true,
        });
  
      if (uploadError) throw uploadError;
  
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);
  
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: userId,
        content: `[IMAGE]${urlData.publicUrl}`,
      });
  
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const decode = (base64) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < base64.length; i += 4) {
      const a = chars.indexOf(base64[i]);
      const b = chars.indexOf(base64[i + 1]);
      const c = chars.indexOf(base64[i + 2]);
      const d = chars.indexOf(base64[i + 3]);
      result += String.fromCharCode((a << 2) | (b >> 4));
      if (base64[i + 2] !== '=') result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
      if (base64[i + 3] !== '=') result += String.fromCharCode(((c & 3) << 6) | d);
    }
    return Uint8Array.from(result, c => c.charCodeAt(0));
  };

  const showMediaOptions = () => {
    Alert.alert('Отправить фото', 'Выбери источник', [
      { text: '📷 Камера', onPress: takePhoto },
      { text: '🖼 Галерея', onPress: pickImage },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isImageMessage = (content) => content?.startsWith('[IMAGE]');
  const getImageUrl = (content) => content?.replace('[IMAGE]', '');

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
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          {isImage ? (
            <View style={[styles.imageBubble, isMe && styles.imageBubbleMe]}>
              <Image
                source={{ uri: getImageUrl(item.content) }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                {formatTime(item.created_at)} {isMe && '✓'}
              </Text>
            </View>
          ) : (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                {formatTime(item.created_at)} {isMe && '✓'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName?.[0]?.toUpperCase() || '?'}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userName}</Text>
          <Text style={styles.headerStatus}>● Онлайн</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Call', { userName })}
          >
            <Ionicons name="videocam" size={20} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="call" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI подсказки */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
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
              <TouchableOpacity
                key={i} style={styles.suggestionCard}
                onPress={() => sendMessage(s)}
              >
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

      {/* Input */}
      <View style={styles.inputRow}>
        {!showSuggestions && (
          <TouchableOpacity style={styles.aiBtn} onPress={() => setShowSuggestions(true)}>
            <Ionicons name="bulb" size={20} color="#6C63FF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.mediaBtn}
          onPress={showMediaOptions}
          disabled={uploading}
        >
          <Ionicons
            name={uploading ? 'hourglass' : 'camera'}
            size={20}
            color={uploading ? '#555' : '#6C63FF'}
          />
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
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingTop: 50,
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E', gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#0D0D1A',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: '#4CAF50', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  suggestionsContainer: {
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E', paddingVertical: 10,
  },
  suggestionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 8,
  },
  suggestionsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionsTitle: { color: '#6C63FF', fontSize: 12, fontWeight: 'bold' },
  suggestionCard: {
    backgroundColor: '#1A1A2E', borderRadius: 14,
    padding: 12, marginLeft: 12, maxWidth: 180,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  suggestionText: { color: '#fff', fontSize: 13, marginBottom: 6, lineHeight: 18 },
  suggestionSend: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  refreshCard: {
    backgroundColor: '#1A1A2E', borderRadius: 14,
    padding: 12, marginLeft: 12, marginRight: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E', width: 65, gap: 4,
  },
  refreshText: { color: '#6C63FF', fontSize: 11 },
  messagesList: { padding: 16, paddingBottom: 8 },
  timeLabel: {
    textAlign: 'center', color: '#333',
    fontSize: 11, marginVertical: 12,
  },
  messageRow: { marginBottom: 4, alignItems: 'flex-start' },
  messageRowMe: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%', borderRadius: 18,
    padding: 12, paddingBottom: 8,
  },
  bubbleMe: {
    backgroundColor: '#6C63FF', borderBottomRightRadius: 4,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  bubbleThem: { backgroundColor: '#111120', borderBottomLeftRadius: 4 },
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
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 50, marginBottom: 12 },
  emptyChatText: { color: '#333', fontSize: 16 },
  inputRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
    alignItems: 'flex-end', gap: 8,
    backgroundColor: '#0D0D1A',
  },
  aiBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  mediaBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  inputContainer: {
    flex: 1, backgroundColor: '#111120',
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
