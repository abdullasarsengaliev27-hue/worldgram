import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/lib/notifications';
import { startPresence, stopPresence } from './src/lib/presence';
import { supabase } from './src/lib/supabase';

export default function App() {
  const userIdRef = useRef(null);

  useEffect(() => {
    registerForPushNotifications();

    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        startPresence(session.user.id);
      }
    });

    // Слушаем изменения авторизации
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        userIdRef.current = session.user.id;
        startPresence(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        if (userIdRef.current) {
          stopPresence(userIdRef.current);
          userIdRef.current = null;
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Токен обновился — сессия активна
        console.log('Сессия обновлена');
      }
    });

    return () => {
      if (userIdRef.current) stopPresence(userIdRef.current);
      data?.subscription?.unsubscribe();
    };
  }, []);

  return <AppNavigator />;
}
