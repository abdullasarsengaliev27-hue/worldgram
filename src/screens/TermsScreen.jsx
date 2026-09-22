import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Условия использования</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>📋</Text>
          <Text style={styles.heroTitle}>Условия использования</Text>
          <Text style={styles.heroSub}>Worldgram — последнее обновление: 2024</Text>
        </View>

        {[
          {
            icon: 'checkmark-circle',
            title: '1. Принятие условий',
            color: '#4CAF50',
            text: 'Используя приложение Worldgram, вы соглашаетесь с настоящими условиями использования. Если вы не согласны, пожалуйста, не используйте приложение.'
          },
          {
            icon: 'person-add',
            title: '2. Регистрация',
            color: '#6C63FF',
            text: '• Вам должно быть не менее 13 лет\n• Вы обязаны предоставить достоверные данные\n• Вы несёте ответственность за безопасность своего аккаунта\n• Один человек — один аккаунт'
          },
          {
            icon: 'ban',
            title: '3. Запрещённый контент',
            color: '#FF4444',
            text: 'Запрещено:\n• Спам и реклама без разрешения\n• Оскорбления и угрозы\n• Незаконный контент\n• Нарушение авторских прав\n• Распространение личных данных других пользователей'
          },
          {
            icon: 'shield',
            title: '4. Ответственность',
            color: '#FF9F43',
            text: 'Worldgram не несёт ответственности за:\n• Контент, созданный пользователями\n• Убытки от использования сервиса\n• Временную недоступность сервиса\n• Действия третьих лиц'
          },
          {
            icon: 'camera',
            title: '5. Медиаконтент',
            color: '#00D2D3',
            text: 'Отправляя фото и видео, вы подтверждаете что:\n• Имеете право на использование контента\n• Контент не нарушает законодательство\n• Вы даёте разрешение на хранение контента на серверах Worldgram'
          },
          {
            icon: 'construct',
            title: '6. Изменение сервиса',
            color: '#A29BFE',
            text: 'Мы оставляем за собой право:\n• Изменять функциональность приложения\n• Приостанавливать работу сервиса\n• Изменять условия использования\n\nО значительных изменениях мы уведомим пользователей.'
          },
          {
            icon: 'close-circle',
            title: '7. Блокировка аккаунта',
            color: '#FF6B6B',
            text: 'Мы можем заблокировать аккаунт за:\n• Нарушение условий использования\n• Жалобы других пользователей\n• Подозрительную активность\n• Использование автоматических скриптов'
          },
          {
            icon: 'globe',
            title: '8. Применимое право',
            color: '#FFC107',
            text: 'Настоящие условия регулируются законодательством Республики Казахстан. Все споры разрешаются в судебном порядке по месту нахождения компании.'
          },
          {
            icon: 'mail',
            title: '9. Связь с нами',
            color: '#6C63FF',
            text: 'По вопросам условий использования:\n📧 legal@worldgram.app\n\nПо жалобам и нарушениям:\n📧 abuse@worldgram.app'
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
            Нажимая "Зарегистрироваться", вы принимаете условия использования Worldgram.
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
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
