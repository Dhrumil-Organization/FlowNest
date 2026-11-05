import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { OutstandingDaysRequestScreen } from '@/src/screens/production/OutstandingDaysRequestScreen';

export default function OutstandingDaysRequestRoute() {
  return (
    <PermissionRouteGuard resource="production.outstanding_days_request" action="view">
      <OutstandingDaysRequestScreen />
    </PermissionRouteGuard>
  );
}
