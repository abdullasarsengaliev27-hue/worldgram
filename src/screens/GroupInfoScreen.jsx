import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const GROUP_AVATARS = ['👥', '🎮', '💼', '🎵', '🏀', '✈️', '🍕', '📚', '💪', '🎯', '🌍', '🔥'];

export default function GroupInfoScreen({ route, navigation }) {
  const { chatId, groupName, groupAvatar } = route.params;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(groupName || '');
  const [newAvatar, setNewAvatar] = useState(groupAvatar || '👥');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUser();
    fetchMembers();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: chat } = await supabase
        .from('chats').select('created_by').eq('id', chatId).single();
      if (chat?.created_by === user.id) setIsCreator(true);
    }
  };

  const [allUsers, setAllUsers] = useState([]);
const [showAddUsers, setShowAddUsers] = useState(false);

const fetchAllUsers = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const memberIds = members.map(m => m.user_id);
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .not('id', 'in', `(${memberIds.join(',')})`);
  if (data) setAllUsers(data);
};

const addMember = async (userId, userName) => {
  await supabase.from('chat_members').insert({
    chat_id: chatId,
    user_id: userId,
  });
  fetchMembers();
  Alert.alert('✅', `${userName} добавлен в группу`);
};

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('chat_members')
      .select('user_id, profiles(*)')
      .eq('chat_id', chatId);
    if (data) setMembers(data);
    setLoading(false);
  };

  const saveGroupInfo = async () => {
    if (!newName.trim()) {
      Alert.alert('Ошибка', 'Введи название группы');
      return;
    }
    setSaving(true);
    await supabase.from('chats').update({
      group_name: newName.trim(),
      group_avatar: newAvatar,
    }).eq('id', chatId);
    setSaving(false);
    setEditing(false);
    Alert.alert('Сохранено! ✅', 'Информация группы обновлена');
  };

  const removeMember = async (userId, userName) => {
    Alert.alert(`Удалить ${userName}?`, 'Участник будет удалён из группы', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('chat_members')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', userId);
          fetchMembers();
        }
      }
    ]);
  };

  const leaveGroup = async () => {
    Alert.alert('Выйти из группы?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive',
        onPress: async () => {
          await supabase.from('chat_members')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', currentUserId);
          navigation.navigate('Main');
        }
      }
    ]);
  };

  const deleteGroup = async () => {
    Alert.alert('Удалить группу?', 'Группа будет удалена для всех', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('chat_id', chatId);
          await supabase.from('chat_members').delete().eq('chat_id', chatId);
          await supabase.from('chats').delete().eq('id', chatId);
          navigation.navigate('Main');
        }
      }
    ]);
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Информация о группе</Text>
        {isCreator && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditing(!editing)}
          >
            <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color="#6C63FF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Аватар и название */}
        <View style={styles.groupCard}>
          <View style={styles.groupAvatarBig}>
            <Text style={styles.groupAvatarBigText}>{newAvatar}</Text>
          </View>

          {editing ? (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Название группы</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Название группы"
                  placeholderTextColor="#555"
                  maxLength={50}
                />
              </View>

              <Text style={styles.editLabel}>Аватар группы</Text>
              <View style={styles.avatarGrid}>
                {GROUP_AVATARS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.avatarOption,
                      newAvatar === emoji && styles.avatarOptionSelected
                    ]}
                    onPress={() => setNewAvatar(emoji)}
                  >
                    <Text style={styles.avatarOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnLoading]}
                onPress={saveGroupInfo}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>💾 Сохранить</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.groupName}>{newName}</Text>
              <Text style={styles.groupMembersCount}>
                👥 {members.length} участников
              </Text>
            </>
          )}
        </View>

        {/* Участники */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Участники</Text>
          {members.map((member, i) => {
            const profile = member.profiles;
            const isMe = member.user_id === currentUserId;
            const name = profile?.full_name || profile?.username || 'Пользователь';
            return (
              <View key={member.user_id} style={styles.memberItem}>
                <View style={[styles.memberAvatar, { backgroundColor: COLORS[i % COLORS.length] }]}>
                  <Text style={styles.memberAvatarText}>
                    {name[0].toUpperCase()}
                  </Text>
                  {profile?.is_online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {name} {isMe && '(Ты)'}
                  </Text>
                  <Text style={[styles.memberStatus, {
                    color: profile?.is_online ? '#4CAF50' : '#555'
                  }]}>
                    {profile?.is_online ? '● Онлайн' : '● Не в сети'}
                  </Text>
                </View>
                {isCreator && !isMe && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeMember(member.user_id, name)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF4444" />
                  </TouchableOpacity>
                )}
                {isMe && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>
                      {isCreator ? '👑 Админ' : 'Ты'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.membersSectionHeader}>
  <Text style={styles.sectionTitle}>Участники</Text>
  {isCreator && (
    <TouchableOpacity
      style={styles.addMemberBtn}
      onPress={() => {
        fetchAllUsers();
        setShowAddUsers(!showAddUsers);
      }}
    >
      <Ionicons name="person-add" size={16} color="#6C63FF" />
      <Text style={styles.addMemberBtnText}>Добавить</Text>
    </TouchableOpacity>
  )}
</View>

{/* Список для добавления */}
{showAddUsers && allUsers.length > 0 && (
  <View style={styles.addUsersContainer}>
    <Text style={styles.addUsersTitle}>Выбери кого добавить:</Text>
    {allUsers.map((user, i) => (
      <TouchableOpacity
        key={user.id}
        style={styles.addUserItem}
        onPress={() => addMember(user.id, user.full_name || user.username)}
      >
        <View style={[styles.memberAvatar, { backgroundColor: COLORS[i % COLORS.length] }]}>
          <Text style={styles.memberAvatarText}>
            {(user.full_name || user.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.memberName}>
          {user.full_name || user.username}
        </Text>
        <Ionicons name="add-circle" size={24} color="#6C63FF" />
      </TouchableOpacity>
    ))}
  </View>
)}

        {/* Действия */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.leaveBtn} onPress={leaveGroup}>
            <Ionicons name="exit-outline" size={20} color="#FF9F43" />
            <Text style={styles.leaveBtnText}>Выйти из группы</Text>
          </TouchableOpacity>

          {isCreator && (
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteGroup}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={styles.deleteBtnText}>Удалить группу</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  loadingContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
  },
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
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  groupCard: {
    alignItems: 'center', margin: 16,
    backgroundColor: '#111120', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#1A1A2E',
  },
  groupAvatarBig: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#6C63FF',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 10,
  },
  groupAvatarBigText: { fontSize: 44 },
  groupName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  groupMembersCount: { fontSize: 14, color: '#555' },
  editSection: { width: '100%' },
  editLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  inputWrapper: {
    backgroundColor: '#0D0D1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 4,
  },
  input: { color: '#fff', fontSize: 15 },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 16,
  },
  avatarOption: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#0D0D1A', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A2E',
  },
  avatarOptionSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  avatarOptionText: { fontSize: 24 },
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  membersSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#888',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    padding: 12, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  memberAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  memberAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#111120',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 3 },
  memberStatus: { fontSize: 12 },
  removeBtn: { padding: 4 },
  adminBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
  },
  adminBadgeText: { color: '#FFC107', fontSize: 11, fontWeight: '600' },
  actionsSection: { paddingHorizontal: 16, gap: 8 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#1A1200', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FF9F43',
  },
  leaveBtnText: { color: '#FF9F43', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#1A0A0A', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FF4444',
  },
  deleteBtnText: { color: '#FF4444', fontSize: 15, fontWeight: '600' },

  membersSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  addMemberBtnText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },
  addUsersContainer: {
    backgroundColor: '#0D0D1A', borderRadius: 14,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  addUsersTitle: { color: '#888', fontSize: 12, marginBottom: 8 },
  addUserItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
});
