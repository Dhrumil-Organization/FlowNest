import AppAlert from '@/common/utils/appAlert';
// SubScreenHeader — used by sub-screens (push screens) that need
// a back button + sign out. Renders entirely in React, zero native
// header involvement, so iOS can't add the capsule wrapper.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { T } from '../../theme';
import { useAppSessionStore } from '../../stores/AppSessionStore';

interface Props {
    backLabel: string;
    title: string;
}

export function SubScreenHeader({ backLabel, title }: Props) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // FIX: this used to call useAppStore().setUser(null), a *different*
    // store from the one every other sign-out button in the app uses
    // (AppHeader, CommonLogoutButton both use AppSessionStore.logout).
    // That meant signing out from a sub-screen could leave the real
    // session/token in AppSessionStore intact while only clearing an
    // unrelated store's user field. Now consistent with the rest of the app.
    const logout = useAppSessionStore(s => s.logout);

    const signOut = () =>
        AppAlert.alert('Sign out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
        ]);

    return (
        <View style={[st.container, { paddingTop: insets.top }]}>
            <View style={st.row}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={st.back} activeOpacity={0.6}>
                    <Text style={st.backArrow}>‹</Text>
                    <Text style={st.backLabel}>{backLabel}</Text>
                </TouchableOpacity>

                {/* Title */}
                <Text style={st.title}>{title}</Text>

                {/* Sign out */}
                <TouchableOpacity onPress={signOut} style={st.signOut} activeOpacity={0.6}>
                    <Text style={st.signOutTxt}>Sign out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    container: { backgroundColor: T.nav },
    row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 },
    back:      { flexDirection: 'row', alignItems: 'center', minWidth: 80 },
    backArrow: { fontSize: 30, color: '#fff', lineHeight: 32, fontWeight: '200', marginRight: 2, marginTop: -2 },
    backLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
    title:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#fff' },
    signOut:   { minWidth: 80, alignItems: 'flex-end' },
    signOutTxt:{ fontSize: 12, fontWeight: '700', color: '#A9C0D4' },
});
