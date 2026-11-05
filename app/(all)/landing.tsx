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
import { ensureSingleErp } from '@/src/core/singleErp';
import { ThemeToggleButton } from '@/src/core/theme/ThemeControls';
import { useTheme } from '@/src/core/theme/themeMode';
import { AuthButton, BrandMark, NAVY, useAuthResponsive } from '@/src/components/auth/AuthUI';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CARD_SPACING = 14;
export default function LandingPage() {
    // Theme: this page is outside the NEW ERP navigator, so it listens to the
    // theme itself — on a change the whole page is drawn again in the new
    // colours (nothing typed on the page is lost).
    useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ notificationLoginRequired?: string }>();
    const [notificationLoginRequired, setNotificationLoginRequired] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const { width, isWide, isTablet, isDesktop, gutter } = useAuthResponsive();
    // Carousel geometry (mobile only). Kept in a ref so the auto-scroll
    // interval below always uses the current card width after rotation /
    // browser resize.
    const CARD_WIDTH = Math.min(Math.round(width * 0.76), 340);
    const cardStepRef = useRef(CARD_WIDTH + CARD_SPACING);
    cardStepRef.current = CARD_WIDTH + CARD_SPACING;
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
            // One ERP: an old-platform session is cleared here (sign in again).
            await ensureSingleErp();
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                router.replace('/new');
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
                    x: currentIndex.current * cardStepRef.current,
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

    // Straight to the ERP sign-in (the Legacy / New selection step is removed).
    const goLogin = async () => {
        await ensureSingleErp();
        router.replace('/new/property-select');
    };
    const goSignup = () => router.push('/signup');

    const stats = [
        { value: 'ERP', label: 'Business Automation', icon: 'hub' },
        { value: '24/7', label: 'Mobile Access', icon: 'devices' },
    ];

    const explore = [
        { icon: 'info-outline', title: 'About Us', desc: 'Our story, businesses and values.', onPress: () => router.push('/about') },
        { icon: 'support-agent', title: 'Contact Us', desc: 'Talk to our team about FlowNest.', onPress: () => router.push('/contact') },
        { icon: 'person-add-alt', title: 'Create Account', desc: 'Register and start in minutes.', onPress: () => router.push('/signup') },
    ];

    const gridColumns = isDesktop ? 4 : isWide ? 3 : 2;
    const inner = { width: '100%' as const, maxWidth: 1200, alignSelf: 'center' as const, paddingHorizontal: gutter };
    const showGrid = isWide || isTablet;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar barStyle="light-content" backgroundColor={T.nav} />

            {/* ============== HERO SECTION ============== */}
            <View style={styles.hero}>
                                <SafeAreaView edges={['top']}>
                    <View style={[inner, styles.nav]}>
                        <BrandMark size={isWide ? 38 : 32} caption="MADHUSUDAN GROUP" />

                        {isWide || isTablet ? (
                            <View style={styles.navLinks}>
                                <TouchableOpacity onPress={() => router.push('/about')} style={styles.navLink}>
                                    <Text style={styles.navLinkText}>About Us</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => router.push('/contact')} style={styles.navLink}>
                                    <Text style={styles.navLinkText}>Contact Us</Text>
                                </TouchableOpacity>
                                <AuthButton label="Sign Up" variant="outlineLight" onPress={goSignup} style={styles.navBtn} />
                                <AuthButton label="Login" onPress={goLogin} style={[styles.navBtn, { marginLeft: 10 }]} />
                                {/* Light <-> Dark */}
                                <View style={{ marginLeft: 10 }}>
                                    <ThemeToggleButton onDark size={40} />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.navMobileRight}>
                                {/* Light <-> Dark */}
                                <ThemeToggleButton onDark size={34} />
                                <TouchableOpacity onPress={goLogin} style={styles.navLoginPill} accessibilityRole="button">
                                    <Text style={styles.navLoginText}>Login</Text>
                                    <Icon name="arrow-forward" size={15} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {notificationLoginRequired && (
                        <View style={inner}>
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
                        </View>
                    )}

                    <View style={[inner, styles.heroBody, isWide && styles.heroBodyWide]}>
                        <View style={[styles.heroCopy, isWide && { flex: 1.15, paddingRight: 48 }]}>
                            <View style={styles.badge}>
                                <View style={styles.badgeDot} />
                                <Text style={styles.badgeText}>Textile ERP Platform</Text>
                            </View>

                            <Text style={[styles.title, isTablet && styles.titleTablet, isWide && styles.titleWide]}>
                                Smart ERP for Textile & Manufacturing Businesses
                            </Text>

                            <Text style={[styles.description, isWide && { fontSize: 17, lineHeight: 28 }]}>
                                Manage production, collections, receivables, sales analysis and
                                operational workflows from a single platform.
                            </Text>

                            <View style={[styles.ctaRow, !(isWide || isTablet) && styles.ctaColumn]}>
                                <AuthButton
                                    label="Login"
                                    icon="arrow-forward"
                                    onPress={goLogin}
                                    style={[styles.cta, (isWide || isTablet) && { marginRight: 12 }]}
                                />
                                <AuthButton
                                    label="Sign Up"
                                    variant="outlineLight"
                                    onPress={goSignup}
                                    style={[styles.cta, !(isWide || isTablet) && { marginTop: 12 }]}
                                />
                            </View>
                        </View>

                        {isWide ? (
                            <View style={styles.heroPanel}>
                                <Text style={styles.heroPanelEyebrow}>MADHUSUDAN GROUP AT A GLANCE</Text>
                                {stats.map((st) => (
                                    <View key={st.label} style={styles.heroPanelRow}>
                                        <View style={styles.heroPanelIcon}>
                                            <Icon name={st.icon as any} size={20} color={T.copper} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.heroPanelValue}>{st.value}</Text>
                                            <Text style={styles.heroPanelLabel}>{st.label}</Text>
                                        </View>
                                    </View>
                                ))}
                                <View style={styles.heroPanelDivider} />
                                <View style={styles.chipWrap}>
                                    {features.map((f) => (
                                        <View key={f.title} style={styles.chip}>
                                            <Icon name={f.icon as any} size={13} color={NAVY.sub} />
                                            <Text style={styles.chipText}>{f.title}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}
                    </View>
                </SafeAreaView>
            </View>

            {/* ============== STATS SECTION (mobile / tablet) ============== */}
            {!isWide ? (
                <View style={[inner, styles.statsContainer]}>
                    {stats.map((st, i) => (
                        <View key={st.label} style={[styles.statCard, i === 0 && { marginRight: 12 }]}>
                            <View style={styles.statIcon}>
                                <Icon name={st.icon as any} size={18} color={T.copper} />
                            </View>
                            <Text style={styles.statValue}>{st.value}</Text>
                            <Text style={styles.statLabel}>{st.label}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {/* ============== WHY US? ============== */}
            <View style={[styles.section, isWide && { paddingTop: 64 }]}>
                <View style={inner}>
                    <View style={styles.headerRow}>
                        <Text style={styles.sectionEyebrow}>WHY US? · HIGHLIGHTS</Text>
                    </View>
                    <Text style={[styles.heroText, isWide && { fontSize: 32, lineHeight: 40 }]}>
                        Facts about Madhusudan Group
                    </Text>
                    <Text style={styles.sectionSub}>
                        An integrated textile value chain — from yarn to garment.
                    </Text>
                </View>

                {showGrid ? (
                    <View style={inner}>
                        <View style={styles.grid}>
                            {features.map((item, index) => {
                                // On a 2-column tablet grid an odd last card spans the full row.
                                const spanFull = gridColumns === 2 && features.length % 2 === 1 && index === features.length - 1;
                                return (
                                    <View key={item.title} style={[styles.gridCell, { width: (spanFull ? '100%' : `${100 / gridColumns}%`) as any }]}>
                                        <FeatureCard item={item} />
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <>
                        {/* Auto-scrolling horizontal carousel */}
                        <Animated.ScrollView
                            ref={scrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + CARD_SPACING}
                            decelerationRate="fast"
                            contentContainerStyle={[styles.carouselContainer, { paddingHorizontal: gutter }]}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        >
                            {features.map((item, index) => (
                                <View key={index} style={{ width: CARD_WIDTH, marginRight: CARD_SPACING }}>
                                    <FeatureCard item={item} />
                                </View>
                            ))}
                        </Animated.ScrollView>

                        {/* Pagination dots */}
                        <View style={styles.pagination}>
                            {features.map((_, index) => {
                                const step = CARD_WIDTH + CARD_SPACING;
                                const inputRange = [(index - 1) * step, index * step, (index + 1) * step];
                                const dotWidth = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [8, 24, 8],
                                    extrapolate: 'clamp',
                                });
                                const opacity = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.35, 1, 0.35],
                                    extrapolate: 'clamp',
                                });
                                return (
                                    <Animated.View
                                        key={index}
                                        style={[styles.dot, { width: dotWidth, opacity }]}
                                    />
                                );
                            })}
                        </View>
                    </>
                )}
            </View>

            {/* ============== EXPLORE SECTION ============== */}
            <View style={styles.section}>
                <View style={inner}>
                    <Text style={styles.sectionEyebrow}>EXPLORE</Text>
                    <Text style={[styles.heroText, { marginBottom: 16 }]}>Get to know FlowNest</Text>

                    <View style={[styles.exploreWrap, isWide && styles.exploreRow]}>
                        {explore.map((item) => (
                            <View key={item.title} style={isWide ? styles.exploreCell : undefined}>
                                <TouchableOpacity
                                    style={styles.menuCard}
                                    onPress={item.onPress}
                                    activeOpacity={0.85}
                                    accessibilityRole="link"
                                >
                                    <View style={styles.menuIcon}>
                                        <Icon name={item.icon as any} size={20} color={T.copper} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuText}>{item.title}</Text>
                                        <Text style={styles.menuDesc}>{item.desc}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={22} color={T.muted} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* ============== CTA BAND ============== */}
            <View style={inner}>
                <View style={[styles.ctaBand, (isWide || isTablet) && styles.ctaBandRow]}>
                    <View style={{ flex: (isWide || isTablet) ? 1 : undefined }}>
                        <Text style={styles.ctaBandTitle}>Ready to get started?</Text>
                        <Text style={styles.ctaBandSub}>Sign in to your ERP or create a new account.</Text>
                    </View>
                    <View style={[styles.ctaBandActions, !(isWide || isTablet) && { marginTop: 16 }]}>
                        <AuthButton label="Create Account" variant="outlineLight" onPress={goSignup} style={styles.ctaBandBtn} />
                        <AuthButton label="Login" icon="arrow-forward" onPress={goLogin} style={[styles.ctaBandBtn, { marginLeft: 10 }]} />
                    </View>
                </View>
            </View>

            {/* ============== FOOTER ============== */}
            <View style={styles.footer}>
                <View style={[inner, styles.footerInner, (isWide || isTablet) && styles.footerInnerRow]}>
                    <BrandMark size={28} light={false} />
                    <View style={[{ alignItems: 'center' }, (isWide || isTablet) && { alignItems: 'flex-end' }]}>
                        <Text style={styles.footerTitle}>
                            Developed by Madhusudan Group
                        </Text>
                        <Text style={styles.footerSub}>
                            Textile Innovation • Manufacturing Excellence
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

type Feature = { icon: string; title: string; value: string; unit: string; desc: string };

function FeatureCard({ item }: { item: Feature }) {
    return (
        <View style={styles.featureCard}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Icon name={item.icon as any} size={24} color={T.copper} />
                </View>
                <Text style={styles.featureTitle}>{item.title}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.valueBox}>
                <Text style={styles.featureValue}>{item.value}</Text>
                <Text style={styles.featureUnit}>{item.unit}</Text>
            </View>

            <Text style={styles.featureDesc}>{item.desc}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.bg,
    },
    notificationLoginBanner: {
        marginTop: 8,
        marginBottom: 4,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#7A4B00',
        borderWidth: 1,
        borderColor: 'rgba(201,138,26,0.6)',
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
        backgroundColor: T.nav,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 8,
    },
    navLinks: { flexDirection: 'row', alignItems: 'center' },
    navMobileRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    navLink: { paddingHorizontal: 14, paddingVertical: 8 },
    navLinkText: { color: NAVY.sub, fontSize: 14, fontWeight: '700' },
    navBtn: { minHeight: 40, borderRadius: 11, paddingHorizontal: 18 },
    navLoginPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    navLoginText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    heroBody: { paddingTop: 30, paddingBottom: 56 },
    heroBodyWide: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 80 },
    heroCopy: {},
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: NAVY.raised,
        borderWidth: 1,
        borderColor: NAVY.lineStrong,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 18,
    },
    badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.copper, marginRight: 8 },
    badgeText: {
        color: NAVY.text,
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 0.3,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        lineHeight: 39,
        fontWeight: '900',
        letterSpacing: -0.6,
    },
    titleTablet: { fontSize: 42, lineHeight: 50, maxWidth: 640 },
    titleWide: { fontSize: 52, lineHeight: 60, letterSpacing: -1.2 },
    description: {
        color: NAVY.sub,
        lineHeight: 24,
        marginTop: 16,
        fontSize: 15,
        maxWidth: 560,
    },
    ctaRow: { flexDirection: 'row', marginTop: 30 },
    ctaColumn: { flexDirection: 'column' },
    cta: { minWidth: 160 },

    heroPanel: {
        flex: 0.85,
        maxWidth: 440,
        backgroundColor: NAVY.raised,
        borderWidth: 1,
        borderColor: NAVY.line,
        borderRadius: 20,
        padding: 26,
    },
    heroPanelEyebrow: { color: NAVY.muted, fontSize: 10.5, fontWeight: '900', letterSpacing: 1.4, marginBottom: 16 },
    heroPanelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    heroPanelIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: T.nav,
        borderWidth: 1,
        borderColor: NAVY.lineStrong,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    heroPanelValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
    heroPanelLabel: { color: NAVY.sub, fontSize: 13, marginTop: 1 },
    heroPanelDivider: { height: 1, backgroundColor: NAVY.line, marginVertical: 6, marginBottom: 16 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginRight: -6 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.nav,
        borderWidth: 1,
        borderColor: NAVY.lineStrong,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 8,
    },
    chipText: { color: NAVY.text, fontSize: 11.5, fontWeight: '700', marginLeft: 5 },

    /* ===== STATS ===== */
    statsContainer: {
        flexDirection: 'row',
        marginTop: -30,
    },
    statCard: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: T.border,
        padding: 16,
        ...S.card,
    },
    statIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: T.sub,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: T.ink,
    },
    statLabel: {
        marginTop: 2,
        color: T.muted,
        fontSize: 13,
    },

    /* ===== SECTION ===== */
    section: {
        paddingTop: 36,
        paddingBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionEyebrow: {
        fontSize: 11,
        color: T.copper,
        fontWeight: '900',
        letterSpacing: 1.4,
    },
    heroText: {
        fontSize: 24,
        lineHeight: 31,
        fontWeight: '900',
        color: T.ink,
        marginTop: 6,
        letterSpacing: -0.4,
    },
    sectionSub: {
        fontSize: 14,
        lineHeight: 21,
        color: T.muted,
        marginTop: 6,
        marginBottom: 18,
        maxWidth: 620,
    },

    /* ===== GRID / CAROUSEL ===== */
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -7,
    },
    gridCell: {
        padding: 7,
    },
    carouselContainer: {
        paddingVertical: 6,
    },
    featureCard: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: T.border,
        padding: 20,
        ...S.card,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 13,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.hair,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: T.ink,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: T.hair,
        marginVertical: 15,
    },
    valueBox: {
        alignItems: 'flex-start',
    },
    featureValue: {
        fontSize: 38,
        fontWeight: '900',
        color: T.copper,
        letterSpacing: -1,
    },
    featureUnit: {
        fontSize: 12.5,
        color: T.muted,
        marginTop: 2,
        fontWeight: '600',
    },
    featureDesc: {
        marginTop: 12,
        color: '#6E6863',
        lineHeight: 20,
        fontSize: 13,
    },

    /* ===== PAGINATION DOTS ===== */
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: T.copper,
        marginHorizontal: 3,
    },

    /* ===== EXPLORE ===== */
    exploreWrap: {},
    exploreRow: { flexDirection: 'row', marginHorizontal: -7 },
    exploreCell: { flex: 1, paddingHorizontal: 7 },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    menuIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: T.sub,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '800',
        color: T.ink,
    },
    menuDesc: {
        fontSize: 12.5,
        color: T.muted,
        marginTop: 2,
    },

    /* ===== CTA BAND ===== */
    ctaBand: {
        marginTop: 26,
        backgroundColor: T.nav,
        borderRadius: 20,
        padding: 24,
    },
    ctaBandRow: { flexDirection: 'row', alignItems: 'center', padding: 32 },
    ctaBandTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
    ctaBandSub: { color: NAVY.sub, fontSize: 14, marginTop: 4 },
    ctaBandActions: { flexDirection: 'row' },
    ctaBandBtn: { flexGrow: 1, minHeight: 46, paddingHorizontal: 18 },

    /* ===== FOOTER ===== */
    footer: {
        marginTop: 34,
        borderTopWidth: 1,
        borderTopColor: T.border,
        backgroundColor: T.sub,
    },
    footerInner: {
        paddingVertical: 24,
        alignItems: 'center',
        gap: 12,
    },
    footerInnerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: T.ink,
    },
    footerSub: {
        marginTop: 3,
        color: T.muted,
        fontSize: 12.5,
        textAlign: 'center',
    },
});
