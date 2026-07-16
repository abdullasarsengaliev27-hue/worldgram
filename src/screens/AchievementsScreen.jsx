import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notifyAchievement } from '../lib/notifications';

const ACHIEVEMENTS = [
  {
    id: '1', icon: 'trophy', title: 'Первый звонок',
    desc: 'Совершил первый видеозвонок',
    points: 50, unlocked: true, color: '#FFC107',
  },
  {
    id: '2', icon: 'chatbubbles', title: 'Болтун',
    desc: 'Отправил 10 сообщений',
    points: 30, unlocked: true, color: '#6C63FF',
  },
  {
    id: '3', icon: 'heart', title: 'Добряк',
    desc: 'Отправил 5 Heart Ping',
    points: 40, unlocked: true, color: '#FF6B6B',
  },
  {
    id: '4', icon: 'time', title: '100 минут',
    desc: '100 минут видеосвязи',
    points: 100, unlocked: false, color: '#00D2D3',
  },
  {
    id: '5', icon: 'flame', title: 'Активный',
    desc: 'Заходил 7 дней подряд',
    points: 70, unlocked: false, color: '#FF9F43',
  },
  {
    id: '6', icon: 'language', title: 'Полиглот',
    desc: 'Использовал переводчик 10 раз',
    points: 80, unlocked: false, color: '#A29BFE',
  },
  {
    id: '7', icon: 'flash', title: 'Энергичный',
    desc: 'Высокая энергия в 5 звонках',
    points: 60, unlocked: false, color: '#FFC107',
  },
  {
    id: '8', icon: 'mic', title: 'Мастер речи',
    desc: 'Уверенность речи 90%+ в звонке',
    points: 90, unlocked: false, color: '#4CAF50',
  },
];

export default function AchievementsScreen({ navigation }) {
  const [totalPoints] = useState(
    ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + a.points, 0)
  );
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    // Анимация
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  
    // Уведомление при первом открытии достижений
    notifyAchievement('Исследователь', 5);
  }, []);

  const level = Math.floor(totalPoints / 100) + 1;
  const progress = totalPoints % 100;
  const unlocked = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Достижения</Text>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={12} color="#FFC107" />
          <Text style={styles.pointsBadgeText}>{totalPoints}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Level Card */}
        <Animated.View style={[styles.levelCard, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <View style={styles.levelLeft}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level}</Text>
              <Text style={styles.levelLabel}>LVL</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Мировой общатель</Text>
              <Text style={styles.levelPoints}>⭐ {totalPoints} очков</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}/100 до уровня {level + 1}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: unlocked, label: 'Получено', icon: 'trophy', color: '#FFC107' },
            { value: ACHIEVEMENTS.length - unlocked, label: 'Осталось', icon: 'lock-closed', color: '#555' },
            { value: totalPoints, label: 'Очков', icon: 'star', color: '#6C63FF' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Unlocked */}
        <Text style={styles.sectionTitle}>🏆 Получено</Text>
        {ACHIEVEMENTS.filter(a => a.unlocked).map((a, i) => (
          <Animated.View
            key={a.id}
            style={[styles.achievementCard, styles.achievementUnlocked, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}
          >
            <View style={[styles.achIcon, { backgroundColor: a.color + '22' }]}>
              <Ionicons name={a.icon} size={24} color={a.color} />
            </View>
            <View style={styles.achInfo}>
              <Text style={styles.achTitle}>{a.title}</Text>
              <Text style={styles.achDesc}>{a.desc}</Text>
              <View style={styles.achPointsRow}>
                <Ionicons name="star" size={12} color="#FFC107" />
                <Text style={styles.achPoints}>+{a.points} очков</Text>
              </View>
            </View>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          </Animated.View>
        ))}

        {/* Locked */}
        <Text style={styles.sectionTitle}>🔒 Предстоит получить</Text>
        {ACHIEVEMENTS.filter(a => !a.unlocked).map((a) => (
          <View key={a.id} style={[styles.achievementCard, styles.achievementLocked]}>
            <View style={styles.achIconLocked}>
              <Ionicons name="lock-closed" size={22} color="#333" />
            </View>
            <View style={styles.achInfo}>
              <Text style={styles.achTitleLocked}>{a.title}</Text>
              <Text style={styles.achDesc}>{a.desc}</Text>
              <View style={styles.achPointsRow}>
                <Ionicons name="star" size={12} color="#444" />
                <Text style={styles.achPointsLocked}>+{a.points} очков</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 55,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1A0A', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#FFC107',
  },
  pointsBadgeText: { color: '#FFC107', fontSize: 13, fontWeight: 'bold' },
  levelCard: {
    margin: 16, backgroundColor: '#111120',
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#6C63FF',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 15, elevation: 10,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  levelBadge: {
    width: 65, height: 65, borderRadius: 32,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 12,
  },
  levelNumber: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  levelLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  levelPoints: { fontSize: 13, color: '#6C63FF', marginBottom: 8 },
  progressBar: {
    height: 6, backgroundColor: '#1A1A2E',
    borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  progressFill: {
    height: '100%', backgroundColor: '#6C63FF', borderRadius: 3,
  },
  progressText: { fontSize: 11, color: '#555' },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    gap: 10, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: '#111120', borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  statIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555' },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#fff',
    marginHorizontal: 16, marginBottom: 10,
  },
  achievementCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, padding: 14,
    borderWidth: 1, gap: 12,
  },
  achievementUnlocked: {
    backgroundColor: '#111120', borderColor: '#1A1A2E',
  },
  achievementLocked: {
    backgroundColor: '#0D0D14', borderColor: '#111120', opacity: 0.6,
  },
  achIcon: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  achIconLocked: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  achInfo: { flex: 1 },
  achTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  achTitleLocked: { fontSize: 15, fontWeight: 'bold', color: '#444', marginBottom: 3 },
  achDesc: { fontSize: 12, color: '#555', marginBottom: 6 },
  achPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  achPoints: { fontSize: 12, color: '#FFC107', fontWeight: '600' },
  achPointsLocked: { fontSize: 12, color: '#333' },
  checkBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
});
