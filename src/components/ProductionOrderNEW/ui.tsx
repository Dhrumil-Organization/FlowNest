// FILE: src/components/ProductionOrderNEW/ui.tsx
// Small building blocks matching the Madhusudhan ERP artifact (Tag, Cell2,
// CovBanner tones, exec pills, two-up switch). Colours come from the ONE
// app theme (src/constants/theme.ts via '@/src/theme'); the Inter font is
// applied automatically by core/fonts/erpFont inside the NEW ERP tree.
import AppAlert from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Sheet } from '../StockVerificationNEW/ui';

export const CONTENT_W = 1420;
const tab = { fontVariant: ['tabular-nums' as const] };

export const Kicker = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Text style={[x.kicker, style]}>{children}</Text>
);
export const Muted = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Text style={[x.muted, style]}>{children}</Text>
);
export const Card = ({ children, style, highlight }: { children: React.ReactNode; style?: any; highlight?: boolean }) => (
  <View style={[x.card, highlight && { borderColor: T.copper, borderWidth: 1.5 }, style]}>{children}</View>
);

export const Tag = ({ label, color = T.copper, style }: { label: string; color?: string; style?: any }) => (
  <View style={[{ backgroundColor: color + '1E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignSelf: 'flex-start' }, style]}>
    <Text numberOfLines={1} style={[{ color, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }, tab]}>{label}</Text>
  </View>
);

export const Badge = ({ label, color = T.copper }: { label: string; color?: string }) => (
  <View style={{ backgroundColor: color + '18', borderColor: color + '55', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
    <Text style={{ fontSize: 9.5, fontWeight: '800', color }}>{label}</Text>
  </View>
);

export function Cell2({ label, value, hi, tone }: { label: string; value: string; hi?: boolean; tone?: 'g' | 'r' }) {
  const color = tone === 'g' ? T.green : tone === 'r' ? T.red : hi ? T.copper : T.ink;
  return (
    <View style={[x.cell, hi && { backgroundColor: T.copper + '0F', borderColor: T.copper + '44' }]}>
      <Text style={x.cellLabel}>{label}</Text>
      <Text style={[{ fontSize: 14, fontWeight: '700', color, marginTop: 2 }, tab]}>{value}</Text>
    </View>
  );
}

export function Grid({ children, cols = 2, gap = 10, narrow }: { children: React.ReactNode; cols?: number; gap?: number; narrow?: boolean }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const c = narrow ? 1 : cols;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: `${100 / c}%` as any, paddingHorizontal: gap / 2, marginBottom: gap }}>{child}</View>
      ))}
    </View>
  );
}

export function Banner({ tone = 'info', title, sub, style }: { tone?: 'ok' | 'warn' | 'err' | 'info'; title: string; sub?: string; style?: any }) {
  const c = { ok: T.green, warn: '#9A6B12', err: T.red, info: T.blue }[tone];
  const bg = { ok: T.green + '14', warn: T.amber + '16', err: T.red + '12', info: T.blue + '10' }[tone];
  return (
    <View style={[{ borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10, backgroundColor: bg, borderWidth: 1, borderColor: c + '45' }, style]}>
      <Text style={{ color: c, fontSize: 11, fontWeight: '600' }}>{title}</Text>
      {sub ? <Text style={[{ color: c, fontSize: 10.5, opacity: 0.85, marginTop: 2 }, tab]}>{sub}</Text> : null}
    </View>
  );
}

export function Pill({ label, active, onPress, disabled }: { label: string; active?: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress}
      style={[x.pill, active && { borderColor: T.copper, backgroundColor: 'rgba(200,117,51,0.12)' }]}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? T.copper : T.muted }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CheckBox({ checked, onPress, disabled }: { checked: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[x.check, checked && { backgroundColor: T.copper, borderColor: T.copper }]}
      accessibilityRole="checkbox" accessibilityState={{ checked }}>
      {checked ? <Icon name="check" size={14} color="#fff" /> : null}
    </TouchableOpacity>
  );
}

export function NumInput({ value, onChangeText, editable = true, placeholder, style }: {
  value: string; onChangeText: (v: string) => void; editable?: boolean; placeholder?: string; style?: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={placeholder ?? '0'}
      placeholderTextColor={T.muted}
      keyboardType="decimal-pad"
      inputMode="decimal"
      style={[x.input, tab, { textAlign: 'right' }, !editable && { backgroundColor: T.sub, color: T.muted }, style]}
    />
  );
}

