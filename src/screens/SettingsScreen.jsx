import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, TextInput, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

export default function SettingsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVisible, setPhoneVisible] = useState(true);
  const [onlineVisible, setOnlineVisible] = useState(true);
  const [storiesVisible, setStoriesVisible] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          setPhoneNumber(data.phone_number || '');
          setPhoneVisible(data.phone_visible !== false);
          setOnlineVisible(data.online_visible !== false);
          setStoriesVisible(data.stories_visible !== false);
          setBio(data.bio || '');
        }
      }
    } catch (e) {
      console.log('fetchProfile error:', e);
    }
    setLoading(false);
  };
  

  const [bio, setBio] = useState('');
  

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Saving for user:', user.id);
      
      const { data, error } = await supabase.from('profiles').update({
        phone_number: phoneNumber.trim(),
        phone_visible: phoneVisible,
        online_visible: onlineVisible,
        stories_visible: storiesVisible,
        bio: bio.trim(),
      }).eq('id', user.id).select();
  
      console.log('Save result:', data, error);
  
      if (error) {
        Alert.alert('Ошибка', error.message);
      } else {
        Alert.alert('Сохранено! ✅', 'Настройки обновлены');
      }
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('Ошибка', e.message);
    }
    setSaving(false);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разреши доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      setUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `avatar_${user.id}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const { decode } = require('base64-arraybuffer');
      const arrayBuffer = decode(base64Data);

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, arrayBuffer, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-media').getPublicUrl(fileName);

      await supabase.from('profiles').update({
        avatar_url: urlData.publicUrl,
      }).eq('id', user.id);

      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      Alert.alert('Готово! 🎉', 'Фото профиля обновлено');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить фото');
    } finally {
      setUploadingAvatar(false);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Сохранить</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Фото профиля */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: profile?.avatar_color || '#6C63FF' }]}>
                <Text style={styles.avatarEmoji}>{profile?.avatar_emoji || '😊'}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={16} color="#fff" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Нажми чтобы изменить фото</Text>
        </View>

        {/* Телефон */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Номер телефона</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color="#555" />
            <TextInput
              style={styles.input}
              placeholder="+7 (777) 777-77-77"
              placeholderTextColor="#555"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
  <Text style={styles.sectionTitle}>📝 О себе</Text>
  <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
    <TextInput
      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
      placeholder="Расскажи о себе..."
      placeholderTextColor="#555"
      value={bio}
      onChangeText={setBio}
      multiline
      maxLength={150}
    />
  </View>
  <Text style={{ color: '#555', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
    {bio.length}/150
  </Text>
</View>

        {/* Настройки приватности */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Приватность</Text>

          {[
            {
              icon: 'call',
              label: 'Показывать номер телефона',
              sub: 'Другие пользователи увидят твой номер',
              value: phoneVisible,
              onChange: setPhoneVisible,
              color: '#6C63FF',
            },
            {
              icon: 'ellipse',
              label: 'Показывать статус "в сети"',
              sub: 'Другие увидят когда ты онлайн',
              value: onlineVisible,
              onChange: setOnlineVisible,
              color: '#4CAF50',
            },
            {
              icon: 'albums',
              label: 'Показывать мои истории',
              sub: 'Другие увидят твои Stories',
              value: storiesVisible,
              onChange: setStoriesVisible,
              color: '#FF9F43',
            },
          ].map((item, i) => (
            <View key={i} style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: '#1A1A2E', true: item.color }}
                thumbColor={item.value ? '#fff' : '#555'}
              />
            </View>
          ))}
        </View>

        {/* Другие настройки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Аккаунт</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#6C63FF22' }]}>
              <Ionicons name="create" size={20} color="#6C63FF" />
            </View>
            <Text style={styles.menuItemText}>Редактировать профиль</Text>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Privacy')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#4CAF5022' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.menuItemText}>Политика конфиденциальности</Text>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FF9F4322' }]}>
              <Ionicons name="document-text" size={20} color="#FF9F43" />
            </View>
            <Text style={styles.menuItemText}>Условия использования</Text>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff' },
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  avatarSection: { alignItems: 'center', padding: 24 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: { fontSize: 50 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#07070F',
  },
  avatarHint: { color: '#555', fontSize: 13, marginTop: 8 },
  section: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#111120', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0D1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  settingIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  settingSub: { fontSize: 12, color: '#555', marginTop: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  menuItemText: { flex: 1, fontSize: 15, color: '#fff' },
});
