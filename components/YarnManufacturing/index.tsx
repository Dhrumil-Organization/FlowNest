import React, { useState } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import theme from '@/components/theme';

const { width } = Dimensions.get('window');

export default function YarnManufacturingScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Hybrid');

    // Replace these URLs later with your actual image URLs
    const HEADER_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200';
    const FACTORY_IMAGE = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800';

    const productData = {
        Hybrid: [
            { type: 'Polyester Yarn / Raw White / Grepe / Dyed', products: [
                { name: 'PLAIN', range: '60 to 2000' },
                { name: 'SLUB', range: '110 to 2500' },
                { name: 'T&T', range: '60 to 1500' },
                { name: 'DARK SLUB', range: '110 to 1500' },
                { name: 'PATERNI + DARK SLUB', range: '110 to 1500' },
                { name: 'NEPS', range: '110 to 1500' },
                { name: 'LONG SLUB', range: '110 to 2200' },
            ]},
            { type: 'Nylon Yarn / Raw White', products: [
                { name: 'PLAIN', range: '70 TO 390' },
                { name: 'SLUB', range: '70 TO 390' },
                { name: 'NEPS', range: '140 TO 390' },
                { name: 'LONG SLUB', range: '140 TO 390' },
            ]},
            { type: 'Polyester / Cationic', products: [
                { name: 'PLAIN', range: '70 TO 2000' },
                { name: 'SLUB', range: '70 TO 2000' },
            ]},
            { type: 'Cationic / Nylon', products: [
                { name: 'PLAIN', range: '140 TO 400' },
            ]},
        ],
        Texturised: [
            { type: 'Cationic Yarn / Raw White / Grepe / Dyed', products: [
                { name: 'PLAIN', range: '60 TO 1500' },
                { name: 'SLUB', range: '110 TO 1500' },
                { name: 'NEPS', range: '110 TO 1500' },
                { name: 'LONG SLUB', range: '110 TO 1500' },
            ]},
            { type: 'Viscose Yarn / Raw White', products: [
                { name: 'PLAIN', range: '70 TO 350' },
                { name: 'SLUB', range: '150 TO 350' },
            ]},
            { type: 'Polyester / Nylon', products: [
                { name: 'PLAIN', range: '140 TO 1200' },
                { name: 'SLUB', range: '140 TO 1200' },
            ]},
        ],
    };

     const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                {/* ============== HEADER IMAGE ============== */}
                <View style={styles.headerContainer}>
                    <Image
                        source={{ uri: HEADER_IMAGE }}
                        style={styles.headerImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                        style={styles.headerOverlay}
                    >
                        {/* Top Navigation */}
                        <View style={styles.topNav}>
                            <TouchableOpacity
                                onPress={goBack}
                                style={styles.backBtn}
                            >
                                <Icon name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.brandText}>madhusudan</Text>
                            <TouchableOpacity style={styles.touchBtn}>
                                <Text style={styles.touchBtnText}>Get in Touch</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Header Content */}
                        <View style={styles.headerContent}>
                            <Text style={styles.brandTitle}>
                                Madhusudan Threads
                            </Text>
                            <Text style={styles.brandTitle}>
                                Madhusudan Rayons
                            </Text>
                            <View style={styles.titleDivider} />
                            <Text style={styles.brandSubtitle}>
                                Leading Yarn Manufacturers in India
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ============== COMPANY INTRO SECTION ============== */}
                <View style={styles.introSection}>
                    <View style={styles.introRow}>
                        <View style={styles.imageBox}>
                            <Image
                                source={{ uri: FACTORY_IMAGE }}
                                style={styles.factoryImage}
                            />
                        </View>
                        <View style={styles.introContent}>
                            <Text style={styles.introTitle}>
                                MADHUSUDAN THREADS
                            </Text>
                            <Text style={styles.introText}>
                                <Text style={styles.boldText}>
                                    Madhusudan Threads
                                </Text>
                                {' '}is a leading name among{' '}
                                <Text style={styles.boldText}>
                                    yarn manufacturers India
                                </Text>
                                , offering premium{' '}
                                <Text style={styles.boldText}>
                                    polyester yarn
                                </Text>
                                {' '}and{' '}
                                <Text style={styles.boldText}>
                                    blended yarn
                                </Text>
                                {' '}manufacturers Surat solutions with consistent quality and scalability. Located just 100 km from Surat and Hazira port, our Navapur plant enables fast export of polyester spun yarns to Asia, Europe, and beyond — making us trusted textile yarn exporters from India for global B2B buyers. As a reliable industrial yarn supplier in Gujarat.
                            </Text>
                        </View>
                    </View>

                    {/* Factory Address Card */}
                    <View style={styles.addressCard}>
                        <Text style={styles.addressTitle}>
                            Madhusudan Threads
                        </Text>
                        <Text style={styles.addressLabel}>
                            Factory Address:
                        </Text>
                        <Text style={styles.addressText}>
                            283, Laxmnarayan Industrial Estate, {'\n'}
                            N.H. No. 8, Village – Baleeshwar, Tal – Palsana, Dist – Surat, Gujarat
                        </Text>

                        <View style={styles.addressDivider} />

                        <View style={styles.contactRow}>
                            <Icon name="phone" size={16} color="#fff" />
                            <Text style={styles.contactText}>
                                + 91 2622 - 265536, 264101
                            </Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Icon name="phone-android" size={16} color="#fff" />
                            <Text style={styles.contactText}>
                                264102 • 91 - 9824210790
                            </Text>
                        </View>

                        <View style={styles.paginationDots}>
                            <View style={[styles.paginationDot, styles.dotActive]} />
                            <View style={styles.paginationDot} />
                            <View style={styles.paginationDot} />
                        </View>
                    </View>
                </View>

                {/* ============== ADDITIONAL INFO ============== */}
                <View style={styles.infoSection}>
                    <View style={styles.introRow}>
                        <View style={[styles.imageBox, { flex: 1 }]}>
                            <Image
                                source={{ uri: FACTORY_IMAGE }}
                                style={styles.factoryImage}
                            />
                        </View>
                        <View style={[styles.introContent, { flex: 1.2 }]}>
                            <Text style={styles.sectionHeader}>
                                Madhusudan Rayons (P) Ltd.
                            </Text>
                            <Text style={styles.infoText}>
                                We are a flagship unit of the renowned Madhusudan Group, recognized as and certified by GRS, and ISO, and we are one of the largest and most reputable{' '}
                                <Text style={styles.linkText}>
                                    yarn dyeing facilities
                                </Text>
                                {' '}in the country. Our commitment to quality, efficiency, and innovation has propelled us to the forefront of the textile industry, earning us a reputation as a dominant force in the market.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ============== KEY STRENGTHS ============== */}
                <View style={styles.strengthsSection}>
                    <Text style={styles.strengthsTitle}>Key Strengths</Text>
                    {[
                        'Leading polyester yarn manufacturer in India',
                        'Reliable polyester yarn supplier globally with extensive export markets',
                        'Advanced texturizing technology',
                        'Trusted yarn supplier in Gujarat',
                    ].map((item, index) => (
                        <View key={index} style={styles.strengthItem}>
                            <View style={styles.bullet} />
                            <Text style={styles.strengthText}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* ============== PRODUCT SECTION ============== */}
                <View style={styles.productsSection}>
                    <View style={styles.productHeader}>
                        <Text style={styles.productSmallText}>
                            Madhusudan Group
                        </Text>
                        <Text style={styles.productMainTitle}>
                            Products we{'\n'}Manufacture
                        </Text>
                    </View>

                    {/* Tab Buttons */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                activeTab === 'Hybrid' && styles.tabBtnActive,
                            ]}
                            onPress={() => setActiveTab('Hybrid')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'Hybrid' && styles.tabTextActive,
                                ]}
                            >
                                Hybrid Yarn
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                activeTab === 'Texturised' && styles.tabBtnActive,
                            ]}
                            onPress={() => setActiveTab('Texturised')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'Texturised' && styles.tabTextActive,
                                ]}
                            >
                                Texturised Yarn
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.tabDescription}>
                        {activeTab === 'Hybrid'
                            ? 'Hybrid Yarn Texturised Yarn Manufacturers India'
                            : 'Texturised Yarn Manufacturers India'}
                    </Text>

                    {/* Product Tables */}
                    {productData[activeTab].map((group, groupIndex) => (
                        <View key={groupIndex} style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.tableHeaderLeft}>
                                    Effects
                                </Text>
                                <Text style={styles.tableHeaderRight}>
                                    Denier Range
                                </Text>
                            </View>

                            {group.products.map((product, pIndex) => (
                                <View
                                    key={pIndex}
                                    style={[
                                        styles.tableRow,
                                        pIndex % 2 === 0 && styles.tableRowAlt,
                                    ]}
                                >
                                    <Text style={styles.tableRowLeft}>
                                        {product.name}
                                    </Text>
                                    <Text style={styles.tableRowRight}>
                                        {product.range}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                {/* ============== INFRASTRUCTURE SECTION ============== */}
                <View style={styles.infraSection}>
                    <Text style={styles.infraSmallText}>
                        Madhusudan Group
                    </Text>
                    <Text style={styles.infraTitle}>
                        INFRASTRUCTURE
                    </Text>

                    <View style={styles.infraRow}>
                        <View style={styles.infraContent}>
                            <Text style={styles.infraText}>
                                Madhusudan Threads operates from three locations, Palsana, Silvassa, and Navapur, which are strategically located for easy access to India's textile-rich states of Gujarat and Maharashtra. The Palsana plant is situated at Laxminarayan Industrial Estate, approximately 26 km from Surat, Gujarat. The Silvassa plant is located in the union territory of Dadra & Nagar Haveli while the Navapur plant is merely 100km from Surat & Hazira port.
                            </Text>
                        </View>
                        <View style={styles.infraImageBox}>
                            <Image
                                source={{ uri: FACTORY_IMAGE }}
                                style={styles.infraImage}
                            />
                        </View>
                    </View>

                    <View style={styles.techList}>
                        {[
                            'Cutting-edge technology',
                            'Air texture | Draw Textured | Draw Twisted Yarn',
                            'Functionality: mTec (100% Recycle polyester), mCool (Moisture-wicking functional yarn), mFirxe (Flame retardant functional yarn)',
                        ].map((item, index) => (
                            <View key={index} style={styles.techItem}>
                                <Icon
                                    name="check-circle"
                                    size={18}
                                    color={theme.BRAND_GRADIENT_END}
                                />
                                <Text style={styles.techText}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.infraRow}>
                        <View style={styles.infraImageBox}>
                            <Image
                                source={{ uri: FACTORY_IMAGE }}
                                style={styles.infraImage}
                            />
                        </View>
                        <View style={styles.infraContent}>
                            <Text style={styles.infraText}>
                                At Madhusudan Rayons, we pride ourselves on our world-class facility that sets the standard for quality, sustainability, and efficiency. With state-of-the-art infrastructure and automated machines, we ensure consistent and flawless output for our valued clients. Our capabilities include dyeing a wide range of natural and blended fibers and yarns, such as cotton, linen, polyester, and more. We prioritize both quality and quantity, delivering the best possible products to our customers.
                            </Text>
                            <Text style={[styles.infraText, { marginTop: 10 }]}>
                                Sustainability is at the core of our operations.{' '}
                                <Text style={styles.linkText}>
                                    We embrace eco-friendly practices
                                </Text>
                                , utilizing recyclable materials, minimizing waste, and generating power through steam turbines. Our commitment to sustainability sets us apart and reflects our blend of traditional values and futuristic thinking.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ============== CONTACT SECTION ============== */}
                <View style={styles.contactSection}>
                    <View style={styles.contactHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.contactTitle}>
                                We are here to assist and{'\n'}address your inquiries
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.contactUsBtn}>
                            <Text style={styles.contactUsText}>
                                CONTACT US
                            </Text>
                            <Icon name="arrow-downward" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contactDivider} />

                    <View style={styles.footerInfo}>
                        <View style={styles.footerCol}>
                            <Text style={styles.footerLogo}>
                                madhusudan
                            </Text>
                            <Text style={styles.footerSince}>
                                SINCE 1975
                            </Text>
                            <Text style={styles.copyrightText}>
                                © 2025 Madhusudan Group. All rights reserved.
                            </Text>
                            <Text style={styles.copyrightText}>
                                Developed by SSolutions Mobile App
                            </Text>
                        </View>

                        <View style={styles.footerCol}>
                            <Text style={styles.footerHeading}>Address</Text>
                            <Text style={styles.footerText}>
                                HO-5, Upper Ground, Raghunandan{'\n'}
                                Textile Market,{'\n'}
                                Ring Road, Surat - 395002
                            </Text>
                            <Text style={[styles.footerHeading, { marginTop: 12 }]}>
                                Follow us
                            </Text>
                            <View style={styles.socialRow}>
                                <Icon name="facebook" size={20} color="#fff" />
                                <Icon name="camera-alt" size={20} color="#fff" />
                                <Icon name="share" size={20} color="#fff" />
                                <Icon name="play-circle-fill" size={20} color="#fff" />
                            </View>
                        </View>

                        <View style={styles.footerCol}>
                            <Text style={styles.footerHeading}>Phone</Text>
                            <Text style={styles.footerText}>
                                +91 8165500100
                            </Text>
                            <Text style={[styles.footerHeading, { marginTop: 12 }]}>
                                Email
                            </Text>
                            <Text style={styles.footerText}>
                                Interested in working with us?{'\n'}
                                inquiry@madhudangroup.com
                            </Text>
                        </View>

                        <View style={styles.footerCol}>
                            <Text style={styles.footerHeading}>Main Menu</Text>
                            {['Home', 'About Us', 'Contact Us', 'Blogs', 'CSR', 'Certifications', 'Brochures', 'Careers', 'Terms and Services', 'Privacy Policy'].map((item, idx) => (
                                <Text key={idx} style={styles.footerLink}>
                                    {item}
                                </Text>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    /* ===== HEADER ===== */
    headerContainer: {
        width: width,
        height: 380,
        position: 'relative',
    },

    headerImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 30,
        justifyContent: 'space-between',
    },

    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    brandText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontStyle: 'italic',
    },

    touchBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
    },

    touchBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    headerContent: {
        alignItems: 'flex-start',
    },

    brandTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
    },

    titleDivider: {
        width: 60,
        height: 3,
        backgroundColor: '#fff',
        marginVertical: 10,
    },

    brandSubtitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },

    /* ===== INTRO SECTION ===== */
    introSection: {
        padding: 20,
    },

    introRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },

    imageBox: {
        width: 140,
        height: 140,
        marginRight: 15,
    },

    factoryImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
        resizeMode: 'cover',
    },

    introContent: {
        flex: 1,
    },

    introTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.BRAND_GRADIENT_END,
        letterSpacing: 1,
        marginBottom: 8,
    },

    introText: {
        fontSize: 12,
        lineHeight: 19,
        color: '#333',
    },

    boldText: {
        fontWeight: '700',
        color: '#000',
    },

    linkText: {
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    /* ===== ADDRESS CARD ===== */
    addressCard: {
        backgroundColor: '#2A2438',
        borderRadius: 8,
        padding: 18,
        marginTop: 10,
    },

    addressTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },

    addressLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },

    addressText: {
        color: '#D1D5DB',
        fontSize: 12,
        lineHeight: 18,
    },

    addressDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginVertical: 12,
    },

    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },

    contactText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 8,
    },

    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },

    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 4,
    },

    dotActive: {
        backgroundColor: theme.BRAND_GRADIENT_END,
    },

    /* ===== INFO SECTION ===== */
    infoSection: {
        padding: 20,
        paddingTop: 10,
    },

    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.BRAND_GRADIENT_END,
        marginBottom: 8,
    },

    infoText: {
        fontSize: 12,
        lineHeight: 19,
        color: '#333',
    },

    /* ===== STRENGTHS ===== */
    strengthsSection: {
        padding: 20,
        paddingTop: 10,
    },

    strengthsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
    },

    strengthItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },

    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.BRAND_GRADIENT_END,
        marginTop: 7,
        marginRight: 10,
    },

    strengthText: {
        flex: 1,
        fontSize: 13,
        color: '#333',
        lineHeight: 20,
    },

    /* ===== PRODUCTS ===== */
    productsSection: {
        backgroundColor: '#F3F4F6',
        padding: 20,
        marginTop: 20,
    },

    productHeader: {
        marginBottom: 15,
    },

    productSmallText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },

    productMainTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#000',
        lineHeight: 38,
    },

    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 25,
        padding: 4,
        marginBottom: 15,
    },

    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 22,
    },

    tabBtnActive: {
        backgroundColor: theme.BRAND_GRADIENT_END,
    },

    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },

    tabTextActive: {
        color: '#fff',
    },

    tabDescription: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 15,
    },

    tableContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
    },

    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },

    tableHeaderLeft: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    tableHeaderRight: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'right',
    },

    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },

    tableRowAlt: {
        backgroundColor: '#F9FAFB',
    },

    tableRowLeft: {
        flex: 1,
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
    },

    tableRowRight: {
        flex: 1,
        fontSize: 12,
        color: '#374151',
        textAlign: 'right',
    },

    /* ===== INFRASTRUCTURE ===== */
    infraSection: {
        padding: 20,
    },

    infraSmallText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },

    infraTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 2,
        marginBottom: 20,
    },

    infraRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },

    infraContent: {
        flex: 1,
        marginRight: 10,
    },

    infraImageBox: {
        flex: 1,
        height: 180,
    },

    infraImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
        resizeMode: 'cover',
    },

    infraText: {
        fontSize: 12,
        lineHeight: 19,
        color: '#333',
    },

    techList: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
    },

    techItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },

    techText: {
        fontSize: 13,
        color: '#374151',
        marginLeft: 8,
        flex: 1,
    },

    /* ===== CONTACT SECTION ===== */
    contactSection: {
        backgroundColor: '#2A2438',
        padding: 20,
        marginTop: 20,
    },

    contactHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },

    contactTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 26,
    },

    contactUsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },

    contactUsText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 6,
    },

    contactDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 20,
    },

    footerInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    footerCol: {
        width: '50%',
        marginBottom: 20,
        paddingRight: 10,
    },

    footerLogo: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontStyle: 'italic',
    },

    footerSince: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginVertical: 4,
    },

    copyrightText: {
        color: '#9CA3AF',
        fontSize: 9,
        marginTop: 4,
    },

    footerHeading: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },

    footerText: {
        color: '#D1D5DB',
        fontSize: 11,
        lineHeight: 17,
    },

    socialRow: {
        flexDirection: 'row',
        marginTop: 6,
    },

    socialRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 12,
    },

    footerLink: {
        color: '#D1D5DB',
        fontSize: 11,
        lineHeight: 20,
    },
});
