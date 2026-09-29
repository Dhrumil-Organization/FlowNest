import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { FabricStockScreen } from '@/src/screens/production/FabricStockScreen';

export default function FabricStockRoute() {
  return (
    <PermissionRouteGuard resource="production.fabric_stock" action="view">
      <FabricStockScreen />
    </PermissionRouteGuard>
  );
}
