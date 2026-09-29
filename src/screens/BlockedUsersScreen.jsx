import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function BlockedUsersScreen({ navigation }) {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocked();
  }, []);

  const fetchBlocked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('blocked_users')
      .select('*, profiles!blocked_id(*)')
      .eq('blocker_id', user.id);
    if (data) setBlocked(data);
    setLoading(false);
  };

  const unblock = (item) => {
    const name = item.profiles?.full_name || item.profiles?.username || 'Пользователь';
    Alert.alert(`Разблокировать ${name}?`, '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Разблокировать',
        onPress: async () => {
          await supabase.from('blocked_users').delete().eq('id', item.id);
          setBlocked(prev => prev.filter(b => b.id !== item.id));
        }
      }
    ]);
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚫 Заблокированные</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : blocked.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>Список пуст</Text>
          <Text style={styles.emptySub}>Ты никого не заблокировал</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const profile = item.profiles;
            const name = profile?.full_name || profile?.username || 'Пользователь';
            return (
              <View style={styles.userCard}>
                <View style={[styles.avatar, { backgroundColor: COLORS[index % COLORS.length] }]}>
                  <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{name}</Text>
                  <Text style={styles.userSub}>
                    @{profile?.custom_username || profile?.username || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => unblock(item)}
                >
                  <Text style={styles.unblockBtnText}>Разблок.</Text>
                </TouchableOpacity>
              </View>
            );
          }}
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555' },
  list: { padding: 16 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  userSub: { fontSize: 12, color: '#555' },
  unblockBtn: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
  },
  unblockBtnText: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },
});

