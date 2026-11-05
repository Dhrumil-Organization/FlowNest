import { initDatabase } from '@/common/API/DatabaseManager';
import { fetchMasterSyncPartyDataPerPrptypeCache, getPrptypeSummary, normalizePrptype } from '@/common/API/Functions';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { setCustomUsername } from '@/common/utils/feedbackStorage';
import { buildProfileFromLogin } from '@/common/utils/profileStorage';
import {
    fetchAndCacheGlobalData,
    getCachedGlobalData,
    initGlobalCacheDB
} from '@/common/utils/sqliteCacheManager';
import { saveCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import { getLoginSource } from '@/src/platform/runtime';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import main from '../../assets/images/main.png';
import { API, initAPI } from '../../common/API/dynamicAPI';
import {
    AuthButton,
    AuthField,
    AuthShell,
    CheckItem,
    ChecklistBox,
    Divider,
    FieldLabel,
    OptionCard,
    PasswordToggle,
} from '../../src/components/auth/AuthUI';

type Nav = any;

type PasswordValidation = {
    minLength: boolean;
    hasUppercase: boolean;
    hasSpecialChar: boolean;
    hasNumber: boolean;
};

const ValidationItem = ({ label, valid }: { label: string; valid: boolean }) => (
    <CheckItem label={label} valid={valid} pendingIcon="cancel" />
);

const validatePassword = (pwd: string): PasswordValidation => ({
    minLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    hasNumber: /\d/.test(pwd),
});

const isPasswordValid = (v: PasswordValidation) => Object.values(v).every(Boolean);

const PROPERTY_DATA = [
    { label: 'Sudamo/Knits', value: 'sudamo_knits' },
    { label: 'Rayons', value: 'rayons' },
];

/* ---------- FORM COMPONENT (owns all form state) ---------- */
function LoginForm() {
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [getNotitoken, setGetNotitoken] = useState('');
    const [getDeviceId, setGetDeviceId] = useState('');
    const [selectedProperty, setSelectedProperty] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Derived from password so each key press causes only the necessary
    // input state update instead of password + validation state updates.
    const validation = useMemo(() => validatePassword(password), [password]);

    const handlePasswordChange = useCallback((text: string) => {
        setPassword(text);
    }, []);

    useEffect(() => {
        const load = async () => {
            const prop = await AsyncStorage.getItem('selected_property');
            if (prop) setSelectedProperty(prop);
        };
        load();
    }, []);

    const requestPermissions = useCallback(async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            console.log('Notification permission denied');
            return false;
        }
        return true;
    }, []);

    const getFCMToken = useCallback(async () => {
        try {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return null;
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            if (token) {
                await AsyncStorage.setItem('notification_token', token);
                return token;
            }
        } catch (error) {
            console.error('Error getting Expo push token:', error);
            return null;
        }
    }, [requestPermissions]);

    useEffect(() => {
        const deviceId = Device.osInternalBuildId || 'test-device';
        setGetDeviceId(deviceId);
        getFCMToken().then((token) => {
            if (token) setGetNotitoken(token);
        });
    }, [getFCMToken]);

    const isCachePopulated = useCallback(async (): Promise<boolean> => {
        try {
            const cachedParty = await getCachedGlobalData('party');
            const cachedItem = await getCachedGlobalData('item');
            const cachedShade = await getCachedGlobalData('shade');
            return cachedParty.length > 0 && cachedItem.length > 0 && cachedShade.length > 0;
        } catch (error) {
            console.error('❌ Error checking cache status:', error);
            return false;
        }
    }, []);

    const handleLogin = useCallback(async () => {
        const noti_token = getNotitoken;

        if (!selectedProperty) {
            AppAlert.alert('Error', 'Please select property');
            return;
        }
        if (!username || !password) {
            AppAlert.alert('Error', 'Enter username & password');
            return;
        }
        if (!isPasswordValid(validation)) {
            AppAlert.alert('Error', 'Password does not meet security requirements');
            return;
        }

        try {
            setIsLoading(true);
            await AsyncStorage.setItem('selected_property', selectedProperty);
            await initAPI();

            const response = await axios.post(
                `${API}/api/login`,
                {
                    name: username.trim(),
                    password: password.trim(),
                    noti_token: noti_token || 'xyz-noti-token',
                    checkdevice: getDeviceId || 'xyz-device',
                },
                { headers: { 'x-platform': 'mob' } }
            );

            if (response.data.success) {
                const token = response.data.response?.access_token;
                const user_login_from = getLoginSource();
                const user_details = response.data.response?.user?.first_name || 'user';
                const user_avaible = response.data.response?.user?.is_deleted || 'user';
                const user_menu_apps = response.data.response?.usermenu || '';
                const ismastersync = response.data.response?.ismastersync || '';
                const ismastersyncData = response.data.response?.mastersyncprptypes || [];
                const userof = response.data.response?.userof;
                const yno = response.data.response?.year?.YearNo || '';
                const role1 = response.data.response?.role1;
                const user_id = response.data.response?.user?.id || 0;

                const latestNotiToken = getNotitoken;
                if (latestNotiToken) {
                    await AsyncStorage.setItem('notification_token', latestNotiToken);
                }

                if (response.data.success === true) {
                    if (user_avaible === '1') {
                        AppAlert.alert('Warning', 'User not available!, Please Register yourself by Create Account');
                        return;
                    } else {
                        if (token && user_details && user_menu_apps) {
                            if (user_login_from !== 'web') {
                                await saveCredentialsForPropertySwitch(username.trim(), password.trim());
                            }

                            await AsyncStorage.setItem('mobile_raw_login_response', JSON.stringify(response.data.response || {}));
                            await AsyncStorage.setItem('access_token', token);
                            await AsyncStorage.setItem('user_details', user_details);
                            await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                            await AsyncStorage.setItem('user_prptype', userof);
                            await AsyncStorage.setItem('login_user_name', username.trim());
                            await AsyncStorage.setItem('login_user_passwd', password.trim());
                            await AsyncStorage.setItem('yno', yno.trim());
                            await AsyncStorage.setItem('user_login_role', JSON.stringify(role1));
                            await AsyncStorage.setItem('user_id', JSON.stringify(user_id));

                            await buildProfileFromLogin({
                                access_token: token,
                                user: response.data.response?.user,
                                role1: role1,
                                userof: userof,
                                usermenu: user_menu_apps,
                                year: response.data.response?.year,
                                ismastersync: ismastersync,
                                mastersyncprptypes: ismastersyncData,
                            });

                            if (user_login_from === 'web') {
                                await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'true');
                                router.replace('/(tabs)');
                                await initGlobalCacheDB();
                                const cachePopulated = await isCachePopulated();
                                if (!cachePopulated) {
                                    await fetchAndCacheGlobalData(token);
                                }
                                await fetchAndCacheGlobalData(token);
                                await AsyncStorage.setItem('master_sync_data_common', JSON.stringify(ismastersyncData));
                                if (ismastersync == 1 || ismastersync === '1' || ismastersync === true) {
                                    try {
                                        await AsyncStorage.setItem('master_sync_data', JSON.stringify(ismastersyncData));
                                        await initDatabase();
                                        await fetchMasterSyncPartyDataPerPrptypeCache(token || '', ismastersyncData);
                                        for (const itm of ismastersyncData) {
                                            const key = normalizePrptype(itm.prptype ?? itm.PrpType ?? '');
                                            await getPrptypeSummary(key);
                                        }
                                    } catch (err) {
                                        console.warn('Master-sync or verification failed:', err);
                                    }
                                }
                            } else if (user_login_from === 'app') {
                                await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                                await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'false');
                                await setCustomUsername(user_details);
                                router.replace('/(tabs)');
                                if (user_login_from) {
                                    await AsyncStorage.setItem('new_user', 'true');
                                }
                            }
                        } else {
                            AppAlert.alert('❌ Error', `${response.data.response.message}`);
                        }
                    }
                } else {
                    AppAlert.alert('❌ Error', `${response.data.message}`);
                }
            }
        } catch (err: any) {
            console.log('❌ LOGIN ERROR:', err?.response || err);
            AppAlert.alert('Error', 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }, [
        getNotitoken,
        selectedProperty,
        username,
        password,
        validation,
        getDeviceId,
        router,
        isCachePopulated,
    ]);

    const isFormValid =
        username.trim() !== '' && isPasswordValid(validation) && selectedProperty !== '';

    return (
        <>
            <FieldLabel>SELECT PROPERTY</FieldLabel>
            <View style={styles.propertyRow}>
                {PROPERTY_DATA.map((item) => (
                    <View key={item.value} style={styles.propertyCell}>
                        <OptionCard
                            compact
                            title={item.label}
                            icon="business"
                            active={selectedProperty === item.value}
                            onPress={() => setSelectedProperty(item.value)}
                        />
                    </View>
                ))}
            </View>

            <AuthField
                label="USERNAME"
                icon="person-outline"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <AuthField
                label="PASSWORD"
                icon="lock-outline"
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                textContentType="password"
                autoComplete="password"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => {
                    if (isFormValid && !isLoading) handleLogin();
                }}
                right={
                    <PasswordToggle
                        visible={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                    />
                }
            />

            <ChecklistBox>
                <ValidationItem label="Minimum 8 characters" valid={validation.minLength} />
                <ValidationItem label="1 uppercase letter" valid={validation.hasUppercase} />
                <ValidationItem label="1 special character" valid={validation.hasSpecialChar} />
                <ValidationItem label="1 number" valid={validation.hasNumber} />
            </ChecklistBox>

            <AuthButton
                label="Login"
                icon="arrow-forward"
                onPress={handleLogin}
                disabled={!isFormValid || isLoading}
                loading={isLoading}
                style={{ marginTop: 18 }}
            />

            <Divider label="NEW HERE?" />

            <AuthButton
                label="Create Account"
                variant="secondary"
                onPress={() => router.push('/signup')}
            />
        </>
    );
}

