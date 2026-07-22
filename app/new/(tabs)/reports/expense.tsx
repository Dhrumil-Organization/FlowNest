// Old ExpenseWrapper() function from ReportsHubScreen.tsx, moved here as-is.
import ExpenseScreen from '@/src/screens/reports/ExpenseScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { API_BASE_URL } from '@/src/api/client';

export default function ExpenseWrapper() {
  const token = useAppSessionStore((s) => s.token) || '';
  return <ExpenseScreen token={token} apiBase={API_BASE_URL} />;
}
