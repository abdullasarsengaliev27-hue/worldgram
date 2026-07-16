import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, StatusBar, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      fetchUsers(user.id);
      fetchStories(user.id);
    }
  };

  const fetchUsers = async (myId) => {
    const { data } = await supabase
      .from('profiles').select('*').neq('id', myId);
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchStories = async (myId) => {
    const { data } = await supabase
      .from('stories')
      .select('*, profiles(full_name, username)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (data) setStories(data);
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
        chatId, userName: otherUser.full_name || otherUser.username
      });
    } catch (e) { }
  };

  const filteredUsers = users.filter(u => {
    const name = (u.full_name || u.username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#FFC107', '#A29BFE'];
  const getColor = (index) => COLORS[index % COLORS.length];

  // Группируем истории по пользователям
  const storyUsers = stories.reduce((acc, story) => {
    if (!acc.find(s => s.user_id === story.user_id)) {
      acc.push(story);
    }
    return acc;
  }, []);

  const renderUser = ({ item, index }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getColor(index) }]}>
        <Text style={styles.avatarText}>
          {(item.full_name || item.username || '?')[0].toUpperCase()}
        </Text>
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

      {/* Stories лента */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>

          {/* Добавить историю */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => navigation.navigate('Stories')}
          >
            <View style={styles.addStoryCircle}>
              <Ionicons name="add" size={26} color="#6C63FF" />
            </View>
            <Text style={styles.storyName}>Моя история</Text>
          </TouchableOpacity>

          {/* Истории пользователей */}
          {storyUsers.map((story, i) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => navigation.navigate('Stories')}
            >
              <View style={[styles.storyCircle, { borderColor: COLORS[i % COLORS.length] }]}>
                <View style={[styles.storyCircleInner, { backgroundColor: story.background_color }]}>
                  <Text style={styles.storyCircleEmoji}>{story.emoji}</Text>
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {story.profiles?.full_name?.split(' ')[0] || 'Друг'}
              </Text>
            </TouchableOpacity>
          ))}

        </ScrollView>
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
          <Text style={styles.emptySubText}>Зарегистрируй друга и начни общение!</Text>
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.8}
      >
        <Ionicons name="people" size={22} color="#fff" />
        <Text style={styles.fabText}>Группа</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 55, paddingBottom: 12,
  },
  headerGreeting: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E',
  },

  // Stories
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
    paddingLeft: 16,
  },
  storyItem: {
    alignItems: 'center', marginRight: 14, width: 68,
  },
  addStoryCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', marginBottom: 6,
    borderWidth: 2, borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  storyCircle: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2, padding: 2, marginBottom: 6,
  },
  storyCircleInner: {
    flex: 1, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
  },
  storyCircleEmoji: { fontSize: 26 },
  storyName: {
    fontSize: 11, color: '#888',
    textAlign: 'center', width: 64,
  },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 14,
    marginHorizontal: 20, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  statsBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A2E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  statChipText: { color: '#888', fontSize: 12 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
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
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: '#6C63FF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
