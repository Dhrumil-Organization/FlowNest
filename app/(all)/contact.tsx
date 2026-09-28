import AppAlert from '@/common/utils/appAlert';
// import React from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   Linking,
//   StyleSheet
// } from 'react-native';

// import { useRouter } from 'expo-router';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import { LinearGradient } from 'expo-linear-gradient';
// import theme from '@/components/theme';

// export default function ContactScreen() {

//   const router = useRouter();

//   return (

//     <ScrollView style={styles.container}>

//       <LinearGradient
//         colors={[
//           theme.BRAND_GRADIENT_START,
//           theme.BRAND_GRADIENT_END
//         ]}
//         style={styles.header}

//       >

//         <TouchableOpacity
//           onPress={() => router.back()}

//         >

//           <Icon
//             name="arrow-back"
//             size={24}
//             color="#fff"
//           /> </TouchableOpacity>

//         <Text style={styles.title}>
//           Contact Us
//         </Text>

//       </LinearGradient>

//       <View style={styles.card}>

//         <Text style={styles.heading}>
//           Madhusudan Group
//         </Text>

//         <Text style={styles.text}>
//           Textile Manufacturing & Innovation
//         </Text>

//         <Text style={styles.label}>
//           Website
//         </Text>

//         <TouchableOpacity
//           onPress={() =>
//             Linking.openURL(
//               'https://madhusudangroup.com'
//             )
//           }

//         >

//           <Text style={styles.link}>
//             www.madhusudangroup.com
//           </Text>
//         </TouchableOpacity>

//       </View>

//     </ScrollView>

//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.NEUTRAL_BG
//   },
//   header: {
//     paddingTop: 60,
//     paddingBottom: 25,
//     paddingHorizontal: 20
//   },
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '700',
//     marginTop: 15
//   },
//   card: {
//     margin: 20,
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     padding: 20
//   },
//   heading: {
//     fontSize: 20,
//     fontWeight: '700'
//   },
//   text: {
//     color: '#666',
//     marginTop: 5
//   },
//   label: {
//     marginTop: 25,
//     fontWeight: '700'
//   },
//   link: {
//     color: theme.BRAND_GRADIENT_END,
//     marginTop: 10
//   }
// });

// screens/ContactScreen.tsx
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Background images (replace with your actual URLs later)
const HEADER_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200';

interface OfficeLocation {
    city: string;
    type: 'Head Office' | 'Manufacturing' | 'Branch';
    address: string;
    phone: string[];
    email: string;
    distance?: string;
    icon: string;
}

interface ContactPerson {
    name: string;
    designation: string;
    department: string;
    phone: string;
    email: string;
    avatar: string;
}

const OFFICES: OfficeLocation[] = [
    {
        city: 'Surat',
        type: 'Head Office',
        address: 'HO-5, Upper Ground, Raghunandan Textile Market, Ring Road, Surat - 395002, Gujarat, India',
        phone: ['+91 8165500100', '+91 261 2345678'],
        email: 'surat@madhudangroup.com',
        icon: 'business',
    },
    {
        city: 'Palsana',
        type: 'Manufacturing Unit',
        address: '283, Laxminarayan Industrial Estate, N.H. No. 8, Village Baleeshwar, Tal Palsana, Dist - Surat, Gujarat',
        phone: ['+91 2622-265536', '+91 2622-264101', '+91 2622-264102', '+91 9824210790'],
        email: 'palsana@madhudangroup.com',
        distance: '26 km from Surat',
        icon: 'factory',
    },
    {
        city: 'Silvassa',
        type: 'Manufacturing Unit',
        address: 'Survey No. 123, Industrial Area, Silvassa - 396230, Dadra & Nagar Haveli, India',
        phone: ['+91 260 2645678', '+91 9876543210'],
        email: 'silvassa@madhudangroup.com',
        icon: 'precision-manufacturing',
    },
    {
        city: 'Navapur',
        type: 'Export Unit',
        address: 'Plot No. 45, MIDC Industrial Area, Navapur - 425418, Maharashtra, India',
        phone: ['+91 2592 234567', '+91 9876543211'],
        email: 'navapur@madhudangroup.com',
        distance: '100 km from Hazira Port',
        icon: 'directions-boat',
    },
];

