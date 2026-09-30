import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderInactiveScreen } from '@/src/screens/production/SalesOrderInactiveScreen';

export default function SalesOrderInactiveRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order_inactive" action="view">
      <SalesOrderInactiveScreen />
    </PermissionRouteGuard>
  );
}
