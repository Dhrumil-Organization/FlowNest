// screens/AboutScreen.tsx
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Replace these URLs later with your actual image URLs
const HERO_IMAGE = 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200';
const FACTORY_IMAGE = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800';
const TEAM_IMAGE = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800';
const CERTIFICATION_IMAGE = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800';

interface Milestone {
    year: string;
    title: string;
    description: string;
}

interface Value {
    icon: string;
    title: string;
    description: string;
    color: string;
}

interface Leader {
    name: string;
    position: string;
    image: string;
    bio: string;
}

interface Certification {
    name: string;
    icon: string;
    description: string;
}

const MILESTONES: Milestone[] = [
    {
        year: '1975',
        title: 'Foundation',
        description: 'Madhusudan Group was founded with a vision to revolutionize textile manufacturing in India.',
    },
    {
        year: '1990s',
        title: 'Expansion Era',
        description: 'Established manufacturing units across Gujarat, expanding into yarn production and processing.',
    },
    {
        year: '2000s',
        title: 'Global Reach',
        description: 'Started exporting to international markets, becoming a trusted global textile supplier.',
    },
    {
        year: '2010s',
        title: 'Innovation & Technology',
        description: 'Invested in cutting-edge textile machinery and sustainable manufacturing practices.',
    },
    {
        year: '2020s',
        title: 'Digital Transformation',
        description: 'Embraced Industry 4.0 with ERP systems, automation, and smart manufacturing solutions.',
    },
];

const VALUES: Value[] = [
    {
        icon: 'eco',
        title: 'Sustainability',
        description: 'Committed to eco-friendly practices, using recyclable materials and minimizing waste through steam turbines.',
        color: '#10B981',
    },
    {
        icon: 'verified',
        title: 'Quality Excellence',
        description: 'State-of-the-art infrastructure with automated machines ensuring consistent, flawless output for every client.',
        color: '#3B82F6',
    },
    {
        icon: 'lightbulb',
        title: 'Innovation',
        description: 'Continuous R&D in functional yarns like mTec, mCool, and mFirxe for modern textile solutions.',
        color: '#F59E0B',
    },
    {
        icon: 'handshake',
        title: 'Trust & Integrity',
        description: 'Building lasting relationships with customers through transparency, reliability, and ethical business practices.',
        color: '#8B5CF6',
    },
    {
        icon: 'groups',
        title: 'People First',
        description: 'Empowering our workforce with safety, growth opportunities, and a culture of continuous learning.',
        color: '#EC4899',
    },
    {
        icon: 'public',
        title: 'Global Vision',
        description: 'Bridging traditional values with futuristic thinking to serve clients across Asia, Europe, and beyond.',
        color: '#06B6D4',
    },
];

const LEADERS: Leader[] = [
    {
        name: 'Mr. Krishnagopal Mundra',
        position: 'Chairman',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.04.06_REC-removebg-preview-300x300.png',
        bio: '',
    },
     {
        name: 'Mr. Ramgopal Mundra',
        position: 'Vice Chairman',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.03.47_REC-removebg-preview-295x300.png',
        bio: '',
    },
    {
        name: 'Mr. Girdhargopal Mundra',
        position: 'Vice Chairman',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.04.30_REC-removebg-preview-300x300.png',
        bio: '',
    },
    {
        name: 'Mr. Shrikant Mundra',
        position: 'Managing Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.02.56_REC-removebg-preview-300x300.png',
        bio: '',
    },
    {
        name: 'Mr. Manmohan Mundra',
        position: 'Executive Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.03.13_REC-removebg-preview-300x300.png',
        bio: '',
    },
    {
        name: 'Mr. Navneet Mundra',
        position: 'Executive Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.02.04_REC-removebg-preview-300x300.png',
        bio: '',
    },
    {
        name: 'Mr. Deepak Mundra',
        position: 'Executive Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.04.49_REC-removebg-preview-300x294.png',
        bio: '',
    },
    {
        name: 'Mr. Yatiraj Mundra',
        position: 'Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.03.30_REC-removebg-preview-300x292.png',
        bio: '',
    },
    {
        name: 'Mr. Sudarshan Mundra',
        position: 'Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.02.35_REC-removebg-preview-300x293.png',
        bio: '',
    },
    {
        name: 'Mr. Nikunj Mundra',
        position: 'Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/05/16.05.2023_18.20.36_REC-removebg-preview-300x298.png',
        bio: '',
    },
    {
        name: 'Mr. Saulabhya Mundra',
        position: 'Director',
        image: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.05.06_REC-removebg-preview-300x295.png',
        bio: '',
    },
];

