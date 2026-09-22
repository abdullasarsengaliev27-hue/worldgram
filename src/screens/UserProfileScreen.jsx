import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    getMyId();
    fetchProfile();
    fetchStories();
  }, []);

  const getMyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .eq('stories_visible', true)
      .gt('expires_at', new Date().toISOString());
    if (data) setStories(data);
  };

  const openChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existingChats } = await supabase
      .from('chat_members').select('chat_id').eq('user_id', user.id);
    const myChatsIds = existingChats?.map(c => c.chat_id) || [];
    let chatId = null;

    if (myChatsIds.length > 0) {
      const { data: sharedChat } = await supabase
        .from('chat_members').select('chat_id')
        .eq('user_id', userId)
        .in('chat_id', myChatsIds).limit(1);
      if (sharedChat?.length > 0) chatId = sharedChat[0].chat_id;
    }

    if (!chatId) {
      const { data: newChat } = await supabase
        .from('chats').insert({}).select().single();
      chatId = newChat.id;
      await supabase.from('chat_members').insert([
        { chat_id: chatId, user_id: user.id },
        { chat_id: chatId, user_id: userId }
      ]);
    }

    navigation.navigate('Chat', {
      chatId,
      userName: profile?.full_name || profile?.username
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const displayName = profile?.full_name || profile?.username || 'Пользователь';
  const avatarLetter = displayName[0].toUpperCase();
  const avatarColor = profile?.avatar_color || '#6C63FF';
  const avatarEmoji = profile?.avatar_emoji || '😊';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      {/* Аватар и имя */}
      <View style={styles.profileCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
          </View>
        )}

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{profile?.username || 'username'}</Text>

        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {/* Статус онлайн */}
        {profile?.online_visible && (
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, {
              backgroundColor: profile?.is_online ? '#4CAF50' : '#888'
            }]} />
            <Text style={[styles.onlineText, {
              color: profile?.is_online ? '#4CAF50' : '#888'
            }]}>
              {profile?.is_online ? 'Онлайн' : 'Не в сети'}
            </Text>
          </View>
        )}

        {/* Телефон */}
        {profile?.phone_number && profile?.phone_visible && (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={16} color="#6C63FF" />
            <Text style={styles.phoneText}>{profile.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Кнопки действий */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openChat}>
          <Ionicons name="chatbubble" size={22} color="#fff" />
          <Text style={styles.actionBtnText}>Написать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => navigation.navigate('Call', { userName: displayName })}
        >
          <Ionicons name="videocam" size={22} color="#6C63FF" />
          <Text style={[styles.actionBtnText, { color: '#6C63FF' }]}>Позвонить</Text>
        </TouchableOpacity>
      </View>

      {/* Истории */}
      {stories.length > 0 && (
        <View style={styles.storiesSection}>
          <Text style={styles.sectionTitle}>📊 Истории</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stories.map((story, i) => (
              <TouchableOpacity
                key={story.id}
                style={[styles.storyItem, { backgroundColor: story.background_color }]}
                onPress={() => navigation.navigate('Stories')}
              >
                <Text style={styles.storyEmoji}>{story.emoji}</Text>
                <Text style={styles.storyText} numberOfLines={2}>
                  {story.content}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  loadingContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
  },
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
  profileCard: {
    alignItems: 'center', padding: 30,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  avatarEmoji: { fontSize: 50 },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    marginBottom: 16,
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  username: { fontSize: 14, color: '#555', marginBottom: 12 },
  bio: {
    fontSize: 14, color: '#888', textAlign: 'center',
    maxWidth: 280, lineHeight: 20, marginBottom: 12,
  },
  onlineRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 8,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 13 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 4,
  },
  phoneText: { color: '#6C63FF', fontSize: 14 },
  actionsRow: {
    flexDirection: 'row', padding: 16, gap: 10,
  },
  actionBtn: {
    flex: 1, backgroundColor: '#6C63FF',
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  actionBtnSecondary: {
    backgroundColor: '#111120',
    borderWidth: 1, borderColor: '#6C63FF',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  storiesSection: { padding: 16 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12,
  },
  storyItem: {
    width: 120, height: 160, borderRadius: 16,
    padding: 12, marginRight: 10,
    justifyContent: 'space-between',
  },
  storyEmoji: { fontSize: 32 },
  storyText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
