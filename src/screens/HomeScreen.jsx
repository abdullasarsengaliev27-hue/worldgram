import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, StatusBar,
  ScrollView, Image, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { formatLastSeen } from '../lib/presence';

export default function HomeScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    getCurrentUser();
    Notifications.setBadgeCountAsync(0);

    const subscription = supabase
      .channel('profiles-online')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
      }, (payload) => {
        setUsers(prev => prev.map(u =>
          u.id === payload.new.id ? { ...u, ...payload.new } : u
        ));
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      await Promise.all([
        fetchUsers(user.id),
        fetchGroupChats(user.id),
        fetchStories(user.id),
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentUser();
    setRefreshing(false);
  };

  const fetchUsers = async (myId) => {
    const { data } = await supabase
      .from('profiles').select('*').neq('id', myId);
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchGroupChats = async (myId) => {
    try {
      const { data: memberChats } = await supabase
        .from('chat_members').select('chat_id').eq('user_id', myId);
      if (!memberChats?.length) return;
      const chatIds = memberChats.map(c => c.chat_id);
      const { data } = await supabase
        .from('chats').select('*').eq('is_group', true).in('id', chatIds);
      if (data) setGroupChats(data);
    } catch (e) { }
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
        chatId,
        userName: otherUser.full_name || otherUser.username,
        userId: otherUser.id,
        avatarUrl: otherUser.avatar_url || null,
      });
    } catch (e) { }
  };

  const deleteChat = async (otherUserId) => {
    Alert.alert('Удалить чат?', 'Сообщения будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: existingChats } = await supabase
              .from('chat_members').select('chat_id').eq('user_id', user.id);
            const myChatsIds = existingChats?.map(c => c.chat_id) || [];
            if (myChatsIds.length > 0) {
              const { data: sharedChat } = await supabase
                .from('chat_members').select('chat_id')
                .eq('user_id', otherUserId)
                .in('chat_id', myChatsIds).limit(1);
              if (sharedChat?.length > 0) {
                const chatId = sharedChat[0].chat_id;
                await supabase.from('messages').delete().eq('chat_id', chatId);
                await supabase.from('chat_members').delete().eq('chat_id', chatId);
                await supabase.from('chats').delete().eq('id', chatId);
              }
            }
            getCurrentUser();
          } catch (e) { Alert.alert('Ошибка', e.message); }
        }
      }
    ]);
  };

  const leaveGroup = async (groupId) => {
    Alert.alert('Выйти из группы?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive',
        onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('chat_members')
            .delete().eq('chat_id', groupId).eq('user_id', user.id);
          fetchGroupChats(user.id);
        }
      }
    ]);
  };

  const deleteGroup = async (groupId) => {
    Alert.alert('Удалить группу?', 'Группа будет удалена для всех', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('chat_id', groupId);
          await supabase.from('chat_members').delete().eq('chat_id', groupId);
          await supabase.from('chats').delete().eq('id', groupId);
          const { data: { user } } = await supabase.auth.getUser();
          fetchGroupChats(user.id);
        }
      }
    ]);
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#FFC107', '#A29BFE'];
  const getColor = (index) => COLORS[index % COLORS.length];

  const storyUsers = stories.reduce((acc, story) => {
    if (!acc.find(s => s.user_id === story.user_id)) acc.push(story);
    return acc;
  }, []);

  const onlineUsers = users.filter(u => u.is_online);

  const filteredUsers = users.filter(u => {
    const name = (u.full_name || u.username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const filteredGroups = groupChats.filter(g =>
    (g.group_name || '').toLowerCase().includes(search.toLowerCase())
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
        <View style={styles.headerRight}>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDotHeader} />
            <Text style={styles.onlineCount}>{onlineUsers.length} онлайн</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => navigation.navigate('Stories')}
          >
            <View style={styles.addStoryCircle}>
              <Ionicons name="add" size={24} color="#6C63FF" />
            </View>
            <Text style={styles.storyName}>Моя история</Text>
          </TouchableOpacity>

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
        <Ionicons name="search" size={16} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { id: 'all', label: 'Все' },
          { id: 'users', label: 'Люди' },
          { id: 'groups', label: 'Группы' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
        {/* Группы */}
        {(activeTab === 'all' || activeTab === 'groups') && filteredGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Группы</Text>
            {filteredGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigation.navigate('Chat', {
                  chatId: group.id,
                  userName: group.group_name,
                  isGroup: true,
                  groupAvatar: group.group_avatar,
                })}
                onLongPress={() => {
                  Alert.alert(group.group_name, 'Управление группой', [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'ℹ️ Информация', onPress: () => navigation.navigate('GroupInfo', {
                      chatId: group.id,
                      groupName: group.group_name,
                      groupAvatar: group.group_avatar,
                    })},
                    { text: '🚪 Выйти', onPress: () => leaveGroup(group.id) },
                    { text: '🗑 Удалить', style: 'destructive', onPress: () => deleteGroup(group.id) },
                  ]);
                }}
              >
                <View style={styles.groupAvatarCircle}>
                  <Text style={styles.groupAvatarEmoji}>{group.group_avatar || '👥'}</Text>
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{group.group_name}</Text>
                  <Text style={styles.chatSub}>Групповой чат • Зажми для управления</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#333" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Пользователи */}
        {(activeTab === 'all' || activeTab === 'users') && (
          <View style={styles.section}>
            {(activeTab === 'all' || activeTab === 'users') && (
              <Text style={styles.sectionLabel}>💬 Люди</Text>
            )}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyText}>Пока нет пользователей</Text>
                <Text style={styles.emptySubText}>Зарегистрируй друга!</Text>
              </View>
            ) : (
              filteredUsers.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.userCard}
                  onPress={() => openChat(item)}
                  onLongPress={() => Alert.alert(
                    item.full_name || item.username,
                    'Действия',
                    [
                      { text: 'Отмена', style: 'cancel' },
                      { text: '👤 Профиль', onPress: () => navigation.navigate('UserProfile', { userId: item.id }) },
                      { text: '🗑 Удалить чат', style: 'destructive', onPress: () => deleteChat(item.id) },
                    ]
                  )}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: getColor(index) }]}>
                        <Text style={styles.avatarText}>
                          {(item.full_name || item.username || '?')[0].toUpperCase()}
                        </Text>
                        <View style={[styles.onlineDot, {
                          backgroundColor: item.is_online ? '#4CAF50' : '#444'
                        }]} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.full_name || item.username || 'Пользователь'}
                    </Text>
                    <Text style={[styles.userStatus, {
                      color: item.is_online ? '#4CAF50' : '#555'
                    }]}>
                      {item.is_online ? '● Онлайн' : `● ${formatLastSeen(item.last_seen)}`}
                    </Text>
                  </View>

                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('Call', { userName: item.full_name || item.username })}
                    >
                      <Ionicons name="videocam" size={16} color="#6C63FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                      onPress={() => openChat(item)}
                    >
                      <Ionicons name="chatbubble" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.8}
      >
        <Ionicons name="people" size={20} color="#fff" />
        <Text style={styles.fabText}>Группа</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 12,
  },
  headerGreeting: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlineIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0D1A0D', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1A3A1A',
  },
  onlineDotHeader: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  onlineCount: { color: '#4CAF50', fontSize: 11, fontWeight: '600' },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  storiesContainer: {
    paddingVertical: 10, paddingLeft: 16,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  storyItem: { alignItems: 'center', marginRight: 12, width: 64 },
  addStoryCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', marginBottom: 5,
    borderWidth: 2, borderColor: '#6C63FF', borderStyle: 'dashed',
  },
  storyCircle: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2, padding: 2, marginBottom: 5,
  },
  storyCircleInner: {
    flex: 1, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  storyCircleEmoji: { fontSize: 24 },
  storyName: { fontSize: 10, color: '#666', textAlign: 'center', width: 60 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 12,
    marginHorizontal: 16, marginTop: 10, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16,
    marginBottom: 8, backgroundColor: '#111120',
    borderRadius: 12, padding: 3,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { color: '#555', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#555',
    marginBottom: 8, marginTop: 4,
  },
  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 12,
  },
  groupAvatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#6C63FF',
  },
  groupAvatarEmoji: { fontSize: 24 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  chatSub: { fontSize: 11, color: '#555' },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, position: 'relative',
  },
  avatarImage: {
    width: 50, height: 50, borderRadius: 25, marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#111120',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  userStatus: { fontSize: 12 },
  userActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  actionBtnPrimary: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  loadingContainer: { alignItems: 'center', padding: 40 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#555' },
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
