import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PoyRateEntryScreen } from '@/src/screens/production/PoyRateEntryScreen';

export default function PoyRateEntryRoute() {
  return (
    <PermissionRouteGuard resource="production.poy_rate_entry" action="view">
      <PoyRateEntryScreen />
    </PermissionRouteGuard>
  );
}
