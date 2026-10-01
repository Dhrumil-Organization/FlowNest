import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderTrackingScreen } from '@/src/screens/production/SalesOrderTrackingScreen';

export default function SalesOrderTrackingRoute() {
  return (
    <PermissionRouteGuard resource="production.production.sales_order_tracking" action="view">
      <SalesOrderTrackingScreen />
    </PermissionRouteGuard>
  );
}