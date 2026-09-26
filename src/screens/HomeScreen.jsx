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
    const channelName = `profiles-online-${Date.now()}`;
const subscription = supabase
  .channel(channelName)
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'profiles',
  }, (payload) => {
    setUsers(prev => prev.map(u =>
      u.id === payload.new.id ? { ...u, ...payload.new } : u
    ));
  }).subscribe();
return () => supabase.removeChannel(subscription);
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
      .from('profiles')
      .select('*')
      .neq('id', myId)
      .eq('is_test_account', false); // скрываем тестовые
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
    Alert.alert('Удалить чат?', '', [
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
          } catch (e) { }
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
    Alert.alert('Удалить группу?', '', [
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

  const onlineCount = users.filter(u => u.is_online).length;

  const filteredUsers = users.filter(u => {
    const name = (u.full_name || u.username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const filteredGroups = groupChats.filter(g =>
    (g.group_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const showUsers = activeTab === 'all' || activeTab === 'users';
  const showGroups = activeTab === 'all' || activeTab === 'groups';

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
          {onlineCount > 0 && (
            <View style={styles.onlinePill}>
              <View style={styles.onlinePillDot} />
              <Text style={styles.onlinePillText}>{onlineCount} онлайн</Text>
            </View>
          )}
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories */}
      <View style={styles.storiesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {/* Добавить историю */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => navigation.navigate('Stories')}
          >
            <View style={styles.addStoryRing}>
              <View style={styles.addStoryInner}>
                <Ionicons name="add" size={22} color="#6C63FF" />
              </View>
            </View>
            <Text style={styles.storyLabel}>Моя история</Text>
          </TouchableOpacity>

          {storyUsers.map((story, i) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => navigation.navigate('Stories')}
            >
              <View style={[styles.storyRing, { borderColor: COLORS[i % COLORS.length] }]}>
                <View style={[styles.storyInner, { backgroundColor: story.background_color }]}>
                  <Text style={styles.storyEmoji}>{story.emoji}</Text>
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {story.profiles?.full_name?.split(' ')[0] || 'Друг'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
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
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
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
        contentContainerStyle={styles.listContent}
      >
        {/* Группы */}
        {showGroups && filteredGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Группы</Text>
            {filteredGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.chatCard}
                onPress={() => navigation.navigate('Chat', {
                  chatId: group.id,
                  userName: group.group_name,
                  isGroup: true,
                  groupAvatar: group.group_avatar,
                })}
                onLongPress={() => Alert.alert(group.group_name, '', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'ℹ️ Информация', onPress: () => navigation.navigate('GroupInfo', {
                    chatId: group.id, groupName: group.group_name, groupAvatar: group.group_avatar,
                  })},
                  { text: '🚪 Выйти', onPress: () => leaveGroup(group.id) },
                  { text: '🗑 Удалить', style: 'destructive', onPress: () => deleteGroup(group.id) },
                ])}
                activeOpacity={0.7}
              >
                <View style={styles.groupAvatarCircle}>
                  <Text style={styles.groupAvatarEmoji}>{group.group_avatar || '👥'}</Text>
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{group.group_name}</Text>
                  <Text style={styles.chatSub}>Групповой чат</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#2A2A3E" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Пользователи */}
        {showUsers && (
          <View style={styles.section}>
            {activeTab !== 'users' && filteredGroups.length > 0 && (
              <Text style={styles.sectionLabel}>Люди</Text>
            )}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#6C63FF" />
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyTitle}>Нет пользователей</Text>
                <Text style={styles.emptySub}>Зарегистрируй друга!</Text>
              </View>
            ) : (
              filteredUsers.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.chatCard}
                  onPress={() => openChat(item)}
                  onLongPress={() => Alert.alert(
                    item.full_name || item.username, '',
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
                      <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, { backgroundColor: getColor(index) }]}>
                        <Text style={styles.userAvatarText}>
                          {(item.full_name || item.username || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.statusDot, {
                      backgroundColor: item.is_online ? '#4CAF50' : '#2A2A3E'
                    }]} />
                  </TouchableOpacity>

                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>
                      {item.full_name || item.username || 'Пользователь'}
                    </Text>
                    <Text style={[styles.chatSub, {
                      color: item.is_online ? '#4CAF50' : '#444'
                    }]}>
                      {item.is_online ? '● Онлайн' : `● ${formatLastSeen(item.last_seen)}`}
                    </Text>
                  </View>

                  <View style={styles.chatActions}>
                    <TouchableOpacity
                      style={styles.actionCircle}
                      onPress={() => navigation.navigate('Call', { userName: item.full_name || item.username })}
                    >
                      <Ionicons name="videocam" size={15} color="#6C63FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionCircle, styles.actionCirclePrimary]}
                      onPress={() => openChat(item)}
                    >
                      <Ionicons name="chatbubble" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.85}
      >
        <Ionicons name="people" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 14,
  },
  headerGreeting: { fontSize: 12, color: '#6C63FF', fontWeight: '700', letterSpacing: 0.5 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.25)',
  },
  onlinePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  onlinePillText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111122', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1E1E32',
  },

  // Stories
  storiesWrapper: {
    borderBottomWidth: 1, borderBottomColor: '#111122',
    paddingBottom: 12,
  },
  storiesContent: { paddingHorizontal: 16, gap: 2 },
  storyItem: { alignItems: 'center', marginRight: 14, width: 66 },
  addStoryRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: '#6C63FF',
    borderStyle: 'dashed', padding: 3,
    marginBottom: 6,
  },
  addStoryInner: {
    flex: 1, borderRadius: 27,
    backgroundColor: '#111122',
    alignItems: 'center', justifyContent: 'center',
  },
  storyRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, padding: 2, marginBottom: 6,
  },
  storyInner: {
    flex: 1, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  storyEmoji: { fontSize: 24 },
  storyLabel: { fontSize: 10, color: '#666', textAlign: 'center', width: 62 },

  // Search
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111122', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#1E1E32',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // Tabs
  tabsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    marginBottom: 6, backgroundColor: '#111122',
    borderRadius: 12, padding: 3,
    borderWidth: 1, borderColor: '#1E1E32',
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { color: '#444', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // List
  listContent: { paddingHorizontal: 16 },
  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#444',
    marginBottom: 8, marginTop: 8, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Chat Card
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111122', borderRadius: 18,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
    gap: 12,
  },

  // Group avatar
  groupAvatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5, borderColor: '#6C63FF22',
  },
  groupAvatarEmoji: { fontSize: 24 },

  // User avatar
  userAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  userAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#111122',
  },

  // Chat info
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  chatSub: { fontSize: 12, color: '#444' },

  // Actions
  chatActions: { flexDirection: 'row', gap: 6 },
  actionCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  actionCirclePrimary: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },

  // States
  loadingBox: { alignItems: 'center', padding: 40 },
  emptyBox: { alignItems: 'center', padding: 50 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#444' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 14,
  },
});
