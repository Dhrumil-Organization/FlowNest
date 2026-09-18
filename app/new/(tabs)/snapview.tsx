import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SnapviewScreen } from '@/src/screens/production/SnapviewScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.snapview" action="view">
      <SnapviewScreen />
    </PermissionRouteGuard>
  );
}