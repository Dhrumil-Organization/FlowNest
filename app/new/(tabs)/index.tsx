import { APP_NAVIGATION, PermissionRouteGuard } from '@/src/core/navigation';
import { usePermission } from '@/src/core/permissions';
import { DashboardScreen as DashboardScreen1 } from '@/src/screens/dashboard/DashboardScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Redirect } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

export default function DashboardRoute() {
  const [token, setToken] = useState('');
  const [getUserPrptype, setUserPrp] = useState('');
  const hydrated = useAppSessionStore((state) => state.hydrated);
  const appSession = useAppSessionStore((state) => state.appSession);
  const { canAccess, canDo } = usePermission();
  useEffect(() => {
    void (async () => {
      setToken((await AsyncStorage.getItem('access_token')) || '');
      setUserPrp((await AsyncStorage.getItem('user_prptype')) || '');
    })();
  }, []);

  // NO DASHBOARD RIGHT -> open the user's FIRST visible module instead of
  // showing "Access denied" as the first screen after login.
  // "First" = the same list and order the tab bar / More sheet / sidebar use
  // (APP_NAVIGATION is sorted by registry `order`, filtered by the user's
  // rights — see app/new/(tabs)/_layout.tsx `visibleItems`). This also covers
  // a new user (login `role1` empty), whose first module is Event.
  // The target is always a screen the user IS allowed to open and is never
  // this index route, so it cannot loop back here.
  const ready = hydrated && Boolean(appSession);
  const firstAllowedRoute = useMemo(() => {
    if (!ready || canAccess('dashboard')) return null;
    const first = APP_NAVIGATION.find((item) => {
      if (!item.routeName || item.routeName === 'index') return false;
      return item.action && item.action !== 'view'
        ? canDo(item.resource, item.action)
        : canAccess(item.resource);
    });
    return first ? first.routeName.replace(/\/index$/, '') : null;
  }, [ready, canAccess, canDo]);

  if (firstAllowedRoute) {
    return <Redirect href={`/new/(tabs)/${firstAllowedRoute}` as any} />;
  }

  // Dashboard allowed -> dashboard. Nothing allowed at all -> the guard's
  // "Access denied" message (there is no screen to send the user to).
  return <PermissionRouteGuard resource="dashboard"><DashboardScreen1 token={token} getUserPrptype={getUserPrptype} /></PermissionRouteGuard>;
}
