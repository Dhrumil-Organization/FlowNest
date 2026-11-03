// Reports -> Assign Report (the web ERP's "Reports": the reports assigned to the login with their saved settings).
// Gated by its own right `management.reports.assign_report` (dashboard.permission.ts) — opening the route
// without the right shows "Access denied", the same as the card being hidden on the Reports hub.
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import AssignReportScreen from '@/src/screens/reports/AssignReportScreen';
import { ReportRouteError } from '@/src/components/dashboard/ReportRouteError';

export default function AssignReportRoute() {
  return (
    <PermissionRouteGuard resource="management.reports.assign_report">
      <AssignReportScreen />
    </PermissionRouteGuard>
  );
}

export { ReportRouteError as ErrorBoundary };
