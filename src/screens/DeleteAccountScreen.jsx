import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { stopPresence } from '../lib/presence';

const CONFIRM_WORD = 'УДАЛИТЬ';

export default function DeleteAccountScreen({ navigation }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  // Удаляем фото пользователя: аватар (avatar_<id>.*) и фото из чатов (<id>_*.*)
  const removeMyFiles = async (userId) => {
    try {
      const names = new Set();
      for (const search of [userId, `avatar_${userId}`]) {
        const { data: files } = await supabase.storage
          .from('chat-media')
          .list('', { limit: 1000, search });
        (files || []).forEach(f => {
          if (f.name.includes(userId)) names.add(f.name);
        });
      }
      if (names.size > 0) {
        await supabase.storage.from('chat-media').remove([...names]);
      }
    } catch (e) { }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Нужно войти в аккаунт');

      stopPresence(user.id);
      await removeMyFiles(user.id);

      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;

      await supabase.auth.signOut({ scope: 'local' });

      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      setDeleting(false);
      Alert.alert('Ошибка', e.message || 'Не удалось удалить аккаунт');
    }
  };

  const askFinal = () => {
    Alert.alert(
      'Удалить аккаунт навсегда?',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          disabled={deleting}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Удаление аккаунта</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warnCard}>
          <Text style={styles.warnEmoji}>⚠️</Text>
          <Text style={styles.warnTitle}>Это необратимо</Text>
          <Text style={styles.warnText}>
            Будут удалены без возможности восстановления:
          </Text>
          {[
            'Твой профиль и аватар',
            'Все твои сообщения и фото',
            'Контакты, избранное и заблокированные',
            'Твои истории, посты и комментарии',
            'Участие в чатах, группах и каналах',
          ].map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.dot} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>
          Для подтверждения напиши слово {CONFIRM_WORD}
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={CONFIRM_WORD}
            placeholderTextColor="#555"
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
          />
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, (!canDelete || deleting) && styles.deleteBtnDisabled]}
          onPress={askFinal}
          disabled={!canDelete || deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.deleteText}>Удалить аккаунт навсегда</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={deleting}
        >
          <Text style={styles.cancelText}>Оставить аккаунт</Text>
        </TouchableOpacity>

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
  content: { padding: 16 },
  warnCard: {
    backgroundColor: '#1A0A0A', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#3A1A1A', marginBottom: 20,
  },
  warnEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  warnTitle: {
    color: '#FF4444', fontSize: 18, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 10,
  },
  warnText: { color: '#aaa', fontSize: 14, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4444' },
  itemText: { color: '#ddd', fontSize: 14, flex: 1 },
  label: { color: '#888', fontSize: 13, marginBottom: 8 },
  inputWrapper: {
    backgroundColor: '#111120', borderRadius: 14,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 16,
  },
  input: { color: '#fff', fontSize: 16, padding: 14, letterSpacing: 2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FF4444', borderRadius: 14, padding: 16,
  },
  deleteBtnDisabled: { opacity: 0.35 },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', padding: 16 },
  cancelText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});
