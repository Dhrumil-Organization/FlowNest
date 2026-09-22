import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderTrackingScreen } from '@/src/screens/production/SalesOrderTrackingScreen';

export default function SalesOrderTrackingRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_order" action="view">
      <SalesOrderTrackingScreen />
    </PermissionRouteGuard>
  );
}