const CERTIFICATIONS: Certification[] = [
    { name: 'GRS Certified', icon: 'verified', description: 'Global Recycled Standard' },
    { name: 'ISO 9001:2015', icon: 'workspace-premium', description: 'Quality Management' },
    { name: 'ISO 14001:2015', icon: 'spa', description: 'Environmental Management' },
    { name: 'OEKO-TEX', icon: 'check-circle', description: 'Textile Safety Standard' },
    { name: 'BCI Member', icon: 'eco', description: 'Better Cotton Initiative' },
    { name: 'SA8000', icon: 'volunteer-activism', description: 'Social Accountability' },
];

const STATS = [
    { value: '49+', label: 'Years of Excellence', icon: 'history' },
    { value: '5000+', label: 'Team Members', icon: 'groups' },
    { value: '50+', label: 'Countries Served', icon: 'public' },
    { value: '7', label: 'Manufacturing Units', icon: 'factory' },
];

export default function AboutScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleSocialLink = (url: string) => {
        Linking.openURL(url).catch(() => {
            console.log('Cannot open URL');
        });
    };

    const handleContactPress = () => {
        router.push('/contact');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* ============== HERO SECTION ============== */}
                <View style={styles.heroContainer}>
                    <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                        style={styles.heroOverlay}
                    >
                        <View style={styles.topNav}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                                <Icon name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.brandText}>madhusudan</Text>
                            <TouchableOpacity style={styles.touchBtn} onPress={handleContactPress}>
                                <Text style={styles.touchBtnText}>Contact</Text>
                            </TouchableOpacity>
                        </View>

                        <Animated.View
                            style={[
                                styles.heroContent,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                            ]}
                        >
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>EST. 1975</Text>
                            </View>
                            <Text style={styles.heroTitle}>About Us</Text>
                            <View style={styles.titleDivider} />
                            <Text style={styles.heroSubtitle}>
                                Pioneering Textile Excellence Since 1975
                            </Text>
                            <Text style={styles.heroDescription}>
                                A legacy of innovation, quality, and trust powering India's textile revolution for over four decades.
                            </Text>
                        </Animated.View>
                    </LinearGradient>
                </View>

                {/* ============== STATS BANNER ============== */}
                <View style={styles.statsBanner}>
                    {STATS.map((stat, index) => (
                        <View key={index} style={styles.statItem}>
                            <Icon name={stat.icon} size={22} color={theme.BRAND_GRADIENT_END} />
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ============== OUR STORY ============== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Our Story</Text>
                        <Text style={styles.sectionTitle}>Who We Are</Text>
                    </View>

                    <View style={styles.storyCard}>
                        <Image source={{ uri: FACTORY_IMAGE }} style={styles.storyImage} />
                        <View style={styles.storyContent}>
                            <Text style={styles.storyText}>
                                <Text style={styles.boldText}>Madhusudan Group</Text> is a leading name among{' '}
                                <Text style={styles.linkText}>yarn manufacturers in India</Text>, offering premium polyester yarn and blended yarn solutions with consistent quality and scalability.
                            </Text>
                            <Text style={styles.storyText}>
                                Located just 100 km from Surat and Hazira port, our Navapur plant enables fast export of polyester spun yarns to Asia, Europe, and beyond — making us trusted textile yarn exporters from India for global B2B buyers.
                            </Text>
                            <Text style={styles.storyText}>
                                As a reliable industrial yarn supplier in Gujarat, we serve every segment of the textile value chain with state-of-the-art infrastructure and automated machines.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ============== MISSION VISION ============== */}
                <View style={styles.section}>
                    <View style={styles.mvRow}>
                        <View style={[styles.mvCard, { backgroundColor: '#FEF3F2' }]}>
                            <View style={[styles.mvIcon, { backgroundColor: '#FEE4E2' }]}>
                                <Icon name="rocket-launch" size={28} color="#EF4444" />
                            </View>
                            <Text style={styles.mvTitle}>Our Mission</Text>
                            <Text style={styles.mvText}>
                                To deliver world-class textile solutions through innovation, sustainability, and unwavering commitment to quality, empowering our customers to succeed in global markets.
                            </Text>
                        </View>

                        <View style={[styles.mvCard, { backgroundColor: '#EFF6FF' }]}>
                            <View style={[styles.mvIcon, { backgroundColor: '#DBEAFE' }]}>
                                <Icon name="visibility" size={28} color="#3B82F6" />
                            </View>
                            <Text style={styles.mvTitle}>Our Vision</Text>
                            <Text style={styles.mvText}>
                                To be the most trusted and innovative textile conglomerate globally, setting benchmarks in quality, sustainability, and customer satisfaction.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ============== OUR VALUES ============== */}
                <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>What Drives Us</Text>
                        <Text style={styles.sectionTitle}>Our Core Values</Text>
                        <Text style={styles.sectionSubtitle}>
                            Principles that guide every decision, every product, every relationship.
                        </Text>
                    </View>

                    <View style={styles.valuesGrid}>
                        {VALUES.map((value, index) => (
                            <View key={index} style={styles.valueCard}>
                                <View style={[styles.valueIcon, { backgroundColor: value.color + '15' }]}>
                                    <Icon name={value.icon} size={24} color={value.color} />
                                </View>
                                <Text style={styles.valueTitle}>{value.title}</Text>
                                <Text style={styles.valueDesc}>{value.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ============== JOURNEY / MILESTONES ============== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Our Journey</Text>
                        <Text style={styles.sectionTitle}>49+ Years of Excellence</Text>
                        <Text style={styles.sectionSubtitle}>
                            From humble beginnings to global leadership in textiles.
                        </Text>
                    </View>

                    <View style={styles.timeline}>
                        {MILESTONES.map((milestone, index) => (
                            <View key={index} style={styles.timelineItem}>
                                <View style={styles.timelineDot}>
                                    <View style={styles.timelineDotInner} />
                                </View>
                                <View style={styles.timelineContent}>
                                    <View style={styles.yearBadge}>
                                        <Text style={styles.yearText}>{milestone.year}</Text>
                                    </View>
                                    <Text style={styles.timelineTitle}>{milestone.title}</Text>
                                    <Text style={styles.timelineDesc}>{milestone.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ============== MANUFACTURING UNITS ============== */}
                <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Infrastructure</Text>
                        <Text style={styles.sectionTitle}>Our Manufacturing Units</Text>
                    </View>

                    <View style={styles.unitsContainer}>
                        <UnitCard
                            city="Surat"
                            state="Gujarat"
                            description="Laxminarayan Industrial Estate, N.H. No. 8, Village Baleeshwar, Tal Palsana - Main manufacturing hub"
                            distance="26 km from Surat"
                            icon="location-city"
                        />
                        <UnitCard
                            city="Silvassa"
                            state="Dadra & Nagar Haveli"
                            description="Union territory location with strategic advantages for distribution"
                            distance="Strategic Location"
                            icon="factory"
                        />
                        <UnitCard
                            city="Navapur"
                            state="Maharashtra"
                            description="Export-oriented unit located just 100 km from Surat & Hazira port"
                            distance="100 km from Hazira Port"
                            icon="directions-boat"
                        />
                    </View>
                </View>

                {/* ============== CAPABILITIES ============== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Capabilities</Text>
                        <Text style={styles.sectionTitle}>What We Manufacture</Text>
                    </View>

                    <View style={styles.capabilitiesGrid}>
                        <CapabilityItem icon="precision-manufacturing" title="Yarn Manufacturing" value="1,000" unit="tons/month" />
                        <CapabilityItem icon="colorize" title="Yarn Dyeing" value="1,000" unit="tons/month" />
                        <CapabilityItem icon="grid-on" title="Weaving" value="1.5" unit="M meters/month" />
                        <CapabilityItem icon="linear-scale" title="Warp Knitting" value="300" unit="tons/month" />
                        <CapabilityItem icon="donut-large" title="Circular Knitting" value="300" unit="tons/month" />
                        <CapabilityItem icon="brush" title="Processing & Printing" value="30" unit="M meters/month" />
                        <CapabilityItem icon="checkroom" title="Garment" value="1.25" unit="Lakhs/month" />
                    </View>
                </View>

                {/* ============== LEADERSHIP ============== */}
                <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Leadership</Text>
                        <Text style={styles.sectionTitle}>Meet Our Leaders</Text>
                        <Text style={styles.sectionSubtitle}>
                            Visionary minds driving innovation and excellence.
                        </Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.leadersScroll}
                    >
                        {LEADERS.map((leader, index) => (
                            <View key={index} style={styles.leaderCard}>
                                <Image source={{ uri: leader.image }} style={styles.leaderImage} />
                                <View style={styles.leaderOverlay}>
                                    <Text style={styles.leaderName}>{leader.name}</Text>
                                    <Text style={styles.leaderPosition}>{leader.position}</Text>
                                    <Text style={styles.leaderBio}>{leader.bio}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* ============== CERTIFICATIONS ============== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Quality Standards</Text>
                        <Text style={styles.sectionTitle}>Certifications</Text>
                        <Text style={styles.sectionSubtitle}>
                            Globally recognized standards backing our commitment to excellence.
                        </Text>
                    </View>

                    <View style={styles.certGrid}>
                        {CERTIFICATIONS.map((cert, index) => (
                            <View key={index} style={styles.certCard}>
                                <View style={styles.certIconBox}>
                                    <Icon name={cert.icon} size={24} color={theme.BRAND_GRADIENT_END} />
                                </View>
                                <Text style={styles.certName}>{cert.name}</Text>
                                <Text style={styles.certDesc}>{cert.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ============== SUSTAINABILITY ============== */}
                <View style={styles.sustainabilitySection}>
                    <Image source={{ uri: CERTIFICATION_IMAGE }} style={styles.sustainabilityBg} />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                        style={styles.sustainabilityOverlay}
                    >
                        <View style={styles.sustainabilityContent}>
                            <Icon name="eco" size={48} color="#10B981" />
                            <Text style={styles.sustainabilityTitle}>Sustainability at Our Core</Text>
                            <View style={styles.sustainabilityDivider} />
                            <Text style={styles.sustainabilityText}>
                                At Madhusudan Rayons, we embrace eco-friendly practices, utilizing recyclable materials, minimizing waste, and generating power through steam turbines.
                            </Text>
                            <View style={styles.sustainabilityPoints}>
                                <SustainabilityPoint icon="recycling" text="100% Recyclable Materials" />
                                <SustainabilityPoint icon="energy-savings-leaf" text="Zero Liquid Discharge" />
                                <SustainabilityPoint icon="bolt" text="Steam Turbine Power Generation" />
                                <SustainabilityPoint icon="water-drop" text="Water Conservation Systems" />
                                <SustainabilityPoint icon="park" text="Green Belt Development" />
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* ============== GLOBAL PRESENCE ============== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionSmallText}>Global Reach</Text>
                        <Text style={styles.sectionTitle}>Serving Worldwide</Text>
                        <Text style={styles.sectionSubtitle}>
                            Trusted textile partner across continents.
                        </Text>
                    </View>

                    <View style={styles.regionsGrid}>
                        <RegionCard icon="public" region="Asia" countries="India, China, Bangladesh, Vietnam, Indonesia" />
                        <RegionCard icon="euro" region="Europe" countries="Germany, Italy, Turkey, Spain, UK" />
                        <RegionCard icon="business" region="Americas" countries="USA, Brazil, Mexico, Argentina" />
                        <RegionCard icon="store" region="Middle East & Africa" countries="UAE, Egypt, South Africa, Kenya" />
                    </View>
                </View>

                {/* ============== CTA SECTION ============== */}
                <View style={styles.ctaSection}>
                    <LinearGradient
                        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                        style={styles.ctaGradient}
                    >
                        <Text style={styles.ctaTitle}>Partner with Industry Leaders</Text>
                        <Text style={styles.ctaSubtitle}>
                            Join 5000+ businesses worldwide who trust Madhusudan Group for quality textiles.
                        </Text>
                        <View style={styles.ctaButtons}>
                            <TouchableOpacity
                                style={styles.ctaPrimaryBtn}
                                onPress={handleContactPress}
                            >
                                <Icon name="mail" size={18} color={theme.BRAND_GRADIENT_END} />
                                <Text style={styles.ctaPrimaryText}>Get in Touch</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.ctaSecondaryBtn}
                                onPress={() => router.push('/feedback')}
                            >
                                <Icon name="rate-review" size={18} color="#fff" />
                                <Text style={styles.ctaSecondaryText}>Send Feedback</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* ============== SOCIAL CONNECT ============== */}
                <View style={styles.socialSection}>
                    <Text style={styles.socialTitle}>Connect With Us</Text>
                    <View style={styles.socialRow}>
                        <SocialButton icon="facebook" onPress={() => handleSocialLink('https://facebook.com')} />
                        <SocialButton icon="camera-alt" onPress={() => handleSocialLink('https://instagram.com')} />
                        <SocialButton icon="share" onPress={() => handleSocialLink('https://twitter.com')} />
                        <SocialButton icon="play-circle-fill" onPress={() => handleSocialLink('https://youtube.com')} />
                        <SocialButton icon="business" onPress={() => handleSocialLink('https://linkedin.com')} />
                    </View>
                </View>

                {/* ============== FOOTER ============== */}
                <View style={styles.footer}>
                    <Text style={styles.footerLogo}>madhusudan</Text>
                    <Text style={styles.footerSince}>SINCE 1975</Text>
                    <Text style={styles.footerTagline}>
                        Textile Innovation • Manufacturing Excellence
                    </Text>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerText}>
                        HO-5, Upper Ground, Raghunandan Textile Market,{'\n'}
                        Ring Road, Surat - 395002
                    </Text>
                    <Text style={styles.footerText}>
                        📞 +91 8165500100{'\n'}
                        ✉️ inquiry@madhudangroup.com
                    </Text>
                    <View style={styles.footerDivider} />
                    <Text style={styles.copyrightText}>
                        © 2025 Madhusudan Group. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

// ============== HELPER COMPONENTS ==============
const UnitCard = ({ city, state, description, distance, icon }: any) => (
    <View style={styles.unitCard}>
        <View style={styles.unitHeader}>
            <View style={styles.unitIcon}>
                <Icon name={icon} size={24} color={theme.BRAND_GRADIENT_END} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.unitCity}>{city}</Text>
                <Text style={styles.unitState}>{state}</Text>
            </View>
            <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{distance}</Text>
            </View>
        </View>
        <Text style={styles.unitDescription}>{description}</Text>
    </View>
);

const CapabilityItem = ({ icon, title, value, unit }: any) => (
    <View style={styles.capabilityItem}>
        <Icon name={icon} size={24} color={theme.BRAND_GRADIENT_END} />
        <Text style={styles.capabilityTitle}>{title}</Text>
        <View style={styles.capabilityValue}>
            <Text style={styles.capabilityNumber}>{value}</Text>
            <Text style={styles.capabilityUnit}>{unit}</Text>
        </View>
    </View>
);

const SustainabilityPoint = ({ icon, text }: any) => (
    <View style={styles.sustainabilityPoint}>
        <Icon name={icon} size={20} color="#10B981" />
        <Text style={styles.sustainabilityPointText}>{text}</Text>
    </View>
);

const RegionCard = ({ icon, region, countries }: any) => (
    <View style={styles.regionCard}>
        <Icon name={icon} size={32} color={theme.BRAND_GRADIENT_END} />
        <Text style={styles.regionName}>{region}</Text>
        <Text style={styles.regionCountries}>{countries}</Text>
    </View>
);

const SocialButton = ({ icon, onPress }: any) => (
    <TouchableOpacity style={styles.socialBtn} onPress={onPress}>
        <Icon name={icon} size={22} color={theme.BRAND_GRADIENT_END} />
    </TouchableOpacity>
);

// ============== STYLES ==============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    /* ===== HERO ===== */
    heroContainer: {
        width: width,
        height: 440,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroOverlay: {
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
    heroContent: {
        alignItems: 'flex-start',
    },
    heroBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 15,
    },
    heroBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 42,
        fontWeight: '800',
    },
    titleDivider: {
        width: 60,
        height: 3,
        backgroundColor: '#fff',
        marginVertical: 12,
    },
    heroSubtitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    heroDescription: {
        color: '#EAF7FA',
        fontSize: 13,
        lineHeight: 20,
        maxWidth: '90%',
    },

    /* ===== STATS BANNER ===== */
    statsBanner: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: -30,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
        marginTop: 6,
    },
    statLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },

    /* ===== SECTIONS ===== */
    section: {
        padding: 20,
        paddingTop: 30,
    },
    sectionHeader: {
        marginBottom: 20,
    },
    sectionSmallText: {
        fontSize: 12,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
        marginTop: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 8,
        lineHeight: 20,
    },

    /* ===== STORY ===== */
    storyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    storyImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    storyContent: {
        padding: 18,
    },
    storyText: {
        fontSize: 13,
        lineHeight: 21,
        color: '#374151',
        marginBottom: 10,
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

    /* ===== MISSION VISION ===== */
    mvRow: {
        flexDirection: 'row',
        gap: 12,
    },
    mvCard: {
        flex: 1,
        borderRadius: 16,
        padding: 18,
    },
    mvIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    mvTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000',
        marginBottom: 8,
    },
    mvText: {
        fontSize: 12,
        lineHeight: 19,
        color: '#374151',
    },

    /* ===== VALUES ===== */
    valuesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    valueCard: {
        width: (width - 52) / 2,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    valueIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    valueTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
    },
    valueDesc: {
        fontSize: 11,
        lineHeight: 17,
        color: '#6B7280',
    },

    /* ===== TIMELINE ===== */
    timeline: {
        paddingLeft: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.BRAND_GRADIENT_END + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        marginTop: 5,
    },
    timelineDotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    timelineContent: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
    },
    yearBadge: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    yearText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    timelineDesc: {
        fontSize: 12,
        lineHeight: 18,
        color: '#6B7280',
    },

    /* ===== UNITS ===== */
    unitsContainer: {
        gap: 12,
    },
    unitCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    unitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    unitIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.BRAND_GRADIENT_END + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    unitCity: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    unitState: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    distanceBadge: {
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    distanceText: {
        fontSize: 10,
        color: '#0284C7',
        fontWeight: '600',
    },
    unitDescription: {
        fontSize: 12,
        lineHeight: 18,
        color: '#374151',
    },

    /* ===== CAPABILITIES ===== */
    capabilitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    capabilityItem: {
        width: (width - 50) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    capabilityTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginTop: 8,
    },
    capabilityValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
    },
    capabilityNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
    },
    capabilityUnit: {
        fontSize: 10,
        color: '#6B7280',
        marginLeft: 4,
    },

    /* ===== LEADERS ===== */
    leadersScroll: {
        paddingVertical: 5,
        paddingRight: 20,
    },
    leaderCard: {
        width: width * 0.7,
        marginRight: 14,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#ffffff9b',
        height: 320,
    },
    leaderImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    leaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    leaderName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    leaderPosition: {
        color: '#EAF7FA',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    leaderBio: {
        color: '#D1D5DB',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 6,
    },

    /* ===== CERTIFICATIONS ===== */
    certGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    certCard: {
        width: (width - 50) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    certIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.BRAND_GRADIENT_END + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    certName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
    },
    certDesc: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },

    /* ===== SUSTAINABILITY ===== */
    sustainabilitySection: {
        height: 480,
        position: 'relative',
    },
    sustainabilityBg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    sustainabilityOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    sustainabilityContent: {
        alignItems: 'center',
        width: '100%',
    },
    sustainabilityTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 15,
    },
    sustainabilityDivider: {
        width: 50,
        height: 3,
        backgroundColor: '#10B981',
        marginVertical: 12,
    },
    sustainabilityText: {
        color: '#EAF7FA',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
    },
    sustainabilityPoints: {
        width: '100%',
        gap: 10,
    },
    sustainabilityPoint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 12,
    },
    sustainabilityPointText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },

    /* ===== REGIONS ===== */
    regionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    regionCard: {
        width: (width - 52) / 2,
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
    },
    regionName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        marginTop: 8,
    },
    regionCountries: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 14,
    },

    /* ===== CTA ===== */
    ctaSection: {
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: theme.BRAND_GRADIENT_END,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    ctaGradient: {
        padding: 30,
        alignItems: 'center',
    },
    ctaTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    ctaSubtitle: {
        color: '#EAF7FA',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    ctaButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    ctaPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 6,
    },
    ctaPrimaryText: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 13,
        fontWeight: '700',
    },
    ctaSecondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 6,
    },
    ctaSecondaryText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    /* ===== SOCIAL ===== */
    socialSection: {
        padding: 30,
        alignItems: 'center',
    },
    socialTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 15,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.BRAND_GRADIENT_END + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ===== FOOTER ===== */
    footer: {
        backgroundColor: '#1F2937',
        padding: 30,
        alignItems: 'center',
    },
    footerLogo: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    footerSince: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 4,
    },
    footerTagline: {
        color: '#D1D5DB',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    footerDivider: {
        width: '80%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginVertical: 15,
    },
    footerText: {
        color: '#D1D5DB',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    copyrightText: {
        color: '#9CA3AF',
        fontSize: 10,
        textAlign: 'center',
    },
});