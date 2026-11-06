import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const MOODS = ['😊', '😐', '😕', '🔥', '⚡'];

const formatDuration = (total) => {
  const t = total || 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

function ListSection({ icon, color, title, placeholder, items, setItems, draft, setDraft }) {
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems([...items, text]);
    setDraft('');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '22' }]}>
          <Text style={styles.sectionIconText}>{icon}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.map((item, i) => (
        <View key={`${item}-${i}`} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.itemText}>{item}</Text>
          <TouchableOpacity onPress={() => setItems(items.filter((_, idx) => idx !== i))}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder={placeholder}
          placeholderTextColor="#555"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          blurOnSubmit={false}
          maxLength={200}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: color }]} onPress={add}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SummaryScreen({ route, navigation }) {
  const params = route.params || {};
  const { callLogId = null, fromList = false } = params;

  const [loading, setLoading] = useState(!!callLogId);
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState(params.userName || 'Собеседник');
  const [duration, setDuration] = useState(params.duration ?? 0);
  const [isVideo, setIsVideo] = useState(params.isVideo !== false);
  const [mood, setMood] = useState(null);
  const [discussed, setDiscussed] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [todos, setTodos] = useState([]);
  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState({ discussed: '', decisions: '', todos: '' });

  const setDraft = (key) => (value) => setDrafts(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!callLogId) return;
    (async () => {
      const { data } = await supabase
        .from('call_logs').select('*').eq('id', callLogId).single();
      if (data) {
        setPartnerName(data.partner_name || partnerName);
        setDuration(data.duration_seconds ?? duration);
        setIsVideo(data.is_video !== false);
        setMood(data.mood || null);
        setDiscussed(data.discussed || []);
        setDecisions(data.decisions || []);
        setTodos(data.todos || []);
        setNote(data.note || '');
      }
      setLoading(false);
    })();
  }, [callLogId]);

  const leave = () => {
    if (fromList) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  };

  const withDraft = (items, key) => {
    const text = drafts[key].trim();
    return text ? [...items, text] : items;
  };

  const save = async () => {
    if (!callLogId) {
      leave();
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('call_logs')
      .update({
        mood,
        discussed: withDraft(discussed, 'discussed'),
        decisions: withDraft(decisions, 'decisions'),
        todos: withDraft(todos, 'todos'),
        note: note.trim() || null,
      })
      .eq('id', callLogId);
    setSaving(false);

    if (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить заметки');
      return;
    }
    leave();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={leave}>
          <Ionicons name={fromList ? 'arrow-back' : 'close'} size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Заметки о звонке</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Данные звонка */}
        <View style={styles.callCard}>
          <View style={styles.callAvatar}>
            <Text style={styles.callAvatarText}>
              {partnerName[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.callInfo}>
            <Text style={styles.callName}>{partnerName}</Text>
            <Text style={styles.callMeta}>
              {isVideo ? '📹 Видеозвонок' : '📞 Аудиозвонок'} • {formatDuration(duration)}
            </Text>
          </View>
        </View>

        {!callLogId && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Звонок не удалось записать в журнал, поэтому заметки сохранить нельзя.
            </Text>
          </View>
        )}

        {/* Настроение */}
        <Text style={styles.label}>Как прошёл разговор?</Text>
        <View style={styles.moodRow}>
          {MOODS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.moodBtn, mood === m && styles.moodBtnActive]}
              onPress={() => setMood(mood === m ? null : m)}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ListSection
          icon="🗣" color="#6C63FF" title="О чём говорили"
          placeholder="Например: планы на выходные"
          items={discussed} setItems={setDiscussed}
          draft={drafts.discussed} setDraft={setDraft('discussed')}
        />
        <ListSection
          icon="✅" color="#4CAF50" title="Решения"
          placeholder="Например: встреча в субботу в 15:00"
          items={decisions} setItems={setDecisions}
          draft={drafts.decisions} setDraft={setDraft('decisions')}
        />
        <ListSection
          icon="📌" color="#FF9F43" title="Что нужно сделать"
          placeholder="Например: отправить адрес кафе"
          items={todos} setItems={setTodos}
          draft={drafts.todos} setDraft={setDraft('todos')}
        />

        <Text style={styles.label}>Заметка</Text>
        <View style={styles.noteWrapper}>
          <TextInput
            style={styles.noteInput}
            placeholder="Что ещё важно запомнить..."
            placeholderTextColor="#555"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>💾 Сохранить</Text>
          }
        </TouchableOpacity>

        {!fromList && (
          <TouchableOpacity style={styles.skipBtn} onPress={leave}>
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { padding: 16 },
  callCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111120', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 12,
  },
  callAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  callAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  callInfo: { flex: 1 },
  callName: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  callMeta: { fontSize: 13, color: '#888' },
  warnBox: {
    backgroundColor: '#1A1200', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#3A2A00', marginBottom: 12,
  },
  warnText: { color: '#FF9F43', fontSize: 13, lineHeight: 18 },
  label: {
    color: '#888', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', marginTop: 8, marginBottom: 8,
  },
  moodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  moodBtn: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: '#111120', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1A1A2E',
  },
  moodBtnActive: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  moodEmoji: { fontSize: 24 },
  section: {
    backgroundColor: '#111120', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  sectionIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIconText: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { flex: 1, color: '#ddd', fontSize: 14, lineHeight: 20 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1, backgroundColor: '#0D0D1A', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E', color: '#fff', fontSize: 14,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  noteWrapper: {
    backgroundColor: '#111120', borderRadius: 14,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 16,
  },
  noteInput: {
    color: '#fff', fontSize: 14, padding: 14,
    height: 90, textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipBtn: { alignItems: 'center', padding: 14 },
  skipText: { color: '#888', fontSize: 14 },
});
