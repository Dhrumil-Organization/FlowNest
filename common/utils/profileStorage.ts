import AppAlert from '@/common/utils/appAlert';
// utils/profileStorage.ts
import AsyncStorage from '@/common/utils/compatibleStorage';
import * as ImagePicker from 'expo-image-picker';
import { getLoginSource } from '@/src/platform/runtime';

export interface UserProfile {
    // Basic Info
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    profileImage: string | null;

    // Role & Access
    role: string;
    role1: any;
    userOf: string;
    menuApps: string;
    loginFrom: 'web' | 'app';
    isNewUser: boolean;

    // Session Info
    yearNo: string;
    accessToken: string;
    lastLoginAt: string;
    loginCount: number;

    // Business Info
    company: string;
    department: string;
    designation: string;
    employeeId: string;
    location: string;
    branch: string;

    // Preferences
    selectedProperty: string;
    language: string;
    notifications: boolean;
    darkMode: boolean;
    biometric: boolean;

    // Stats (Dynamic)
    totalLogins: number;
    lastActiveAt: string;
    memberSince: string;

    // Sync Info
    masterSyncData: any[];
    isMasterSync: boolean;
}

const PROFILE_KEY = '@flow_nest_user_profile';
const SESSION_KEY = 'flow_nest_session';

// Get current profile from login data
export const buildProfileFromLogin = async (loginData: any): Promise<UserProfile> => {
    try {
        const existing = await getUserProfile();
        const previousLoginCount = existing?.totalLogins || 0;

        const profile: UserProfile = {
            id: loginData.user?.id || existing?.id || generateUserId(),
            username: loginData.user?.name || existing?.username || '',
            firstName: loginData.user?.first_name || existing?.firstName || '',
            lastName: loginData.user?.last_name || existing?.lastName || '',
            fullName: `${loginData.user?.first_name || ''} ${loginData.user?.last_name || ''}`.trim() || existing?.fullName || '',
            email: loginData.user?.email || existing?.email || '',
            phone: loginData.user?.phone || loginData.user?.mobile || existing?.phone || '',
            profileImage: existing?.profileImage || null, // Preserve existing image

            role: loginData.user?.role || existing?.role || 'User',
            role1: loginData.role1 || existing?.role1 || null,
            userOf: loginData.userof || existing?.userOf || '',
            menuApps: loginData.usermenu || existing?.menuApps || '',
            loginFrom: getLoginSource(),
            isNewUser: false,

            yearNo: loginData.year?.YearNo || existing?.yearNo || '',
            accessToken: loginData.access_token || existing?.accessToken || '',
            lastLoginAt: new Date().toISOString(),
            loginCount: previousLoginCount + 1,

            company: 'Madhusudan Group',
            department: loginData.user?.department || existing?.department || 'Textile',
            designation: loginData.user?.designation || existing?.designation || 'Staff',
            employeeId: loginData.user?.employee_id || existing?.employeeId || '',
            location: loginData.user?.location || existing?.location || 'Surat, Gujarat',
            branch: loginData.user?.branch || existing?.branch || 'Main Branch',

            selectedProperty: existing?.selectedProperty || '',
            language: existing?.language || 'English',
            notifications: existing?.notifications ?? true,
            darkMode: existing?.darkMode ?? false,
            biometric: existing?.biometric ?? false,

            totalLogins: previousLoginCount + 1,
            lastActiveAt: new Date().toISOString(),
            memberSince: existing?.memberSince || new Date().toISOString(),

            masterSyncData: loginData.mastersyncprptypes || existing?.masterSyncData || [],
            isMasterSync: loginData.ismastersync || false,
        };

        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
            username: profile.username,
            token: profile.accessToken,
            loggedInAt: profile.lastLoginAt,
        }));
        // Remove the old AsyncStorage session key used before SecureStore.
        // It contains '@', so it must never be routed to expo-secure-store.
        await AsyncStorage.removeItem('@flow_nest_session');
        return profile;
    } catch (error) {
        console.error('Error building profile:', error);
        throw error;
    }
};

// Get profile
export const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const data = await AsyncStorage.getItem(PROFILE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        return null;
    }
};

// Update profile
export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
        const current = await getUserProfile();
        if (!current) return null;

        const updated = { ...current, ...updates };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('Error updating profile:', error);
        return null;
    }
};

// Update profile image only
export const updateProfileImage = async (imageUri: string): Promise<boolean> => {
    try {
        const current = await getUserProfile();
        if (!current) return false;

        const updated = { ...current, profileImage: imageUri };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        return true;
    } catch (error) {
        console.error('Error updating profile image:', error);
        return false;
    }
};

// Camera Capture
export const captureProfileImage = async (): Promise<string | null> => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            AppAlert.alert('Camera permission is required to capture profile photo');
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: false,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            return result.assets[0].uri;
        }
        return null;
    } catch (error) {
        console.error('Camera error:', error);
        return null;
    }
};

// Gallery Upload
export const pickProfileImage = async (): Promise<string | null> => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            AppAlert.alert('Gallery permission is required to upload photo');
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: false,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            return result.assets[0].uri;
        }
        return null;
    } catch (error) {
        console.error('Gallery error:', error);
        return null;
    }
};

// Logout - clear session but keep profile
export const logoutSession = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(SESSION_KEY);
        await AsyncStorage.removeItem('access_token');

        await AsyncStorage.removeItem('user_details');
        await AsyncStorage.removeItem('user_menu_apps');
        await AsyncStorage.removeItem('get_property');
        await AsyncStorage.removeItem('current_year');
        await AsyncStorage.removeItem('mastersyncData');
        await AsyncStorage.removeItem('login_user_name');
        await AsyncStorage.removeItem('login_user_passwd');
        await AsyncStorage.removeItem('receivables_sync_date');
        await AsyncStorage.removeItem('receivables_prpgroup');
        await AsyncStorage.removeItem('live_logs_unlocked');
        await AsyncStorage.removeItem('user_prptype');
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

export const deleteAcoountSession = async (): Promise<void> => {
    try {
        await AsyncStorage.clear();
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

// Clear entire profile
export const clearUserProfile = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(PROFILE_KEY);
        await AsyncStorage.removeItem(SESSION_KEY);
        await AsyncStorage.removeItem('access_token');
    } catch (error) {
        console.error('Error clearing profile:', error);
    }
};

// Generate user ID
const generateUserId = (): string => {
    return `USR-${Date.now().toString(36).toUpperCase()}`;
};

// Check if user is logged in
export const isUserLoggedIn = async (): Promise<boolean> => {
    try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        return !!session;
    } catch (error) {
        return false;
    }
};
