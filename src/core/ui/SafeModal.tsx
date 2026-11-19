// FILE: src/core/ui/SafeModal.tsx
// ONE fix for every <Modal> in the app (Android edge-to-edge, Expo SDK 54 / RN 0.81).
//
// The problem: with edge-to-edge on, React Native FORCES every Android modal to draw under the
// status bar and the navigation bar, whatever `statusBarTranslucent` / `navigationBarTranslucent`
// say (ReactModalHostView: `get() = field || isEdgeToEdgeFeatureFlagOn`). So a bottom sheet's
// Confirm button ends up behind the phone's ◁ ○ ||| buttons, and a full-screen modal's header
// behind the clock.
//
// The fix: metro.config.js sends react-native's own `Modal` here. This wrapper gives the props
// their meaning back:
//   navigationBarTranslucent not true -> the content stops above the navigation bar
//   statusBarTranslucent not true     -> the content starts below the status bar
// A modal that draws under the bars on purpose (and adds the insets itself) passes those props
// as true, and nothing changes for it. iOS and web: untouched.
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

// the real component (this require is NOT redirected — only the one in react-native's index is)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RNModal: React.ComponentType<any> = require('react-native/Libraries/Modal/Modal').default;

/** app scrim colour — the strip behind the system bars of a see-through modal matches it */
const SCRIM = 'rgba(13,27,42,0.45)';
const NAV = '#0D1B2A';

function useInsetsSafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSafeAreaInsets();
  } catch {
    return initialWindowMetrics?.insets || { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

function InsetFrame({ top, bottom, transparent, children }: { top: boolean; bottom: boolean; transparent: boolean; children: React.ReactNode }) {
  const insets = useInsetsSafe();
  const t = top ? insets.top : 0;
  const b = bottom ? insets.bottom : 0;
  if (!t && !b) return <>{children}</>;
  return (
    <View style={s.fill}>
      {t ? <View style={{ height: t, backgroundColor: transparent ? SCRIM : NAV }} /> : null}
      <View style={s.fill}>{children}</View>
      {b ? <View style={{ height: b, backgroundColor: transparent ? SCRIM : '#FFFFFF' }} /> : null}
    </View>
  );
}

const SafeModal = React.forwardRef<any, any>(function SafeModal(props, ref) {
  if (Platform.OS !== 'android') return <RNModal ref={ref} {...props} />;
  const { children, statusBarTranslucent, navigationBarTranslucent, transparent } = props;
  return (
    <RNModal ref={ref} {...props}>
      <InsetFrame top={statusBarTranslucent !== true} bottom={navigationBarTranslucent !== true} transparent={!!transparent}>
        {children}
      </InsetFrame>
    </RNModal>
  );
});

const s = StyleSheet.create({ fill: { flex: 1 } });

export default SafeModal;
