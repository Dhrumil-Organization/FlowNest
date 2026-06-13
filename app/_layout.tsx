import { initAPI, initAPIForPrinterList, initAPIForSticker } from '@/common/API/dynamicAPI';
import { initDB } from '@/common/utils/chatDB';
import { initGlobalCacheDB } from '@/common/utils/sqliteCacheManager';
import { getFCMToken } from '@/hooks/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AccessDeniedScreen from '../common/access-denied';
import FullScreenLoader from '../components/FullScreenLoader';
import Snackbar, { SnackbarType } from '@/components/Snackbar';
import { registerSnackbar } from '@/common/utils/snackbar';


export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as SnackbarType,
    action: undefined as { text: string; onPress: () => void } | undefined,
    duration: 4000,
  });

  useEffect(() => {
    registerSnackbar((message, type = 'info', action, duration) => {
      setSnackbar({
        visible: true,
        message,
        type,
        action,
        duration: duration || 4000,
      });
    });
  }, []);

  initAPI();
  initAPIForPrinterList();
  initAPIForSticker();

  const initializeDatabases = async () => {
    try {
      await initDB(); // Initialize chat.db
      await initGlobalCacheDB(); // Initialize GlobalCache.db
      getFCMToken();
      console.log('✅ All databases initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing databases:', error);
      // Retry or show user-friendly error
    }
  };

  // Call this function when your app starts
  useEffect(() => {
    initializeDatabases();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // ❌ NOT LOGGED IN → FORCE LOGIN
    // if (isAllowed && isLoggedIn === false) {
    //   router.replace('/(auth)/login');
    // }
    if (isAllowed && isLoggedIn === false) {
      router.replace('/landing');
    }

    // ✅ LOGGED IN → FORCE HOMEx
    if (isAllowed && isLoggedIn === true) {
      router.replace('/(tabs)'); // 👈 Change from "index" to "(tabs)"
    }

  }, [isReady, isAllowed, isLoggedIn]);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log("🚀 App Start");

        const deviceId = Device.osInternalBuildId || "test-device";
        console.log("Device ID:", deviceId);
        await AsyncStorage.setItem('cache_deviceId', deviceId);

        // 🔥 1. DEVICE CHECK
        const res = await axios.post(
          "https://apig.tms-webapp.com/api/checkdevice",
          { deviceid: deviceId }
        );

        console.log("✅ checkdevice:", res.data);
        console.log("Monthly:", deviceId);

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

    // <AuthProvider>
    // <Stack screenOptions={{ headerShown: false }}>
    //   {isAllowed && isLoggedIn === true ? (
    //     <>
    //       <Stack.Screen name="(tabs)" />
    //       <Stack.Screen name="index" options={{ title: 'Home' }} />
    //       {/* 👇 Yahan sab routes define karna */}
    //       <Stack.Screen name="receivables-sudamo" options={{ title: 'Receivables' }} />
    //       <Stack.Screen name="credit-limit" options={{ title: 'Credit Limit' }} />
    //       <Stack.Screen name="receivables" options={{ title: 'Receivables' }} />
    //       <Stack.Screen name="collection" options={{ title: 'Collection' }} />
    //       <Stack.Screen name="upload" options={{ title: 'Upload' }} />
    //       {/* ... aur baki sab routes */}
    //     </>
    //   ) : (
    //     <Stack.Screen name="(auth)/login" />
    //   )}
    // </Stack>
    // <Stack
    //   screenOptions={{ headerShown: false }}
    //   initialRouteName="(tabs)" // Default route set karna
    // >
    //   {isAllowed && isLoggedIn === true ? (
    //     <>
    //       <Stack.Screen name="(tabs)" />
    //       <Stack.Screen name="index" options={{ title: 'Home' }} />
    //       <Stack.Screen name="receivables" options={{ title: 'Receivables' }} />
    //       <Stack.Screen name="receivables-sudamo" options={{ title: 'Receivables' }} />
    //       <Stack.Screen name="credit-limit" options={{ title: 'Credit Limit' }} />
    //       {/* ... aur baki sab routes */}
    //     </>
    //   ) : (
    //     <Stack.Screen name="(auth)/login" />
    //   )}
    // </Stack>
    // </AuthProvider>
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* {isAllowed && isLoggedIn === true ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
        </>
      ) : (
        <Stack.Screen name="(auth)/login" />
      )} */}
        {isAllowed && isLoggedIn === true ? (
          <>
            <Stack.Screen name="" />
          </>
        ) : (
          <>
            <Stack.Screen name="(all)" />
            <Stack.Screen name="(auth)/login" />
          </>
        )}
        {/* <Stack.Screen name="(all)" /> */}
      </Stack>
      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        action={snackbar.action}
        duration={snackbar.duration}
        onHide={() => setSnackbar((s) => ({ ...s, visible: false }))}
      />
    </>
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
