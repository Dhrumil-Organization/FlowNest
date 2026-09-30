// ─────────────────────────────────────────────────────────────
// FILE: app/new/_layout.tsx
// Replaces old src/App.tsx (NavigationContainer wrapper).
// Loads legacy storage + session, shows splash while hydrating,
// then hands off to expo-router's Stack instead of React Navigation.
// ─────────────────────────────────────────────────────────────
import { Stack } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StatusBar, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationProvider } from '@/common/context/NotificationContext';
import { AppCoreProvider } from '@/src/core/AppCoreProvider';
import '@/src/registry';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useAppStore } from '@/src/stores/AppStore';
import { T } from '@/src/theme';
import { useFonts } from 'expo-font';
import { ERP_FONT_FILES, ErpFontScope, ErpTypeScale, getErpTypeScale } from '@/src/core/fonts/erpFont';
import { installErpFont } from '@/src/core/fonts/erpFontPatch';

// NEW ERP font: Inter on every text of this tree (see src/core/fonts/erpFont.tsx).
installErpFont();

export default function NewAppLayout() {
  const loadLegacyStorage = useAppStore((state) => state.loadFromStorage);
  const hydrateSession = useAppSessionStore((state) => state.hydrate);
  const hydrated = useAppSessionStore((state) => state.hydrated);
  // Inter (bundled). If loading fails the app keeps the system font.
  const [fontsLoaded, fontError] = useFonts(ERP_FONT_FILES);
  const fontsReady = fontsLoaded || !!fontError;
  // Responsive type scale for the whole NEW ERP (updates on rotate / window resize).
  const { width: windowWidth } = useWindowDimensions();
  // Memoised on the resulting values (not the raw width) so dragging a web
  // window doesn't re-render every text on each pixel of resize.
  const rawScale = getErpTypeScale(windowWidth);
  const typeScale = useMemo(
    () => rawScale,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawScale.scale, rawScale.floor, rawScale.displayScale],
  );

  useEffect(() => {
    void Promise.all([loadLegacyStorage(), hydrateSession()]);
  }, [hydrateSession, loadLegacyStorage]);

  if (!hydrated || !fontsReady) {
    return (
      <NotificationProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={T.nav} />
          <View style={{ flex: 1, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={T.copper} size="large" />
          </View>
        </SafeAreaProvider>
      </NotificationProvider>
    );
  }

  return (
    <ErpFontScope.Provider value={fontsLoaded && !fontError}>
     <ErpTypeScale.Provider value={typeScale}>
      <NotificationProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={T.nav} />
          <AppCoreProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AppCoreProvider>
        </SafeAreaProvider>
      </NotificationProvider>
     </ErpTypeScale.Provider>
    </ErpFontScope.Provider>
  );
}
