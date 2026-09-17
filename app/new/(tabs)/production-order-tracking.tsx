import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProductionOrderTrackingScreen } from '@/src/screens/production/ProductionOrderTrackingScreen';

export default function ProductionOrderTrackingRoute() {
  return (
    <PermissionRouteGuard resource="production.production_order_tracking" action="view">
      <ProductionOrderTrackingScreen />
    </PermissionRouteGuard>
  );
}