import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseImportAuthScreen } from '@/src/screens/production/PurchaseImportAuthScreen';

export default function PurchaseImportAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_import_auth" action="view">
      <PurchaseImportAuthScreen />
    </PermissionRouteGuard>
  );
}
