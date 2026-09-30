import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PackingGradeAuthScreen } from '@/src/screens/production/PackingGradeAuthScreen';

export default function PackingGradeAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.packing_grade_auth" action="view">
      <PackingGradeAuthScreen />
    </PermissionRouteGuard>
  );
}
