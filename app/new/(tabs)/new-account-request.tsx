import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { NewAccountRequestScreen } from '@/src/screens/production/NewAccountRequestScreen';

export default function NewAccountRequestRoute() {
  return (
    <PermissionRouteGuard resource="production.new_account_request" action="view">
      <NewAccountRequestScreen />
    </PermissionRouteGuard>
  );
}
