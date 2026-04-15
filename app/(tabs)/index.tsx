import Footer from '@/components/Footer';
import HomeScreen from '@/components/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

export default function TabsIndex() {
  // const { token, username } = useAuth();
  // const [prp, setPrp] = useState();
  //  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');

  // useEffect(() => {
  //     const load = async () => {
  //         const prp = await AsyncStorage.getItem("selected_property");

  //         setPrp(prp as any);

  //     };
  //     load();
  // }, []);



  useEffect(() => {
    const load = async () => {
      // const t = await AsyncStorage.getItem('access_token');
      const u = await AsyncStorage.getItem('user_details');
      // setToken(t || '');
      setUsername(u || 'User');
    };
    load();
  }, []);

  return (
    <>
      {/* <AuthProvider> */}
        <HomeScreen username={username} />
        <Footer/>
      {/* </AuthProvider> */}
    </>
  );
}