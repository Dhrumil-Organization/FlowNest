import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderEntryScreen } from '@/src/screens/production/SalesOrderEntryScreen';

export default function SalesOrderEntryRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order_entry" action="view">
      <SalesOrderEntryScreen />
    </PermissionRouteGuard>
  );
}
