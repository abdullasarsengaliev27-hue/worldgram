import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const BACKGROUNDS = [
  {
    id: 'default',
    name: 'Worldgram',
    type: 'gradient',
    colors: ['#07070F', '#0D0D1A', '#111120'],
    preview: '🌌',
    isPremium: false,
    isDefault: true,
  },
  {
    id: 'purple_rain',
    name: 'Purple Rain',
    type: 'gradient',
    colors: ['#1a0533', '#2D1B69', '#11998e'],
    preview: '💜',
    isPremium: false,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    type: 'gradient',
    colors: ['#0f0c29', '#302b63', '#24243e'],
    preview: '🌙',
    isPremium: false,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    type: 'gradient',
    colors: ['#0052D4', '#4364F7', '#6FB1FC'],
    preview: '🌊',
    isPremium: false,
  },
  {
    id: 'forest',
    name: 'Forest',
    type: 'gradient',
    colors: ['#0f3443', '#34e89e', '#0f3443'],
    preview: '🌿',
    isPremium: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    type: 'gradient',
    colors: ['#FF512F', '#DD2476', '#FF512F'],
    preview: '🌅',
    isPremium: false,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    colors: ['#000428', '#004e92', '#00c6ff'],
    preview: '✨',
    isPremium: false,
  },
  {
    id: 'rose',
    name: 'Rose',
    type: 'gradient',
    colors: ['#1a1a2e', '#16213e', '#e94560'],
    preview: '🌹',
    isPremium: false,
  },
  {
    id: 'galaxy',
    name: 'Galaxy ⭐',
    type: 'pattern',
    colors: ['#0d0d2b', '#1a1a4e', '#2d2d6b'],
    preview: '🌠',
    isPremium: true,
  },
  {
    id: 'neon',
    name: 'Neon City',
    type: 'pattern',
    colors: ['#0a0a0a', '#1a0a2e', '#2d0a4e'],
    preview: '🌆',
    isPremium: true,
  },
  {
    id: 'worldgram_branded',
    name: '🌍 Worldgram Pro',
    type: 'branded',
    colors: ['#0A0A0F', '#1A1A2E', '#6C63FF'],
    preview: '🌍',
    isPremium: true,
  },
];

