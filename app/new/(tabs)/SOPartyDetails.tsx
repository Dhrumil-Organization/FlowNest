import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SOPartyDetailsScreen } from '@/src/screens/production/SOPartyDetailsScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order" action="view">
      <SOPartyDetailsScreen />
    </PermissionRouteGuard>
  );
}