import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { StoreItemMasterNew } from '@/src/screens/production/StoreItemMasterNewScreen';
import React from 'react';

export default function StoreItemMasterNewRoute() {
  return (
    <PermissionRouteGuard resource="production.storeitemmaster" action="view">
      <StoreItemMasterNew />
    </PermissionRouteGuard>
  );
}
