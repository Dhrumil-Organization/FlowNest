import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import RepackingScreen from '@/src/screens/repacking/RepackingScreen';

export default function RepackingRoute() {
  return (
    <PermissionRouteGuard resource="repacking" action="view">
      <RepackingScreen />
    </PermissionRouteGuard>
  );
}
