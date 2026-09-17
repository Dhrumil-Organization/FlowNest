import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import SudamoProdOrder from '../../components/SudamoProdOrderNEW';

export function SudamoProductionOrderScreen() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('User');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_details'),
      ]);
      if (!mounted) return;
      setToken(storedToken || '');
      setUsername(storedUser || 'User');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return <SudamoProdOrder token={token} isConnected={true} username={username} />;
}
