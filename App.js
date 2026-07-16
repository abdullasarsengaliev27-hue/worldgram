import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/lib/notifications';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Регистрируем push уведомления
    registerForPushNotifications();

    // Слушаем входящие уведомления
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Уведомление получено:', notification);
      }
    );

    // Слушаем нажатия на уведомления
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data;
        console.log('Нажато уведомление:', data);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return <AppNavigator />;
}
