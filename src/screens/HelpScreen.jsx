import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Впиши сюда настоящую почту поддержки.
// Пока строка пустая, блок «Контакты» на экране скрыт.
const SUPPORT_EMAIL = '';

const FAQ = [
  {
    q: 'Как начать видеозвонок?',
    a: 'Открой чат с человеком и нажми 📹 справа вверху. Собеседник должен нажать «Позвонить» в этом же чате, тогда вы окажетесь в одной комнате.',
  },
  {
    q: 'Как отправить фото в чате?',
    a: 'В чате нажми «+» рядом с полем ввода и выбери «Камера» или «Галерея».',
  },
  {
    q: 'Как создать групповой чат?',
    a: 'На главном экране нажми круглую кнопку с людьми справа внизу, выбери участников и задай название группы.',
  },
  {
    q: 'Как найти человека по @username?',
    a: 'На главном экране нажми на лупу справа вверху и введи @username или имя. Свой @username задаётся в Профиль → Настройки.',
  },
  {
    q: 'Как добавить историю?',
    a: 'Нажми «Моя история» вверху главного экрана, напиши текст, выбери цвет и эмодзи и опубликуй. История исчезает через 24 часа.',
  },
  {
    q: 'Как скрыть статус «в сети»?',
    a: 'Профиль → Настройки → выключи «Показывать статус в сети».',
  },
  {
    q: 'Как изменить фото профиля?',
    a: 'Профиль → Настройки → нажми на аватар вверху и выбери фото из галереи.',
  },
  {
    q: 'Как ответить на сообщение или поставить реакцию?',
    a: 'Зажми сообщение в чате: появятся реакции и кнопки «Ответить», «Изменить», «Удалить».',
  },
  {
    q: 'Как пожаловаться на человека или сообщение?',
    a: 'На сообщение: зажми его и нажми «Жалоба». На человека: открой его профиль и нажми «Пожаловаться».',
  },
  {
    q: 'Как заблокировать пользователя?',
    a: 'Открой профиль человека и нажми «Заблокировать». Список блокировок: Профиль → Заблокированные.',
  },
  {
    q: 'Как удалить аккаунт?',
    a: 'Профиль → Настройки → внизу «Удалить аккаунт». Все данные удаляются безвозвратно.',
  },
];

const STATUS = {
  new: { text: 'Отправлено', color: '#FF9F43' },
  in_progress: { text: 'В работе', color: '#6C63FF' },
  closed: { text: 'Закрыто', color: '#4CAF50' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export default function HelpScreen({ navigation }) {
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('support_requests')
      .select('id, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    setRequests(data || []);
  };

  const sendSupport = async () => {
    const text = message.trim();
    if (text.length < 5) {
      Alert.alert('Слишком коротко', 'Опиши проблему хотя бы в нескольких словах');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('support_requests').insert({ message: text });
    setSending(false);

    if (error) {
      Alert.alert('Ошибка', 'Не удалось отправить сообщение. Проверь интернет и попробуй ещё раз.');
      return;
    }

    setMessage('');
    loadRequests();
    Alert.alert('Отправлено ✅', 'Мы получили твоё сообщение. Статус обращения виден ниже.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Помощь</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>❓</Text>
          <Text style={styles.heroTitle}>Как мы можем помочь?</Text>
          <Text style={styles.heroSub}>Найди ответ в списке или напиши нам</Text>
        </View>

        {/* Документы */}
        <View style={styles.quickActions}>
          {[
            { icon: 'document-text', label: 'Условия использования', color: '#FF9F43', screen: 'Terms' },
            { icon: 'shield-checkmark', label: 'Конфиденциальность', color: '#4CAF50', screen: 'Privacy' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.quickBtn}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#333" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>📚 Частые вопросы</Text>
          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.faqItem, expanded === i && styles.faqItemExpanded]}
              onPress={() => setExpanded(expanded === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Ionicons
                  name={expanded === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={expanded === i ? '#6C63FF' : '#555'}
                />
              </View>
              {expanded === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Написать в поддержку */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>✉️ Написать в поддержку</Text>
          <View style={styles.supportCard}>
            <Text style={styles.supportDesc}>
              Не нашёл ответ? Опиши проблему, и мы посмотрим.
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.supportInput}
                placeholder="Опиши свою проблему..."
                placeholderTextColor="#555"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={1000}
              />
            </View>
            <Text style={styles.charCount}>{message.length}/1000</Text>
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnLoading]}
              onPress={sendSupport}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Отправить</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Мои обращения */}
        {requests.length > 0 && (
          <View style={styles.supportSection}>
            <Text style={styles.sectionTitle}>🗂 Мои обращения</Text>
            {requests.map((r) => {
              const st = STATUS[r.status] || STATUS.new;
              return (
                <View key={r.id} style={styles.requestCard}>
                  <View style={styles.requestTop}>
                    <Text style={styles.requestDate}>{formatDate(r.created_at)}</Text>
                    <View style={[styles.statusPill, { borderColor: st.color }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.requestText} numberOfLines={3}>{r.message}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Контакты (показываются, только если указана почта) */}
        {SUPPORT_EMAIL ? (
          <View style={styles.supportSection}>
            <Text style={styles.sectionTitle}>📬 Контакты</Text>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#6C63FF22' }]}>
                <Ionicons name="mail" size={18} color="#6C63FF" />
              </View>
              <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  heroCard: {
    alignItems: 'center', padding: 30,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  heroEmoji: { fontSize: 50, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 14, color: '#555' },
  quickActions: { padding: 16, gap: 8 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  quickIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500' },
  faqSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  faqItem: {
    backgroundColor: '#111120', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  faqItemExpanded: { borderColor: '#6C63FF' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 8 },
  faqAnswer: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 10 },
  supportSection: { padding: 16, paddingTop: 0 },
  supportCard: {
    backgroundColor: '#111120', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  supportDesc: { color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 20 },
  inputWrapper: {
    backgroundColor: '#0D0D1A', borderRadius: 12,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 6,
  },
  supportInput: {
    color: '#fff', fontSize: 14, padding: 12,
    height: 100, textAlignVertical: 'top',
  },
  charCount: { color: '#555', fontSize: 11, textAlign: 'right', marginBottom: 12 },
  sendBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    padding: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sendBtnLoading: { opacity: 0.7 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  requestCard: {
    backgroundColor: '#111120', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1A1A2E',
  },
  requestTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  requestDate: { color: '#555', fontSize: 12 },
  statusPill: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  requestText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 12,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  contactIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  contactText: { color: '#fff', fontSize: 14 },
});
