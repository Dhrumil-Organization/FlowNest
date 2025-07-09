import React, { useEffect, useState, useCallback } from 'react';
import LoginScreen from './components/LoginPage/LoginPage';
import CameraPage from './components/CameraPage/CameraPage';
import Header from './components/Header/Header';
import { Alert, BackHandler } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import FullScreenLoader from './components/FullScreenLoader/FullScreenLoader';
import AccessDeniedModal from './components/AccessDeniedModal/AccessDeniedModal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gettoken, setToken] = useState<string | null>('');
  const [getDeviceId, setDeviceId] = useState<string | null>('');
  const [getAuth, setAuth] = useState<boolean | null>(null);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔑 Token:', token);
      setToken(token);
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

  // const yoyo = "0";

  const handleAuth = useCallback(async () => {

    const payload = {
      deviceid: getDeviceId,
    };
    const headers = {
      // Authorization: `Bearer ${getToken()}`,
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
      // handle error
      // Alert.alert('❌ Error', `Error: ${error}`);
      setIsLoading(false);
      setAuth(false);
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

  if (isLoggedIn === null) {
    return null;
  }

  return (
    <>
      {isLoading && <FullScreenLoader message="Verifying..." />}
      {getAuth === true ? (isLoggedIn && gettoken ? (
        <>
          <Header onLogout={() => setIsLoggedIn(false)} />
          <CameraPage token={gettoken || ''} />
        </>
      ) : (
        <LoginScreen setIsLoggedIn={setIsLoggedIn} setToken={setToken} getDeviceId={getDeviceId} />
      )) : <AccessDeniedModal visible={showDeniedModal} countdown={countdown} onClose={() => { setShowDeniedModal(false); BackHandler.exitApp(); }} />}
    </>
  );
}
