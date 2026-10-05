import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnManagementSystemScreen } from '@/src/screens/production/YarnManagementSystemScreen';

export default function YarnManagementSystemRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_management_system" action="view">
      <YarnManagementSystemScreen />
    </PermissionRouteGuard>
  );
}
