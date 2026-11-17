import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DtsScreen } from '@/src/screens/production/DtsScreen';

export default function DtsRoute() {
  return (
    <PermissionRouteGuard resource="production.dts" action="view">
      <DtsScreen />
    </PermissionRouteGuard>
  );
}
