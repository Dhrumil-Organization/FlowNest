import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderScreen } from '@/src/screens/production/SalesOrderScreen';

export default function SalesOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order" action="view">
      <SalesOrderScreen />
    </PermissionRouteGuard>
  );
}