// Old ExpenseWrapper() function from ReportsHubScreen.tsx, moved here as-is.
import ExpenseScreen from '@/src/screens/reports/ExpenseScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { API_BASE_URL } from '@/src/api/client';
import { ReportRouteError } from '@/src/components/dashboard/ReportRouteError';

export default function ExpenseWrapper() {
  const token = useAppSessionStore((s) => s.token) || '';
  return <ExpenseScreen token={token} apiBase={API_BASE_URL} />;
}

// Same as the other reports: an error while opening this report shows
// "Unable to open report / Try again" instead of closing the app.
export { ReportRouteError as ErrorBoundary };
