// FILE: src/components/PackingAutomationNEW/ui.tsx
// Building blocks for the Packing Automation flow. Built for the shop floor:
// 48px+ touch targets, big numbers, one clear primary action per screen.
// Colours come from the ONE app theme ('@/src/theme'); Inter is applied
// automatically inside the NEW ERP tree.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Form, Step } from './usePackingForm';
import { routeView } from './usePackingForm';

export const tab = { fontVariant: ['tabular-nums' as const] };
type IconName = React.ComponentProps<typeof Icon>['name'];

/* ------------------------------ progress ------------------------------ */

const STEP_LABELS = ['Route', 'Details', 'Print'];

export function ProgressSteps({ step }: { step: Step }) {
  return (
    <View style={u.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${Math.min(step, 3)} of 3`}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const on = step === n;
        return (
          <View key={label} style={{ flex: 1 }}>
            <View style={[u.bar, (done || on) && { backgroundColor: T.copper }]} />
            <Text style={[u.stepLabel, on && { color: T.ink, fontWeight: '800' }]}>
              {n} · {label}{done ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------ containers ------------------------------ */

export function Section({ title, right, children, style }: { title?: string; right?: React.ReactNode; children: React.ReactNode; style?: any }) {
  return (
    <View style={[u.card, style]}>
      {title || right ? (
        <View style={u.sectionHead}>
          {title ? <Text style={u.kicker}>{title}</Text> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export const ErrorText = ({ children }: { children?: string }) =>
  children ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6 }}>
      <Icon name="error-outline" size={15} color={T.red} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: T.red, fontSize: 12.5, fontWeight: '600' }}>{children}</Text>
    </View>
  ) : null;

export const Hint = ({ children }: { children?: string }) =>
  children ? <Text style={u.hint}>{children}</Text> : null;

export function Notice({ tone = 'err', text, action }: { tone?: 'err' | 'ok' | 'info'; text: string; action?: { label: string; onPress: () => void } }) {
  const c = tone === 'ok' ? T.green : tone === 'info' ? T.blue : T.red;
  return (
    <View style={[u.notice, { borderColor: c + '55', backgroundColor: c + '12' }]}>
      <Icon name={tone === 'ok' ? 'check-circle' : tone === 'info' ? 'info-outline' : 'error-outline'} size={18} color={c} />
      <Text style={{ flex: 1, color: c, fontSize: 13, fontWeight: '600' }}>{text}</Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <Text style={{ color: c, fontSize: 13, fontWeight: '800' }}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------ fields ------------------------------ */

export function FieldLabel({ label, required, right }: { label: string; required?: boolean; right?: React.ReactNode }) {
  if (!label && !right) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Text style={u.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/** Tap-to-choose field (opens a picker sheet). */
export function PickerField({
  label, required, value, sub, placeholder, onPress, disabled, locked, loading, error, hint, icon, style,
}: {
  label: string; required?: boolean; value?: string; sub?: string; placeholder?: string; onPress?: () => void;
  disabled?: boolean; locked?: boolean; loading?: boolean; error?: string; hint?: string; icon?: IconName; style?: any;
}) {
  const inactive = disabled || locked;
  return (
    <View style={style}>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity
        onPress={onPress}
        disabled={inactive || loading}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder || 'not chosen'}`}
        style={[u.field, !!error && { borderColor: T.red }, inactive && u.fieldOff]}>
        {icon ? <Icon name={icon} size={20} color={T.muted} /> : null}
        <View style={{ flex: 1, paddingVertical: 8 }}>
          <Text numberOfLines={2} style={[u.fieldText, !value && { color: T.muted, fontWeight: '500' }]}>
            {value || placeholder || 'Choose'}
          </Text>
          {sub ? <Text numberOfLines={1} style={[u.hint, { marginTop: 1 }]}>{sub}</Text> : null}
        </View>
        {loading ? <ActivityIndicator size="small" color={T.copper} /> :
          <Icon name={locked ? 'lock-outline' : 'expand-more'} size={locked ? 18 : 22} color={T.muted} />}
      </TouchableOpacity>
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{hint}</Hint>}
    </View>
  );
}

