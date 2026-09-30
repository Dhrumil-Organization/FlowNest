import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ItemAuthorizationScreen } from '@/src/screens/production/ItemAuthorizationScreen';

export default function ItemAuthorizationRoute() {
  return (
    <PermissionRouteGuard resource="production.item_authorization" action="view">
      <ItemAuthorizationScreen />
    </PermissionRouteGuard>
  );
}
