import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const REASONS = [
  { id: 'spam', label: 'Спам', icon: 'mail-unread-outline' },
  { id: 'abuse', label: 'Оскорбления и травля', icon: 'chatbubble-ellipses-outline' },
  { id: 'scam', label: 'Мошенничество', icon: 'warning-outline' },
  { id: 'inappropriate', label: 'Неприемлемый контент', icon: 'eye-off-outline' },
  { id: 'other', label: 'Другое', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function ReportScreen({ route, navigation }) {
  const {
    reportedUserId = null,
    chatId = null,
    messageId = null,
    messageContent = null,
    userName = 'Пользователь',
  } = route.params || {};

  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) {
      Alert.alert('Выбери причину', 'Укажи, почему ты жалуешься');
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Нужно войти в аккаунт');

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        chat_id: chatId,
        message_id: messageId && !String(messageId).startsWith('temp-') ? messageId : null,
        message_content: messageContent,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;

      if (alsoBlock && reportedUserId && reportedUserId !== user.id) {
        await supabase.from('blocked_users').upsert(
          { blocker_id: user.id, blocked_id: reportedUserId },
          { onConflict: 'blocker_id,blocked_id' }
        );
      }

      Alert.alert(
        'Жалоба отправлена ✅',
        'Спасибо. Мы рассмотрим её в течение 24 часов.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось отправить жалобу');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚩 Пожаловаться</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.subject}>На кого: {userName}</Text>

        {messageContent ? (
          <View style={styles.quoteBox}>
            <Text style={styles.quoteLabel}>Сообщение</Text>
            <Text style={styles.quoteText} numberOfLines={4}>
              {messageContent.startsWith('[IMAGE]') ? '📸 Фото' : messageContent}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Причина</Text>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.reasonItem, reason === r.id && styles.reasonItemActive]}
            onPress={() => setReason(r.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={r.icon}
              size={20}
              color={reason === r.id ? '#6C63FF' : '#888'}
            />
            <Text style={[styles.reasonText, reason === r.id && styles.reasonTextActive]}>
              {r.label}
            </Text>
            {reason === r.id && (
              <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Подробности (необязательно)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Расскажи, что произошло..."
            placeholderTextColor="#555"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={500}
          />
        </View>
        <Text style={styles.counter}>{details.length}/500</Text>

        {reportedUserId ? (
          <View style={styles.blockRow}>
            <View style={styles.blockInfo}>
              <Text style={styles.blockTitle}>Заблокировать пользователя</Text>
              <Text style={styles.blockSub}>Он не сможет тебе писать</Text>
            </View>
            <Switch
              value={alsoBlock}
              onValueChange={setAlsoBlock}
              trackColor={{ false: '#1A1A2E', true: '#6C63FF' }}
              thumbColor="#fff"
            />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, sending && { opacity: 0.7 }]}
          onPress={submit}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={styles.submitText}>Отправить жалобу</Text>
            </>
          )}
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
  subject: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  quoteBox: {
    backgroundColor: '#111120', borderRadius: 14, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#FF4444', marginBottom: 8,
  },
  quoteLabel: { color: '#FF4444', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  quoteText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    color: '#555', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111120', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1A1A2E',
  },
  reasonItemActive: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  reasonText: { flex: 1, color: '#888', fontSize: 15 },
  reasonTextActive: { color: '#fff', fontWeight: '600' },
  inputWrapper: {
    backgroundColor: '#111120', borderRadius: 14,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: {
    color: '#fff', fontSize: 14, padding: 14,
    height: 100, textAlignVertical: 'top',
  },
  counter: { color: '#555', fontSize: 11, textAlign: 'right', marginTop: 4 },
  blockRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  blockInfo: { flex: 1 },
  blockTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  blockSub: { color: '#555', fontSize: 12, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FF4444', borderRadius: 14,
    padding: 16, marginTop: 20,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

