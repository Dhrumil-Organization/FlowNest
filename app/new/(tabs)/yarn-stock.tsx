import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnStockScreen } from '@/src/screens/production/YarnStockScreen';

export default function YarnStockRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_stock" action="view">
      <YarnStockScreen />
    </PermissionRouteGuard>
  );
}
