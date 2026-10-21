import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { YarnRatesScreen } from '@/src/screens/production/YarnRatesScreen';

export default function YarnRatesRoute() {
  return (
    <PermissionRouteGuard resource="production.yarn_rates" action="view">
      <YarnRatesScreen />
    </PermissionRouteGuard>
  );
}
