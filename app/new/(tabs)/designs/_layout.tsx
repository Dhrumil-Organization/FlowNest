// ─────────────────────────────────────────────────────────────
// FILE: app/new/(tabs)/designs/_layout.tsx
// Replaces src/navigation/stacks/DesignsStack.tsx.
//
// Old stack only registered DesignsMain + DesignDetail, but
// CatalogScreen/DesignDetailScreen also called navigate('NewDesign')
// and navigate('Colourway'), which had no matching Stack.Screen in
// the old code (dead navigation calls). Registering them here as
// real routes so those buttons actually work.
// ─────────────────────────────────────────────────────────────
import { Stack } from 'expo-router';

// The folder's home is always the first screen of this stack, so a
// sub-screen opened straight from the Global Search (or a link) has the
// home under it and Back works.
export const unstable_settings = { initialRouteName: 'index' };

export default function DesignsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="new" />
      <Stack.Screen name="colourway" />
    </Stack>
  );
}
