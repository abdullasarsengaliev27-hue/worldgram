import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const CHANNEL_AVATARS = ['📢', '🎵', '📰', '🎮', '💼', '��', '🌍', '🔥', '💡', '🎯'];

export default function ChannelsScreen({ navigation }) {
  const [channels, setChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelAvatar, setChannelAvatar] = useState('📢');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchChannels(user.id);
    }
  };

  const fetchChannels = async (uid) => {
    const { data: all } = await supabase
      .from('channels').select('*, profiles!created_by(full_name, username)')
      .eq('is_public', true)
      .order('subscribers_count', { ascending: false });

    const { data: mine } = await supabase
      .from('channel_members').select('channel_id, channels(*)')
      .eq('user_id', uid);

    if (all) setChannels(all);
    if (mine) setMyChannels(mine.map(m => m.channels).filter(Boolean));
    setLoading(false);
  };

  const createChannel = async () => {
    if (!channelName.trim()) {
      Alert.alert('Ошибка', 'Введи название канала');
      return;
    }
    setCreating(true);
    const { data: channel, error } = await supabase
      .from('channels').insert({
        name: channelName.trim(),
        description: channelDesc.trim(),
        avatar: channelAvatar,
        is_public: isPublic,
        created_by: userId,
      }).select().single();

    if (error) {
      Alert.alert('Ошибка', error.message);
      setCreating(false);
      return;
    }

    await supabase.from('channel_members').insert({
      channel_id: channel.id,
      user_id: userId,
      role: 'admin',
    });

    setCreating(false);
    setShowCreate(false);
    setChannelName('');
    setChannelDesc('');
    fetchChannels(userId);
    navigation.navigate('ChannelDetail', { channelId: channel.id, channelName: channel.name });
  };

  const subscribeToChannel = async (channel) => {
    const isSubscribed = myChannels.find(c => c?.id === channel.id);
    if (isSubscribed) {
      navigation.navigate('ChannelDetail', { channelId: channel.id, channelName: channel.name });
      return;
    }

    await supabase.from('channel_members').insert({
      channel_id: channel.id,
      user_id: userId,
      role: 'subscriber',
    });

    await supabase.from('channels')
      .update({ subscribers_count: (channel.subscribers_count || 0) + 1 })
      .eq('id', channel.id);

    fetchChannels(userId);
    navigation.navigate('ChannelDetail', { channelId: channel.id, channelName: channel.name });
  };

  const filteredChannels = channels.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderChannel = ({ item }) => {
    const isSubscribed = myChannels.find(c => c?.id === item.id);
    return (
      <TouchableOpacity
        style={styles.channelCard}
        onPress={() => subscribeToChannel(item)}
        activeOpacity={0.7}
      >
        <View style={styles.channelAvatar}>
          <Text style={styles.channelAvatarText}>{item.avatar || '📢'}</Text>
        </View>
        <View style={styles.channelInfo}>
          <View style={styles.channelNameRow}>
            <Text style={styles.channelName}>{item.name}</Text>
            {!item.is_public && (
              <Ionicons name="lock-closed" size={12} color="#555" />
            )}
          </View>
          {item.description ? (
            <Text style={styles.channelDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={styles.channelSubs}>
            👥 {item.subscribers_count || 0} подписчиков
          </Text>
        </View>
        <View style={[styles.subBtn, isSubscribed && styles.subBtnActive]}>
          <Text style={[styles.subBtnText, isSubscribed && styles.subBtnTextActive]}>
            {isSubscribed ? '✓' : '＋'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 Каналы</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск каналов..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {myChannels.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Мои каналы</Text>
              {myChannels.map(channel => channel && (
                <TouchableOpacity
                  key={channel.id}
                  style={styles.channelCard}
                  onPress={() => navigation.navigate('ChannelDetail', {
                    channelId: channel.id, channelName: channel.name
                  })}
                >
                  <View style={styles.channelAvatar}>
                    <Text style={styles.channelAvatarText}>{channel.avatar || '📢'}</Text>
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>{channel.name}</Text>
                    <Text style={styles.channelSubs}>
                      👥 {channel.subscribers_count || 0} подписчиков
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#333" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Популярные каналы</Text>
            {filteredChannels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📢</Text>
                <Text style={styles.emptyTitle}>Нет каналов</Text>
                <Text style={styles.emptySub}>Создай первый канал!</Text>
              </View>
            ) : (
              filteredChannels.map(item => (
                <View key={item.id}>{renderChannel({ item })}</View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Создать канал */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 Новый канал</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarPreview}>
              <Text style={styles.avatarPreviewEmoji}>{channelAvatar}</Text>
              <Text style={styles.avatarPreviewName}>{channelName || 'Название канала'}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Название канала</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Введи название..."
                  placeholderTextColor="#555"
                  value={channelName}
                  onChangeText={setChannelName}
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Описание (необязательно)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="О чём этот канал?"
                  placeholderTextColor="#555"
                  value={channelDesc}
                  onChangeText={setChannelDesc}
                  maxLength={150}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Аватар канала</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {CHANNEL_AVATARS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, channelAvatar === emoji && styles.emojiBtnSelected]}
                  onPress={() => setChannelAvatar(emoji)}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.visibilityRow}>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityLabel}>
                  {isPublic ? '🌍 Публичный' : '🔒 Приватный'}
                </Text>
                <Text style={styles.visibilitySub}>
                  {isPublic ? 'Любой может найти и подписаться' : 'Только по приглашению'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, isPublic && styles.toggleBtnActive]}
                onPress={() => setIsPublic(!isPublic)}
              >
                <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.createChannelBtn, creating && styles.createChannelBtnLoading]}
              onPress={createChannel}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.createChannelBtnText}>Создать канал</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff' },
  createBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 12,
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13, fontWeight: 'bold', color: '#555',
    marginBottom: 10, marginTop: 8, textTransform: 'uppercase',
  },
  channelCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  channelAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  channelAvatarText: { fontSize: 26 },
  channelInfo: { flex: 1 },
  channelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  channelName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  channelDesc: { fontSize: 12, color: '#888', marginBottom: 3 },
  channelSubs: { fontSize: 11, color: '#555' },
  subBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#6C63FF',
  },
  subBtnActive: { backgroundColor: '#6C63FF' },
  subBtnText: { fontSize: 18, color: '#6C63FF', fontWeight: 'bold' },
  subBtnTextActive: { color: '#fff' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#555' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111120', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  avatarPreview: { alignItems: 'center', marginBottom: 20 },
  avatarPreviewEmoji: { fontSize: 50, marginBottom: 8 },
  avatarPreviewName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputWrapper: {
    backgroundColor: '#0D0D1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: { color: '#fff', fontSize: 15 },
  emojiRow: { marginBottom: 16 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0D0D1A', alignItems: 'center',
    justifyContent: 'center', marginRight: 8,
    borderWidth: 2, borderColor: '#1A1A2E',
  },
  emojiBtnSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  emojiBtnText: { fontSize: 22 },
  visibilityRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0D1A', borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  visibilityInfo: { flex: 1 },
  visibilityLabel: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  visibilitySub: { fontSize: 12, color: '#555' },
  toggleBtn: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: '#1A1A2E', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1, borderColor: '#2A2A3E',
  },
  toggleBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#555',
  },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  createChannelBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  createChannelBtnLoading: { opacity: 0.7 },
  createChannelBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

