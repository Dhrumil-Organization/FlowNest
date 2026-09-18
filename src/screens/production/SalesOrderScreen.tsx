import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import GreySalesOrder from '../../components/GreySalesOrderNEW';

export function SalesOrderScreen() {
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

  return <GreySalesOrder token={token || ''} isConnected={true} username={username} />
}
