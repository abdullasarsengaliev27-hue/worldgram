import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'kz', name: 'Казахский', flag: '🇰🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'Английский', flag: '🇬🇧' },
  { code: 'tr', name: 'Турецкий', flag: '🇹🇷' },
  { code: 'zh', name: 'Китайский', flag: '🇨🇳' },
  { code: 'ar', name: 'Арабский', flag: '🇸🇦' },
];

const DEMO_TRANSLATIONS = [
  {
    original: 'Сәлеметсіз бе, қалыңыз қалай?',
    translated: 'Здравствуйте, как вы поживаете?',
    from: '🇰🇿', to: '🇷🇺', time: '0.3с'
  },
  {
    original: 'Бүгін ауа райы өте жақсы',
    translated: 'Сегодня погода очень хорошая',
    from: '🇰🇿', to: '🇷🇺', time: '0.2с'
  },
  {
    original: 'Кездесуге қуаныштымын',
    translated: 'Рад встрече с вами',
    from: '🇰🇿', to: '🇷🇺', time: '0.4с'
  },
];

export default function TranslateScreen({ navigation }) {
  const [fromLang, setFromLang] = useState(LANGUAGES[0]);
  const [toLang, setToLang] = useState(LANGUAGES[1]);
  const [isListening, setIsListening] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      stopPulse();
    } else {
      setIsListening(true);
      startPulse();

      // Симуляция AI перевода
      const demo = DEMO_TRANSLATIONS[demoIndex % DEMO_TRANSLATIONS.length];
      setTimeout(() => {
        setTranslations(prev => [{ ...demo, id: Date.now() }, ...prev]);
        setDemoIndex(i => i + 1);
        setIsListening(false);
        stopPulse();
      }, 2500);
    }
  };

  const swapLanguages = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
  };

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
        <Text style={styles.headerTitle}>🌐 Voice Translate</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Language Picker */}
        <View style={styles.langContainer}>
          {/* From */}
          <TouchableOpacity
            style={styles.langCard}
            onPress={() => { setShowFromPicker(!showFromPicker); setShowToPicker(false); }}
          >
            <Text style={styles.langFlag}>{fromLang.flag}</Text>
            <Text style={styles.langName}>{fromLang.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#555" />
          </TouchableOpacity>

          {/* Swap */}
          <TouchableOpacity style={styles.swapBtn} onPress={swapLanguages}>
            <Ionicons name="swap-horizontal" size={22} color="#6C63FF" />
          </TouchableOpacity>

          {/* To */}
          <TouchableOpacity
            style={styles.langCard}
            onPress={() => { setShowToPicker(!showToPicker); setShowFromPicker(false); }}
          >
            <Text style={styles.langFlag}>{toLang.flag}</Text>
            <Text style={styles.langName}>{toLang.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#555" />
          </TouchableOpacity>
        </View>

        {/* From Picker */}
        {showFromPicker && (
          <View style={styles.picker}>
            {LANGUAGES.filter(l => l.code !== toLang.code).map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={styles.pickerItem}
                onPress={() => { setFromLang(lang); setShowFromPicker(false); }}
              >
                <Text style={styles.pickerFlag}>{lang.flag}</Text>
                <Text style={styles.pickerName}>{lang.name}</Text>
                {fromLang.code === lang.code && (
                  <Ionicons name="checkmark" size={18} color="#6C63FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* To Picker */}
        {showToPicker && (
          <View style={styles.picker}>
            {LANGUAGES.filter(l => l.code !== fromLang.code).map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={styles.pickerItem}
                onPress={() => { setToLang(lang); setShowToPicker(false); }}
              >
                <Text style={styles.pickerFlag}>{lang.flag}</Text>
                <Text style={styles.pickerName}>{lang.name}</Text>
                {toLang.code === lang.code && (
                  <Ionicons name="checkmark" size={18} color="#6C63FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mic Button */}
        <View style={styles.micContainer}>
          <Animated.View style={[styles.micPulse, {
            transform: [{ scale: pulseAnim }],
            opacity: isListening ? 0.3 : 0,
          }]} />
          <Animated.View style={[styles.micPulse2, {
            transform: [{ scale: pulseAnim }],
            opacity: isListening ? 0.15 : 0,
          }]} />

          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={toggleListening}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
              size={40}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.micStatus}>
            {isListening
              ? `Слушаю... Говори на ${fromLang.name}`
              : 'Нажми и говори'
            }
          </Text>

          {isListening && (
            <View style={styles.waveContainer}>
              {[...Array(5)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[styles.wave, {
                    height: Math.random() * 30 + 10,
                    backgroundColor: '#6C63FF',
                  }]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color="#6C63FF" />
          <Text style={styles.infoText}>
            ИИ переводит твою речь мгновенно. Оригинальный голос приглушается, поверх звучит перевод.
          </Text>
        </View>

        {/* История переводов */}
        {translations.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>История переводов</Text>
              <TouchableOpacity onPress={() => setTranslations([])}>
                <Text style={styles.clearBtn}>Очистить</Text>
              </TouchableOpacity>
            </View>

            {translations.map((t) => (
              <View key={t.id} style={styles.translationCard}>
                <View style={styles.translationHeader}>
                  <View style={styles.langBadge}>
                    <Text>{t.from}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#555" />
                    <Text>{t.to}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Ionicons name="flash" size={12} color="#4CAF50" />
                    <Text style={styles.timeText}>{t.time}</Text>
                  </View>
                </View>

                <View style={styles.translationBody}>
                  <View style={styles.originalBox}>
                    <Text style={styles.originalLabel}>Оригинал</Text>
                    <Text style={styles.originalText}>{t.original}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.translatedBox}>
                    <Text style={styles.translatedLabel}>Перевод</Text>
                    <Text style={styles.translatedText}>{t.translated}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Demo hint */}
        {translations.length === 0 && (
          <View style={styles.demoHint}>
            <Text style={styles.demoEmoji}>👆</Text>
            <Text style={styles.demoText}>
              Нажми на микрофон и скажи что-нибудь на {fromLang.name}!
            </Text>
          </View>
        )}

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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1 },
  aiBadge: {
    backgroundColor: '#6C63FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  aiBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  langContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, gap: 10,
  },
  langCard: {
    flex: 1, backgroundColor: '#111120',
    borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  langFlag: { fontSize: 32 },
  langName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  swapBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A2E', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#6C63FF',
  },
  picker: {
    marginHorizontal: 16, backgroundColor: '#111120',
    borderRadius: 16, borderWidth: 1, borderColor: '#1A1A2E',
    marginBottom: 8, overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  pickerFlag: { fontSize: 24 },
  pickerName: { flex: 1, color: '#fff', fontSize: 15 },
  micContainer: {
    alignItems: 'center', justifyContent: 'center',
    padding: 40, position: 'relative',
  },
  micPulse: {
    position: 'absolute', width: 140, height: 140,
    borderRadius: 70, backgroundColor: '#6C63FF',
  },
  micPulse2: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, backgroundColor: '#6C63FF',
  },
  micBtn: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 25, elevation: 25,
  },
  micBtnActive: { backgroundColor: '#FF4444' },
  micStatus: { color: '#888', fontSize: 15, textAlign: 'center' },
  waveContainer: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginTop: 16, height: 40,
  },
  wave: { width: 4, borderRadius: 2, minHeight: 10 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 16, backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
    marginBottom: 16,
  },
  infoText: { flex: 1, color: '#888', fontSize: 13, lineHeight: 20 },
  historyContainer: { marginHorizontal: 16 },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  clearBtn: { color: '#FF4444', fontSize: 13 },
  translationCard: {
    backgroundColor: '#111120', borderRadius: 18,
    borderWidth: 1, borderColor: '#1A1A2E', marginBottom: 12,
    overflow: 'hidden',
  },
  translationHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  langBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  timeText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  translationBody: { padding: 14 },
  originalBox: { marginBottom: 10 },
  originalLabel: { color: '#555', fontSize: 11, marginBottom: 4 },
  originalText: { color: '#aaa', fontSize: 15, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#1A1A2E', marginBottom: 10 },
  translatedBox: {},
  translatedLabel: { color: '#6C63FF', fontSize: 11, marginBottom: 4 },
  translatedText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  demoHint: {
    alignItems: 'center', padding: 30, gap: 12,
  },
  demoEmoji: { fontSize: 40 },
  demoText: { color: '#555', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
