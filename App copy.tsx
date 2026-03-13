import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // <-- Yeh change karein
import LoginScreen from './components/LoginPage/LoginPage';
import HomeScreen from './screens/HomeScreen'
import CameraPage from './components/CameraPage/CameraPage';
import CreditLimitRequest from './components/CreditLimitRequest/CreditLimitRequest';
import SudamoProdOrder from './components/SudamoProdOrder/SudamoProdOrder';
import Footer from './components/Footer/Footer';
import NetworkSpeed from './components/NetworkSpeed/NetworkSpeed';
import { Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import Snackbar from 'react-native-snackbar';
// import FullScreenLoader from './components/FullScreenLoader/FullScreenLoader';
import AccessDeniedModal from './components/AccessDeniedModal/AccessDeniedModal';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gettoken, setToken] = useState<string | null>('');
  const [getMenuApps, setMenuApps] = useState<string | null>('');
  const [getUserDetails, setUserDetails] = useState<string | null>('');
  const [getDeviceId, setDeviceId] = useState<string | null>('');
  const [getAuth, setAuth] = useState<boolean | null>(null);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [showDeniedModalpage, setShowDeniedModalpage] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Pehle device ID aur token check karo
        const deviceId = await DeviceInfo.getUniqueId();
        const token = await AsyncStorage.getItem('access_token');
        const user_details = await AsyncStorage.getItem('user_details');

        setDeviceId(deviceId);
        setToken(token);
        setUserDetails(user_details);
        setIsLoggedIn(!!token);

        // Network status check karo
        const netState = await NetInfo.fetch();
        setIsConnected(netState.isConnected);

        // SplashScreen hide karo
        SplashScreen.hide();
      } catch (error) {
        console.error("Initialization error:", error);
        SplashScreen.hide(); // Error hone par bhi splash hide karo
      }
    };

    initializeApp();
  }, []);


  // Network status check
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        Snackbar.show({
          text: 'You are back online!',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#66BB6A',
        });
        // Auto-retry token check
        checkToken();
      } else {
        Snackbar.show({
          text: 'You are offline!',
          duration: Snackbar.LENGTH_INDEFINITE,
          backgroundColor: '#FF5252',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const checkToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const user_details = await AsyncStorage.getItem('user_details');
      setToken(token);
      setUserDetails(user_details);
      setIsLoggedIn(!!token);
      if (token) {
        setShowDeniedModalpage(false);
      }
    } catch (error) {
      console.error("Token check error:", error);
    }
  }, []);



  const checkConnectionQuality = async () => {
    try {
      const startTime = Date.now();
      console.log('📡 Pinging Google...');

      // Google ko ping karne ke liye ek chhota request
      await axios.get('https://www.google.com', {
        timeout: 5000, // 5 seconds timeout
        validateStatus: () => true, // Sabhi status codes accept karein
      });

      const endTime = Date.now();
      const pingTime = endTime - startTime; // milliseconds

      console.log(`📡 Ping Time: ${pingTime}ms`);

      // Ping time ke hisab se quality batayein
      if (pingTime < 200) {
        Snackbar.show({
          text: '⚡ Excellent connection!',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#4CAF50', // Green
        });
        return "excellent";
      } else if (pingTime < 500) {
        Snackbar.show({
          text: '📶 Good connection',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#66BB6A', // Light green
        });
        return "good";
      } else if (pingTime < 1000) {
        Snackbar.show({
          text: '📱 Moderate connection',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#FFB74D', // Orange
        });
        return "moderate";
      } else {
        Snackbar.show({
          text: '🐢 Slow connection',
          duration: Snackbar.LENGTH_LONG,
          backgroundColor: '#FF5252', // Red
        });
        return "slow";
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      Snackbar.show({
        text: '❌ No internet connection!',
        duration: Snackbar.LENGTH_INDEFINITE,
        backgroundColor: '#F44336', // Dark red
      });
      return "offline";
    }
  };


  // Call it in useEffect
  // useEffect(() => {
  //   checkConnectionQuality();
  // }, []);

  // Token check


  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('access_token');
      const user_details = await AsyncStorage.getItem('user_details');
      // const userfname = user_details ? JSON.parse(user_details).first_name : null;
      console.log('🔑 Token:', token);
      console.log('🔑 user_details:', user_details);
      setToken(token);
      setUserDetails(user_details);
      setIsLoggedIn(!!token);
      SplashScreen.hide();
    };
    const checkAccess = async () => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        setDeviceId(deviceId);
      } catch (error) {
        console.error('❌ Verification failed:', error);
        Alert.alert('Error', 'Could not verify device.');
        BackHandler.exitApp();
      }
    };

    checkToken();
    checkAccess();
  }, []);

  const handleAuth = useCallback(async () => {

    const payload = {
      deviceid: getDeviceId,
    };
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    console.log('🔵 Sending login payload:', payload);
    try {
      setIsLoading(true)
      const response = await axios.post(
        'https://apig.tms-webapp.com/api/checkdevice',
        payload,
        { headers }
      );
      console.log('✅ yoyo API Response:', response);
      if (Number(response.data) === 1) {
        setIsLoading(false);
        setAuth(true);
      } else {
        setIsLoading(false);
        setAuth(false);
      }
    } catch (error) {
      setIsLoading(false);
      setAuth(false);
      Alert.alert('Error', 'Server error');
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceId]);

  useEffect(() => {
    if (getDeviceId) {
      handleAuth();
    }
  }, [getDeviceId, handleAuth]);

  useEffect(() => {
    if (getAuth === false) {
      setShowDeniedModal(true);
      setShowDeniedModalpage(true);
      setCountdown(5);
    }
  }, [getAuth]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeniedModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showDeniedModal && countdown === 0) {
      setShowDeniedModal(false);
      BackHandler.exitApp();
    }
    return () => clearTimeout(timer);
  }, [showDeniedModal, countdown]);

  // useEffect(() => {
  //   const unsubscribe = NetInfo.addEventListener((state) => {
  //     setIsConnected(state.isConnected);
  //     if (state.isConnected) {
  //       Snackbar.show({
  //         text: 'You are back online!',
  //         duration: Snackbar.LENGTH_SHORT,
  //         backgroundColor: '#66BB6A',
  //       });
  //       // Auto-retry token check
  //       // checkToken();
  //     } else {
  //       Snackbar.show({
  //         text: 'You are offline!',
  //         duration: Snackbar.LENGTH_INDEFINITE,
  //         backgroundColor: '#FF5252',
  //       });
  //     }
  //   });
  //   return () => unsubscribe();
  // }, []);

  // eslint-disable-next-line react/no-unstable-nested-components
  // const OfflineFallback = () => (
  //   <View style={offlineStyles.container}>
  //     <Icon name="wifi-off" size={80} color="#FF5252" style={offlineStyles.icon} />
  //     <Text style={offlineStyles.title}>You're Offline!</Text>
  //     <Text style={offlineStyles.subtitle}>Please connect to the internet to continue.</Text>
  //     <TouchableOpacity
  //       style={offlineStyles.retryButton}
  //       onPress={() => {
  //         checkToken(); // Retry token check
  //         checkConnectionQuality(); // Retry connection check
  //       }}
  //     >
  //       <Text style={offlineStyles.retryText}>Retry</Text>
  //     </TouchableOpacity>
  //   </View>
  // );

  // if (isLoggedIn === null) {
  //   return null; // SplashScreen dikh raha hai
  // }

  // if (isLoggedIn === false && isConnected === false) {
  //   return <OfflineFallback />;
  // }

  // eslint-disable-next-line react/no-unstable-nested-components


  // Styles for OfflineFallback


  return (
    <>
      {/* {isLoading && <FullScreenLoader message="Verifying..." />} */}
      {getAuth === true ? (
        isLoggedIn && gettoken && getUserDetails ? (
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home">
                {(props) => (
                  <>
                    <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} />
                    <NetworkSpeed onClick={() => checkConnectionQuality()} isConnected={isConnected} />
                    <HomeScreen {...props} isConnected={isConnected} username={getUserDetails} token={gettoken || ''} getMenuApps={getMenuApps || ''} setMenuApps={setMenuApps} />
                  </>
                )}
              </Stack.Screen>
              <Stack.Screen name="Upload">
                {(props) => <CameraPage {...props} token={gettoken || ''} isConnected={isConnected} />}
              </Stack.Screen>
              <Stack.Screen name="Credit Limit Request">
                {(props) => (
                  <>
                    <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} />
                    <CreditLimitRequest {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                  </>
                )}
              </Stack.Screen>
              <Stack.Screen name="Sudamo Production Order">
                {(props) => (
                  <>
                    <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} />
                    <SudamoProdOrder {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                  </>
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        ) : (
          <LoginScreen
            setIsLoggedIn={setIsLoggedIn}
            setToken={setToken}
            getDeviceId={getDeviceId}
            isConnected={isConnected}
            setUserDetails={setUserDetails}
            setMenuApps={setMenuApps}
          />
        )
      ) : (
        <>
          {/* <OfflineFallback /> */}
          <AccessDeniedModal
            visible={showDeniedModal}
            visiblepage={showDeniedModalpage}
            countdown={countdown}
            onClose={() => {
              setShowDeniedModal(false);
              BackHandler.exitApp();
            }}
            checkToken={checkToken}
            checkConnectionQuality={checkConnectionQuality}
            isLoading={isLoading}
          />
        </>
      )}
    </>
  );
}

// const offlineStyles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 20,
//   },
//   icon: {
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 30,
//   },
//   retryButton: {
//     backgroundColor: '#6A0DAD',
//     paddingVertical: 12,
//     paddingHorizontal: 30,
//     borderRadius: 8,
//     elevation: 3,
//   },
//   retryText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
