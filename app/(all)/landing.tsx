// import React, { useEffect } from 'react';
// import {
//     ScrollView,
//     View,
//     Text,
//     TouchableOpacity,
//     StyleSheet,
//     Dimensions,
//     Image,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import theme from '@/components/theme';
// import logo from '../../assets/images/logo.png';
// import AsyncStorage from '@/common/utils/compatibleStorage';

// const { width } = Dimensions.get('window');

// export default function LandingPage() {
//     const router = useRouter();

//     useEffect(() => {
//         const check = async () => {
//             const token = await AsyncStorage.getItem('access_token');
//             // const noti_token = await AsyncStorage.getItem('notification_token');
//             // setNotitoken(noti_token || '');

//             if (token) {
//                 router.replace('/');
//             }
//         };

//         check();
//     }, [router]);

//     const features = [
//         {
//             icon: 'account-balance-wallet',
//             title: 'Yarn Manufacturing',
//             desc: 'Track outstanding payments and customer balances.',
//         },
//         {
//             icon: 'inventory',
//             title: 'Yarn Dyeing',
//             desc: 'Monitor manufacturing progress in real-time.',
//         },
//         {
//             icon: 'analytics',
//             title: 'Sales Analytics',
//             desc: 'Gain business insights through intelligent reports.',
//         },
//         {
//             icon: 'local-shipping',
//             title: 'Packing Automation',
//             desc: 'Optimize packing and dispatch workflows.',
//         },
//     ];

//     return (
//         <ScrollView
//             style={styles.container}
//             showsVerticalScrollIndicator={false}
//         >
//             <LinearGradient
//                 colors={[
//                     theme.BRAND_GRADIENT_START,
//                     theme.BRAND_GRADIENT_END,
//                 ]}
//                 style={styles.hero}
//             >
//                 <View style={styles.badge}>
//                     <Text style={styles.badgeText}>
//                         Textile ERP Platform
//                     </Text>
//                 </View>

//                 <View style={{ display: 'flex', flexDirection: 'row' }}>
//                     <Image
//                         source={logo}
//                         style={{ width: 50, height: 50, marginRight: 10, marginBottom: 10 }}
//                     />
//                     <Text style={styles.title}>
//                         FlowNest
//                     </Text>
//                 </View>

//                 <Text style={styles.subtitle}>
//                     Smart ERP for Textile &
//                     Manufacturing Businesses
//                 </Text>

//                 <Text style={styles.description}>
//                     Manage production, collections,
//                     receivables, sales analysis and
//                     operational workflows from a
//                     single platform.
//                 </Text>

//                 <TouchableOpacity
//                     style={styles.primaryBtn}
//                     onPress={() => router.replace('/(auth)/login')}
//                 >
//                     <Text style={styles.primaryText}>
//                         Login
//                     </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                     style={styles.guestBtn}
//                     // onPress={() => router.push('/guest-home')}
//                     onPress={() => router.push('/signup')}
//                 >
//                     <Text style={styles.guestText}>
//                         {/* Continue as Guest */}
//                         Sign Up
//                     </Text>
//                 </TouchableOpacity>
//             </LinearGradient>

//             <View style={styles.statsContainer}>
//                 <View style={styles.statCard}>
//                     <Text style={styles.statValue}>ERP</Text>
//                     <Text style={styles.statLabel}>
//                         Business Automation
//                     </Text>
//                 </View>

//                 <View style={styles.statCard}>
//                     <Text style={styles.statValue}>24/7</Text>
//                     <Text style={styles.statLabel}>
//                         Mobile Access
//                     </Text>
//                 </View>
//             </View>

//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>
//                     Why Us?
//                 </Text>

//                 {features.map((item, index) => (
//                     <View
//                         key={index}
//                         style={styles.featureCard}
//                     >
//                         <View style={styles.iconBox}>
//                             <Icon
//                                 name={item.icon}
//                                 size={26}
//                                 color="#fff"
//                             />
//                         </View>

//                         <View style={{ flex: 1 }}>
//                             <Text style={styles.featureTitle}>
//                                 {item.title}
//                             </Text>

//                             <Text style={styles.featureDesc}>
//                                 {item.desc}
//                             </Text>
//                         </View>
//                     </View>
//                 ))}
//             </View>

//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>
//                     Explore
//                 </Text>

