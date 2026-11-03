// FILE: app/new/(tabs)/merge-master-data.tsx   <-- OUTER app/ folder (NOT src/app/)
// Route name must equal `route: 'merge-master-data'` in src/registry/modules/production.module.ts
import { PermissionRouteGuard } from '@/src/core/navigation';
import { MergeMasterData } from '@/src/screens/production/MergeMasterDataScreen';
import React from 'react';

export default function MergeMasterDataRoute() {
  return (
    <PermissionRouteGuard resource="production.merge_master_data" action="view">
      <MergeMasterData />
    </PermissionRouteGuard>
  );
}
