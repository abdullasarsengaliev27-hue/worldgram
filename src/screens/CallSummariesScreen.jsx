import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const formatDuration = (total) => {
  const t = total || 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} сек`;
  return `${s} сек`;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(d, now)) return `Сегодня ${time}`;
  if (sameDay(d, yesterday)) return `Вчера ${time}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${time}`;
};

function Section({ icon, color, title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '22' }]}>
          <Text style={styles.sectionIconText}>{icon}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.sectionRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.sectionItem}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CallSummariesScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
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

  const deleteLog = (log) => {
    Alert.alert('Удалить запись?', 'Звонок и заметки будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('call_logs').delete().eq('id', log.id);
          if (error) {
            Alert.alert('Ошибка', 'Не удалось удалить запись');
          } else {
            setLogs(prev => prev.filter(l => l.id !== log.id));
          }
        }
      }
    ]);
  };

  const editLog = (log) => {
    navigation.navigate('Summary', {
      callLogId: log.id,
      userName: log.partner_name,
      fromList: true,
    });
  };

  const totalSeconds = logs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📋 Резюме звонков</Text>
          {logs.length > 0 && (
            <Text style={styles.headerSub}>
              {logs.length} звонков • всего {formatDuration(totalSeconds)}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
          }
        >
          {logs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📞</Text>
              <Text style={styles.emptyText}>Пока нет звонков</Text>
              <Text style={styles.emptySubText}>
                После каждого звонка здесь появится запись, к ней можно добавить заметки
              </Text>
            </View>
          ) : (
            logs.map((log) => {
              const isOpen = expanded === log.id;
              const hasNotes =
                (log.discussed?.length || 0) +
                (log.decisions?.length || 0) +
                (log.todos?.length || 0) > 0 || !!log.note;
              const topics = (log.discussed || []).slice(0, 2);

              return (
                <TouchableOpacity
                  key={log.id}
                  style={styles.card}
                  onPress={() => setExpanded(isOpen ? null : log.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(log.partner_name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {log.partner_name || 'Собеседник'}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {log.is_video ? '📹' : '📞'} {formatDate(log.created_at)} • {formatDuration(log.duration_seconds)}
                      </Text>
                    </View>
                    <View style={styles.cardRight}>
                      {log.mood ? <Text style={styles.cardMood}>{log.mood}</Text> : null}
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16} color="#555"
                      />
                    </View>
                  </View>

                  {topics.length > 0 && (
                    <View style={styles.topicsRow}>
                      {topics.map((t, i) => (
                        <View key={i} style={styles.topicChip}>
                          <Text style={styles.topicChipText} numberOfLines={1}>{t}</Text>
                        </View>
                      ))}
                      {(log.discussed?.length || 0) > 2 && (
                        <View style={styles.topicChipMore}>
                          <Text style={styles.topicChipText}>+{log.discussed.length - 2}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {isOpen && (
                    <View style={styles.expanded}>
                      {hasNotes ? (
                        <>
                          <Section icon="🗣" color="#6C63FF" title="О чём говорили" items={log.discussed} />
                          <Section icon="✅" color="#4CAF50" title="Решения" items={log.decisions} />
                          <Section icon="📌" color="#FF9F43" title="Что нужно сделать" items={log.todos} />
                          {log.note ? (
                            <View style={styles.noteBox}>
                              <Text style={styles.noteLabel}>Заметка</Text>
                              <Text style={styles.noteText}>{log.note}</Text>
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <Text style={styles.noNotes}>Заметок пока нет</Text>
                      )}

                      <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => editLog(log)}>
                          <Ionicons name="create-outline" size={16} color="#6C63FF" />
                          <Text style={styles.editBtnText}>
                            {hasNotes ? 'Изменить' : 'Добавить заметки'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteLog(log)}>
                          <Ionicons name="trash-outline" size={16} color="#FF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#111120', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  cardMeta: { fontSize: 12, color: '#666' },
  cardRight: { alignItems: 'center', gap: 4 },
  cardMood: { fontSize: 22 },
  topicsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  topicChip: {
    backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, maxWidth: '70%',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  topicChipMore: {
    backgroundColor: '#1A1A2E', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  topicChipText: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  expanded: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  sectionIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIconText: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  sectionItem: { color: '#aaa', fontSize: 14, lineHeight: 20, flex: 1 },
  noteBox: {
    backgroundColor: '#0D0D1A', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  noteLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  noteText: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  noNotes: { color: '#555', fontSize: 14, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  editBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1A0A0A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#3A1A1A',
  },
});