const DEPARTMENTS = [
    { name: 'Sales Inquiry', icon: 'shopping-cart', email: 'sales@madhudangroup.com', color: '#3B82F6' },
    { name: 'Customer Support', icon: 'support-agent', email: 'support@madhudangroup.com', color: '#10B981' },
    { name: 'Export & International', icon: 'public', email: 'export@madhudangroup.com', color: '#8B5CF6' },
    { name: 'Accounts & Billing', icon: 'receipt', email: 'accounts@madhudangroup.com', color: '#F59E0B' },
    { name: 'HR & Careers', icon: 'groups', email: 'hr@madhudangroup.com', color: '#EC4899' },
    { name: 'Technical Support', icon: 'build', email: 'tech@madhudangroup.com', color: '#EF4444' },
];

const CONTACT_PERSONS: ContactPerson[] = [
    {
        name: 'Mr. Yatiraj Mundra',
        designation: 'Director',
        department: 'Support',
        phone: '',
        email: '',
        avatar: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.03.30_REC-removebg-preview-300x292.png',
    },
    {
        name: 'Mr. Sudarshan Mundra',
        designation: 'Director',
        department: 'Support',
        phone: '',
        email: '',
        avatar: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.02.35_REC-removebg-preview-300x293.png',
    },
    {
        name: 'Mr. Nikunj Mundra',
        designation: 'Director',
        department: 'Support',
        phone: '',
        email: '',
        avatar: 'https://madhusudangroup.com/wp-content/uploads/2023/05/16.05.2023_18.20.36_REC-removebg-preview-300x298.png',
    },
    {
        name: 'Mr. Saulabhya Mundra',
        designation: 'Director',
        department: 'Support',
        phone: '',
        email: '',
        avatar: 'https://madhusudangroup.com/wp-content/uploads/2023/03/06.03.2023_19.05.06_REC-removebg-preview-300x295.png',
    },
];

