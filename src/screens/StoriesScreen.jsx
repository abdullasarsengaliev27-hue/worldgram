import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Animated,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

const BG_COLORS = [
  '#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43',
  '#4CAF50', '#A29BFE', '#FFC107', '#FF7675',
];

const EMOJIS = ['✨', '🔥', '❤️', '😎', '🎉', '💫', '🌟', '👑'];

export default function StoriesScreen({ navigation }) {
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6C63FF');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [viewingStory, setViewingStory] = useState(null);
  const [userId, setUserId] = useState(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchStories(user.id);
    }
  };

  const fetchStories = async (myId) => {
    const { data } = await supabase
      .from('stories')
      .select('*, profiles(full_name, username, avatar_color, avatar_emoji)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setMyStories(data.filter(s => s.user_id === myId));
      setStories(data.filter(s => s.user_id !== myId));
    }
    setLoading(false);
  };

  const createStory = async () => {
    if (!storyText.trim()) {
      Alert.alert('Ошибка', 'Напиши текст для истории');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('stories').insert({
      user_id: userId,
      content: storyText.trim(),
      story_type: 'text',
      background_color: selectedColor,
      emoji: selectedEmoji,
    });

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      setStoryText('');
      setShowCreate(false);
      fetchStories(userId);
    }
    setCreating(false);
  };

  const deleteStory = async (storyId) => {
    Alert.alert('Удалить историю?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('stories').delete().eq('id', storyId);
          fetchStories(userId);
        }
      }
    ]);
  };

  const openStory = (story) => {
    setViewingStory(story);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1, duration: 5000, useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setViewingStory(null);
    });
  };

  const closeStory = () => {
    progressAnim.stopAnimation();
    setViewingStory(null);
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (hours > 0) return `${hours}ч назад`;
    if (mins > 0) return `${mins}м назад`;
    return 'Только что';
  };

  const getExpiresIn = (dateStr) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    return `${hours}ч`;
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50'];
  const getColor = (index) => COLORS[index % COLORS.length];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Просмотр истории
  if (viewingStory) {
    return (
      <View style={[styles.storyViewer, { backgroundColor: viewingStory.background_color }]}>
        {/* Прогресс */}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({
              inputRange: [0, 1], outputRange: ['0%', '100%']
            })
          }]} />
        </View>

        {/* Header */}
        <View style={styles.storyHeader}>
          <View style={styles.storyUserInfo}>
            <View style={[styles.storyAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.storyAvatarText}>
                {viewingStory.emoji || '✨'}
              </Text>
            </View>
            <View>
              <Text style={styles.storyUserName}>
                {viewingStory.profiles?.full_name || 'Пользователь'}
              </Text>
              <Text style={styles.storyTime}>{getTimeAgo(viewingStory.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeStoryBtn} onPress={closeStory}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Контент */}
        <View style={styles.storyContent}>
          <Text style={styles.storyEmoji}>{viewingStory.emoji}</Text>
          <Text style={styles.storyText}>{viewingStory.content}</Text>
        </View>

        {/* Нижняя часть */}
        <View style={styles.storyFooter}>
          <TouchableOpacity style={styles.replyStoryBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.replyStoryText}>Ответить...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeStoryBtn}>
            <Text style={styles.likeStoryEmoji}>❤️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Создание истории
  if (showCreate) {
    return (
      <View style={[styles.createContainer, { backgroundColor: selectedColor }]}>
        {/* Header */}
        <View style={styles.createHeader}>
          <TouchableOpacity onPress={() => setShowCreate(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.createTitle}>Новая история</Text>
          <TouchableOpacity
            style={styles.publishBtn}
            onPress={createStory}
            disabled={creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.publishBtnText}>Опубликовать</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Превью */}
        <View style={styles.createPreview}>
          <Text style={styles.createEmoji}>{selectedEmoji}</Text>
          <TextInput
            style={styles.createInput}
            placeholder="Напиши что-нибудь..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={storyText}
            onChangeText={setStoryText}
            multiline
            maxLength={200}
            textAlign="center"
            autoFocus
          />
          <Text style={styles.charCount}>{storyText.length}/200</Text>
        </View>

        {/* Выбор цвета */}
        <View style={styles.colorPicker}>
          {BG_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorDot, { backgroundColor: color },
                selectedColor === color && styles.colorDotSelected
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {/* Выбор эмодзи */}
        <View style={styles.emojiPicker}>
          {EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiOption,
                selectedEmoji === emoji && styles.emojiOptionSelected
              ]}
              onPress={() => setSelectedEmoji(emoji)}
            >
              <Text style={styles.emojiOptionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Истории</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Мои истории */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Мои истории</Text>
          {myStories.length === 0 ? (
            <TouchableOpacity
              style={styles.addStoryCard}
              onPress={() => setShowCreate(true)}
            >
              <View style={styles.addStoryIcon}>
                <Ionicons name="add" size={30} color="#6C63FF" />
              </View>
              <Text style={styles.addStoryText}>Добавить историю</Text>
              <Text style={styles.addStorySubText}>Она исчезнет через 24 часа</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myStories.map((story, i) => (
                <View key={story.id} style={styles.myStoryItem}>
                  <TouchableOpacity
                    style={[styles.storyBubble, { backgroundColor: story.background_color }]}
                    onPress={() => openStory(story)}
                  >
                    <Text style={styles.storyBubbleEmoji}>{story.emoji}</Text>
                  </TouchableOpacity>
                  <Text style={styles.storyBubbleTime}>
                    {getExpiresIn(story.expires_at)} осталось
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteStoryBtn}
                    onPress={() => deleteStory(story.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addMoreStory}
                onPress={() => setShowCreate(true)}
              >
                <Ionicons name="add" size={24} color="#6C63FF" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Истории других */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Истории друзей {stories.length > 0 && `(${stories.length})`}
          </Text>

          {stories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>Пока нет историй</Text>
              <Text style={styles.emptySubText}>
                Друзья ещё не добавили истории
              </Text>
            </View>
          ) : (
            stories.map((story, i) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyCard}
                onPress={() => openStory(story)}
              >
                <View style={[styles.storyCardAvatar, { backgroundColor: story.background_color }]}>
                  <Text style={styles.storyCardEmoji}>{story.emoji}</Text>
                  <View style={styles.storyRing} />
                </View>
                <View style={styles.storyCardInfo}>
                  <Text style={styles.storyCardName}>
                    {story.profiles?.full_name || 'Пользователь'}
                  </Text>
                  <Text style={styles.storyCardText} numberOfLines={1}>
                    {story.content}
                  </Text>
                  <Text style={styles.storyCardTime}>
                    {getTimeAgo(story.created_at)} • {getExpiresIn(story.expires_at)} осталось
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#333" />
              </TouchableOpacity>
            ))
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 14 },
  addStoryCard: {
    backgroundColor: '#111120', borderRadius: 20,
    padding: 24, alignItems: 'center',
    borderWidth: 2, borderColor: '#1A1A2E',
    borderStyle: 'dashed',
  },
  addStoryIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(108,99,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  addStoryText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  addStorySubText: { fontSize: 13, color: '#555' },
  myStoryItem: { alignItems: 'center', marginRight: 12 },
  storyBubble: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  storyBubbleEmoji: { fontSize: 32 },
  storyBubbleTime: { fontSize: 10, color: '#555', textAlign: 'center' },
  deleteStoryBtn: { marginTop: 4 },
  addMoreStory: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    borderColor: '#6C63FF', borderStyle: 'dashed',
  },
  storyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 18,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 12,
  },
  storyCardAvatar: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  storyCardEmoji: { fontSize: 28 },
  storyRing: {
    position: 'absolute', width: 66, height: 66,
    borderRadius: 33, borderWidth: 2,
    borderColor: '#6C63FF',
  },
  storyCardInfo: { flex: 1 },
  storyCardName: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  storyCardText: { fontSize: 13, color: '#888', marginBottom: 3 },
  storyCardTime: { fontSize: 11, color: '#555' },
  emptyContainer: {
    alignItems: 'center', padding: 40,
  },
  emptyEmoji: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#555', textAlign: 'center' },

  // Viewer
  storyViewer: {
    flex: 1, paddingTop: 50,
  },
  progressBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#fff', borderRadius: 2,
  },
  storyHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  storyUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  storyAvatarText: { fontSize: 20 },
  storyUserName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  storyTime: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  closeStoryBtn: { padding: 4 },
  storyContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  storyEmoji: { fontSize: 80, marginBottom: 24 },
  storyText: {
    fontSize: 24, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', lineHeight: 34,
  },
  storyFooter: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, gap: 12,
  },
  replyStoryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24, paddingHorizontal: 16,
    paddingVertical: 12, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  replyStoryText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  likeStoryBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  likeStoryEmoji: { fontSize: 24 },

  // Creator
  createContainer: { flex: 1, paddingTop: 55 },
  createHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  createTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  publishBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  createPreview: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  createEmoji: { fontSize: 70, marginBottom: 24 },
  createInput: {
    fontSize: 22, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', width: '100%', lineHeight: 30,
  },
  charCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 },
  colorPicker: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, paddingHorizontal: 20, marginBottom: 12,
  },
  colorDot: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 3, borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: '#fff' },
  emojiPicker: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingHorizontal: 20, paddingBottom: 40,
  },
  emojiOption: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiOptionSelected: { backgroundColor: 'rgba(255,255,255,0.35)' },
  emojiOptionText: { fontSize: 22 },
});
