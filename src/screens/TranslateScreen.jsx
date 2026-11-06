import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Share,
  KeyboardAvoidingView, Platform, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

// Оставь пустым: тогда у каждого пользователя свой дневной лимит (по его IP).
// Если впишешь почту, лимит вырастет, но станет общим на всех.
const CONTACT_EMAIL = '';

const MAX_INPUT = 1000;
const MAX_CHUNK_BYTES = 450;

const LANGS = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺', voice: 'ru-RU' },
  { code: 'en', name: 'English', flag: '🇬🇧', voice: 'en-US' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿', voice: 'kk-KZ' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', voice: 'tr-TR' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', voice: 'uk-UA' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', voice: 'de-DE' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', voice: 'fr-FR' },
  { code: 'es', name: 'Español', flag: '🇪🇸', voice: 'es-ES' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', voice: 'it-IT' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', voice: 'pt-PT' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', voice: 'ar-SA' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳', voice: 'zh-CN' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', voice: 'ja-JP' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', voice: 'ko-KR' },
];

const findLang = (code) => LANGS.find(l => l.code === code) || LANGS[0];

// Размер текста в байтах (кириллица = 2 байта на символ)
const byteLength = (s) => encodeURIComponent(s).replace(/%[A-F\d]{2}/g, 'U').length;

// Режем длинный текст на куски, которые влезают в лимит сервиса
function splitIntoChunks(text) {
  const sentences = text.match(/[^.!?…\n]+[.!?…]*\s*/g) || [text];
  const chunks = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences) {
    if (byteLength(sentence) > MAX_CHUNK_BYTES) {
      flush();
      let part = '';
      for (const word of sentence.split(/\s+/)) {
        const candidate = part ? `${part} ${word}` : word;
        if (byteLength(candidate) > MAX_CHUNK_BYTES) {
          if (part) chunks.push(part.trim());
          part = word;
        } else {
          part = candidate;
        }
      }
      if (part) chunks.push(part.trim());
      continue;
    }
    if (byteLength(current + sentence) > MAX_CHUNK_BYTES) flush();
    current += sentence;
  }
  flush();
  return chunks;
}

