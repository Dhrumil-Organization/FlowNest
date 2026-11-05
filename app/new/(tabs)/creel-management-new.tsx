import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CreelManagementScreen } from '@/src/screens/production/CreelManagementScreen';

// NEW ERP — Creel Management System (browse · creel setup · carton scan · finalize).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.creel_management_new" action="view">
      <CreelManagementScreen />
    </PermissionRouteGuard>
  );
}
