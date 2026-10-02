import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { VisitorsReportScreen } from '@/src/screens/production/VisitorsReportScreen';

export default function VisitorsReportRoute() {
  return (
    <PermissionRouteGuard resource="production.visitors_report" action="view">
      <VisitorsReportScreen />
    </PermissionRouteGuard>
  );
}
