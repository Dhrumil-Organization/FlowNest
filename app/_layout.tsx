// import { initAPI, initAPIForPrinterList, initAPIForSticker } from '@/common/API/dynamicAPI';
// import { initDB } from '@/common/utils/chatDB';
// import { registerSnackbar } from '@/common/utils/snackbar';
// import { initGlobalCacheDB } from '@/common/utils/sqliteCacheManager';
// import { initDb } from '@/components/Event/db';
// import Snackbar, { SnackbarType } from '@/components/Snackbar';
// import { SalesOrderProvider } from '@/components/YarnSalesOrder/SalesOrderContext';
// import { getFCMToken } from '@/hooks/NotificationService';
// import { AppCoreProvider } from '@/src/core/AppCoreProvider';
// import { MainTabs } from '@/src/navigation/MainTabs';
// import RoleLoginScreen from '@/src/screens/auth/RoleLoginScreen';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import AsyncStorage from '@/common/utils/compatibleStorage';
// import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';
// import { Stack, useRouter } from 'expo-router';
// import { useEffect, useState } from 'react';
// import { StyleSheet, View } from 'react-native';
// import AccessDeniedScreen from '../common/access-denied';
// import FullScreenLoader from '../components/FullScreenLoader';
// import AppAlertHost from '@/components/AppAlertHost';
// import { getLoginSource, isWeb } from '@/src/platform/runtime';


// export default function RootLayout() {
//   const router = useRouter();
//   const [isReady, setIsReady] = useState(false);
//   const [lookupPlatform, setLookupPlatform] = useState<null>(null);
//   const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
//   const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
//   const [snackbar, setSnackbar] = useState({
//     visible: false,
//     message: '',
//     type: 'info' as SnackbarType,
//     action: undefined as { text: string; onPress: () => void } | undefined,
//     duration: 4000,
//   });
//   const [token, setToken] = useState('');
//   const [username, setUsername] = useState('');
//   const [getUsertype, setUsertype] = useState('');
//   const [online, setOnline] = useState(true);
//   // 
//   const token123 = useAppSessionStore((s) => s.token);
//   useEffect(() => {
//     const load = async () => {
//       const t = await AsyncStorage.getItem('access_token');
//       const u = await AsyncStorage.getItem('user_details');
//       const p = await AsyncStorage.getItem('user_prptype');
//       const l = await AsyncStorage.getItem('LOOKUP_PLATFORM');

//       setToken(t || '');
//       setUsername(u || 'User');
//       setUsertype(p || '')
//       setLookupPlatform(l || '')
//     };
//     load();
//   }, []);

//   useEffect(() => {
//     registerSnackbar((message, type = 'info', action, duration) => {
//       setSnackbar({
//         visible: true,
//         message,
//         type,
//         action,
//         duration: duration || 4000,
//       });
//     });
//   }, []);

//   initAPI();
//   initAPIForPrinterList();
//   initAPIForSticker();



//   const initializeDatabases = async () => {
//     try {
//       await initDB(); // Initialize chat.db
//       await initGlobalCacheDB(); // Initialize GlobalCache.db
//       getFCMToken();
//       console.log('✅ All databases initialized successfully');
//     } catch (error) {
//       console.error('❌ Error initializing databases:', error);
//       // Retry or show user-friendly error
//     }
//   };

//   // Call this function when your app starts
//   useEffect(() => {
//     initializeDatabases();
//   }, []);

//   const initializeDatabasesEvent = async () => {
//     try {
//       if (token && getUsertype) {
//         await initDb(token, getUsertype); // Initialize chat.db

//         console.log('✅ All event databases initialized successfully');
//       }
//     } catch (error) {
//       console.error('❌ Error initializing databases:', error);
//       // Retry or show user-friendly error
//     }
//   };

//   // Call this function when your app starts
//   useEffect(() => {
//     if (!token) return;
//     if (!getUsertype) return;
//     initializeDatabasesEvent(token, getUsertype);
//   }, [token, getUsertype]);


//   useEffect(() => {
//     if (!isReady) return;

//     // ❌ NOT LOGGED IN → FORCE LOGIN
//     // if (isAllowed && isLoggedIn === false) {
//     //   router.replace('/(auth)/login');
//     // }
//     if (isAllowed && isLoggedIn === false) {
//       router.replace('/landing');
//     }

//     // ✅ LOGGED IN → FORCE HOMEx
//     if (isAllowed && isLoggedIn === true) {
//       router.replace('/(tabs)'); // 👈 Change from "index" to "(tabs)"
//     }

//   }, [isReady, isAllowed, isLoggedIn]);

//   useEffect(() => {
//     const initApp = async () => {
//       try {
//         console.log("🚀 App Start");

//         const deviceId = Device.osInternalBuildId || "test-device";
//         console.log("Device ID:", deviceId);
//         await AsyncStorage.setItem('cache_deviceId', deviceId);

