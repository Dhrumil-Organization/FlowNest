import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { QuarterSummaryScreen } from '@/src/screens/production/QuarterSummaryScreen';

export default function QuarterSummaryRoute() {
  return (
    <PermissionRouteGuard resource="production.quarter_summary" action="view">
      <QuarterSummaryScreen />
    </PermissionRouteGuard>
  );
}
