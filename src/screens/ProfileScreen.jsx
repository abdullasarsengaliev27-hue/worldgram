import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
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

  const menuItems = [
    { icon: 'trophy', label: 'Достижения', sub: 'Твои награды и очки', screen: 'Achievements', color: '#FFC107' },
    { icon: 'map', label: 'Карта друзей', sub: 'Где твои друзья', screen: 'FriendsMap', color: '#00D2D3' },
    { icon: 'settings', label: 'Настройки', sub: 'Профиль и безопасность', screen: null, color: '#6C63FF' },
    { icon: 'notifications', label: 'Уведомления', sub: 'Управление уведомлениями', screen: null, color: '#FF9F43' },
    { icon: 'shield-checkmark', label: 'Конфиденциальность', sub: 'Геолокация и данные', screen: null, color: '#4CAF50' },
    { icon: 'help-circle', label: 'Помощь', sub: 'FAQ и поддержка', screen: null, color: '#A29BFE' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

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
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>●</Text>
          </View>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{displayUsername}</Text>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles.tagText}>Уровень 1</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="trophy" size={12} color="#6C63FF" />
            <Text style={styles.tagText}>120 очков</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { icon: 'chatbubbles', value: '0', label: 'Чатов', color: '#6C63FF' },
          { icon: 'videocam', value: '0', label: 'Звонков', color: '#FF6B6B' },
          { icon: 'people', value: '0', label: 'Друзей', color: '#00D2D3' },
        ].map((stat, i) => (
          <View key={i} style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '22' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, i) => (
          { icon: 'language', label: 'Voice Translate', sub: 'AI перевод голоса', screen: 'Translate', color: '#00D2D3' },
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

      {/* Logout */}
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
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 55, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  editBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  profileCard: {
    alignItems: 'center', marginHorizontal: 20,
    backgroundColor: '#111120', borderRadius: 24,
    padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  onlineBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4CAF50', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#111120',
  },
  onlineBadgeText: { color: '#fff', fontSize: 8 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  username: { fontSize: 14, color: '#555', marginBottom: 16 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1A2E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  tagText: { color: '#ccc', fontSize: 12 },
  statsContainer: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: '#111120', borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#1A1A2E',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 6 },
  statIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#555' },
  menuContainer: { marginHorizontal: 20, marginBottom: 16 },
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
    marginHorizontal: 20, padding: 16,
    backgroundColor: '#1A0A0A', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A1A1A',
  },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },
});
