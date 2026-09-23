import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      shake();
      Alert.alert('Ошибка', 'Заполни все поля');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);
  
    if (error) {
      shake();
      if (error.message.includes('Email not confirmed')) {
        Alert.alert(
          '📧 Подтверди email',
          'Проверь почту и нажми на ссылку подтверждения',
          [
            { text: 'Отправить снова', onPress: async () => {
              await supabase.auth.resend({ type: 'signup', email: email.trim() });
              Alert.alert('✅', 'Письмо отправлено!');
            }},
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Ошибка', error.message);
      }
    } else {
      navigation.replace('Main');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Фон */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.inner}>
        {/* Лого */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.appName}>Worldgram</Text>
          <Text style={styles.subtitle}>Войди в аккаунт</Text>
        </View>

        {/* Форма */}
        <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18} color="#555"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.buttonText}>Входим...</Text>
            ) : (
              <>
                <Text style={styles.buttonText}>Войти</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>Нет аккаунта? </Text>
          <Text style={styles.registerLinkText}>Зарегистрироваться →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  bgCircle1: {
    position: 'absolute', width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(108,99,255,0.07)',
    top: -80, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(108,99,255,0.04)',
    bottom: 50, left: -60,
  },
  inner: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 75, height: 75, borderRadius: 37.5,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 20,
  },
  logoText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#555' },
  form: { width: '100%', gap: 12, marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerLink: { flexDirection: 'row', alignItems: 'center' },
  registerText: { color: '#555', fontSize: 14 },
  registerLinkText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});
