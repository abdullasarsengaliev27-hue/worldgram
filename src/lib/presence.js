import { supabase } from './supabase';
import { AppState } from 'react-native';

let presenceInterval = null;
let currentUserId = null;

// Обновить статус онлайн
export async function setOnline(userId) {
  currentUserId = userId;
  await supabase.from('profiles').update({
    is_online: true,
    last_seen: new Date().toISOString(),
  }).eq('id', userId);
}

// Обновить статус оффлайн
export async function setOffline(userId) {
  await supabase.from('profiles').update({
    is_online: false,
    last_seen: new Date().toISOString(),
  }).eq('id', userId);
}

// Запустить heartbeat — каждые 30 секунд обновляем статус
export function startPresence(userId) {
  currentUserId = userId;
  setOnline(userId);

  presenceInterval = setInterval(() => {
    setOnline(userId);
  }, 30000);

  // Следим за состоянием приложения
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      setOnline(userId);
    } else if (state === 'background' || state === 'inactive') {
      setOffline(userId);
    }
  });
}

// Остановить heartbeat
export function stopPresence(userId) {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
  if (userId) setOffline(userId);
}

// Форматировать время последнего визита
export function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Давно';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Только что';
  if (mins < 60) return `${mins} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  return `${days} дн назад`;
}
