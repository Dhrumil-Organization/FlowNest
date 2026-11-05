// import AppAlert from '@/common/utils/appAlert';
// // MonthlyExpenseReport.tsx
// import { API } from '@/common/API/dynamicAPI';
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { WebView, WebViewNavigation } from 'react-native-webview';
// import { getCredentialsForPropertySwitch } from '../../lib/biometricAuth';
// // import { API, initAPI } from '../../common/API/dynamicAPI';

// interface Props {
//   token: string | null;
//   deviceId: string | null;
//   username: string;
// }

// // const REMOTE_URL = 'http://192.168.13.130:3001/mob-snap-view';
// // const REMOTE_URL = 'https://dash.tms-webapp.com/mob-snap-view';



// // Hard-coded device id (change if you want)
// const HARDCODED_DEVICE_ID = 'DEVICE-12345-ANDROID';

// const SnapView: React.FC<Props> = ({ token, deviceId, username }) => {
//   const webviewRef = useRef<WebView | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [canGoForward, setCanGoForward] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [getLoginName, setLoginName] = useState<string | null>(null);
//   const [getLoginPasswd, setLoginPasswd] = useState<string | null>(null);

//   let user_details_name: string | null = null;
//   let user_details_Passwd: string | null = null;

//   useEffect(() => {
//     const createImageBitmap = async () => {
//       try {
//         const credentials = await getCredentialsForPropertySwitch();
//         user_details_name = credentials?.username || null;
//         user_details_Passwd = credentials?.password || null;
//         setLoginName(user_details_name);
//         setLoginPasswd(user_details_Passwd);
//         console.log('AsyncStorage values:', user_details_name, user_details_Passwd); // Check karein
//         return { user_details_name: user_details_name, user_details_Passwd: user_details_Passwd };
//       } catch (error) {
//         console.error("Initialization error:", error);
//         return { user_details_name: null, user_details_Passwd: null };
//       }
//     };
//     createImageBitmap();
//   }, []);

//   console.log('AsyncStorage values:', user_details_name, user_details_Passwd, deviceId);
//   // const credentials = await getCredentialsForPropertySwitch();
//   // user_details_name = credentials.username;
//   // user_details_Passwd = credentials.password;

//   const REMOTE_URL = API == "https://apig.tms-webapp.com" ? "https://dash.tms-webapp.com/mob-snap-view" : API == "https://apiy.tms-webapp.com" ? "https://viz.tms-webapp.com/mob-snap-view" : "";
//   // const REMOTE_URL = API == "https://apig.tms-webapp.com" ? "http://192.168.13.130:3001/mob-snap-view" : API == "https://apiy.tms-webapp.com" ? "http://192.168.13.130:3001/mob-snap-view" : "";

//   console.log('Snap View API:', API, REMOTE_URL);

//   console.log('snap token', token);
//   console.log('deviceId', deviceId);
//   console.log('username', username);

//   // useEffect(() => {
//   //   const initializeApp = async () => {
//   //     try {
//   //       // const user_details_name = await AsyncStorage.getItem('login_user_name');
//   //       // const user_details_Passwd = await AsyncStorage.getItem('login_user_passwd');
//   //       console.log('AsyncStorage values:', user_details_name, user_details_Passwd); // Check karein
//   //       setLoginName(user_details_name);
//   //       setLoginPasswd(user_details_Passwd);
//   //     } catch (error) {
//   //       console.error("Initialization error:", error);
//   //     }
//   //   };
//   //   initializeApp();
//   // }, []);


//   console.log('getLoginName', JSON.stringify(deviceId), JSON.stringify(getLoginName), JSON.stringify(getLoginPasswd));
//   // Minimal injected JS: set deviceID in localStorage before content loads
//   const injectedBefore = useMemo(() => {
//     return `
//       try {
//         // Clear all localStorage
//         localStorage.clear();

//         // Set values from state
//         localStorage.setItem('deviceID', ${JSON.stringify(deviceId)});
//         localStorage.setItem('login_user_name', ${JSON.stringify(getLoginName)});
//         localStorage.setItem('login_user_passwd', ${JSON.stringify(getLoginPasswd)});
//       } catch (e) {
//         // ignore errors
//       }
//       true;
//     `;
//   }, [deviceId, getLoginName, getLoginPasswd]);


