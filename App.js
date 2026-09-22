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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userIdRef.current = user.id;
        startPresence(user.id);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        userIdRef.current = session.user.id;
        startPresence(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        if (userIdRef.current) {
          stopPresence(userIdRef.current);
          userIdRef.current = null;
        }
      }
    });

    return () => {
      if (userIdRef.current) stopPresence(userIdRef.current);
      data?.subscription?.unsubscribe();
    };
  }, []);

  return <AppNavigator />;
}
