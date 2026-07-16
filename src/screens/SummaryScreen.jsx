import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SummaryScreen({ route, navigation }) {
  const { userName, duration } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      setSummary({
        duration: duration || '05:32',
        topics: [
          'Обсудили планы на выходные',
          'Договорились встретиться в субботу',
          'Выбрали кафе в центре',
        ],
        decisions: [
          'Встреча в субботу в 15:00',
          'Место: кафе в центре города',
        ],
        todos: [
          'Отправить адрес кафе',
          'Подтвердить время встречи',
        ],
        mood: '😊 Позитивный',
        energy: '⚡ Высокая',
        confidence: 82,
      });
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start();
    }, 2000);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingTitle}>ИИ анализирует звонок...</Text>
          <Text style={styles.loadingSubText}>Создаём резюме разговора</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.ScrollView style={[styles.container, { opacity: fadeAnim }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={28} color="#6C63FF" />
        </View>
        <Text style={styles.headerTitle}>Резюме звонка</Text>
        <Text style={styles.headerSub}>с {userName} • {summary.duration}</Text>
      </View>

      {/* Mood и Energy */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>😊</Text>
          <Text style={styles.statValue}>Позитивный</Text>
          <Text style={styles.statLabel}>Настроение</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValue}>Высокая</Text>
          <Text style={styles.statLabel}>Энергия</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🎤</Text>
          <Text style={styles.statValue}>{summary.confidence}%</Text>
          <Text style={styles.statLabel}>Уверенность</Text>
        </View>
      </View>

      {/* Секции */}
      {[
        { title: 'О чём говорили', icon: 'chatbubbles', color: '#6C63FF', items: summary.topics },
        { title: 'Решения', icon: 'checkmark-circle', color: '#4CAF50', items: summary.decisions },
        { title: 'Что нужно сделать', icon: 'list', color: '#FF9F43', items: summary.todos },
      ].map((section, si) => (
        <View key={si} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: section.color + '22' }]}>
              <Ionicons name={section.icon} size={18} color={section.color} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <View style={[styles.listDot, { backgroundColor: section.color }]} />
              <Text style={styles.listItemText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Кнопки */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Chat', { chatId: null, userName })}
        >
          <Ionicons name="chatbubble" size={18} color="#6C63FF" />
          <Text style={styles.secondaryBtnText}>Написать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Ionicons name="home" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>На главную</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  loadingContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  loadingCard: {
    backgroundColor: '#111120', borderRadius: 24,
    padding: 40, alignItems: 'center',
    borderWidth: 1, borderColor: '#1A1A2E', gap: 12,
  },
  loadingTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loadingSubText: { color: '#555', fontSize: 14 },
  header: {
    alignItems: 'center', padding: 30, paddingTop: 60,
  },
  headerIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#6C63FF' },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    gap: 10, marginBottom: 16,
  },
  statCard: {
    flex: 1, backgroundColor: '#111120',
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#1A1A2E', gap: 4,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555' },
  section: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#111120', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 14,
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  listItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  listItemText: { color: '#ccc', fontSize: 14, flex: 1, lineHeight: 20 },
  btnRow: {
    flexDirection: 'row', marginHorizontal: 16,
    gap: 10, marginTop: 8,
  },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#6C63FF',
  },
  secondaryBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#6C63FF', borderRadius: 14, padding: 14,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
