import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Dimensions
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function FriendsMapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [userId, setUserId] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      checkLocationStatus(user.id);
      fetchFriends(user.id);
    }
  };

  const checkLocationStatus = async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('location_enabled, latitude, longitude')
      .eq('id', uid)
      .single();

    if (data) {
      setLocationEnabled(data.location_enabled || false);
      if (data.latitude && data.longitude) {
        setLocation({ latitude: data.latitude, longitude: data.longitude });
      }
    }
    setLoading(false);
  };

  const fetchFriends = async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .eq('location_enabled', true)
      .not('latitude', 'is', null);

    if (data) setFriends(data);
  };

  const toggleLocation = async (value) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нет доступа', 'Разреши доступ к геолокации в настройках');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });
      setLocationEnabled(true);

      await supabase.from('profiles').update({
        latitude, longitude,
        location_enabled: true,
        last_seen: new Date().toISOString(),
      }).eq('id', userId);

      mapRef.current?.animateToRegion({
        latitude, longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      }, 1000);

    } else {
      setLocationEnabled(false);
      await supabase.from('profiles').update({
        location_enabled: false,
      }).eq('id', userId);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d < 1 ? `${Math.round(d * 1000)}м` : `${d.toFixed(1)}км`;
  };

  const COLORS = ['#6C63FF', '#FF6B6B', '#00D2D3', '#FF9F43', '#4CAF50'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Загружаем карту...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺 Карта друзей</Text>
        <View style={styles.onlineBadge}>
          <Text style={styles.onlineBadgeText}>{friends.length} онлайн</Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 43.2567,
          longitude: location?.longitude || 76.9286,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={locationEnabled}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {location && locationEnabled && (
          <>
            <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.myMarker}>
                <View style={styles.myMarkerDot} />
              </View>
            </Marker>
            <Circle
              center={location}
              radius={500}
              fillColor="rgba(108,99,255,0.1)"
              strokeColor="rgba(108,99,255,0.3)"
              strokeWidth={1}
            />
          </>
        )}

        {friends.map((friend, i) => (
          <Marker
            key={friend.id}
            coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
            onPress={() => setSelectedFriend(friend)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.friendMarker, { borderColor: COLORS[i % COLORS.length] }]}>
              <Text style={styles.friendMarkerText}>
                {(friend.full_name || friend.username || '?')[0].toUpperCase()}
              </Text>
              <View style={styles.friendOnlineDot} />
            </View>
          </Marker>
        ))}
      </MapView>

      {selectedFriend && (
        <View style={styles.friendCard}>
          <TouchableOpacity
            style={styles.closeFriendCard}
            onPress={() => setSelectedFriend(null)}
          >
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
          <View style={styles.friendCardLeft}>
            <View style={styles.friendCardAvatar}>
              <Text style={styles.friendCardAvatarText}>
                {(selectedFriend.full_name || selectedFriend.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.friendCardName}>
                {selectedFriend.full_name || selectedFriend.username}
              </Text>
              {location && (
                <Text style={styles.friendCardDistance}>
                  📍 {calculateDistance(
                    location.latitude, location.longitude,
                    selectedFriend.latitude, selectedFriend.longitude
                  )} от тебя
                </Text>
              )}
              <Text style={styles.friendCardStatus}>● Онлайн</Text>
            </View>
          </View>
          <View style={styles.friendCardActions}>
            <TouchableOpacity
              style={styles.friendCardBtn}
              onPress={() => navigation.navigate('Call', {
                userName: selectedFriend.full_name || selectedFriend.username
              })}
            >
              <Ionicons name="videocam" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.friendCardBtn, styles.friendCardBtnChat]}>
              <Ionicons name="chatbubble" size={20} color="#6C63FF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.privacyBar}>
        <View style={styles.privacyLeft}>
          <Ionicons
            name={locationEnabled ? 'location' : 'location-outline'}
            size={18}
            color={locationEnabled ? '#4CAF50' : '#555'}
          />
          <View>
            <Text style={styles.privacyTitle}>
              {locationEnabled ? 'Геолокация включена' : 'Геолокация выключена'}
            </Text>
            <Text style={styles.privacySubText}>
              {locationEnabled ? 'Друзья видят тебя на карте' : 'Ты невидим для друзей'}
            </Text>
          </View>
        </View>
        <Switch
          value={locationEnabled}
          onValueChange={toggleLocation}
          trackColor={{ false: '#1A1A2E', true: '#4CAF50' }}
          thumbColor={locationEnabled ? '#fff' : '#555'}
        />
      </View>

      {locationEnabled && location && (
        <TouchableOpacity
          style={styles.myLocationBtn}
          onPress={() => mapRef.current?.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000)}
        >
          <Ionicons name="locate" size={22} color="#6C63FF" />
        </TouchableOpacity>
      )}

      {friends.length === 0 && locationEnabled && (
        <View style={styles.noFriendsCard}>
          <Text style={styles.noFriendsText}>
            👥 Друзья пока не включили геолокацию
          </Text>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111120' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a1a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111120' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  loadingContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: '#888', marginTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20, paddingTop: 55,
    backgroundColor: '#07070F',
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  onlineBadge: {
    backgroundColor: '#1A3A1A', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  onlineBadgeText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  map: { flex: 1 },
  myMarker: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.5)',
  },
  myMarkerDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#6C63FF', borderWidth: 2, borderColor: '#fff',
  },
  friendMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  friendMarkerText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  friendOnlineDot: {
    position: 'absolute', top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#1A1A2E',
  },
  friendCard: {
    position: 'absolute', bottom: 100,
    left: 16, right: 16,
    backgroundColor: '#111120', borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: '#1A1A2E',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  closeFriendCard: {
    position: 'absolute', top: 12, right: 12,
  },
  friendCardLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 12,
  },
  friendCardAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  friendCardAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  friendCardName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  friendCardDistance: { fontSize: 13, color: '#888', marginBottom: 2 },
  friendCardStatus: { fontSize: 12, color: '#4CAF50' },
  friendCardActions: { flexDirection: 'row', gap: 10 },
  friendCardBtn: {
    flex: 1, backgroundColor: '#6C63FF',
    borderRadius: 12, padding: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  friendCardBtnChat: { backgroundColor: '#1A1A2E' },
  privacyBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111120', padding: 16,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
    gap: 12,
  },
  privacyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  privacySubText: { fontSize: 11, color: '#555', marginTop: 2 },
  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 110,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#1A1A2E',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  noFriendsCard: {
    position: 'absolute', top: 100, alignSelf: 'center',
    backgroundColor: 'rgba(17,17,32,0.9)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  noFriendsText: { color: '#888', fontSize: 13 },
});
