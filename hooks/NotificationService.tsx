// import messaging from '@react-native-firebase/messaging';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform } from 'react-native';

// // 🔥 Get FCM Token (Android & iOS)
// export const getFCMToken = async () => {
//   try {
//     // 🔹 Request permission (iOS)
//     if (Platform.OS === 'ios') {
//       await messaging().requestPermission();
//     }

//     // 🔹 Get token
//     const token = await messaging().getToken();
//     console.log('🔥 FCM TOKEN:', token);

//     // 🔹 Store in AsyncStorage
//     if (token) {
//       await AsyncStorage.setItem('notification_token', token);
//       return token;
//     }
//   } catch (error) {
//     console.error('🔥 Error getting FCM token:', error);
//     return null;
//   }
// };

// // 🔥 Handle notification click (foreground/background/killed)
// export const setupNotificationHandlers = (handleNotification) => {
//   // 🔹 Foreground notification
//   messaging().onMessage(async remoteMessage => {
//     console.log('🔥 Foreground notification:', remoteMessage);
//     handleNotification(remoteMessage.data);
//   });

//   // 🔹 Background notification
//   messaging().onNotificationOpenedApp(remoteMessage => {
//     console.log('🔥 Background notification:', remoteMessage);
//     handleNotification(remoteMessage.data);
//   });

//   // 🔹 Killed app notification
//   messaging()
//     .getInitialNotification()
//     .then(remoteMessage => {
//       if (remoteMessage) {
//         console.log('🔥 Killed app notification:', remoteMessage);
//         handleNotification(remoteMessage.data);
//       }
//     });
// };

// // 🔥 Get stored token from AsyncStorage
// export const getStoredToken = async () => {
//   return await AsyncStorage.getItem('notification_token');
// };

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Request permissions
export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permission denied');
    return false;
  }
  return true;
};

// Get Expo Push Token
export const getFCMToken = async () => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    if (token) {
      await AsyncStorage.setItem('notification_token', token);
      return token;
    }
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
};