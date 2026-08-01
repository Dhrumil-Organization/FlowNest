import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../../theme';

interface Props {
    title: string;
    right?: React.ReactNode;
}

export function SectionHeader({ title, right }: Props) {
    return (
        <View style={styles.row}>
            <Text style={styles.title}>{title}</Text>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: T.alt, borderBottomWidth: 1, borderBottomColor: T.border },
    title: { fontSize: 9, fontWeight: '800', color: '#8A8580', letterSpacing: 1, textTransform: 'uppercase' },
});
