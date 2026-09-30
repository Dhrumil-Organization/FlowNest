import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProcessCompleteAuthScreen } from '@/src/screens/production/ProcessCompleteAuthScreen';

export default function ProcessCompleteAuthRoute() {
  return (
    <PermissionRouteGuard resource="production.process_complete_auth" action="view">
      <ProcessCompleteAuthScreen />
    </PermissionRouteGuard>
  );
}
