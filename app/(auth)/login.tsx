import { initDatabase } from '@/common/API/DatabaseManager';
import { fetchMasterSyncPartyDataPerPrptypeCache, getPrptypeSummary, normalizePrptype } from '@/common/API/Functions';
import {
    fetchAndCacheGlobalData,
    getCachedGlobalData,
    initGlobalCacheDB
} from '@/common/utils/sqliteCacheManager';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as Device from 'expo-device';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { API, initAPI } from '../../common/API/dynamicAPI';
import { theme } from '../../components/theme';
// import { getStoredToken } from '../../hooks/NotificationService';

export default function LoginScreen() {
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
            const noti_token = await AsyncStorage.getItem('notification_token');
            setNotitoken(noti_token || '');

            if (token) {
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
                const user_details = response.data.response?.user?.first_name || 'user';
                const user_menu_apps = response.data.response?.usermenu || '';
                const ismastersync = response.data.response?.ismastersync || '';
                const ismastersyncData = response.data.response?.mastersyncprptypes || [];
                const userof = response.data.response?.userof;
                const yno = response.data.response?.year?.YearNo || '';
                const role1 = response.data.response?.role1;
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
                    if (token && user_details && user_menu_apps) {
                        await AsyncStorage.setItem('access_token', token);
                        await AsyncStorage.setItem('user_details', user_details);
                        await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                        await AsyncStorage.setItem('user_prptype', userof);
                        await AsyncStorage.setItem('login_user_name', username.trim());
                        await AsyncStorage.setItem('login_user_passwd', password.trim());
                        await AsyncStorage.setItem('yno', yno.trim());
                        await AsyncStorage.setItem('user_login_role', JSON.stringify(role1));
                        // setToken(token);
                        // setUserDetails(user_details);
                        // setMenuApps(user_menu_apps);
                        // setIsLoggedIn(true);
                        // Alert.alert('check', `After Login ${JSON.stringify(payload)}`);
                        // const cachedParty = await getCachedGlobalData('party').catch(() => []);
                        // await initGlobalCacheDB();
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
                    } else {
                        Alert.alert('❌ Error', `${response.data.response.message}`);
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
        <View style={styles.container}>

            <Image
                source={{ uri: 'https://via.placeholder.com/120' }}
                style={styles.logo}
            />

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

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
        backgroundColor: theme.NEUTRAL_BG,
    },
    logo: {
        width: 120,
        height: 120,
        alignSelf: 'center',
        marginBottom: 30,
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
        borderBottomWidth: 1,
        borderColor: theme.BRAND_GRADIENT_END,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        height: 50,
    },
    button: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
    },
    btnTouch: {
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});