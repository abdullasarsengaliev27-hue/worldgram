import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, FlatList, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SearchUsersScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const q = query.trim().toLowerCase().replace('@', '');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`custom_username.ilike.%${q}%,full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(20);

    if (data) setResults(data);
    setLoading(false);
  };

  const openChat = async (user) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { data: existingChats } = await supabase
      .from('chat_members').select('chat_id').eq('user_id', me.id);
    const myChatsIds = existingChats?.map(c => c.chat_id) || [];
    let chatId = null;

    if (myChatsIds.length > 0) {
      const { data: sharedChat } = await supabase
        .from('chat_members').select('chat_id')
        .eq('user_id', user.id)
        .in('chat_id', myChatsIds).limit(1);
      if (sharedChat?.length > 0) chatId = sharedChat[0].chat_id;
    }

    if (!chatId) {
      const { data: newChat } = await supabase
        .from('chats').insert({}).select().single();
      chatId = newChat.id;
      await supabase.from('chat_members').insert([
        { chat_id: chatId, user_id: me.id },
        { chat_id: chatId, user_id: user.id }
      ]);
    }

    navigation.navigate('Chat', {
      chatId,
      userName: user.full_name || user.custom_username || user.username,
      userId: user.id,
    });
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50', '#A29BFE'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔍 Поиск людей</Text>
      </View>

      {/* Поиск */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="at" size={18} color="#6C63FF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Введи @username или имя..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            autoCapitalize="none"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={search}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Ищи по @username, имени или email
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Ищем...</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Никого не найдено</Text>
          <Text style={styles.emptySub}>Попробуй другой @username или имя</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const name = item.full_name || item.custom_username || item.username || 'Пользователь';
            const username = item.custom_username || item.username;
            return (
              <TouchableOpacity
                style={styles.userCard}
                onPress={() => openChat(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: COLORS[index % COLORS.length] }]}>
                  <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                  <View style={[styles.onlineDot, {
                    backgroundColor: item.is_online ? '#4CAF50' : '#333'
                  }]} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{name}</Text>
                  {username && (
                    <Text style={styles.userUsername}>@{username}</Text>
                  )}
                  <Text style={[styles.userStatus, {
                    color: item.is_online ? '#4CAF50' : '#555'
                  }]}>
                    {item.is_online ? '● Онлайн' : '● Не в сети'}
                  </Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.msgBtn}
                    onPress={() => openChat(item)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultsCount}>
                Найдено: {results.length}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 55, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchRow: {
    flexDirection: 'row', padding: 16, gap: 10, alignItems: 'center',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  searchBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  hint: {
    color: '#444', fontSize: 12,
    paddingHorizontal: 16, marginBottom: 8,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555', textAlign: 'center' },
  list: { padding: 16 },
  resultsCount: { color: '#555', fontSize: 12, marginBottom: 10 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#111120',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  userUsername: { fontSize: 13, color: '#6C63FF', marginBottom: 2 },
  userStatus: { fontSize: 12 },
  userActions: {},
  msgBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
});

