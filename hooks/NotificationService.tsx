
// import * as Notifications from 'expo-notifications';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform } from 'react-native';

// // Request permissions
// export const requestPermissions = async () => {
//   const { status } = await Notifications.requestPermissionsAsync();
//   if (status !== 'granted') {
//     console.log('Notification permission denied');
//     return false;
//   }
//   return true;
// };

// // Get Expo Push Token
// export const getFCMToken = async () => {
//   try {
//     const hasPermission = await requestPermissions();
//     if (!hasPermission) return null;

//     const token = (await Notifications.getExpoPushTokenAsync()).data;
//     console.log('Expo Push Token:', token);

//     if (token) {
//       await AsyncStorage.setItem('notification_token', token);
//       return token;
//     }
//   } catch (error) {
//     console.error('Error getting Expo push token:', error);
//     return null;
//   }
// };
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 🔥 REQUIRED (notification behavior)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permission
export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// 🔥 MAIN TOKEN FUNCTION (FIXED)
export const getFCMToken = async () => {
  try {
    if (!Device.isDevice) {
      console.log('Use physical device');
      return null;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    // ✅ VERY IMPORTANT (projectId)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    console.log('✅ Expo Push Token:', token);

    await AsyncStorage.setItem('notification_token', token);

    // ✅ ANDROID CHANNEL (MANDATORY)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    return token;
  } catch (error) {
    console.error('❌ Token Error:', error);
    return null;
  }
};