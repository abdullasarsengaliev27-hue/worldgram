import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ACHIEVEMENTS = [
  {
    id: '1', icon: 'trophy', title: 'Первый звонок',
    desc: 'Совершил первый видеозвонок',
    points: 50, unlocked: true, color: '#FFC107',
    category: 'Звонки', rare: false,
  },
  {
    id: '2', icon: 'chatbubbles', title: 'Болтун',
    desc: 'Отправил 10 сообщений',
    points: 30, unlocked: true, color: '#6C63FF',
    category: 'Чаты', rare: false,
  },
  {
    id: '3', icon: 'heart', title: 'Добряк',
    desc: 'Отправил 5 Heart Ping',
    points: 40, unlocked: true, color: '#FF6B6B',
    category: 'Реакции', rare: false,
  },
  {
    id: '4', icon: 'flame', title: 'Активный',
    desc: 'Заходил 7 дней подряд',
    points: 70, unlocked: false, color: '#FF9F43',
    category: 'Активность', rare: false,
  },
  {
    id: '5', icon: 'time', title: '100 минут',
    desc: '100 минут видеосвязи',
    points: 100, unlocked: false, color: '#00D2D3',
    category: 'Звонки', rare: true,
  },
  {
    id: '6', icon: 'camera', title: 'Фотограф',
    desc: 'Отправил 10 фотографий в чате',
    points: 45, unlocked: false, color: '#A29BFE',
    category: 'Чаты', rare: false,
  },
  {
    id: '7', icon: 'map', title: 'На карте',
    desc: 'Включил геолокацию впервые',
    points: 35, unlocked: false, color: '#4CAF50',
    category: 'Карта', rare: false,
  },
  {
    id: '8', icon: 'people', title: 'Организатор',
    desc: 'Создал групповой чат',
    points: 60, unlocked: false, color: '#FF6B6B',
    category: 'Чаты', rare: false,
  },
  {
    id: '9', icon: 'mic', title: 'Мастер речи',
    desc: 'Уверенность речи 90%+ в звонке',
    points: 90, unlocked: false, color: '#6C63FF',
    category: 'Звонки', rare: true,
  },
  {
    id: '10', icon: 'albums', title: 'Стори-мейкер',
    desc: 'Опубликовал 5 историй',
    points: 55, unlocked: false, color: '#FFC107',
    category: 'Истории', rare: false,
  },
  {
    id: '11', icon: 'star', title: 'Легенда',
    desc: 'Набрал 500 очков',
    points: 200, unlocked: false, color: '#FF9F43',
    category: 'Особые', rare: true,
  },
  {
    id: '12', icon: 'flash', title: 'Молния',
    desc: 'Ответил на сообщение за 5 секунд',
    points: 25, unlocked: false, color: '#FFC107',
    category: 'Чаты', rare: false,
  },
];

const CATEGORIES = ['Все', 'Звонки', 'Чаты', 'Реакции', 'Активность', 'Карта', 'Истории', 'Особые'];

