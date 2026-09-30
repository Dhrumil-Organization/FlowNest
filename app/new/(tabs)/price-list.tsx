import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PriceListScreen } from '@/src/screens/production/PriceListScreen';

export default function PriceListRoute() {
  return (
    <PermissionRouteGuard resource="production.price_list" action="view">
      <PriceListScreen />
    </PermissionRouteGuard>
  );
}
