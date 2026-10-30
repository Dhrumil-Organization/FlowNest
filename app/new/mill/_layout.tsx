// ─────────────────────────────────────────────────────────────
// FILE: app/new/mill/_layout.tsx
// MILL MODE route group. Guards:
//   • not logged in            → login (login is common for ERP and Mill)
//   • Mill switch is OFF       → back to the normal ERP  (/new/(tabs))
// The reverse guard (Mill ON → never show the ERP tabs) is in
// app/new/(tabs)/_layout.tsx and app/new/index.tsx.
// ─────────────────────────────────────────────────────────────
import { useMillModeStore } from '@/src/mill/millMode';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { Redirect, Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function MillLayout() {
  const token = useAppSessionStore((s) => s.token);
  const hydrated = useMillModeStore((s) => s.hydrated);
  const enabled = useMillModeStore((s) => s.enabled);
  const busy = useMillModeStore((s) => s.busy);
  const hydrate = useMillModeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!token) return <Redirect href="/new/role-login" />;
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#5eead4" />
      </View>
    );
  }
  if (!enabled && !busy) return <Redirect href="/new/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
