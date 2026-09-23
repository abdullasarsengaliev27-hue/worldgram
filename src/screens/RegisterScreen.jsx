import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Ошибка', 'Заполни все поля');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль минимум 6 символов');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Ошибка', 'Введи правильный email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } }
    });
    setLoading(false);

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      setEmailSent(true);
    }
  };

  // Экран подтверждения email
  if (emailSent) {
    return (
      <View style={styles.confirmContainer}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        <View style={styles.confirmCard}>
          <Text style={styles.confirmEmoji}>📧</Text>
          <Text style={styles.confirmTitle}>Проверь почту!</Text>
          <Text style={styles.confirmText}>
            Мы отправили письмо на{'\n'}
            <Text style={styles.confirmEmail}>{email}</Text>
          </Text>
          <Text style={styles.confirmSubText}>
            Нажми на ссылку в письме чтобы подтвердить аккаунт и войти в Worldgram
          </Text>

          <View style={styles.stepsContainer}>
            {[
              { icon: '📬', text: 'Открой свою почту' },
              { icon: '🔗', text: 'Найди письмо от Worldgram' },
              { icon: '✅', text: 'Нажми на ссылку подтверждения' },
            ].map((step, i) => (
              <View key={i} style={styles.stepItem}>
                <Text style={styles.stepEmoji}>{step.icon}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.replace('Login')}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.loginBtnText}>Войти после подтверждения</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={async () => {
              const { error } = await supabase.auth.resend({
                type: 'signup', email: email.trim()
              });
              if (!error) Alert.alert('✅', 'Письмо отправлено повторно!');
            }}
          >
            <Text style={styles.resendText}>Не получил письмо? Отправить снова</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#6C63FF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.subtitle}>Присоединяйся к Worldgram 🌍</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#555" />
            <TextInput
              style={styles.input}
              placeholder="Твоё имя"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#555" />
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
            <Ionicons name="lock-closed-outline" size={18} color="#555" />
            <TextInput
              style={styles.input}
              placeholder="Пароль (мин. 6 символов)"
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

          {/* Правила */}
          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>📋 При регистрации ты соглашаешься:</Text>
            {[
              '✅ Использовать настоящие данные',
              '✅ Не создавать фейковые аккаунты',
              '✅ Соблюдать правила сообщества',
            ].map((rule, i) => (
              <Text key={i} style={styles.ruleItem}>{rule}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.buttonText}>Зарегистрироваться</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.termsRow}>
            <Text style={styles.termsText}>Регистрируясь, ты принимаешь </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.termsLink}>Условия</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}> и </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.termsLink}>Политику</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>Уже есть аккаунт? </Text>
          <Text style={styles.loginLinkText}>Войти →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  bgCircle1: {
    position: 'absolute', width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(108,99,255,0.07)',
    top: -80, left: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(108,99,255,0.04)',
    bottom: 50, right: -60,
  },
  inner: { flexGrow: 1, padding: 24, paddingTop: 60 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#111120', alignItems: 'center',
    justifyContent: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  titleContainer: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#555' },
  form: { gap: 12, marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#1A1A2E', gap: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  rulesCard: {
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
  },
  rulesTitle: { color: '#6C63FF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  ruleItem: { color: '#888', fontSize: 13, lineHeight: 22 },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
    marginTop: 4,
  },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  termsRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', justifyContent: 'center',
  },
  termsText: { color: '#555', fontSize: 12 },
  termsLink: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },
  loginLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  loginText: { color: '#555', fontSize: 14 },
  loginLinkText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

  // Confirm экран
  confirmContainer: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: '#111120', borderRadius: 24,
    padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: '#1A1A2E',
    width: '100%',
  },
  confirmEmoji: { fontSize: 60, marginBottom: 16 },
  confirmTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  confirmText: {
    fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 8,
  },
  confirmEmail: { color: '#6C63FF', fontWeight: 'bold' },
  confirmSubText: {
    fontSize: 13, color: '#555', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  stepsContainer: { width: '100%', marginBottom: 24, gap: 12 },
  stepItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0D0D1A', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  stepEmoji: { fontSize: 22 },
  stepText: { color: '#ccc', fontSize: 14 },
  loginBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', marginBottom: 12,
  },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  resendBtn: { padding: 10 },
  resendText: { color: '#6C63FF', fontSize: 13 },
});
