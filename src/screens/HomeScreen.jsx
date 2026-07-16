import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      fetchUsers(user.id);
    }
  };

  const fetchUsers = async (myId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', myId);
    if (data) setUsers(data);
    setLoading(false);
  };

  const openChat = async (otherUser) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existingChats } = await supabase
        .from('chat_members').select('chat_id').eq('user_id', user.id);
      const myChatsIds = existingChats?.map(c => c.chat_id) || [];
      let chatId = null;

      if (myChatsIds.length > 0) {
        const { data: sharedChat } = await supabase
          .from('chat_members').select('chat_id')
          .eq('user_id', otherUser.id)
          .in('chat_id', myChatsIds).limit(1);
        if (sharedChat?.length > 0) chatId = sharedChat[0].chat_id;
      }

      if (!chatId) {
        const { data: newChat } = await supabase
          .from('chats').insert({}).select().single();
        chatId = newChat.id;
        await supabase.from('chat_members').insert([
          { chat_id: chatId, user_id: user.id },
          { chat_id: chatId, user_id: otherUser.id }
        ]);
      }

      navigation.navigate('Chat', {
        chatId,
        userName: otherUser.full_name || otherUser.username
      });
    } catch (e) { }
  };

  const filteredUsers = users.filter(u => {
    const name = (u.full_name || u.username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const getAvatar = (user) => {
    const name = user.full_name || user.username || '?';
    return name[0].toUpperCase();
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#FFC107', '#A29BFE'];
  const getColor = (index) => COLORS[index % COLORS.length];

  const renderUser = ({ item, index }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getColor(index) }]}>
        <Text style={styles.avatarText}>{getAvatar(item)}</Text>
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.full_name || item.username || 'Пользователь'}
        </Text>
        <Text style={styles.userStatus}>● Онлайн</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Call', {
            userName: item.full_name || item.username
          })}
        >
          <Ionicons name="videocam" size={18} color="#6C63FF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => openChat(item)}
        >
          <Ionicons name="chatbubble" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Привет! 👋</Text>
          <Text style={styles.headerTitle}>Worldgram</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск пользователей..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statChip}>
          <Ionicons name="people" size={14} color="#6C63FF" />
          <Text style={styles.statChipText}>{users.length} пользователей</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="ellipse" size={10} color="#4CAF50" />
          <Text style={styles.statChipText}>{users.length} онлайн</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Загружаем...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={60} color="#2A2A3E" />
          </View>
          <Text style={styles.emptyText}>Пока нет пользователей</Text>
          <Text style={styles.emptySubText}>
            Зарегистрируй друга и начни общение!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 55, paddingBottom: 16,
  },
  headerGreeting: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 14,
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  statsBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 16,
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A2E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  statChipText: { color: '#888', fontSize: 12 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 18,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, position: 'relative',
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#111120',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  userStatus: { fontSize: 12, color: '#4CAF50' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  actionBtnPrimary: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#555', textAlign: 'center' },
});
