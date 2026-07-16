import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions
} from 'react-native';

const { width, height } = Dimensions.get('window');

const MOCK_FRIENDS = [
  { id: '1', name: 'Алибек', distance: '2.3 км', status: 'online', emoji: '😊', city: 'Алматы' },
  { id: '2', name: 'Айгерим', distance: '5.1 км', status: 'online', emoji: '🎵', city: 'Алматы' },
  { id: '3', name: 'Данияр', distance: '12 км', status: 'offline', emoji: '📚', city: 'Алматы' },
  { id: '4', name: 'Мадина', distance: '0.8 км', status: 'online', emoji: '☕', city: 'Алматы' },
  { id: '5', name: 'Ержан', distance: '25 км', status: 'online', emoji: '🏃', city: 'Алматы' },
];

export default function FriendsMapScreen({ navigation }) {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const onlineFriends = MOCK_FRIENDS.filter(f => f.status === 'online');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🗺 Карта друзей</Text>
        <View style={styles.onlineBadge}>
          <Text style={styles.onlineBadgeText}>{onlineFriends.length} онлайн</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapBg}>
          {[...Array(6)].map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${i * 20}%` }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${i * 20}%` }]} />
          ))}

          <View style={[styles.myMarker, { top: '45%', left: '45%' }]}>
            <View style={styles.myMarkerPulse} />
            <View style={styles.myMarkerDot} />
            <Text style={styles.myMarkerLabel}>Ты</Text>
          </View>

          <View style={styles.radiusCircle} />

          {MOCK_FRIENDS.map((friend, index) => {
            const positions = [
              { top: '25%', left: '60%' },
              { top: '60%', left: '70%' },
              { top: '70%', left: '30%' },
              { top: '20%', left: '30%' },
              { top: '50%', left: '80%' },
            ];
            const pos = positions[index];
            return (
              <TouchableOpacity
                key={friend.id}
                style={[
                  styles.friendMarker, pos,
                  friend.status === 'offline' && styles.friendMarkerOffline,
                  selectedFriend?.id === friend.id && styles.friendMarkerSelected,
                ]}
                onPress={() => setSelectedFriend(
                  selectedFriend?.id === friend.id ? null : friend
                )}
              >
                <Text style={styles.friendMarkerEmoji}>{friend.emoji}</Text>
                {friend.status === 'online' && <View style={styles.onlineDot} />}
              </TouchableOpacity>
            );
          })}

          {selectedFriend && (
            <View style={styles.friendCard}>
              <View style={styles.friendCardLeft}>
                <Text style={styles.friendCardEmoji}>{selectedFriend.emoji}</Text>
                <View>
                  <Text style={styles.friendCardName}>{selectedFriend.name}</Text>
                  <Text style={styles.friendCardDistance}>📍 {selectedFriend.distance}</Text>
                  <Text style={[
                    styles.friendCardStatus,
                    { color: selectedFriend.status === 'online' ? '#4CAF50' : '#888' }
                  ]}>
                    {selectedFriend.status === 'online' ? '● Онлайн' : '● Оффлайн'}
                  </Text>
                </View>
              </View>
              <View style={styles.friendCardActions}>
                <TouchableOpacity
                  style={styles.friendCardBtn}
                  onPress={() => navigation.navigate('Call', { userName: selectedFriend.name })}
                >
                  <Text style={styles.friendCardBtnText}>📹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.friendCardBtn}>
                  <Text style={styles.friendCardBtnText}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.friendsList}>
        <Text style={styles.friendsListTitle}>Друзья рядом</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MOCK_FRIENDS.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={[
                styles.friendChip,
                friend.status === 'offline' && styles.friendChipOffline,
                selectedFriend?.id === friend.id && styles.friendChipSelected,
              ]}
              onPress={() => setSelectedFriend(
                selectedFriend?.id === friend.id ? null : friend
              )}
            >
              <Text style={styles.friendChipEmoji}>{friend.emoji}</Text>
              <Text style={styles.friendChipName}>{friend.name}</Text>
              <Text style={styles.friendChipDistance}>{friend.distance}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.privacyBar}>
        <Text style={styles.privacyText}>🔒 Только приблизительное расстояние</Text>
        <View style={styles.privacyToggle}>
          <Text style={styles.privacyToggleText}>Вкл</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  backBtn: { fontSize: 32, color: '#6C63FF', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  onlineBadge: {
    backgroundColor: '#1A3A1A', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  onlineBadgeText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  mapContainer: { flex: 1 },
  mapBg: {
    flex: 1, backgroundColor: '#0D1117',
    position: 'relative', overflow: 'hidden',
  },
  gridLine: { position: 'absolute', backgroundColor: '#1A2A1A', opacity: 0.5 },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  myMarker: { position: 'absolute', alignItems: 'center' },
  myMarkerPulse: {
    position: 'absolute', width: 50, height: 50,
    borderRadius: 25, backgroundColor: 'rgba(108,99,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.4)',
  },
  myMarkerDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#6C63FF', borderWidth: 2, borderColor: '#fff',
  },
  myMarkerLabel: { color: '#fff', fontSize: 10, marginTop: 2 },
  radiusCircle: {
    position: 'absolute', top: '30%', left: '30%',
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
    backgroundColor: 'rgba(108,99,255,0.05)',
  },
  friendMarker: {
    position: 'absolute', width: 44, height: 44,
    borderRadius: 22, backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#4CAF50',
  },
  friendMarkerOffline: { borderColor: '#555' },
  friendMarkerSelected: { borderColor: '#6C63FF', backgroundColor: '#2A1A4E' },
  friendMarkerEmoji: { fontSize: 20 },
  onlineDot: {
    position: 'absolute', top: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4CAF50', borderWidth: 1, borderColor: '#0A0A0F',
  },
  friendCard: {
    position: 'absolute', bottom: 10, left: 16, right: 16,
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#6C63FF',
  },
  friendCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  friendCardEmoji: { fontSize: 36, marginRight: 12 },
  friendCardName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  friendCardDistance: { fontSize: 13, color: '#888', marginTop: 2 },
  friendCardStatus: { fontSize: 12, marginTop: 2 },
  friendCardActions: { flexDirection: 'row', gap: 8 },
  friendCardBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  friendCardBtnText: { fontSize: 20 },
  friendsList: {
    backgroundColor: '#0F0F1A', padding: 16,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  friendsListTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  friendChip: {
    backgroundColor: '#1A1A2E', borderRadius: 16,
    padding: 12, marginRight: 10, alignItems: 'center',
    minWidth: 80, borderWidth: 1, borderColor: '#2A2A3E',
  },
  friendChipOffline: { opacity: 0.5 },
  friendChipSelected: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  friendChipEmoji: { fontSize: 24, marginBottom: 4 },
  friendChipName: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  friendChipDistance: { color: '#6C63FF', fontSize: 10, marginTop: 2 },
  privacyBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12,
    backgroundColor: '#0A0A0F',
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  privacyText: { color: '#888', fontSize: 12 },
  privacyToggle: {
    backgroundColor: '#1A3A1A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  privacyToggleText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
});
