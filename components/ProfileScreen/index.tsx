// screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Image,
    StatusBar,
    Animated,
    Alert,
    Switch,
    Modal,
    TextInput,
    RefreshControl,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import theme from '@/components/theme';
import {
    getUserProfile,
    updateUserProfile,
    updateProfileImage,
    captureProfileImage,
    pickProfileImage,
    logoutSession,
    UserProfile,
} from '@/common/utils/profileStorage';

const { width, height } = Dimensions.get('window');

// Background image (replace later)
const HEADER_IMAGE = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200';

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);

    // Edit form state
    const [editField, setEditField] = useState<keyof UserProfile | null>(null);
    const [editValue, setEditValue] = useState('');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const avatarScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        loadProfile();
        animateEntrance();
    }, []);

    const animateEntrance = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(avatarScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const loadProfile = async () => {
        setRefreshing(true);
        const data = await getUserProfile();
        setProfile(data);
        setRefreshing(false);
    };

    const handleImagePress = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Gallery', 'Remove Photo'],
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) handleCameraCapture();
                    else if (buttonIndex === 2) handleGalleryPick();
                    else if (buttonIndex === 3) handleRemoveImage();
                }
            );
        } else {
            setImageModalVisible(true);
        }
    };

    const handleCameraCapture = async () => {
        setImageModalVisible(false);
        const uri = await captureProfileImage();
        if (uri) {
            const success = await updateProfileImage(uri);
            if (success) {
                await loadProfile();
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('✅ Success', 'Profile photo updated!');
            }
        }
    };

    const handleGalleryPick = async () => {
        setImageModalVisible(false);
        const uri = await pickProfileImage();
        if (uri) {
            const success = await updateProfileImage(uri);
            if (success) {
                await loadProfile();
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('✅ Success', 'Profile photo updated!');
            }
        }
    };

    const handleRemoveImage = async () => {
        setImageModalVisible(false);
        Alert.alert(
            'Remove Photo?',
            'Are you sure you want to remove your profile photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await updateProfileImage('');
                        if (success) {
                            await loadProfile();
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = (field: keyof UserProfile, currentValue: string) => {
        setEditField(field);
        setEditValue(currentValue);
        setEditModalVisible(true);
    };

    const saveEdit = async () => {
        if (!editField || !profile) return;
        const updates: any = { [editField]: editValue.trim() };
        if (editField === 'firstName' || editField === 'lastName') {
            updates.fullName = `${editField === 'firstName' ? editValue.trim() : profile.firstName} ${editField === 'lastName' ? editValue.trim() : profile.lastName}`.trim();
        }
        await updateUserProfile(updates);
        await loadProfile();
        setEditModalVisible(false);
        Alert.alert('✅ Updated', 'Profile updated successfully!');
    };

    const togglePreference = async (key: 'notifications' | 'darkMode' | 'biometric') => {
        if (!profile) return;
        await updateUserProfile({ [key]: !profile[key] });
        await loadProfile();
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout?',
            'Are you sure you want to logout? Your profile data will be preserved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logoutSession();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    const formatDate = (isoString: string): string => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (isoString: string): string => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const getInitials = (): string => {
        if (!profile) return 'U';
        const name = profile.fullName || profile.firstName || profile.username || 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    if (!profile) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Icon name="account-circle" size={64} color="#D1D5DB" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadProfile}
                        tintColor={theme.BRAND_GRADIENT_END}
                    />
                }
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                {/* ============== HEADER ============== */}
                <View style={styles.headerContainer}>
                    <Image source={{ uri: HEADER_IMAGE }} style={styles.headerImage} />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                        style={styles.headerOverlay}
                    >
                        <View style={styles.topNav}>
                            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                                <Icon name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.brandText}>madhusudan</Text>
                            <TouchableOpacity style={styles.touchBtn}>
                                <Text style={styles.touchBtnText}>Edit</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileHeaderContent}>
                            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
                                <TouchableOpacity onPress={handleImagePress} activeOpacity={0.85}>
                                    {profile.profileImage ? (
                                        <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
                                    ) : (
                                        <LinearGradient
                                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                                            style={styles.avatarPlaceholder}
                                        >
                                            <Text style={styles.avatarInitials}>{getInitials()}</Text>
                                        </LinearGradient>
                                    )}
                                    <View style={styles.cameraBtn}>
                                        <Icon name="photo-camera" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            <Text style={styles.userName}>{profile.fullName || profile.firstName || profile.username}</Text>
                            <View style={styles.roleChip}>
                                <Icon name="verified-user" size={14} color="#fff" />
                                <Text style={styles.roleText}>{profile.designation} • {profile.department}</Text>
                            </View>
                            <Text style={styles.userId}>ID: {profile.id}</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ============== STATS CARDS ============== */}
                <Animated.View
                    style={[
                        styles.statsContainer,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <View style={styles.statBox}>
                        <Icon name="login" size={20} color={theme.BRAND_GRADIENT_END} />
                        <Text style={styles.statValue}>{profile.totalLogins}</Text>
                        <Text style={styles.statLabel}>Logins</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Icon name="schedule" size={20} color={theme.BRAND_GRADIENT_END} />
                        <Text style={styles.statValue}>
                            {profile.memberSince ? new Date(profile.memberSince).toLocaleDateString('en-IN', { month: 'short' }) : 'N/A'}
                        </Text>
                        <Text style={styles.statLabel}>Member Since</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Icon name="circle" size={20} color={profile.lastLoginAt ? '#10B981' : '#9CA3AF'} />
                        <Text style={styles.statValue}>
                            {profile.lastLoginAt ? 'Active' : 'Inactive'}
                        </Text>
                        <Text style={styles.statLabel}>Status</Text>
                    </View>
                </Animated.View>

                {/* ============== PERSONAL INFO ============== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.infoCard}>
                        <InfoRow icon="person" label="First Name" value={profile.firstName} editable onEdit={() => handleEdit('firstName', profile.firstName)} />
                        <InfoRow icon="person-outline" label="Last Name" value={profile.lastName} editable onEdit={() => handleEdit('lastName', profile.lastName)} />
                        <InfoRow icon="alternate-email" label="Username" value={profile.username} />
                        <InfoRow icon="email" label="Email" value={profile.email} editable onEdit={() => handleEdit('email', profile.email)} />
                        <InfoRow icon="phone" label="Phone" value={profile.phone} editable onEdit={() => handleEdit('phone', profile.phone)} />
                        <InfoRow icon="badge" label="Employee ID" value={profile.employeeId || 'N/A'} />
                    </View>
                </View>

                {/* ============== WORK INFO ============== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Work Details</Text>
                    <View style={styles.infoCard}>
                        <InfoRow icon="business" label="Company" value={profile.company} />
                        <InfoRow icon="apartment" label="Department" value={profile.department} editable onEdit={() => handleEdit('department', profile.department)} />
                        <InfoRow icon="work" label="Designation" value={profile.designation} editable onEdit={() => handleEdit('designation', profile.designation)} />
                        <InfoRow icon="place" label="Location" value={profile.location} editable onEdit={() => handleEdit('location', profile.location)} />
                        <InfoRow icon="store" label="Branch" value={profile.branch} />
                        <InfoRow icon="assignment-ind" label="Role" value={profile.role} />
                    </View>
                </View>

                {/* ============== SESSION INFO ============== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Session & Activity</Text>
                    <View style={styles.infoCard}>
                        <InfoRow icon="login" label="Last Login" value={formatDateTime(profile.lastLoginAt)} />
                        <InfoRow icon="fingerprint" label="Login Count" value={`${profile.loginCount} sessions`} />
                        <InfoRow icon="device-mobile" label="Login From" value={profile.loginFrom === 'app' ? '📱 Mobile App' : '🌐 Web Portal'} />
                        <InfoRow icon="language" label="Language" value={profile.language} />
                        <InfoRow icon="calendar-today" label="Active Year" value={profile.yearNo || 'N/A'} />
                        <InfoRow icon="sync" label="Master Sync" value={profile.isMasterSync ? '✅ Enabled' : '❌ Disabled'} />
                    </View>
                </View>

                {/* ============== PREFERENCES ============== */}
                {/* <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.infoCard}>
                        <PreferenceRow icon="notifications" label="Push Notifications" value={profile.notifications} onToggle={() => togglePreference('notifications')} />
                        <PreferenceRow icon="dark-mode" label="Dark Mode" value={profile.darkMode} onToggle={() => togglePreference('darkMode')} />
                        <PreferenceRow icon="fingerprint" label="Biometric Login" value={profile.biometric} onToggle={() => togglePreference('biometric')} />
                    </View>
                </View> */}

                {/* ============== QUICK ACTIONS ============== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <ActionButton icon="rate-review" label="Send Feedback" onPress={() => router.push('/feedback')} />
                        {/* <ActionButton icon="help" label="Help Center" onPress={() => router.push('/help')} /> */}
                        {/* <ActionButton icon="lock" label="Privacy" onPress={() => router.push('/privacy')} /> */}
                        <ActionButton icon="share" label="Share App" onPress={() => Alert.alert('Share', 'Share functionality coming soon!')} />
                    </View>
                </View>

                {/* ============== LOGOUT BUTTON ============== */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Icon name="logout" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                {/* ============== FOOTER ============== */}
                <View style={styles.footer}>
                    {/* <Text style={styles.footerText}>App Version 1.0.0</Text> */}
                    <Text style={styles.footerSub}>Developed by Madhusudan Group</Text>
                </View>
            </ScrollView>

            {/* ============== IMAGE PICKER MODAL (Android) ============== */}
            <Modal
                visible={imageModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setImageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setImageModalVisible(false)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.actionSheetHandle} />
                        <Text style={styles.actionSheetTitle}>Profile Photo</Text>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={handleCameraCapture}>
                            <Icon name="photo-camera" size={24} color={theme.BRAND_GRADIENT_END} />
                            <Text style={styles.actionSheetText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={handleGalleryPick}>
                            <Icon name="photo-library" size={24} color={theme.BRAND_GRADIENT_END} />
                            <Text style={styles.actionSheetText}>Choose from Gallery</Text>
                        </TouchableOpacity>

                        {profile.profileImage && (
                            <TouchableOpacity style={styles.actionSheetBtn} onPress={handleRemoveImage}>
                                <Icon name="delete" size={24} color="#EF4444" />
                                <Text style={[styles.actionSheetText, { color: '#EF4444' }]}>Remove Photo</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.actionSheetBtn, styles.cancelBtn]}
                            onPress={() => setImageModalVisible(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ============== EDIT MODAL ============== */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.editTitle}>Edit {editField}</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholder={`Enter ${editField}`}
                            placeholderTextColor="#9CA3AF"
                            autoFocus
                            multiline={editField === 'location' || editField === 'department'}
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.editBtn, styles.cancelEditBtn]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelEditText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editBtn, styles.saveEditBtn]}
                                onPress={saveEdit}
                            >
                                <Text style={styles.saveEditText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============== INFO ROW COMPONENT ==============
const InfoRow = ({ icon, label, value, editable = false, onEdit }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
            <Icon name={icon} size={18} color={theme.BRAND_GRADIENT_END} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{value || 'Not set'}</Text>
        </View>
        {editable && (
            <TouchableOpacity onPress={onEdit} style={styles.editIconBtn}>
                <Icon name="edit" size={16} color={theme.BRAND_GRADIENT_END} />
            </TouchableOpacity>
        )}
    </View>
);

// ============== PREFERENCE ROW COMPONENT ==============
const PreferenceRow = ({ icon, label, value, onToggle }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
            <Icon name={icon} size={18} color={theme.BRAND_GRADIENT_END} />
        </View>
        <Text style={[styles.infoLabel, { flex: 1, marginTop: 0 }]}>{label}</Text>
        <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: '#D1D5DB', true: theme.BRAND_GRADIENT_END + '80' }}
            thumbColor={value ? theme.BRAND_GRADIENT_END : '#f4f3f4'}
        />
    </View>
);

// ============== ACTION BUTTON COMPONENT ==============
const ActionButton = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.actionIcon}>
            <Icon name={icon} size={22} color={theme.BRAND_GRADIENT_END} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

