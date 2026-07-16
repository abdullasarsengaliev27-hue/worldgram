import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1', emoji: '🌍',
    title: 'Добро пожаловать!',
    desc: 'Worldgram — мессенджер нового поколения с AI и уникальными видеозвонками',
    color: '#6C63FF', icon: 'earth',
    bg: 'rgba(108,99,255,0.08)',
  },
  {
    id: '2', emoji: '📹',
    title: 'Preview Mode',
    desc: 'Собеседник видит твоё видео ещё ДО принятия звонка — уникальная функция!',
    color: '#FF6B6B', icon: 'videocam',
    bg: 'rgba(255,107,107,0.08)',
  },
  {
    id: '3', emoji: '🔥',
    title: 'Виртуальные жесты',
    desc: 'Отправляй реакции прямо во время звонка — огонь, сердечки, смех!',
    color: '#FF9F43', icon: 'flash',
    bg: 'rgba(255,159,67,0.08)',
  },
  {
    id: '4', emoji: '🌐',
    title: 'Voice Translate',
    desc: 'ИИ переводит голос в реальном времени — говори на казахском, слышат по-русски',
    color: '#00D2D3', icon: 'language',
    bg: 'rgba(0,210,211,0.08)',
  },
  {
    id: '5', emoji: '🏆',
    title: 'Геймификация',
    desc: 'Получай достижения, копи очки и становись лучшим собеседником!',
    color: '#FFC107', icon: 'trophy',
    bg: 'rgba(255,193,7,0.08)',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const currentSlide = SLIDES[currentIndex];

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.emojiContainer, {
        backgroundColor: item.bg,
        borderColor: item.color + '44',
      }]}>
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
        <View style={[styles.emojiGlow, { backgroundColor: item.color + '11' }]} />
      </View>
      <Text style={[styles.slideTitle, { color: item.color }]}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.desc}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.skipText}>Пропустить</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, {
                  width: dotWidth, opacity,
                  backgroundColor: SLIDES[i].color,
                }]}
              />
            );
          })}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: currentSlide.color }]}
          onPress={goNext}
          activeOpacity={0.8}
        >
          {currentIndex === SLIDES.length - 1 ? (
            <>
              <Text style={styles.nextBtnText}>Начать!</Text>
              <Ionicons name="rocket" size={20} color="#fff" />
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Далее</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.pageText}>
          {currentIndex + 1} / {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  bgCircle1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.05)',
    top: -100, right: -100,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.03)',
    bottom: 100, left: -80,
  },
  skipBtn: {
    position: 'absolute', top: 55, right: 20, zIndex: 10,
    backgroundColor: '#1A1A2E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  skipText: { color: '#555', fontSize: 14 },
  slide: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 40, paddingTop: 100,
  },
  emojiContainer: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40, borderWidth: 1, position: 'relative',
  },
  emojiGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
  },
  slideEmoji: { fontSize: 75 },
  slideTitle: {
    fontSize: 28, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 16, letterSpacing: 0.5,
  },
  slideDesc: {
    fontSize: 16, color: '#666',
    textAlign: 'center', lineHeight: 26,
  },
  bottom: {
    paddingBottom: 50, paddingHorizontal: 24,
    alignItems: 'center', gap: 16,
  },
  dotsContainer: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, borderRadius: 18,
    paddingHorizontal: 50, paddingVertical: 16,
    width: '100%', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pageText: { color: '#333', fontSize: 13 },
});
