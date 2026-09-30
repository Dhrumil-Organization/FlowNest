// FILE: src/components/MonthlyExpenseReportNEW/index.tsx
// NEW ERP — Monthly Expense Report (replaces the legacy screen, legacy stays as-is).
// Legacy source : src/components/MonthlyExpenseReport/index.tsx (identical copy: components/MonthlyExpenseReport/index.tsx)
// Legacy route  : app/(tabs)/monthly-expense-report.tsx
//
// What legacy does (kept 1:1):
//   • Opens REMOTE_URL = https://ind.tms-webapp.com/app-monthlyexpensereport/view in a WebView.
//   • Before the page loads, writes localStorage.deviceID = <AsyncStorage cache_deviceId>
//     (injectedJavaScriptBeforeContentLoaded) — the report page reads it to identify the device.
//   • JS + DOM storage + file access enabled, loading overlay, error view with Retry.
//
// Fixes vs legacy:
//   1. Legacy built the injected script with useMemo(..., []) while deviceId was still ''
//      (the route loads it async) — so the page usually received deviceID = "".
//      Here the screen renders only after ErpSessionGate loaded the session, and the
//      injected script depends on deviceId, so the real id is always injected.
//   2. Legacy used react-native-webview on web too, which does not render in a browser —
//      the report was blank on the website. On web we now render an <iframe>; the device id
//      is passed as ?deviceID=… AND posted to the frame with postMessage (same bridge as
//      SnapViewNEW), plus an "Open in new tab" fallback.
//   3. Legacy handleBack referenced an undefined `navigation` (crash) — removed; back/forward
//      now act inside the WebView and the Android hardware back button goes back in the page.
//   4. HTTP errors (4xx/5xx) now show the error view too (legacy only caught network errors).
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

type Props = { deviceId?: string; username?: string; token?: string; API?: string };

const isWeb = Platform.OS === 'web';

// Same URL as legacy.
export const MONTHLY_EXPENSE_REPORT_URL = 'https://ind.tms-webapp.com/app-monthlyexpensereport/view';

function withDeviceParam(url: string, deviceId: string) {
  if (!deviceId) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('deviceID', deviceId);
    return u.toString();
  } catch {
    return `${url}${url.includes('?') ? '&' : '?'}deviceID=${encodeURIComponent(deviceId)}`;
  }
}

