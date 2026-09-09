import { initDatabase } from '@/common/API/DatabaseManager';
import { fetchMasterSyncPartyDataPerPrptypeCache, getPrptypeSummary, normalizePrptype } from '@/common/API/Functions';
import { setCustomUsername } from '@/common/utils/feedbackStorage';
import { buildProfileFromLogin } from '@/common/utils/profileStorage';
import {
    fetchAndCacheGlobalData,
    getCachedGlobalData,
    initGlobalCacheDB
} from '@/common/utils/sqliteCacheManager';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import main from '../../assets/images/main.png';
import { API, initAPI } from '../../common/API/dynamicAPI';
import { theme } from '../../components/theme';
import { saveCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
// import { getStoredToken } from '../../hooks/NotificationService';
type Nav = any;

export default function LoginScreen() {
    const navigation = useNavigation<Nav>();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [getNotitoken, setNotitoken] = useState('');
    const [getDeviceId, setDeviceId] = useState('');
    const [selectedProperty, setSelectedProperty] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


    useEffect(() => {
        const check = async () => {
            const token = await AsyncStorage.getItem('access_token');
            const l = await AsyncStorage.getItem('LOOKUP_PLATFORM');
            // const noti_token = await AsyncStorage.getItem('notification_token');
            // setNotitoken(noti_token || '');

            if (token && l === 'NEW') {
                navigation.navigate('Main')
            } else
                if (token && l !== 'NEW') {
                    router.replace('/');
                }
        };

        check();
    }, []);

    const propertyData = [
        { label: 'Sudamo/Knits', value: 'sudamo_knits' },
        { label: 'Rayons', value: 'rayons' },
    ];

    // 🔥 load saved property
    useEffect(() => {
        const load = async () => {
            const prop = await AsyncStorage.getItem('selected_property');
            if (prop) setSelectedProperty(prop);
        };
        load();
    }, []);

    const requestPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            console.log('Notification permission denied');
            return false;
        }
        return true;
    };

    const getFCMToken = async () => {
        try {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return null;

            const token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('Expo Push Token:', token);

            if (token) {
                await AsyncStorage.setItem('notification_token', token);
                return token;
            }
        } catch (error) {
            console.error('Error getting Expo push token:', error);
            return null;
        }
    };

    useEffect(() => {
        const deviceId = Device.osInternalBuildId || "test-device";
        console.log("Device ID:", deviceId);
        setDeviceId(deviceId);
        getFCMToken().then(token => {
            if (token) {
                setNotitoken(token);
            }
        });
    }, []);

    console.log("noti_token at render:", getNotitoken);


    const isCachePopulated = async (): Promise<boolean> => {
        try {
            const cachedParty = await getCachedGlobalData('party');
            const cachedItem = await getCachedGlobalData('item');
            const cachedShade = await getCachedGlobalData('shade');
            return cachedParty.length > 0 && cachedItem.length > 0 && cachedShade.length > 0;
        } catch (error) {
            console.error('❌ Error checking cache status:', error);
            return false;
        }
    };

    // 🔥 LOGIN
    const handleLogin = async () => {
        const noti_token = getNotitoken;

        if (!selectedProperty) {
            Alert.alert("Error", "Please select property");
            return;
        }

        if (!username || !password) {
            Alert.alert("Error", "Enter username & password");
            return;
        }

        try {
            setIsLoading(true);

            // 🔥 SAVE PROPERTY FIRST
            await AsyncStorage.setItem('selected_property', selectedProperty);

            // 🔥 INIT API BASED ON PROPERTY
            await initAPI();

            console.log("🌐 USING API:", API);
            console.log("📌 PROPERTY:", selectedProperty);
            console.log("noti_token final", noti_token);
            console.log("checkdevice final", getDeviceId);

            const response = await axios.post(
                `${API}/api/login`,
                {
                    name: username.trim(),
                    password: password.trim(),
                    noti_token: noti_token || 'xyz-noti-token',
                    checkdevice: getDeviceId || 'xyz-device',
                },
                {
                    headers: { 'x-platform': 'mob' }
                }
            );

            console.log("✅ RESPONSE:", response.data);

            if (response.data.success) {
                const token = response.data.response?.access_token;
                const user_login_from = response.data.response?.user?.regsrc || 'web';
                const user_details = response.data.response?.user?.first_name || 'user';
                const user_avaible = response.data.response?.user?.is_deleted || 'user';
                const user_menu_apps = response.data.response?.usermenu || '';
                const ismastersync = response.data.response?.ismastersync || '';
                const ismastersyncData = response.data.response?.mastersyncprptypes || [];
                const userof = response.data.response?.userof;
                const yno = response.data.response?.year?.YearNo || '';
                const role1 = response.data.response?.role1;
                const user_id = response.data.response?.user?.id || 0;

                // 🔔 Latest notification token
                const latestNotiToken = getNotitoken;

                if (latestNotiToken) {
                    await AsyncStorage.setItem(
                        'notification_token',
                        latestNotiToken
                    );

                    console.log(
                        '💾 Notification token cached:',
                        latestNotiToken
                    );
                }
                // const role1 = response.data.response?.role1;
                if (response.data.success === true) {
                    // if (token && user_details && user_menu_apps) {
                    //     await AsyncStorage.setItem('access_token', token);
                    //     await AsyncStorage.setItem('user_details', user_details);
                    //     await AsyncStorage.setItem('login_user_name', username.trim());
                    //     await AsyncStorage.setItem('login_user_passwd', password.trim());
                    //     await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                    //     await AsyncStorage.setItem('user_login_role', JSON.stringify(role1));

                    //     console.log("💾 SAVED SUCCESS");

                    //     router.replace('/(tabs)');
                    // } else {
                    //     Alert.alert("Error", response.data.message);
                    // }

                    // 
                    if (user_avaible === "1") {
                        Alert.alert('Warning', `User not available!, Please Register yourself by Create Account`);
                        return;
                    }
                    else {
                        if (token && user_details && user_menu_apps) {
                            // Keep the exact credentials used by the successful login
                            // in OS secure storage for the in-home property switch.
                            await saveCredentialsForPropertySwitch(
                                username.trim(),
                                password.trim()
                            );

                            // Persist the complete login response so HomeScreen can
                            // show the property switch only when switchuserlogin === 1.
                            await AsyncStorage.setItem(
                                'mobile_raw_login_response',
                                JSON.stringify(response.data.response || {})
                            );

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
                            if (user_login_from === "web") {
                                // setToken(token);
                                // setUserDetails(user_details);
                                // setMenuApps(user_menu_apps);
                                // setIsLoggedIn(true);
                                // Alert.alert('check', `After Login ${JSON.stringify(payload)}`);
                                // const cachedParty = await getCachedGlobalData('party').catch(() => []);
                                // await initGlobalCacheDB();
                                await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'true');
                                router.replace('/(tabs)');
                                await initGlobalCacheDB();
                                const cachePopulated = await isCachePopulated();
                                if (!cachePopulated) {
                                    await fetchAndCacheGlobalData(token); // Only fetch if cache is empty
                                } else {
                                    console.log('✅ Using existing cached data');
                                }
                                await fetchAndCacheGlobalData(token); // Cache global data
                                // await fetchAndCacheGlobalData(token);
                                await AsyncStorage.setItem('master_sync_data_common', JSON.stringify(ismastersyncData));
                                if (ismastersync == 1 || ismastersync === '1' || ismastersync === true) {
                                    try {

                                        await AsyncStorage.setItem('master_sync_data', JSON.stringify(ismastersyncData));
                                        await initDatabase();
                                        await fetchMasterSyncPartyDataPerPrptypeCache(token || '', ismastersyncData);
                                        for (const itm of ismastersyncData) {
                                            const key = normalizePrptype(itm.prptype ?? itm.PrpType ?? '');
                                            const summary = await getPrptypeSummary(key);
                                            console.log(`→ summary for requested prptype "${itm.prptype}":`, summary);
                                        }

                                        // await printCachedPrptypesWithData();
                                        console.log("💾 SAVED SUCCESS");


                                    } catch (err) {
                                        console.warn('Master-sync or verification failed:', err);
                                    }
                                }
                            }
                            else if (user_login_from === "app") {
                                await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                                await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'false');
                                await setCustomUsername(user_details);
                                router.replace('/(tabs)');

                                if (user_login_from) {
                                    await AsyncStorage.setItem('new_user', 'true');
                                }
                                // await initGlobalCacheDB();
                                // const cachePopulated = await isCachePopulated();
                                // if (!cachePopulated) {
                                //     await fetchAndCacheGlobalData(token); // Only fetch if cache is empty
                                // } else {
                                //     console.log('✅ Using existing cached data');
                                // }
                                // await fetchAndCacheGlobalData(token); // Cache global data
                                // await fetchAndCacheGlobalData(token);
                                // await AsyncStorage.setItem('master_sync_data_common', JSON.stringify(ismastersyncData));
                                // if (ismastersync == 1 || ismastersync === '1' || ismastersync === true) {
                                //     try {

                                //         await AsyncStorage.setItem('master_sync_data', JSON.stringify(ismastersyncData));
                                //         await initDatabase();
                                //         await fetchMasterSyncPartyDataPerPrptypeCache(token || '', ismastersyncData);
                                //         for (const itm of ismastersyncData) {
                                //             const key = normalizePrptype(itm.prptype ?? itm.PrpType ?? '');
                                //             const summary = await getPrptypeSummary(key);
                                //             console.log(`→ summary for requested prptype "${itm.prptype}":`, summary);
                                //         }

                                //         // await printCachedPrptypesWithData();
                                //         console.log("💾 SAVED SUCCESS");


                                //     } catch (err) {
                                //         console.warn('Master-sync or verification failed:', err);
                                //     }
                                // }
                            }
                            // setToken(token);
                            // setUserDetails(user_details);
                            // setMenuApps(user_menu_apps);
                            // setIsLoggedIn(true);
                            // Alert.alert('check', `After Login ${JSON.stringify(payload)}`);
                            // const cachedParty = await getCachedGlobalData('party').catch(() => []);
                            // await initGlobalCacheDB();

                        } else {
                            Alert.alert('❌ Error', `${response.data.response.message}`);
                        }
                    }
                } else {
                    Alert.alert('❌ Error', `${response.data.message}`);
                }
            }
        }

        catch (err: any) {
            console.log("❌ LOGIN ERROR:", err?.response || err);
            Alert.alert("Error", "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView
            style={{
                backgroundColor: theme.NEUTRAL_BG,
                flex: 1,
                // justifyContent: 'center',

            }}
            // style={styles.container}
            contentContainerStyle={{
                paddingBottom: 40
            }}
        >


            {/* <LinearGradient
                colors={[
                    theme.BRAND_GRADIENT_START,
                    theme.BRAND_GRADIENT_END
                ]}
                style={styles.header}

            >

                <TouchableOpacity
                    onPress={() => router.replace('/(all)/lookup-select')}

                >

                    <Icon
                        name="arrow-back"
                        size={24}
                        color="#fff"
                    /> </TouchableOpacity>

                <Text style={styles.title}>
                    Sign In
                </Text>

            </LinearGradient> */}
            {/* <Image
                // source={{ uri: 'https://via.placeholder.com/120' }}
                source={{ uri: 'https://madhusudangroup.com/wp-content/uploads/2023/03/Logo-Post-2.png.webp' }}
                style={styles.logo}
            /> */}
            <View style={styles.heroContainer}>
                <View style={{ alignSelf: 'flex-start' }}>
                    <TouchableOpacity onPress={() => router.replace('/(all)/lookup-select')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={22} color={theme.BRAND_GRADIENT_END} />
                        <Text style={{ color: theme.BRAND_GRADIENT_END }}>Back</Text>
                    </TouchableOpacity>
                </View>
                <Image
                    source={main}
                    style={styles.logo}
                />

                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        Textile ERP Platform
                    </Text>
                </View>

                {/* <Text style={styles.tagline}>
                    Smart Business Operations Platform
                </Text> */}

                {/* <Text style={styles.desc}>
                    Manage production, receivables,
                    collections, sales analysis and
                    operational workflows from anywhere.
                </Text> */}

            </View>

            <View style={styles.loginCard}>

                {/* 🔥 PROPERTY SELECT */}
                <Text style={styles.label}>Select Property</Text>
                {propertyData.map((item) => (
                    <TouchableOpacity
                        key={item.value}
                        style={[
                            styles.selectBtn,
                            selectedProperty === item.value && styles.selected
                        ]}
                        onPress={() => setSelectedProperty(item.value)}
                    >
                        <Icon name="business" size={20} color={theme.BRAND_GRADIENT_END} />
                        <Text style={{ marginLeft: 10 }}>{item.label}</Text>
                    </TouchableOpacity>
                ))}

                {/* USERNAME */}
                <View style={styles.inputBox}>
                    <Icon name="person-outline" size={22} color={theme.BRAND_GRADIENT_END} />
                    <TextInput
                        placeholder="Username"
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                    />
                </View>

                {/* PASSWORD */}
                <View style={styles.inputBox}>
                    <Icon name="lock-outline" size={22} color={theme.BRAND_GRADIENT_END} />
                    <TextInput
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Icon name={showPassword ? "visibility-off" : "visibility"} size={22} color={theme.BRAND_GRADIENT_END} />
                    </TouchableOpacity>
                </View>

                {/* LOGIN BUTTON */}
                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={styles.button}
                >
                    <TouchableOpacity onPress={handleLogin} style={styles.btnTouch}>
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </LinearGradient>
                <View style={{ marginTop: 20 }}>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.push('/signup')}
                    >
                        <Text style={styles.secondaryText}>
                            Create Account
                        </Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.push('/free-trial')}
                    >
                        <Text style={styles.secondaryText}>
                            Start Free Trial
                        </Text>
                    </TouchableOpacity> */}

                    {/* <Text style={styles.reviewText}>
                        Explore FlowNest instantly using Guest Mode
                        without creating an account.
                    </Text> */}

                    {/* <TouchableOpacity
                        style={styles.guestBtn}
                    >
                        <Icon
                            name="visibility"
                            size={20}
                            color={theme.BRAND_GRADIENT_END}
                        />

                        <Text style={styles.guestText}>
                            Continue as Guest
                        </Text>
                    </TouchableOpacity> */}

                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    logoImage: {
        width: 30,
        height: 30,
    },
    logoText: {
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END
    },
    hero: {
        alignItems: 'center',
        marginBottom: 30
    },

    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END
    },

    heroSub: {
        fontSize: 16,
        marginTop: 5,
        fontWeight: '600'
    },

    heroDesc: {
        textAlign: 'center',
        marginTop: 10,
        color: '#666',
        lineHeight: 22
    },
    heroContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 30
    },

    brand: {
        fontSize: 34,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
        marginTop: 15
    },

    tagline: {
        fontSize: 17,
        fontWeight: '600',
        marginTop: 5,
        color: theme.TEXT_PRIMARY
    },

    desc: {
        marginTop: 15,
        textAlign: 'center',
        color: theme.TEXT_SECONDARY,
        lineHeight: 24,
        maxWidth: 320
    },

    logo: {
        width: 220,
        height: 90,
        resizeMode: 'contain',
        alignSelf: 'center',
    },
    loginCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 25,
        borderRadius: 24,
        padding: 22,

        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 15,

        elevation: 6
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
        backgroundColor: theme.NEUTRAL_BG,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 25,
        paddingHorizontal: 20
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        marginTop: 15
    },

    label: {
        marginBottom: 10,
        fontWeight: '600'
    },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
    },
    selected: {
        borderWidth: 2,
        borderColor: theme.BRAND_GRADIENT_END
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F8FA',
        borderRadius: 14,
        paddingHorizontal: 15,
        height: 56,
        marginBottom: 14
    },
    input: {
        flex: 1,
        marginLeft: 10,
        height: 50,
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        marginTop: 10
    },
    btnTouch: {
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    secondaryBtn: {
        marginTop: 10,
        alignItems: 'center',
    },

    secondaryText: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 15,
        fontWeight: '600',
    },

    guestText: {
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '700',
        marginLeft: 4
    },
    guestBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D8E4E8',
        backgroundColor: '#fff'
    },
    reviewText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 15,
        lineHeight: 22
    },
    badge: {
        backgroundColor: '#E8F7FA',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 30,
        marginTop: 10
    },

    badgeText: {
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600'
    },
});