export default function AchievementsScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const totalPoints = ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + a.points, 0);
  const unlocked = ACHIEVEMENTS.filter(a => a.unlocked).length;
  const level = Math.floor(totalPoints / 100) + 1;
  const progress = totalPoints % 100;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const filtered = selectedCategory === 'Все'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === selectedCategory);

  const unlockedFiltered = filtered.filter(a => a.unlocked);
  const lockedFiltered = filtered.filter(a => !a.unlocked);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Достижения</Text>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={14} color="#FFC107" />
          <Text style={styles.pointsBadgeText}>{totalPoints}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Level Card */}
        <Animated.View style={[styles.levelCard, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }]}>
          <View style={styles.levelCardBg} />
          <View style={styles.levelLeft}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level}</Text>
              <Text style={styles.levelLabel}>LVL</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>
                {level <= 2 ? '🌱 Новичок' :
                 level <= 5 ? '⚡ Активный' :
                 level <= 10 ? '🔥 Опытный' : '👑 Легенда'}
              </Text>
              <Text style={styles.levelPoints}>⭐ {totalPoints} очков</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}/100</Text>
              </View>
            </View>
          </View>

          {/* Мини статистика */}
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{unlocked}</Text>
              <Text style={styles.miniStatLabel}>Получено</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{ACHIEVEMENTS.length - unlocked}</Text>
              <Text style={styles.miniStatLabel}>Осталось</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{ACHIEVEMENTS.filter(a => a.rare && a.unlocked).length}</Text>
              <Text style={styles.miniStatLabel}>Редких</Text>
            </View>
          </View>
        </Animated.View>

        {/* Категории */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Полученные */}
        {unlockedFiltered.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ Получено</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{unlockedFiltered.length}</Text>
              </View>
            </View>
            {unlockedFiltered.map((a, i) => (
              <Animated.View
                key={a.id}
                style={[styles.achievementCard, styles.achievementUnlocked, {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }]}
              >
                {a.rare && (
                  <View style={styles.rareBadge}>
                    <Text style={styles.rareBadgeText}>✨ RARE</Text>
                  </View>
                )}
                <View style={[styles.achIconContainer, { backgroundColor: a.color + '22' }]}>
                  <Ionicons name={a.icon} size={28} color={a.color} />
                </View>
                <View style={styles.achContent}>
                  <View style={styles.achTitleRow}>
                    <Text style={styles.achTitle}>{a.title}</Text>
                    <View style={[styles.categoryTag, { backgroundColor: a.color + '22' }]}>
                      <Text style={[styles.categoryTagText, { color: a.color }]}>{a.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.achDesc}>{a.desc}</Text>
                  <View style={styles.achFooter}>
                    <View style={styles.achPoints}>
                      <Ionicons name="star" size={12} color="#FFC107" />
                      <Text style={styles.achPointsText}>+{a.points} очков</Text>
                    </View>
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Заблокированные */}
        {lockedFiltered.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔒 Предстоит получить</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#1A1A2E' }]}>
                <Text style={styles.sectionBadgeText}>{lockedFiltered.length}</Text>
              </View>
            </View>
            {lockedFiltered.map((a) => (
              <View key={a.id} style={[styles.achievementCard, styles.achievementLocked]}>
                {a.rare && (
                  <View style={[styles.rareBadge, { backgroundColor: '#1A1A2E' }]}>
                    <Text style={[styles.rareBadgeText, { color: '#555' }]}>✨ RARE</Text>
                  </View>
                )}
                <View style={styles.achIconLocked}>
                  <Ionicons name="lock-closed" size={24} color="#333" />
                </View>
                <View style={styles.achContent}>
                  <View style={styles.achTitleRow}>
                    <Text style={styles.achTitleLocked}>{a.title}</Text>
                    <View style={styles.categoryTagLocked}>
                      <Text style={styles.categoryTagTextLocked}>{a.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.achDescLocked}>{a.desc}</Text>
                  <View style={styles.achFooter}>
                    <View style={styles.achPoints}>
                      <Ionicons name="star" size={12} color="#444" />
                      <Text style={[styles.achPointsText, { color: '#444' }]}>+{a.points} очков</Text>
                    </View>
                    {/* Прогресс бар для некоторых */}
                    <View style={styles.lockProgress}>
                      <View style={styles.lockProgressFill} />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#fff' },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1500', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#FFC107',
  },
  pointsBadgeText: { color: '#FFC107', fontSize: 14, fontWeight: 'bold' },
  levelCard: {
    margin: 16, backgroundColor: '#111120',
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#2A2A3E',
    overflow: 'hidden',
  },
  levelCardBg: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(108,99,255,0.08)',
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  levelBadge: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 15, elevation: 15,
  },
  levelNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  levelLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  levelPoints: { fontSize: 13, color: '#6C63FF', marginBottom: 8 },
  progressBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: {
    flex: 1, height: 8, backgroundColor: '#1A1A2E',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  progressText: { fontSize: 11, color: '#555' },
  miniStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#0D0D1A', borderRadius: 14, padding: 12,
  },
  miniStat: { alignItems: 'center' },
  miniStatValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  miniStatLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  miniStatDivider: { width: 1, backgroundColor: '#1A1A2E' },
  categoriesContainer: { paddingHorizontal: 16, marginBottom: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#111120',
    marginRight: 8, borderWidth: 1, borderColor: '#1A1A2E',
  },
  categoryChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  categoryText: { color: '#555', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  sectionBadge: {
    backgroundColor: '#6C63FF', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  achievementCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1, gap: 12, position: 'relative',
    overflow: 'hidden',
  },
  achievementUnlocked: { backgroundColor: '#111120', borderColor: '#1A1A2E' },
  achievementLocked: { backgroundColor: '#0D0D14', borderColor: '#111120', opacity: 0.7 },
  rareBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
  },
  rareBadgeText: { color: '#FFC107', fontSize: 10, fontWeight: 'bold' },
  achIconContainer: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
  achIconLocked: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  achContent: { flex: 1 },
  achTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  achTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  achTitleLocked: { fontSize: 15, fontWeight: 'bold', color: '#444' },
  categoryTag: {
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  categoryTagText: { fontSize: 10, fontWeight: 'bold' },
  categoryTagLocked: {
    backgroundColor: '#1A1A2E', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  categoryTagTextLocked: { color: '#333', fontSize: 10 },
  achDesc: { fontSize: 12, color: '#666', marginBottom: 8 },
  achDescLocked: { fontSize: 12, color: '#333', marginBottom: 8 },
  achFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  achPoints: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  achPointsText: { fontSize: 12, color: '#FFC107', fontWeight: '600' },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  lockProgress: {
    width: 60, height: 4, backgroundColor: '#1A1A2E',
    borderRadius: 2, overflow: 'hidden',
  },
  lockProgressFill: {
    width: '30%', height: '100%',
    backgroundColor: '#333', borderRadius: 2,
  },
});
