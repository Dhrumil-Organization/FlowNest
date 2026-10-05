import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { OwnerDashboardScreen } from '@/src/screens/production/OwnerDashboardScreen';

export default function OwnerDashboardRoute() {
  return (
    <PermissionRouteGuard resource="production.owner_dashboard" action="view">
      <OwnerDashboardScreen />
    </PermissionRouteGuard>
  );
}
