import AppAlert from '@/common/utils/appAlert';
// screens/FeedbackScreen.tsx
import {
    deleteFeedback,
    Feedback,
    FeedbackCategory,
    getFeedbacksByUsername,
    getOrCreateUserId,
    getOrCreateUsername,
    saveFeedback,
} from '@/common/utils/feedbackStorage';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Background image URL (replace later)
const HEADER_IMAGE = 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: string; color: string }[] = [
    { id: 'product-quality', label: 'Product Quality', icon: 'verified', color: '#10B981' },
    { id: 'service-experience', label: 'Service', icon: 'support-agent', color: '#3B82F6' },
    { id: 'app-bug', label: 'App Issue', icon: 'bug-report', color: '#EF4444' },
    { id: 'feature-request', label: 'Feature Request', icon: 'lightbulb', color: '#F59E0B' },
    { id: 'billing-payment', label: 'Billing', icon: 'receipt', color: '#8B5CF6' },
    { id: 'delivery-shipping', label: 'Delivery', icon: 'local-shipping', color: '#EC4899' },
    { id: 'general-feedback', label: 'General', icon: 'chat-bubble', color: '#6366F1' },
];

export default function FeedbackScreen() {
    const router = useRouter();

    // State Management
    const [activeView, setActiveView] = useState<'submit' | 'history'>('submit');
    const [category, setCategory] = useState<FeedbackCategory>('general-feedback');
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // User & History
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState('');
    const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const starScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        initializeUser();
        animateEntrance();
    }, []);

    useEffect(() => {
        if (username) {
            loadMyFeedbacks();
        }
    }, [username]);

    const initializeUser = async () => {
        const name = await getOrCreateUsername();
        const id = await getOrCreateUserId();
        setUsername(name);
        setUserId(id);
    };

    const animateEntrance = () => {
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
    };

    const animateStars = () => {
        Animated.sequence([
            Animated.timing(starScale, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(starScale, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const loadMyFeedbacks = async () => {
        setRefreshing(true);
        const list = await getFeedbacksByUsername(username);
        setMyFeedbacks(list);
        setRefreshing(false);
    };

    const handleRating = (value: number) => {
        setRating(value);
        animateStars();
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const validateForm = (): boolean => {
        if (rating === 0) {
            AppAlert.alert('Rating Required', 'Please select a star rating before submitting.');
            return false;
        }
        if (title.trim().length < 5) {
            AppAlert.alert('Title Too Short', 'Please enter at least 5 characters in the title.');
            return false;
        }
        if (message.trim().length < 10) {
            AppAlert.alert('Message Too Short', 'Please enter at least 10 characters in your feedback.');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const newFeedback = await saveFeedback({
                username: isAnonymous ? 'Anonymous' : username,
                userId: isAnonymous ? 'HIDDEN' : userId,
                category,
                rating,
                title: title.trim(),
                message: message.trim(),
                contact: contact.trim(),
                attachments: [],
                priority,
                deviceInfo: {
                    platform: Platform.OS,
                    version: Platform.Version?.toString() || '1.0',
                },
            });

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            AppAlert.alert(
                '✅ Feedback Submitted',
                `Thank you for your valuable feedback!\n\nReference ID: ${newFeedback.id}\n\nWe'll review it and get back to you soon.`,
                [
                    {
                        text: 'View History',
                        onPress: () => {
                            setActiveView('history');
                            resetForm();
                            loadMyFeedbacks();
                        },
                    },
                    {
                        text: 'Submit Another',
                        onPress: () => resetForm(),
                    },
                ]
            );
        } catch (error) {
            AppAlert.alert('Error', 'Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setMessage('');
        setContact('');
        setRating(0);
        setCategory('general-feedback');
        setPriority('medium');
        setIsAnonymous(false);
    };

    const handleDelete = (id: string) => {
        AppAlert.alert(
            'Delete Feedback?',
            'Are you sure you want to delete this feedback? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteFeedback(id);
                        loadMyFeedbacks();
                        if (Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        }
                    },
                },
            ]
        );
    };

    const getCategoryInfo = (catId: FeedbackCategory) => {
        return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[6];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return '#10B981';
            case 'reviewed': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => handleRating(star)}
                        activeOpacity={0.7}
                        style={styles.starBtn}
                    >
                        <Animated.View style={{ transform: [{ scale: starScale }] }}>
                            <Icon
                                name={star <= rating ? 'star' : 'star-border'}
                                size={40}
                                color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderRatingLabel = () => {
        const labels = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
        if (rating === 0) return null;
        return (
            <Text style={styles.ratingLabel}>{labels[rating]}</Text>
        );
    };

    const renderCategorySelector = () => {
        return (
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                category === cat.id && {
                                    backgroundColor: cat.color,
                                    borderColor: cat.color,
                                },
                            ]}
                            onPress={() => setCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <Icon
                                name={cat.icon}
                                size={18}
                                color={category === cat.id ? '#fff' : cat.color}
                            />
                            <Text
                                style={[
                                    styles.categoryText,
                                    category === cat.id && styles.categoryTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderFeedbackCard = (feedback: Feedback) => {
        const catInfo = getCategoryInfo(feedback.category);
        const date = new Date(feedback.createdAt);

        return (
            <View key={feedback.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: catInfo.color + '20' }]}>
                        <Icon name={catInfo.icon} size={20} color={catInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle} numberOfLines={2}>
                            {feedback.title}
                        </Text>
                        <Text style={styles.historyDate}>
                            {date.toLocaleDateString()} • {date.toLocaleTimeString()}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(feedback.id)}
                        style={styles.deleteBtn}
                    >
                        <Icon name="delete-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.historyStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                            key={star}
                            name={star <= feedback.rating ? 'star' : 'star-border'}
                            size={16}
                            color={star <= feedback.rating ? '#F59E0B' : '#D1D5DB'}
                        />
                    ))}
                </View>

                <Text style={styles.historyMessage}>{feedback.message}</Text>

                <View style={styles.historyFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feedback.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(feedback.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(feedback.status) }]}>
                            {feedback.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.historyId}>{feedback.id}</Text>
                </View>
            </View>
        );
    };

    const goBack = () => {
        // if (router.canGoBack()) router.back();
        // else router.replace('/');
        router.replace('/(tabs)');
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={loadMyFeedbacks}
                            tintColor={theme.BRAND_GRADIENT_END}
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    {/* ============== HEADER ============== */}
                    <View style={styles.headerContainer}>
                        <Image
                            source={{ uri: HEADER_IMAGE }}
                            style={styles.headerImage}
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
                            style={styles.headerOverlay}
                        >
                            <View style={styles.topNav}>
                                <TouchableOpacity
                                    onPress={goBack}
                                    style={styles.backBtn}
                                >
                                    <Icon name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.brandText}>madhusudan</Text>
                                <TouchableOpacity style={styles.touchBtn}>
                                    <Text style={styles.touchBtnText}>Help</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.headerContent}>
                                <Text style={styles.headerTitle}>Feedback</Text>
                                <View style={styles.titleDivider} />
                                <Text style={styles.headerSubtitle}>
                                    Your Voice Matters
                                </Text>
                                <Text style={styles.headerDescription}>
                                    Help us improve by sharing your experience, suggestions, or concerns.
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* ============== USER INFO BANNER ============== */}
                    <Animated.View
                        style={[
                            styles.userBanner,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.userAvatar}>
                            <Icon name="person" size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.userBannerLabel}>Submitting as</Text>
                            <Text style={styles.userBannerName}>{username}</Text>
                        </View>
                        <View style={styles.idChip}>
                            <Text style={styles.idChipText}>{userId.slice(-8)}</Text>
                        </View>
                    </Animated.View>

                    {/* ============== VIEW TOGGLE ============== */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                activeView === 'submit' && styles.toggleBtnActive,
                            ]}
                            onPress={() => setActiveView('submit')}
                        >
                            <Icon
                                name="edit"
                                size={18}
                                color={activeView === 'submit' ? '#fff' : theme.BRAND_GRADIENT_END}
                            />
                            <Text
                                style={[
                                    styles.toggleText,
                                    activeView === 'submit' && styles.toggleTextActive,
                                ]}
                            >
                                Submit
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                activeView === 'history' && styles.toggleBtnActive,
                            ]}
                            onPress={() => {
                                setActiveView('history');
                                loadMyFeedbacks();
                            }}
                        >
                            <Icon
                                name="history"
                                size={18}
                                color={activeView === 'history' ? '#fff' : theme.BRAND_GRADIENT_END}
                            />
                            <Text
                                style={[
                                    styles.toggleText,
                                    activeView === 'history' && styles.toggleTextActive,
                                ]}
                            >
                                My History ({myFeedbacks.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ============== SUBMIT VIEW ============== */}
                    {activeView === 'submit' && (
                        <Animated.View
                            style={[
                                styles.formContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            {/* Category Section */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="category" size={14} color={theme.BRAND_GRADIENT_END} /> Category
                                </Text>
                                {renderCategorySelector()}
                            </View>

                            {/* Rating Section */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="star" size={14} color={theme.BRAND_GRADIENT_END} /> Rate Your Experience *
                                </Text>
                                {renderStars()}
                                {renderRatingLabel()}
                            </View>

                            {/* Priority Section */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="flag" size={14} color={theme.BRAND_GRADIENT_END} /> Priority Level
                                </Text>
                                <View style={styles.priorityRow}>
                                    {(['low', 'medium', 'high'] as const).map((p) => (
                                        <TouchableOpacity
                                            key={p}
                                            style={[
                                                styles.priorityChip,
                                                priority === p && styles.priorityChipActive,
                                                priority === p && p === 'low' && { backgroundColor: '#10B981' },
                                                priority === p && p === 'medium' && { backgroundColor: '#F59E0B' },
                                                priority === p && p === 'high' && { backgroundColor: '#EF4444' },
                                            ]}
                                            onPress={() => setPriority(p)}
                                        >
                                            <Icon
                                                name={p === 'low' ? 'arrow-downward' : p === 'medium' ? 'remove' : 'priority-high'}
                                                size={14}
                                                color={priority === p ? '#fff' : '#6B7280'}
                                            />
                                            <Text
                                                style={[
                                                    styles.priorityText,
                                                    priority === p && { color: '#fff' },
                                                ]}
                                            >
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Title Input */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="title" size={14} color={theme.BRAND_GRADIENT_END} /> Title *
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Brief summary of your feedback"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={80}
                                />
                                <Text style={styles.charCount}>{title.length}/80</Text>
                            </View>

                            {/* Message Input */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="message" size={14} color={theme.BRAND_GRADIENT_END} /> Detailed Feedback *
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Share your detailed experience, suggestions, or concerns..."
                                    placeholderTextColor="#9CA3AF"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={6}
                                    maxLength={500}
                                />
                                <Text style={styles.charCount}>{message.length}/500</Text>
                            </View>

                            {/* Contact Input */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Icon name="contact-mail" size={14} color={theme.BRAND_GRADIENT_END} /> Contact (Optional)
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email or phone for follow-up"
                                    placeholderTextColor="#9CA3AF"
                                    value={contact}
                                    onChangeText={setContact}
                                    keyboardType="email-address"
                                />
                            </View>

                            {/* Anonymous Toggle */}
                            <TouchableOpacity
                                style={styles.anonymousRow}
                                onPress={() => setIsAnonymous(!isAnonymous)}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        isAnonymous && styles.checkboxActive,
                                    ]}
                                >
                                    {isAnonymous && <Icon name="check" size={14} color="#fff" />}
                                </View>
                                <Text style={styles.anonymousText}>
                                    Submit anonymously (hide my username)
                                </Text>
                            </TouchableOpacity>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    isSubmitting && styles.submitBtnDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[
                                        theme.BRAND_GRADIENT_START,
                                        theme.BRAND_GRADIENT_END,
                                    ]}
                                    style={styles.submitBtnGradient}
                                >
                                    {isSubmitting ? (
                                        <Text style={styles.submitBtnText}>Submitting...</Text>
                                    ) : (
                                        <>
                                            <Icon name="send" size={20} color="#fff" />
                                            <Text style={styles.submitBtnText}>
                                                Submit Feedback
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.privacyNote}>
                                <Icon name="lock" size={12} color="#6B7280" /> Your feedback is stored locally and kept confidential.
                            </Text>
                        </Animated.View>
                    )}

                    {/* ============== HISTORY VIEW ============== */}
                    {activeView === 'history' && (
                        <View style={styles.historyContainer}>
                            {myFeedbacks.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Icon name="inbox" size={64} color="#D1D5DB" />
                                    <Text style={styles.emptyTitle}>No Feedback Yet</Text>
                                    <Text style={styles.emptyDesc}>
                                        Your submitted feedback will appear here.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyBtn}
                                        onPress={() => setActiveView('submit')}
                                    >
                                        <Text style={styles.emptyBtnText}>
                                            Submit Your First Feedback
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.historyStats}>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statValue}>{myFeedbacks.length}</Text>
                                            <Text style={styles.statLabel}>Total</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statValue}>
                                                {myFeedbacks.filter(f => f.status === 'pending').length}
                                            </Text>
                                            <Text style={styles.statLabel}>Pending</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statValue}>
                                                {myFeedbacks.filter(f => f.status === 'resolved').length}
                                            </Text>
                                            <Text style={styles.statLabel}>Resolved</Text>
                                        </View>
                                    </View>

                                    {myFeedbacks.map(renderFeedbackCard)}
                                </>
                            )}
                        </View>
                    )}

                    {/* ============== FOOTER ============== */}
                    <View style={styles.footer}>
                        <Text style={styles.footerTitle}>Developed by Madhusudan Group</Text>
                        <Text style={styles.footerSub}>
                            Textile Innovation • Manufacturing Excellence
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },

    /* ===== HEADER ===== */
    headerContainer: {
        width: width,
        height: 340,
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

    headerTitle: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
    },

    titleDivider: {
        width: 60,
        height: 3,
        backgroundColor: '#fff',
        marginVertical: 10,
    },

    headerSubtitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },

    headerDescription: {
        color: '#EAF7FA',
        fontSize: 13,
        lineHeight: 20,
        maxWidth: '90%',
    },

    /* ===== USER BANNER ===== */
    userBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -30,
        borderRadius: 14,
        padding: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },

    userAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.BRAND_GRADIENT_END,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    userBannerLabel: {
        fontSize: 11,
        color: '#6B7280',
    },

    userBannerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        marginTop: 2,
    },

    idChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },

    idChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },

    /* ===== TOGGLE ===== */
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 25,
        padding: 4,
    },

    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 22,
        gap: 6,
    },

    toggleBtnActive: {
        backgroundColor: theme.BRAND_GRADIENT_END,
    },

    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.BRAND_GRADIENT_END,
    },

    toggleTextActive: {
        color: '#fff',
    },

    /* ===== FORM ===== */
    formContainer: {
        padding: 20,
    },

    formGroup: {
        marginBottom: 20,
    },

    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },

    /* ===== CATEGORY ===== */
    categoryScroll: {
        paddingVertical: 5,
        gap: 8,
    },

    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginRight: 8,
        gap: 6,
    },

    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },

    categoryTextActive: {
        color: '#fff',
    },

    /* ===== STARS ===== */
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
    },

    starBtn: {
        padding: 4,
    },

    ratingLabel: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
        marginTop: 5,
    },

    /* ===== PRIORITY ===== */
    priorityRow: {
        flexDirection: 'row',
        gap: 8,
    },

    priorityChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 5,
    },

    priorityChipActive: {
        borderColor: 'transparent',
    },

    priorityText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },

    /* ===== INPUTS ===== */
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
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
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 5,
    },

    /* ===== ANONYMOUS ===== */
    anonymousRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },

    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },

    checkboxActive: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderColor: theme.BRAND_GRADIENT_END,
    },

    anonymousText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },

    /* ===== SUBMIT ===== */
    submitBtn: {
        borderRadius: 14,
        overflow: 'hidden',
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
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
    },

    /* ===== HISTORY ===== */
    historyContainer: {
        padding: 20,
    },

    historyStats: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        gap: 10,
    },

    statItem: {
        flex: 1,
        alignItems: 'center',
    },

    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.BRAND_GRADIENT_END,
    },

    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },

    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },

    historyHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },

    categoryIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    historyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },

    historyDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 3,
    },

    deleteBtn: {
        padding: 4,
    },

    historyStars: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 2,
    },

    historyMessage: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 12,
    },

    historyFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
    },

    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    historyId: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '600',
    },

    /* ===== EMPTY ===== */
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginTop: 16,
    },

    emptyDesc: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },

    emptyBtn: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 22,
    },

    emptyBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    /* ===== FOOTER ===== */
    footer: {
        padding: 25,
        alignItems: 'center',
    },

    footerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },

    footerSub: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 5,
        textAlign: 'center',
    },
});
