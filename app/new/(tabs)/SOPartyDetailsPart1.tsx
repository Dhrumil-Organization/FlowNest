import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SOPartyDetailsPart1Screen } from '@/src/screens/production/SOPartyDetailsPart1Screen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order" action="view">
      <SOPartyDetailsPart1Screen />
    </PermissionRouteGuard>
  );
}