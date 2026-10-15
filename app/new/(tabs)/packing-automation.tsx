import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { PackingAutomationScreen } from '@/src/screens/production/PackingAutomationScreen';

export default function PackingAutomationRoute() {
  return (
    <PermissionRouteGuard resource="production.packing_automation" action="view">
      <PackingAutomationScreen />
    </PermissionRouteGuard>
  );
}
