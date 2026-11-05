import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import CreditorDashboardScreen from '@/src/screens/dashboard/CreditorDashboardScreen';

export default function CreditorDashboardRoute() {
  return (
    <PermissionRouteGuard resource="dashboard.creditor_dashboard">
      <CreditorDashboardScreen />
    </PermissionRouteGuard>
  );
}
