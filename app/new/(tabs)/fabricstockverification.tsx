import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { FabricStockVerificationScreen } from '@/src/screens/production/FabricStockVerificationScreen';

export default function FabricStockVerificationRoute() {
  return (
    <PermissionRouteGuard resource="production.fabricstockverification" action="view">
      <FabricStockVerificationScreen />
    </PermissionRouteGuard>
  );
}
