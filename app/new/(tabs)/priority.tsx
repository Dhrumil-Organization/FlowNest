import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PriorityScreen } from '@/src/screens/priority/PriorityScreen';

export default function PriorityRoute() {
  return (
    <PermissionRouteGuard resource="priority" action="view">
      <PriorityScreen />
    </PermissionRouteGuard>
  );
}
