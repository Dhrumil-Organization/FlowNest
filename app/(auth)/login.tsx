import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, StyleSheet, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@expo/vector-icons/MaterialIcons';
import { theme } from '../../components/theme';
import axios from 'axios';
import { API, initAPI } from '../../common/API/dynamicAPI';
// import { getStoredToken } from '../../hooks/NotificationService';

export default function LoginScreen() {
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [getNotitoken, setNotitoken] = useState('');
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

            const response = await axios.post(
                `${API}/api/login`,
                {
                    name: username.trim(),
                    password: password.trim(),
                    noti_token: noti_token
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
                // const ismastersync = response.data.response?.ismastersync || '';
                // const ismastersyncData = response.data.response?.mastersyncprptypes || [];
                // const userof = response.data.response?.userof;
                // const yno = response.data.response?.year?.YearNo || '';
                const role1 = response.data.response?.role1;
                if (response.data.success === true) {
                    if (token && user_details && user_menu_apps) {
                        await AsyncStorage.setItem('access_token', token);
                        await AsyncStorage.setItem('user_details', user_details);
                        await AsyncStorage.setItem('user_menu_apps', user_menu_apps);
                        await AsyncStorage.setItem('user_login_role', JSON.stringify(role1));

                        console.log("💾 SAVED SUCCESS");

                        router.replace('/');
                    } else {
                        Alert.alert("Error", response.data.message);
                    }
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