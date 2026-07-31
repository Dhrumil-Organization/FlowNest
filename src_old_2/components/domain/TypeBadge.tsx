import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../../theme';
import type { DyeType } from '../../types';

const CFG: Record<DyeType, { label: string; color: string; tint: string }> = {
    YD: { label: 'YD', color: T.yd, tint: '#E6EFF6' },
    PD: { label: 'PD', color: T.pd, tint: '#F8EDE6' },
};

export function TypeBadge({ type }: { type: DyeType }) {
    const c = CFG[type] ?? CFG.YD;
    return (
        <View style={[styles.badge, { backgroundColor: c.tint }]}>
            <Text style={[styles.text, { color: c.color }]}>{c.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
