import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import SalesOrderTrackingPartyDetailsPart1 from '../../components/SalesOrderTrackingNEW/SOPartyDetailsPart1/SOPartyDetailsPart1';

export function SOPartyDetailsPart1Screen() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('User');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_details'),
        AsyncStorage.getItem('cache_deviceId'),
      ]);
      if (!mounted) return;
      setToken(storedToken || '');
      setUsername(storedUser || 'User');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return  <SalesOrderTrackingPartyDetailsPart1 username={username} />
}
