import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SavedMessagesScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('saved_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('saved_messages').insert({
      user_id: user.id,
      content: newNote.trim(),
    });
    setNewNote('');
    setSaving(false);
    fetchSaved();
  };

  const deleteNote = (id) => {
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('saved_messages').delete().eq('id', id);
          setMessages(prev => prev.filter(m => m.id !== id));
        }
      }
    ]);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onLongPress={() => deleteNote(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.noteText}>{item.content}</Text>
      <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>⭐ Избранное</Text>
          <Text style={styles.headerSub}>{messages.length} заметок</Text>
        </View>
      </View>

      {/* Ввод */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Добавить заметку..."
            placeholderTextColor="#555"
            value={newNote}
            onChangeText={setNewNote}
            multiline
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (!newNote.trim() || saving) && styles.sendBtnDisabled]}
          onPress={saveNote}
          disabled={!newNote.trim() || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="bookmark" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>Избранное пусто</Text>
          <Text style={styles.emptySub}>Сохраняй заметки, ссылки и файлы здесь</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
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
  headerInfo: {},
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
    alignItems: 'flex-end',
  },
  inputContainer: {
    flex: 1, backgroundColor: '#111120',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: { color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555', textAlign: 'center' },
  list: { padding: 16 },
  noteCard: {
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  noteText: { color: '#fff', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  noteDate: { color: '#555', fontSize: 11 },
});

