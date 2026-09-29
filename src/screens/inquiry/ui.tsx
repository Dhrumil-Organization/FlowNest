// FILE: src/screens/inquiry/ui.tsx
// NEW ERP — Inquiry module: small shared UI kit (NEW ERP theme tokens).
import DateTimePicker from '@react-native-community/datetimepicker';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useInquiryNavOptional } from './InquiryContext';
import { anyToIso, isoToDmy, showDmy, STATUS_META, TAT_META, todayIsoLocal } from './inquiryModel';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export const useWide = () => {
  const { width } = useWindowDimensions();
  return { width, wide: width >= 760, xwide: width >= 1100 };
};

/* -------------------------------------------------------------------------- */
/*  View shell: top bar (back · title · actions) + scrollable body             */
/* -------------------------------------------------------------------------- */

export function ViewShell({
  title, subtitle, right, children, scroll = true, maxWidth = 900, footer, onBack, hideBack,
}: {
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  maxWidth?: number;
  footer?: React.ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  // Inside the inquiry module the back button pops its stack; other modules
  // (weft issue, reports…) pass their own onBack.
  const nav = useInquiryNavOptional();
  const { wide } = useWide();
  const goBack = onBack ?? nav?.back;
  const showBack = !hideBack && (onBack ? true : !!nav?.canGoBack);
  return (
    <View style={st.root}>
      <View style={st.topBar}>
        <View style={[st.topInner, { maxWidth: Math.max(maxWidth, 900) }]}>
          {showBack && (
            <TouchableOpacity onPress={goBack} hitSlop={HIT} style={st.backBtn} activeOpacity={0.7}>
              <Icon name="arrow-back" size={20} color={T.ink} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.topTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={st.topSub} numberOfLines={1}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[st.body, wide && st.bodyWide, { maxWidth }]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
    </View>
  );
}

export function IconBtn({ icon, onPress, color = T.ink, badge, label, tone }: {
  icon: any; onPress: () => void; color?: string; badge?: number; label?: string; tone?: 'alert';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT}
      style={[st.iconBtn, tone === 'alert' && { backgroundColor: `${T.amber}22`, borderColor: `${T.amber}66` }]}
      activeOpacity={0.7}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={18} color={color} />
      {!!badge && badge > 0 && (
        <View style={st.badgeDot}><Text style={st.badgeDotText}>{badge > 99 ? '99+' : badge}</Text></View>
      )}
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */

export function Card({ children, style, title, right }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; title?: string; right?: React.ReactNode;
}) {
  return (
    <View style={[st.card, style]}>
      {(!!title || right) && (
        <View style={st.cardHead}>
          {!!title && <Text style={st.cardTitle}>{title}</Text>}
          <View style={{ flex: 1 }} />
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function Field({
  label, required, error, style, inputStyle, multiline, big, ...rest
}: TextInputProps & {
  label?: string; required?: boolean; error?: string | null; style?: StyleProp<ViewStyle>; inputStyle?: any; big?: boolean;
}) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      {!!label && (
        <Text style={st.label}>
          {label}{required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
      )}
      <TextInput
        placeholderTextColor={T.muted}
        multiline={multiline}
        style={[
          st.input,
          multiline && { minHeight: 70, textAlignVertical: 'top', paddingTop: 9 },
          big && { fontSize: 18, fontWeight: '800', fontFamily: MONO },
          !!error && { borderColor: T.red },
          rest.editable === false && { backgroundColor: T.sub, color: T.muted },
          inputStyle,
        ]}
        {...rest}
      />
      {!!error && <Text style={st.fieldErr}>{error}</Text>}
    </View>
  );
}

export function SelectBox({ label, required, value, placeholder, sub, onPress, icon = 'search', disabled, onClear }: {
  label?: string; required?: boolean; value?: string | null; placeholder: string; sub?: string | null;
  onPress: () => void; icon?: any; disabled?: boolean; onClear?: () => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      {!!label && <Text style={st.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[st.select, !!value && { borderColor: `${T.copper}88` }, disabled && { opacity: 0.6 }]}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.selectText, !value && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {!!value && !!sub && <Text style={st.selectSub} numberOfLines={1}>{sub}</Text>}
        </View>
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>
        ) : (
          <Icon name={icon} size={17} color={T.muted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'accent';

export function Btn({ title, onPress, variant = 'primary', loading, disabled, icon, style, small }: {
  title: string; onPress: () => void; variant?: BtnVariant; loading?: boolean; disabled?: boolean; icon?: any;
  style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const bg = { primary: T.nav, accent: T.copper, danger: T.red, secondary: T.surface, outline: 'transparent' }[variant];
  const fg = variant === 'secondary' ? T.ink : variant === 'outline' ? T.nav : '#fff';
  const border = variant === 'secondary' ? T.border : variant === 'outline' ? T.nav : bg;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[st.btn, small && st.btnSmall, { backgroundColor: bg, borderColor: border }, (disabled || loading) && { opacity: 0.6 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={small ? 15 : 17} color={fg} /> : null}
      <Text style={[st.btnText, small && { fontSize: 12 }, { color: fg }]} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ label, fg, bg, icon }: { label: string; fg: string; bg: string; icon?: any }) {
  return (
    <View style={[st.pill, { backgroundColor: bg }]}>
      {!!icon && <Icon name={icon} size={11} color={fg} />}
      <Text style={[st.pillText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const m = STATUS_META[status] || { fg: T.ink, bg: T.alt, label: status };
  return <Pill label={label || m.label} fg={m.fg} bg={m.bg} />;
}

export function TatBadge({ status, prefix }: { status: string; prefix?: string }) {
  const m = TAT_META[status] || TAT_META.not_applicable;
  return <Pill label={`${prefix ?? ''}${m.label}`} fg={m.fg} bg={m.bg} icon={m.icon} />;
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={st.state}>
      <ActivityIndicator color={T.copper} />
      {!!label && <Text style={st.stateText}>{label}</Text>}
    </View>
  );
}

export function EmptyState({ icon = 'inbox', title, subtitle, action }: {
  icon?: any; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <View style={st.state}>
      <View style={st.stateIcon}><Icon name={icon} size={26} color={T.muted} /></View>
      <Text style={st.stateTitle}>{title}</Text>
      {!!subtitle && <Text style={st.stateText}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <TouchableOpacity disabled={!onRetry} onPress={onRetry} style={st.errBox} activeOpacity={0.7}>
      <Icon name="error-outline" size={15} color={T.red} />
      <Text style={st.errText}>{text}{onRetry ? ' — tap to retry' : ''}</Text>
    </TouchableOpacity>
  );
}

export function Banner({ tone = 'info', title, text, icon }: {
  tone?: 'info' | 'warn' | 'success' | 'danger'; title?: string; text?: string | null; icon?: any;
}) {
  const c = { info: T.blue, warn: T.amber, success: T.green, danger: T.red }[tone];
  return (
    <View style={[st.banner, { borderLeftColor: c, backgroundColor: `${c}12` }]}>
      {!!icon && <Icon name={icon} size={18} color={c} style={{ marginTop: 1 }} />}
      <View style={{ flex: 1 }}>
        {!!title && <Text style={[st.bannerTitle, { color: c }]}>{title}</Text>}
        {!!text && <Text style={[st.bannerText, { color: c }]}>{text}</Text>}
      </View>
    </View>
  );
}

export function KV({ k, v, last, strong, color }: { k: string; v: React.ReactNode; last?: boolean; strong?: boolean; color?: string }) {
  return (
    <View style={[st.kv, !last && st.kvLine]}>
      <Text style={st.kvKey}>{k}</Text>
      <Text style={[st.kvVal, strong && { fontWeight: '900', fontSize: 14 }, !!color && { color }]}>{v}</Text>
    </View>
  );
}

export function Chip({ label, on, onPress, dot }: { label: string; on: boolean; onPress: () => void; dot?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} activeOpacity={0.75}>
      {!!dot && <View style={[st.chipDot, { backgroundColor: dot }]} />}
      <Text style={[st.chipText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RadioList({ options, value, onChange, color = T.copper }: {
  options: string[]; value: string; onChange: (v: string) => void; color?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onChange(o)}
            style={[st.radioRow, on && { borderColor: color, backgroundColor: `${color}10` }]}
            activeOpacity={0.75}
          >
            <View style={[st.radio, on && { borderColor: color }]}>{on && <View style={[st.radioIn, { backgroundColor: color }]} />}</View>
            <Text style={[st.radioText, on && { color: T.ink, fontWeight: '800' }]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search picker sheet (party / design / shade)                               */
/* -------------------------------------------------------------------------- */

export function PickerSheet<Item>({
  visible, title, subtitle, placeholder, onClose, load, remote = true, keyOf, render, onPick, headerAction,
  emptyText = 'Nothing found',
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder: string;
  onClose: () => void;
  /** remote=true: called with the search text (debounced). remote=false: called once, filtered locally. */
  load: (q: string) => Promise<Item[]>;
  remote?: boolean;
  keyOf: (i: Item, idx: number) => string;
  render: (i: Item) => { title: string; sub?: string };
  onPick: (i: Item) => void;
  headerAction?: React.ReactNode;
  emptyText?: string;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { if (!visible) { setQ(''); setError(null); } }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!remote && items.length && !error) return; // local list already loaded
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load(remote ? q : '');
        if (!cancelled) setItems(Array.isArray(res) ? res : []);
      } catch (e: any) {
        if (!cancelled) { setItems([]); setError(e?.response?.data?.message || e?.message || 'Unable to load'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, remote ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, remote ? q : '', tick]);

  const list = useMemo(() => {
    if (remote) return items;
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => {
      const r = render(i);
      return `${r.title} ${r.sub ?? ''}`.toLowerCase().includes(s);
    });
  }, [items, q, remote, render]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.sheetOverlay}>
        <View style={[st.sheetCard, { maxHeight: Math.round(height * 0.88) }, width >= 760 && { maxWidth: 620 }]}>
          <View style={st.sheetHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.sheetTitle} numberOfLines={1}>{title}</Text>
              {!!subtitle && <Text style={st.sheetSub} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={st.sheetSearch}>
            <Icon name="search" size={16} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={placeholder}
              placeholderTextColor={T.muted}
              style={st.sheetSearchInput}
              autoFocus={Platform.OS === 'web'}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={15} color={T.muted} /></TouchableOpacity>}
          </View>
          {headerAction}
          {loading ? (
            <Loader />
          ) : error ? (
            <View style={{ padding: 12 }}><ErrorBox text={error} onRetry={() => setTick((x) => x + 1)} /></View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={keyOf}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14 }}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={[st.stateText, { paddingVertical: 24 }]}>{q ? 'No match — try a different search' : emptyText}</Text>}
              renderItem={({ item }) => {
                const r = render(item);
                return (
                  <TouchableOpacity style={st.sheetRow} onPress={() => onPick(item)} activeOpacity={0.6}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.sheetRowTitle} numberOfLines={1}>{r.title}</Text>
                      {!!r.sub && <Text style={st.sheetRowSub} numberOfLines={1}>{r.sub}</Text>}
                    </View>
                    <Icon name="chevron-right" size={18} color={T.muted} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Date field (web <input type=date>, native picker) — value DD-MM-YYYY       */
/* -------------------------------------------------------------------------- */

const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export function DateField({ label, required, value, onChange, minToday = true }: {
  label?: string; required?: boolean; value?: string | null; onChange: (dmy: string) => void; minToday?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const iso = anyToIso(value);
  const min = minToday ? todayIsoLocal() : undefined;

  const lbl = !!label && (
    <Text style={st.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 10 }}>
        {lbl}
        {React.createElement('input', {
          type: 'date',
          value: iso,
          min,
          onChange: (e: any) => { const v = String(e?.target?.value || ''); if (v) onChange(isoToDmy(v)); },
          style: {
            height: 42, border: `1px solid ${iso ? `${T.copper}88` : T.border}`, borderRadius: 10, padding: '0 11px',
            fontSize: 13, fontWeight: 700, color: T.ink, background: T.surface, outline: 'none', width: '100%',
            boxSizing: 'border-box', fontFamily: 'inherit',
          },
        })}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 10 }}>
      {lbl}
      <TouchableOpacity onPress={() => setOpen(true)} style={[st.select, !!iso && { borderColor: `${T.copper}88` }]} activeOpacity={0.7}>
        <Text style={[st.selectText, !value && { color: T.muted, fontWeight: '600' }]}>
          {value ? showDmy(value) : 'Select date'}
        </Text>
        <Icon name="event" size={17} color={T.muted} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={iso ? fromIso(iso) : new Date()}
          mode="date"
          display="default"
          minimumDate={min ? fromIso(min) : undefined}
          onChange={(event: any, date?: Date) => {
            setOpen(false);
            if (event?.type === 'dismissed' || !date) return;
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            onChange(`${d}-${m}-${y}`);
          }}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

export const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  topBar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  topInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 9, minHeight: 52,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
  },
  topTitle: { fontSize: 15.5, fontWeight: '900', color: T.ink },
  topSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  body: { padding: 12, paddingBottom: 40, width: '100%', alignSelf: 'center' },
  bodyWide: { paddingHorizontal: 20, paddingTop: 16 },

  iconBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
  },
  badgeDot: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: T.red, alignItems: 'center', justifyContent: 'center',
  },
  badgeDotText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },

  card: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  cardTitle: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase' },

  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 4 },
  input: {
    minHeight: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface,
    paddingHorizontal: 11, fontSize: 13, fontWeight: '600', color: T.ink,
  },
  fieldErr: { color: T.red, fontSize: 11, fontWeight: '700', marginTop: 3 },
  select: {
    minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border,
    borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11, paddingVertical: 6,
  },
  selectText: { fontSize: 13, fontWeight: '800', color: T.ink },
  selectSub: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  btn: {
    minHeight: 44, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 14,
  },
  btnSmall: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8 },
  btnText: { fontSize: 13.5, fontWeight: '900' },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  pillText: { fontSize: 10.5, fontWeight: '900' },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 8 },
  stateIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  stateText: { fontSize: 12.5, color: T.muted, textAlign: 'center', fontWeight: '600' },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${T.red}12`, borderRadius: 9, padding: 10, marginBottom: 10 },
  errText: { flex: 1, color: T.red, fontSize: 12, fontWeight: '700' },

  banner: { flexDirection: 'row', gap: 8, borderLeftWidth: 3, borderRadius: 10, padding: 11, marginBottom: 10 },
  bannerTitle: { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  bannerText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },

  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8 },
  kvLine: { borderBottomWidth: 1, borderBottomColor: T.hair },
  kvKey: { fontSize: 12.5, fontWeight: '600', color: T.muted, flexShrink: 1 },
  kvVal: { fontSize: 13, fontWeight: '800', color: T.ink, fontFamily: MONO, textAlign: 'right', flexShrink: 1 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '800', color: T.ink },

  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 10,
    backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 11,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  radioIn: { width: 8, height: 8, borderRadius: 4 },
  radioText: { fontSize: 13, fontWeight: '600', color: T.ink },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheetCard: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  sheetSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  sheetSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 7, margin: 12, marginBottom: 8, height: 42,
    borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10,
  },
  sheetSearchInput: { flex: 1, fontSize: 13, color: T.ink, paddingVertical: 0 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 11, minHeight: 52,
    borderBottomWidth: 1, borderBottomColor: T.hair,
  },
  sheetRowTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  sheetRowSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 2 },
});
