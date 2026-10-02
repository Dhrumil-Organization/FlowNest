import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { VisitsScreen } from '@/src/screens/production/VisitsScreen';

export default function VisitsRoute() {
  return (
    <PermissionRouteGuard resource="production.visits" action="view">
      <VisitsScreen />
    </PermissionRouteGuard>
  );
}
