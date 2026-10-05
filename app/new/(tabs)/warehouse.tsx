import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { WarehouseScreen } from '@/src/screens/production/WarehouseScreen';

export default function WarehouseRoute() {
  return (
    <PermissionRouteGuard resource="production.warehouse" action="view">
      <WarehouseScreen />
    </PermissionRouteGuard>
  );
}
