import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ReceivablesScreen } from '@/src/screens/production/ReceivablesScreen';
import React from 'react';

export default function PayableRoute() {
  return (
    <PermissionRouteGuard resource="production.payable" action="view">
      <ReceivablesScreen />
    </PermissionRouteGuard>
  );
}
