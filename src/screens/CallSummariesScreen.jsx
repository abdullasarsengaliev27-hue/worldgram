import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_SUMMARIES = [
  {
    id: '1',
    userName: 'Alish',
    duration: '05:32',
    date: 'Сегодня 13:20',
    mood: '😊',
    energy: 'Высокая',
    confidence: 82,
    topics: ['Планы на выходные', 'Работа', 'Кино'],
    discussed: [
      'Обсудили планы на выходные',
      'Поговорили о работе и задачах',
      'Договорились посмотреть фильм',
    ],
    decisions: ['Встреча в субботу в 15:00', 'Кафе в центре города'],
    todos: ['Отправить адрес кафе', 'Подтвердить время встречи'],
  },
  {
    id: '2',
    userName: 'Тестирую',
    duration: '02:15',
    date: 'Вчера 18:45',
    mood: '😎',
    energy: 'Средняя',
    confidence: 74,
    topics: ['Встреча', 'Планы'],
    discussed: [
      'Обсудили время встречи',
      'Уточнили детали плана',
    ],
    decisions: ['Созвониться завтра утром'],
    todos: ['Подтвердить время', 'Прислать документы'],
  },
  {
    id: '3',
    userName: 'Alish',
    duration: '10:05',
    date: '15 сент 20:00',
    mood: '🔥',
    energy: 'Очень высокая',
    confidence: 91,
    topics: ['Проект', 'Дедлайн', 'Задачи'],
    discussed: [
      'Обсудили статус проекта',
      'Разобрали дедлайны и задачи',
      'Распределили обязанности',
    ],
    decisions: ['Сдать проект в пятницу', 'Встреча с командой в среду'],
    todos: ['Отправить файлы', 'Проверить документы', 'Написать отчёт'],
  },
];

export default function CallSummariesScreen({ navigation }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Резюме звонков</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {MOCK_SUMMARIES.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📞</Text>
            <Text style={styles.emptyText}>Нет резюме звонков</Text>
            <Text style={styles.emptySubText}>
              После каждого звонка здесь будет появляться резюме
            </Text>
          </View>
        ) : (
          MOCK_SUMMARIES.map((summary) => (
            <TouchableOpacity
              key={summary.id}
              style={styles.summaryCard}
              onPress={() => setExpanded(expanded === summary.id ? null : summary.id)}
              activeOpacity={0.7}
            >
              {/* Заголовок */}
              <View style={styles.summaryHeader}>
                <View style={styles.summaryAvatar}>
                  <Text style={styles.summaryAvatarText}>
                    {summary.userName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryName}>{summary.userName}</Text>
                  <Text style={styles.summaryMeta}>
                    {summary.date} • {summary.duration}
                  </Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryMood}>{summary.mood}</Text>
                  <Ionicons
                    name={expanded === summary.id ? 'chevron-up' : 'chevron-down'}
                    size={16} color="#555"
                  />
                </View>
              </View>

              {/* Темы */}
              <View style={styles.topicsRow}>
                {summary.topics.slice(0, 2).map((topic, i) => (
                  <View key={i} style={styles.topicChip}>
                    <Text style={styles.topicChipText}>{topic}</Text>
                  </View>
                ))}
                {summary.topics.length > 2 && (
                  <View style={styles.topicChipMore}>
                    <Text style={styles.topicChipText}>+{summary.topics.length - 2}</Text>
                  </View>
                )}
              </View>

              {/* Развёрнутое содержимое */}
              {expanded === summary.id && (
                <View style={styles.expandedContent}>

                  {/* Статистика */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statEmoji}>{summary.mood}</Text>
                      <Text style={styles.statLabel}>Настроение</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statEmoji}>⚡</Text>
                      <Text style={styles.statLabel}>{summary.energy}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{summary.confidence}%</Text>
                      <Text style={styles.statLabel}>Уверенность</Text>
                    </View>
                  </View>

                  {/* О чём говорили */}
                  {summary.discussed?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#6C63FF22' }]}>
                          <Text style={styles.sectionIconText}>🗣</Text>
                        </View>
                        <Text style={styles.sectionTitle}>О чём говорили</Text>
                      </View>
                      {summary.discussed.map((d, i) => (
                        <View key={i} style={styles.sectionRow}>
                          <View style={[styles.dot, { backgroundColor: '#6C63FF' }]} />
                          <Text style={styles.sectionItem}>{d}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Решения */}
                  {summary.decisions?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#4CAF5022' }]}>
                          <Text style={styles.sectionIconText}>✅</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Решения</Text>
                      </View>
                      {summary.decisions.map((d, i) => (
                        <View key={i} style={styles.sectionRow}>
                          <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                          <Text style={styles.sectionItem}>{d}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Что нужно сделать */}
                  {summary.todos?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#FF9F4322' }]}>
                          <Text style={styles.sectionIconText}>📌</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Что нужно сделать</Text>
                      </View>
                      {summary.todos.map((t, i) => (
                        <View key={i} style={styles.sectionRow}>
                          <View style={[styles.dot, { backgroundColor: '#FF9F43' }]} />
                          <Text style={styles.sectionItem}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                </View>
              )}
            </TouchableOpacity>
          ))
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#555', textAlign: 'center' },
  summaryCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#111120', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 10,
  },
  summaryAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  summaryAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  summaryInfo: { flex: 1 },
  summaryName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  summaryMeta: { fontSize: 12, color: '#555' },
  summaryRight: { alignItems: 'center', gap: 4 },
  summaryMood: { fontSize: 22 },
  topicsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  topicChip: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  topicChipMore: {
    backgroundColor: '#1A1A2E', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  topicChipText: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  expandedContent: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#0D0D1A', borderRadius: 12,
    padding: 12, marginBottom: 12,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555' },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 8,
  },
  sectionIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIconText: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, marginBottom: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  sectionItem: { color: '#888', fontSize: 13, lineHeight: 20, flex: 1 },
});
