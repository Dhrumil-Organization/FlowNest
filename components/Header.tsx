import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    LayoutAnimation,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import logo from '../assets/images/logo.png';
import theme from './theme';

// ✅ enable animation Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Header({ userName, onSearch, placeholder = 'Search...' }: any) {
    const [search, setSearch] = useState('');
    const [showUserBar, setShowUserBar] = useState(false);
    const router = useRouter();

    const toggleUserBar = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowUserBar(prev => !prev);
    };

    const initial = (userName || 'U').charAt(0).toUpperCase();

    return (
        <LinearGradient
            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
            style={Platform.OS === 'android' ? styles.container_android : styles.container}
        >
            <SafeAreaView>

                {/* 🔥 TOP ROW */}
                <View style={styles.topRow}>

                    {/* LEFT BRAND */}
                    <View style={styles.brand}>
                        <View style={styles.logoBox}>
                            <TouchableOpacity onPress={() => router.replace('/')}>
                                {logo ? (
                                    <Image
                                        source={logo}
                                        style={styles.logoImage}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Text style={styles.logoText}>FN</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.title}>FlowNest</Text>
                            <Text style={styles.subtitle}>Portal</Text>
                        </View>
                    </View>

                    {/* RIGHT ACTIONS */}
                    <View style={styles.actions}>

                        <TouchableOpacity style={styles.iconBtn}>
                            <Icon name="notifications-none" size={22} color="#fff" />
                        </TouchableOpacity>

                        {/* <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => router.push('/settings')}
                        >
                            <Icon name="settings" size={22} color="#fff" />
                        </TouchableOpacity> */}

                        {/* 🔥 AVATAR */}
                        <TouchableOpacity onPress={toggleUserBar}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initial}</Text>
                            </View>
                        </TouchableOpacity>

                    </View>
                </View>

                {/* 🔥 ACCORDION USER BAR */}
                {showUserBar && (
                    <View style={styles.userBar}>
                        <Text style={styles.welcome}>
                            Welcome back, <Text style={{ fontWeight: '700' }}>{userName}</Text>
                        </Text>
                        <Text style={styles.small}>
                            Quick access to your assigned apps
                        </Text>
                    </View>
                )}

                {/* 🔥 SEARCH */}
                <View style={styles.searchBox}>
                    <Icon name="search" size={18} color={theme.BRAND_DARK} />
                    <TextInput
                        value={search}
                        onChangeText={(t) => {
                            setSearch(t);
                            onSearch(t);
                        }}
                        placeholder={placeholder}
                        placeholderTextColor={theme.MUTED}
                        style={styles.input}
                    />

                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearch('');
                            onSearch('');
                        }}>
                            <Icon name="close" size={18} color={theme.BRAND_DARK} />
                        </TouchableOpacity>
                    )}
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container_android: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        elevation: 6,
        paddingTop: 25
    },
    container: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        elevation: 6,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // marginTop: 10
    },

    brand: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    logoBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'transperent',
        justifyContent: 'center',
        alignItems: 'center'
    },

    logoText: {
        fontWeight: 'bold',
        color: theme.BRAND_GRADIENT_END
    },

    title: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18
    },

    subtitle: {
        color: '#E0F2F1',
        fontSize: 12
    },

    actions: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    iconBtn: {
        marginRight: 8
    },

    avatar: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center'
    },

    avatarText: {
        fontWeight: 'bold',
        color: theme.BRAND_DARK
    },

    userBar: {
        marginTop: 10
    },

    welcome: {
        color: '#fff',
        fontSize: 14
    },

    small: {
        color: '#D9F0EE',
        fontSize: 12
    },

    searchBox: {
        marginTop: 10,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 44
    },

    input: {
        flex: 1,
        marginLeft: 8,
        color: theme.BRAND_DARK
    },
    logoImage: {
        width: 30,
        height: 30,
    },
});