//                 <TouchableOpacity
//                     style={styles.menuCard}
//                     onPress={() => router.push('/about')}
//                 >
//                     <Text style={styles.menuText}>
//                         About FlowNest
//                     </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                     style={styles.menuCard}
//                     onPress={() => router.push('/pricing')}
//                 >
//                     <Text style={styles.menuText}>
//                         Pricing
//                     </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                     style={styles.menuCard}
//                     onPress={() => router.push('/contact')}
//                 >
//                     <Text style={styles.menuText}>
//                         Contact Us
//                     </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                     style={styles.menuCard}
//                     onPress={() => router.push('/signup')}
//                 >
//                     <Text style={styles.menuText}>
//                         Create Account
//                     </Text>
//                 </TouchableOpacity>
//             </View>

//             <View style={styles.footer}>
//                 <Text style={styles.footerTitle}>
//                     Developed by Madhusudan Group
//                 </Text>

//                 <Text style={styles.footerSub}>
//                     Textile Innovation • Manufacturing Excellence
//                 </Text>
//             </View>
//         </ScrollView>

//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: theme.NEUTRAL_BG,
//     },

//     hero: {
//         paddingTop: 90,
//         paddingBottom: 50,
//         paddingHorizontal: 25,
//         borderBottomLeftRadius: 30,
//         borderBottomRightRadius: 30,
//     },

//     badge: {
//         alignSelf: 'flex-start',
//         backgroundColor: 'rgba(255,255,255,0.15)',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 20,
//         marginBottom: 15,
//     },

//     badgeText: {
//         color: '#fff',
//         fontWeight: '600',
//         fontSize: 12,
//     },

//     title: {
//         color: '#fff',
//         fontSize: 40,
//         fontWeight: '800',
//     },

//     subtitle: {
//         color: '#fff',
//         fontSize: 20,
//         marginTop: 8,
//         fontWeight: '600',
//     },

//     description: {
//         color: '#EAF7FA',
//         lineHeight: 24,
//         marginTop: 15,
//         fontSize: 15,
//     },

//     primaryBtn: {
//         marginTop: 30,
//         backgroundColor: '#fff',
//         height: 52,
//         borderRadius: 26,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     primaryText: {
//         color: theme.BRAND_GRADIENT_END,
//         fontWeight: '700',
//         fontSize: 16,
//     },

//     guestBtn: {
//         marginTop: 12,
//         borderWidth: 1,
//         borderColor: '#fff',
//         height: 52,
//         borderRadius: 26,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     guestText: {
//         color: '#fff',
//         fontWeight: '600',
//     },

//     statsContainer: {
//         flexDirection: 'row',
//         paddingHorizontal: 20,
//         marginTop: -25,
//         justifyContent: 'space-between',
//     },

//     statCard: {
//         width: width * 0.42,
//         backgroundColor: '#fff',
//         borderRadius: 18,
//         padding: 18,
//         elevation: 4,
//     },

//     statValue: {
//         fontSize: 24,
//         fontWeight: '800',
//         color: theme.BRAND_GRADIENT_END,
//     },

//     statLabel: {
//         marginTop: 5,
//         color: theme.TEXT_SECONDARY,
//     },

//     section: {
//         padding: 20,
//     },

//     sectionTitle: {
//         fontSize: 22,
//         fontWeight: '700',
//         color: theme.TEXT_PRIMARY,
//         marginBottom: 15,
//     },

//     featureCard: {
//         backgroundColor: '#fff',
//         borderRadius: 18,
//         padding: 16,
//         marginBottom: 12,
//         flexDirection: 'row',
//         alignItems: 'center',
//     },

//     iconBox: {
//         width: 52,
//         height: 52,
//         borderRadius: 15,
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 15,
//     },

//     featureTitle: {
//         fontSize: 16,
//         fontWeight: '700',
//     },

//     featureDesc: {
//         marginTop: 4,
//         color: '#666',
//         lineHeight: 20,
//     },

//     menuCard: {
//         backgroundColor: '#fff',
//         padding: 18,
//         borderRadius: 16,
//         marginBottom: 10,
//     },

//     menuText: {
//         fontSize: 15,
//         fontWeight: '600',
//     },

//     footer: {
//         padding: 25,
//         alignItems: 'center',
//     },

