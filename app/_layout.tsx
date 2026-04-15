import { handleNotification } from '@/hooks/notificationHandler';
import { getFCMToken } from '@/hooks/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AccessDeniedScreen from '../common/access-denied';
import FullScreenLoader from '../components/FullScreenLoader';
import { AuthProvider } from '../hooks/AuthContext';


export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // 🔥 Get FCM token
    getFCMToken();

    // 🔥 Setup notification handlers
    setupNotificationHandlers(handleNotification);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // ❌ NOT LOGGED IN → FORCE LOGIN
    if (isAllowed && isLoggedIn === false) {
      router.replace('/(auth)/login');
    }

    // ✅ LOGGED IN → FORCE HOME
    if (isAllowed && isLoggedIn === true) {
      router.replace('/');
    }

  }, [isReady, isAllowed, isLoggedIn]);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log("🚀 App Start");

        const deviceId = Device.osInternalBuildId || "test-device";

        // 🔥 1. DEVICE CHECK
        const res = await axios.post(
          "https://apig.tms-webapp.com/api/checkdevice",
          { deviceid: deviceId }
        );

        console.log("✅ checkdevice:", res.data);

        // ❌ ACCESS DENIED
        if (Number(res.data) !== 1) {
          setIsAllowed(false);
          return;
        }

        // ✅ ALLOWED
        setIsAllowed(true);

        // 🔥 2. TOKEN CHECK
        const token = await AsyncStorage.getItem('access_token');

        console.log("🔑 Token:", token);

        setIsLoggedIn(!!token);

      } catch (err) {
        console.log("❌ INIT ERROR:", err);
      } finally {
        setIsReady(true);
      }
    };

    initApp();
  }, []);

  // 🔥 LOADER
  if (!isReady) {
    return <FullScreenLoader message="Verifying..." />;
  }

  // 🔥 ACCESS DENIED
  if (isAllowed === false) {
    return <AccessDeniedScreen fromInit={true} />;
  }

  // 🔥 WAIT FOR TOKEN CHECK
  if (isLoggedIn === null) {
    return <FullScreenLoader message="Loading..." />;
  }

  console.log("isLoggedIn", isLoggedIn);

  // 🔥 FINAL ROUTING
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {isAllowed && isLoggedIn === true ? (

          <Stack.Screen name="(tabs)" />

        ) : (
          <Stack.Screen name="(auth)/login" />
        )}
      </Stack>
    </AuthProvider>
  );
}

function setupNotificationHandlers(handleNotification) {
  // 🔔 Foreground
  Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Foreground Notification:', notification);
  });

  // 👆 Click / Tap
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('👉 Notification Click:', data);

    handleNotification(data);
  });
}