async function translateChunk(text, from, to, signal) {
  const params = new URLSearchParams({ q: text, langpair: `${from}|${to}` });
  if (CONTACT_EMAIL) params.append('de', CONTACT_EMAIL);

  const res = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`,
    { signal }
  );
  if (!res.ok) throw new Error('network');

  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  const status = Number(data?.responseStatus);

  // Сервис иногда присылает предупреждение о лимите как обычный ответ
  if (/MYMEMORY WARNING|QUOTA/i.test(String(translated || '')) ||
      /QUOTA|LIMIT/i.test(String(data?.responseDetails || ''))) {
    throw new Error('quota');
  }
  if (status && status !== 200) throw new Error('api');
  if (!translated) throw new Error('api');
  return translated;
}

export default function TranslateScreen({ navigation }) {
  const [from, setFrom] = useState('ru');
  const [to, setTo] = useState('en');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [picker, setPicker] = useState(null); // 'from' | 'to' | null
  const [history, setHistory] = useState([]);

  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      Speech.stop();
      abortRef.current?.abort();
    };
  }, []);

  const doTranslate = async () => {
    const text = input.trim();
    if (!text) {
      Alert.alert('Пусто', 'Напиши или продиктуй текст для перевода');
      return;
    }
    if (from === to) {
      Alert.alert('Одинаковые языки', 'Выбери разные языки для перевода');
      return;
    }

    Speech.stop();
    setSpeaking(false);
    setLoading(true);
    setOutput('');

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const chunks = splitIntoChunks(text);
      const parts = [];
      for (const chunk of chunks) {
        parts.push(await translateChunk(chunk, from, to, controller.signal));
      }
      const result = parts.join(' ');
      setOutput(result);
      setHistory(prev => [
        { id: String(Date.now()), from, to, source: text, result },
        ...prev,
      ].slice(0, 8));
    } catch (e) {
      if (e?.name === 'AbortError') {
        Alert.alert('Долго отвечает', 'Сервис перевода не ответил. Попробуй ещё раз.');
      } else if (e?.message === 'quota') {
        Alert.alert(
          'Лимит исчерпан',
          'Дневной лимит бесплатного перевода закончился. Попробуй завтра.'
        );
      } else {
        Alert.alert(
          'Не удалось перевести',
          'Проверь интернет. Если языка нет в сервисе, выбери другой.'
        );
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    if (output) {
      setInput(output);
      setOutput('');
    }
  };

  const speak = async () => {
    if (!output) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(output, {
      language: findLang(to).voice,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        Alert.alert('Нет голоса', 'На телефоне нет голоса для этого языка');
      },
    });
  };

  const shareResult = async () => {
    if (!output) return;
    try {
      await Share.share({ message: output });
    } catch (e) { }
  };

  const clearAll = () => {
    Speech.stop();
    setSpeaking(false);
    setInput('');
    setOutput('');
  };

  const restore = (item) => {
    setFrom(item.from);
    setTo(item.to);
    setInput(item.source);
    setOutput(item.result);
  };

  const pickLanguage = (code) => {
    if (picker === 'from') {
      if (code === to) setTo(from);
      setFrom(code);
    } else {
      if (code === from) setFrom(to);
      setTo(code);
    }
    setPicker(null);
  };

  const fromLang = findLang(from);
  const toLang = findLang(to);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌐 Переводчик</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Выбор языков */}
        <View style={styles.langRow}>
          <TouchableOpacity style={styles.langBtn} onPress={() => setPicker('from')}>
            <Text style={styles.langFlag}>{fromLang.flag}</Text>
            <Text style={styles.langName} numberOfLines={1}>{fromLang.name}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.swapBtn} onPress={swap}>
            <Ionicons name="swap-horizontal" size={22} color="#6C63FF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.langBtn} onPress={() => setPicker('to')}>
            <Text style={styles.langFlag}>{toLang.flag}</Text>
            <Text style={styles.langName} numberOfLines={1}>{toLang.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Ввод */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Напиши или продиктуй текст..."
            placeholderTextColor="#555"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={MAX_INPUT}
          />
          <View style={styles.cardFooter}>
            <Text style={styles.counter}>{input.length}/{MAX_INPUT}</Text>
            {input.length > 0 && (
              <TouchableOpacity onPress={clearAll}>
                <Ionicons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.tip}>
          🎤 Для голоса нажми значок микрофона на клавиатуре iPhone
        </Text>

        <TouchableOpacity
          style={[styles.translateBtn, (loading || !input.trim()) && { opacity: 0.5 }]}
          onPress={doTranslate}
          disabled={loading || !input.trim()}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="language" size={20} color="#fff" />
                <Text style={styles.translateBtnText}>Перевести</Text>
              </>
          }
        </TouchableOpacity>

        {/* Результат */}
        {output ? (
          <View style={[styles.card, styles.resultCard]}>
            <Text style={styles.resultLabel}>{toLang.flag} {toLang.name}</Text>
            <Text style={styles.resultText} selectable>{output}</Text>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={speak}>
                <Ionicons
                  name={speaking ? 'stop-circle' : 'volume-high'}
                  size={20} color="#6C63FF"
                />
                <Text style={styles.actionText}>{speaking ? 'Стоп' : 'Озвучить'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={shareResult}>
                <Ionicons name="share-outline" size={20} color="#6C63FF" />
                <Text style={styles.actionText}>Поделиться</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* История */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Недавние переводы</Text>
            {history.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => restore(item)}
              >
                <Text style={styles.historyLangs}>
                  {findLang(item.from).flag} → {findLang(item.to).flag}
                </Text>
                <View style={styles.historyTexts}>
                  <Text style={styles.historySource} numberOfLines={1}>{item.source}</Text>
                  <Text style={styles.historyResult} numberOfLines={1}>{item.result}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Выбор языка */}
      <Modal visible={picker !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPicker(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {picker === 'from' ? 'Перевести с' : 'Перевести на'}
            </Text>
            <FlatList
              data={LANGS}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = (picker === 'from' ? from : to) === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.langOption, selected && styles.langOptionActive]}
                    onPress={() => pickLanguage(item.code)}
                  >
                    <Text style={styles.langOptionFlag}>{item.flag}</Text>
                    <Text style={[styles.langOptionName, selected && { color: '#fff' }]}>
                      {item.name}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111120', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  langFlag: { fontSize: 22 },
  langName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  swapBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111120', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  card: {
    backgroundColor: '#111120', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#1A1A2E',
  },
  input: {
    color: '#fff', fontSize: 17, minHeight: 110,
    textAlignVertical: 'top', lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 6,
  },
  counter: { color: '#555', fontSize: 11 },
  tip: { color: '#555', fontSize: 12, marginTop: 10, marginBottom: 14 },
  translateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#6C63FF', borderRadius: 14, padding: 16,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  translateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { marginTop: 16, borderColor: '#6C63FF55' },
  resultLabel: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  resultText: { color: '#fff', fontSize: 18, lineHeight: 26 },
  resultActions: {
    flexDirection: 'row', gap: 10, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(108,99,255,0.12)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  actionText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  historySection: { marginTop: 24 },
  historyTitle: {
    color: '#555', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111120', borderRadius: 14, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#1A1A2E',
  },
  historyLangs: { fontSize: 16 },
  historyTexts: { flex: 1 },
  historySource: { color: '#888', fontSize: 13, marginBottom: 2 },
  historyResult: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111120', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', marginBottom: 14,
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 6,
    backgroundColor: '#0D0D1A', borderWidth: 1, borderColor: '#1A1A2E',
  },
  langOptionActive: { borderColor: '#6C63FF', backgroundColor: '#1A1A3E' },
  langOptionFlag: { fontSize: 22 },
  langOptionName: { flex: 1, color: '#aaa', fontSize: 15 },
});
