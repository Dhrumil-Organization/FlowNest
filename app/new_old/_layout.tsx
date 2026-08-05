// ─────────────────────────────────────────────────────────────
// FILE: app/new/_layout.tsx
// Replaces old src/App.tsx (NavigationContainer wrapper).
// Loads legacy storage + session, shows splash while hydrating,
// then hands off to expo-router's Stack instead of React Navigation.
// ─────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { AppCoreProvider } from '@/src/core/AppCoreProvider';
import '@/src/registry';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useAppStore } from '@/src/stores/AppStore';
import { T } from '@/src/theme';

export default function NewAppLayout() {
  const loadLegacyStorage = useAppStore((state) => state.loadFromStorage);
  const hydrateSession = useAppSessionStore((state) => state.hydrate);
  const hydrated = useAppSessionStore((state) => state.hydrated);

  useEffect(() => {
    void Promise.all([loadLegacyStorage(), hydrateSession()]);
  }, [hydrateSession, loadLegacyStorage]);

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={T.nav} />
        <View style={{ flex: 1, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.copper} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={T.nav} />
      <AppCoreProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppCoreProvider>
    </SafeAreaProvider>
  );
}
