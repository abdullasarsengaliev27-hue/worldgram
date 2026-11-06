import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const RARITY = {
  common: { label: null, color: '#888' },
  rare: { label: 'RARE', color: '#6C63FF' },
  epic: { label: 'EPIC', color: '#FFC107' },
};

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'chat', label: '💬 Общение' },
  { id: 'social', label: '🌍 Сообщество' },
  { id: 'calls', label: '📞 Звонки' },
  { id: 'profile', label: '👤 Профиль' },
];

const ACHIEVEMENTS = [
  // Общение
  { id: 'first_msg', cat: 'chat', icon: '💬', title: 'Первое слово', desc: 'Отправь первое сообщение', metric: 'messages', target: 1, points: 10, rarity: 'common' },
  { id: 'talker', cat: 'chat', icon: '🗨', title: 'Болтун', desc: 'Отправь 50 сообщений', metric: 'messages', target: 50, points: 30, rarity: 'common' },
  { id: 'master', cat: 'chat', icon: '📣', title: 'Мастер общения', desc: 'Отправь 500 сообщений', metric: 'messages', target: 500, points: 100, rarity: 'epic' },
  { id: 'friend', cat: 'chat', icon: '🤝', title: 'Новый друг', desc: 'Начни первый чат', metric: 'chats', target: 1, points: 10, rarity: 'common' },
  { id: 'circle', cat: 'chat', icon: '👥', title: 'Свой круг', desc: 'Заведи 5 чатов', metric: 'chats', target: 5, points: 30, rarity: 'rare' },
  { id: 'emotion', cat: 'chat', icon: '❤️', title: 'Эмоции', desc: 'Поставь первую реакцию', metric: 'reactions', target: 1, points: 10, rarity: 'common' },
  { id: 'soul', cat: 'chat', icon: '🔥', title: 'Душа компании', desc: 'Поставь 25 реакций', metric: 'reactions', target: 25, points: 40, rarity: 'rare' },

  // Сообщество
  { id: 'organizer', cat: 'social', icon: '👨‍👩‍👧', title: 'Организатор', desc: 'Создай группу', metric: 'groups_created', target: 1, points: 20, rarity: 'common' },
  { id: 'story', cat: 'social', icon: '📸', title: 'Рассказчик', desc: 'Опубликуй историю', metric: 'stories', target: 1, points: 10, rarity: 'common' },
  { id: 'storyteller', cat: 'social', icon: '🎬', title: 'Сторителлер', desc: 'Опубликуй 10 историй', metric: 'stories', target: 10, points: 50, rarity: 'rare' },
  { id: 'subscriber', cat: 'social', icon: '📢', title: 'Подписчик', desc: 'Подпишись на канал', metric: 'channels_joined', target: 1, points: 10, rarity: 'common' },
  { id: 'author', cat: 'social', icon: '✍️', title: 'Автор', desc: 'Опубликуй пост в своём канале', metric: 'posts', target: 1, points: 30, rarity: 'rare' },
  { id: 'commenter', cat: 'social', icon: '💭', title: 'Комментатор', desc: 'Напиши комментарий к посту', metric: 'comments', target: 1, points: 10, rarity: 'common' },
  { id: 'contacts', cat: 'social', icon: '📱', title: 'Записная книжка', desc: 'Добавь 5 контактов', metric: 'contacts', target: 5, points: 20, rarity: 'common' },

  // Звонки
  { id: 'first_call', cat: 'calls', icon: '📞', title: 'Первый звонок', desc: 'Позвони кому-нибудь', metric: 'calls', target: 1, points: 15, rarity: 'common' },
  { id: 'caller', cat: 'calls', icon: '🎧', title: 'На связи', desc: 'Сделай 10 звонков', metric: 'calls', target: 10, points: 50, rarity: 'rare' },
  { id: 'hour', cat: 'calls', icon: '⏱', title: 'Час разговоров', desc: 'Наговори 60 минут', metric: 'call_minutes', target: 60, points: 60, rarity: 'rare' },
  { id: 'notes', cat: 'calls', icon: '📝', title: 'Конспектор', desc: 'Добавь заметки к звонку', metric: 'call_notes', target: 1, points: 20, rarity: 'common' },
  { id: 'protocol', cat: 'calls', icon: '🗂', title: 'Протоколист', desc: 'Заметки к 5 звонкам', metric: 'call_notes', target: 5, points: 60, rarity: 'epic' },

  // Профиль
  { id: 'face', cat: 'profile', icon: '🖼', title: 'Лицо профиля', desc: 'Поставь фото профиля', metric: 'has_avatar', target: 1, points: 15, rarity: 'common' },
  { id: 'about', cat: 'profile', icon: '📖', title: 'О себе', desc: 'Заполни раздел «О себе»', metric: 'has_bio', target: 1, points: 10, rarity: 'common' },
  { id: 'handle', cat: 'profile', icon: '🔎', title: 'Узнаваемый', desc: 'Задай свой @username', metric: 'has_username', target: 1, points: 15, rarity: 'common' },
  { id: 'complete', cat: 'profile', icon: '⭐', title: 'Полный профиль', desc: 'Фото, о себе, @username и телефон', metric: 'profile_items', target: 4, points: 40, rarity: 'rare' },
  { id: 'week', cat: 'profile', icon: '🌱', title: 'Первая неделя', desc: '7 дней с Worldgram', metric: 'account_days', target: 7, points: 10, rarity: 'common' },
  { id: 'month', cat: 'profile', icon: '🌿', title: 'Месяц с нами', desc: '30 дней с Worldgram', metric: 'account_days', target: 30, points: 30, rarity: 'rare' },
  { id: 'hundred', cat: 'profile', icon: '🌳', title: '100 дней', desc: '100 дней с Worldgram', metric: 'account_days', target: 100, points: 100, rarity: 'epic' },
];

