import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseOrderTrackingScreen } from '@/src/screens/production/PurchaseOrderTrackingScreen';

export default function PurchaseOrderTrackingRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_order" action="view">
      <PurchaseOrderTrackingScreen />
    </PermissionRouteGuard>
  );
}