//         // 🔥 1. DEVICE CHECK
//         // const res = await axios.post(
//         //   "https://apig.tms-webapp.com/api/checkdevice",
//         //   { deviceid: deviceId }
//         // );

//         // console.log("✅ checkdevice:", res.data);
//         console.log("Monthly:", deviceId);

//         // ❌ ACCESS DENIED
//         // if (Number(res.data) !== 1) {
//         //   setIsAllowed(false);
//         //   return;
//         // }

//         // ✅ ALLOWED
//         setIsAllowed(true);

//         // 🔥 2. TOKEN CHECK
//         const token = await AsyncStorage.getItem('access_token');

//         console.log("🔑 Token:", token);

//         setIsLoggedIn(!!token);

//       } catch (err) {
//         console.log("❌ INIT ERROR:", err);
//       } finally {
//         setIsReady(true);
//       }
//     };

//     initApp();
//   }, []);

//   // 🔥 LOADER
//   if (!isReady) {
//     return <FullScreenLoader message="Verifying..." />;
//   }

//   // 🔥 ACCESS DENIED
//   if (isAllowed === false) {
//     return <AccessDeniedScreen fromInit={true} />;
//   }

//   // 🔥 WAIT FOR TOKEN CHECK
//   if (isLoggedIn === null) {
//     return <FullScreenLoader message="Loading..." />;
//   }

//   console.log("isLoggedIn", isLoggedIn);

//   console.log("isAllowed", isAllowed);
//   console.log("lookupPlatform 1234", lookupPlatform, token123);


//   // 🔥 FINAL ROUTING
//   return (
//     <>
//     <AppCoreProvider>
//       <SalesOrderProvider>
//         <View style={styles.rootContainer}>
//           <Stack screenOptions={{ headerShown: false }}> 
//             {/* {isAllowed && isLoggedIn === true ? (
//         <>
//           <Stack.Screen name="(tabs)" />
//           <Stack.Screen name="index" />
//         </>
//       ) : (
//         <Stack.Screen name="(auth)/login" />
//       )} */}
//             {isAllowed && isLoggedIn === true ? (
//               <>
//                 {isAllowed && isLoggedIn === true && lookupPlatform !== 'NEW' ? (
//                   <Stack.Screen name="" />
//                 ) : (
//                   <>
//                     {token123 ? (
//                       <AppCoreProvider>
//                         <Stack.Screen name="Main" component={MainTabs} />
//                       </AppCoreProvider>
//                     ) : (
//                       <AppCoreProvider>
//                         <Stack.Screen name="RoleLogin" component={RoleLoginScreen} />
//                       </AppCoreProvider>
//                     )
//                     }
//                     {/* <AppCoreProvider>
//                     <Stack.Screen
//                       name="Main"
//                       component={MainTabs}
//                     />
//                   </AppCoreProvider> */}
//                   </>
//                 )}
//               </>
//             ) : (
//               <>
//                 <Stack.Screen name="(all)" />
//                 <Stack.Screen name="(auth)/login" />
//               </>
//             )}
//             {/* <Stack.Screen name="(all)" /> */}
//           </Stack>
//           <View style={styles.snackbarHost} pointerEvents="box-none">
//             <Snackbar
//               visible={snackbar.visible}
//               message={snackbar.message}
//               type={snackbar.type}
//               action={snackbar.action}
//               duration={snackbar.duration}
//               onHide={() => setSnackbar((s) => ({ ...s, visible: false }))}
//             />
//           </View>
//         </View>
//       </SalesOrderProvider>
//         </AppCoreProvider>
//     </>
//   );
// }

// function setup s(handleNotification) {
//   // 🔔 Foreground
//   Notifications.addNotificationReceivedListener(notification => {
//     console.log('📩 Foreground Notification:', notification);
//   });

//   // 👆 Click / Tap
//   Notifications.addNotificationResponseReceivedListener(response => {
//     const data = response.notification.request.content.data;
//     console.log('👉 Notification Click:', data);

//     handleNotification(data);
//   });
// }

// const styles = StyleSheet.create({
//   rootContainer: {
//     flex: 1,
//   },
//   // ✅ Container jo pure screen cover karega, sirf last mein rendered
//   snackbarHost: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     // ❌ NO background color, NO zIndex
//   }
// });

import { initAPI, initAPIForPrinterList, initAPIForSticker } from '@/common/API/dynamicAPI';
import { NotificationProvider } from '@/common/context/NotificationContext';
import { initDB } from '@/common/utils/chatDB';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { registerSnackbar } from '@/common/utils/snackbar';
import { initGlobalCacheDB } from '@/common/utils/sqliteCacheManager';
import AppAlertHost from '@/components/AppAlertHost';
import { initDb } from '@/components/Event/db';
import Snackbar, { SnackbarType } from '@/components/Snackbar';
import { SalesOrderProvider } from '@/components/YarnSalesOrder/SalesOrderContext';
import { getFCMToken } from '@/hooks/NotificationService';
import { initNewErpAPI } from '@/src/api/client';
import { AppCoreProvider } from '@/src/core/AppCoreProvider';
import AppUpdateGate from '@/src/core/appUpdate/AppUpdateGate';
import { getLoginSource, isWeb } from '@/src/platform/runtime';
import { isEmbeddedWeb } from '@/src/core/embeddedAuth';
import * as Device from 'expo-device';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AccessDeniedScreen from '../common/access-denied';
import FullScreenLoader from '../components/FullScreenLoader';

