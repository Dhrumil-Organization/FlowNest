import React, { useEffect } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import theme from '@/components/theme';
import logo from '../../assets/images/logo.png';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function LandingPage() {
    const router = useRouter();

    useEffect(() => {
        const check = async () => {
            const token = await AsyncStorage.getItem('access_token');
            // const noti_token = await AsyncStorage.getItem('notification_token');
            // setNotitoken(noti_token || '');

            if (token) {
                router.replace('/');
            }
        };

        check();
    }, [router]);

    const features = [
        {
            icon: 'account-balance-wallet',
            title: 'Receivables',
            desc: 'Track outstanding payments and customer balances.',
        },
        {
            icon: 'inventory',
            title: 'Production Tracking',
            desc: 'Monitor manufacturing progress in real-time.',
        },
        {
            icon: 'analytics',
            title: 'Sales Analytics',
            desc: 'Gain business insights through intelligent reports.',
        },
        {
            icon: 'local-shipping',
            title: 'Packing Automation',
            desc: 'Optimize packing and dispatch workflows.',
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={[
                    theme.BRAND_GRADIENT_START,
                    theme.BRAND_GRADIENT_END,
                ]}
                style={styles.hero}
            >
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        Textile ERP Platform
                    </Text>
                </View>

                <View style={{ display: 'flex', flexDirection: 'row' }}>
                    <Image
                        source={logo}
                        style={{ width: 50, height: 50, marginRight: 10, marginBottom: 10 }}
                    />
                    <Text style={styles.title}>
                        FlowNest
                    </Text>
                </View>

                <Text style={styles.subtitle}>
                    Smart ERP for Textile &
                    Manufacturing Businesses
                </Text>

                <Text style={styles.description}>
                    Manage production, collections,
                    receivables, sales analysis and
                    operational workflows from a
                    single platform.
                </Text>

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.primaryText}>
                        Login
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => router.push('/guest-home')}
                >
                    <Text style={styles.guestText}>
                        Continue as Guest
                    </Text>
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>ERP</Text>
                    <Text style={styles.statLabel}>
                        Business Automation
                    </Text>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statValue}>24/7</Text>
                    <Text style={styles.statLabel}>
                        Mobile Access
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Why FlowNest?
                </Text>

                {features.map((item, index) => (
                    <View
                        key={index}
                        style={styles.featureCard}
                    >
                        <View style={styles.iconBox}>
                            <Icon
                                name={item.icon}
                                size={26}
                                color="#fff"
                            />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>
                                {item.title}
                            </Text>

                            <Text style={styles.featureDesc}>
                                {item.desc}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Explore
                </Text>

                <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/about')}
                >
                    <Text style={styles.menuText}>
                        About FlowNest
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/pricing')}
                >
                    <Text style={styles.menuText}>
                        Pricing
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/contact')}
                >
                    <Text style={styles.menuText}>
                        Contact Us
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/signup')}
                >
                    <Text style={styles.menuText}>
                        Create Account
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerTitle}>
                    Developed by Madhusudan Group
                </Text>

                <Text style={styles.footerSub}>
                    Textile Innovation • Manufacturing Excellence
                </Text>
            </View>
        </ScrollView>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.NEUTRAL_BG,
    },

    hero: {
        paddingTop: 90,
        paddingBottom: 50,
        paddingHorizontal: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 15,
    },

    badgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },

    title: {
        color: '#fff',
        fontSize: 40,
        fontWeight: '800',
    },

    subtitle: {
        color: '#fff',
        fontSize: 20,
        marginTop: 8,
        fontWeight: '600',
    },

    description: {
        color: '#EAF7FA',
        lineHeight: 24,
        marginTop: 15,
        fontSize: 15,
    },

    primaryBtn: {
        marginTop: 30,
        backgroundColor: '#fff',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },

    primaryText: {
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '700',
        fontSize: 16,
    },

    guestBtn: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#fff',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },

    guestText: {
        color: '#fff',
        fontWeight: '600',
    },

    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: -25,
        justifyContent: 'space-between',
    },

    statCard: {
        width: width * 0.42,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        elevation: 4,
    },

    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
    },

    statLabel: {
        marginTop: 5,
        color: theme.TEXT_SECONDARY,
    },

    section: {
        padding: 20,
    },

    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.TEXT_PRIMARY,
        marginBottom: 15,
    },

    featureCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 15,
        backgroundColor: theme.BRAND_GRADIENT_END,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },

    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
    },

    featureDesc: {
        marginTop: 4,
        color: '#666',
        lineHeight: 20,
    },

    menuCard: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 16,
        marginBottom: 10,
    },

    menuText: {
        fontSize: 15,
        fontWeight: '600',
    },

    footer: {
        padding: 25,
        alignItems: 'center',
    },

    footerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },

    footerSub: {
        marginTop: 5,
        color: '#666',
        textAlign: 'center',
    },
});
