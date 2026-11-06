import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatLastSeen } from '../lib/presence';
import { getOrCreatePrivateChat } from '../lib/chats';

const isUserOnline = (p) => {
  if (!p || p.online_visible === false || !p.is_online || !p.last_seen) return false;
  return Date.now() - new Date(p.last_seen).getTime() < 70000;
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const isMe = myId === userId;

  // Раз в 30 секунд обновляем статус "в сети"
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    init();
  }, [userId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setMyId(user.id);
      const { data: blockRow } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();
      setIsBlocked(!!blockRow);
    }
    await fetchProfile(user?.id);
  };

  const fetchProfile = async (currentUserId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      // Истории показываем, только если человек их не скрыл (свои — всегда)
      if (data.stories_visible !== false || data.id === currentUserId) {
        fetchStories();
      }
    }
    setLoading(false);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (data) setStories(data);
  };

  const displayName = profile?.full_name || profile?.custom_username || 'Пользователь';

  const openChat = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const chatId = await getOrCreatePrivateChat(userId);
      navigation.navigate('Chat', {
        chatId,
        userName: displayName,
        userId,
        avatarUrl: profile?.avatar_url || null,
      });
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось открыть чат');
    } finally {
      setBusy(false);
    }
  };

  const startCall = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const chatId = await getOrCreatePrivateChat(userId);
      navigation.navigate('Call', {
        userName: displayName,
        chatId,
        isVideo: true,
      });
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось начать звонок');
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = () => {
    if (isBlocked) {
      Alert.alert('Разблокировать?', `${displayName} снова сможет тебе писать`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Разблокировать',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('blocked_users')
              .delete()
              .eq('blocker_id', user.id)
              .eq('blocked_id', userId);
            setIsBlocked(false);
          }
        }
      ]);
      return;
    }

    Alert.alert('Заблокировать?', `${displayName} не сможет писать тебе`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Заблокировать', style: 'destructive',
        onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase.from('blocked_users').upsert(
            { blocker_id: user.id, blocked_id: userId },
            { onConflict: 'blocker_id,blocked_id' }
          );
          if (error) {
            Alert.alert('Ошибка', error.message);
          } else {
            setIsBlocked(true);
            Alert.alert('✅', 'Пользователь заблокирован');
          }
        }
      }
    ]);
  };

  const openReport = () => {
    navigation.navigate('Report', {
      reportedUserId: userId,
      userName: displayName,
    });
  };

  const getStatusText = () => {
    if (!profile || profile.online_visible === false) return null;
    if (isUserOnline(profile)) return { text: 'Онлайн', online: true };
    if (profile.last_seen_visibility === 'nobody') {
      return { text: 'Был(а) недавно', online: false };
    }
    const ls = formatLastSeen(profile.last_seen);
    return { text: `Был(а) ${ls.charAt(0).toLowerCase()}${ls.slice(1)}`, online: false };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const avatarColor = profile?.avatar_color || '#6C63FF';
  const avatarEmoji = profile?.avatar_emoji || '😊';
  const status = getStatusText();

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
        {profile?.custom_username ? (
          <Text style={styles.username}>@{profile.custom_username}</Text>
        ) : (
          <View style={{ height: 12 }} />
        )}

        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {status && (
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, {
              backgroundColor: status.online ? '#4CAF50' : '#888'
            }]} />
            <Text style={[styles.onlineText, {
              color: status.online ? '#4CAF50' : '#888'
            }]}>
              {status.text}
            </Text>
          </View>
        )}

        {profile?.phone_number && profile?.phone_visible && (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={16} color="#6C63FF" />
            <Text style={styles.phoneText}>{profile.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Кнопки действий */}
      {!isMe && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openChat} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="chatbubble" size={22} color="#fff" />
                  <Text style={styles.actionBtnText}>Написать</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={startCall}
            disabled={busy}
          >
            <Ionicons name="videocam" size={22} color="#6C63FF" />
            <Text style={[styles.actionBtnText, { color: '#6C63FF' }]}>Позвонить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Блокировка и жалоба */}
      {!isMe && (
        <>
          <TouchableOpacity
            style={isBlocked ? styles.unblockBtn : styles.blockBtn}
            onPress={toggleBlock}
          >
            <Ionicons
              name={isBlocked ? 'checkmark-circle' : 'ban'}
              size={18}
              color={isBlocked ? '#4CAF50' : '#FF4444'}
            />
            <Text style={isBlocked ? styles.unblockBtnText : styles.blockBtnText}>
              {isBlocked ? 'Разблокировать' : 'Заблокировать'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportBtn} onPress={openReport}>
            <Ionicons name="flag-outline" size={18} color="#FF9F43" />
            <Text style={styles.reportBtnText}>Пожаловаться</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Истории */}
      {stories.length > 0 && (
        <View style={styles.storiesSection}>
          <Text style={styles.sectionTitle}>📊 Истории</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stories.map((story) => (
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
  username: { fontSize: 14, color: '#6C63FF', marginBottom: 12 },
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
  blockBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginHorizontal: 16, padding: 14,
    backgroundColor: '#1A0A0A', borderRadius: 14,
    borderWidth: 1, borderColor: '#3A1A1A', marginTop: 4,
  },
  blockBtnText: { color: '#FF4444', fontSize: 14, fontWeight: '600' },
  unblockBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginHorizontal: 16, padding: 14,
    backgroundColor: '#0A1A0A', borderRadius: 14,
    borderWidth: 1, borderColor: '#1A3A1A', marginTop: 4,
  },
  unblockBtnText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginHorizontal: 16, padding: 14,
    backgroundColor: '#1A1200', borderRadius: 14,
    borderWidth: 1, borderColor: '#3A2A00', marginTop: 8,
  },
  reportBtnText: { color: '#FF9F43', fontSize: 14, fontWeight: '600' },
  storiesSection: { padding: 16, marginTop: 8 },
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
