// ─────────────────────────────────────────────────────────────
// FILE: src/components/layout/ScreenHeader.tsx
// Shared header — brand eyebrow + title left, Sign out right.
// Usage: <ScreenHeader brand="MADHUSUDHAN FABRICS" title="Dashboard" />
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { T } from '../../theme';
import { useAppStore } from '../../stores/AppStore';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface Props {
    brand: string;
    title: string;
    right?: React.ReactNode;
}

export function ScreenHeader({ brand, title, right }: Props) {
    const setUser = useAppStore(s => s.setUser);

    const handleSignOut = () =>
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => setUser(null) },
        ]);

    return (
        <View style={st.header}>
            <View style={st.left}>
                <Text style={st.brand} numberOfLines={1}>{brand}</Text>
                <Text style={st.title} numberOfLines={1}>{title}</Text>
            </View>
            <View style={st.right}>
                {right}
                <TouchableOpacity onPress={handleSignOut} style={st.signOut} activeOpacity={0.75}>
                    <Text style={st.signOutTxt}>Sign out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    header:     { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    left:       { flex: 1, paddingRight: 12 },
    brand:      { fontSize: 9, color: '#5A7A94', fontWeight: '700', letterSpacing: 1.4 },
    title:      { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    right:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    signOut:    { borderWidth: 1.5, borderColor: '#2A3F55', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    signOutTxt: { fontSize: 12, fontWeight: '700', color: '#A9C0D4' },
});
