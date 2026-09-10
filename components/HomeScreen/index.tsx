/////// [3] /////////
import { initDatabase } from '@/common/API/DatabaseManager';
import { API, initAPI } from '@/common/API/dynamicAPI';
import { fetchMasterSyncPartyDataPerPrptypeCache, getPrptypeSummary, normalizePrptype } from '@/common/API/Functions';
import { HOME_TOUR } from '@/common/TourJson';
import TourOverlay from '@/common/TourOverlay';
import { setCustomUsername } from '@/common/utils/feedbackStorage';
import { buildProfileFromLogin } from '@/common/utils/profileStorage';
import { fetchAndCacheGlobalData, initGlobalCacheDB } from '@/common/utils/sqliteCacheManager';
import Header from '@/components/Header';
import { getCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { isOnline } from '../Event/CardScanService';

const { width } = Dimensions.get('window');
const getNumColumns = () => {
    if (width >= 768 && width < 1024) return 4;
    if (width >= 1024) return 5;
    return 3;
};
const NUM_COLUMNS = getNumColumns();
const ITEM_SIZE = (width - 40) / NUM_COLUMNS;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// How many "frequent" apps to show collapsed
const FREQUENT_COLLAPSED_COUNT = 2;
// Minimum clicks before an app is considered "frequent"
const FREQUENT_MIN_CLICKS = 1;

interface Props {
    username?: string;
    online?: boolean;
}


async function savePropertySwitchLoginState(args: {
    response: any;
    token: string;
    userDetails: string;
    userMenuApps: any;
    userOf: any;
    yno: any;
    role1: any;
    userId: any;
    user: any;
    userLoginFrom: string;
    isMasterSync: any;
    masterSyncData: any[];
    username: string;
    password: string;
}) {
    const {
        response,
        token,
        userDetails,
        userMenuApps,
        userOf,
        yno,
        role1,
        userId,
        user,
        userLoginFrom,
        isMasterSync,
        masterSyncData,
        username,
        password,
    } = args;

    // Keep switch credentials in the same OS-secure store used by the
    // New ERP property switch.
    const { saveCredentialsForPropertySwitch } =
        await import('@/src/lib/biometricAuth');

    await saveCredentialsForPropertySwitch(
        username.trim(),
        password.trim()
    );

    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('user_details', userDetails);
    await AsyncStorage.setItem('user_menu_apps', userMenuApps);
    await AsyncStorage.setItem('user_prptype', userOf);
    await AsyncStorage.setItem('login_user_name', username.trim());
    await AsyncStorage.setItem('login_user_passwd', password.trim());
    await AsyncStorage.setItem('yno', String(yno || '').trim());
    await AsyncStorage.setItem('user_login_role', JSON.stringify(role1));
    await AsyncStorage.setItem('user_id', JSON.stringify(userId));
    await AsyncStorage.setItem(
        'mobile_raw_login_response',
        JSON.stringify(response || {})
    );

    await buildProfileFromLogin({
        access_token: token,
        user,
        role1,
        userof: userOf,
        usermenu: userMenuApps,
        year: response?.year,
        ismastersync: isMasterSync,
        mastersyncprptypes: masterSyncData,
    });

    await AsyncStorage.setItem(
        'master_sync_data_common',
        JSON.stringify(masterSyncData)
    );

    if (userLoginFrom) {
        await AsyncStorage.setItem('new_user', 'true');
    }
}

const HomeScreen: React.FC<Props> = ({ navigation, username }) => {
    const [search, setSearch] = useState('');
    const [apps, setApps] = useState<any[]>([]);
    // const [selectedLetter, setSelectedLetter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
    const [showAllFrequent, setShowAllFrequent] = useState(false);
    const [online, setOnline] = useState(false);

    // const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const [prp, setPrp] = useState<string | null>(null);
    const [checkDevice, setCheckDevice] = useState<string | null>(null);
    const [showHeaderTour, setShowHeaderTour] =
        useState(false);

    const [showHomeTour, setShowHomeTour] =
        useState(false);

    // Property switch is available only when the successful login response
    // explicitly contains switchuserlogin = 1.
    const [switchUserLogin, setSwitchUserLogin] = useState(false);
    const [switchingProperty, setSwitchingProperty] = useState(false);

    const ENABLE_DEVICE_CHECK = true;

    console.log("home screen device online: ", online);

    async function checkConnectivity() {
        const result = await isOnline();
        console.log("home screen device online parent :", result);
        setOnline(result);
        // setOnline(false);
    }


    // useEffect(() => {

    //     const initTour = async () => {

    //         // const seen =
    //         //     await AsyncStorage.getItem(
    //         //         '@flow_home_tour_completed'
    //         //     );

    //         // if (!seen) {
    //         setTimeout(() => {
    //             setShowHomeTour(true);
    //         }, 1000);
    //         // }
    //     };

    //     initTour();

    // }, []);

    useEffect(() => {
        const load = async () => {
            const prp = await AsyncStorage.getItem("selected_property");
            const che = await AsyncStorage.getItem("ENABLE_DEVICE_CHECK");
            const rawLogin = await AsyncStorage.getItem("mobile_raw_login_response");

            setPrp(prp);
            setCheckDevice(che);

            try {
                const parsed = rawLogin ? JSON.parse(rawLogin) : null;
                setSwitchUserLogin(
                    Number(parsed?.switchuserlogin ?? 0) === 1
                );
            } catch {
                setSwitchUserLogin(false);
            }
        };
        load();
        checkConnectivity();
    }, []);

    // Load usage counts silently from storage
    useEffect(() => {
        const loadUsageCounts = async () => {
            try {
                const raw = await AsyncStorage.getItem('_app_usage_counts');
                if (raw) {
                    setUsageCounts(JSON.parse(raw));
                }
            } catch (_) { }
        };
        loadUsageCounts();
    }, []);

    const checkDeviceAccess = async () => {
        try {

            if (!ENABLE_DEVICE_CHECK) {
                return true;
            }
            if (!online) return;

            // const deviceId =
            //     await AsyncStorage.getItem(
            //         'cache_deviceId'
            //     );
            const deviceId = Device.osInternalBuildId || "test-device";
            const res = await axios.post(
                'https://apig.tms-webapp.com/api/checkdeviceios',
                {
                    deviceid: deviceId,
                    // deviceid: 'xnaldanodnndow',

                }
            );

            console.log(
                '✅ Home checkdevice:',
                res.data, deviceId
            );

            if (Number(res.data) !== 1) {

                router.replace(
                    '/access-denied'
                );

                return false;
            }

            return true;

        } catch (e) {

            console.log(
                '❌ checkDeviceAccess',
                e
            );

            return false;
        }
    };

    useEffect(() => {
        if (!checkDevice) return;
        if (checkDevice === 'true') {
            checkDeviceAccess();
        }

    }, [checkDevice]);


    const switchProperty = async (nextProperty: 'sudamo_knits' | 'rayons') => {
        if (switchingProperty) return;
        if (nextProperty === prp) return;

        const previousProperty = prp;
        setSwitchingProperty(true);

        try {
            const credentials = await getCredentialsForPropertySwitch();

            if (!credentials) {
                throw new Error(
                    'Saved login credentials are not available. Please sign in again.'
                );
            }

            // The old login.tsx uses this exact dynamic API selection.
            await AsyncStorage.setItem('selected_property', nextProperty);
            await initAPI();

            const notiToken =
                (await AsyncStorage.getItem('notification_token')) ||
                'xyz-noti-token';

            const deviceId =
                Device.osInternalBuildId || 'test-device';

            console.log('🔄 PROPERTY SWITCH API:', API);
            console.log('🔄 PROPERTY:', nextProperty);

            const response = await axios.post(
                `${API}/api/login`,
                {
                    name: credentials.username.trim(),
                    password: credentials.password.trim(),
                    noti_token: notiToken,
                    checkdevice: deviceId,
                },
                {
                    headers: { 'x-platform': 'mob' },
                }
            );

            console.log('✅ PROPERTY SWITCH RESPONSE:', response.data);

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    response.data?.response?.message ||
                    'Property switch login failed.'
                );
            }

            const loginResponse = response.data.response || {};
            const token = loginResponse.access_token;
            const user = loginResponse.user;
            const userLoginFrom = user?.regsrc || 'web';
            const userDetails = user?.first_name || 'user';
            const userAvailable = user?.is_deleted || 'user';
            const userMenuApps = loginResponse.usermenu || '';
            const isMasterSync = loginResponse.ismastersync || '';
            const masterSyncData = loginResponse.mastersyncprptypes || [];
            const userOf = loginResponse.userof;
            const yno = loginResponse?.year?.YearNo || '';
            const role1 = loginResponse.role1;
            const userId = user?.id || 0;

            if (!token || !user) {
                throw new Error('Login response is missing token or user.');
            }

            if (userAvailable === '1') {
                throw new Error(
                    'User not available. Please Register yourself by Create Account.'
                );
            }

            if (!userDetails || !userMenuApps) {
                throw new Error(
                    loginResponse?.message || 'Invalid login response.'
                );
            }

            // Same storage work as app/(auth)/login.tsx.
            await savePropertySwitchLoginState({
                response: loginResponse,
                token,
                userDetails,
                userMenuApps,
                userOf,
                yno,
                role1,
                userId,
                user,
                userLoginFrom,
                isMasterSync,
                masterSyncData,
                username: credentials.username,
                password: credentials.password,
            });

            // IMPORTANT: property switching must finish as soon as the new
            // login/session is successful. Do NOT wait for cache/master-sync
            // work here. The login screen does this work in the background,
            // and switching must behave the same way.
            setPrp(nextProperty);

            // A new response controls whether the switch remains visible.
            setSwitchUserLogin(
                Number(loginResponse?.switchuserlogin ?? 0) === 1
            );

            // Release the switch UI immediately after successful login.
            // Everything below is intentionally fire-and-forget so the user
            // can continue using the newly logged-in property without waiting
            // for SQLite/cache/master-sync requests.
            void (async () => {
                try {
                    if (userLoginFrom === 'web') {
                        await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'true');
                        await initGlobalCacheDB();

                        const cachePopulated = await isCachePopulated();
                        if (!cachePopulated) {
                            await fetchAndCacheGlobalData(token);
                        } else {
                            console.log('✅ Using existing cached data');
                        }

                        // Keep the same refresh behavior as login.tsx, but do
                        // it completely in the background after the switch.
                        await fetchAndCacheGlobalData(token);
                        await AsyncStorage.setItem(
                            'master_sync_data_common',
                            JSON.stringify(masterSyncData)
                        );

                        if (
                            isMasterSync == 1 ||
                            isMasterSync === '1' ||
                            isMasterSync === true
                        ) {
                            try {
                                await AsyncStorage.setItem(
                                    'master_sync_data',
                                    JSON.stringify(masterSyncData)
                                );
                                await initDatabase();
                                await fetchMasterSyncPartyDataPerPrptypeCache(
                                    token || '',
                                    masterSyncData
                                );

                                for (const itm of masterSyncData) {
                                    const key = normalizePrptype(
                                        itm.prptype ?? itm.PrpType ?? ''
                                    );
                                    const summary = await getPrptypeSummary(key);
                                    console.log(
                                        `→ summary for requested prptype "${itm.prptype}":`,
                                        summary
                                    );
                                }
                            } catch (err) {
                                console.warn(
                                    'Master-sync or verification failed:',
                                    err
                                );
                            }
                        }
                    } else if (userLoginFrom === 'app') {
                        await AsyncStorage.setItem('user_menu_apps', userMenuApps);
                        await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'false');
                        await setCustomUsername(userDetails);
                        await AsyncStorage.setItem('new_user', 'true');
                    }
                } catch (err) {
                    // Background cache failure must never make an already
                    // successful property switch look like a login failure.
                    console.warn('Background property cache sync failed:', err);
                }
            })();

        } catch (error: any) {
            // Never leave selected_property pointing at a property whose
            // login did not succeed.
            if (
                previousProperty === 'sudamo_knits' ||
                previousProperty === 'rayons'
            ) {
                await AsyncStorage.setItem(
                    'selected_property',
                    previousProperty
                );
                await initAPI();
            }

            setPrp(previousProperty);
            Alert.alert(
                'Property switch failed',
                error?.message || 'Unable to switch property.'
            );
        } finally {
            setSwitchingProperty(false);
        }
    };

    const replayTour = () => {

        setShowHomeTour(true);
        // setShowHeaderTour(false);

        // setTimeout(() => {
        //     setShowHeaderTour(true);
        // }, 200);

    };

    // Silently track a click — no UI feedback
    const trackUsage = async (appName: string) => {
        try {
            const updated = { ...usageCounts, [appName]: (usageCounts[appName] || 0) + 1 };
            setUsageCounts(updated);
            await AsyncStorage.setItem('_app_usage_counts', JSON.stringify(updated));
        } catch (_) { }
    };

    const handleAppPress = (item: any) => {
        trackUsage(item.name);
        router.replace(item.route);
    };

    const ALL_APPS_old = [
        { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4' },
        {
            name: 'Receivables',
            icon: 'receipt-long',
            route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
            color: '#773F3F'
        },
        { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d' },
        // { name: 'Upload', icon: 'upload', route: 'upload', color: '#2E2E2E' },
        // { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D' },
        { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006' },
        // { name: 'Grey Purchase Order', icon: 'payments', route: 'grey-purchase-order', color: '#3BAD18' },
        // { name: 'Sales Order', icon: 'point-of-sale', route: 'sales-order', color: '#20BEC1' },
        { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78' },
        // { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6' },
        { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400' },
        { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B' },
        // { name: 'Packing Automation', icon: 'receipt-long', route: 'packing-automation', color: 'rgb(194, 213, 52)' },
        // { name: 'Inquiry', icon: 'table-view', route: 'inquiry', color: 'rgb(194, 213, 52)' },
        { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313' },
        { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF' },
        // { name: 'Taka Checking Entry', icon: 'dynamic-form', route: 'taka-checking-entry', color: '#5B2CFF' },
        { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A' },
        // { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080' },
        // { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1' },
        // { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22' },
        { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080' },
        // { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080' },
        // { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080' },
        // { name: 'ProcesFs complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98' },
        // { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98' },
        { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced' },
    ];

    const ALL_APPS = [
        { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4', category: 'Finance' },
        { name: 'Outstanding Days Request', route: 'outstanding-days-request', icon: 'credit-score', color: '#4285F4', category: 'Finance' },
        {
            name: 'Receivables',
            icon: 'receipt-long',
            route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
            color: '#773F3F',
            category: 'Finance'
        },
        { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d', category: 'Finance' },
        { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006', category: 'Reports' },
        { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78', category: 'Production' },
        { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400', category: 'Reports' },
        { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B', category: 'Reports' },
        { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313', category: 'Finance' },
        { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF', category: 'Reports' },
        { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A', category: 'Production' },
        // { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080', category: 'Reports' },
        { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced', category: 'Reports' },
        { name: 'Inquiry', icon: 'table-view', route: 'Inquiry', color: 'rgb(194, 213, 52)', category: 'Production' },
        // 
        { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D', category: 'Production' },
        { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6', category: 'Finance' },
        { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080', category: 'Stocks' },
        { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080', category: 'Production' },
        { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22', category: 'Production' },
        { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080', category: 'Production' },
        { name: 'Process complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98', category: 'Production' },
        { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98', category: 'Stocks' },
        { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1', category: 'Finance' },
        { name: 'Design Authorization', route: 'design-authorization', icon: 'edit', color: '#4B0082', category: 'Production' },
        { name: 'Packing Grade Auth', route: 'packing-grade-auth', icon: 'admin-panel-settings', color: '#3a70a3c9', category: 'Production' },
        { name: 'Production Merge Auth', route: 'production-merge-auth', icon: 'merge-type', color: '#8b55d1', category: 'Production' },
        { name: 'Creel Management System', route: 'creel-management-system', icon: 'settings-system-daydream', color: '#008080', category: 'Production' },
        { name: 'Beam Gaiting', route: 'beam-gaiting', icon: 'edit', color: '#142af5', category: 'Production' },
        { name: 'Yarn Management System', route: 'yarn-management-system', icon: 'inventory', color: '#4B0082', category: 'Production' },
        { name: 'Weft Issue', route: 'weft-issue', icon: 'precision-manufacturing', color: '#4169E1', category: 'Production' },
        { name: 'Party Dashboard', route: 'party-dashboard', icon: 'precision-manufacturing', color: '#4169E1', category: 'Finance' },
        { name: 'Production Report', route: 'production-report', icon: 'precision-manufacturing', color: '#4169E1', category: 'Production' },
        { name: 'Feedback', route: 'feedback', icon: 'feedback', color: '#F2D43D', category: 'details' },
        { name: 'Yarn Manufacturing', route: 'yarn-manufacturing', icon: 'touch-app', color: '#008080', category: 'details' },
        { name: 'Profile', route: 'profile', icon: 'person-pin', color: '#000000', category: 'profile' },
        { name: 'Sales Order Entry', route: 'sales-order-entry', icon: 'shopping-cart-checkout', color: '#48cbef', category: 'Production' },
        { name: 'Creel Issue Return', route: 'creel-issue-return', icon: 'precision-manufacturing', color: '#4169E1', category: 'Production'  },
        { name: 'Doff Entry', route: 'doff-entry', icon: 'precision-manufacturing', color: '#4169E1', category: 'Production' },
        { name: 'Yarn Sales Order', route: 'yarn-sales-order', icon: 'shopping-cart-checkout', color: '#4169E1', category: 'Production' },
        { name: 'Event', route: 'event', icon: 'event', color: '#923070', category: 'Production' },
        { name: 'Sales Order', route: 'sales-order', icon: 'point-of-sale', color: '#20BEC1', category: 'Production' },
        { name: 'Employ Dashboard', route: 'employ-dashboard', icon: 'fact-check', color: '#5f338f', category: 'Production' },
        { name: 'Price List', route: 'price-list', icon: 'assessment', color: '#1E3A5F', category: 'Production' },
        { name: 'Sales Order Dashboard', route: 'sales-order-dashboard', icon: 'dashboard', color: '#0B7285', category: 'Production' },
        { name: 'Sales Order Price List Auth', route: 'sales-order-price-list-auth', icon: 'receipt-long', color: '#740cea', category: 'Production' },
        // { name: 'Packing Automation', route: 'packing-automation', icon: 'table-view', color: 'rgb(194, 213, 52)', category: 'Production' },
        { name: 'Poy Rate Entry', route: 'PoyRateEntry', icon: 'price-change', color: '#6A1B9A', category: 'Production' },
        { name: 'Purchase Grade Auth', route: 'purchase-grade-auth', icon: 'fact-check', color: '#5f738f', category: 'Production' },
        { name: 'Purchase Import Auth', route: 'purchase-import-auth', icon: 'task-alt', color: '#991070', category: 'Production' },
        { name: 'Purchase Rate Auth', route: 'purchase-rate-auth', icon: 'route', color: '#7a2a49', category: 'Production' },
        { name: 'Warehouse', route: 'warehouse', icon: 'warehouse', color: '#991070', category: 'Production' },
        { name: 'Beam Close', route: 'beam-close', icon: 'assignment-turned-in', color: '#0ceebd', category: 'Production' },
        // { name: 'Creel Issue Return', route: 'creel-issue-return', icon: 'precision-manufacturing', color: '#4169E1', category: 'Production' },
        { name: 'Inquiry Report', route: 'inquiry-report', icon: 'view-comfortable', color: '#69e3ad', category: 'Production' },
        { name: 'Quarter Summary', route: 'QuarterWiseDispatch', icon: 'swap-horiz', color: '#5E35B1', category: 'Production' },
        { name: 'Weft Issue Return', route: 'weft-issue-return', icon: 'published-with-changes', color: '#4169E1', category: 'Production' },
        { name: 'Sudamo Sales Order Entry', route: 'sudamo-sales-order-entry', icon: 'shopping-cart-checkout', color: '#4169E1', category: 'Production' },
        { name: 'Fabric Stock Verification', route: 'fabric-stock-verification', icon: 'shopping-cart-checkout', color: '#4169E1', category: 'Production' },
    ];

    useEffect(() => {
        if (prp) {
            const loadApps = async () => {
                try {
                    const data = await AsyncStorage.getItem('user_menu_apps');
                    if (!data) return;
                    const decoded = atob(data);
                    // const parsed = JSON.parse(decoded);
                    const parsed = [
                        {
                            "title": "",
                            "pages": [
                                {
                                    "title": "Mobile App",
                                    "href": "#",
                                    "icon": "",
                                    "children": [
                                        {
                                            "title": "Upload",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Credit Limit Request",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Outstanding Days Request",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sudamo Production Order",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Purchase Order",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Collection",
                                            "href": "/"
                                        },
                                        {
                                            "title": "New Account Request",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sales Order",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Grey Purchase Order",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Production Order Tracking",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Monthly Expense Report",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Inquiry",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Checking Scanner",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Yarn Stock Verification",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Daily Collection Report",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sales Order(Inactive)",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Item Authorization",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Process complete auth.",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Febric Stock",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Daily Collection Report",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Daily Payment Report",
                                            "href": "/"
                                        },
                                        {

                                            "title": "Purchase Order Tracking",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sales Order Tracking",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Beam Close",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Creel Management System",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Yarn Stock",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Beam Gaiting",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Taka Checking Entry",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Yarn Management System",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Party Dashboard",
                                            "href": "/"
                                        },
                                        {

                                            "title": "Weft Issue",
                                            "href": "/"
                                        },
                                        {

                                            "title": "Design Authorization",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Packing Grade Auth",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sales Order Dashboard",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Quarter Summary",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Yarn Sales Order",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Creel Issue Return",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Weft Issue Return",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Sales Order Entry",
                                            "href": "/"
                                        },
                                        {
                                            "title": "Fabric Stock Verification",
                                            "href": "/"
                                        },                                       
                                    ]
                                }
                            ]
                        }
                    ];
                    await AsyncStorage.setItem('rightsMenuApps', JSON.stringify(parsed));
                    const mobileApp = parsed.find((item: any) =>
                        item.pages?.some((p: any) => p.title === 'Mobile App')
                    );
                    const children = mobileApp?.pages?.find(
                        (p: any) => p.title === 'Mobile App'
                    )?.children || [];
                    const allowedNames = children.map((c: any) => c.title);
                    // const filteredApps = ALL_APPS.filter(app =>
                    //     allowedNames.includes(app.name)
                    // );
                    const eventAllowed = children.some((c) => c.title === 'Event');
                    let filteredApps = ALL_APPS.filter(app =>
                        allowedNames.includes(app.name)
                    );

                    // Offline => only Event enabled
                    if (!online) {
                        filteredApps = filteredApps.map(app => ({
                            ...app,
                            disabled: app.name !== 'Event' || !eventAllowed,
                        }));
                    }
                    filteredApps.sort((a, b) => a.name.localeCompare(b.name));
                    setApps(filteredApps);
                } catch (e) {
                    console.log("❌ MENU ERROR", e);
                }
            };
            loadApps();
        }
    }, [prp]);

    const categories = useMemo(() => {
        const cats = ['All', ...new Set(apps.map(app => app.category))];
        return cats;
    }, [apps]);

    const filteredApps = useMemo(() => {
        let filtered = apps;
        if (search) {
            filtered = filtered.filter(a =>
                (a.name === 'Yarn Purchase Order' ? 'Purchase Order' : a.name)
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
        }
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(a => a.category === selectedCategory);
        }
        return filtered;
    }, [apps, search, selectedCategory]);

    const groupedApps = useMemo(() => {
        const grouped: any = {};
        filteredApps.forEach(app => {
            if (!grouped[app.category]) grouped[app.category] = [];
            grouped[app.category].push(app);
        });
        return grouped;
    }, [filteredApps]);

    // Frequent apps: sorted by usage, min 1 click, top apps
    const frequentApps = useMemo(() => {
        return apps
            .filter(app => (usageCounts[app.name] || 0) >= FREQUENT_MIN_CLICKS)
            .sort((a, b) => (usageCounts[b.name] || 0) - (usageCounts[a.name] || 0));
    }, [apps, usageCounts]);

    // What to show in the frequent section
    const visibleFrequentApps = useMemo(() => {
        if (showAllFrequent) return frequentApps;
        return frequentApps.slice(0, FREQUENT_COLLAPSED_COUNT);
    }, [frequentApps, showAllFrequent]);

    const hasMoreFrequent = frequentApps.length > FREQUENT_COLLAPSED_COUNT;

    // const scrollToLetter = (letter: string) => {
    //     const index = filteredApps.findIndex(a => a.name.startsWith(letter));
    //     if (index !== -1) {
    //         flatListRef.current?.scrollToIndex({ index, animated: true });
    //         setSelectedLetter(letter);
    //         setTimeout(() => setSelectedLetter(''), 800);
    //     }
    // };

    const CategoryChip = ({ title }: { title: string }) => (
        <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === title && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(title)}
        >
            <Text style={[styles.categoryChipText, selectedCategory === title && styles.categoryChipTextActive]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    // Display name helper
    const getDisplayName = (app: any) =>
        app.name === 'Yarn Purchase Order' ? 'Purchase Order' : app.name;

    return (
        <>
            <View style={styles.container}>
                <Header userName={username}
                    onSearch={setSearch}
                    setShowHeaderTour={setShowHeaderTour}
                    onHelpPress={replayTour} />

                {switchUserLogin && (
                    <View style={styles.propertySwitchBar}>
                        <View style={styles.propertySwitchInfo}>
                            <Text style={styles.propertySwitchLabel}>
                                PROPERTY
                            </Text>
                            <Text style={styles.propertySwitchValue}>
                                {switchingProperty
                                    ? 'Switching...'
                                    : prp === 'rayons'
                                        ? 'Rayons'
                                        : 'Sudamo / Knits'}
                            </Text>
                        </View>

                        <Switch
                            value={prp === 'rayons'}
                            onValueChange={(value) =>
                                void switchProperty(
                                    value ? 'rayons' : 'sudamo_knits'
                                )
                            }
                            disabled={switchingProperty || !prp}
                            trackColor={{
                                false: '#D0D7DE',
                                true: '#13879A',
                            }}
                            thumbColor="#FFFFFF"
                        />

                        {switchingProperty && (
                            <ActivityIndicator
                                size="small"
                                color="#13879A"
                                style={styles.propertySwitchLoader}
                            />
                        )}
                    </View>
                )}

                {/* Horizontal Category Scroll */}
                {categories.length > 1 && (
                    <View style={styles.categoryWrapper}>

                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={categories}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => <CategoryChip title={item} />}
                            contentContainerStyle={styles.categoryList}
                        />
                        <TouchableOpacity
                            style={[styles.categoryChipInfo]}
                            onPress={() => replayTour()}
                        >
                            {/* <Text style={[styles.categoryChipText, selectedCategory === 'All' && styles.categoryChipTextActive]}>
                                Info
                            </Text> */}
                            <Icon name="help-outline" size={24} color={'#ffa931'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Alphabet Quick Jump (Right Side) */}
                {/* <View style={styles.alphabetContainer}>
                {ALPHABET.map(letter => (
                    <TouchableOpacity
                        key={letter}
                        onPress={() => scrollToLetter(letter)}
                        style={styles.alphaItem}
                    >
                        <Text
                            style={[
                                styles.alphaText,
                                selectedLetter === letter &&
                                styles.alphaTextActive
                            ]}
                        >
                            {letter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View> */}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                >
                    {/* ── FREQUENTLY USED SECTION ── */}
                    {frequentApps.length > 0 && !search && selectedCategory === 'All' && (
                        <View style={styles.frequentSection}>
                            {/* Header row */}
                            <View style={styles.frequentHeaderRow}>
                                <View style={styles.frequentHeaderLeft}>
                                    <Icon name="bolt" size={14} color="#F59E0B" />
                                    <Text style={styles.frequentHeader}>FREQUENTLY USED</Text>
                                </View>
                            </View>

                            {/* Frequent app rows */}
                            {visibleFrequentApps.map((item: any, index: number) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.frequentCard,
                                        index === visibleFrequentApps.length - 1 &&
                                        !hasMoreFrequent &&
                                        styles.frequentCardLast,
                                        item.disabled && { opacity: 0.4 }
                                    ]}
                                    disabled={item.disabled}
                                    onPress={() => handleAppPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftSection}>
                                        <View style={[styles.frequentIconContainer, { backgroundColor: item.color }]}>
                                            <Icon name={item.icon} size={18} color="#fff" />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.frequentTitle}>{getDisplayName(item)}</Text>
                                            <Text style={styles.subtitle}>{item.category}</Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}

                            {/* Show more / less toggle */}
                            {hasMoreFrequent && (
                                <TouchableOpacity
                                    style={styles.showMoreBtn}
                                    onPress={() => setShowAllFrequent(prev => !prev)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllFrequent
                                            ? 'Show less'
                                            : `+${frequentApps.length - FREQUENT_COLLAPSED_COUNT} more`}
                                    </Text>
                                    <Icon
                                        name={showAllFrequent ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={14}
                                        color="#6B7280"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* ── ALL APPS BY CATEGORY ── */}
                    {Object.entries(groupedApps).map(([category, items]: any) => (
                        <View key={category}>
                            <Text style={styles.sectionHeader}>{category.toUpperCase()}</Text>
                            {items.map((item: any) => (
                                <TouchableOpacity
                                    key={item.name}
                                    // style={styles.appCard}
                                    style={[
                                        styles.appCard,
                                        item.disabled && { opacity: 0.4 }
                                    ]}
                                    onPress={() => handleAppPress(item)}
                                    disabled={item.disabled}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftSection}>
                                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                            <Icon name={item.icon} size={22} color="#fff" />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.title}>{getDisplayName(item)}</Text>
                                            <Text style={styles.subtitle}>{item.category}</Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={18} color="#A0A0A0" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
            {/* <TourOverlay
                visible={showHeaderTour}
                tourKey="header-tour"
                steps={HEADER_TOUR}
                onClose={() => {

                    setShowHeaderTour(false);

                    setTimeout(() => {
                        setShowHomeTour(true);
                    }, 300);

                }}
            /> */}
            <TourOverlay
                visible={showHomeTour}
                tourKey="home-tour"
                steps={HOME_TOUR}
                onClose={async () => {

                    setShowHomeTour(false);

                    await AsyncStorage.setItem(
                        '@flow_home_tour_completed',
                        '1'
                    );

                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    propertySwitchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 2,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    propertySwitchInfo: {
        flex: 1,
        minWidth: 0,
    },
    propertySwitchLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    propertySwitchValue: {
        marginTop: 1,
        fontSize: 13,
        fontWeight: '800',
        color: '#111827',
    },
    propertySwitchLoader: {
        marginLeft: 4,
    },

    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    categoryWrapper: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        display: 'flex',
        flexDirection: 'row',
    },
    categoryList: {
        // paddingHorizontal: 16,
        paddingRight: 0,
        paddingLeft: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
    },
    categoryChipInfo: {
        // backgroundColor: '#E0E7FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        // backgroundColor: '#F1F5F9',
        // marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: '#000',
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
    },
    alphabetContainer: {
        position: 'absolute',
        right: 6,
        top: '30%',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    alphaItem: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alphaText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
    },
    alphaTextActive: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '700',
    },
    listContainer: {
        paddingHorizontal: 12,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },

    // ── Frequent Section ──
    frequentSection: {
        marginTop: 16,
        marginBottom: 4,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    frequentHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 6,
    },
    frequentHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    frequentHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginLeft: 4,
    },
    frequentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FAFAFA',
    },
    frequentCardLast: {
        borderBottomWidth: 0,
    },
    frequentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    frequentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    showMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    showMoreText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },

    // ── Regular list ──
    appCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: '#6B7280',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 4,
        letterSpacing: 1,
    },
    appName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#334155',
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: ITEM_SIZE - 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 12,
        fontWeight: '500',
    },
    gridContainer: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 120,
    },
});

export default HomeScreen;


