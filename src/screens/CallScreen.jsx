import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated
} from 'react-native';
import { notifyAchievement } from '../lib/notifications';

const { width, height } = Dimensions.get('window');

export default function CallScreen({ route, navigation }) {
  const { userName } = route.params || {};
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [confidence, setConfidence] = useState(75);
  const [showTip, setShowTip] = useState(false);
  const [confidenceTip, setConfidenceTip] = useState('');
  const [heartPingSent, setHeartPingSent] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const CONTEXT = {
    lastCall: '3 дня назад',
    mentioned: ['отпуск', 'работа', 'кино'],
    tip: 'Спроси про отпуск — он упомянул это в прошлый раз',
    commonTopics: ['🎬 Кино', '✈️ Путешествия', '💼 Работа'],
  };

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newConfidence = Math.floor(Math.random() * 40) + 55;
      setConfidence(newConfidence);
      if (newConfidence < 65) {
        const tips = [
          '💡 Говори чуть медленнее',
          '💪 Смелее, подними тон',
          '⏸ Держи паузу 1 секунду',
        ];
        setConfidenceTip(tips[Math.floor(Math.random() * tips.length)]);
        setShowTip(true);
        setTimeout(() => setShowTip(false), 3000);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const sendReaction = (emoji) => {
    setActiveReaction(emoji);
    setTimeout(() => setActiveReaction(null), 2000);
  };

  const sendHeartPing = () => {
    setHeartPingSent(true);
    sendReaction('💗');
    setTimeout(() => setHeartPingSent(false), 2000);
  };

  const getConfidenceColor = () => {
    if (confidence >= 80) return '#4CAF50';
    if (confidence >= 65) return '#FFC107';
    return '#FF5252';
  };

  return (
    <View style={styles.container}>

      {/* Видео собеседника */}
      <View style={styles.remoteVideo}>
        <View style={styles.remoteAvatar}>
          <Text style={styles.remoteAvatarText}>
            {userName?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.remoteName}>{userName}</Text>
        <Text style={styles.callDuration}>{formatTime(seconds)}</Text>
      </View>

      {/* Реакция */}
      {activeReaction && (
        <View style={styles.reactionOverlay}>
          <Text style={styles.reactionEmoji}>{activeReaction}</Text>
        </View>
      )}

      {/* Своё видео */}
      <View style={styles.localVideo}>
        <Text style={styles.localVideoText}>Ты</Text>
      </View>

      {/* Speech Confidence */}
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>🎤 Уверенность</Text>
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, {
            width: `${confidence}%`,
            backgroundColor: getConfidenceColor()
          }]} />
        </View>
        <Text style={[styles.confidencePercent, { color: getConfidenceColor() }]}>
          {confidence}%
        </Text>
      </View>

      {/* Context Cards панель */}
      {showContext && (
        <View style={styles.contextPanel}>
          <View style={styles.contextHeader}>
            <Text style={styles.contextTitle}>📋 Контекст: {userName}</Text>
            <TouchableOpacity onPress={() => setShowContext(false)}>
              <Text style={styles.contextClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.contextItem}>
              🕐 Последний разговор: {CONTEXT.lastCall}
            </Text>
            <Text style={styles.contextItem}>
              💬 Упоминал: {CONTEXT.mentioned.join(', ')}
            </Text>
            <View style={styles.contextTipBox}>
              <Text style={styles.contextTipText}>
                💡 {CONTEXT.tip}
              </Text>
            </View>
            <Text style={styles.contextSubtitle}>Общие темы:</Text>
            <View style={styles.topicsRow}>
              {CONTEXT.commonTopics.map((topic, i) => (
                <View key={i} style={styles.topicChip}>
                  <Text style={styles.topicChipText}>{topic}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Подсказка уверенности */}
      {showTip && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>{confidenceTip}</Text>
        </View>
      )}

      {/* Реакции */}
      <View style={styles.reactionsRow}>
        {['🔥', '❤️', '😂', '👍', '😮'].map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.reactionBtn}
            onPress={() => sendReaction(emoji)}
          >
            <Text style={styles.reactionBtnText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Управление */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.controlBtnText}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Вкл' : 'Выкл'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallBtn}
          onPress={async () => {
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
          
            // Уведомление о достижении если звонок длился больше минуты
            if (seconds >= 60) {
              await notifyAchievement('Долгий разговор', 10);
            }
          
            navigation.replace('Summary', {
              userName,
              duration: `${mins}:${secs}`
            });
          }}
        >
          <Text style={styles.endCallText}>📵</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
          onPress={() => setIsCameraOff(!isCameraOff)}
        >
          <Text style={styles.controlBtnText}>{isCameraOff ? '📷' : '🎥'}</Text>
          <Text style={styles.controlLabel}>{isCameraOff ? 'Вкл' : 'Выкл'}</Text>
        </TouchableOpacity>
      </View>

      {/* Heart Ping */}
      <TouchableOpacity
        style={[styles.heartPingBtn, heartPingSent && styles.heartPingSent]}
        onPress={sendHeartPing}
      >
        <Text style={styles.heartPingText}>💗</Text>
        <Text style={styles.heartPingLabel}>Heart Ping</Text>
      </TouchableOpacity>

      {/* Context кнопка */}
      <TouchableOpacity
        style={styles.contextBtn}
        onPress={() => setShowContext(!showContext)}
      >
        <Text style={styles.contextBtnText}>📋</Text>
        <Text style={styles.contextBtnLabel}>Контекст</Text>
      </TouchableOpacity>

      {/* Translate кнопка */}
<TouchableOpacity
  style={styles.translateBtn}
  onPress={() => navigation.navigate('Translate')}
>
  <Text style={styles.translateBtnText}>🌐</Text>
  <Text style={styles.translateBtnLabel}>Перевод</Text>
</TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  remoteVideo: {
    flex: 1, backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center',
  },
  remoteAvatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 20,
  },
  remoteAvatarText: { fontSize: 44, fontWeight: 'bold', color: '#fff' },
  remoteName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  callDuration: { fontSize: 16, color: '#4CAF50' },
  reactionOverlay: {
    position: 'absolute', top: '30%',
    alignSelf: 'center', zIndex: 100,
  },
  reactionEmoji: { fontSize: 80 },
  localVideo: {
    position: 'absolute', top: 60, right: 16,
    width: 100, height: 140, borderRadius: 12,
    backgroundColor: '#2A2A3E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#6C63FF',
  },
  localVideoText: { color: '#fff', fontSize: 14 },
  confidenceContainer: {
    position: 'absolute', top: 60, left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12, padding: 10, width: 140,
  },
  confidenceLabel: { color: '#fff', fontSize: 10, marginBottom: 6 },
  confidenceBar: {
    height: 6, backgroundColor: '#333',
    borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  confidenceFill: { height: '100%', borderRadius: 3 },
  confidencePercent: { fontSize: 12, fontWeight: 'bold' },
  contextPanel: {
    position: 'absolute', top: 210, left: 16,
    width: 220, backgroundColor: 'rgba(20,20,40,0.97)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#6C63FF',
    maxHeight: 280, zIndex: 50,
  },
  contextHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  contextTitle: { color: '#6C63FF', fontSize: 13, fontWeight: 'bold' },
  contextClose: { color: '#888', fontSize: 16 },
  contextItem: { color: '#ccc', fontSize: 12, marginBottom: 8 },
  contextTipBox: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
    marginBottom: 10,
  },
  contextTipText: { color: '#fff', fontSize: 12 },
  contextSubtitle: { color: '#888', fontSize: 11, marginBottom: 8 },
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicChip: {
    backgroundColor: '#1A1A2E', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  topicChipText: { color: '#fff', fontSize: 11 },
  tipContainer: {
    position: 'absolute', top: '20%',
    alignSelf: 'center', backgroundColor: 'rgba(108,99,255,0.9)',
    borderRadius: 12, padding: 12, maxWidth: '70%',
  },
  tipText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  reactionsRow: {
    position: 'absolute', bottom: 180,
    flexDirection: 'row', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30, padding: 8, gap: 4,
  },
  reactionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  reactionBtnText: { fontSize: 22 },
  controls: {
    position: 'absolute', bottom: 50,
    flexDirection: 'row', alignSelf: 'center',
    alignItems: 'center', gap: 20,
  },
  controlBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: '#6C63FF' },
  controlBtnText: { fontSize: 24 },
  controlLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  endCallBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#FF4444', alignItems: 'center',
    justifyContent: 'center', elevation: 10,
  },
  endCallText: { fontSize: 30 },
  heartPingBtn: {
    position: 'absolute', bottom: 180, right: 16,
    backgroundColor: 'rgba(255,100,100,0.2)',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF6464',
  },
  heartPingSent: { backgroundColor: 'rgba(255,100,100,0.5)' },
  heartPingText: { fontSize: 28 },
  heartPingLabel: { color: '#FF6464', fontSize: 10, marginTop: 4 },
  contextBtn: {
    position: 'absolute', bottom: 290, right: 16,
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#6C63FF',
  },
  contextBtnText: { fontSize: 24 },
  contextBtnLabel: { color: '#6C63FF', fontSize: 10, marginTop: 4 },

  translateBtn: {
    position: 'absolute', bottom: 370, right: 16,
    backgroundColor: 'rgba(0,210,211,0.2)',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#00D2D3',
  },
  translateBtnText: { fontSize: 24 },
  translateBtnLabel: { color: '#00D2D3', fontSize: 10, marginTop: 4 },
});
