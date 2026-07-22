// ─────────────────────────────────────────────────────────────
// FILE: app/new/role-login.tsx
// Wraps src/screens/auth/RoleLoginScreen.
// RoleLoginScreen itself never called navigation.navigate — the old
// RootNavigator just re-rendered to <Main/> once the token appeared
// in the store. We reproduce that reactivity with a Redirect here.
// ─────────────────────────────────────────────────────────────
import { Redirect } from 'expo-router';
import { RoleLoginScreen } from '@/src/screens/auth/RoleLoginScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';

export default function RoleLoginRoute() {
  const token = useAppSessionStore((s) => s.token);

  if (token) return <Redirect href="/new/(tabs)" />;

  return <RoleLoginScreen />;
}
