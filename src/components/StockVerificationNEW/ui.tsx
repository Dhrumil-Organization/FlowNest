// FILE: src/components/StockVerificationNEW/ui.tsx
// Small NEW-theme building blocks for the stock verification screens:
// SelectField (opens SearchablePickerModal), Segment, Sheet (bottom sheet on
// phones, centred dialog on tablet/web), plus the year/store master hook.
import SearchablePickerModal from '@/src/components/ui/SearchablePickerModal';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Api, fetchStores, fetchYears } from './verificationApi';
import { Row, str } from './verificationModel';

export type Opt = { value: string; label: string; searchText?: string };

export const toOpts = (rows: Row[], v: string, l: string, extra?: (r: Row) => string): Opt[] =>
  rows
    .filter((r) => str(r?.[v]) !== '')
    .map((r) => ({ value: str(r[v]), label: str(r[l]) || str(r[v]), searchText: extra ? extra(r) : str(r[v]) }));

/* ------------------------------ SelectField ---------------------------- */

type SelectProps = {
  label: string;
  required?: boolean;
  value: string;
  options: Opt[];
  onChange: (v: string, o: Opt | null) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onRefresh?: () => void;
  clearable?: boolean;
  style?: any;
};

export function SelectField({
  label, required, value, options, onChange, placeholder = 'Select…', loading, disabled, disabledHint, onRefresh, clearable, style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value) || null;
  const text = sel ? sel.label : value ? value : disabled && disabledHint ? disabledHint : placeholder;
  return (
    <View style={[{ flex: 1, minWidth: 150 }, style]}>
      <Text style={u.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      <TouchableOpacity
        style={[u.select, disabled && { opacity: 0.55 }, !!sel && { borderColor: T.nav }]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
      >
        <Text style={[u.selectText, !sel && { color: T.muted }]} numberOfLines={1}>{text}</Text>
        {loading ? <ActivityIndicator size="small" color={T.muted} /> : null}
        {clearable && sel && !loading ? (
          <TouchableOpacity onPress={() => onChange('', null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={16} color={T.muted} />
          </TouchableOpacity>
        ) : null}
        {!loading ? <Icon name="expand-more" size={20} color={T.muted} /> : null}
      </TouchableOpacity>
      <SearchablePickerModal
        visible={open}
        title={label}
        placeholder={`Search ${label.toLowerCase()}…`}
        options={options}
        selectedValue={value}
        loading={loading}
        onClose={() => setOpen(false)}
        onSelect={(o: Opt) => { setOpen(false); onChange(o.value, o); }}
        onRefresh={onRefresh}
      />
    </View>
  );
}

/* -------------------------------- Segment ------------------------------ */

export function Segment({ label, required, value, options, onChange }: {
  label?: string; required?: boolean; value: string; options: Opt[]; onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1, minWidth: 180 }}>
      {label ? <Text style={u.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text> : null}
      <View style={u.seg}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <TouchableOpacity key={o.value} style={[u.segItem, on && u.segOn]} onPress={() => onChange(o.value)} accessibilityState={{ selected: on }}>
              <Text style={[u.segText, on && { color: '#fff' }]} numberOfLines={1}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* --------------------------------- Sheet ------------------------------- */

export function Sheet({ open, onClose, eyebrow, title, children, footer, notice, wideMax = 620 }: {
  open: boolean; onClose: () => void; eyebrow?: string; title: string;
  children: React.ReactNode; footer?: React.ReactNode; notice?: React.ReactNode; wideMax?: number;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  return (
    <Modal visible={open} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[u.flex, wide ? u.center : u.bottom]}>
        <TouchableWithoutFeedback onPress={onClose}><View style={u.scrim} /></TouchableWithoutFeedback>
        <View style={[u.sheet, wide ? [u.sheetWide, { maxWidth: wideMax }] : u.sheetPhone]}>
          {!wide ? <View style={u.handle} /> : null}
          <View style={u.sheetHead}>
            <View style={{ flex: 1 }}>
              {eyebrow ? <Text style={u.eyebrow}>{eyebrow}</Text> : null}
              <Text style={u.sheetTitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={u.closeBtn} accessibilityLabel="Close">
              <Icon name="close" size={20} color={T.nav} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
            {children}
          </ScrollView>
          {notice ? <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>{notice}</View> : null}
          {footer ? <View style={u.sheetFoot}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Btn({ label, icon, onPress, kind = 'primary', disabled, loading, style, compact }: {
  label: string; icon?: string; onPress: () => void; kind?: 'primary' | 'copper' | 'ghost' | 'danger';
  disabled?: boolean; loading?: boolean; style?: any; compact?: boolean;
}) {
  const bg = kind === 'primary' ? T.nav : kind === 'copper' ? T.copper : kind === 'danger' ? T.red : T.surface;
  const fg = kind === 'ghost' ? T.nav : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[u.btn, compact && u.btnCompact, { backgroundColor: bg }, kind === 'ghost' && { borderWidth: 1, borderColor: T.border }, (disabled || loading) && { opacity: 0.5 }, style]}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon as any} size={compact ? 16 : 18} color={fg} /> : null}
      <Text style={[u.btnText, compact && { fontSize: 12 }, { color: fg }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------ year / store master hook ---------------------- */

/** Years for a property and stores for property+year (legacy reset rules
 *  are applied by the caller: property change clears year+store, year change
 *  clears store). Auto-picks when there is only one option. */
export function useYearStore(api: Api | null, prp: string, year: string, onAutoYear: (y: string) => void, onAutoStore: (s: string) => void) {
  const [years, setYears] = useState<Row[]>([]);
  const [stores, setStores] = useState<Row[]>([]);
  const [yLoading, setYL] = useState(false);
  const [sLoading, setSL] = useState(false);
  const [yTick, setYTick] = useState(0);
  const [sTick, setSTick] = useState(0);

  useEffect(() => {
    setYears([]);
    if (!api || !prp) return;
    let alive = true;
    setYL(true);
    fetchYears(api, prp)
      .then((r) => {
        if (!alive) return;
        setYears(r);
        const opts = r.filter((x) => str(x?.YearNo) !== '');
        if (opts.length === 1 && !year) onAutoYear(str(opts[0].YearNo));
      })
      .catch(() => alive && setYears([]))
      .finally(() => alive && setYL(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api?.API, api?.token, prp, yTick]);

  useEffect(() => {
    setStores([]);
    if (!api || !prp || !year) return;
    let alive = true;
    setSL(true);
    fetchStores(api, prp, year)
      .then((r) => {
        if (!alive) return;
        setStores(r);
        const opts = r.filter((x) => str(x?.StrCode) !== '');
        if (opts.length === 1) onAutoStore(str(opts[0].StrCode));
      })
      .catch(() => alive && setStores([]))
      .finally(() => alive && setSL(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api?.API, api?.token, api?.prptype, prp, year, sTick]);

  const yearOpts = useMemo(() => toOpts(years, 'YearNo', 'YearName'), [years]);
  const storeOpts = useMemo(() => toOpts(stores, 'StrCode', 'StrName'), [stores]);
  return {
    yearOpts, storeOpts, yLoading, sLoading,
    reloadYears: () => setYTick((t) => t + 1),
    reloadStores: () => setSTick((t) => t + 1),
  };
}

export const u = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  bottom: { justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.5)' },
  sheet: { backgroundColor: T.surface, overflow: 'hidden' },
  sheetPhone: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '92%' },
  sheetWide: { width: '100%', borderRadius: 16, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border, marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  sheetFoot: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: T.hair, backgroundColor: T.sub },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  label: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, marginBottom: 5, textTransform: 'uppercase' },
  select: { height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectText: { flex: 1, fontSize: 14, color: T.ink, fontWeight: '600' },
  seg: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: T.nav },
  segText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  btn: { height: 44, borderRadius: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnCompact: { height: 36, paddingHorizontal: 12, borderRadius: 8, gap: 6 },
  btnText: { fontSize: 14, fontWeight: '800' },
  input: { height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, fontSize: 15, color: T.ink },
});
