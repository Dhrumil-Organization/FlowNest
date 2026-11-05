import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ReceivablesScreen } from '@/src/screens/production/ReceivablesScreen';
import React from 'react';

// Receivables: Sudamo / Knits login -> Receivables Sudamo, Rayons login -> Receivables
// (decided inside ReceivablesScreen from the logged-in property).
export default function ReceivablesRoute() {
  return (
    <PermissionRouteGuard resource="production.receivables" action="view">
      <ReceivablesScreen />
    </PermissionRouteGuard>
  );
}
