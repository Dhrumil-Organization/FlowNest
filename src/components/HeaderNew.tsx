import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// 👇 apne project ke actual path ke hisaab se adjust karo
import { useNotificationCenter } from '@/common/context/NotificationContext';
import { isEmbeddedWeb } from '@/src/core/embeddedAuth';
import theme from './theme';

export default function HeaderNew({
    userName,
    onSearch,
    placeholder = 'Search...',
    breadcrumb,
    SearchBar = true,
    breadcrumbWithNoHome,
    subHeaderText = false,
    headerConnectColor = '#D9F0EE',
    headerConnectAnimation = false
}: any) {
    const [search, setSearch] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [notifVisible, setNotifVisible] = useState(false);
    const [appVersion, setAppVersion] = useState('');
    const router = useRouter();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 🔔 Notification center (cached notifications, unread count, remove, clear)
    const { notifications, unreadCount, markAllAsRead, removeNotification, clearAll } =
        useNotificationCenter();

    useEffect(() => {
        if (headerConnectAnimation) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [headerConnectAnimation]);

    const initial = (userName || 'U').charAt(0).toUpperCase();

    const closeMenu = () => setMenuVisible(false);

    const handleHome = () => {
        closeMenu();
        router.replace('/new/(tabs)' as any);
    };

    const handleLogout = () => {
        closeMenu();
        AppAlert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    // await AsyncStorage.clear();
                    await AsyncStorage.removeItem('access_token');
                    await AsyncStorage.removeItem('user_details');
                    await AsyncStorage.removeItem('user_menu_apps');
                    await AsyncStorage.removeItem('get_property');
                    await AsyncStorage.removeItem('current_year');
                    await AsyncStorage.removeItem('mastersyncData');
                    await AsyncStorage.removeItem('login_user_name');
                    await AsyncStorage.removeItem('login_user_passwd');
                    await AsyncStorage.removeItem('receivables_sync_date');
                    await AsyncStorage.removeItem('receivables_prpgroup');
                    await AsyncStorage.removeItem('live_logs_unlocked');
                    await AsyncStorage.removeItem('user_prptype');
                    // 
                    await AsyncStorage.removeItem('app_session');
                    await AsyncStorage.removeItem('user_prptype');
                    await AsyncStorage.removeItem('user_id');
                    await AsyncStorage.removeItem('yno');
                    router.replace(isEmbeddedWeb() ? '/embed' : '/(all)/landing');
                },
            },
        ]);
    };

    const goBack = () => {
        // router.replace('/(tabs)');
        if (router.canGoBack()) router.back();
        else router.replace('/new/(tabs)');
    };

    useEffect(() => {
        const fetchAppVersion = async () => {
            try {
                const appJson = await import('../app.json');
                setAppVersion(appJson.expo.version);
            } catch (error) {
                console.error('Error fetching app version:', error);
            }
        };

        fetchAppVersion();
    }, []);

    const openNotifications = () => {
        setNotifVisible(true);
    };

    const closeNotifications = () => {
        setNotifVisible(false);
        markAllAsRead();
    };

    const timeAgo = (ts: number) => {
        const diffMs = Date.now() - ts;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <LinearGradient
            // colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
            colors={[theme.BRAND_DARK, theme.BRAND_DARK]}
            style={styles.container}>
            <SafeAreaView>
                

                {SearchBar && (
                    <View style={styles.searchBox}>
                        <Icon name="search" size={20} color={theme.MUTED} />
                        <TextInput
                            style={styles.input}
                            value={search}
                            placeholder={placeholder}
                            placeholderTextColor={theme.MUTED}
                            onChangeText={(t) => {
                                setSearch(t);
                                onSearch?.(t);
                            }}
                        />
                    </View>
                )}

                {breadcrumb && (
                    <View style={styles.breadcrumbChip}>
                        <View style={styles.breadcrumbRow}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={goBack}>
                                <Icon name="arrow-back" size={18} color="#fff" />
                                <Text style={styles.breadcrumbBackText}>Back</Text>
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.replace('/(tabs)')}>
                                    <Icon name="home" size={18} color="#fff" />
                                </TouchableOpacity> */}
                                <Text style={styles.breadcrumbSeparator}>›</Text>
                                <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                                    {breadcrumb}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {breadcrumbWithNoHome && (
                    <View style={styles.breadcrumbChip}>
                        <View style={styles.breadcrumbRow}>
                            <TouchableOpacity onPress={goBack}>
                                <Text style={styles.breadcrumbBackText}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                                {breadcrumbWithNoHome}
                            </Text>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            {/* ☰ Existing side menu */}
            <Modal visible={menuVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <Pressable style={{ flex: 1 }} onPress={closeMenu} />
                    <View style={styles.sheet}>
                        <Text style={styles.sheetName}>{userName || 'User'}</Text>

                        {['Home', 'Profile', 'Settings'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={styles.menuItem}
                                onPress={() => {
                                    closeMenu();
                                    if (item === 'Home') router.replace('/new/(tabs)' as any);
                                    if (item === 'Settings') router.push('/new/settings' as any);
                                    if (item === 'Profile') router.push('/new/profile' as any);
                                }}>
                                <Text>{item}</Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={{ color: '#D32F2F' }}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔔 Notification list modal — cached notifications, remove/clear functionality */}
            <Modal visible={notifVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <Pressable style={{ flex: 1 }} onPress={closeNotifications} />
                    <View style={styles.sheet}>
                        <View style={styles.notifHeaderRow}>
                            <Text style={styles.sheetName}>Notifications</Text>
                            {notifications.length > 0 && (
                                <TouchableOpacity onPress={clearAll}>
                                    <Text style={styles.clearAllText}>Clear all</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {notifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="notifications-none" size={40} color={theme.MUTED} />
                                <Text style={{ color: theme.MUTED, marginTop: 8 }}>
                                    No notifications yet
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item.id}
                                style={{ marginTop: 8 }}
                                renderItem={({ item }) => (
                                    <View style={styles.notifRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.notifTitle}>{item.title}</Text>
                                            {!!item.body && (
                                                <Text style={styles.notifBody}>{item.body}</Text>
                                            )}
                                            <Text style={styles.notifTime}>
                                                {timeAgo(item.receivedAt)}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => removeNotification(item.id)}
                                            style={styles.removeBtn}>
                                            <Icon name="close" size={20} color={theme.MUTED} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? 0 : 0,
        // borderBottomLeftRadius: 16,
        // borderBottomRightRadius: 16,
        elevation: 6,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    logo: { width: 36, height: 36 },
    pageTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    pageSubtitle: { color: '#D9F0EE', fontSize: 12 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    circleBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#D32F2F',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: theme.BRAND_GRADIENT_END,
    },
    badgeCount: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    avatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontWeight: '700', color: theme.BRAND_DARK },
    greetingCard: {
        marginTop: 16, backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 18, padding: 16,
    },
    greeting: { color: '#D9F0EE' },
    greetingName: { color: '#fff', fontSize: 22, fontWeight: '700' },
    greetingSub: { color: '#D9F0EE', marginTop: 4 },
    searchBox: {
        marginTop: 5, backgroundColor: '#fff', borderRadius: 10,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 35,
    },
    input: { flex: 1, marginLeft: 10 },
    breadcrumbChip: {
        marginTop: 12,
        borderRadius: 999,
        paddingHorizontal: 14,
        borderBlockColor: 'rgba(255,255,255,0.15)',
        borderTopWidth: 1,
        paddingVertical: 6,
        width: '100%',
    },
    breadcrumbRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    breadcrumbSeparator: {
        color: '#fff',
        marginHorizontal: 6,
    },
    breadcrumbBackText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.9,
    },
    breadcrumbCurrent: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
        textAlign: 'right',
    },
    modalOverlay: { height: '100%', justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, height: '55%'
    },
    sheetName: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },

    // 🔔 Notification list styles
    notifHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clearAllText: {
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600',
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    notifRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    notifTitle: { fontWeight: '700', fontSize: 14 },
    notifBody: { color: '#555', fontSize: 13, marginTop: 2 },
    notifTime: { color: theme.MUTED, fontSize: 11, marginTop: 4 },
    removeBtn: {
        padding: 4,
        marginLeft: 8,
    },
});