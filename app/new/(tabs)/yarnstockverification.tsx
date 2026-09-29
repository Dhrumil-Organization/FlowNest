import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnStockVerificationScreen } from '@/src/screens/production/YarnStockVerificationScreen';

export default function YarnStockVerificationRoute() {
  return (
    <PermissionRouteGuard resource="production.yarnstockverification" action="view">
      <YarnStockVerificationScreen />
    </PermissionRouteGuard>
  );
}
