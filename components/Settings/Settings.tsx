// SettingsScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
    Switch,
    Platform,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

import { fetchMasterSyncPartyDataPerPrptypeCache } from '../../common/API/Functions';
import { initDatabase } from '../../common/API/DatabaseManager';
import theme from '../../android/app/src/theme'; // ✅ your theme.ts path (same as your other screens)

interface Props {
    token: string;
    isConnected: boolean | null;
    username: string;
    navigation: any;
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const SettingsScreen: React.FC<Props> = ({ token, isConnected, navigation }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [liveLogsUnlocked, setLiveLogsUnlocked] = useState(false);
    const [getNoti_Token, setNoti_Token] = useState(null);


    // ✅ THEME MODE
    const [isDarkMode, setIsDarkMode] = useState(false);

    // ✅ LIVE LOGS (Smooth - No lag / no auto close)
    const logsRef = useRef<string[]>([]);
    const flushTimer = useRef<any>(null);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

    // -----------------------------------
    // ✅ Load Theme Mode
    // -----------------------------------
    useEffect(() => {
        (async () => {
            const savedMode = await AsyncStorage.getItem('app_theme_mode');
            setIsDarkMode(savedMode === 'dark');
        })();
    }, []);

    useEffect(() => {
        const checkUnlock = async () => {
            const v = await AsyncStorage.getItem('live_logs_unlocked');
            setLiveLogsUnlocked(v === 'true');
        };

        const unsubscribe = navigation.addListener('focus', () => {
            checkUnlock();
        });

        checkUnlock();
        return unsubscribe;
    }, [navigation]);


    useEffect(() => {
        const initializeApp = async () => {
            try {

                const notification_token = await AsyncStorage.getItem('notification_token');

                setNoti_Token(notification_token as any);




            } catch (error) {
                console.error("Initialization error:", error);

            } finally {
                // setIsLoading(false);
            }
        };

        initializeApp();
    }, []);
    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        await AsyncStorage.setItem('app_theme_mode', newMode ? 'dark' : 'light');
    };

    // -----------------------------------
    // ✅ Theme Tokens for Settings Screen
    // -----------------------------------
    const UI = {
        bg: isDarkMode ? '#081420' : theme.NEUTRAL_BG,
        card: isDarkMode ? '#0F2233' : theme.SURFACE,
        border: isDarkMode ? 'rgba(255,255,255,0.10)' : theme.BORDER,
        text: isDarkMode ? '#FFFFFF' : theme.TEXT_PRIMARY,
        subText: isDarkMode ? 'rgba(255,255,255,0.70)' : theme.MUTED,
        iconBG: isDarkMode ? 'rgba(0,180,162,0.18)' : 'rgba(0,126,167,0.12)',
        shadow: theme.SHADOW,
    };

    // -----------------------------------
    // ✅ Capture console logs smoothly
    // -----------------------------------
    useEffect(() => {
        const originalConsoleLog = console.log;

        const flushToUI = () => {
            // ✅ batch update to avoid rerender spam
            setConsoleLogs([...logsRef.current]);
        };

        console.log = (...args: any[]) => {
            originalConsoleLog(...args);

            const msg = args
                .map(arg =>
                    typeof arg === 'object'
                        ? JSON.stringify(arg, null, 2)
                        : String(arg)
                )
                .join(' ');

            logsRef.current.push(msg);

            // ✅ max logs limit (important)
            if (logsRef.current.length > 400) {
                logsRef.current.shift();
            }

            // ✅ debounce flush
            if (flushTimer.current) clearTimeout(flushTimer.current);
            flushTimer.current = setTimeout(flushToUI, 250);
        };

        return () => {
            console.log = originalConsoleLog;
            if (flushTimer.current) clearTimeout(flushTimer.current);
        };
    }, []);

    // -----------------------------------
    // ✅ Drawer Open/Close
    // -----------------------------------
    const toggleDrawer = () => {
        setDrawerVisible(prev => !prev);
    };

    const clearConsole = () => {
        logsRef.current = [];
        setConsoleLogs([]);
    };

