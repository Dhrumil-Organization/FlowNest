// import Icon from '@expo/vector-icons/MaterialIcons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import React, { useState } from 'react';
// import {
//     Image,
//     LayoutAnimation,
//     Platform,
//     SafeAreaView,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     UIManager,
//     View,
// } from 'react-native';
// import logo from '../assets/images/logo.png';
// import theme from './theme';

// // ✅ enable animation Android
// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// export default function Header({ userName, onSearch, placeholder = 'Search...', breadcrumb, SearchBar = true, breadcrumbWithNoHome }: any) {
//     const [search, setSearch] = useState('');
//     const [showUserBar, setShowUserBar] = useState(false);
//     const router = useRouter();

//     const toggleUserBar = () => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setShowUserBar(prev => !prev);
//     };

//     const initial = (userName || 'U').charAt(0).toUpperCase();

//     return (
//         <LinearGradient
//             colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
//             style={Platform.OS === 'android' ? styles.container_android : styles.container}
//         >
//             <SafeAreaView>

//                 {/* 🔥 TOP ROW */}
//                 <View style={styles.topRow}>

//                     {/* LEFT BRAND */}
//                     <View style={styles.brand}>
//                         <View style={styles.logoBox}>
//                             <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
//                                 {logo ? (
//                                     <Image
//                                         source={logo}
//                                         style={styles.logoImage}
//                                         resizeMode="contain"
//                                     />
//                                 ) : (
//                                     <Text style={styles.logoText}>FN</Text>
//                                 )}
//                             </TouchableOpacity>
//                         </View>

//                         <View style={{ marginLeft: 10 }}>
//                             <Text style={styles.title}>FlowNest</Text>
//                             <Text style={styles.subtitle}>Portal</Text>
//                         </View>
//                     </View>

//                     {/* RIGHT ACTIONS */}
//                     <View style={styles.actions}>

//                         <TouchableOpacity style={styles.iconBtn}>
//                             <Icon name="notifications-none" size={22} color="#fff" />
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             style={styles.iconBtn}
//                             onPress={() => router.replace('/settings')}
//                         >
//                             <Icon name="settings" size={22} color="#fff" />
//                         </TouchableOpacity>

//                         {/* 🔥 AVATAR */}
//                         <TouchableOpacity onPress={toggleUserBar}>
//                             <View style={styles.avatar}>
//                                 <Text style={styles.avatarText}>{initial}</Text>
//                             </View>
//                         </TouchableOpacity>

//                     </View>
//                 </View>

//                 {/* 🔥 ACCORDION USER BAR */}
//                 {showUserBar && (
//                     <View style={styles.userBar}>
//                         <Text style={styles.welcome}>
//                             Welcome back, <Text style={{ fontWeight: '700' }}>{userName}</Text>
//                         </Text>
//                         <Text style={styles.small}>
//                             Quick access to your assigned apps
//                         </Text>
//                     </View>
//                 )}

//                 {/* 🔥 SEARCH */}
//                 {SearchBar && (<View style={styles.searchBox}>
//                     <Icon name="search" size={18} color={theme.BRAND_DARK} />
//                     <TextInput
//                         value={search}
//                         onChangeText={(t) => {
//                             setSearch(t);
//                             onSearch(t);
//                         }}
//                         placeholder={placeholder}
//                         placeholderTextColor={theme.MUTED}
//                         style={styles.input}
//                     />

//                     {search.length > 0 && (
//                         <TouchableOpacity onPress={() => {
//                             setSearch('');
//                             onSearch('');
//                         }}>
//                             <Icon name="close" size={18} color={theme.BRAND_DARK} />
//                         </TouchableOpacity>
//                     )}
//                 </View>)}


//                 {/* 🔥 BREADCRUMB */}
//                 {breadcrumb && (
//                     <>
//                         <View style={styles.breadcrumbContainer}>
//                             <View style={styles.breadcrumb}>
//                                 <TouchableOpacity onPress={() => router.back()}>
//                                     <Text style={styles.breadcrumbLink}>Back</Text>
//                                 </TouchableOpacity>
//                             </View>
//                              <View style={[styles.breadcrumb, styles.breadcrumbRight]}>
//                                 <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
//                                     <Text style={styles.breadcrumbLink}>Home</Text>
//                                 </TouchableOpacity>

//                                 <Text style={styles.breadcrumbSeparator}>›</Text>

//                                 <Text style={styles.breadcrumbCurrent}>{breadcrumb}</Text>
//                             </View>
//                         </View>
//                     </>
//                 )}

//                 {breadcrumbWithNoHome && (
//                     <>
//                         <View style={styles.breadcrumbContainer}>
//                             <View style={styles.breadcrumb}>
//                                 <TouchableOpacity onPress={() => router.back()}>
//                                     <Text style={styles.breadcrumbLink}>Back</Text>
//                                 </TouchableOpacity>
//                             </View>
//                             <View style={[styles.breadcrumb, styles.breadcrumbRight]}>
//                                 <Text style={styles.breadcrumbCurrent}>{breadcrumbWithNoHome}</Text>
//                             </View>
//                         </View>
//                     </>
//                 )}

//             </SafeAreaView>
//         </LinearGradient>
//     );
// }

// const styles = StyleSheet.create({
//     container_android: {
//         paddingHorizontal: 15,
//         paddingBottom: 10,
//         borderBottomLeftRadius: 12,
//         borderBottomRightRadius: 12,
//         elevation: 6,
//         paddingTop: 25
//     },
//     container: {
//         paddingHorizontal: 15,
//         paddingBottom: 10,
//         borderBottomLeftRadius: 12,
//         borderBottomRightRadius: 12,
//         elevation: 6,
//     },

//     topRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         // marginTop: 10
//     },

