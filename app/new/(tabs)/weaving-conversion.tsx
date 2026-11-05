import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { OwnerWeavingConversionScreen } from '@/src/screens/production/OwnerWeavingConversionScreen';

export default function WeavingConversionRoute() {
  return <PermissionRouteGuard resource="production.owner_dashboard" action="view"><OwnerWeavingConversionScreen /></PermissionRouteGuard>;
}
