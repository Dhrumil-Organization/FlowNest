import { PermissionRouteGuard } from '@/src/core/navigation';
import { MonthlySalesTargetScreen } from '@/src/screens/monthlysalestarget/MonthlySalesTarget';
import React from 'react';

export default function MonthlySalesTargetRoute() {
  return (
    <PermissionRouteGuard resource="monthlysalestarget">
      <MonthlySalesTargetScreen />
    </PermissionRouteGuard>
  );
}
