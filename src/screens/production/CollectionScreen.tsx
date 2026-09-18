import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import CollectionList from '../../components/CollectionListNEW';

export function CollectionScreen() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('User');
  const [deviceId, setDeviceId] = useState();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [storedToken, storedUser, storedDeviceId] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_details'),
        AsyncStorage.getItem('cache_deviceId'),
      ]);
      if (!mounted) return;
      setToken(storedToken || '');
      setUsername(storedUser || 'User');
      setDeviceId(storedDeviceId as any);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return <CollectionList token={token || ''} username={username} />;
}