    // -----------------------------------
    // ✅ Master Sync Handler
    // -----------------------------------
    const handleMasterSync = async () => {
        if (!isConnected) {
            Alert.alert('Error', 'No internet connection. Please connect and try again.');
            return;
        }

        try {
            setIsSyncing(true);

            const mastersyncData = await AsyncStorage.getItem('master_sync_data');
            if (!mastersyncData) {
                Alert.alert('Error', 'No master sync data found.');
                setIsSyncing(false);
                return;
            }

            await initDatabase();
            await fetchMasterSyncPartyDataPerPrptypeCache(token, JSON.parse(mastersyncData));

            Alert.alert('Success', 'Master sync completed successfully!');
        } catch (error) {
            console.error('Master sync failed:', error);
            Alert.alert('Error', 'Master sync failed. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    // -----------------------------------
    // ✅ Row Component (Reusable professional row)
    // -----------------------------------
    const SettingsRow = ({
        icon,
        title,
        subtitle,
        onPress,
        right,
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        right?: React.ReactNode;
    }) => {
        return (
            <TouchableOpacity
                activeOpacity={0.88}
                onPress={onPress}
                style={[
                    styles.row,
                    {
                        backgroundColor: UI.card,
                        borderColor: UI.border,
                    },
                ]}
            >
                <View style={styles.rowLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: UI.iconBG }]}>
                        <Icon name={icon} size={20} color={theme.BRAND_GRADIENT_END} />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: UI.text }]}>{title}</Text>
                        {!!subtitle && (
                            <Text style={[styles.rowSubtitle, { color: UI.subText }]}>{subtitle}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.rowRight}>
                    {right ?? <Icon name="chevron-right" size={24} color={UI.subText} />}
                </View>
            </TouchableOpacity>
        );
    };

    // -----------------------------------
    // ✅ Live Logs Modal (Smooth)
    // -----------------------------------
    const renderDrawer = () => (
        <Modal
            visible={drawerVisible}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
            onRequestClose={() => setDrawerVisible(false)}
        >
            <View style={[styles.drawerContainer, { backgroundColor: UI.bg }]}>

                {/* ✅ Gradient Header */}
                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.drawerHeaderGradient}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Icon name="terminal" size={22} color={theme.TEXT_WHITE} />
                        <Text style={styles.drawerTitle}>Live Console Logs</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setDrawerVisible(false)}
                        style={styles.closeButton}
                    >
                        <Icon name="close" size={24} color={theme.TEXT_WHITE} />
                    </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                    style={styles.drawerContent}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    showsVerticalScrollIndicator={false}
                >
                    {consoleLogs.length === 0 ? (
                        <Text style={[styles.noLogsText, { color: UI.subText }]}>No logs yet</Text>
                    ) : (
                        consoleLogs.map((log, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.logBox,
                                    {
                                        backgroundColor: UI.card,
                                        borderColor: UI.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.logText, { color: UI.text }]}>{log}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ✅ Sticky Clear Button */}
                <View style={styles.clearWrap}>
                    <TouchableOpacity
                        onPress={clearConsole}
                        style={[styles.clearButton, { backgroundColor: theme.ERROR }]}
                        activeOpacity={0.9}
                    >
                        <Icon name="delete" size={18} color="#fff" />
                        <Text style={styles.clearButtonText}>Clear Logs</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const TokenRow = ({ title, value }: { title: string; value: string | null }) => {
        const handleCopy = () => {
            if (value) {
                Clipboard.setString(value);
                Alert.alert('Copied!', 'Token copied to clipboard.');
            }
        };

        return (
            <View style={[
                styles.row,
                {
                    backgroundColor: UI.card,
                    borderColor: UI.border,
                },
            ]}>
                <View style={styles.rowLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: UI.iconBG }]}>
                        <Icon name="key" size={20} color={theme.BRAND_GRADIENT_END} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: UI.text }]}>{title}</Text>
                        {value ? (
                            <Text
                                style={[styles.rowSubtitle, { color: UI.subText }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {value}
                            </Text>
                        ) : (
                            <Text style={[styles.rowSubtitle, { color: UI.subText }]}>No token found</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleCopy}
                    disabled={!value}
                    style={styles.rowRight}
                >
                    <View style={[styles.badge, { backgroundColor: value ? 'rgba(0,126,167,0.12)' : 'rgba(0,0,0,0.12)' }]}>
                        <Icon name="content-copy" size={18} color={value ? theme.BRAND_GRADIENT_END : UI.subText} />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };


    return (
        <View style={[styles.container, { backgroundColor: UI.bg }]}>
            {renderDrawer()}

            {/* ✅ Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')} // ✅ change to "Dashboard" if needed
                    style={[styles.headerIconBtn, { backgroundColor: UI.card, borderColor: UI.border }]}
                >
                    <Icon name="home" size={22} color={theme.BRAND_GRADIENT_END} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerText, { color: UI.text }]}>Settings</Text>
                    <Text style={[styles.headerSub, { color: UI.subText }]}>
                        App preferences & maintenance
                    </Text>
                </View>
            </View>

            {/* ✅ Content */}
            <View style={{ marginTop: 6 }}>

                {/* Theme */}
                {/* <SettingsRow
                    icon="dark-mode"
                    title="Appearance"
                    subtitle={`Current: ${isDarkMode ? 'Dark' : 'Light'} theme`}
                    right={
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#D1D5DB', true: `${theme.BRAND_PRIMARY}88` }}
                            thumbColor={Platform.OS === 'android' ? theme.BRAND_GRADIENT_END : ''}
                        />
                    }
                /> */}

                {/* Master Sync */}
                <SettingsRow
                    icon="sync"
                    title="Master Sync"
                    subtitle={isConnected ? 'Sync master data with server' : 'Offline - connect internet'}
                    onPress={handleMasterSync}
                    right={
                        isSyncing ? (
                            <ActivityIndicator color={theme.BRAND_GRADIENT_END} />
                        ) : (
                            <View style={[styles.badge, { backgroundColor: 'rgba(0,126,167,0.12)' }]}>
                                <Text style={[styles.badgeText, { color: theme.BRAND_GRADIENT_END }]}>Sync</Text>
                            </View>
                        )
                    }
                />
                <SettingsRow
                    icon="app-settings-alt"
                    title="Application Version"
                    subtitle={'v7.2.8.1'}
                    // onPress={''}
                    
                />

                {/* Live Logs */}
                {liveLogsUnlocked && (
                    <SettingsRow
                        icon="terminal"
                        title="Live Logs"
                        subtitle="See real-time console logs"
                        onPress={toggleDrawer}
                    />
                )}


                {/* Notification Token */}
                {liveLogsUnlocked && (
                    <TokenRow
                        title="Notification Token"
                        value={getNoti_Token}
                    />
                )}

            </View>
        </View>
    );
};



export default SettingsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: isTablet ? 28 : 18,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: Platform.OS === 'ios' ? 10 : 6,
        marginBottom: 12,
    },
    headerIconBtn: {
        width: 46,
        height: 46,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 2,
    },
    headerText: {
        fontSize: isTablet ? 26 : 22,
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
    },
    headerSub: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: theme.FONT_FAMILY_MEDIUM,
    },

    row: {
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowTitle: {
        fontSize: 15,
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
    },
    rowSubtitle: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: theme.FONT_FAMILY_MEDIUM,
    },
    rowRight: {
        paddingLeft: 10,
        alignItems: 'flex-end',
    },

    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
    },

    // Drawer
    drawerContainer: {
        flex: 1,
        padding: 16,
    },
    drawerHeaderGradient: {
        height: 58,
        borderRadius: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    drawerTitle: {
        fontSize: 16,
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
        color: theme.TEXT_WHITE,
    },
    closeButton: {
        padding: 6,
    },
    drawerContent: {
        flex: 1,
        marginTop: 12,
    },
    noLogsText: {
        marginTop: 20,
        textAlign: 'center',
        fontFamily: theme.FONT_FAMILY_SEMIBOLD,
    },
    logBox: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
    },
    logText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        lineHeight: 18,
    },

    clearWrap: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    clearButton: {
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    clearButtonText: {
        color: '#fff',
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
    },
});
