import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseOrderScreen } from '@/src/screens/production/PurchaseOrderScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_order" action="view">
      <PurchaseOrderScreen />
    </PermissionRouteGuard>
  );
}