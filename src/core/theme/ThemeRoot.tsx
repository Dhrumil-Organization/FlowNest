// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/ThemeRoot.tsx
//
// Wraps the app's navigator. When the drawn theme changes (light <-> dark)
// the whole tree under it is rebuilt once, so every screen — including the
// ones that are open but hidden in a tab — is drawn again in the new theme.
// The current route is kept by the router; only on-screen state that lives
// inside components (an open filter, a half-typed search) starts fresh,
// exactly like after switching the property in the header.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { DARK } from './themeColors';
import { getThemeScheme, subscribeTheme, ThemeScheme } from './themeState';

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ThemeScheme>(getThemeScheme());

  useEffect(() => {
    const sync = () => setScheme(getThemeScheme());
    sync();
    return subscribeTheme(sync);
  }, []);

  // The page colour is given directly (not through the converter) so the gap
  // between two screens never flashes the other theme.
  return (
    <View key={scheme} style={{ flex: 1, backgroundColor: scheme === 'dark' ? DARK.bg : undefined }}>
      {children}
    </View>
  );
}
