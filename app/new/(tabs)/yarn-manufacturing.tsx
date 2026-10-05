import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnManufacturingScreen } from '@/src/screens/production/YarnManufacturingScreen';

export default function YarnManufacturingRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_manufacturing" action="view">
      <YarnManufacturingScreen />
    </PermissionRouteGuard>
  );
}
