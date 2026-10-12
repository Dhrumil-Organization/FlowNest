// FILE: src/components/SalesOrderEntryNEW/ui.tsx
// Presentation-only pieces of the Sales Order Entry module (NEW theme — tokens
// from T / S only, so the dark theme runtime converts them). No API calls and
// no business rules live here.
import { SearchBox, Sheet } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { fmtDisplay, Row } from './model';

/** Phone < 768 = 1 column, tablet 2, desktop (>= 1180) 3. */
/** Width of the pane the module is drawn in (set by VersionSwitch for "Both side by side"). */
export const PaneWidth = React.createContext<number | null>(null);

export function useCols() {
  const win = useWindowDimensions().width;
  const pane: number | null = React.useContext(PaneWidth) as number | null;
  const width = pane ?? win;
  const isPhone = width < 768;
  const cols = isPhone ? 1 : width >= 1180 ? 3 : 2;
  return { width, isPhone, cols };
}

/** Centred, max-width wrapper used by every tab body. */
export const CONTENT: any = { maxWidth: 1200, alignSelf: 'center', width: '100%' };

/* ------------------------------------------------------------------ */
/* Searchable picker (Legacy PickerSheet: search on label OR key)       */
/* ------------------------------------------------------------------ */

const PAGE = 200;

export function SearchPicker({
  open,
  title,
  rows,
  keyField,
  labelField,
  subOf,
  leftOf,
  loading,
  selectedKey,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: Row[];
  keyField: string;
  labelField: string;
  /** Second line under the label. */
  subOf?: (row: Row) => string;
  /** Avatar / swatch drawn before the label. */
  leftOf?: (row: Row) => React.ReactNode;
  loading?: boolean;
  selectedKey?: string;
  onPick: (row: Row) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // Legacy cleared the search text every time a picker was closed.
  useEffect(() => {
    if (!open) {
      setSearch('');
      setLimit(PAGE);
    }
  }, [open]);

  const filtered = useMemo(
    () =>
      search
        ? rows.filter(
            (i) =>
              String(i[labelField] || '').toLowerCase().includes(search.toLowerCase()) ||
              String(i[keyField] || '').toLowerCase().includes(search.toLowerCase()),
          )
        : rows,
    [rows, search, labelField, keyField],
  );
  const shown = filtered.slice(0, limit);

  return (
    <Sheet open={open} onClose={onClose} title={title} wideMax={540}>
      <SearchBox
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setLimit(PAGE);
        }}
        placeholder={`Search ${title.toLowerCase()}...`}
      />
      {loading ? (
        <View style={st.pickLoader}>
          <ActivityIndicator color={T.copper} />
        </View>
      ) : (
        <View>
          {shown.map((row, index) => {
            const k = String(row[keyField] ?? '');
            const on = !!selectedKey && k === selectedKey;
            const sub = subOf ? subOf(row) : '';
            return (
              <TouchableOpacity
                key={`${k}_${index}`}
                style={[st.pickRow, on && st.pickRowOn]}
                onPress={() => {
                  onPick(row);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {leftOf ? leftOf(row) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.pickText} numberOfLines={2}>
                    {String(row[labelField] ?? '')}
                  </Text>
                  {sub ? (
                    <Text style={st.pickSub} numberOfLines={2}>
                      {sub}
                    </Text>
                  ) : null}
                </View>
                {on ? <Icon name="check" size={18} color={T.copper} /> : null}
              </TouchableOpacity>
            );
          })}
          {filtered.length > shown.length ? (
            <TouchableOpacity style={st.moreRow} onPress={() => setLimit((v) => v + PAGE)} accessibilityRole="button">
              <Text style={st.moreText}>Show more ({filtered.length - shown.length})</Text>
            </TouchableOpacity>
          ) : null}
          {filtered.length === 0 ? <Text style={st.pickEmpty}>No results found</Text> : null}
        </View>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Date field (optional value, minimum date)                           */
/* ------------------------------------------------------------------ */

const pad2 = (x: number) => String(x).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function DateInput({
  value,
  onChange,
  minimumDate,
  placeholder = 'Select date',
  disabled,
  label,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[st.dateBox, disabled && st.dateBoxRo]}>
        <Icon name="event" size={18} color={disabled ? T.muted : T.copper} />
        {React.createElement('input', {
          type: 'date',
          value: value ? iso(value) : '',
          min: minimumDate ? iso(minimumDate) : undefined,
          disabled: !!disabled,
          'aria-label': label,
          onChange: (e: any) => {
            const v = String(e?.target?.value || '');
            if (!v) return;
            const [y, m, d] = v.split('-').map(Number);
            const next = new Date(y, m - 1, d);
            if (!isNaN(next.getTime())) onChange(next);
          },
          style: {
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: T.ink,
            fontSize: 14,
            fontWeight: 700,
            padding: 0,
            minWidth: 0,
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'inherit',
          },
        })}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[st.dateBox, disabled && st.dateBoxRo]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value ? fmtDisplay(value) : placeholder}`}
      >
        <Icon name="event" size={18} color={disabled ? T.muted : T.copper} />
        <Text style={[st.dateText, !value && { color: T.muted, fontWeight: '600' }]}>{value ? fmtDisplay(value) : placeholder}</Text>
        {!disabled ? <Icon name="expand-more" size={20} color={T.muted} /> : null}
      </TouchableOpacity>
      {open ? (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={(e: any, d?: Date) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(d);
          }}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export function Swatch({ color, size = 28, radius = 7 }: { color?: string; size?: number; radius?: number }) {
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color || '#94A3B8', borderWidth: 1, borderColor: T.border }} />;
}

/** Numbered step card of the New Order form (badge turns into a tick when done). */
export function StepCard({
  n,
  done,
  title,
  sub,
  children,
}: {
  n: number | string;
  done?: boolean;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={st.step}>
      <View style={st.stepHead}>
        <View style={[st.stepBadge, done && { backgroundColor: T.green }]}>
          {done ? <Icon name="check" size={16} color="#fff" /> : <Text style={st.stepBadgeText}>{n}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.stepTitle}>{title}</Text>
          {sub ? <Text style={st.stepSub}>{sub}</Text> : null}
        </View>
      </View>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

/** Two (or more) option toggle used for SO Type / Fabric Type. */
export function Toggle<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <View style={st.seg}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <TouchableOpacity
              key={String(o.value)}
              style={[st.segItem, on && st.segOn]}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[st.segText, on && { color: '#fff' }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function Badge({ text, tone }: { text: string; tone: 'green' | 'amber' | 'blue' | 'red' | 'muted' }) {
  const c = tone === 'green' ? T.green : tone === 'amber' ? T.amber : tone === 'blue' ? T.blue : tone === 'red' ? T.red : T.muted;
  return (
    <View style={[st.badge, { backgroundColor: `${c}16`, borderColor: `${c}40` }]}>
      <Text style={[st.badgeText, { color: c }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...S.card,
  },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted },
});

const st = StyleSheet.create({
  pickLoader: { paddingVertical: 36, alignItems: 'center' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  pickRowOn: { backgroundColor: `${T.copper}10`, borderRadius: 8 },
  pickText: { fontSize: 14, fontWeight: '700', color: T.ink },
  pickSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  pickEmpty: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },
  moreRow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: T.copper, fontWeight: '800', fontSize: 13 },

  dateBox: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  dateBoxRo: { backgroundColor: T.alt },
  dateText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },

  step: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    ...S.card,
  },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: T.ink },
  stepSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },

  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  seg: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: T.nav },
  segText: { fontSize: 13, fontWeight: '700', color: T.nav },

  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
});
