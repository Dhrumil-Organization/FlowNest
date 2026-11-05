import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { GreyPurchaseOrderScreen } from '@/src/screens/production/GreyPurchaseOrderScreen';

export default function GreyPurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.grey_purchase_order" action="view">
      <GreyPurchaseOrderScreen />
    </PermissionRouteGuard>
  );
}