function ExpenseFrame({ deviceId }: { deviceId: string }) {
  // Bumping `nonce` remounts the WebView / iframe = fresh page + fresh deviceID injection
  // (also works from the error view, where the WebView is not mounted).
  const [nonce, setNonce] = useState(0);
  const webviewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const webUrl = useMemo(() => withDeviceParam(MONTHLY_EXPENSE_REPORT_URL, deviceId), [deviceId]);

  // Legacy injected script (only deviceID) — now with the real deviceId.
  const injectedBefore = useMemo(
    () => `
      try { localStorage.setItem('deviceID', ${JSON.stringify(deviceId || '')}); } catch (e) {}
      true;
    `,
    [deviceId],
  );

  // Android hardware back → go back inside the report first.
  useEffect(() => {
    if (isWeb || Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavigationStateChange = (nav: WebViewNavigation) => {
    setCanGoBack(!!nav.canGoBack);
    setCanGoForward(!!nav.canGoForward);
  };

  const onError = (e: any) => {
    const d = e?.nativeEvent?.description || 'Failed to load page';
    console.error('[MonthlyExpenseReportNEW] WebView error', e?.nativeEvent);
    setLoading(false);
    setError(d);
    if (__DEV__) AppAlert.alert('WebView error', d);
  };

  const onHttpError = (e: any) => {
    const code = e?.nativeEvent?.statusCode;
    if (code && code >= 400) {
      setLoading(false);
      setError(`Server returned ${code}`);
    }
  };

  const reload = () => {
    setError(null);
    setLoading(true);
    setCanGoBack(false);
    setCanGoForward(false);
    setNonce((n) => n + 1);
  };

  // Web: hand the device id to the report page (same bridge as SnapViewNEW).
  const onIframeLoad = () => {
    setLoading(false);
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_DEVICE_ID', deviceID: deviceId }, '*');
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_CREDENTIALS', deviceID: deviceId }, '*');
    } catch (e) {
      console.warn('[MonthlyExpenseReportNEW] postMessage failed', e);
    }
  };

  const openExternal = () => {
    if (isWeb && typeof window !== 'undefined') window.open(webUrl, '_blank', 'noopener');
    else Linking.openURL(webUrl).catch(() => AppAlert.alert('Error', 'Could not open the report.'));
  };

  return (
    <View style={s.frameWrap}>
      {/* toolbar */}
      <View style={s.toolbar}>
        {!isWeb ? (
          <>
            <ToolBtn icon="arrow-back" label="Back" disabled={!canGoBack} onPress={() => webviewRef.current?.goBack()} />
            <ToolBtn icon="arrow-forward" label="Forward" disabled={!canGoForward} onPress={() => webviewRef.current?.goForward()} />
          </>
        ) : null}
        <View style={{ flex: 1 }} />
        <ToolBtn icon="refresh" label="Reload" onPress={reload} />
        <ToolBtn icon="open-in-new" label={isWeb ? 'New tab' : 'Browser'} onPress={openExternal} />
      </View>

      <View style={[s.frame, S.card]}>
        {error ? (
          <View style={s.center}>
            <Icon name="cloud-off" size={44} color={T.border} />
            <Text style={s.errTitle}>Failed to load page</Text>
            <Text style={s.errDesc}>{error}</Text>
            <TouchableOpacity style={s.retry} onPress={reload}>
              <Icon name="refresh" size={18} color="#fff" />
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isWeb ? (
          React.createElement('iframe', {
            key: `exp-web-${nonce}`,
            ref: (el: HTMLIFrameElement | null) => { iframeRef.current = el; },
            src: webUrl,
            title: 'Monthly Expense Report',
            onLoad: onIframeLoad,
            allow: 'clipboard-read; clipboard-write; fullscreen',
            sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation',
            style: { width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' } as any,
          })
        ) : (
          <WebView
            key={`exp-native-${nonce}`}
            ref={(r) => { webviewRef.current = r; }}
            source={{ uri: MONTHLY_EXPENSE_REPORT_URL }}
            originWhitelist={['*']}
            startInLoadingState={false}
            onLoadStart={() => { setLoading(true); setError(null); }}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={onNavigationStateChange}
            onError={onError}
            onHttpError={onHttpError}
            onMessage={(e) => console.log('[MonthlyExpenseReportNEW message]', e?.nativeEvent?.data)}
            injectedJavaScriptBeforeContentLoaded={injectedBefore}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            setSupportMultipleWindows={false}
            style={{ flex: 1, backgroundColor: '#fff' }}
          />
        )}

        {loading && !error ? (
          <View style={s.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={s.overlayText}>Loading report…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ToolBtn({ icon, label, onPress, disabled }: { icon: any; label: string; onPress: () => void; disabled?: boolean }) {
  const { width } = useWindowDimensions();
  const showLabel = width >= 520;
  return (
    <TouchableOpacity
      style={[s.toolBtn, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={20} color={T.nav} />
      {showLabel ? <Text style={s.toolText}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export default function MonthlyExpenseReportNEW({ deviceId = '' }: Props) {
  return (
    <View style={s.root}>
      <ExpenseFrame key={deviceId || 'no-device'} deviceId={deviceId} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  frameWrap: { flex: 1, width: '100%', maxWidth: 1400, alignSelf: 'center', padding: 8, gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolBtn: {
    minWidth: 44, height: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  toolText: { fontSize: 13, fontWeight: '700', color: T.nav },
  frame: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  errTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  errDesc: { fontSize: 13, color: T.muted, textAlign: 'center', marginBottom: 8 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 18, borderRadius: 10, backgroundColor: T.copper },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', gap: 8 },
  overlayText: { fontSize: 13, fontWeight: '700', color: T.muted },
});
