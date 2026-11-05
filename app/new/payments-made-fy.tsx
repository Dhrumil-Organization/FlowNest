import React from 'react';
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import FyPaymentsMadeScreen from '@/src/screens/dashboard/FyPaymentsMadeScreen';

/**
 * Payments Made financial-year experience from Claude Artifact.
 * This screen intentionally lives directly under app/new, OUTSIDE (tabs).
 * It receives the same authenticated application providers, but not the
 * shared Reports header, navigation sidebar, or bottom tab bar.
 * Existing unrelated FY metrics remain under /(tabs)/reports/financial-year.
 */
export default function PaymentsMadeStandaloneFYRoute() {
  return (
    <PermissionRouteGuard resource="dashboard.payments_made_detail">
      <FyPaymentsMadeScreen />
    </PermissionRouteGuard>
  );
}
