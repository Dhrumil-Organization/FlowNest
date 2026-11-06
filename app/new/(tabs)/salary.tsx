import React from 'react';
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { MonthlyCostingCalendarScreen } from '@/src/screens/reports/MonthlyCostingCalendarScreen';

export default function SalaryRoute() {
  return (
    <PermissionRouteGuard resource="production.salary" action="view">
      <MonthlyCostingCalendarScreen kind="salary" />
    </PermissionRouteGuard>
  );
}
