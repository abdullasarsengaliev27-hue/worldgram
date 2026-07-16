import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Настройка как показывать уведомления
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Запросить разрешение и получить токен
export async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'worldgram',
    });

    return token.data;
  } catch (error) {
    console.log('Push token error:', error);
    return null;
  }
}

// Показать локальное уведомление
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // показать сразу
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
    `📹 Входящий звонок`,
    `${callerName} звонит тебе...`,
    { type: 'call', callerName }
  );
}

// Уведомление о достижении
export async function notifyAchievement(title, points) {
  await showLocalNotification(
    `🏆 Новое достижение!`,
    `${title} — +${points} очков`,
    { type: 'achievement' }
  );
}
