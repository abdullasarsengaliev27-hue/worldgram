import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Запускаем анимацию
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, tension: 40, friction: 6, useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 800, useNativeDriver: true,
        }),
      ]),
      Animated.timing(textFade, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
    ]).start();

    // Проверяем сессию
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Ждём немного чтобы анимация успела запуститься
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Сессия есть — сразу на главный экран
        navigation.replace('Main');
      } else {
        // Нет сессии — на онбординг
        navigation.replace('Onboarding');
      }
    } catch (error) {
      // Ошибка — на онбординг
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoContainer, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }]}>
        <Animated.View style={[styles.logoRing, { opacity: glowAnim }]} />
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>W</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: textFade }]}>
        <Text style={styles.appName}>Worldgram</Text>
        <Text style={styles.tagline}>Общайся по-новому ✨</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, { opacity: textFade }]}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingFill, {
            width: glowAnim.interpolate({
              inputRange: [0, 1], outputRange: ['0%', '100%']
            })
          }]} />
        </View>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.06)',
    top: -50, right: -50,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.04)',
    bottom: 100, left: -50,
  },
  logoContainer: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 30,
  },
  logoRing: {
    position: 'absolute', width: 130, height: 130,
    borderRadius: 65, borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
  },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 30, elevation: 30,
  },
  logoText: { fontSize: 50, fontWeight: 'bold', color: '#fff' },
  textContainer: { alignItems: 'center', marginBottom: 60 },
  appName: {
    fontSize: 36, fontWeight: 'bold', color: '#fff',
    letterSpacing: 3, marginBottom: 8,
  },
  tagline: { fontSize: 15, color: '#6C63FF', letterSpacing: 1 },
  loadingContainer: {
    position: 'absolute', bottom: 80,
    width: width * 0.5, alignItems: 'center', gap: 10,
  },
  loadingBar: {
    width: '100%', height: 3,
    backgroundColor: '#1A1A2E', borderRadius: 2, overflow: 'hidden',
  },
  loadingFill: {
    height: '100%', backgroundColor: '#6C63FF', borderRadius: 2,
  },
  loadingText: { color: '#333', fontSize: 12 },
});
