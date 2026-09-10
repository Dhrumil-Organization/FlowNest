import AppAlert from '@/common/utils/appAlert';
// MonthlyExpenseReport.tsx
import HeaderBarwithBackWebUI from '@/components/Header';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

interface Props {
  deviceId: string | null;
  username: string;
}

// const REMOTE_URL = 'http://192.168.13.130:3000/app-monthlyexpensereport/view';
const REMOTE_URL = 'https://ind.tms-webapp.com/app-monthlyexpensereport/view';
// const REMOTE_URL = 'http://192.168.13.130:3001/snap-view';

// Hard-coded device id (change if you want)
const HARDCODED_DEVICE_ID = 'DEVICE-12345-ANDROID';

const MonthlyExpenseReport: React.FC<Props> = ({ deviceId, username }) => {
  const webviewRef = useRef<WebView | null>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimal injected JS: set deviceID in localStorage before content loads
  const injectedBefore = useMemo(() => {
    // keep this small and safe
    return `
      try {
        // set only deviceID (string)
        localStorage.setItem('deviceID', ${JSON.stringify(deviceId)});
      } catch (e) {
        // ignore errors
      }
      true;
    `;
  }, []);

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(!!navState.canGoBack);
    setCanGoForward(!!navState.canGoForward);
  };

  const onLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const onLoadEnd = () => {
    setLoading(false);
  };

  const onError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error', nativeEvent);
    setLoading(false);
    setError(nativeEvent.description || 'Failed to load page');
    // optional alert
    if (__DEV__) {
      AppAlert.alert('WebView error', nativeEvent.description || 'Failed to load page');
    }
  };

  const handleReload = () => {
    setError(null);
    webviewRef.current?.reload();
  };

  const handleBack = () => {
    if (canGoBack) webviewRef.current?.goBack();
    else if (navigation?.goBack) navigation.goBack();
  };

  const handleForward = () => {
    if (canGoForward) webviewRef.current?.goForward();
  };

  // small message handler (not required but kept simple)
  const onMessage = useCallback((event: any) => {
    // if page posts messages, we log them
    try {
      const msg = event.nativeEvent?.data;
      console.log('[WebView message]', msg);
    } catch (e) { }
  }, []);

  return (
    <View style={styles.container}>
      {/* header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Icon name="arrow-back" size={22} color={canGoBack ? '#000' : '#999'} />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text numberOfLines={1} style={styles.titleText}>Monthly Expense Report</Text>
        </View>

        <TouchableOpacity onPress={handleForward} style={styles.iconBtn}>
          <Icon name="arrow-forward" size={22} color={canGoForward ? '#000' : '#999'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleReload} style={styles.iconBtn}>
          <Icon name="refresh" size={22} color="#000" />
        </TouchableOpacity>
      </View> */}
      <HeaderBarwithBackWebUI
        userName={username}
        header={'Monthly Expense Report'}
        subHeader={'Manage your expense report'}
      />

      {/* WebView */}
      <View style={styles.webviewWrap}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load page</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReload}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={ { flex: 1, marginTop: -56, zIndex: 1}}>
              <WebView
                ref={(r) => (webviewRef.current = r)}
                source={{ uri: REMOTE_URL }}
                originWhitelist={['*']}
                startInLoadingState={false}
                onLoadStart={onLoadStart}
                onLoadEnd={onLoadEnd}
                onNavigationStateChange={onNavigationStateChange}
                onError={onError}
                onMessage={onMessage}
                injectedJavaScriptBeforeContentLoaded={injectedBefore}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
              />
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#007EA" />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default MonthlyExpenseReport;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  headerTitle: { flex: 1, paddingHorizontal: 8 },
  titleText: { fontSize: 16, fontWeight: '600' },
  webviewWrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  errorDesc: { textAlign: 'center', marginBottom: 12, color: '#666' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#007bff', borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
