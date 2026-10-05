import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProductionReportLegacyScreen } from '@/src/screens/production/ProductionReportLegacyScreen';

export default function ProductionReportRoute() {
  return (
    <PermissionRouteGuard resource="production.production_report" action="view">
      <ProductionReportLegacyScreen />
    </PermissionRouteGuard>
  );
}
