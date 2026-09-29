import AppAlert from '@/common/utils/appAlert';
// SubScreenHeader — used by sub-screens (push screens) that need
// a back button + sign out. Renders entirely in React, zero native
// header involvement, so iOS can't add the capsule wrapper.
//
// COMPACT + RESPONSIVE: back chevron + label (label hidden on very narrow
// phones), single-line centred title, sign-out as text on wider screens and
// an icon on phones. Top inset is applied only when no parent already did
// (see TopInsetHandled) — fixes the extra navy gap on report drill-downs.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { T } from '../../theme';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { TopInsetHandled } from '../../core/layout/topInset';

interface Props {
    backLabel: string;
    title: string;
}

export function SubScreenHeader({ backLabel, title }: Props) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInsetHandled = useContext(TopInsetHandled);
    const { width } = useWindowDimensions();
    const isNarrow = width < 360;
    const isWide = width >= 768;
    const isDesktop = Platform.OS === 'web' && width >= 1180;
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

    const sideWidth = isDesktop ? 120 : isWide ? 100 : isNarrow ? 44 : 84;

    return (
        <View style={[st.container, { paddingTop: topInsetHandled ? 0 : insets.top }]}>
            <View style={[st.row, isWide && st.rowWide, isDesktop && st.rowDesktop]}>
                {/* Back */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[st.back, { minWidth: sideWidth }]}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={`Back to ${backLabel}`}
                    hitSlop={8}
                >
                    <Icon name="arrow-back-ios-new" size={17} color="#fff" />
                    {!isNarrow && <Text style={st.backLabel} numberOfLines={1}>{backLabel}</Text>}
                </TouchableOpacity>

                {/* Title */}
                <Text style={[st.title, isWide && st.titleWide]} numberOfLines={1}>{title}</Text>

                {/* Sign out */}
                <TouchableOpacity
                    onPress={signOut}
                    style={[st.signOut, { minWidth: sideWidth }]}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    hitSlop={8}
                >
                    {isWide
                        ? <Text style={st.signOutTxt}>Sign out</Text>
                        : <Icon name="logout" size={18} color="#A9C0D4" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    container: { backgroundColor: T.nav },
    row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, minHeight: 48 },
    rowWide:   { paddingHorizontal: 18 },
    rowDesktop:{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 },
    back:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backLabel: { fontSize: 13, fontWeight: '500', color: '#fff', flexShrink: 1 },
    title:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#fff', paddingHorizontal: 6 },
    titleWide: { fontSize: 17 },
    signOut:   { alignItems: 'flex-end', justifyContent: 'center' },
    signOutTxt:{ fontSize: 12, fontWeight: '600', color: '#A9C0D4' },
});
