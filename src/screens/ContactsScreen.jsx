import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const EMOJIS = ['👤', '👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🤝', '❤️', '⭐', '🔥', '💼', '🎮', '🎵', '🏀'];
const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50', '#FFC107', '#A29BFE', '#FF7675'];

export default function ContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👤');
  const [selectedColor, setSelectedColor] = useState('#6C63FF');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    if (data) setContacts(data);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditContact(null);
    setName('');
    setPhone('');
    setSelectedEmoji('👤');
    setSelectedColor('#6C63FF');
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setEditContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setSelectedEmoji(contact.emoji || '👤');
    setSelectedColor(contact.color || '#6C63FF');
    setShowModal(true);
  };

  const saveContact = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Ошибка', 'Заполни имя и номер телефона');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (editContact) {
      await supabase.from('contacts').update({
        name: name.trim(),
        phone: phone.trim(),
        emoji: selectedEmoji,
        color: selectedColor,
      }).eq('id', editContact.id);
    } else {
      await supabase.from('contacts').insert({
        user_id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        emoji: selectedEmoji,
        color: selectedColor,
      });
    }

    setSaving(false);
    setShowModal(false);
    fetchContacts();
  };

  const deleteContact = (contact) => {
    Alert.alert(`Удалить ${contact.name}?`, '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('contacts').delete().eq('id', contact.id);
          fetchContacts();
        }
      }
    ]);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  // Группируем по первой букве
  const grouped = filteredContacts.reduce((acc, contact) => {
    const letter = contact.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(contact);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📱 Контакты</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск контактов..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Счётчик */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="people" size={14} color="#6C63FF" />
          <Text style={styles.statChipText}>{contacts.length} контактов</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📱</Text>
          <Text style={styles.emptyTitle}>Нет контактов</Text>
          <Text style={styles.emptySubText}>Нажми + чтобы добавить первый контакт</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.emptyAddBtnText}>Добавить контакт</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.keys(grouped).sort().map(letter => (
            <View key={letter}>
              <Text style={styles.letterHeader}>{letter}</Text>
              {grouped[letter].map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactCard}
                  onPress={() => openEditModal(contact)}
                  onLongPress={() => deleteContact(contact)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                    <Text style={styles.contactEmoji}>{contact.emoji}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity style={styles.contactActionBtn}>
                      <Ionicons name="call-outline" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.contactActionBtn}
                      onPress={() => openEditModal(contact)}
                    >
                      <Ionicons name="create-outline" size={18} color="#6C63FF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="person-add" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editContact ? '✏️ Редактировать' : '➕ Новый контакт'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Превью аватара */}
            <View style={styles.avatarPreview}>
              <View style={[styles.previewAvatar, { backgroundColor: selectedColor }]}>
                <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              </View>
              <Text style={styles.previewName}>{name || 'Имя контакта'}</Text>
              <Text style={styles.previewPhone}>{phone || '+7 (777) 777-77-77'}</Text>
            </View>

            {/* Имя */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Имя</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={16} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="Введи имя..."
                  placeholderTextColor="#555"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Телефон */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Номер телефона</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={16} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="+7 (777) 777-77-77"
                  placeholderTextColor="#555"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Эмодзи */}
            <Text style={styles.inputLabel}>Аватар</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, selectedEmoji === emoji && styles.emojiBtnSelected]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Цвет */}
            <Text style={styles.inputLabel}>Цвет</Text>
            <View style={styles.colorRow}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color },
                    selectedColor === color && styles.colorBtnSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Кнопки */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnLoading]}
                onPress={saveContact}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>
                      {editContact ? 'Сохранить' : 'Добавить'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {editContact && (
              <TouchableOpacity
                style={styles.deleteContactBtn}
                onPress={() => {
                  setShowModal(false);
                  deleteContact(editContact);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#FF4444" />
                <Text style={styles.deleteContactBtnText}>Удалить контакт</Text>
              </TouchableOpacity>
            )}
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
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  statsRow: { paddingHorizontal: 16, marginBottom: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111120', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1A1A2E',
    alignSelf: 'flex-start',
  },
  statChipText: { color: '#888', fontSize: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  letterHeader: {
    fontSize: 13, fontWeight: 'bold', color: '#6C63FF',
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: '#07070F',
  },
  contactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', marginHorizontal: 16,
    marginBottom: 8, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 12,
  },
  contactAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  contactEmoji: { fontSize: 24 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  contactPhone: { fontSize: 13, color: '#888' },
  contactActions: { flexDirection: 'row', gap: 6 },
  contactActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A3E',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111120', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  avatarPreview: {
    alignItems: 'center', marginBottom: 20,
  },
  previewAvatar: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  previewEmoji: { fontSize: 34 },
  previewName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  previewPhone: { fontSize: 13, color: '#555' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0D0D1A', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  emojiRow: { marginBottom: 12 },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#0D0D1A', alignItems: 'center',
    justifyContent: 'center', marginRight: 8,
    borderWidth: 2, borderColor: '#1A1A2E',
  },
  emojiBtnSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  emojiBtnText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  colorBtnSelected: { borderColor: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  cancelBtn: {
    flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2, backgroundColor: '#6C63FF', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  deleteContactBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    padding: 12,
  },
  deleteContactBtnText: { color: '#FF4444', fontSize: 14 },
});
