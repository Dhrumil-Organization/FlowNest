import { PermissionRouteGuard } from '@/src/core/navigation';
import { DashboardScreen as DashboardScreen1 } from '@/src/screens/dashboard/DashboardScreen';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

export default function DashboardRoute() {
  const [token, setToken] = useState('');
  const [getUserPrptype, setUserPrp] = useState('');
  useEffect(() => {
    void (async () => {
      setToken((await AsyncStorage.getItem('access_token')) || '');
      setUserPrp((await AsyncStorage.getItem('user_prptype')) || '');
    })();
  }, []);
  return <PermissionRouteGuard resource="dashboard"><DashboardScreen1 token={token} getUserPrptype={getUserPrptype} /></PermissionRouteGuard>;
}
