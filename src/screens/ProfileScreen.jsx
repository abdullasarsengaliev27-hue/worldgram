import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callSummaries, setCallSummaries] = useState([]);

  useEffect(() => {
    fetchProfile();
    loadCallSummaries();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          ...data,
          full_name: data.full_name || user.user_metadata?.full_name || user.email,
          username: data.username || user.email,
        });
      }
    }
    setLoading(false);
  };

  const loadCallSummaries = () => {
    // Моковые данные резюме звонков
    setCallSummaries([
      {
        id: '1',
        userName: 'Alish',
        duration: '05:32',
        date: 'Сегодня 13:20',
        mood: '😊',
        topics: ['Планы', 'Работа'],
      },
      {
        id: '2',
        userName: 'Тестирую',
        duration: '02:15',
        date: 'Вчера 18:45',
        mood: '⚡',
        topics: ['Встреча'],
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert('Выход', 'Ты уверен?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const displayName = profile?.full_name || 'Пользователь';
  const displayUsername = profile?.username || 'username';
  const avatarLetter = displayName[0].toUpperCase();
  const avatarColor = profile?.avatar_color || '#6C63FF';
  const avatarEmoji = profile?.avatar_emoji || '😊';

  const menuItems = [
    { icon: 'trophy', label: 'Достижения', sub: 'Твои награды и очки', screen: 'Achievements', color: '#FFC107' },
    { icon: 'document-text', label: 'Резюме звонков', sub: 'История разговоров', screen: 'CallSummaries', color: '#6C63FF' },
    { icon: 'settings', label: 'Настройки', sub: 'Профиль и безопасность', screen: 'Settings', color: '#888' },
    { icon: 'notifications', label: 'Уведомления', sub: 'Управление уведомлениями', screen: null, color: '#FF9F43' },
    { icon: 'document-text', label: 'Условия использования', sub: 'Правила сервиса', screen: 'Terms', color: '#00D2D3' },
    { icon: 'lock-closed', label: 'Конфиденциальность', sub: 'Политика данных', screen: 'Privacy', color: '#4CAF50' },
    { icon: 'help-circle', label: 'Помощь', sub: 'FAQ и поддержка', screen: 'Help', color: '#A29BFE' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={20} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>

        {/* Настройки кнопка */}
        <TouchableOpacity
          style={styles.settingsQuickBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings" size={20} color="#6C63FF" />
        </TouchableOpacity>

        {/* Аватар */}
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            </View>
          )}
          <View style={styles.onlineBadge} />
        </View>

        {/* Имя */}
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{displayUsername}</Text>

        {/* О себе */}
        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.addBio}>+ Добавить о себе</Text>
          </TouchableOpacity>
        )}

        {/* Телефон */}
        {profile?.phone_number && profile?.phone_visible && (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={14} color="#6C63FF" />
            <Text style={styles.phoneText}>{profile.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Меню */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => item.screen && navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Выйти */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF4444" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  loadingContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 55,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  editBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  profileCard: {
    alignItems: 'center', marginHorizontal: 16,
    backgroundColor: '#111120', borderRadius: 24,
    padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#1A1A2E',
    position: 'relative',
  },
  settingsQuickBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  avatarImage: {
    width: 90, height: 90, borderRadius: 45,
  },
  avatarEmoji: { fontSize: 44 },
  onlineBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#111120',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  username: { fontSize: 14, color: '#555', marginBottom: 10 },
  bio: {
    fontSize: 14, color: '#888', textAlign: 'center',
    maxWidth: 280, lineHeight: 20, marginBottom: 8,
  },
  addBio: {
    fontSize: 14, color: '#6C63FF',
    marginBottom: 8, fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 4,
  },
  phoneText: { color: '#6C63FF', fontSize: 13 },
  menuContainer: { marginHorizontal: 16, marginBottom: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  menuIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#555' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginHorizontal: 16, padding: 16,
    backgroundColor: '#1A0A0A', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A1A1A',
  },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },
});
