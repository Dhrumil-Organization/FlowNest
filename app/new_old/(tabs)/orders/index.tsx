// FIX: this route previously did `export default OrdersScreen;` with zero
// prop wiring — OrdersScreen requires `token` (and optionally `userid`),
// so it was always rendering with `token: undefined`. Matches the same
// token-fetching pattern already used by every other tab route
// (dashboard, checking-scanner, beam-close).
import { PermissionRouteGuard } from '@/src/core/navigation';
import { OrdersScreen } from '@/src/screens/orders/OrdersScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

export default function OrdersRoute() {
  const [token, setToken] = useState('');
  const user = useAppSessionStore((s) => s.user);

  useEffect(() => {
    void (async () => {
      setToken((await AsyncStorage.getItem('access_token')) || '');
    })();
  }, []);

  return (
    <PermissionRouteGuard resource="orders">
      <OrdersScreen token={token} userid={user?.id} />
    </PermissionRouteGuard>
  );
}