//     footerTitle: {
//         fontSize: 16,
//         fontWeight: '700',
//     },

//     footerSub: {
//         marginTop: 5,
//         color: '#666',
//         textAlign: 'center',
//     },
// });
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import logo from '../../assets/images/logo.png';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const CARD_SPACING = 14;
export default function LandingPage() {
    const router = useRouter();
    const params = useLocalSearchParams<{ notificationLoginRequired?: string }>();
    const [notificationLoginRequired, setNotificationLoginRequired] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);
    const currentIndex = useRef(0);
    const [lookupPlatform, setLookupPlatform] = useState<null>(null);

    useEffect(() => {
        console.log('Notification Login Required:', params.notificationLoginRequired);
        setNotificationLoginRequired(params.notificationLoginRequired === '1');
        if (params.notificationLoginRequired === '1') {
            AppAlert.alert('Please log in to open this notification', 'You are currently logged out. Please log in first, then open the notification again to access its screen.');
        }
    }, [params.notificationLoginRequired]);

    useEffect(() => {
        const check = async () => {
            const token = await AsyncStorage.getItem('access_token');
            const l = await AsyncStorage.getItem('LOOKUP_PLATFORM');
            console.log('L:', l);
            if (token && l === 'NEW') {
                router.replace('/new');
            } else if (token && l !== 'NEW') {
                router.replace('/(tabs)');
            }
        };
        check();
    }, [router]);

    // Auto-scroll logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current && features.length > 0) {
                currentIndex.current =
                    (currentIndex.current + 1) % features.length;
                scrollRef.current.scrollTo({
                    x: currentIndex.current * (CARD_WIDTH + CARD_SPACING),
                    animated: true,
                });
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const features = [
        {
            icon: 'precision-manufacturing',
            title: 'Yarn Manufacturing',
            value: '1,000',
            unit: 'tons per month',
            desc: 'High-quality yarn production with automated quality checks at every stage.',
        },
        {
            icon: 'colorize',
            title: 'Yarn Dyeing',
            value: '1,000',
            unit: 'tons per month',
            desc: 'Advanced dyeing technology ensuring consistent shades and finish.',
        },
        {
            icon: 'grid-on',
            title: 'Weaving',
            value: '1.5',
            unit: 'million metres per month',
            desc: 'State-of-the-art looms delivering precision woven fabrics.',
        },
        {
            icon: 'linear-scale',
            title: 'Warp Knitting',
            value: '300',
            unit: 'tons per month',
            desc: 'Modern warp knitting for stretchable, durable textile solutions.',
        },
        {
            icon: 'donut-large',
            title: 'Circular Knitting',
            value: '300',
            unit: 'tons per month',
            desc: 'High-speed circular knitting for premium knit fabrics.',
        },
        {
            icon: 'brush',
            title: 'Fabric Processing & Printing',
            value: '30',
            unit: 'million meters per month',
            desc: 'Complete fabric finishing and digital printing capabilities.',
        },
        {
            icon: 'checkroom',
            title: 'Garment',
            value: '1.25',
            unit: 'lakhs per month',
            desc: 'End-to-end garment manufacturing with quality stitching.',
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            {notificationLoginRequired && (
                <View style={styles.notificationLoginBanner}>
                    <View style={styles.notificationLoginIcon}>
                        <Icon name="notifications-none" size={22} color="#fff" />
                    </View>
                    <View style={styles.notificationLoginContent}>
                        <Text style={styles.notificationLoginTitle}>Please log in to open this notification</Text>
                        <Text style={styles.notificationLoginMessage}>
                            You are currently logged out. Please log in first, then open the notification again to access its screen.
                        </Text>
                    </View>
                    <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => setNotificationLoginRequired(false)}
                        style={styles.notificationLoginClose}
                    >
                        <Text style={styles.notificationLoginCloseText}>×</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ============== HERO SECTION ============== */}
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

                <View style={styles.logoRow}>
                    <Image
                        source={logo}
                        style={styles.logo}
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
                    // onPress={() => router.replace('/(auth)/login')}
                    onPress={() => router.replace('/lookup-select')}
                >
                    <Text style={styles.primaryText}>
                        Login
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => router.push('/signup')}
                >
                    <Text style={styles.guestText}>
                        Sign Up
                    </Text>
                </TouchableOpacity>
            </LinearGradient>

            {/* ============== STATS SECTION ============== */}
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

            {/* ============== WHY US? CAROUSEL ============== */}
            <View style={styles.section}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>
                        Why Us?
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        Highlights
                    </Text>
                </View>

                <Text style={styles.heroText}>
                    Facts about Madhusudan Group
                </Text>

                {/* Auto-scrolling horizontal carousel */}
                <Animated.ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_SPACING}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselContainer}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                >
                    {features.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.85}
                            style={styles.featureCard}
                        // onPress={() => router.replace('/(auth)/login')}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.iconBox}>
                                    <Icon
                                        name={item.icon}
                                        size={28}
                                        color={theme.BRAND_GRADIENT_END}
                                    />
                                </View>
                                <Text style={styles.featureTitle}>
                                    {item.title}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.valueBox}>
                                <Text style={styles.featureValue}>
                                    {item.value}
                                </Text>
                                <Text style={styles.featureUnit}>
                                    {item.unit}
                                </Text>
                            </View>

                            <Text style={styles.featureDesc}>
                                {item.desc}
                            </Text>

                            {/* <View style={styles.tapHint}>
                                <Text style={styles.tapText}>
                                    Tap to explore →
                                </Text>
                            </View> */}
                        </TouchableOpacity>
                    ))}
                </Animated.ScrollView>

                {/* Pagination dots */}
                <View style={styles.pagination}>
                    {features.map((_, index) => {
                        const inputRange = [
                            (index - 1) * (CARD_WIDTH + CARD_SPACING),
                            index * (CARD_WIDTH + CARD_SPACING),
                            (index + 1) * (CARD_WIDTH + CARD_SPACING),
                        ];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>

            {/* ============== EXPLORE SECTION ============== */}
            <View style={styles.section}>

                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>
                        Explore
                    </Text>

                </View>

                <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/about')}
                >
                    <Text style={styles.menuText}>
                        About Us
                    </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                    style={styles.menuCard}
                    onPress={() => router.push('/pricing')}
                >
                    <Text style={styles.menuText}>
                        Pricing
                    </Text>
                </TouchableOpacity> */}

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

            {/* ============== FOOTER ============== */}
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
    notificationLoginBanner: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#7A4B00',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    notificationLoginIcon: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 10,
    },
    notificationLoginContent: { flex: 1 },
    notificationLoginTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
    notificationLoginMessage: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 19, marginTop: 4 },
    notificationLoginClose: { paddingLeft: 8 },
    notificationLoginCloseText: { color: '#fff', fontSize: 24, lineHeight: 24 },

    /* ===== HERO ===== */
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

    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    logo: {
        width: 50,
        height: 50,
        marginRight: 10,
        marginBottom: 10,
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

    /* ===== STATS ===== */
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

    /* ===== SECTION ===== */
    section: {
        paddingTop: 20,
        paddingBottom: 10,
    },

    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },

    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.TEXT_PRIMARY,
    },

    sectionSubtitle: {
        fontSize: 13,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    heroText: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.TEXT_PRIMARY,
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 5,
    },

    /* ===== CAROUSEL ===== */
    carouselContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },

    featureCard: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginRight: CARD_SPACING,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: `${theme.BRAND_GRADIENT_END}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    featureTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.TEXT_PRIMARY,
        flex: 1,
    },

    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 15,
    },

    valueBox: {
        alignItems: 'flex-start',
    },

    featureValue: {
        fontSize: 42,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
        letterSpacing: -1,
    },

    featureUnit: {
        fontSize: 13,
        color: theme.TEXT_SECONDARY,
        marginTop: 2,
    },

    featureDesc: {
        marginTop: 12,
        color: '#666',
        lineHeight: 20,
        fontSize: 13,
    },

    tapHint: {
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },

    tapText: {
        fontSize: 12,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600',
    },

    /* ===== PAGINATION DOTS ===== */
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        paddingHorizontal: 20,
    },

    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.BRAND_GRADIENT_END,
        marginHorizontal: 3,
    },

    /* ===== MENU CARDS ===== */
    menuCard: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 16,
        marginBottom: 10,
        marginHorizontal: 20,
        marginTop: 20
    },

    menuText: {
        fontSize: 15,
        fontWeight: '600',
    },

    /* ===== FOOTER ===== */
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
