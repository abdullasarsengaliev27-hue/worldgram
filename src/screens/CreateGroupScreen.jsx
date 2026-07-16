import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const GROUP_AVATARS = ['👥', '🎮', '💼', '🎵', '🏀', '✈️', '🍕', '📚', '💪', '🎯'];

export default function CreateGroupScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('👥');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles').select('*').neq('id', user.id);
    if (data) setUsers(data);
    setLoading(false);
  };

  const toggleUser = (user) => {
    if (selected.find(s => s.id === user.id)) {
      setSelected(selected.filter(s => s.id !== user.id));
    } else {
      setSelected([...selected, user]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Ошибка', 'Введи название группы');
      return;
    }
    if (selected.length < 1) {
      Alert.alert('Ошибка', 'Выбери хотя бы одного участника');
      return;
    }

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        is_group: true,
        group_name: groupName.trim(),
        group_avatar: groupAvatar,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Ошибка', error.message);
      setCreating(false);
      return;
    }

    // Добавляем всех участников включая себя
    const members = [
      { chat_id: newChat.id, user_id: user.id },
      ...selected.map(s => ({ chat_id: newChat.id, user_id: s.id }))
    ];

    await supabase.from('chat_members').insert(members);

    setCreating(false);
    navigation.replace('Chat', {
      chatId: newChat.id,
      userName: groupName.trim(),
      isGroup: true,
      groupAvatar,
    });
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50'];
  const getColor = (index) => COLORS[index % COLORS.length];

  const renderUser = ({ item, index }) => {
    const isSelected = selected.find(s => s.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUser(item)}
      >
        <View style={[styles.avatar, { backgroundColor: getColor(index) }]}>
          <Text style={styles.avatarText}>
            {(item.full_name || item.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.full_name || item.username || 'Пользователь'}
          </Text>
          <Text style={styles.userSub}>● Онлайн</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Выбери участников' : 'Настрой группу'}
        </Text>
        {step === 1 && selected.length > 0 && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => setStep(2)}
          >
            <Text style={styles.nextBtnText}>Далее →</Text>
          </TouchableOpacity>
        )}
      </View>

      {step === 1 ? (
        <>
          {/* Выбранные */}
          {selected.length > 0 && (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedTitle}>
                Выбрано: {selected.length}
              </Text>
              <View style={styles.selectedList}>
                {selected.map((u, i) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.selectedChip}
                    onPress={() => toggleUser(u)}
                  >
                    <Text style={styles.selectedChipText}>
                      {(u.full_name || u.username || '?')[0].toUpperCase()}
                    </Text>
                    <View style={styles.removeChip}>
                      <Ionicons name="close" size={10} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Список пользователей */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUser}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            />
          )}
        </>
      ) : (
        /* Шаг 2 — настройка группы */
        <View style={styles.setupContainer}>
          {/* Превью группы */}
          <View style={styles.groupPreview}>
            <View style={styles.groupAvatarBig}>
              <Text style={styles.groupAvatarBigText}>{groupAvatar}</Text>
            </View>
            <Text style={styles.groupPreviewName}>
              {groupName || 'Название группы'}
            </Text>
            <Text style={styles.groupPreviewMembers}>
              {selected.length + 1} участников
            </Text>
          </View>

          {/* Название */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Название группы</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="people-outline" size={18} color="#555" />
              <TextInput
                style={styles.input}
                placeholder="Введи название..."
                placeholderTextColor="#555"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
            </View>
          </View>

          {/* Выбор аватара */}
          <Text style={styles.inputLabel}>Аватар группы</Text>
          <View style={styles.avatarGrid}>
            {GROUP_AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.avatarOption,
                  groupAvatar === emoji && styles.avatarOptionSelected,
                ]}
                onPress={() => setGroupAvatar(emoji)}
              >
                <Text style={styles.avatarOptionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Участники */}
          <Text style={styles.inputLabel}>Участники</Text>
          <View style={styles.membersList}>
            {selected.map((u, i) => (
              <View key={u.id} style={styles.memberChip}>
                <View style={[styles.memberAvatar, { backgroundColor: getColor(i) }]}>
                  <Text style={styles.memberAvatarText}>
                    {(u.full_name || u.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>
                  {u.full_name || u.username}
                </Text>
              </View>
            ))}
          </View>

          {/* Кнопка создать */}
          <TouchableOpacity
            style={[styles.createBtn, creating && styles.createBtnLoading]}
            onPress={createGroup}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Создать группу</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  nextBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  selectedContainer: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  selectedTitle: { color: '#6C63FF', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  selectedChipText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  removeChip: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4444', alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  userItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  userItemSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A2E' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  userSub: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
  checkbox: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  setupContainer: { flex: 1, padding: 16 },
  groupPreview: { alignItems: 'center', paddingVertical: 24 },
  groupAvatarBig: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: '#6C63FF',
  },
  groupAvatarBigText: { fontSize: 44 },
  groupPreviewName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  groupPreviewMembers: { fontSize: 13, color: '#555' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 16,
  },
  avatarOption: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A2E',
  },
  avatarOptionSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A2E' },
  avatarOptionText: { fontSize: 26 },
  membersList: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 24,
  },
  memberChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 12,
    padding: 8, gap: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  memberName: { color: '#fff', fontSize: 13 },
  createBtn: {
    backgroundColor: '#6C63FF', borderRadius: 16,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  createBtnLoading: { opacity: 0.7 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
