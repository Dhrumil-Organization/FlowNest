import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseOrderTrackingScreen } from '@/src/screens/production/PurchaseOrderTrackingScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_order" action="view">
      <PurchaseOrderTrackingScreen />
    </PermissionRouteGuard>
  );
}