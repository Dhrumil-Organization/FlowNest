import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProductionMergeAuthScreen } from '@/src/screens/production/ProductionMergeAuthScreen';

export default function ProductionMergeAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.production_merge_auth" action="view">
      <ProductionMergeAuthScreen />
    </PermissionRouteGuard>
  );
}
