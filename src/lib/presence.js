import { supabase } from './supabase';
import { AppState } from 'react-native';

let appStateSubscription = null;
let heartbeatInterval = null;

export async function setOnline(userId) {
  if (!userId) return;
  try {
    await supabase.from('profiles').update({
      is_online: true,
      last_seen: new Date().toISOString(),
    }).eq('id', userId);
  } catch (e) { }
}

export async function setOffline(userId) {
  if (!userId) return;
  try {
    await supabase.from('profiles').update({
      is_online: false,
      last_seen: new Date().toISOString(),
    }).eq('id', userId);
  } catch (e) { }
}

export function startPresence(userId) {
  if (!userId) return;

  // Сразу онлайн
  setOnline(userId);

  // Heartbeat каждые 20 секунд
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => setOnline(userId), 20000);

  // Следим за состоянием приложения
  if (appStateSubscription) appStateSubscription.remove();
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      setOnline(userId);
    } else {
      setOffline(userId);
    }
  });
}

export function stopPresence(userId) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (userId) setOffline(userId);
}

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
