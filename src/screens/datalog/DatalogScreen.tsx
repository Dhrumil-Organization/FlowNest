
// FILE: src/screens/datalog/DatalogScreen.tsx

// Datalog — embeds the external Datalog dashboard inside the app.
//
// WEB:
//   Opens the external Datalog dashboard in a NEW browser tab.
//   This avoids HTTPS -> HTTP mixed-content problems with iframe.
//
// NATIVE:
//   Opens Datalog inside react-native-webview.
//
// Header:
//   This screen renders NO header of its own.
//   The single AppHeader in (tabs)/_layout.tsx owns that.
//
// Permissions:
//   Permission handling remains at the tab/layout level as used elsewhere.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { isWeb } from '@/src/platform/runtime';
import { T } from '@/src/theme';

// Datalog dashboard — external system.
// Keep this HTTP URL as-is.
const DATALOG_URL = 'http://49.200.231.110:8025/madhusudan/#!';

export function DatalogScreen() {
  const [loading, setLoading] = useState(!isWeb());
  const [failed, setFailed] = useState(false);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setFailed(true);
  }, []);

  // ---------------------------------------------------------------------------
  // WEB
  // ---------------------------------------------------------------------------
  // Do NOT use iframe here.
  //
  // Production app is HTTPS while Datalog is HTTP. An iframe would be blocked
  // by browser mixed-content/security rules.
  //
  // Instead, open Datalog in a separate browser tab immediately when this
  // screen mounts.
  useEffect(() => {
    if (!isWeb()) {
      return;
    }

    // Browser-only code.
    if (typeof window === 'undefined') {
      return;
    }

    const newTab = window.open(DATALOG_URL, '_blank', 'noopener,noreferrer');

    // If the browser allowed the popup, consider the redirect successful.
    if (newTab) {
      setLoading(false);
      setFailed(false);
    } else {
      // Popup blocker prevented the new tab from opening.
      // Keep the screen usable with the manual Open Datalog button.
      setLoading(false);
      setFailed(true);
    }
  }, []);

  const openDatalog = useCallback(async () => {
    if (isWeb() && typeof window !== 'undefined') {
      // Try opening in a new browser tab.
      const newTab = window.open(
        DATALOG_URL,
        '_blank',
        'noopener,noreferrer'
      );

      if (newTab) {
        setFailed(false);
        return;
      }
    }

    // Fallback.
    // This is mainly useful if the browser blocks window.open.
    try {
      await Linking.openURL(DATALOG_URL);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  return (
    <View style={s.container}>
      {isWeb() ? (
        // ---------------------------------------------------------------------
        // WEB SCREEN
        // ---------------------------------------------------------------------
        // Datalog itself is NOT rendered inside the React Native web page.
        // It is opened in a separate browser tab.
        <View style={s.redirectContainer}>
          <View style={s.redirectCard}>
            <Text style={s.redirectIcon}>↗</Text>

            <Text style={s.redirectTitle}>
              Datalog opened in a new tab
            </Text>

            <Text style={s.redirectMessage}>
              You have been redirected to Datalog in a new browser tab.
              You can continue using Datalog there.
            </Text>

            {failed && (
              <Text style={s.popupMessage}>
                Your browser may have blocked the new tab. Please click the
                button below to open Datalog.
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [
                s.openButton,
                pressed && s.openButtonPressed,
              ]}
              onPress={openDatalog}
            >
              <Text style={s.openButtonText}>
                Open Datalog
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // ---------------------------------------------------------------------
        // NATIVE SCREEN
        // ---------------------------------------------------------------------
        <NativeDatalogWebView
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      )}

      {/* Native loading indicator */}
      {!isWeb() && loading && !failed && (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={T.copper} />

          <Text style={s.overlayText}>
            Loading Datalog…
          </Text>
        </View>
      )}

      {/* Native error */}
      {!isWeb() && failed && (
        <View style={s.overlay}>
          <Text style={s.errorTitle}>
            Couldn't load Datalog
          </Text>

          <Text style={s.errorMessage}>
            Check your network connection and that {DATALOG_URL} is reachable,
            then try again.
          </Text>

          <Pressable
            style={({ pressed }) => [
              s.openButton,
              pressed && s.openButtonPressed,
            ]}
            onPress={openDatalog}
          >
            <Text style={s.openButtonText}>
              Open Datalog
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// NATIVE WEBVIEW
// -----------------------------------------------------------------------------
//
// Kept as a separate component so react-native-webview is not imported at the
// top level of this file. This prevents the native-only module from being
// evaluated by the Expo web bundle.
//
function NativeDatalogWebView({
  onLoadEnd,
  onError,
}: {
  onLoadEnd: () => void;
  onError: () => void;
}) {
   
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

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  webview: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // ---------------------------------------------------------------------------
  // WEB REDIRECT UI
  // ---------------------------------------------------------------------------

  redirectContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: T.bg,
  },

  redirectCard: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
    borderRadius: 18,
    backgroundColor: T.bg,
  },

  redirectIcon: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    color: T.copper,
    marginBottom: 14,
  },

  redirectTitle: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    color: T.ink,
  },

  redirectMessage: {
    marginTop: 10,
    maxWidth: 430,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: T.muted,
  },

  popupMessage: {
    marginTop: 14,
    maxWidth: 430,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: T.muted,
  },

  openButton: {
    marginTop: 22,
    minWidth: 150,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: T.copper,
  },

  openButtonPressed: {
    opacity: 0.75,
  },

  openButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // ---------------------------------------------------------------------------
  // NATIVE LOADING / ERROR
  // ---------------------------------------------------------------------------

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
    paddingHorizontal: 24,
  },

  overlayText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: T.muted,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: T.ink,
  },

  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: T.muted,
  },
});