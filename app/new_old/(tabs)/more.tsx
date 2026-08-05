// FILE: app/new/(tabs)/more.tsx
// Placeholder route for the "More" tab. This screen is never actually
// shown — pressing the "More" tab is intercepted (see _layout.tsx's
// tabPress listener) and opens the overflow-items bottom sheet instead.
// The file still needs to exist so Expo Router has a valid route to
// attach the Tabs.Screen "more" entry to.
import React from 'react';
import { View } from 'react-native';

export default function MorePlaceholder() {
  return <View />;
}
