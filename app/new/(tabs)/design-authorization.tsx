import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DesignAuthorizationScreen } from '@/src/screens/production/DesignAuthorizationScreen';

export default function DesignAuthorizationRoute() {
  return (
    <PermissionRouteGuard resource="production.design_authorization" action="view">
      <DesignAuthorizationScreen />
    </PermissionRouteGuard>
  );
}