/** Artifact two/four-up switch (Orders | Pools …, SO based | Stock & sell). */
export function Switch2({ options, value, onChange, disabled, style }: {
  options: [string, string][]; value: string; onChange: (v: string) => void; disabled?: boolean; style?: any;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 8, marginBottom: 14 }, style]}>
      {options.map(([k, label]) => {
        const on = value === k;
        return (
          <TouchableOpacity key={k} disabled={disabled && !on} onPress={() => onChange(k)}
            style={[x.seg, on && { backgroundColor: T.nav, borderColor: T.nav }]} accessibilityState={{ selected: on }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? '#fff' : T.muted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Full-width copper action (artifact "+ New production order", "Review costing & authorize →"). */
export function BigBtn({ label, onPress, disabled, loading, kind = 'copper' }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; kind?: 'copper' | 'ghost' | 'dark';
}) {
  const ghost = kind === 'ghost';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading}
      style={[x.big, ghost ? { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border } : { backgroundColor: kind === 'dark' ? T.nav : T.copper },
        (disabled || loading) && { opacity: 0.45 }]}>
      {loading ? <ActivityIndicator color={ghost ? T.ink : '#fff'} /> :
        <Text style={{ color: ghost ? T.ink : '#fff', fontSize: 14, fontWeight: '800' }}>{label}</Text>}
    </TouchableOpacity>
  );
}

export const SmallBtn = ({ label, onPress, tone = 'ink', disabled }: { label: string; onPress: () => void; tone?: 'ink' | 'copper' | 'red'; disabled?: boolean }) => {
  const c = tone === 'copper' ? T.copper : tone === 'red' ? T.red : T.ink;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={[x.small, { borderColor: tone === 'ink' ? T.border : c + '88' }, disabled && { opacity: 0.45 }]}>
      <Text style={{ color: c, fontSize: 11.5, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
};

export const Loading = ({ label }: { label?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
    <ActivityIndicator size="small" color={T.copper} />
    {label ? <Text style={[x.muted, { marginLeft: 8, fontSize: 11 }]}>{label}</Text> : null}
  </View>
);

/**
 * Server-search picker (job-work companies, designs, cost sheets). The app's
 * SearchablePickerModal filters a local list only; party masters are large,
 * so this one searches on the server (debounced) inside the common Sheet.
 */
export type PickerPage<R> = { rows: R[]; more?: boolean; total?: number };

export function ServerPicker<R>({ open, title, eyebrow, onClose, load, onPick, render, keyOf, placeholder, emptyText }: {
  open: boolean; title: string; eyebrow?: string; onClose: () => void;
  /** Return rows, or a page ({ rows, more, total }) to enable "Load more". */
  load: (q: string, page: number) => Promise<R[] | PickerPage<R>>;
  onPick: (r: R) => void; render: (r: R) => { title: string; sub?: string }; keyOf: (r: R) => string;
  placeholder?: string; emptyText?: string;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<R[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);
  useEffect(() => { if (open) { setQ(''); setPage(1); } }, [open]);
  useEffect(() => { setPage(1); }, [q]);
  useEffect(() => {
    if (!open) return undefined;
    const id = ++seq.current;
    setBusy(true); setErr('');
    const t = setTimeout(() => {
      load(q.trim(), page)
        .then((r) => {
          if (id !== seq.current) return;
          const pg: PickerPage<R> = Array.isArray(r) ? { rows: r } : r;
          setRows((cur) => (page === 1 ? pg.rows || [] : cur.concat(pg.rows || [])));
          setMore(!!pg.more); setTotal(pg.total ?? null);
        })
        .catch((e) => { if (id === seq.current) setErr(String(e?.message || 'Could not load.')); })
        .finally(() => { if (id === seq.current) setBusy(false); });
    }, page === 1 ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, page]);
  return (
    <Sheet open={open} onClose={onClose} eyebrow={eyebrow} title={title}>
      <View style={x.search}>
        <Icon name="search" size={18} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder={placeholder || 'Search…'} placeholderTextColor={T.muted}
          autoFocus={Platform.OS === 'web'} style={{ flex: 1, paddingVertical: 9, marginLeft: 6, fontSize: 13, color: T.ink }} />
      </View>
      {total !== null && !err ? <Muted>{rows.length} of {total} shown{more ? ' — type to narrow, or load more below' : ''}</Muted> : null}
      {busy && page === 1 ? <Loading label="Searching…" /> : null}
      {err ? <Banner tone="err" title={err} /> : null}
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(r) => keyOf(r)}
        ListEmptyComponent={!busy && !err ? <Muted style={{ textAlign: 'center', padding: 18 }}>{emptyText || 'Nothing found.'}</Muted> : null}
        renderItem={({ item }) => {
          const r = render(item);
          return (
            <Pressable onPress={() => onPick(item)} style={({ pressed }) => [x.pickRow, pressed && { backgroundColor: T.sub }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>{r.title}</Text>
              {r.sub ? <Text style={[x.muted, tab, { marginTop: 2 }]}>{r.sub}</Text> : null}
            </Pressable>
          );
        }}
      />
      {more ? (
        <TouchableOpacity onPress={() => !busy && setPage((p) => p + 1)} style={[x.small, { alignSelf: 'center', marginTop: 6, borderColor: T.border }]}>
          {busy ? <ActivityIndicator size="small" color={T.copper} /> : <Text style={{ color: T.copper, fontSize: 12, fontWeight: '800' }}>Load more</Text>}
        </TouchableOpacity>
      ) : null}
    </Sheet>
  );
}

/** Promise wrappers over the app-wide AppAlert (works on web + native). */
export const confirmAsync = (title: string, message: string, okText = 'OK', destructive = false) =>
  new Promise<boolean>((resolve) => AppAlert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
export const notifyAsync = (title: string, message: string) =>
  new Promise<void>((resolve) => AppAlert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }], { onDismiss: () => resolve() }));

export const x = StyleSheet.create({
  kicker: { fontSize: 9.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
  muted: { fontSize: 10, color: T.muted, lineHeight: 15 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, ...S.card },
  cell: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 11 },
  cellLabel: { fontSize: 8.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, marginRight: 6, marginBottom: 6 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#CFC8C0', backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: T.ink, minHeight: 38 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  big: { borderRadius: 11, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  small: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11, borderWidth: 1, backgroundColor: T.surface },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 10, backgroundColor: T.surface },
  pickRow: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: T.alt, borderRadius: 6 },
});
