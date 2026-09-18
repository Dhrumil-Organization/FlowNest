import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PayableScreen } from '@/src/screens/production/PayableScreen';
import React from 'react';

export default function PayableRoute() {
  return (
    <PermissionRouteGuard resource="production.payable" action="view">
      <PayableScreen />
    </PermissionRouteGuard>
  );
}
