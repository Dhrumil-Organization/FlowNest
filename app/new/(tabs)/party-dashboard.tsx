import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PartyDashboardScreen } from '@/src/screens/production/PartyDashboardScreen';

export default function PartyDashboardRoute() {
  return (
    <PermissionRouteGuard resource="production.party_dashboard" action="view">
      <PartyDashboardScreen />
    </PermissionRouteGuard>
  );
}
