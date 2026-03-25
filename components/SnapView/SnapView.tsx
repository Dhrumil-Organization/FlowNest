// MonthlyExpenseReport.tsx
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBarwithBackWebUI from '../HeaderBarwithBackWebUI/HeaderBarwithBackWebUI';
// import { API, initAPI } from '../../common/API/dynamicAPI';

interface Props {
  token: string | null;
  navigation?: any;
  getDeviceId: string | null;
  username: string;
  API: string;
}

// const REMOTE_URL = 'http://192.168.13.130:3001/mob-snap-view';
// const REMOTE_URL = 'https://dash.tms-webapp.com/mob-snap-view';



// Hard-coded device id (change if you want)
const HARDCODED_DEVICE_ID = 'DEVICE-12345-ANDROID';

const SnapView: React.FC<Props> = ({ token, navigation, getDeviceId, username, API }) => {
  const webviewRef = useRef<WebView | null>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [getLoginName, setLoginName] = useState<string | null>(null);
  const [getLoginPasswd, setLoginPasswd] = useState<string | null>(null);

  const REMOTE_URL = API == "https://apig.tms-webapp.com" ? "https://dash.tms-webapp.com/mob-snap-view" : API == "https://apiy.tms-webapp.com" ? "https://viz.tms-webapp.com/mob-snap-view" : "";
  // const REMOTE_URL = API == "https://apig.tms-webapp.com" ? "http://192.168.13.130:3001/mob-snap-view" : API == "https://apiy.tms-webapp.com" ? "http://192.168.13.130:3001/mob-snap-view" : "";

  console.log('Snap View API:', API, REMOTE_URL);

  console.log('snap token', token);
  console.log('getDeviceId', getDeviceId);
  console.log('username', username);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_details_name = await AsyncStorage.getItem('login_user_name');
        const user_details_Passwd = await AsyncStorage.getItem('login_user_passwd');
        console.log('AsyncStorage values:', user_details_name, user_details_Passwd); // Check karein
        setLoginName(user_details_name);
        setLoginPasswd(user_details_Passwd);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    initializeApp();
  }, []);


  console.log('getLoginName', JSON.stringify(getDeviceId), JSON.stringify(getLoginName), JSON.stringify(getLoginPasswd));
  // Minimal injected JS: set deviceID in localStorage before content loads
  const injectedBefore = useMemo(() => {
    return `
      try {
        // Clear all localStorage
        localStorage.clear();
  
        // Set values from state
        localStorage.setItem('deviceID', ${JSON.stringify(getDeviceId)});
        localStorage.setItem('login_user_name', ${JSON.stringify(getLoginName)});
        localStorage.setItem('login_user_passwd', ${JSON.stringify(getLoginPasswd)});
      } catch (e) {
        // ignore errors
      }
      true;
    `;
  }, [getDeviceId, getLoginName, getLoginPasswd]);


  // const injectedBefore = useMemo(() => {
  //   return `
  //     try {
  //       // Set only deviceID (string)
  //       localStorage.setItem('deviceID', ${JSON.stringify(getDeviceId)});
  //     } catch (e) {
  //       // ignore errors
  //     }
  //     true;
  //   `;
  // }, [getDeviceId]);


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
      Alert.alert('WebView error', nativeEvent.description || 'Failed to load page');
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
  // const onMessage = useCallback((event: any) => {
  //   // if page posts messages, we log them
  //   try {
  //     const msg = event.nativeEvent?.data;
  //     console.log('[WebView message]', msg);
  //   } catch (e) { }
  // }, []);
  const onMessage = useCallback((event: any) => {
    try {
      const localStorageData = JSON.parse(event.nativeEvent?.data);
      console.log('LocalStorage data from WebView:', localStorageData);
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
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
        header={'Snap View'}
        subHeader={'Manage your data here'}
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
            {getLoginName && getLoginPasswd && (
              <>
                {/* <WebView
                  ref={(r) => (webviewRef.current = r)}
                  source={{ uri: REMOTE_URL }}
                  originWhitelist={['*']}
                  startInLoadingState={false}
                  // startInLoadingState={true}
                  // cacheEnabled={true}
                  // domStorageEnabled={true}
                  // 
                  onLoadStart={onLoadStart}
                  onLoadEnd={onLoadEnd}
                  onNavigationStateChange={onNavigationStateChange}
                  onError={onError}
                  onMessage={onMessage}
                  injectedJavaScriptBeforeContentLoaded={injectedBefore}
                  javaScriptEnabled={true}
                  // domStorageEnabled={true}
                  allowFileAccess={true}
                /> */}
                <WebView
                  ref={(r) => (webviewRef.current = r)}
                  source={{ uri: REMOTE_URL }}
                  originWhitelist={['*']}
                  onLoadStart={onLoadStart}
                  onLoadEnd={onLoadEnd}
                  onNavigationStateChange={onNavigationStateChange}
                  onError={onError}
                  onMessage={onMessage}
                  injectedJavaScriptBeforeContentLoaded={injectedBefore}
                  javaScriptEnabled={true}
                  allowFileAccess={true}
                  injectedJavaScript={`
    const localStorageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      localStorageData[key] = localStorage.getItem(key);
    }
    window.ReactNativeWebView.postMessage(JSON.stringify(localStorageData));
    true;
  `}
                />


                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007EA" />
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default SnapView;

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
