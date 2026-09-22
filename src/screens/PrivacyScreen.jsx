import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Конфиденциальность</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🔒</Text>
          <Text style={styles.heroTitle}>Политика конфиденциальности</Text>
          <Text style={styles.heroSub}>Worldgram — последнее обновление: 2024</Text>
        </View>

        {[
          {
            icon: 'information-circle',
            title: '1. Общие положения',
            color: '#6C63FF',
            text: 'Worldgram ("мы", "наш", "приложение") серьёзно относится к конфиденциальности пользователей. Настоящая политика описывает, какие данные мы собираем, как используем и защищаем их.'
          },
          {
            icon: 'person',
            title: '2. Данные которые мы собираем',
            color: '#FF9F43',
            text: '• Email адрес и имя при регистрации\n• Сообщения и медиафайлы в чатах\n• Геолокация (только если вы включили)\n• Данные об использовании приложения\n• Push-токен для уведомлений'
          },
          {
            icon: 'shield-checkmark',
            title: '3. Как мы используем данные',
            color: '#4CAF50',
            text: '• Для обеспечения работы сервиса\n• Для отправки уведомлений\n• Для улучшения приложения\n• Для технической поддержки\n\nМы НЕ продаём ваши данные третьим лицам.'
          },
          {
            icon: 'location',
            title: '4. Геолокация',
            color: '#00D2D3',
            text: 'Геолокация используется только для функции "Карта друзей". Мы показываем только приблизительное расстояние до других пользователей. Вы можете отключить геолокацию в любое время в настройках приложения.'
          },
          {
            icon: 'chatbubbles',
            title: '5. Сообщения и медиа',
            color: '#FF6B6B',
            text: 'Ваши сообщения хранятся на защищённых серверах Supabase. Медиафайлы (фото) хранятся в зашифрованном хранилище. Мы не читаем ваши личные сообщения.'
          },
          {
            icon: 'lock-closed',
            title: '6. Безопасность',
            color: '#A29BFE',
            text: 'Мы используем современные методы шифрования для защиты данных. Все соединения защищены протоколом HTTPS. Пароли хранятся в зашифрованном виде.'
          },
          {
            icon: 'people',
            title: '7. Данные третьих лиц',
            color: '#FFC107',
            text: 'Мы используем следующие сервисы:\n• Supabase — база данных\n• Expo — платформа разработки\n• LiveKit — видеозвонки\n\nКаждый из них имеет собственную политику конфиденциальности.'
          },
          {
            icon: 'trash',
            title: '8. Удаление данных',
            color: '#FF4444',
            text: 'Вы можете запросить удаление всех ваших данных в любое время. Для этого напишите нам на email: privacy@worldgram.app\n\nМы удалим все ваши данные в течение 30 дней.'
          },
          {
            icon: 'mail',
            title: '9. Контакты',
            color: '#6C63FF',
            text: 'По вопросам конфиденциальности:\n📧 privacy@worldgram.app\n\nПо общим вопросам:\n📧 support@worldgram.app'
          },
        ].map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '22' }]}>
                <Ionicons name={section.icon} size={20} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Используя Worldgram, вы соглашаетесь с данной политикой конфиденциальности.
          </Text>
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
  content: { padding: 16 },
  heroCard: {
    backgroundColor: '#111120', borderRadius: 20,
    padding: 24, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  heroEmoji: { fontSize: 50, marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 13, color: '#555' },
  section: {
    backgroundColor: '#111120', borderRadius: 16,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12,
  },
  sectionIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', flex: 1 },
  sectionText: { color: '#888', fontSize: 14, lineHeight: 22 },
  footer: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
    marginTop: 8,
  },
  footerText: { color: '#6C63FF', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