export function TextField({
  label, required, value, onChangeText, numeric, decimal, error, hint, placeholder, editable = true, suffix, style,
  inputRef, onSubmitEditing, autoFocus, autoCapitalize, right, big,
}: {
  label: string; required?: boolean; value: string; onChangeText: (v: string) => void; numeric?: boolean; decimal?: boolean;
  error?: string; hint?: string; placeholder?: string; editable?: boolean; suffix?: string; style?: any;
  inputRef?: React.Ref<TextInput>; onSubmitEditing?: () => void; autoFocus?: boolean;
  autoCapitalize?: 'none' | 'characters'; right?: React.ReactNode; big?: boolean;
}) {
  return (
    <View style={style}>
      <FieldLabel label={label} required={required} />
      <View style={[u.field, !!error && { borderColor: T.red }, !editable && u.fieldOff]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          keyboardType={decimal ? 'decimal-pad' : numeric ? 'number-pad' : 'default'}
          inputMode={decimal ? 'decimal' : numeric ? 'numeric' : 'text'}
          autoCapitalize={autoCapitalize ?? 'characters'}
          autoCorrect={false}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'search' : 'done'}
          accessibilityLabel={label}
          style={[u.input, big && { fontSize: 20, letterSpacing: 0.5 }, tab, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        />
        {suffix ? <Text style={[u.hint, { fontSize: 13 }]}>{suffix}</Text> : null}
        {right}
      </View>
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{hint}</Hint>}
    </View>
  );
}

/** − value + for counts (cones, copies). Typing works too. */
export function Counter({ label, sub, value, onChange, min = 1, max = 999, error }: {
  label: string; sub?: string; value: string; onChange: (v: string) => void; min?: number; max?: number; error?: string;
}) {
  const n = parseInt(value, 10);
  const cur = Number.isFinite(n) ? n : 0;
  const set = (v: number) => onChange(String(Math.max(min, Math.min(max, v))));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[u.label, { fontSize: 15 }]}>{label}<Text style={{ color: T.red }}> *</Text></Text>
          {sub ? <Text style={u.hint}>{sub}</Text> : null}
        </View>
        <View style={[u.counter, !!error && { borderColor: T.red }]}>
          <TouchableOpacity onPress={() => set(cur - 1)} disabled={cur <= min} style={[u.cBtn, cur <= min && { opacity: 0.35 }]}
            accessibilityRole="button" accessibilityLabel={`Decrease ${label}`}>
            <Icon name="remove" size={24} color={T.ink} />
          </TouchableOpacity>
          <TextInput
            value={value}
            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="0"
            placeholderTextColor={T.muted}
            accessibilityLabel={label}
            style={[u.cVal, tab, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
          <TouchableOpacity onPress={() => set(cur + 1)} disabled={cur >= max} style={[u.cBtn, cur >= max && { opacity: 0.35 }]}
            accessibilityRole="button" accessibilityLabel={`Increase ${label}`}>
            <Icon name="add" size={24} color={T.ink} />
          </TouchableOpacity>
        </View>
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** Single choice as big tappable rows. Exactly one can be on. */
export function Choice<V extends string>({ options, value, onChange, horizontal }: {
  options: { value: V; label: string; sub?: string; disabled?: boolean }[]; value: V | ''; onChange: (v: V) => void; horizontal?: boolean;
}) {
  return (
    <View style={{ flexDirection: horizontal ? 'row' : 'column', gap: 8 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} disabled={o.disabled} onPress={() => onChange(o.value)}
            accessibilityRole="radio" accessibilityState={{ checked: on, disabled: o.disabled }}
            style={({ pressed }) => [u.choice, horizontal && { flex: 1 }, on && u.choiceOn, o.disabled && { opacity: 0.5 }, pressed && !on && { backgroundColor: T.sub }]}>
            <View style={[u.radio, on && { borderColor: T.copper }]}>{on ? <View style={u.radioDot} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={[u.fieldText, { fontSize: 15 }]}>{o.label}</Text>
              {o.sub ? <Text style={u.hint}>{o.sub}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------ buttons ------------------------------ */

export function Btn({ label, onPress, disabled, loading, icon, kind = 'dark', style, flex }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: IconName;
  kind?: 'dark' | 'copper' | 'ghost'; style?: any; flex?: boolean;
}) {
  const ghost = kind === 'ghost';
  const fg = ghost ? T.ink : '#fff';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[u.btn, flex && { flex: 1 },
        ghost ? { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 18 } : { backgroundColor: kind === 'copper' ? T.copper : T.nav },
        (disabled || loading) && { opacity: 0.5 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '800' }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export const LinkBtn = ({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) => (
  <TouchableOpacity onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6 }}>
    {icon ? <Icon name={icon} size={16} color={T.copper} /> : null}
    <Text style={{ color: T.copper, fontSize: 14, fontWeight: '800' }}>{label}</Text>
  </TouchableOpacity>
);

/* ------------------------------ selections so far ------------------------------ */

function KV({ label, value, sub, wide }: { label: string; value?: string; sub?: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : '33.33%', paddingRight: 10, marginBottom: 10 }}>
      <Text style={u.kvLabel}>{label}</Text>
      <Text numberOfLines={wide ? 2 : 1} style={[u.kvValue, tab, !value && { color: T.muted }]}>{value || '—'}</Text>
      {sub ? <Text numberOfLines={1} style={u.hint}>{sub}</Text> : null}
    </View>
  );
}

function Group({ title, onEdit, children, first }: { title: string; onEdit?: () => void; children: React.ReactNode; first?: boolean }) {
  return (
    <View style={!first && { borderTopWidth: 1, borderTopColor: T.alt, paddingTop: 8, marginTop: 2 }}>
      <View style={u.sectionHead}>
        <Text style={u.kicker}>{title}</Text>
        {onEdit ? <LinkBtn label="Edit" icon="edit" onPress={onEdit} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
    </View>
  );
}

/**
 * Everything chosen on earlier steps, carried forward on every later screen.
 * `upTo` = last finished step to show (1 on Details, 2 on Print, 3 on Done).
 */
export function SelectionsCard({ f, facility, upTo, onEdit, style }: {
  f: Form; facility: string; upTo: 1 | 2 | 3; onEdit?: (step: Step) => void; style?: any;
}) {
  const r = routeView(f);
  const edit = (s: Step) => (onEdit ? () => onEdit(s) : undefined);
  return (
    <View style={[u.card, { paddingTop: 4 }, style]} accessibilityLabel="Selections so far">
      <Group title="1 · Route" onEdit={edit(1)} first>
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Icon name="business" size={16} color={T.muted} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: T.ink }}>{facility}</Text>
        </View>
        <KV label="Route card" value={r.routeNo} />
        <KV label="Item" value={r.itmcode} sub={r.itmname} />
        <KV label="Shade" value={r.shdcode} sub={r.shdname} />
        <KV label="Denier" value={r.denier} />
        <KV label="Paper tube wt." value={r.cheeswt} />
        <KV label="Stock type" value={r.stkLabel} />
      </Group>
      {upTo >= 2 ? (
        <Group title="2 · Details" onEdit={edit(2)}>
          <KV label="Party" value={f.party?.parname} wide />
          <KV label="Production type" value={f.prodtype} />
          <KV label="Carton type" value={f.carton?.carname} />
          <KV label="Empty carton wt." value={f.carwt} />
          <KV label="Grade" value={f.grade?.name || f.grade?.code} />
          <KV label="Merge (route)" value={f.merge?.name || f.merge?.code} />
          <KV label="Print no." value={f.printno} />
          <KV label="Shipping marka" value={f.smarka} wide />
        </Group>
      ) : null}
      {upTo >= 3 ? (
        <Group title="3 · Print">
          <KV label="Cones" value={f.nocones} />
          <KV label="Label copies" value={f.noprint} />
          <KV label="Requir patti" value={f.rpatti === 'Y' ? 'Yes' : 'No'} />
          <KV label="Printer" value={f.printer} wide />
        </Group>
      ) : null}
    </View>
  );
}

/* ------------------------------ styles ------------------------------ */

export const u = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  bar: { height: 4, borderRadius: 2, backgroundColor: T.border },
  stepLabel: { marginTop: 7, fontSize: 12, fontWeight: '600', color: T.muted },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 14, marginBottom: 12, ...S.card },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  kicker: { fontSize: 11.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 14, fontWeight: '700', color: T.ink },
  hint: { fontSize: 12, color: T.muted, marginTop: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderWidth: 1.5, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: T.surface },
  fieldOff: { backgroundColor: T.sub, borderColor: T.border },
  fieldText: { fontSize: 16, fontWeight: '700', color: T.ink },
  input: { flex: 1, fontSize: 17, fontWeight: '700', color: T.ink, paddingVertical: 12, minHeight: 48 },
  counter: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: T.border, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface },
  cBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub },
  cVal: { width: 64, height: 52, textAlign: 'center', fontSize: 22, fontWeight: '800', color: T.ink },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderWidth: 1.5, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.surface },
  choiceOn: { borderColor: T.copper, backgroundColor: T.copper + '12' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: T.copper },
  btn: { height: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 },
  kvLabel: { fontSize: 11, fontWeight: '600', color: T.muted },
  kvValue: { fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 1 },
});
