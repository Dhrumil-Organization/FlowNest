import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PurchaseGradeAuthScreen } from '@/src/screens/production/PurchaseGradeAuthScreen';

export default function PurchaseGradeAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.purchase_grade_auth" action="view">
      <PurchaseGradeAuthScreen />
    </PermissionRouteGuard>
  );
}