export default function ChatBackgroundScreen({ route, navigation }) {
  const { chatId, currentBackground } = route.params;
  const [selected, setSelected] = useState(currentBackground || 'default');
  const [saving, setSaving] = useState(false);

  const saveBackground = async () => {
    setSaving(true);
    await supabase.from('chats').update({
      chat_background: selected,
    }).eq('id', chatId);
    setSaving(false);
    navigation.goBack();
  };

  const PreviewChat = ({ bg }) => (
    <View style={[styles.previewContainer, { backgroundColor: bg.colors[0] }]}>
      {/* Фоновые элементы */}
      {bg.id === 'worldgram_branded' && (
        <View style={styles.brandedBg}>
          <Text style={styles.brandedLogo}>W</Text>
          <Text style={styles.brandedText}>Worldgram</Text>
        </View>
      )}
      {bg.type === 'pattern' && (
        <View style={styles.patternBg}>
          {[...Array(6)].map((_, i) => (
            <Text key={i} style={[styles.patternEmoji, {
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 80}%`,
              opacity: 0.15,
            }]}>
              {bg.preview}
            </Text>
          ))}
        </View>
      )}
      {/* Пузырьки сообщений */}
      <View style={styles.previewBubbleLeft}>
        <Text style={styles.previewBubbleText}>Привет! 👋</Text>
      </View>
      <View style={styles.previewBubbleRight}>
        <Text style={styles.previewBubbleText}>Как дела? 😊</Text>
      </View>
      <View style={styles.previewBubbleLeft}>
        <Text style={styles.previewBubbleText}>Отлично! ❤️</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎨 Фон чата</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={saveBackground}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '...' : 'Готово'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Превью выбранного фона */}
        {selected && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Предпросмотр</Text>
            <PreviewChat bg={BACKGROUNDS.find(b => b.id === selected) || BACKGROUNDS[0]} />
          </View>
        )}

        {/* Стандартные фоны */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Стандартные</Text>
          <View style={styles.grid}>
            {BACKGROUNDS.filter(b => !b.isPremium).map((bg) => (
              <TouchableOpacity
                key={bg.id}
                style={[styles.bgCard, selected === bg.id && styles.bgCardSelected]}
                onPress={() => setSelected(bg.id)}
              >
                <View style={[styles.bgPreview, { backgroundColor: bg.colors[0] }]}>
                  <View style={[styles.bgPreviewStripe, { backgroundColor: bg.colors[1] + '88' }]} />
                  <Text style={styles.bgEmoji}>{bg.preview}</Text>
                  {bg.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>По умолчанию</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.bgName}>{bg.name}</Text>
                {selected === bg.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Премиум фоны */}
        <View style={styles.section}>
          <View style={styles.premiumHeader}>
            <Text style={styles.sectionTitle}>⭐ Эксклюзивные</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          </View>
          <View style={styles.grid}>
            {BACKGROUNDS.filter(b => b.isPremium).map((bg) => (
              <TouchableOpacity
                key={bg.id}
                style={[styles.bgCard, selected === bg.id && styles.bgCardSelected]}
                onPress={() => setSelected(bg.id)}
              >
                <View style={[styles.bgPreview, { backgroundColor: bg.colors[0] }]}>
                  <View style={[styles.bgPreviewStripe, { backgroundColor: bg.colors[1] + '88' }]} />
                  <Text style={styles.bgEmoji}>{bg.preview}</Text>
                  <View style={styles.premiumLock}>
                    <Text style={styles.premiumLockText}>⭐</Text>
                  </View>
                </View>
                <Text style={styles.bgName}>{bg.name}</Text>
                {selected === bg.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff' },
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  previewSection: { margin: 16 },
  previewLabel: { color: '#888', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  previewContainer: {
    height: 180, borderRadius: 16, overflow: 'hidden',
    justifyContent: 'center', padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  brandedBg: {
    position: 'absolute', alignSelf: 'center',
    alignItems: 'center', opacity: 0.08,
  },
  brandedLogo: { fontSize: 60, fontWeight: 'bold', color: '#6C63FF' },
  brandedText: { fontSize: 20, color: '#6C63FF', fontWeight: 'bold' },
  patternBg: { position: 'absolute', width: '100%', height: '100%' },
  patternEmoji: { position: 'absolute', fontSize: 20 },
  previewBubbleLeft: {
    backgroundColor: '#1A1A2E', borderRadius: 14,
    padding: 8, alignSelf: 'flex-start', maxWidth: '60%',
  },
  previewBubbleRight: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 8, alignSelf: 'flex-end', maxWidth: '60%',
  },
  previewBubbleText: { color: '#fff', fontSize: 13 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  premiumBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
  },
  premiumBadgeText: { color: '#FFC107', fontSize: 10, fontWeight: 'bold' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  bgCard: {
    width: (width - 52) / 3,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#1A1A2E',
    position: 'relative',
  },
  bgCardSelected: { borderColor: '#6C63FF' },
  bgPreview: {
    height: 80, alignItems: 'center',
    justifyContent: 'center', position: 'relative',
    overflow: 'hidden',
  },
  bgPreviewStripe: {
    position: 'absolute', top: 0, left: 0,
    right: 0, bottom: 0,
  },
  bgEmoji: { fontSize: 28, zIndex: 1 },
  defaultBadge: {
    position: 'absolute', bottom: 4,
    backgroundColor: 'rgba(108,99,255,0.8)',
    borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
  },
  defaultBadgeText: { color: '#fff', fontSize: 8 },
  premiumLock: {
    position: 'absolute', top: 4, right: 4,
  },
  premiumLockText: { fontSize: 12 },
  bgName: {
    color: '#fff', fontSize: 11, textAlign: 'center',
    padding: 6, backgroundColor: '#111120',
  },
  checkmark: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
});
