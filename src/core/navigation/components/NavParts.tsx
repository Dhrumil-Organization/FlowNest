// Shared bits for the menu components. Colours come from the theme tokens (T),
// so the automatic dark theme works without any extra code here.
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '@/src/theme';

export const NAV_DARK = {
  bg: T.nav,
  text: '#E8EDF3',
  muted: 'rgba(232,237,243,0.62)',
  hover: 'rgba(255,255,255,0.06)',
  active: 'rgba(200,117,51,0.20)',
  line: 'rgba(255,255,255,0.10)',
} as const;

export function NavIcon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  return <Icon name={name as any} size={size} color={color} />;
}

export function CountChip({ count, color, bg }: { count: number; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 11, fontWeight: '700' },
});
