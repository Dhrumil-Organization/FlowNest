import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnSalesInvoiceScreen } from '@/src/screens/production/YarnSalesInvoiceScreen';


export default function MultiprintRoute() {
  return (
    <PermissionRouteGuard resource="production.Multiprint" action="view">
      <YarnSalesInvoiceScreen />
    </PermissionRouteGuard>
  );
}
