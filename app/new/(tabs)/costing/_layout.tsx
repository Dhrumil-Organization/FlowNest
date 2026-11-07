import { Stack } from 'expo-router';

// The folder's home is always the first screen of this stack, so a
// sub-screen opened straight from the Global Search (or a link) has the
// home under it and Back works.
export const unstable_settings = { initialRouteName: 'index' };

export default function CostingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
