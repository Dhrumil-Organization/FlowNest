import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesOrderPriceListAuthScreen } from '@/src/screens/production/SalesOrderPriceListAuthScreen';

export default function SalesOrderPriceListAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_order_price_list_auth" action="view">
      <SalesOrderPriceListAuthScreen />
    </PermissionRouteGuard>
  );
}
