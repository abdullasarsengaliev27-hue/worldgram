import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Регистрация и сохранение токена в Supabase
export async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'c998e22e-a15e-4367-81ac-f4258af82aad',
    });

    // Сохраняем токен в профиль
    const { data: { user } } = await supabase.auth.getUser();
    if (user && token.data) {
      await supabase.from('profiles').update({
        push_token: token.data,
      }).eq('id', user.id);
    }

    return token.data;
  } catch (error) {
    console.log('Push token error:', error);
    return null;
  }
}

// Показать локальное уведомление
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}

// Уведомление о новом сообщении
export async function notifyNewMessage(senderName, message) {
  const preview = message.startsWith('[IMAGE]')
    ? '📸 Фото'
    : message.length > 50
    ? message.substring(0, 50) + '...'
    : message;

  await showLocalNotification(
    `💬 ${senderName}`,
    preview,
    { type: 'message', senderName }
  );
}

// Уведомление о звонке
export async function notifyIncomingCall(callerName) {
  await showLocalNotification(
    '📹 Входящий звонок',
    `${callerName} звонит тебе...`,
    { type: 'call', callerName }
  );
}

// Уведомление о достижении
export async function notifyAchievement(title, points) {
  await showLocalNotification(
    '🏆 Новое достижение!',
    `${title} — +${points} очков`,
    { type: 'achievement' }
  );
}

// Отправить push уведомление другому пользователю через Expo
export async function sendPushToUser(receiverId, title, body, data = {}) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', receiverId)
      .single();

    if (!profile?.push_token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data,
        sound: 'default',
        badge: 1,
      }),
    });
  } catch (error) {
    console.log('Push send error:', error);
  }
}
