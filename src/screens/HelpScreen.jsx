import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FAQ = [
  {
    q: 'Как начать видеозвонок?',
    a: 'Зайди в чат с пользователем и нажми кнопку 📹 в правом верхнем углу. Или нажми 📹 рядом с именем пользователя на главном экране.',
  },
  {
    q: 'Как отправить фото в чате?',
    a: 'В чате нажми кнопку 📷 рядом с полем ввода. Выбери "Камера" чтобы сделать фото или "Галерея" чтобы выбрать из телефона.',
  },
  {
    q: 'Как создать групповой чат?',
    a: 'На главном экране нажми кнопку "Группа" в правом нижнем углу. Выбери участников и задай название группы.',
  },
  {
    q: 'Как добавить историю?',
    a: 'Нажми на кружок "Моя история" в верхней части главного экрана. Напиши текст, выбери цвет и эмодзи, нажми "Опубликовать".',
  },
  {
    q: 'Как включить геолокацию для карты?',
    a: 'Зайди в раздел "Карта" через нижнее меню. Внизу экрана есть переключатель геолокации — включи его.',
  },
  {
    q: 'Как скрыть свой статус "в сети"?',
    a: 'Зайди в Профиль → Настройки → отключи переключатель "Показывать статус в сети".',
  },
  {
    q: 'Как изменить фото профиля?',
    a: 'Зайди в Профиль → Настройки → нажми на аватар сверху → выбери фото из галереи.',
  },
  {
    q: 'Как получить достижения?',
    a: 'Достижения получаются автоматически за активность в приложении — звонки, сообщения, реакции и другие действия.',
  },
  {
    q: 'Как ответить на конкретное сообщение?',
    a: 'Зажми на сообщение в чате — появится панель "Ответ на сообщение". Напиши текст и отправь.',
  },
  {
    q: 'Как удалить свою историю?',
    a: 'Зайди в раздел Stories → в блоке "Мои истории" нажми на иконку 🗑 рядом с историей.',
  },
];

export default function HelpScreen({ navigation }) {
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendSupport = () => {
    if (!message.trim()) {
      Alert.alert('Ошибка', 'Напиши сообщение');
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setMessage('');
      Alert.alert('Отправлено! ✅', 'Мы получили твоё сообщение и ответим в течение 24 часов.');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Помощь</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>❓</Text>
          <Text style={styles.heroTitle}>Как мы можем помочь?</Text>
          <Text style={styles.heroSub}>Найди ответ в FAQ или напиши нам</Text>
        </View>

        {/* Быстрые действия */}
        <View style={styles.quickActions}>
          {[
            { icon: 'chatbubble', label: 'Написать в поддержку', color: '#6C63FF' },
            { icon: 'document-text', label: 'Условия использования', color: '#FF9F43' },
            { icon: 'shield-checkmark', label: 'Конфиденциальность', color: '#4CAF50' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickBtn}
              onPress={() => {
                if (i === 1) navigation.navigate('Terms');
                if (i === 2) navigation.navigate('Privacy');
              }}
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
          <Text style={styles.sectionTitle}>📚 Часто задаваемые вопросы</Text>
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
              {expanded === i && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Написать в поддержку */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>✉️ Написать в поддержку</Text>
          <View style={styles.supportCard}>
            <Text style={styles.supportDesc}>
              Не нашёл ответ? Напиши нам — мы ответим в течение 24 часов.
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.supportInput}
                placeholder="Опиши свою проблему..."
                placeholderTextColor="#555"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
            </View>
            <Text style={styles.charCount}>{message.length}/500</Text>
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnLoading]}
              onPress={sendSupport}
              disabled={sending}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>
                {sending ? 'Отправляем...' : 'Отправить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Контакты */}
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>📬 Контакты</Text>
          {[
            { icon: 'mail', label: 'support@worldgram.app', color: '#6C63FF' },
            { icon: 'logo-instagram', label: '@worldgram_app', color: '#FF6B6B' },
            { icon: 'globe', label: 'worldgram.app', color: '#00D2D3' },
          ].map((item, i) => (
            <View key={i} style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.contactText}>{item.label}</Text>
            </View>
          ))}
        </View>

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
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12,
  },
  faqItem: {
    backgroundColor: '#111120', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  faqItemExpanded: { borderColor: '#6C63FF' },
  faqHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 8 },
  faqAnswer: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 10 },
  supportSection: { padding: 16 },
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
  contactsSection: { padding: 16 },
  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  contactIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  contactText: { color: '#fff', fontSize: 14 },
});
