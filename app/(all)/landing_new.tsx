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
// import { useRouter } from 'expo-router';
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
import AsyncStorage from '@/common/utils/compatibleStorage';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import logo from '../../assets/images/logo.png';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const CARD_SPACING = 14;
export default function LandingPage() {
    const router = useRouter();
    const { width: viewportWidth } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && viewportWidth >= 1100;
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);
    const currentIndex = useRef(0);
    const [lookupPlatform, setLookupPlatform] = useState<null>(null);

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

    if (isDesktopWeb) {
        return (
            <ScrollView style={styles.webPage} showsVerticalScrollIndicator={false}>
                <View style={styles.webNav}>
                    <View style={[styles.webInner, styles.webNavInner]}>
                        <View style={styles.webBrand}>
                            <Image source={logo} style={styles.webLogo} />
                            <View>
                                <Text style={styles.webBrandName}>FlowNest</Text>
                                <Text style={styles.webBrandMeta}>TEXTILE ERP PLATFORM</Text>
                            </View>
                        </View>
                        <View style={styles.webNavActions}>
                            <TouchableOpacity style={styles.webNavLink} onPress={() => router.push('/about')}>
                                <Text style={styles.webNavLinkText}>About</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.webNavLink} onPress={() => router.push('/contact')}>
                                <Text style={styles.webNavLinkText}>Contact</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.webNavLogin} onPress={() => router.replace('/lookup-select')}>
                                <Text style={styles.webNavLoginText}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={styles.webHero}
                >
                    <View style={styles.webInner}>
                        <View style={styles.webHeroRow}>
                            <View style={styles.webHeroCopy}>
                                <Text style={styles.webKicker}>BUILT FOR TEXTILE & MANUFACTURING</Text>
                                <Text style={styles.webTitle}>One connected platform to run your textile business.</Text>
                                <Text style={styles.webDescription}>
                                    Production, inventory, sales, collections, receivables and operational workflows — connected for clearer business decisions.
                                </Text>
                                <View style={styles.webActions}>
                                    <TouchableOpacity style={styles.webPrimary} onPress={() => router.replace('/lookup-select')}>
                                        <Text style={styles.webPrimaryText}>Login to FlowNest</Text>
                                        <Icon name="arrow-forward" size={18} color={theme.BRAND_GRADIENT_END} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.webSecondary} onPress={() => router.push('/signup')}>
                                        <Text style={styles.webSecondaryText}>Create Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.webPanel}>
                                <Text style={styles.webPanelKicker}>BUSINESS OPERATIONS</Text>
                                <Text style={styles.webPanelTitle}>Visibility across the complete operation</Text>
                                {[
                                    ['precision-manufacturing', 'Production'],
                                    ['inventory', 'Inventory'],
                                    ['trending-up', 'Sales'],
                                    ['payments', 'Collections'],
                                    ['account-balance-wallet', 'Receivables'],
                                    ['analytics', 'Analytics'],
                                ].map(([iconName, label]) => (
                                    <View key={label} style={styles.webOperation}>
                                        <View style={styles.webOperationIcon}>
                                            <Icon name={iconName as any} size={19} color={theme.BRAND_GRADIENT_END} />
                                        </View>
                                        <Text style={styles.webOperationText}>{label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.webInner}>
                    <View style={styles.webMetrics}>
                        <View style={styles.webMetric}><Text style={styles.webMetricValue}>ERP</Text><Text style={styles.webMetricLabel}>Business Automation</Text></View>
                        <View style={styles.webMetricLine} />
                        <View style={styles.webMetric}><Text style={styles.webMetricValue}>24/7</Text><Text style={styles.webMetricLabel}>Secure Access</Text></View>
                        <View style={styles.webMetricLine} />
                        <View style={styles.webMetric}><Text style={styles.webMetricValue}>1</Text><Text style={styles.webMetricLabel}>Connected Platform</Text></View>
                    </View>

                    <View style={styles.webSectionHeader}>
                        <View>
                            <Text style={styles.webSectionKicker}>MADHUSUDAN GROUP</Text>
                            <Text style={styles.webSectionTitle}>Manufacturing capability at scale</Text>
                        </View>
                        <Text style={styles.webSectionCopy}>Real textile operations supported by production capacity and domain experience.</Text>
                    </View>

                    <View style={styles.webCards}>
                        {features.map((item) => (
                            <View key={item.title} style={styles.webCard}>
                                <View style={styles.webCardIcon}><Icon name={item.icon as any} size={21} color={theme.BRAND_GRADIENT_END} /></View>
                                <Text style={styles.webCardTitle}>{item.title}</Text>
                                <Text style={styles.webCardValue}>{item.value}</Text>
                                <Text style={styles.webCardUnit}>{item.unit}</Text>
                                <Text style={styles.webCardDesc}>{item.desc}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.webBottom}>
                        <View>
                            <Text style={styles.webSectionKicker}>FLOWNEST</Text>
                            <Text style={styles.webBottomTitle}>Built around real manufacturing workflows.</Text>
                        </View>
                        <View style={styles.webBottomActions}>
                            <TouchableOpacity style={styles.webOutline} onPress={() => router.push('/about')}><Text style={styles.webOutlineText}>About Us</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.webOutline} onPress={() => router.push('/contact')}><Text style={styles.webOutlineText}>Contact Us</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.webFooter}>
                    <Text style={styles.webFooterText}>FlowNest · Developed by Madhusudan Group · Textile Innovation · Manufacturing Excellence</Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
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

    webPage: { flex: 1, backgroundColor: '#F4F6F7' },
    webNav: { minHeight: 72, justifyContent: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    webInner: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 28 },
    webBrand: { flexDirection: 'row', alignItems: 'center' },
    webLogo: { width: 38, height: 38, marginRight: 10 },
    webBrandName: { color: '#10222B', fontSize: 21, fontWeight: '800' },
    webBrandMeta: { color: '#70808A', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
    webNavActions: { flexDirection: 'row', alignItems: 'center' },
    webNavLink: { paddingHorizontal: 15, paddingVertical: 10 },
    webNavLinkText: { color: '#48575F', fontSize: 14, fontWeight: '600' },
    webNavLogin: { marginLeft: 10, minWidth: 108, height: 40, borderRadius: 7, backgroundColor: '#10222B', alignItems: 'center', justifyContent: 'center' },
    webNavLoginText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    webHero: { paddingVertical: 68 },
    webHeroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    webHeroCopy: { width: '55%', paddingRight: 55 },
    webKicker: { color: '#D9EEF1', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
    webTitle: { marginTop: 17, color: '#FFFFFF', fontSize: 46, lineHeight: 54, fontWeight: '800', letterSpacing: -1.1 },
    webDescription: { marginTop: 19, maxWidth: 610, color: '#D8EEF1', fontSize: 17, lineHeight: 28 },
    webActions: { marginTop: 29, flexDirection: 'row' },
    webPrimary: { height: 48, minWidth: 190, paddingHorizontal: 20, borderRadius: 7, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    webPrimaryText: { marginRight: 9, color: theme.BRAND_GRADIENT_END, fontSize: 14, fontWeight: '800' },
    webSecondary: { marginLeft: 12, height: 48, minWidth: 150, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,.55)', alignItems: 'center', justifyContent: 'center' },
    webSecondaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    webPanel: { width: '39%', maxWidth: 450, padding: 25, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#00161D', shadowOffset: { width: 0, height: 12 }, shadowOpacity: .14, shadowRadius: 28, elevation: 8 },
    webPanelKicker: { color: theme.BRAND_GRADIENT_END, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
    webPanelTitle: { marginTop: 7, marginBottom: 17, color: '#10222B', fontSize: 21, lineHeight: 28, fontWeight: '800' },
    webOperation: { height: 46, borderTopWidth: 1, borderTopColor: '#EDF0F1', flexDirection: 'row', alignItems: 'center' },
    webOperationIcon: { width: 32, height: 32, marginRight: 10, borderRadius: 7, backgroundColor: `${theme.BRAND_GRADIENT_END}10`, alignItems: 'center', justifyContent: 'center' },
    webOperationText: { color: '#31434B', fontSize: 13, fontWeight: '700' },
    webMetrics: { marginTop: 32, minHeight: 90, paddingHorizontal: 25, borderWidth: 1, borderColor: '#E4E9EB', borderRadius: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center' },
    webMetric: { flex: 1, alignItems: 'center' },
    webMetricValue: { color: theme.BRAND_GRADIENT_END, fontSize: 23, fontWeight: '800' },
    webMetricLabel: { marginTop: 4, color: '#69777E', fontSize: 12, fontWeight: '600' },
    webMetricLine: { width: 1, height: 36, backgroundColor: '#E4E9EB' },
    webSectionHeader: { marginTop: 50, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    webSectionKicker: { color: theme.BRAND_GRADIENT_END, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
    webSectionTitle: { marginTop: 6, color: '#10222B', fontSize: 29, fontWeight: '800' },
    webSectionCopy: { width: 360, color: '#6C7A81', fontSize: 13, lineHeight: 20, textAlign: 'right' },
    webCards: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    webCard: { width: '25%', minHeight: 205, marginBottom: 12, padding: 17, borderWidth: 6, borderColor: '#F4F6F7', borderRadius: 12, backgroundColor: '#FFFFFF' },
    webCardIcon: { width: 38, height: 38, marginBottom: 12, borderRadius: 8, backgroundColor: `${theme.BRAND_GRADIENT_END}10`, alignItems: 'center', justifyContent: 'center' },
    webCardTitle: { color: '#263840', fontSize: 13, fontWeight: '800' },
    webCardValue: { marginTop: 18, color: theme.BRAND_GRADIENT_END, fontSize: 27, fontWeight: '800' },
    webCardUnit: { color: '#738189', fontSize: 10 },
    webCardDesc: { marginTop: 10, color: '#68777F', fontSize: 10, lineHeight: 15 },
    webBottom: { marginTop: 36, marginBottom: 48, paddingTop: 34, borderTopWidth: 1, borderTopColor: '#DDE3E6', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    webBottomTitle: { marginTop: 6, color: '#10222B', fontSize: 24, fontWeight: '800' },
    webBottomActions: { flexDirection: 'row' },
    webOutline: { minWidth: 120, height: 40, marginLeft: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#D3DBDE', borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    webOutlineText: { color: '#31434B', fontSize: 12, fontWeight: '700' },
    webFooter: { minHeight: 80, borderTopWidth: 1, borderTopColor: '#E1E6E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    webFooterText: { color: '#78868D', fontSize: 10, textAlign: 'center' }
,
    webNavInner: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
