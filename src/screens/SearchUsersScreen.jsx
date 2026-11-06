import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Alert, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatLastSeen } from '../lib/presence';
import { getOrCreatePrivateChat } from '../lib/chats';

const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50', '#A29BFE'];

const isUserOnline = (u) => {
  if (!u || u.online_visible === false || !u.is_online || !u.last_seen) return false;
  return Date.now() - new Date(u.last_seen).getTime() < 70000;
};

const getStatus = (u) => {
  if (isUserOnline(u)) return { text: '● Онлайн', online: true };
  if (u.online_visible === false || u.last_seen_visibility === 'nobody') {
    return { text: '● Был(а) недавно', online: false };
  }
  return { text: `● ${formatLastSeen(u.last_seen)}`, online: false };
};

export default function SearchUsersScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [opening, setOpening] = useState(null);
  const debounceRef = useRef(null);
  const requestRef = useRef(0);

  // Поиск сам запускается через 0.5 сек после последнего символа
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = cleanQuery(query);
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(q), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Убираем символы, которые ломают запрос к базе
  const cleanQuery = (text) =>
    text.trim().replace(/^@+/, '').replace(/[,()%*\\"':;]/g, '').trim();

  const runSearch = async (q) => {
    const requestId = ++requestRef.current;
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      if (!me) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`custom_username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq('id', me.id)
        .eq('is_test_account', false)
        .limit(20);
      if (error) throw error;

      const { data: blocks } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', me.id);
      const blockedIds = new Set((blocks || []).map(b => b.blocked_id));

      // Игнорируем устаревший ответ, если пользователь уже ввёл другое
      if (requestId !== requestRef.current) return;
      setResults((data || []).filter(u => !blockedIds.has(u.id)));
      setSearched(true);
    } catch (e) {
      if (requestId === requestRef.current) {
        setResults([]);
        setSearched(true);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const openChat = async (item) => {
    if (opening) return;
    setOpening(item.id);
    try {
      Keyboard.dismiss();
      const chatId = await getOrCreatePrivateChat(item.id);
      navigation.navigate('Chat', {
        chatId,
        userName: item.full_name || item.custom_username || 'Пользователь',
        userId: item.id,
        avatarUrl: item.avatar_url || null,
      });
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось открыть чат');
    } finally {
      setOpening(null);
    }
  };

  const clearAll = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const renderItem = ({ item, index }) => {
    const name = item.full_name || item.custom_username || 'Пользователь';
    const status = getStatus(item);
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS[index % COLORS.length] }]}>
              <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, {
            backgroundColor: status.online ? '#4CAF50' : '#2A2A3E'
          }]} />
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{name}</Text>
          {item.custom_username ? (
            <Text style={styles.userUsername}>@{item.custom_username}</Text>
          ) : null}
          <Text style={[styles.userStatus, { color: status.online ? '#4CAF50' : '#555' }]}>
            {status.text}
          </Text>
        </View>

        <TouchableOpacity style={styles.msgBtn} onPress={() => openChat(item)}>
          {opening === item.id
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="chatbubble" size={16} color="#fff" />
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔍 Поиск людей</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="at" size={18} color="#6C63FF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Введи @username или имя..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Ionicons name="close-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.centerText}>Ищем...</Text>
        </View>
      ) : !searched ? (
        <View style={styles.centerBox}>
          <Text style={styles.bigEmoji}>🌍</Text>
          <Text style={styles.centerTitle}>Найди друзей</Text>
          <Text style={styles.centerSub}>
            Введи @username или имя человека. Минимум 2 символа.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.bigEmoji}>🔍</Text>
          <Text style={styles.centerTitle}>Никого не найдено</Text>
          <Text style={styles.centerSub}>
            Проверь написание. У человека должен быть задан @username в настройках.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>Найдено: {results.length}</Text>
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
  searchRow: { padding: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  centerBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 8,
  },
  centerText: { color: '#888', fontSize: 14, marginTop: 8 },
  bigEmoji: { fontSize: 56, marginBottom: 8 },
  centerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  centerSub: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, paddingTop: 0 },
  resultsCount: { color: '#555', fontSize: 12, marginBottom: 10 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
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
  msgBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
});