const countRows = async (table, filters) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  Object.entries(filters).forEach(([col, val]) => { query = query.eq(col, val); });
  const { count } = await query;
  return count || 0;
};

export default function AchievementsScreen({ navigation }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uid = user.id;

      const [
        messages, chats, groupsCreated, stories, contacts, reactions,
        channelsJoined, posts, comments, logsRes, profileRes,
      ] = await Promise.all([
        countRows('messages', { sender_id: uid }),
        countRows('chat_members', { user_id: uid }),
        countRows('chats', { created_by: uid, is_group: true }),
        countRows('stories', { user_id: uid }),
        countRows('contacts', { user_id: uid }),
        countRows('message_reactions', { user_id: uid }),
        countRows('channel_members', { user_id: uid }),
        countRows('channel_posts', { author_id: uid }),
        countRows('post_comments', { author_id: uid }),
        supabase
          .from('call_logs')
          .select('duration_seconds, discussed, decisions, todos, note')
          .limit(1000),
        supabase
          .from('profiles')
          .select('avatar_url, bio, custom_username, phone_number')
          .eq('id', uid)
          .single(),
      ]);

      const logs = logsRes.data || [];
      const profile = profileRes.data || {};

      const totalSeconds = logs.reduce((s, l) => s + (l.duration_seconds || 0), 0);
      const callNotes = logs.filter(l =>
        (l.discussed?.length || 0) + (l.decisions?.length || 0) + (l.todos?.length || 0) > 0 ||
        !!l.note
      ).length;

      const hasAvatar = profile.avatar_url ? 1 : 0;
      const hasBio = profile.bio?.trim() ? 1 : 0;
      const hasUsername = profile.custom_username?.trim() ? 1 : 0;
      const hasPhone = profile.phone_number?.trim() ? 1 : 0;

      const accountDays = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / 86400000
      );

      setMetrics({
        messages,
        chats,
        groups_created: groupsCreated,
        stories,
        contacts,
        reactions,
        channels_joined: channelsJoined,
        posts,
        comments,
        calls: logs.length,
        call_minutes: Math.floor(totalSeconds / 60),
        call_notes: callNotes,
        has_avatar: hasAvatar,
        has_bio: hasBio,
        has_username: hasUsername,
        profile_items: hasAvatar + hasBio + hasUsername + hasPhone,
        account_days: Math.max(0, accountDays),
      });
    } catch (e) {
      setMetrics(prev => prev || {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading || !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const items = ACHIEVEMENTS.map(a => {
    const value = metrics[a.metric] || 0;
    return { ...a, value, unlocked: value >= a.target };
  });

  const unlockedCount = items.filter(a => a.unlocked).length;
  const points = items.filter(a => a.unlocked).reduce((s, a) => s + a.points, 0);
  const totalPoints = items.reduce((s, a) => s + a.points, 0);
  const level = Math.floor(points / 100) + 1;
  const levelProgress = (points % 100) / 100;

  const visible = items.filter(a => category === 'all' || a.cat === category);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Достижения</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
        {/* Уровень */}
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level}</Text>
              <Text style={styles.levelLabel}>уровень</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.pointsText}>{points} очков</Text>
              <Text style={styles.pointsSub}>
                Получено {unlockedCount} из {items.length} • максимум {totalPoints}
              </Text>
            </View>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${levelProgress * 100}%` }]} />
          </View>
          <Text style={styles.barHint}>
            До уровня {level + 1}: {100 - (points % 100)} очков
          </Text>
        </View>

        {/* Категории */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, category === c.id && styles.catChipActive]}
              onPress={() => setCategory(c.id)}
            >
              <Text style={[styles.catText, category === c.id && styles.catTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Список */}
        <View style={styles.list}>
          {visible.map(a => {
            const progress = Math.min(a.value / a.target, 1);
            const rarity = RARITY[a.rarity];
            return (
              <View
                key={a.id}
                style={[styles.card, a.unlocked && { borderColor: rarity.color + '88' }]}
              >
                <View style={[styles.iconBox, a.unlocked && { backgroundColor: rarity.color + '22' }]}>
                  <Text style={[styles.icon, !a.unlocked && { opacity: 0.35 }]}>{a.icon}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, !a.unlocked && { color: '#888' }]}>
                      {a.title}
                    </Text>
                    {rarity.label && (
                      <View style={[styles.rarityPill, { borderColor: rarity.color }]}>
                        <Text style={[styles.rarityText, { color: rarity.color }]}>
                          {rarity.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardDesc}>{a.desc}</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress * 100}%`,
                            backgroundColor: a.unlocked ? rarity.color : '#3A3A5E',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.min(a.value, a.target)}/{a.target}
                    </Text>
                  </View>
                </View>
                <View style={styles.pointsBox}>
                  {a.unlocked
                    ? <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    : <Text style={styles.cardPoints}>+{a.points}</Text>
                  }
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  levelCard: {
    margin: 16, backgroundColor: '#111120', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  levelBadge: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 10,
  },
  levelNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff', lineHeight: 32 },
  levelLabel: { fontSize: 9, color: '#ddd', textTransform: 'uppercase' },
  levelInfo: { flex: 1 },
  pointsText: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  pointsSub: { fontSize: 12, color: '#666', lineHeight: 17 },
  barBg: {
    height: 8, backgroundColor: '#1A1A2E', borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 4 },
  barHint: { color: '#555', fontSize: 11, marginTop: 6 },
  catRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#111120', borderWidth: 1, borderColor: '#1A1A2E',
  },
  catChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  catText: { color: '#666', fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111120', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#1A1A2E',
  },
  iconBox: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  rarityPill: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  rarityText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  cardDesc: { fontSize: 12, color: '#666', marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: {
    flex: 1, height: 5, backgroundColor: '#1A1A2E',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: '#555', fontSize: 11, minWidth: 40, textAlign: 'right' },
  pointsBox: { width: 40, alignItems: 'center' },
  cardPoints: { color: '#6C63FF', fontSize: 13, fontWeight: 'bold' },
});
