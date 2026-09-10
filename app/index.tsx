import { isOnline } from '@/components/Event/CardScanService';
import HomeScreen from '@/components/HomeScreen';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

export default function TabsIndex() {
  // const { token, username } = useAuth();
  // const [prp, setPrp] = useState();
  //  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [online, setOnline] = useState(false);

  // useEffect(() => {
  //     const load = async () => {
  //         const prp = await AsyncStorage.getItem("selected_property");

  //         setPrp(prp as any);

  //     };
  //     load();
  // }, []);

  async function checkConnectivity() {
    const result = await isOnline();
    console.log("home screen device online parent :", result);
    setOnline(result);
  }

  useEffect(() => {
    const load = async () => {
      // const t = await AsyncStorage.getItem('access_token');
      const u = await AsyncStorage.getItem('user_details');
      // setToken(t || '');
      setUsername(u || 'User');
    };
    load();
     checkConnectivity();
  }, []);

  return (
    <>
      {/* <AuthProvider> */}
      <HomeScreen username={username} online={online} />

      {/* </AuthProvider> */}
    </>
  );
}