//   // const injectedBefore = useMemo(() => {
//   //   return `
//   //     try {
//   //       // Set only deviceID (string)
//   //       localStorage.setItem('deviceID', ${JSON.stringify(deviceId)});
//   //     } catch (e) {
//   //       // ignore errors
//   //     }
//   //     true;
//   //   `;
//   // }, [deviceId]);


//   const onNavigationStateChange = (navState: WebViewNavigation) => {
//     setCanGoBack(!!navState.canGoBack);
//     setCanGoForward(!!navState.canGoForward);
//   };

//   const onLoadStart = () => {
//     setLoading(true);
//     setError(null);
//   };

//   const onLoadEnd = () => {
//     setLoading(false);
//   };

//   const onError = (syntheticEvent: any) => {
//     const { nativeEvent } = syntheticEvent;
//     console.error('WebView error', nativeEvent);
//     setLoading(false);
//     setError(nativeEvent.description || 'Failed to load page');
//     // optional alert
//     if (__DEV__) {
//       AppAlert.alert('WebView error', nativeEvent.description || 'Failed to load page');
//     }
//   };

//   const handleReload = () => {
//     setError(null);
//     webviewRef.current?.reload();
//   };

//   const handleForward = () => {
//     if (canGoForward) webviewRef.current?.goForward();
//   };

//   // small message handler (not required but kept simple)
//   // const onMessage = useCallback((event: any) => {
//   //   // if page posts messages, we log them
//   //   try {
//   //     const msg = event.nativeEvent?.data;
//   //     console.log('[WebView message]', msg);
//   //   } catch (e) { }
//   // }, []);
//   const onMessage = useCallback((event: any) => {
//     try {
//       const localStorageData = JSON.parse(event.nativeEvent?.data);
//       console.log('LocalStorage data from WebView:', localStorageData);
//     } catch (e) {
//       console.error('Failed to parse localStorage data:', e);
//     }
//   }, []);


//   return (
//     <View style={styles.container}>
//       {/* header */}
//       {/* <View style={styles.header}>
//         <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
//           <Icon name="arrow-back" size={22} color={canGoBack ? '#000' : '#999'} />
//         </TouchableOpacity>

//         <View style={styles.headerTitle}>
//           <Text numberOfLines={1} style={styles.titleText}>Monthly Expense Report</Text>
//         </View>

//         <TouchableOpacity onPress={handleForward} style={styles.iconBtn}>
//           <Icon name="arrow-forward" size={22} color={canGoForward ? '#000' : '#999'} />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={handleReload} style={styles.iconBtn}>
//           <Icon name="refresh" size={22} color="#000" />
//         </TouchableOpacity>
//       </View> */}
//       {/* <HeaderBarwithBackWebUI
//         userName={username}
//         header={'Snap View'}
//         subHeader={'Manage your data here'}
//       /> */}

