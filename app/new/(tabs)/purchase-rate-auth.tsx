import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseRateAuthScreen } from '@/src/screens/production/PurchaseRateAuthScreen';

export default function PurchaseRateAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_rate_auth" action="view">
      <PurchaseRateAuthScreen />
    </PermissionRouteGuard>
  );
}
