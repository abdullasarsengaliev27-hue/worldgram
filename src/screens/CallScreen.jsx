import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, StatusBar, ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const formatDuration = (total) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export default function CallScreen({ route, navigation }) {
  const { userName = 'Собеседник', chatId, isVideo = true } = route.params || {};

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const startedAtRef = useRef(null);
  const endedRef = useRef(false);
  const timerRef = useRef(null);

  const roomName = `worldgram-${chatId}`;

  useEffect(() => {
    if (!chatId) {
      Alert.alert(
        'Звонок недоступен',
        'Открой звонок из чата или из профиля человека',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    loadMyName();
    return () => clearInterval(timerRef.current);
  }, []);

  const loadMyName = async () => {
    let name = 'Пользователь';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, custom_username')
          .eq('id', user.id)
          .single();
        name = data?.full_name || data?.custom_username || name;
      }
    } catch (e) { }
    setDisplayName(name);
  };

  // Время считаем с момента, когда страница звонка загрузилась
  const onPageLoaded = () => {
    setLoading(false);
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    }
  };

  const endCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);

    // Звонок так и не подключился — просто выходим
    if (!startedAtRef.current) {
      navigation.goBack();
      return;
    }

    setEnding(true);
    const startedAt = startedAtRef.current;
    const duration = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    let callLogId = null;

    try {
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          chat_id: chatId,
          partner_name: userName,
          is_video: isVideo,
          duration_seconds: duration,
          started_at: new Date(startedAt).toISOString(),
          ended_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (!error) callLogId = data?.id || null;
    } catch (e) { }

    navigation.replace('Summary', { callLogId, userName, duration, isVideo });
  };

  const confirmEnd = () => {
    Alert.alert('Завершить звонок?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Завершить', style: 'destructive', onPress: endCall },
    ]);
  };

  // Если в самой странице нажали «положить трубку» — она уходит из комнаты
  const onNavChange = (nav) => {
    if (!startedAtRef.current || endedRef.current) return;
    const url = nav?.url || '';
    const leftRoom = url.startsWith('http') && !url.includes(roomName);
    if (leftRoom && Date.now() - startedAtRef.current > 3000) endCall();
  };

  const hash = [
    `userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}`,
    'config.prejoinPageEnabled=false',
    'config.prejoinConfig.enabled=false',
    'config.disableDeepLinking=true',
    'config.startWithAudioMuted=false',
    `config.startWithVideoMuted=${!isVideo}`,
    `config.toolbarButtons=${encodeURIComponent(
      JSON.stringify(['microphone', 'camera', 'hangup', 'chat', 'tileview'])
    )}`,
  ].join('&');

  const jitsiUrl = chatId && displayName
    ? `https://meet.jit.si/${roomName}#${hash}`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={confirmEnd}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.headerSub}>
            {isVideo ? '📹 Видеозвонок' : '📞 Аудиозвонок'} • {formatDuration(seconds)}
          </Text>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={confirmEnd}>
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {jitsiUrl && (
          <WebView
            source={{ uri: jitsiUrl }}
            style={styles.webview}
            originWhitelist={['https://*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            onLoadEnd={onPageLoaded}
            onNavigationStateChange={onNavChange}
            onError={() => {
              Alert.alert('Ошибка', 'Не удалось подключиться к звонку');
              navigation.goBack();
            }}
          />
        )}

        {(loading || !jitsiUrl) && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.overlayText}>Подключаемся...</Text>
            <Text style={styles.overlaySub}>
              Собеседник должен нажать «Позвонить» в этом же чате
            </Text>
          </View>
        )}

        {ending && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.overlayText}>Завершаем звонок...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    backgroundColor: '#0D0D1A', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#6C63FF', marginTop: 2 },
  endBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FF4444', alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 30,
  },
  overlayText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overlaySub: { color: '#555', fontSize: 12, textAlign: 'center' },
});
