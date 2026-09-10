// FILE: src/screens/datalog/DatalogScreen.tsx
// Datalog — embeds the external Datalog dashboard inside the app.
//
// Conventions match every other migrated tab screen:
//   - permissions: usePermission() from '@/src/core/permissions'
//                  (resource key 'datalog', action 'view')
//   - header:      this screen renders NO header of its own — the single
//                  AppHeader in (tabs)/_layout.tsx owns that
//                  (HEADER_CONTENT['datalog']).
//
// NOTE ON WEB VS NATIVE:
//   `react-native-webview` does not reliably run on Expo web, so on web we
//   render a plain <iframe> instead and keep <WebView> only for the native
//   (iOS/Android) build. `isWeb()` (src/platform/runtime.ts) is the same
//   platform check already used elsewhere in the app, so behaviour never
//   drifts out of sync with how the rest of the app decides web vs native.
//
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { T } from '@/src/theme';
import { isWeb } from '@/src/platform/runtime';

// Datalog dashboard — external system, opened directly (hash route so the
// remote app boots straight into its own client-side router).
const DATALOG_URL = 'http://49.200.231.110:8025/madhusudan/#!';

export function DatalogScreen() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const handleLoadEnd = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setFailed(true);
  }, []);

  return (
    <View style={s.container}>
      {isWeb() ? (
        // Web build: a normal iframe. `onLoad` fires once the document
        // inside the frame finishes loading, same signal WebView gives us
        // natively via onLoadEnd.
        <iframe
          src={DATALOG_URL}
          title="Datalog"
          style={s.iframe as any}
          onLoad={handleLoadEnd}
          onError={handleError}
        />
      ) : (
        <NativeDatalogWebView onLoadEnd={handleLoadEnd} onError={handleError} />
      )}

      {loading && !failed && (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={T.copper} />
          <Text style={s.overlayText}>Loading Datalog…</Text>
        </View>
      )}

      {failed && (
        <View style={s.overlay}>
          <Text style={s.errorTitle}>Couldn't load Datalog</Text>
          <Text style={s.errorMessage}>
            Check your network connection and that {DATALOG_URL} is reachable, then try again.
          </Text>
        </View>
      )}
    </View>
  );
}

// Kept as its own small component so the native-only `react-native-webview`
// import never gets bundled/evaluated on web (isWeb() branch above means
// this never even mounts there, but keeping the import isolated here too
// avoids any web-bundler resolution issues with native-only modules).
function NativeDatalogWebView({
  onLoadEnd,
  onError,
}: {
  onLoadEnd: () => void;
  onError: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview');
  return (
    <WebView
      source={{ uri: DATALOG_URL }}
      style={s.webview}
      onLoadEnd={onLoadEnd}
      onError={onError}
      onHttpError={onError}
      startInLoadingState={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  webview: { flex: 1, backgroundColor: T.bg },
  iframe: { flex: 1, width: '100%', height: '100%', border: 'none' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
    paddingHorizontal: 24,
  },
  overlayText: { marginTop: 10, fontSize: 13, fontWeight: '700', color: T.muted },
  errorTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  errorMessage: { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 19, color: T.muted },
});
