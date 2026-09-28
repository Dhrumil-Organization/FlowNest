import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
// import { PayableScreen } from '@/src/screens/production/PayableScreen';

import { ReceivablesScreen } from '@/src/screens/production/ReceivablesScreen';
import React from 'react';

export default function ReceivablesRoute() {
  return (
    <PermissionRouteGuard resource="production.receivables" action="view">
      <ReceivablesScreen />
    </PermissionRouteGuard>
  );
}
