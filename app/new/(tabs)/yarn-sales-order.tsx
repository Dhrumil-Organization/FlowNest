import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnSalesOrderScreen } from '@/src/screens/production/YarnSalesOrderScreen';

export default function YarnSalesOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_sales_order" action="view">
      <YarnSalesOrderScreen />
    </PermissionRouteGuard>
  );
}
