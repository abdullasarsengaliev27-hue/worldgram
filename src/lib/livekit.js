const LIVEKIT_URL = 'wss://worldgram-jh4vlu2v.livekit.cloud';
const API_KEY = 'APIwuQdXBimMso6';
const API_SECRET = 'fzUeLqo4pMfm9FZeobnkTHDuHirsojgvHwoskocn9RxC';

// Генерация токена для звонка (симуляция — в продакшене делается на сервере)
export function generateToken(roomName, participantName) {
  // В реальном приложении токен генерируется на backend
  // Для теста используем простую структуру
  return `${API_KEY}:${roomName}:${participantName}`;
}

export { LIVEKIT_URL };
