// ─────────────────────────────────────────────────────────────
// FILE: app/new/index.tsx
// Replaces src/navigation/RootNavigator.tsx's token check.
// Old: !token -> <Stack.Screen name="RoleLogin"/> else <Stack.Screen name="Main"/>
// New: redirect to the matching expo-router route instead.
// ─────────────────────────────────────────────────────────────
import { Redirect } from 'expo-router';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useMillModeStore } from '@/src/mill/millMode';
import { useEffect } from 'react';

export default function NewIndex() {
  const token = useAppSessionStore((s) => s.token);
  // MILL MODE: switch ON → the app opens straight into the Mill Hub.
  const millHydrated = useMillModeStore((s) => s.hydrated);
  const millOn = useMillModeStore((s) => s.enabled);
  const hydrateMill = useMillModeStore((s) => s.hydrate);
  useEffect(() => {
    void hydrateMill();
  }, [hydrateMill]);

  console.log('token =', token);

  if (!token) return <Redirect href="/new/role-login" />;
  if (!millHydrated) return null;
  if (millOn) return <Redirect href={'/new/mill' as any} />;
  return <Redirect href="/new/(tabs)" />;
}
