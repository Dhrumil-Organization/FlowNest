// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/ThemeControls.tsx
//
// The two controls that change the theme:
//   ThemeModePicker    Light / Dark / System cards (Settings screen)
//   ThemeToggleButton  one-tap sun / moon button (header, sidebar, login)
// Both only call setThemeMode() — the choice is saved on this device.
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { setThemeMode, toggleTheme, useTheme } from './themeMode';
import { ThemeMode } from './themeState';

const OPTIONS: { mode: ThemeMode; label: string; hint: string; icon: string }[] = [
  { mode: 'light', label: 'Light', hint: 'Bright background', icon: 'wb-sunny' },
  { mode: 'dark', label: 'Dark', hint: 'Easy on the eyes at night', icon: 'brightness-2' },
  { mode: 'system', label: 'System', hint: 'Follow this device', icon: 'brightness-auto' },
];

export function ThemeModePicker({ compact = false }: { compact?: boolean }) {
  const { mode, scheme } = useTheme();
  return (
    <View style={[st.row, compact && { gap: 8 }]}>
      {OPTIONS.map((o) => {
        const on = o.mode === mode;
        return (
          <TouchableOpacity
            key={o.mode}
            style={[st.option, on && st.optionOn, compact && st.optionCompact]}
            onPress={() => void setThemeMode(o.mode)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={`${o.label} theme`}
          >
            <View style={[st.optionIcon, on && { backgroundColor: T.copper }]}>
              <Icon name={o.icon as any} size={compact ? 16 : 20} color={on ? '#FFFFFF' : T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.optionLabel} numberOfLines={1}>{o.label}</Text>
              {!compact ? (
                <Text style={st.optionHint} numberOfLines={2}>
                  {o.mode === 'system' ? `${o.hint} (now ${scheme})` : o.hint}
                </Text>
              ) : null}
            </View>
            {on ? <Icon name="check-circle" size={18} color={T.copper} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * One-tap Light <-> Dark.
 *   onDark : placed on the navy header / hero (white icon)
 *   plain  : placed on a normal surface
 */
export function ThemeToggleButton({
  onDark = false,
  size = 36,
  label = false,
}: {
  onDark?: boolean;
  size?: number;
  label?: boolean;
}) {
  const { isDark } = useTheme();
  const text = isDark ? 'Light theme' : 'Dark theme';
  return (
    <TouchableOpacity
      onPress={() => void toggleTheme()}
      style={[
        st.toggle,
        { height: size, minWidth: size, borderRadius: size * 0.3 },
        onDark ? st.toggleOnDark : st.togglePlain,
        label && { paddingHorizontal: 12 },
      ]}
      activeOpacity={0.8}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <Icon name={isDark ? 'wb-sunny' : 'brightness-2'} size={Math.round(size * 0.5)} color={onDark ? '#FFFFFF' : T.copper} />
      {label ? <Text style={[st.toggleText, onDark && { color: '#FFFFFF' }]}>{text}</Text> : null}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optionCompact: { flexBasis: 92, padding: 8, gap: 8 },
  optionOn: { borderColor: T.copper, backgroundColor: `${T.copper}12` },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}16`,
  },
  optionLabel: { fontSize: 14, fontWeight: '800', color: T.ink },
  optionHint: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },

  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1 },
  toggleOnDark: { borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' },
  togglePlain: { borderColor: T.border, backgroundColor: T.surface },
  toggleText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
});
