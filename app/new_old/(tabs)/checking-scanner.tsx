import { PermissionRouteGuard } from '@/src/core/navigation';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { CheckingScannerScreen } from '@/src/screens/checking/CheckingScannerScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

export default function CheckingScannerRoute() {
  const [token, setToken] = useState('');
  const user = useAppSessionStore((s) => s.user);

  useEffect(() => {
    void (async () => {
      setToken((await AsyncStorage.getItem('access_token')) || '');
    })();
  }, []);

  return (
    <PermissionRouteGuard resource="checking_scanner">
      <CheckingScannerScreen token={token} username={user?.first_name || 'User'} />
    </PermissionRouteGuard>
  );
}
