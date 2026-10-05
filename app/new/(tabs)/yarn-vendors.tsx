import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnVendorsScreen } from '@/src/screens/production/YarnVendorsScreen';

export default function YarnVendorsRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_vendors" action="view">
      <YarnVendorsScreen />
    </PermissionRouteGuard>
  );
}
