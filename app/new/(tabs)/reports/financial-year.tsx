import { ReportRouteError } from '@/src/components/dashboard/ReportRouteError';
import FinancialYearPerformanceScreen from '@/src/screens/dashboard/FinancialYearPerformanceScreen';
import ProductionFinancialYearPerformanceScreen from '@/src/screens/dashboard/ProductionFinancialYearPerformanceScreen';
import { useLocalSearchParams } from 'expo-router';

export default function FinancialYearRoute() {
  const params = useLocalSearchParams();
  const raw = Array.isArray(params.metric) ? params.metric[0] : params.metric;
  const metric = String(raw || 'sales').toLowerCase();

  if (metric === 'production') {
    return <ProductionFinancialYearPerformanceScreen />;
  }

  return <FinancialYearPerformanceScreen />;
}

export { ReportRouteError as ErrorBoundary };
