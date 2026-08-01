import { PermissionRouteGuard } from '@/src/core/navigation';
import { BeamCloseScreen } from '@/src/screens/beamClose/BeamCloseScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

export default function BeamCloseRoute() {
  const [token, setToken] = useState('');

  useEffect(() => {
    void (async () => {
      setToken((await AsyncStorage.getItem('access_token')) || '');
    })();
  }, []);

  return (
    <PermissionRouteGuard resource="beam_close">
      <BeamCloseScreen token={token} />
    </PermissionRouteGuard>
  );
}