// ============== STYLES ==============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },

    /* ===== HEADER ===== */
    headerContainer: {
        width: width,
        height: 420,
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
    profileHeaderContent: {
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: 15,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 38,
        fontWeight: '800',
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.BRAND_GRADIENT_END,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 6,
    },
    roleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    userId: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '500',
    },

    /* ===== STATS ===== */
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: -30,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },

    /* ===== SECTION ===== */
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },

    /* ===== INFO ROW ===== */
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${theme.BRAND_GRADIENT_END}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: '#000',
        fontWeight: '600',
    },
    editIconBtn: {
        padding: 6,
    },

    /* ===== ACTIONS GRID ===== */
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionBtn: {
        width: (width - 52) / 2,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${theme.BRAND_GRADIENT_END}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },

    /* ===== LOGOUT ===== */
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 10,
        paddingVertical: 14,
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FECACA',
        gap: 8,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },

    /* ===== FOOTER ===== */
    footer: {
        padding: 25,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    footerSub: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },

    /* ===== IMAGE PICKER MODAL ===== */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 30,
    },
    actionSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 15,
    },
    actionSheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 15,
        textAlign: 'center',
    },
    actionSheetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 15,
    },
    actionSheetText: {
        fontSize: 15,
        color: '#000',
        fontWeight: '600',
    },
    cancelBtn: {
        marginTop: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        justifyContent: 'center',
    },
    cancelText: {
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
        flex: 1,
    },

    /* ===== EDIT MODAL ===== */
    editModal: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 16,
        padding: 20,
        marginTop: 'auto',
        marginBottom: 'auto',
    },
    editTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 15,
        textTransform: 'capitalize',
    },
    editInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#000',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 50,
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },
    editBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelEditBtn: {
        backgroundColor: '#F3F4F6',
    },
    cancelEditText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '700',
    },
    saveEditBtn: {
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    saveEditText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