//       {/* WebView */}
//       <View style={styles.webviewWrap}>
//         {error ? (
//           <View style={styles.center}>
//             <Text style={styles.errorText}>Failed to load page</Text>
//             <Text style={styles.errorDesc}>{error}</Text>
//             <TouchableOpacity style={styles.retryBtn} onPress={handleReload}>
//               <Text style={styles.retryText}>Retry</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <>
//             {getLoginName && getLoginPasswd && (
//               <>
//                 {/* <WebView
//                   ref={(r) => (webviewRef.current = r)}
//                   source={{ uri: REMOTE_URL }}
//                   originWhitelist={['*']}
//                   startInLoadingState={false}
//                   // startInLoadingState={true}
//                   // cacheEnabled={true}
//                   // domStorageEnabled={true}
//                   // 
//                   onLoadStart={onLoadStart}
//                   onLoadEnd={onLoadEnd}
//                   onNavigationStateChange={onNavigationStateChange}
//                   onError={onError}
//                   onMessage={onMessage}
//                   injectedJavaScriptBeforeContentLoaded={injectedBefore}
//                   javaScriptEnabled={true}
//                   // domStorageEnabled={true}
//                   allowFileAccess={true}
//                 /> */}
//                 <WebView
//                   ref={(r) => (webviewRef.current = r)}
//                   source={{ uri: REMOTE_URL }}
//                   originWhitelist={['*']}
//                   onLoadStart={onLoadStart}
//                   onLoadEnd={onLoadEnd}
//                   onNavigationStateChange={onNavigationStateChange}
//                   onError={onError}
//                   onMessage={onMessage}
//                   injectedJavaScriptBeforeContentLoaded={injectedBefore}
//                   javaScriptEnabled={true}
//                   allowFileAccess={true}
//                   injectedJavaScript={`
//     const localStorageData = {};
//     for (let i = 0; i < localStorage.length; i++) {
//       const key = localStorage.key(i);
//       localStorageData[key] = localStorage.getItem(key);
//     }
//     window.ReactNativeWebView.postMessage(JSON.stringify(localStorageData));
//     true;
//   `}
//                 />


//                 {loading && (
//                   <View style={styles.loadingOverlay}>
//                     <ActivityIndicator size="large" color="#007EA" />
//                   </View>
//                 )}
//               </>
//             )}
//           </>
//         )}
//       </View>
//     </View>
//   );
// };

// export default SnapView;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   header: {
//     height: 48,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 6,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
//   headerTitle: { flex: 1, paddingHorizontal: 8 },
//   titleText: { fontSize: 16, fontWeight: '600' },
//   webviewWrap: { flex: 1 },
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
//   errorText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
//   errorDesc: { textAlign: 'center', marginBottom: 12, color: '#666' },
//   retryBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#007bff', borderRadius: 6 },
//   retryText: { color: '#fff', fontWeight: '600' },
//   loadingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.6)',
//   },
// });

import { API } from '@/common/API/dynamicAPI';
import AppAlert from '@/common/utils/appAlert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { getCredentialsForPropertySwitch } from '../../lib/biometricAuth';

interface Props {
  token: string | null;
  deviceId: string | null;
  username: string;
}

const isWeb = Platform.OS === 'web';

// Hard-coded device id (change if you want)
const HARDCODED_DEVICE_ID = 'BE2A.250530.026.F3';

