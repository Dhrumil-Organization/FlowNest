import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CreditLimitRequestScreen } from '@/src/screens/production/CreditLimitRequestScreen';
import React from 'react';

export default function CreditLimitRequestRoute() {
  return (
    <PermissionRouteGuard resource="production.credit_limit_request" action="view">
      <CreditLimitRequestScreen />
    </PermissionRouteGuard>
  );
}