export default function RootLayout() {
  const router = useRouter();
  const embedded = isEmbeddedWeb();
  const [isReady, setIsReady] = useState(false);
  const [lookupPlatform, setLookupPlatform] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as SnackbarType,
    action: undefined as { text: string; onPress: () => void } | undefined,
    duration: 4000,
  });
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [getUsertype, setUsertype] = useState('');
  const [online, setOnline] = useState(true);

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

  // initAPI();
  // initAPIForPrinterList();
  // initAPIForSticker();
  useEffect(() => {
    void initAPI();
    void initAPIForPrinterList();
    void initAPIForSticker();
    void initNewErpAPI();
  }, []);

  const initializeDatabases = async () => {
    try {
      await initDB();
      await initGlobalCacheDB();
      getFCMToken();
      console.log('✅ All databases initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing databases:', error);
    }
  };

  // useEffect(() => {
  //   initializeDatabases();
  // }, []);
  useEffect(() => {
    if (isWeb()) {
      return;
    }

    initializeDatabases();
  }, []);

  const initializeDatabasesEvent = async () => {
    try {
      if (token && getUsertype) {
        await initDb(token, getUsertype);
        console.log('✅ All event databases initialized successfully');
      }
    } catch (error) {
      console.error('❌ Error initializing databases:', error);
    }
  };

  // useEffect(() => {
  //   if (!token) return;
  //   if (!getUsertype) return;
  //   initializeDatabasesEvent();
  // }, [token, getUsertype]);

  useEffect(() => {
    if (isWeb()) return;

    if (!token) return;
    if (!getUsertype) return;

    initializeDatabasesEvent();
  }, [token, getUsertype]);

  // Top-level authentication boundary. Platform selection never grants access
  // to a dashboard. Only a stored authenticated session can enter a protected
  // Legacy/New ERP route on app bootstrap.
  useEffect(() => {
    if (embedded) return;
    if (!isReady || !isAllowed || isLoggedIn === null) return;

    if (!isLoggedIn) {
      router.replace('/(all)/landing');
      return;
    }

    if (lookupPlatform === 'NEW') {
      router.replace('/new');
      return;
    }

    router.replace('/(tabs)');
  }, [embedded, isReady, isAllowed, isLoggedIn, lookupPlatform, router]);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 App Start');
        await AsyncStorage.setItem('LOGIN_SOURCE', getLoginSource());

        const deviceId = Device.osInternalBuildId || 'test-device';
        await AsyncStorage.setItem('cache_deviceId', deviceId);

        setIsAllowed(true);

        const storedToken = await AsyncStorage.getItem('access_token');
        const storedUser = await AsyncStorage.getItem('user_details');
        const storedUserType = await AsyncStorage.getItem('user_prptype');
        const storedPlatform = await AsyncStorage.getItem('LOOKUP_PLATFORM');

        setToken(storedToken || '');
        setUsername(storedUser || 'User');
        setUsertype(storedUserType || '');
        setLookupPlatform(storedPlatform || '');
        setIsLoggedIn(Boolean(storedToken));

        // Keep both API families synchronized with the persisted property before
        // any authenticated screen starts issuing requests.
        await Promise.all([
          initAPI(),
          initAPIForPrinterList(),
          initAPIForSticker(),
          initNewErpAPI(),
        ]);
      } catch (err) {
        console.log('❌ INIT ERROR:', err);
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

  // 🔥 FINAL ROUTING — sirf top-level route groups register karo.
  // Konsa dikhega ye upar wala router.replace() effect decide karta hai.
  return (
    <NotificationProvider>
      <AppCoreProvider>
        <SalesOrderProvider>
          <View style={styles.rootContainer}>
            <Stack screenOptions={{ headerShown: false }}>
              {isAllowed ? (
                <>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="new" />
                  <Stack.Screen name="embed" />
                </>
              ) : (
                <>
                  <Stack.Screen name="(all)" />
                  <Stack.Screen name="(auth)/login" />
                </>
              )}
            </Stack>
            {isWeb() && <AppAlertHost />}
            {/* New build (web) / new store version (Android, iOS) notice */}
            <AppUpdateGate />
            <View style={styles.snackbarHost} pointerEvents="box-none">
              <Snackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                action={snackbar.action}
                duration={snackbar.duration}
                onHide={() => setSnackbar((s) => ({ ...s, visible: false }))}
              />
            </View>
          </View>
        </SalesOrderProvider>
      </AppCoreProvider>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  snackbarHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
