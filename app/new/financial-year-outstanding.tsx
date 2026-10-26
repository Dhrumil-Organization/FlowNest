import FyOutstandingScreen from '@/src/screens/dashboard/FyOutstandingScreen';
import { ReportRouteError } from '@/src/components/dashboard/ReportRouteError';

// Standalone Stack route: outside (tabs), so the Reports sidebar and
// dashboard header are never mounted underneath the FY Outstanding screen.
export default function FinancialYearOutstandingRoute() {
  return <FyOutstandingScreen />;
}

export { ReportRouteError as ErrorBoundary };
