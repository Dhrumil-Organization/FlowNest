// ─────────────────────────────────────────────────────────────
// FILE: app/new/index.tsx
// Replaces src/navigation/RootNavigator.tsx's token check.
// Old: !token -> <Stack.Screen name="RoleLogin"/> else <Stack.Screen name="Main"/>
// New: redirect to the matching expo-router route instead.
// ─────────────────────────────────────────────────────────────
import { Redirect } from 'expo-router';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';

export default function NewIndex() {
  const token = useAppSessionStore((s) => s.token);

  console.log('token =', token);

  if (!token) return <Redirect href="/new/role-login" />;
  return <Redirect href="/new/(tabs)" />;
}
