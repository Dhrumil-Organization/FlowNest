import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProductionOrderEntryScreen } from '@/src/screens/production/ProductionOrderEntryScreen';

export default function ProductionOrdersRoute() {
  return (
    <PermissionRouteGuard resource="production.production_order_entry">
      <ProductionOrderEntryScreen />
    </PermissionRouteGuard>
  );
}
