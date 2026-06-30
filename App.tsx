import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ErrorBoundary } from 'react-error-boundary';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './android/app/src/navigation/NavigationService';
import messaging from '@react-native-firebase/messaging';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LoginScreen from './components/LoginPage/LoginPage';
import HomeScreen from './screens/HomeScreen';
import CameraPage from './components/CameraPage/CameraPage';
import CreditLimitRequest from './components/CreditLimitRequest/CreditLimitRequest';
import NewAccountRequest from './components/NewAccountRequest/NewAccountRequest';
import Collection from './components/Collection/Collection';
import CollectionEdit from './components/CollectionEdit/CollectionEdit';
import MonthlyExpenseReport from './components/MonthlyExpenseReport/MonthlyExpenseReport';
import PackingAutomation from './components/PackingAutomation/PackingAutomation';
import SnapView from './components/SnapView/SnapView';
import CollectionList from './components/CollectionList/CollectionList';
import DailyCollectionReport from './components/DailyCollectionReport/DailyCollectionReport';
import InquiryList from './components/InquiryList/InquiryList';
import SudamoProdOrder from './components/SudamoProdOrder/SudamoProdOrder';
import YarnPurchaseOrder from './components/YarnPurchaseOrder/YarnPurchaseOrder';
import GreyPurchaseOrder from './components/GreyPurchaseOrder/GreyPurchaseOrder';
import GreySalesOrder from './components/GreySalesOrder/GreySalesOrder';
import ProdOrderTracking from './components/ProdOrderTracking/ProdOrderTracking';
import SalesOrderTracking from './components/SalesOrderTracking/SalesOrderTracking';
import SOPartyDetails from './components/SalesOrderTracking/SOPartyDetails/SOPartyDetails';
import SOPartyDetailsPart1 from './components/SalesOrderTracking/SOPartyDetailsPart1/SOPartyDetailsPart1';
import Settings from './components/Settings/Settings';
import Receivables from './components/Receivables/Receivables';
import Payable from './components/Payable/Payable';
import TakaCheckingEntry from './components/TakaCheckingEntry/TakaCheckingEntry';
import TakaCheckingViewData from './components/TakaCheckingViewData/TakaCheckingViewData';
import InquiryAdd from './components/InquiryAdd/InquiryAdd';
import Footer from './components/Footer/Footer';
// import PurchaseImportAuth from './components/PurchaseImportAuth/PurchaseImportAuth'
import NetworkSpeed from './components/NetworkSpeed/NetworkSpeed';
import {
  Alert,
  BackHandler,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import Snackbar from 'react-native-snackbar';
import RNFS from 'react-native-fs';
import AccessDeniedModal from './components/AccessDeniedModal/AccessDeniedModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FullScreenLoader from './components/FullScreenLoader/FullScreenLoader';
import {
  fetchMasterSyncPartyData,
  getPrptypeFolder,
  getPrptypeIndex,
  getPrptypeSummary,
  initFileSystem,
  readPrptypeCache,
} from './common/API/Functions';
// import DashboardScreen from './screens/DashboardScreen';
import { initDatabase } from './common/API/DatabaseManager';
import { ThemeProvider } from './android/app/src/ThemeContext';
import { API, initAPI } from './common/API/dynamicAPI';
import { handleNotification } from './android/app/src/utils/notificationHandler';
import SalesAnalysis from './components/SalesAnalysis/SalesAnalysis';
import { initDB } from './common/utils/chatDB';
import {
  initGlobalCacheDB,
  updateGlobalCacheInBackground,
} from './common/utils/sqliteCacheManager';
import { initDb } from './components/Event/db'
import OrderScreen from './components/SalesOrderNew/OrderScreen';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import CheckingScanner from './components/CheckingScanner/CheckingScanner';
import YarnStockVerification from './components/YarnStockVerification/YarnStockVerification';
import PurchaseOrderTracking from './components/PurchaseOrderTracking/PurchaseOrderTracking';
import SalesOrderInActive from './components/SalesOrderInActive/SalesOrderInActive';
import ItemAuthorization from './components/ItemAuthorization/ItemAuthorization';
import ProcessCompleteAuth from './components/ProcessCompleteAuth/ProcessCompleteAuth';
import ReceivablesSudamo from './components/ReceivablesSudamo/ReceivablesSudamo';
import FebricStock from './components/FebricStock/FebricStock';
import DailyPaymentReport from './components/DailyPaymentReport/DailyPaymentReport';
import BeamClose from './components/BeamClose/BeamClose';
import DesignAuthorization from './components/DesignAuthorization/DesignAuthorization';
import CreelManagementSystem from './components/CreelManagementSystem/CreelManagementSystem';
import BeamGaiting from './components/BeamGaiting/BeamGaiting';
import YarnStock from './components/YarnStock/YarnStock';
import YarnManagementSystem from './components/YarnManagementSystem/YarnManagementSystem';
// import PartyListScreen from './components/SalesOrderNew_08_jun/PartyListScreen';
// import OrderSummaryScreen from './components/SalesOrderNew_08_jun/OrderSummaryScreen';
// import { SalesOrderProvider } from './components/SalesOrderNew_08_jun/SalesOrderContext';
import PartyDashboard from './components/PartyDashboard/PartyDashboard';
import PartyDetailScreen from './components/PartyDashboard/PartyDetailScreen';
import ChartScreen from './components/YarnPurchaseOrder/ChartScreen';
import ProductionReport from './components/ProductionReport/ProductionReport';
// import WftIssue from './components/WftIssue/WftIssue';
import WftIssue from './components/WftIssue/WftIssue';
// import SalesOrderNew from './components/SalesOrderNew/SalesOrderNew';
// import PartyListScreen from './components/SalesOrderNew/PartyListScreen';
// import OrderSummaryScreen from './components/SalesOrderNew/OrderSummaryScreen';
// import { SalesOrderProvider } from './components/SalesOrderNew/SalesOrderContext';
import SalesOrderModule from './components/SalesOrderNew_08_jun/SalesOrderModule';
import CreelIssueReturn from './components/CreelIssueReturn/CreelIssueReturn';
import CreelIssueReturnEntry from './components/CreelIssueReturn/CreelIssueReturnEntry';
import CreelIssueReturnModifyEntry from './components/CreelIssueReturn/CreelIssueReturnModifyEntry';
import DoffEntry from './components/DoffEntry/DoffEntry';
import YarnSalesOrderModule from './components/YarnSalesOrder/YarnSalesOrderModule';
// Inquiry
// import DashboardScreen from '../screens/DashboardScreen';
import DashboardScreen from './src_inquiry/screens/DashboardScreen';
import InquiryFormScreen from './src_inquiry/screens/InquiryFormScreen';
import PartySelectionScreen from './src_inquiry/screens/PartySelectionScreen';
import AddPartyScreen from './src_inquiry/screens/AddPartyScreen';
import DesignSelectionScreen from './src_inquiry/screens/DesignSelectionScreen';
import InquiryDetailScreen from './src_inquiry/screens/InquiryDetailScreen';
import CostingScreen from './src_inquiry/screens/CostingScreen';
import SendQuotationScreen from './src_inquiry/screens/SendQuotationScreen';
import ConfirmInquiryScreen from './src_inquiry/screens/ConfirmInquiryScreen';
import RejectInquiryScreen from './src_inquiry/screens/RejectInquiryScreen';
import TatConfigScreen from './src_inquiry/screens/TatConfigScreen';
import TatAnalyticsScreen from './src_inquiry/screens/TatAnalyticsScreen';
import InquiryNotesScreen from './src_inquiry/screens/InquiryNotesScreen';
import WarehouseStack from './components/Warehouse/WarehouseStack';
import PurchaseAuth from './components/PurchaseAuth/PurchaseAuth';
import PackingAuth from './components/PackingAuth/PackingAuth'
import PdfViewerScreen from './components/YarnSalesOrder/PdfViewerScreen';
import PdfViewerScreenMain from './screens/PdfViewerScreenMain';
import ProductionMergeAuth from './components/ProductionMergeAuth/ProductionMergeAuth';
import ShadeSelectionScreen from './src_inquiry/screens/ShadeSelectionScreen';
import EmployDashboard from './components/EmployDashboard/rn-app/screens/EmployDashboard';
import CostSheetScreen from './src_inquiry/screens/CostSheetScreen';
import AuthQueueScreen from './src_inquiry/screens/AuthQueueScreen';
import AuthReviewScreen from './src_inquiry/screens/AuthReviewScreen';
import SettingsScreen from './src_inquiry/screens/SettingsScreen';
import CostSheetDesignPickerScreen from './src_inquiry/screens/CostSheetDesignPickerScreen';
import SalesExecDashboardScreen from './components/EmployDashboard/rn-app/screens/SalesExecDashboardScreen';
import PartyDashboardScreen from './components/EmployDashboard/rn-app/screens/PartyDashboardScreen';
import AppNavigator from './components/SudoSalesOrderDashboard/AppNavigator';
import PoyRateEntry from './components/PoyRateEntry/PoyRateEntry';
import PriceList from './components/PriceList/PriceList';
import SalesOrderPriceListAuth from './components/SalesOrderPriceListAuth/SalesOrderPriceListAuth'
import FebricStockVerificationModule from './components/FebricStockVerification/FebricStockVerificationModule';
import PurchaseImportAuth from './components/PurchaseImportAuth/PurchaseImportAuth';
import WeftIssueReturn from './components/WeftIssueReturn/WeftIssueReturn';
import WeftIssueReturnEntry from './components/WeftIssueReturn/WeftIssueReturnEntry';
import WeftIssueReturnModifyEntry from './components/WeftIssueReturn/WeftIssueReturnModifyEntry';
import DesignCreationModule from './components/DesignCreation/DesignCreationModule';
import InquiryReport from './components/InquiryReport/InquiryReport';
import Event from './components/Event/Event';
import EnquiryReportScreen from './components/Event/EnquiryReportScreen';
import EnquiryReportDrilldown from './components/Event/EnquiryReportDrilldownScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gettoken, setToken] = useState<string | null>('');
  const [getMenuApps, setMenuApps] = useState<string | null>('');
  const [getDecodedMenuApps, setDecodedMenuApps] = useState([]);
  const [getUserDetails, setUserDetails] = useState<string | null>('');
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [getMasterSyncData, setMasterSyncData] = useState([]);
  const [getDeviceId, setDeviceId] = useState<string | null>('');
  const [getAuth, setAuth] = useState<boolean | null>(null);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [showDeniedModalpage, setShowDeniedModalpage] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [getUserId, setUserId] = useState<number>();
  const PRPTYPE_FOLDER = `${RNFS.DocumentDirectoryPath}/prptypes/`;

  console.log("getuserId", getUserId);

  // App.tsx
  // In your App.tsx
  useEffect(() => {
    initDatabase();
    initAPI();
  }, []);

  console.log('getUserPrptype', getUserPrptype);

  useEffect(() => {
    async function getToken() {
      const n_token = await messaging().getToken();
      console.log('🔥 REAL FCM TOKEN:', n_token);
      if (n_token) {
        const notification_token = await AsyncStorage.setItem(
          'notification_token',
          n_token,
        );
        return notification_token;
      }
    }
    getToken();
  }, []);

  useEffect(() => {
    // 🔔 App background → notification click
    messaging().onNotificationOpenedApp(remoteMessage => {
      handleNotification(remoteMessage.data);
    });

    // 🔔 App kill → notification click
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          handleNotification(remoteMessage.data);
        }
      });
  }, []);

  // useEffect(() => {
  //   const unsubscribe = messaging().onMessage(async remoteMessage => {
  //     Alert.alert(
  //       remoteMessage.notification?.title,
  //       remoteMessage.notification?.body
  //     );
  //   });

  //   return unsubscribe;
  // }, []);

  const initializeDatabases = async () => {
    try {
      await initDB(); // Initialize chat.db
      await initGlobalCacheDB(); // Initialize GlobalCache.db
      // await initDb();
      console.log('✅ All databases initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing databases:', error);
      // Retry or show user-friendly error
    }
  };

  // Call this function when your app starts
  useEffect(() => {
    initializeDatabases();
  }, []);




  // Add this to your App.tsx
  useEffect(() => {
    const logMemory = setInterval(() => {
      console.log(
        `📊 Memory: ${Math.round(
          (global.performanceMemory?.usedJSHeapSize || 0) / 1024 / 1024,
        )}MB`,
      );
    }, 5000);

    return () => clearInterval(logMemory);
  }, []);

  console.log(
    'getDecodedMenuApps in Home: ',
    getDecodedMenuApps[0]?.pages[0]?.children,
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const token = await AsyncStorage.getItem('access_token');
        const user_details = await AsyncStorage.getItem('user_details');
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        const user_id = await AsyncStorage.getItem('user_id');

        console.log('user_prptype', user_prptype);

        setDeviceId(deviceId);
        setToken(token);
        setUserDetails(user_details);
        setUserPrptype(user_prptype);
        setIsLoggedIn(!!token);
        setUserId(user_id as any);

        const netState = await NetInfo.fetch();
        setIsConnected(netState.isConnected);

        SplashScreen.hide();
      } catch (error) {
        console.error('Initialization error:', error);
        SplashScreen.hide();
      } finally {
        // setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if(!isConnected) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [isConnected]);

  console.log('getUserPrptype In App', getUserPrptype);


  const initializeDatabasesEvent = async (gettoken, getUserPrptype) => {

    try {
      if (gettoken && getUserPrptype) {
        await initDb(gettoken, getUserPrptype);
        console.log('✅ Event databases and Event api called initialized successfully');
      }
    } catch (error) {
      console.error('❌ Error initializing databases:', error);
      // Retry or show user-friendly error
    }
  };

  // Call this function when your app starts
  useEffect(() => {
    if (!gettoken) return;
    if (!getUserPrptype) return;
    initializeDatabasesEvent(gettoken, getUserPrptype);
  }, [gettoken, getUserPrptype]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        Snackbar.show({
          text: 'You are back online!',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#66BB6A',
        });
        checkToken();
      } else {
        Snackbar.show({
          text: 'You are offline!',
          // duration: Snackbar.LENGTH_INDEFINITE,
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#FF5252',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const checkToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const user_details = await AsyncStorage.getItem('user_details');
      // const mastersyncData = await AsyncStorage.getItem('mastersyncData');
      setToken(token);
      setUserDetails(user_details);
      setIsLoggedIn(!!token);
      if (token) setShowDeniedModalpage(false);
      // if (mastersyncData) {
      // fetchMasterSyncPartyData(token || '', JSON.parse(mastersyncData));
      // setMasterSyncData(JSON.parse(mastersyncData));
      // console.log('✅ Mastersync Data:', JSON.parse(mastersyncData));
      // }
    } catch (error) {
      console.error('Token check error:', error);
    }
  }, []);

  const checkConnectionQuality = async () => {
    try {
      const startTime = Date.now();
      await axios.get('https://www.google.com', {
        timeout: 5000,
        validateStatus: () => true,
      });
      const pingTime = Date.now() - startTime;
      if (pingTime < 200) {
        Snackbar.show({
          text: '⚡ Excellent connection!',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#4CAF50',
        });
        return 'excellent';
      } else if (pingTime < 500) {
        Snackbar.show({
          text: '📶 Good connection',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#66BB6A',
        });
        return 'good';
      } else if (pingTime < 1000) {
        Snackbar.show({
          text: '📱 Moderate connection',
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#FFB74D',
        });
        return 'moderate';
      } else {
        Snackbar.show({
          text: '🐢 Slow connection',
          duration: Snackbar.LENGTH_LONG,
          backgroundColor: '#FF5252',
        });
        return 'slow';
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      Snackbar.show({
        text: '❌ No internet connection!',
        duration: Snackbar.LENGTH_INDEFINITE,
        backgroundColor: '#F44336',
      });
      return 'offline';
    }
  };

  useEffect(() => {
    const checkTokenLocal = async () => {
      const token = await AsyncStorage.getItem('access_token');
      const user_details = await AsyncStorage.getItem('user_details');
      // const mastersyncData = await AsyncStorage.getItem('mastersyncData');
      setToken(token);
      setUserDetails(user_details);
      setIsLoggedIn(!!token);
      SplashScreen.hide();
    };
    const checkAccess = async () => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        setDeviceId(deviceId);
      } catch (error) {
        console.error('❌ Verification failed:', error);
        Alert.alert('Error', 'Could not verify device.');
        BackHandler.exitApp();
      }
    };

    checkTokenLocal();
    checkAccess();
  }, []);

  // useEffect(() => {
  //   const inspect = async () => {
  //     // get index
  //     const { prptypes, count } = await getPrptypeIndex();
  //     console.log('🔎 Cached prptypes (count):', count, prptypes);

  //     // get full folder for single prptype
  //     const folderK = await getPrptypeFolder('K');
  //     console.log('📁 Folder K:', JSON.stringify(folderK, null, 2));

  //     // get lightweight summary for list UI
  //     for (const p of prptypes) {
  //       const s = await getPrptypeSummary(p);
  //       console.log(`• ${p} — account:${s.accountCount} banks:${s.banksCount} branches:${s.branchesCount} lastUpdated:${s.lastUpdated}`);
  //     }
  //   };

  //   inspect();
  // }, []);

  // useEffect(() => {
  //   if (getMasterSyncData.length > 0) {
  //     fetchMasterSyncPartyData(gettoken || '', getMasterSyncData);
  //   }
  // }, [getMasterSyncData]);

  const handleAuth = useCallback(async (isConnected) => {
    if (isConnected) {
      console.log('✅ Checkdevice Calling...');
      const payload = { deviceid: getDeviceId };
      // const payload = { deviceid: "bbbbbbb" };
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      try {
        setIsLoading(true);
        console.log('✅ Checkdevice Calling...');
        // const response = await axios.post('https://apig.tms-webapp.com/api/checkdevice', payload, { headers });
        const response = await axios.post(
          `https://apig.tms-webapp.com/api/checkdevice`,
          payload,
          { headers },
        );
        console.log('✅ Checkdevice API Response:', response);
        if (Number(response.data) === 1) {
          console.log('✅ Checkdevice API Response:', response, payload);
          setIsLoading(false);
          setAuth(true);
        } else {
          setIsLoading(false);
          setAuth(false);
        }
      } catch (error) {
        setIsLoading(false);
        setAuth(false);
        Alert.alert('Error', 'Server error');
      } finally {
        setIsLoading(false);
      }
    }
  }, [getDeviceId]);

  useEffect(() => {
    if (getDeviceId) {
      handleAuth(isConnected);
    }
  }, [getDeviceId, isConnected]);

  console.log('🔵 Device ID:', getDeviceId);

  useEffect(() => {
    if (getAuth === false) {
      setShowDeniedModal(true);
      setShowDeniedModalpage(true);
      setCountdown(5);
    }
  }, [getAuth]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeniedModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (showDeniedModal && countdown === 0) {
      setShowDeniedModal(false);
      BackHandler.exitApp();
    }
    return () => clearTimeout(timer);
  }, [showDeniedModal, countdown]);

  // Small presentational offline fallback
  const OfflineFallback = () => (
    <View style={styles.offlineWrap}>
      <Icon name="wifi-off" size={72} color="#FF5252" />
      <Text style={styles.offlineTitle}>No Internet Connection</Text>
      <Text style={styles.offlineSub}>
        Connect to the internet to continue using the app.
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={() => {
          checkToken();
          checkConnectionQuality();
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  function ErrorFallback({ error, resetErrorBoundary }) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorBox}>
          <Icon
            name="error-outline"
            size={48}
            color="#FF5252"
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={resetErrorBoundary}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <SafeAreaProvider>
        <ThemeProvider>
          {isLoading ? (
            <FullScreenLoader message="Verifying..." />
          ) : (
            <>
              {getAuth === true ? (
                isLoggedIn && gettoken && getUserDetails ? (
                  <NavigationContainer ref={navigationRef}>
                    {/* <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}> */}
                    <Stack.Navigator
                      initialRouteName="Home"
                      screenOptions={{ headerShown: false }}
                    >
                      {/* <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
              /> */}
                      {/* <Stack.Screen name="Dashboard">
                      {(props) => (
                        <>

                          <DashboardScreen {...props} isConnected={isConnected} username={getUserDetails || ''} />
                          <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} />
                        </>
                      )}
                    </Stack.Screen> */}

                      <Stack.Screen name="Home">
                        {props => (
                          <>
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                            <HomeScreen
                              {...props}
                              isConnected={isConnected}
                              username={getUserDetails || ''}
                              token={gettoken || ''}
                              getMenuApps={getMenuApps || ''}
                              setMenuApps={setMenuApps}
                              setDecodedMenuApps={setDecodedMenuApps}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Settings_old">
                        {props => (
                          <>
                            <Settings
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Upload">
                        {props => (
                          <CameraPage
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Credit Limit Request">
                        {props => (
                          <>
                            <CreditLimitRequest
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Sudamo Production Order">
                        {props => (
                          <>
                            <SudamoProdOrder
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Yarn Purchase Order">
                        {props => (
                          <>
                            <YarnPurchaseOrder
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="ChartScreen" component={ChartScreen} />
                      {/* <Stack.Screen name="Grey Purchase Order">{(props) =>
                      <>
                        <GreyPurchaseOrder {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                        <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} />
                      </>
                    }</Stack.Screen> */}
                      <Stack.Screen name="Sales Order">
                        {props => (
                          <>
                            <GreySalesOrder
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Production Order Tracking">
                        {props => (
                          <>
                            <ProdOrderTracking
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="New Account Request">
                        {props => (
                          <>
                            <NewAccountRequest
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            <Footer
                              onLogout={() => setIsLoggedIn(false)}
                              isConnected={isConnected}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Collection">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <CollectionList
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                              {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                            </GestureHandlerRootView>
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="CollectionAdd">
                        {props => (
                          <>
                            <Collection
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="CollectionEdit">
                        {props => (
                          <>
                            <CollectionEdit
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Monthly Expense Report">
                        {props => (
                          <>
                            <MonthlyExpenseReport
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              getDeviceId={getDeviceId}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Snap View">
                        {props => (
                          <>
                            <SnapView
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              getDeviceId={getDeviceId}
                              username={getUserDetails}
                              API={API}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      {/* <Stack.Screen name="Packing Automation">{(props) =>
                    <>
                      <PackingAutomation {...props} token={gettoken || ''} isConnected={isConnected} getDeviceId={getDeviceId} username={getUserDetails} />
                    </>
                  }</Stack.Screen> */}
                      {/* <Stack.Screen name="Inquiry">
                      {props => (
                        <>
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <InquiryList
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                              />

                            </GestureHandlerRootView>

                          </ErrorBoundary>
                        </>
                      )}
                    </Stack.Screen> */}
                      <Stack.Screen name="InquiryAdd">
                        {props => (
                          <>
                            <InquiryAdd
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="InquiryEdit">
                        {props => (
                          <>
                            <CollectionEdit
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Receivables">
                        {props => (
                          <>
                            {API === 'https://apig.tms-webapp.com' ? (
                              <ReceivablesSudamo
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                              />
                            ) : (
                              <ErrorBoundary FallbackComponent={ErrorFallback}>
                                <Receivables
                                  {...props}
                                  token={gettoken || ''}
                                  isConnected={isConnected}
                                  username={getUserDetails}
                                />
                              </ErrorBoundary>
                            )}
                          </>
                        )}
                      </Stack.Screen>
                      {/* <Stack.Screen name="Receivables">{(props) =>
                      <>
                        {API === 'https://apig.tms-webapp.com' ? <ReceivablesSudamo {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} /> :
                          <ReceivablesSudamo {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />}

                      </>
                    }</Stack.Screen> */}
                      <Stack.Screen name="Payable">
                        {props => (
                          <>
                            <Payable
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Daily Collection Report">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <DailyCollectionReport
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                              {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                            </GestureHandlerRootView>
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Taka Checking Entry">
                        {props => (
                          <>
                            <TakaCheckingEntry
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Taka Checking Entry View Data">
                        {props => (
                          <>
                            <TakaCheckingViewData
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Sales Order Tracking">
                        {props => (
                          <>
                            <SalesOrderTracking
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="SOPartyDetails">
                        {props => (
                          <>
                            <SOPartyDetails
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="SOPartyDetailsPart1">
                        {props => (
                          <>
                            <SOPartyDetailsPart1
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Sales Analysis">
                        {props => (
                          <>
                            <SalesAnalysis
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                              getUserPrptype={getUserPrptype}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Checking Scanner">
                        {props => (
                          <>
                            <CheckingScanner
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Yarn Stock Verification">
                        {props => (
                          <>
                            <YarnStockVerification
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                              getUserPrptype={getUserPrptype}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Purchase Order Tracking">
                        {props => (
                          <>
                            <PurchaseOrderTracking
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Sales Order(Inactive)">
                        {props => (
                          <>
                            <SalesOrderInActive
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Item Authorization">
                        {props => (
                          <>
                            <ItemAuthorization
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                            {/* <Footer onLogout={() => setIsLoggedIn(false)} isConnected={isConnected} /> */}
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Process complete auth.">
                        {props => (
                          <>
                            <ProcessCompleteAuth
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                              getUserPrptype={getUserPrptype}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Febric Stock">
                        {props => (
                          <>
                            <FebricStock
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                              getUserPrptype={getUserPrptype}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Daily Payment Report">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <DailyPaymentReport
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </GestureHandlerRootView>
                          </>
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Beam Close">
                        {props => (
                          <>
                            <BeamClose
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Design Authorization">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <DesignAuthorization
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </GestureHandlerRootView>
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Creel Management System">
                        {props => (
                          <>
                            <ErrorBoundary FallbackComponent={ErrorFallback}>
                              <CreelManagementSystem
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                userid={getUserId}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </ErrorBoundary>
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Beam Gaiting">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <BeamGaiting
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </GestureHandlerRootView>
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Yarn Stock">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <YarnStock
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </GestureHandlerRootView>
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Yarn Management System">
                        {props => (
                          <>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <YarnManagementSystem
                                {...props}
                                token={gettoken || ''}
                                isConnected={isConnected}
                                username={getUserDetails}
                                setIsLoggedIn={setIsLoggedIn}
                                rightsMenuApps={
                                  (getDecodedMenuApps &&
                                    getDecodedMenuApps[0]?.pages[0]?.children) ||
                                  []
                                }
                              />
                            </GestureHandlerRootView>
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Party Dashboard">
                        {props => (
                          <>
                            <PartyDashboard
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name="PartyDetailScreen"
                        component={PartyDetailScreen}
                      />

                      <Stack.Screen name="Weft Issue">
                        {props => (
                          <>
                            <WftIssue
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Sales Order Entry">
                        {props => (
                          <OrderScreen
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                            userid={getUserId}
                          />
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Sudamo Sales Order Entry">
                        {props => (
                          <SalesOrderModule
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                          />
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Sales Order Dashborad">
                        {props => (
                          <AppNavigator
                            {...props}
                            token={gettoken || ''}
                            apiBase={API}
                          />
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Warehouse">
                        {props => (
                          <WarehouseStack
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                            userid={getUserId}
                          />
                        )}
                      </Stack.Screen>


                      <Stack.Screen name="Purchase Auth">
                        {props => (
                          <PurchaseAuth
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                          />
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Production Report">
                        {props => (
                          <>
                            <ProductionReport
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </>
                        )}
                      </Stack.Screen>

                      <Stack.Screen name="Creel Issue Return">{(props) =>
                        <>
                          <CreelIssueReturn {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="CreelIssueReturnEntry" component={CreelIssueReturnEntry} />
                      <Stack.Screen name="CreelIssueReturnModifyEntry" component={CreelIssueReturnModifyEntry} />
                      <Stack.Screen name="Doff Entry">
                        {props => (
                          <>
                            <DoffEntry
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Yarn Sales Order">
                        {props => (
                          <SafeAreaProvider>
                            <YarnSalesOrderModule
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                              userid={getUserId}
                            />

                          </SafeAreaProvider>
                        )}
                      </Stack.Screen>
                      {/* For Inquiry */}
                      <Stack.Screen name="Inquiry" options={{ title: 'Fabric Inquiries' }}>
                        {props => (
                          <DashboardScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="InquiryForm" options={{ title: 'New Inquiry' }}>
                        {props => (
                          <InquiryFormScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="PartySelection" options={{ title: 'Select Party' }}>
                        {props => (
                          <PartySelectionScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="AddParty" options={{ title: 'Add New Party' }}>
                        {props => (
                          <AddPartyScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="DesignSelection" options={{ title: 'Select Design' }}>
                        {props => (
                          <DesignSelectionScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="InquiryDetail" options={{ title: 'Inquiry Details' }}>
                        {props => (
                          <InquiryDetailScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Costing" options={{ title: 'Add Costing' }}>
                        {props => (
                          <CostingScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="SendQuotation" options={{ title: 'Send Quotation' }}>
                        {props => (
                          <SendQuotationScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="ConfirmInquiry" options={{ title: 'Confirm Inquiry' }}>
                        {props => (
                          <ConfirmInquiryScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="RejectInquiry" options={{ title: 'Reject Inquiry' }}>
                        {props => (
                          <RejectInquiryScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="TatConfig" options={{ title: 'TAT Configuration' }}>
                        {props => (
                          <TatConfigScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="TatAnalytics" options={{ title: 'TAT Analytics' }}>
                        {props => (
                          <TatAnalyticsScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="InquiryNotes" options={{ title: 'Notes' }}>
                        {props => (
                          <InquiryNotesScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="CostSheet" options={{ title: 'Notes' }}>
                        {props => (
                          <CostSheetScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="AuthQueue" options={{ title: 'Notes' }}>
                        {props => (
                          <AuthQueueScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="AuthReview" options={{ title: 'Notes' }}>
                        {props => (
                          <AuthReviewScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Settings" options={{ title: 'Notes' }}>
                        {props => (
                          <SettingsScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="ShadeSelection" options={{ title: 'Shade Selection' }}>
                        {props => (
                          <ShadeSelectionScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="CostSheetDesignPicker" options={{ title: 'Shade Selection' }}>
                        {props => (
                          <CostSheetDesignPickerScreen
                            {...props}
                            username={getUserDetails}
                            getUserId={getUserId}
                            getUserPrptype={getUserPrptype}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Packing Grade Auth">
                        {props => (
                          <PackingAuth
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="PdfViewerScreenMain">
                        {screenProps => (
                          <PdfViewerScreenMain
                            {...screenProps}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails || ''}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Production Merge Auth">
                        {props => (
                          <ProductionMergeAuth
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                          />
                        )}
                      </Stack.Screen>
                      {/* Employ Dashboard */}
                      <Stack.Screen name="Employ Dashboard">
                        {props => (
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <EmployDashboard
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </ErrorBoundary>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="SalesExecDashboard">
                        {props => (
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <SalesExecDashboardScreen
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </ErrorBoundary>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="PartyDashboardNew">
                        {props => (
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <PartyDashboardScreen
                              {...props}
                              token={gettoken || ''}
                              isConnected={isConnected}
                              username={getUserDetails}
                            />
                          </ErrorBoundary>
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Poy Rate Entry">{(props) =>
                        <>
                          <PoyRateEntry {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="Price List">{(props) =>
                        <>
                          <PriceList {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="PoyRateEntry" component={PoyRateEntry} />
                      <Stack.Screen name="Sales Order Price List Auth">{(props) =>
                        <>
                          <SalesOrderPriceListAuth {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="Febric Stock Verification">
                        {props => (
                          <FebricStockVerificationModule
                            {...props}
                            token={gettoken || ''}
                            isConnected={isConnected}
                            username={getUserDetails}
                            userid={getUserId}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen name="Inquiry Report">{(props) =>
                        <>
                          <InquiryReport {...props} token={gettoken || ''} username={getUserDetails} getUserPrptype={getUserPrptype} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="Purchase Import Auth">{(props) =>
                        <>
                          <PurchaseImportAuth {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="Weft Issue Return">{(props) =>
                        <>
                          <WeftIssueReturn {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />

                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="WeftIssueReturnEntry" component={WeftIssueReturnEntry} />
                      <Stack.Screen name="WeftIssueReturnModifyEntry" component={WeftIssueReturnModifyEntry} />
                      <Stack.Screen name="Event">{(props) =>
                        <>
                          <Event {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="EnquiryReportScreen">{(props) =>
                        <>
                          <EnquiryReportScreen {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                        </>
                      }</Stack.Screen>
                      <Stack.Screen name="EnquiryReportDrilldown">{(props) =>
                        <>
                          <EnquiryReportDrilldown {...props} token={gettoken || ''} isConnected={isConnected} username={getUserDetails} />
                        </>
                      }</Stack.Screen>
                    </Stack.Navigator>
                    {/* </Stack.Navigator> */}


                  </NavigationContainer >
                ) : isConnected === false ? (
                  <OfflineFallback />
                ) : (
                  <LoginScreen
                    setIsLoggedIn={setIsLoggedIn}
                    setToken={setToken}
                    getDeviceId={getDeviceId}
                    isConnected={isConnected}
                    setUserDetails={setUserDetails}
                    setMenuApps={setMenuApps}
                  />
                )
              ) : (
                <AccessDeniedModal
                  visible={showDeniedModal}
                  visiblepage={showDeniedModalpage}
                  countdown={countdown}
                  onClose={() => {
                    setShowDeniedModal(false);
                    BackHandler.exitApp();
                  }}
                  checkToken={checkToken}
                  checkConnectionQuality={checkConnectionQuality}
                  isLoading={isLoading}
                />
              )
              }
            </>
          )}
        </ThemeProvider >
      </SafeAreaProvider >
    </>
  );
}

const styles = StyleSheet.create({
  offlineWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F6F7FA',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    color: '#333',
  },
  offlineSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: '#5B2EA6',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Semi-transparent overlay
    padding: 20,
  },
  errorBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#FFEBEE', // Light red border
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F', // Dark red
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  error: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: 'red' },
});
function preview(account: any, arg1: number): any {
  throw new Error('Function not implemented.');
}
