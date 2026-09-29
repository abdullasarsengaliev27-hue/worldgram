import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ChannelDetailScreen({ route, navigation }) {
  const { channelId, channelName } = route.params;
  const [posts, setPosts] = useState([]);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [likedPosts, setLikedPosts] = useState([]);

  useEffect(() => {
    getUser();
    fetchChannel();
    fetchPosts();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single();
      if (data?.role === 'admin') setIsAdmin(true);

      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      if (likes) setLikedPosts(likes.map(l => l.post_id));
    }
  };

  const fetchChannel = async () => {
    const { data } = await supabase
      .from('channels').select('*').eq('id', channelId).single();
    if (data) setChannel(data);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('channel_posts')
      .select('*, profiles!author_id(full_name, username, avatar_color)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    await supabase.from('channel_posts').insert({
      channel_id: channelId,
      author_id: userId,
      content: newPost.trim(),
    });
    setNewPost('');
    setPosting(false);
    fetchPosts();
  };

  const likePost = async (post) => {
    const isLiked = likedPosts.includes(post.id);
    if (isLiked) {
      await supabase.from('post_likes')
        .delete().eq('post_id', post.id).eq('user_id', userId);
      await supabase.from('channel_posts')
        .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
        .eq('id', post.id);
      setLikedPosts(prev => prev.filter(id => id !== post.id));
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId });
      await supabase.from('channel_posts')
        .update({ likes_count: (post.likes_count || 0) + 1 })
        .eq('id', post.id);
      setLikedPosts(prev => [...prev, post.id]);
    }
    fetchPosts();
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!author_id(full_name, username)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
    setShowComments(true);
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    await supabase.from('post_comments').insert({
      post_id: selectedPost.id,
      author_id: userId,
      content: newComment.trim(),
    });
    await supabase.from('channel_posts')
      .update({ comments_count: (selectedPost.comments_count || 0) + 1 })
      .eq('id', selectedPost.id);
    setNewComment('');
    openComments(selectedPost);
    fetchPosts();
  };

  const deletePost = async (postId) => {
    Alert.alert('Удалить пост?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await supabase.from('channel_posts').delete().eq('id', postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
        }
      }
    ]);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderPost = ({ item }) => {
    const isLiked = likedPosts.includes(item.id);
    const isMyPost = item.author_id === userId;

    return (
      <View style={styles.postCard}>
        {/* Header поста */}
        <View style={styles.postHeader}>
          <View style={[styles.postAvatar, { backgroundColor: item.profiles?.avatar_color || '#6C63FF' }]}>
            <Text style={styles.postAvatarText}>
              {(item.profiles?.full_name || item.profiles?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthorName}>
              {item.profiles?.full_name || item.profiles?.username || 'Аноним'}
            </Text>
            <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
          </View>
          {(isAdmin || isMyPost) && (
            <TouchableOpacity onPress={() => deletePost(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Контент */}
        <Text style={styles.postContent}>{item.content}</Text>

        {/* Действия */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.postAction}
            onPress={() => likePost(item)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#FF6B6B' : '#555'}
            />
            <Text style={[styles.postActionText, isLiked && { color: '#FF6B6B' }]}>
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postAction}
            onPress={() => openComments(item)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#555" />
            <Text style={styles.postActionText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.postAction}>
            <Ionicons name="share-outline" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.channelEmoji}>{channel?.avatar || '📢'}</Text>
          <View>
            <Text style={styles.headerTitle}>{channelName}</Text>
            <Text style={styles.headerSub}>
              {channel?.subscribers_count || 0} подписчиков
            </Text>
          </View>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Админ</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📢</Text>
              <Text style={styles.emptyTitle}>Нет постов</Text>
              <Text style={styles.emptySub}>
                {isAdmin ? 'Создай первый пост!' : 'Жди публикаций от автора'}
              </Text>
            </View>
          }
        />
      )}

      {/* Поле ввода для админа */}
      {isAdmin && (
        <View style={styles.postInputRow}>
          <View style={styles.postInputContainer}>
            <TextInput
              style={styles.postInput}
              placeholder="Написать пост..."
              placeholderTextColor="#555"
              value={newPost}
              onChangeText={setNewPost}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.postBtn, (!newPost.trim() || posting) && styles.postBtnDisabled]}
            onPress={createPost}
            disabled={!newPost.trim() || posting}
          >
            {posting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Комментарии Modal */}
      <Modal visible={showComments} animationType="slide" transparent>
        <View style={styles.commentsOverlay}>
          <View style={styles.commentsContent}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                💬 Комментарии ({comments.length})
              </Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {comments.length === 0 ? (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsText}>Нет комментариев. Будь первым!</Text>
                </View>
              ) : (
                comments.map(comment => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {(comment.profiles?.full_name || comment.profiles?.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>
                        {comment.profiles?.full_name || comment.profiles?.username}
                      </Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.commentInputRow}>
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Написать комментарий..."
                  placeholderTextColor="#555"
                  value={newComment}
                  onChangeText={setNewComment}
                />
              </View>
              <TouchableOpacity
                style={[styles.commentSendBtn, !newComment.trim() && styles.commentSendBtnDisabled]}
                onPress={addComment}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
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
    padding: 16, paddingTop: 55, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  channelEmoji: { fontSize: 28 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: '#555', marginTop: 2 },
  adminBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
  },
  adminBadgeText: { color: '#FFC107', fontSize: 11, fontWeight: 'bold' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  postCard: {
    backgroundColor: '#111120', borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  postAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  postAuthorInfo: { flex: 1 },
  postAuthorName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  postDate: { fontSize: 11, color: '#555', marginTop: 2 },
  postContent: { fontSize: 15, color: '#fff', lineHeight: 22, marginBottom: 14 },
  postActions: {
    flexDirection: 'row', gap: 20,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { color: '#555', fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555', textAlign: 'center' },
  postInputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
    alignItems: 'flex-end', backgroundColor: '#07070F',
  },
  postInputContainer: {
    flex: 1, backgroundColor: '#111120',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  postInput: { color: '#fff', fontSize: 15, maxHeight: 80 },
  postBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.3 },
  commentsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  commentsContent: {
    backgroundColor: '#111120', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, maxHeight: '80%',
  },
  commentsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  noComments: { alignItems: 'center', padding: 30 },
  noCommentsText: { color: '#555', fontSize: 14 },
  commentItem: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  commentBubble: {
    flex: 1, backgroundColor: '#1A1A2E',
    borderRadius: 14, padding: 10,
  },
  commentAuthor: { fontSize: 12, fontWeight: 'bold', color: '#6C63FF', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  commentDate: { fontSize: 10, color: '#555', marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E',
    alignItems: 'center',
  },
  commentInputContainer: {
    flex: 1, backgroundColor: '#0D0D1A',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  commentInput: { color: '#fff', fontSize: 14 },
  commentSendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  commentSendBtnDisabled: { opacity: 0.3 },
});

