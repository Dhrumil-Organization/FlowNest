import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SnapviewScreen } from '@/src/screens/production/SnapviewScreen';

export default function SnapViewRoute() {
  return (
    <PermissionRouteGuard resource="production.snapview" action="view">
      <SnapviewScreen />
    </PermissionRouteGuard>
  );
}