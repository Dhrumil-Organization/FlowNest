import { ReportRouteError } from '@/src/components/dashboard/ReportRouteError';
import FinancialYearPerformanceScreen from '@/src/screens/dashboard/FinancialYearPerformanceScreen';
import FyOutstandingScreen from '@/src/screens/dashboard/FyOutstandingScreen';
import FyPaymentCollectionScreen from '@/src/screens/dashboard/FyPaymentCollectionScreen';
import ProductionFinancialYearPerformanceScreen from '@/src/screens/dashboard/ProductionFinancialYearPerformanceScreen';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { Platform } from 'react-native';

export default function FinancialYearRoute() {
  const params = useLocalSearchParams();
  const pathname = usePathname();
  // Expo Router tabs may retain this route when the dashboard becomes active.
  // Do not leave a fixed-position report overlay mounted over /new.
  if (Platform.OS === 'web' && !pathname.replace(/\/$/, '').endsWith('/reports/financial-year')) return null;
  const raw = Array.isArray(params.metric) ? params.metric[0] : params.metric;
  const metric = String(raw || 'sales').toLowerCase();

  if (metric === 'collections' || metric === 'collection') {
    return <FyPaymentCollectionScreen />;
  }

  if (metric === 'outstanding') {
    return <FyOutstandingScreen />;
  }

  if (metric === 'production') {
    return <ProductionFinancialYearPerformanceScreen />;
  }

  return <FinancialYearPerformanceScreen />;
}

export { ReportRouteError as ErrorBoundary };
