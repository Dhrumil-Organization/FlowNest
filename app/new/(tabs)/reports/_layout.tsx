import { Stack } from 'expo-router';

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="monthly-target" />
      <Stack.Screen name="monthly-report" />
      <Stack.Screen name="sales-flow" />
      <Stack.Screen name="collection-flow" />
      <Stack.Screen name="real-costing" />
      <Stack.Screen name="expense" />
    </Stack>
  );
}
