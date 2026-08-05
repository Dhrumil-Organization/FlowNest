import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { T } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface Props {
    label: string;
    onPress: () => void;
    variant?: Variant;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border: string }> = {
    primary: { bg: T.copper, text: '#fff', border: T.copper },
    secondary: { bg: T.surface, text: T.ink, border: T.border },
    ghost: { bg: 'transparent', text: T.muted, border: T.border },
    danger: { bg: '#FAE7E3', text: T.red, border: '#E6B8AE' },
    success: { bg: '#E4F1E8', text: T.green, border: '#B7D8C2' },
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, fullWidth, style }: Props) {
    const v = VARIANTS[variant];
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.btn,
                { backgroundColor: v.bg, borderColor: v.border },
                fullWidth && styles.full,
                (disabled || loading) && styles.disabled,
                style,
            ]}
        >
            {loading
                ? <ActivityIndicator color={v.text} />
                : <Text style={[styles.label, { color: v.text }]}>{label}</Text>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    full: { width: '100%' },
    disabled: { opacity: 0.45 },
    label: { fontSize: 14, fontWeight: '700' },
});
