// FILE: src/components/SalesChallanPackingSlipNEW/ui.tsx
// Extra building blocks for the packing slip. Everything general (Section, PickerField,
// TextField, Btn, LinkBtn, Notice, ErrorText, Choice …) comes from PackingAutomationNEW/ui
// so both screens look and behave the same.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { tab, u } from '../PackingAutomationNEW/ui';

/** Step bar — same look as PackingAutomationNEW ProgressSteps, own labels. */
export function Steps({ labels, step }: { labels: string[]; step: number }) {
  return (
    <View style={u.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${labels.length}`}>
      {labels.map((label, i) => {
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

export const Check = ({ on, disabled }: { on: boolean; disabled?: boolean }) => (
  <View style={[{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
    on && { backgroundColor: T.copper, borderColor: T.copper }, disabled && { opacity: 0.4 }]}>
    {on ? <Icon name="check" size={17} color="#fff" /> : null}
  </View>
);

/** Small grey pill for item attributes (shade, grade, merge). */
export const Tag = ({ text, tone }: { text: string; tone?: 'copper' | 'green' | 'amber' | 'red' }) => {
  const c = tone === 'copper' ? T.copper : tone === 'green' ? T.green : tone === 'amber' ? T.amber : tone === 'red' ? T.red : null;
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: c ? c + '18' : T.sub }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: c || T.muted }}>{text}</Text>
    </View>
  );
};

export const Tags = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{children}</View>
);

/** Row of big numbers (label above, value below). */
export function Stats({ items }: { items: { label: string; value: string; tone?: 'amber' | 'green' | 'red' }[] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.sub, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10 }}>
      {items.map((s, i) => (
        <View key={s.label} style={{ flex: 1, alignItems: i === items.length - 1 && items.length > 1 ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.muted }}>{s.label}</Text>
          <Text numberOfLines={1} style={[{ fontSize: 17, fontWeight: '800', color: s.tone ? T[s.tone] : T.ink, marginTop: 1 }, tab]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

export const Bar = ({ value, tone = 'copper', height = 6, track }: { value: number; tone?: 'copper' | 'green' | 'red'; height?: number; track?: string }) => (
  <View style={{ height, borderRadius: height, backgroundColor: track || T.border, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: height, backgroundColor: T[tone] }} />
  </View>
);

/** Tappable list row with a checkbox — used in the multi-select sheets. */
export function CheckRow({ on, disabled, onPress, children, right }: { on: boolean; disabled?: boolean; onPress: () => void; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, marginBottom: 8 },
        on && { borderColor: T.copper, backgroundColor: T.copper + '10' },
        disabled && { opacity: 0.55 },
        pressed && !on && { backgroundColor: T.sub },
      ]}>
      <View style={{ paddingTop: 1 }}><Check on={on} disabled={disabled} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {right}
    </Pressable>
  );
}

export const Sr = ({ n }: { n: any }) => (
  <View style={{ minWidth: 30, height: 30, paddingHorizontal: 6, borderRadius: 8, backgroundColor: T.copper + '18', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={[{ fontSize: 14, fontWeight: '800', color: T.copper }, tab]}>{n ?? '–'}</Text>
  </View>
);

/** Compact one-of-few switch (Scanner / Camera / Type). */
export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string; icon?: React.ComponentProps<typeof Icon>['name'] }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.sub, borderRadius: 12, padding: 4, gap: 4 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={[{ flex: 1, height: 44, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
              on && { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.copper }]}>
            {o.icon ? <Icon name={o.icon} size={18} color={on ? T.copper : T.muted} /> : null}
            <Text style={{ fontSize: 14, fontWeight: '800', color: on ? T.ink : T.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
