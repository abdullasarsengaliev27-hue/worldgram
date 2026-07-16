import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const AVATAR_COLORS = [
  '#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43',
  '#FFC107', '#4CAF50', '#A29BFE', '#FF7675',
];

const AVATAR_EMOJIS = [
  '😊', '😎', '🤩', '🥳', '😇', '🦊', '🐯', '🦁',
  '🐻', '🐼', '🦄', '🐸', '🤖', '👾', '🎭', '🌟',
];

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6C63FF');
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setFullName(data.full_name || user.user_metadata?.full_name || '');
        setUsername(data.username || user.email || '');
        setBio(data.bio || '');
        setSelectedColor(data.avatar_color || '#6C63FF');
        setSelectedEmoji(data.avatar_emoji || '😊');
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Ошибка', 'Введи своё имя');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_color: selectedColor,
        avatar_emoji: selectedEmoji,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      Alert.alert('Сохранено! ✅', 'Профиль обновлён', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать профиль</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Сохранить</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Preview аватара */}
      <View style={styles.avatarPreview}>
        <View style={[styles.avatarCircle, { backgroundColor: selectedColor }]}>
          <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
        </View>
        <Text style={styles.avatarName}>{fullName || 'Твоё имя'}</Text>
        <Text style={styles.avatarUsername}>@{username || 'username'}</Text>
        {bio ? <Text style={styles.avatarBio}>{bio}</Text> : null}
      </View>

      {/* Табы */}
      <View style={styles.tabs}>
        {[
          { id: 'info', label: 'Инфо', icon: 'person' },
          { id: 'color', label: 'Цвет', icon: 'color-palette' },
          { id: 'emoji', label: 'Эмодзи', icon: 'happy' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? '#6C63FF' : '#555'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Инфо */}
        {activeTab === 'info' && (
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Имя</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="Твоё имя"
                  placeholderTextColor="#555"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Имя пользователя</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="username"
                  placeholderTextColor="#555"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>О себе</Text>
              <View style={[styles.inputWrapper, styles.inputWrapperBio]}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Расскажи о себе..."
                  placeholderTextColor="#555"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={150}
                />
              </View>
              <Text style={styles.charCount}>{bio.length}/150</Text>
            </View>
          </View>
        )}

        {/* Цвет аватара */}
        {activeTab === 'color' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выбери цвет аватара</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorItemSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.colorPreview}>
              <View style={[styles.colorPreviewAvatar, { backgroundColor: selectedColor }]}>
                <Text style={styles.colorPreviewEmoji}>{selectedEmoji}</Text>
              </View>
              <Text style={styles.colorPreviewText}>Предпросмотр</Text>
            </View>
          </View>
        )}

        {/* Эмодзи аватара */}
        {activeTab === 'emoji' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выбери эмодзи аватара</Text>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiItem,
                    selectedEmoji === emoji && styles.emojiItemSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  avatarPreview: {
    alignItems: 'center', padding: 24,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 15,
  },
  avatarEmoji: { fontSize: 44 },
  avatarName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  avatarUsername: { fontSize: 13, color: '#555', marginBottom: 6 },
  avatarBio: { fontSize: 13, color: '#888', textAlign: 'center', maxWidth: 250 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16,
    marginVertical: 12, backgroundColor: '#111120',
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: '#1A1A2E' },
  tabText: { color: '#555', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#6C63FF' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#fff', marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#888', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 10,
  },
  inputWrapperBio: { alignItems: 'flex-start' },
  atSign: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  bioInput: { height: 80, textAlignVertical: 'top' },
  charCount: { color: '#555', fontSize: 11, textAlign: 'right', marginTop: 4 },
  colorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, marginBottom: 24,
  },
  colorItem: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  colorItemSelected: { borderColor: '#fff' },
  colorPreview: { alignItems: 'center', gap: 12 },
  colorPreviewAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  colorPreviewEmoji: { fontSize: 38 },
  colorPreviewText: { color: '#555', fontSize: 13 },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  emojiItem: {
    width: 62, height: 62, borderRadius: 16,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    borderColor: '#1A1A2E',
  },
  emojiItemSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A2E' },
  emojiText: { fontSize: 30 },
});
