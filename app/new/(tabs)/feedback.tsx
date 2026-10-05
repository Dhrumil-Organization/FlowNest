import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { FeedbackScreen } from '@/src/screens/production/FeedbackScreen';

export default function FeedbackRoute() {
  return (
    <PermissionRouteGuard resource="production.feedback" action="view">
      <FeedbackScreen />
    </PermissionRouteGuard>
  );
}