const SnapView: React.FC<Props> = ({ token, deviceId = HARDCODED_DEVICE_ID, username }) => {
  const webviewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);   // web only

  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [getLoginName, setLoginName] = useState<string | null>(null);
  const [getLoginPasswd, setLoginPasswd] = useState<string | null>(null);


  // ---------- Load credentials once ----------
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentials = await getCredentialsForPropertySwitch();
        setLoginName(credentials?.username || null);
        setLoginPasswd(credentials?.password || null);
        console.log('Credentials loaded:', credentials?.username);
      } catch (error) {
        console.error('Credential init error:', error);
      }
    };
    loadCredentials();
  }, []);

  // ---------- Remote URL by tenant ----------
  const REMOTE_URL =
    API === 'https://apig.tms-webapp.com'
      ? 'https://dash.tms-webapp.com/mob-snap-view'
      : API === 'https://apiy.tms-webapp.com'
        ? 'https://viz.tms-webapp.com/mob-snap-view'
        : '';

  console.log('Snap View API:', API, REMOTE_URL);

  // ---------- WEB URL with credentials in query string ----------
  const webUrl = useMemo(() => {
    if (!isWeb || !REMOTE_URL) return REMOTE_URL;
    try {
      const u = new URL(REMOTE_URL);
      if (deviceId) u.searchParams.set('deviceID', deviceId);
      console.log('getLoginName', JSON.stringify(deviceId), JSON.stringify(getLoginName), JSON.stringify(getLoginPasswd));
      if (getLoginName) u.searchParams.set('login_user_name', getLoginName);
      if (getLoginPasswd) u.searchParams.set('login_user_passwd', getLoginPasswd);
      return u.toString();
    } catch {
      return REMOTE_URL;
    }
  }, [REMOTE_URL, deviceId, getLoginName, getLoginPasswd]);


  useEffect(() => {
    if (isWeb && webUrl) {
      console.log('========================================');
      console.log('🌐 SNAP VIEW IFRAME TEST URL:', webUrl);
      console.log(webUrl);
      console.log('========================================');
    }
  }, [webUrl]);

  // ---------- NATIVE injected JS (unchanged) ----------
  const injectedBefore = useMemo(
    () => `
      try {
        localStorage.clear();
        localStorage.setItem('deviceID', ${JSON.stringify(deviceId)});
        localStorage.setItem('login_user_name', ${JSON.stringify(getLoginName)});
        localStorage.setItem('login_user_passwd', ${JSON.stringify(getLoginPasswd)});
      } catch (e) {}
      true;
    `,
    [deviceId, getLoginName, getLoginPasswd],
  );

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(!!navState.canGoBack);
    setCanGoForward(!!navState.canGoForward);
  };

  const onLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const onLoadEnd = () => setLoading(false);

  const onError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error', nativeEvent);
    setLoading(false);
    setError(nativeEvent.description || 'Failed to load page');
    if (__DEV__) {
      AppAlert.alert('WebView error', nativeEvent.description || 'Failed to load page');
    }
  };

  const handleReload = () => {
    setError(null);
    if (isWeb) {
      if (iframeRef.current) iframeRef.current.src = webUrl;
    } else {
      webviewRef.current?.reload();
    }
  };

  const handleForward = () => {
    if (canGoForward) webviewRef.current?.goForward();
  };

  const onMessage = useCallback((event: any) => {
    try {
      const localStorageData = JSON.parse(event.nativeEvent?.data);
      console.log('LocalStorage data from WebView:', localStorageData);
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
  }, []);

  // ---------- WEB: after iframe loads, push credentials via postMessage ----------
  const handleIframeLoad = () => {
    setLoading(false);
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const payload = {
        type: 'SET_CREDENTIALS',
        deviceID: deviceId,
        login_user_name: getLoginName,
        login_user_passwd: getLoginPasswd,
      };
      // '*' is required because the target is a different origin
      win.postMessage(payload, '*');
      console.log('[WebView bridge] posted credentials to iframe', webUrl);
    } catch (e) {
      console.warn('postMessage failed:', e);
    }
  };

  // ---------- Only render WebView/iframe once credentials are ready ----------
  const ready = !!getLoginName && !!getLoginPasswd;

  return (
    <View style={styles.container}>
      <View style={styles.webviewWrap}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load page</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReload}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : ready ? (
          <>
            {isWeb ? (
              // ---------------- WEB ----------------
              <>
                {React.createElement('iframe', {
                  ref: (el: HTMLIFrameElement | null) => {
                    iframeRef.current = el;
                  },
                  src: webUrl,
                  title: 'Snap View',
                  onLoad: handleIframeLoad,
                  // Web-safe iframe attrs
                  allow: 'clipboard-read; clipboard-write; fullscreen',
                  sandbox:
                    'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation',
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    backgroundColor: '#fff',
                  } as any,
                })}

                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007EA" />
                  </View>
                )}
              </>
            ) : (
              // ---------------- NATIVE ----------------
              <>
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
                  javaScriptEnabled
                  domStorageEnabled
                  allowFileAccess
                  allowUniversalAccessFromFileURLs
                  mixedContentMode="always"
                />

                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007EA" />
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#007EA" />
            <Text style={{ marginTop: 12, color: '#666' }}>Loading credentials…</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// export default SnapView;



const SnapViewContainer: React.FC<Props> = (props) => {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={() => setReloadKey(prev => prev + 1)}
        >
          <Text style={styles.reloadText}>↻ Reload</Text>
        </TouchableOpacity>
      </View>

      <SnapView
        key={reloadKey}
        {...props}
      />
    </View>
  );
};


export default SnapViewContainer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  }
  ,
  reloadButton: { paddingHorizontal: 8, paddingVertical: 6 },
  reloadText: { fontSize: 16, fontWeight: '600' },
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
  webviewWrap: { flex: 1, position: 'relative' },
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