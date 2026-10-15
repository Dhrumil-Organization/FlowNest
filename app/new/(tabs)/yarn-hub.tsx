import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnHubScreen } from '@/src/screens/production/YarnHubScreen';

export default function YarnHubRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_hub" action="view">
      <YarnHubScreen />
    </PermissionRouteGuard>
  );
}
