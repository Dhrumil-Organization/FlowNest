// ─────────────────────────────────────────────────────────────
// FILE: app/new/(tabs)/reports/_layout.tsx
// Replaces the Stack.Navigator that used to be created INSIDE
// src/screens/reports/ReportsHubScreen.tsx (ReportsHome / RealCosting / Expense).
// That nested-navigator-inside-a-screen pattern doesn't apply with
// expo-router — it's just a normal nested folder + Stack layout now.
// ─────────────────────────────────────────────────────────────
import { Stack } from 'expo-router';

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="real-costing" />
      <Stack.Screen name="expense" />
    </Stack>
  );
}