export default function ContactScreen() {
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        inquiryType: 'general',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Animations
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

    const handlePhoneCall = (phone: string) => {
        const phoneUrl = `tel:${phone.replace(/\s/g, '')}`;
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(phoneUrl);
                } else {
                    AppAlert.alert('Error', 'Phone calls not supported on this device');
                }
            })
            .catch((err) => console.error(err));
    };

    const handleEmail = (email: string) => {
        const emailUrl = `mailto:${email}`;
        Linking.openURL(emailUrl).catch(() => {
            AppAlert.alert('Error', 'Email not configured on this device');
        });
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `whatsapp://send?phone=91${cleanPhone.slice(-10)}`;
        Linking.openURL(whatsappUrl).catch(() => {
            AppAlert.alert('Error', 'WhatsApp not installed');
        });
    };

    const handleMap = (address: string) => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        Linking.openURL(mapUrl).catch(() => {
            AppAlert.alert('Error', 'Cannot open maps');
        });
    };

    const handleSocialMedia = (platform: string) => {
        const urls: any = {
            facebook: 'https://facebook.com/madhusudangroup',
            instagram: 'https://instagram.com/madhusudangroup',
            twitter: 'https://twitter.com/madhusudangroup',
            linkedin: 'https://linkedin.com/company/madhusudangroup',
            youtube: 'https://youtube.com/@madhusudangroup',
        };
        Linking.openURL(urls[platform]).catch(() => console.log('Cannot open'));
    };

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            AppAlert.alert('Required', 'Please enter your name');
            return false;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
            AppAlert.alert('Invalid Email', 'Please enter a valid email address');
            return false;
        }
        if (!formData.subject.trim()) {
            AppAlert.alert('Required', 'Please enter a subject');
            return false;
        }
        if (!formData.message.trim() || formData.message.length < 10) {
            AppAlert.alert('Too Short', 'Please enter at least 10 characters in your message');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            AppAlert.alert(
                '✅ Message Sent!',
                `Thank you ${formData.name}!\n\nWe've received your inquiry and our team will get back to you within 24 hours.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setFormData({
                                name: '',
                                email: '',
                                phone: '',
                                subject: '',
                                message: '',
                                inquiryType: 'general',
                            });
                        },
                    },
                ]
            );
        }, 1500);
    };

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    {/* ============== HEADER ============== */}
                    <View style={styles.headerContainer}>
                        <Image source={{ uri: HEADER_IMAGE }} style={styles.headerImage} />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                            style={styles.headerOverlay}
                        >
                            <View style={styles.topNav}>
                                <TouchableOpacity
                                    onPress={() => router.back()}
                                    style={styles.backBtn}
                                >
                                    <Icon name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.brandText}>madhusudan</Text>
                                <TouchableOpacity style={styles.touchBtn}>
                                    <Text style={styles.touchBtnText}>Get in Touch</Text>
                                </TouchableOpacity>
                            </View>

                            <Animated.View
                                style={[
                                    styles.heroContent,
                                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                                ]}
                            >
                                <View style={styles.heroBadge}>
                                    <Icon name="support-agent" size={14} color="#fff" />
                                    <Text style={styles.heroBadgeText}>24/7 AVAILABLE</Text>
                                </View>
                                <Text style={styles.heroTitle}>Contact Us</Text>
                                <View style={styles.titleDivider} />
                                <Text style={styles.heroSubtitle}>
                                    Let's Build Something Together
                                </Text>
                                <Text style={styles.heroDescription}>
                                    Reach out for inquiries, partnerships, or support. Our team responds within 24 hours.
                                </Text>
                            </Animated.View>
                        </LinearGradient>
                    </View>

                    {/* ============== QUICK CONTACT CARDS ============== */}
                    <Animated.View
                        style={[
                            styles.quickContactContainer,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        <TouchableOpacity
                            style={[styles.quickCard, { backgroundColor: '#DBEAFE' }]}
                            onPress={() => handlePhoneCall('+918165500100')}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: '#3B82F6' }]}>
                                <Icon name="phone" size={22} color="#fff" />
                            </View>
                            <Text style={styles.quickTitle}>Call Us</Text>
                            <Text style={styles.quickInfo}>+91 8165500100</Text>
                            <Text style={styles.quickSubtext}>Mon-Sat, 9AM-7PM</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickCard, { backgroundColor: '#D1FAE5' }]}
                            onPress={() => handleEmail('inquiry@madhudangroup.com')}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: '#10B981' }]}>
                                <Icon name="email" size={22} color="#fff" />
                            </View>
                            <Text style={styles.quickTitle}>Email Us</Text>
                            <Text style={styles.quickInfo} numberOfLines={1}>
                                inquiry@madhudangroup.com
                            </Text>
                            <Text style={styles.quickSubtext}>Reply in 24 hrs</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickCard, { backgroundColor: '#D1FAE5' }]}
                            onPress={() => handleWhatsApp('+918165500100')}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: '#25D366' }]}>
                                <Icon name="chat" size={22} color="#fff" />
                            </View>
                            <Text style={styles.quickTitle}>WhatsApp</Text>
                            <Text style={styles.quickInfo}>+91 8165500100</Text>
                            <Text style={styles.quickSubtext}>Quick Response</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ============== OUR OFFICES ============== */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Our Locations</Text>
                            <Text style={styles.sectionTitle}>Visit Our Offices</Text>
                            <Text style={styles.sectionSubtitle}>
                                Strategically located across India for easy access.
                            </Text>
                        </View>

                        {OFFICES.map((office, index) => (
                            <OfficeCard
                                key={index}
                                office={office}
                                onCall={handlePhoneCall}
                                onEmail={handleEmail}
                                onMap={handleMap}
                            />
                        ))}
                    </View>

                    {/* ============== DEPARTMENT CONTACTS ============== */}
                    <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Departments</Text>
                            <Text style={styles.sectionTitle}>Reach the Right Team</Text>
                        </View>

                        <View style={styles.departmentsGrid}>
                            {DEPARTMENTS.map((dept, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.departmentCard}
                                    onPress={() => handleEmail(dept.email)}
                                >
                                    <View
                                        style={[
                                            styles.departmentIcon,
                                            { backgroundColor: dept.color + '20' },
                                        ]}
                                    >
                                        <Icon name={dept.icon} size={22} color={dept.color} />
                                    </View>
                                    <Text style={styles.departmentName}>{dept.name}</Text>
                                    <Text style={styles.departmentEmail} numberOfLines={1}>
                                        {dept.email}
                                    </Text>
                                    <Icon
                                        name="arrow-forward"
                                        size={14}
                                        color={dept.color}
                                        style={{ marginTop: 4 }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ============== CONTACT PERSONS ============== */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Leadership Team</Text>
                            <Text style={styles.sectionTitle}>Key Contacts</Text>
                        </View>

                        {CONTACT_PERSONS.map((person, index) => (
                            <ContactPersonCard
                                key={index}
                                person={person}
                                onCall={handlePhoneCall}
                                onEmail={handleEmail}
                            />
                        ))}
                    </View>

                    {/* ============== CONTACT FORM ============== */}
                    <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Get in Touch</Text>
                            <Text style={styles.sectionTitle}>Send Us a Message</Text>
                            <Text style={styles.sectionSubtitle}>
                                Fill out the form below and we'll get back to you shortly.
                            </Text>
                        </View>

                        <View style={styles.formCard}>
                            {/* Inquiry Type */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="category" size={14} color={theme.BRAND_GRADIENT_END} /> Inquiry Type *
                                </Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.inquiryTypes}
                                >
                                    {[
                                        { id: 'general', label: 'General', icon: 'info' },
                                        { id: 'sales', label: 'Sales', icon: 'shopping-cart' },
                                        { id: 'support', label: 'Support', icon: 'help' },
                                        { id: 'partnership', label: 'Partnership', icon: 'handshake' },
                                        { id: 'career', label: 'Career', icon: 'work' },
                                        { id: 'media', label: 'Media', icon: 'campaign' },
                                    ].map((type) => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[
                                                styles.inquiryChip,
                                                formData.inquiryType === type.id && styles.inquiryChipActive,
                                            ]}
                                            onPress={() => updateField('inquiryType', type.id)}
                                        >
                                            <Icon
                                                name={type.icon}
                                                size={14}
                                                color={
                                                    formData.inquiryType === type.id
                                                        ? '#fff'
                                                        : theme.BRAND_GRADIENT_END
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.inquiryText,
                                                    formData.inquiryType === type.id && styles.inquiryTextActive,
                                                ]}
                                            >
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Name */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="person" size={14} color={theme.BRAND_GRADIENT_END} /> Full Name *
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.name}
                                    onChangeText={(v) => updateField('name', v)}
                                />
                            </View>

                            {/* Email */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="email" size={14} color={theme.BRAND_GRADIENT_END} /> Email Address *
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.email}
                                    onChangeText={(v) => updateField('email', v)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Phone */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="phone" size={14} color={theme.BRAND_GRADIENT_END} /> Phone Number
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="+91 98765 43210"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.phone}
                                    onChangeText={(v) => updateField('phone', v)}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            {/* Subject */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="subject" size={14} color={theme.BRAND_GRADIENT_END} /> Subject *
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Brief subject of your inquiry"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.subject}
                                    onChangeText={(v) => updateField('subject', v)}
                                    maxLength={100}
                                />
                            </View>

                            {/* Message */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="message" size={14} color={theme.BRAND_GRADIENT_END} /> Your Message *
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Tell us how we can help you..."
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.message}
                                    onChangeText={(v) => updateField('message', v)}
                                    multiline
                                    numberOfLines={6}
                                    maxLength={1000}
                                />
                                <Text style={styles.charCount}>{formData.message.length}/1000</Text>
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                                    style={styles.submitBtnGradient}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Icon name="hourglass-empty" size={20} color="#fff" />
                                            <Text style={styles.submitBtnText}>Sending...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="send" size={20} color="#fff" />
                                            <Text style={styles.submitBtnText}>Send Message</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.privacyNote}>
                                <Icon name="lock" size={12} color="#6B7280" /> Your information is secure and will not be shared.
                            </Text>
                        </View>
                    </View>

                    {/* ============== BUSINESS HOURS ============== */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Working Hours</Text>
                            <Text style={styles.sectionTitle}>Business Hours</Text>
                        </View>

                        <View style={styles.hoursCard}>
                            <HourRow day="Monday - Friday" hours="9:00 AM - 7:00 PM" />
                            <HourRow day="Saturday" hours="9:00 AM - 5:00 PM" />
                            <HourRow day="Sunday" hours="Closed" closed />
                            <HourRow day="Holidays" hours="As per company calendar" closed />

                            <View style={styles.emergencyBox}>
                                <Icon name="support-agent" size={20} color={theme.BRAND_GRADIENT_END} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.emergencyTitle}>24/7 Emergency Support</Text>
                                    <Text style={styles.emergencyText}>
                                        For urgent production issues, call our hotline
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.emergencyBtn}
                                    onPress={() => handlePhoneCall('+919824210790')}
                                >
                                    <Icon name="phone" size={14} color="#fff" />
                                    <Text style={styles.emergencyBtnText}>Call</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* ============== SOCIAL MEDIA ============== */}
                    <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionSmallText}>Stay Connected</Text>
                            <Text style={styles.sectionTitle}>Follow Us</Text>
                            <Text style={styles.sectionSubtitle}>
                                Get latest updates on products, innovations, and industry insights.
                            </Text>
                        </View>

                        <View style={styles.socialGrid}>
                            <SocialCard
                                icon="facebook"
                                name="Facebook"
                                handle="@madhusudangroup"
                                color="#1877F2"
                                onPress={() => handleSocialMedia('facebook')}
                            />
                            <SocialCard
                                icon="camera-alt"
                                name="Instagram"
                                handle="@madhusudangroup"
                                color="#E4405F"
                                onPress={() => handleSocialMedia('instagram')}
                            />
                            <SocialCard
                                icon="share"
                                name="Twitter"
                                handle="@madhusudan_textile"
                                color="#1DA1F2"
                                onPress={() => handleSocialMedia('twitter')}
                            />
                            <SocialCard
                                icon="business"
                                name="LinkedIn"
                                handle="Madhusudan Group"
                                color="#0A66C2"
                                onPress={() => handleSocialMedia('linkedin')}
                            />
                            <SocialCard
                                icon="play-circle-fill"
                                name="YouTube"
                                handle="Madhusudan Group"
                                color="#FF0000"
                                onPress={() => handleSocialMedia('youtube')}
                            />
                        </View>
                    </View>

                    {/* ============== MAP / LOCATION ============== */}
                    <View style={styles.mapSection}>
                        <Image
                            source={{
                                uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200',
                            }}
                            style={styles.mapImage}
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
                            style={styles.mapOverlay}
                        >
                            <Icon name="location-on" size={40} color="#fff" />
                            <Text style={styles.mapTitle}>Find Us on Map</Text>
                            <Text style={styles.mapAddress}>
                                HO-5, Upper Ground, Raghunandan Textile Market,{'\n'}
                                Ring Road, Surat - 395002, Gujarat, India
                            </Text>
                            <TouchableOpacity
                                style={styles.mapBtn}
                                onPress={() =>
                                    handleMap('HO-5, Upper Ground, Raghunandan Textile Market, Ring Road, Surat')
                                }
                            >
                                <Icon name="directions" size={18} color={theme.BRAND_GRADIENT_END} />
                                <Text style={styles.mapBtnText}>Get Directions</Text>
                            </TouchableOpacity>
                        </LinearGradient>
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
                            📞 +91 8165500100{'\n'}
                            ✉️ inquiry@madhudangroup.com{'\n'}
                            📍 Surat, Gujarat, India
                        </Text>
                        <View style={styles.footerDivider} />
                        <Text style={styles.copyrightText}>
                            © 2025 Madhusudan Group. All rights reserved.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============== HELPER COMPONENTS ==============
const OfficeCard = ({ office, onCall, onEmail, onMap }: any) => (
    <View style={styles.officeCard}>
        <View style={styles.officeHeader}>
            <View style={styles.officeIconBox}>
                <Icon name={office.icon} size={24} color={theme.BRAND_GRADIENT_END} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.officeCity}>{office.city}</Text>
                <Text style={styles.officeType}>{office.type}</Text>
                {office.distance && (
                    <View style={styles.distanceBadge}>
                        <Icon name="place" size={10} color="#0284C7" />
                        <Text style={styles.distanceText}>{office.distance}</Text>
                    </View>
                )}
            </View>
        </View>

        <View style={styles.officeAddress}>
            <Icon name="location-on" size={16} color="#6B7280" />
            <Text style={styles.officeAddressText}>{office.address}</Text>
        </View>

        <View style={styles.officeContact}>
            <Icon name="phone" size={16} color="#6B7280" />
            <Text style={styles.officeContactText}>{office.phone[0]}</Text>
        </View>

        <View style={styles.officeContact}>
            <Icon name="email" size={16} color="#6B7280" />
            <Text style={styles.officeContactText}>{office.email}</Text>
        </View>

        <View style={styles.officeActions}>
            <TouchableOpacity
                style={[styles.officeActionBtn, { backgroundColor: '#3B82F6' + '15' }]}
                onPress={() => onCall(office.phone[0])}
            >
                <Icon name="phone" size={14} color="#3B82F6" />
                <Text style={[styles.officeActionText, { color: '#3B82F6' }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.officeActionBtn, { backgroundColor: '#10B981' + '15' }]}
                onPress={() => onEmail(office.email)}
            >
                <Icon name="email" size={14} color="#10B981" />
                <Text style={[styles.officeActionText, { color: '#10B981' }]}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.officeActionBtn, { backgroundColor: '#EF4444' + '15' }]}
                onPress={() => onMap(office.address)}
            >
                <Icon name="place" size={14} color="#EF4444" />
                <Text style={[styles.officeActionText, { color: '#EF4444' }]}>Map</Text>
            </TouchableOpacity>
        </View>
    </View>
);

const ContactPersonCard = ({ person, onCall, onEmail }: any) => (
    <View style={styles.personCard}>
        <Image source={{ uri: person.avatar }} style={styles.personAvatar} />
        <View style={styles.personInfo}>
            <Text style={styles.personName}>{person.name}</Text>
            <Text style={styles.personDesignation}>{person.designation}</Text>
            <View style={styles.personDept}>
                <Icon name="business" size={11} color="#6B7280" />
                <Text style={styles.personDeptText}>{person.department}</Text>
            </View>
        </View>
        <View style={styles.personActions}>
            <TouchableOpacity
                style={styles.personActionBtn}
                onPress={() => onCall(person.phone)}
            >
                <Icon name="phone" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.personActionBtn}
                onPress={() => onEmail(person.email)}
            >
                <Icon name="email" size={16} color="#10B981" />
            </TouchableOpacity>
        </View>
    </View>
);

const HourRow = ({ day, hours, closed = false }: any) => (
    <View style={styles.hourRow}>
        <View style={styles.hourLeft}>
            <Icon
                name={closed ? 'block' : 'access-time'}
                size={16}
                color={closed ? '#EF4444' : '#10B981'}
            />
            <Text style={styles.hourDay}>{day}</Text>
        </View>
        <Text style={[styles.hourTime, closed && { color: '#EF4444' }]}>{hours}</Text>
    </View>
);

const SocialCard = ({ icon, name, handle, color, onPress }: any) => (
    <TouchableOpacity style={styles.socialCard} onPress={onPress}>
        <View style={[styles.socialIconBox, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={22} color={color} />
        </View>
        <Text style={styles.socialName}>{name}</Text>
        <Text style={styles.socialHandle} numberOfLines={1}>
            {handle}
        </Text>
    </TouchableOpacity>
);

// ============== STYLES ==============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    /* ===== HEADER ===== */
    headerContainer: {
        width: width,
        height: 400,
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
    heroContent: {
        alignItems: 'flex-start',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 15,
        gap: 6,
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

    /* ===== QUICK CONTACT ===== */
    quickContactContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: -30,
        gap: 10,
    },
    quickCard: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    quickIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
        marginTop: 4,
    },
    quickInfo: {
        fontSize: 10,
        color: '#374151',
        marginTop: 2,
        fontWeight: '600',
    },
    quickSubtext: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 2,
    },

    /* ===== SECTION ===== */
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
        fontSize: 26,
        fontWeight: '800',
        color: '#000',
        marginTop: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 6,
        lineHeight: 20,
    },

    /* ===== OFFICE CARD ===== */
    officeCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    officeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    officeIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.BRAND_GRADIENT_END + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    officeCity: {
        fontSize: 17,
        fontWeight: '800',
        color: '#000',
    },
    officeType: {
        fontSize: 11,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '700',
        marginTop: 2,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 4,
        gap: 3,
    },
    distanceText: {
        fontSize: 9,
        color: '#0284C7',
        fontWeight: '600',
    },
    officeAddress: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        gap: 8,
    },
    officeAddressText: {
        flex: 1,
        fontSize: 12,
        color: '#374151',
        lineHeight: 18,
    },
    officeContact: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    officeContactText: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '600',
    },
    officeActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    officeActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    officeActionText: {
        fontSize: 11,
        fontWeight: '700',
    },

    /* ===== DEPARTMENTS ===== */
    departmentsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    departmentCard: {
        width: (width - 50) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    departmentIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    departmentName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    departmentEmail: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
    },

    /* ===== CONTACT PERSONS ===== */
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    personAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
    },
    personInfo: {
        flex: 1,
    },
    personName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    personDesignation: {
        fontSize: 11,
        color: theme.BRAND_GRADIENT_END,
        fontWeight: '600',
        marginTop: 2,
    },
    personDept: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    personDeptText: {
        fontSize: 10,
        color: '#6B7280',
    },
    personActions: {
        flexDirection: 'row',
        gap: 6,
    },
    personActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ===== FORM ===== */
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    formGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },

    inquiryTypes: {
        paddingVertical: 4,
        gap: 8,
    },
    inquiryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
        gap: 5,
    },
    inquiryChipActive: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderColor: theme.BRAND_GRADIENT_END,
    },
    inquiryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    inquiryTextActive: {
        color: '#fff',
    },

    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#000',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    charCount: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4,
    },

    submitBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 4,
        shadowColor: theme.BRAND_GRADIENT_END,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    privacyNote: {
        fontSize: 10,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
    },

    /* ===== HOURS ===== */
    hoursCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    hourRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    hourLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    hourDay: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    hourTime: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '700',
    },

    emergencyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.BRAND_GRADIENT_END + '10',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    emergencyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    emergencyText: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
    },
    emergencyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.BRAND_GRADIENT_END,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 4,
    },
    emergencyBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    /* ===== SOCIAL ===== */
    socialGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    socialCard: {
        width: (width - 50) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    socialIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    socialName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    socialHandle: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
    },

    /* ===== MAP ===== */
    mapSection: {
        height: 320,
        position: 'relative',
    },
    mapImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    mapTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 10,
    },
    mapAddress: {
        color: '#EAF7FA',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    mapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
        gap: 6,
        elevation: 4,
    },
    mapBtnText: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 14,
        fontWeight: '700',
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