/* ---------- SHELL ---------- */
export default function LoginScreen() {
    const navigation = useNavigation<Nav>();
    const router = useRouter();

    useEffect(() => {
        const check = async () => {
            const token = await AsyncStorage.getItem('access_token');
            const l = await AsyncStorage.getItem('LOOKUP_PLATFORM');
            if (token && l === 'NEW') {
                navigation.navigate('Main');
            } else if (token && l !== 'NEW') {
                router.replace('/');
            }
        };
        check();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleBack = useCallback(() => {
        router.replace('/(all)/lookup-select');
    }, [router]);

    const highlights = useMemo(
        () => [
            { icon: 'business', title: 'Property based login', desc: 'Sudamo / Knits and Rayons on one sign-in screen.' },
            { icon: 'sync', title: 'Master data sync', desc: 'Party, item and shade data cached for faster work.' },
            { icon: 'verified-user', title: 'Secure session', desc: 'Your menu and permissions load from your ERP role.' },
        ],
        []
    );

    const cardHeader = useMemo(
        () => (
            <View style={styles.groupLogoWrap}>
                <Image source={main} style={styles.logo} />
            </View>
        ),
        []
    );

    return (
        <AuthShell
            eyebrow="LEGACY ERP SYSTEM"
            title="Sign in"
            subtitle="Select your property and sign in with your ERP username and password."
            onBack={handleBack}
            brandTitle="Welcome back to your Textile ERP"
            brandSubtitle="Production, collections, receivables and sales analysis for every Madhusudan property."
            highlights={highlights}
            cardHeader={cardHeader}
        >
            <LoginForm />
        </AuthShell>
    );
}

const styles = StyleSheet.create({
    groupLogoWrap: { alignItems: 'flex-start', marginBottom: 18 },
    logo: { width: 150, height: 47, resizeMode: 'contain' },
    propertyRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
        marginBottom: 6,
    },
    propertyCell: {
        flexGrow: 1,
        flexBasis: 160,
        paddingHorizontal: 5,
    },
});