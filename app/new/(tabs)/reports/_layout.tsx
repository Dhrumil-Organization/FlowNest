// import { Stack } from 'expo-router';

// export default function ReportsLayout() {
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="index" />
//       <Stack.Screen name="monthly-target" />
//       <Stack.Screen name="monthly-report" />
//       <Stack.Screen name="sales-flow" />
//       <Stack.Screen name="collection-flow" />
//       <Stack.Screen name="real-costing" />
//       <Stack.Screen name="expense" />
//     </Stack>
//   );
// }

import { Stack } from 'expo-router';
import { screenGuard } from '@/src/core/crash/ScreenErrorBoundary';

export default function ReportsLayout() {
  return (
    // screenGuard: one report failing shows "Try again" on that report only
    <Stack screenOptions={{ headerShown: false }} screenLayout={screenGuard}>
      <Stack.Screen name="index" />
      <Stack.Screen name="monthly-target" />
      <Stack.Screen name="monthly-report" />
      <Stack.Screen name="sales-flow" />
      <Stack.Screen name="financial-year" />
      <Stack.Screen name="collection-flow" />
      <Stack.Screen name="real-costing" />
      <Stack.Screen name="expense" />
      <Stack.Screen name="production" />
      <Stack.Screen name="production-machine" />
      <Stack.Screen name="beam-shortage" />
    </Stack>
  );
}
