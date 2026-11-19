// FILE: src/features/repackingIssue/components/ui.tsx
// Small form building blocks styled like FlowNest (Sales Order Entry look).
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { S as SH } from '@/src/theme';
import { C, LABEL, R, SP } from '../theme';

type PressState = { pressed: boolean; hovered?: boolean };

export function Card({ title, step, right, children, style }: {
  title?: string; step?: number; right?: React.ReactNode; children: React.ReactNode; style?: ViewStyle;
}) {
  return (
    <View style={[st.card, style]}>
      {title ? (
        <View style={st.cardHead}>
          <View style={st.cardTitleRow}>
            {step ? <View style={st.step}><Text style={st.stepTxt}>{step}</Text></View> : null}
            <Text style={st.cardTitle} numberOfLines={1}>{title}</Text>
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Field({ label, required, error, hint, children, style }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; style?: ViewStyle;
}) {
  return (
    <View style={[st.field, style]}>
      <Text style={LABEL}>
        {label}
        {required ? <Text style={{ color: C.cta }}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={st.err}>{error}</Text> : hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

export const Input = React.forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(({ invalid, style, ...p }, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor={C.muted}
    {...p}
    style={[st.input, invalid && st.inputErr, p.editable === false && st.readonly, style]}
  />
));

export function ReadOnly({ value, placeholder, emphasis }: { value: string; placeholder?: string; emphasis?: boolean }) {
  return (
    <View style={[st.input, st.readonly, { justifyContent: 'center' }]}>
      <Text style={[st.num, emphasis && { fontWeight: '800' }, !value && { color: C.muted }]} numberOfLines={1}>
        {value || placeholder || '—'}
      </Text>
    </View>
  );
}

/** Looks like an input, opens a SearchablePickerModal. */
export function SelectBox({ value, code, placeholder, icon, onPress, invalid, disabled }: {
  value?: string; code?: string; placeholder: string; icon?: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void; invalid?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed, hovered }: PressState) => [
        st.input, st.select, invalid && st.inputErr, disabled && st.readonly, hovered && !disabled && { borderColor: C.cta }, pressed && { opacity: 0.75 }
      ]}>
      {icon ? <Icon name={icon} size={18} color={C.cta} style={{ marginRight: SP.sm }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.value, !value && { color: C.muted }]} numberOfLines={1}>{value || placeholder}</Text>
        {code ? <Text style={st.code}>Code {code}</Text> : null}
      </View>
      {!disabled ? <Icon name="keyboard-arrow-down" size={20} color={C.muted} /> : null}
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange, invalid, disabled }: {
  options: { value: V; label: string; hint?: string }[]; value: V | null; onChange: (v: V) => void; invalid?: boolean; disabled?: boolean;
}) {
  return (
    <View style={[st.seg, invalid && { borderColor: C.danger }]} accessibilityRole="radiogroup">
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[st.segBtn, on && st.segOn, disabled && !on && { opacity: 0.5 }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled }}>
            <Text style={[st.segTxt, on && { color: C.onNav }]}>{o.label}</Text>
            {o.hint ? <Text style={[st.segHint, on && { color: C.onNavSub }]}>{o.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Btn({ title, icon, onPress, kind = 'primary', loading, disabled, style, small }: {
  title: string; icon?: React.ComponentProps<typeof Icon>['name']; onPress: () => void;
  kind?: 'primary' | 'dark' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; style?: ViewStyle; small?: boolean;
}) {
  // FlowNest: orange = main action, navy = secondary action, outline = cancel
  const bg = { primary: C.cta, dark: C.nav, ghost: C.card, danger: C.danger }[kind];
  const fg = kind === 'ghost' ? C.ink : C.onNav;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed, hovered }: PressState) => [
        st.btn, small && st.btnSm,
        { backgroundColor: bg, borderColor: kind === 'ghost' ? C.line : bg },
        hovered && !disabled && { opacity: 0.9 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
        style
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={st.btnRow}>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={[st.btnTxt, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={st.stat}>
      <Text style={st.statLbl} numberOfLines={1}>{label}</Text>
      <Text style={[st.statVal, strong && { color: C.cta }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function Row({ children, gap = SP.md }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', gap }}>{children}</View>;
}

export function Banner({ text, icon = 'lock-outline' }: { text: string; icon?: React.ComponentProps<typeof Icon>['name'] }) {
  return (
    <View style={st.banner}>
      <Icon name={icon} size={16} color={C.cta} />
      <Text style={st.bannerTxt}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: SP.lg, marginBottom: SP.md, borderWidth: 1, borderColor: C.line, ...SH.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md, gap: SP.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, flexShrink: 1 },
  step: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.nav, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.nav },
  field: { flex: 1, minWidth: 0, marginBottom: SP.md, gap: 6 },
  value: { fontSize: 15, color: C.ink },
  num: { fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
  input: { minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: SP.md, backgroundColor: C.card, fontSize: 15, color: C.ink, minWidth: 0 },
  inputErr: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  readonly: { backgroundColor: C.track, color: C.muted },
  select: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  code: { fontSize: 11, color: C.muted, marginTop: 1 },
  err: { color: C.danger, fontSize: 12 },
  hint: { color: C.muted, fontSize: 12 },
  seg: { flexDirection: 'row', backgroundColor: C.track, borderRadius: R.md, borderWidth: 1, borderColor: C.track, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: 'center' },
  segOn: { backgroundColor: C.nav },
  segTxt: { fontSize: 15, fontWeight: '800', color: C.nav },
  segHint: { fontSize: 11, color: C.muted, marginTop: 2 },
  btn: { minHeight: 46, paddingHorizontal: SP.lg, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnSm: { minHeight: 36, paddingHorizontal: SP.md },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 15, fontWeight: '800' },
  stat: { flex: 1, alignItems: 'center', minWidth: 0 },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  statVal: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, borderRadius: R.md, paddingVertical: SP.sm, paddingHorizontal: SP.md, marginBottom: SP.md, backgroundColor: C.ctaSoft },
  bannerTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: C.cta }
});