//     brand: {
//         flexDirection: 'row',
//         alignItems: 'center'
//     },

//     logoBox: {
//         width: 36,
//         height: 36,
//         borderRadius: 10,
//         backgroundColor: 'transperent',
//         justifyContent: 'center',
//         alignItems: 'center'
//     },

//     logoText: {
//         fontWeight: 'bold',
//         color: theme.BRAND_GRADIENT_END
//     },

//     title: {
//         color: '#fff',
//         fontWeight: '700',
//         fontSize: 18
//     },

//     subtitle: {
//         color: '#E0F2F1',
//         fontSize: 12
//     },

//     actions: {
//         flexDirection: 'row',
//         alignItems: 'center'
//     },

//     iconBtn: {
//         marginRight: 8
//     },

//     avatar: {
//         width: 34,
//         height: 34,
//         borderRadius: 10,
//         backgroundColor: '#fff',
//         justifyContent: 'center',
//         alignItems: 'center'
//     },

//     avatarText: {
//         fontWeight: 'bold',
//         color: theme.BRAND_DARK
//     },

//     userBar: {
//         marginTop: 10
//     },

//     welcome: {
//         color: '#fff',
//         fontSize: 14
//     },

//     small: {
//         color: '#D9F0EE',
//         fontSize: 12
//     },

//     searchBox: {
//         marginTop: 10,
//         backgroundColor: '#fff',
//         flexDirection: 'row',
//         alignItems: 'center',
//         borderRadius: 10,
//         paddingHorizontal: 10,
//         height: 44
//     },

//     input: {
//         flex: 1,
//         marginLeft: 8,
//         color: theme.BRAND_DARK
//     },
//     logoImage: {
//         width: 30,
//         height: 30,
//     },
//     // 
//     breadcrumb: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 8,
//     },
//     breadcrumbContainer: {
//         display: 'flex',
//         // flexDirection: 'row',
//         justifyContent: 'space-between',
//         flexDirection: 'row',
//         alignItems: 'flex-start'
//     },
//     breadcrumbRight: {
//         flex: 1,              // remaining space le
//         maxWidth: '55%',     // 🔥 important (control width)
//         marginLeft: 10,
//         alignSelf: 'flex-end',
//         alignItems: 'flex-end',
//         textAlign: 'right',
//         alignContent: 'flex-end',
//         justifyContent: 'flex-end',
//         position: 'relative'
//     },
//     breadcrumbLink: {
//         color: '#fff',
//         fontSize: 13,
//         opacity: 0.9
//     },
//     breadcrumbSeparator: {
//         color: '#fff',
//         marginHorizontal: 6
//     },
//     // breadcrumbCurrent: {
//     //     color: '#fff',
//     //     fontWeight: '600',
//     //     fontSize: 13
//     // },
//     breadcrumbCurrent: {
//         color: '#fff',
//         fontWeight: '600',
//         fontSize: 13,
//         flexWrap: 'wrap',   // 🔥 multiline enable
//     },
// });

import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import logo from '../assets/images/logo.png';
import theme from './theme';

export default function Header({
    userName,
    onSearch,
    placeholder = 'Search...',
    breadcrumb,
    SearchBar = true,
    breadcrumbWithNoHome,
}: any) {
    const [search, setSearch] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const router = useRouter();

    const initial = (userName || 'U').charAt(0).toUpperCase();

    const closeMenu = () => setMenuVisible(false);

    const handleHome = () => {
        closeMenu();
        router.replace('/(tabs)');
    };

    const handleLogout = () => {
        closeMenu();
        Alert.alert('Logout', 'Are you sure you want to logout?', [
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
                    router.replace('/(all)/landing');
                },
            },
        ]);
    };

    // go back function
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    return (
        <LinearGradient
            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
            style={styles.container}>
            <SafeAreaView>
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.brand} onPress={handleHome}>
                        <Image source={logo} style={styles.logo} resizeMode="contain" />
                        <View>
                            <Text style={styles.pageTitle}>
                                {breadcrumb || breadcrumbWithNoHome || 'FlowNest'}
                            </Text>
                            <Text style={styles.pageSubtitle}>
                                Welcome back, {userName || 'User'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.circleBtn}
                            onPress={() => setMenuVisible(true)}>
                            <Icon name="list" size={22} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.avatar}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

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

                {/* ✅ BREADCRUMB WITH BACK (left) and page name (right) - single line */}
                {breadcrumb && (
                    <View style={styles.breadcrumbChip}>
                        <View style={styles.breadcrumbRow}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={goBack}>
                                <Icon name="arrow-back" size={18} color="#fff" />
                                <Text style={styles.breadcrumbBackText}>Back</Text>
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.replace('/(tabs)')}>
                                    <Icon name="home" size={18} color="#fff" />
                                    {/* <Text style={styles.breadcrumbBackText}>Home</Text> */}
                                </TouchableOpacity>
                                <Text style={styles.breadcrumbSeparator}>›</Text>
                                <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                                    {breadcrumb}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ✅ Same for breadcrumbWithNoHome (only page name, no home link) */}
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
                                    if (item === 'Home') router.replace('/(tabs)');
                                    if (item === 'Settings') router.replace('/settings_main');
                                    if (item === 'Profile') router.replace('/profile');
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? 25 : 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
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
        marginTop: 16, backgroundColor: '#fff', borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 52,
    },
    input: { flex: 1, marginLeft: 10 },
    breadcrumbChip: {
        marginTop: 12,
        // backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 999,
        paddingHorizontal: 14,
        borderBlockColor: 'rgba(255,255,255,0.15)',
        // borderWidth: 1,
        borderTopWidth: 1,
        paddingVertical: 6,
        width: '100%', // takes full width
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20,
    },
    sheetName: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
});