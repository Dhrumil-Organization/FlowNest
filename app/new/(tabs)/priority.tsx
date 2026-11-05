import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DyeingScreen } from '@/src/screens/dyeing/DyeingScreen';

// Dyeing module (Priority / Daily Update / Mill Hub). Route name kept as
// `priority` so existing navigation + permission grants stay valid.
export default function PriorityRoute() {
  return (
    <PermissionRouteGuard resource="priority" action="view">
      <DyeingScreen />
    </PermissionRouteGuard>
  );
}
