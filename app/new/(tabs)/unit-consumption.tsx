import React from 'react';
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { MonthlyCostingCalendarScreen } from '@/src/screens/reports/MonthlyCostingCalendarScreen';

export default function UnitConsumptionRoute() {
  return (
    <PermissionRouteGuard resource="production.unit_consumption" action="view">
      <MonthlyCostingCalendarScreen kind="unit" />
    </PermissionRouteGuard>
  );
}
