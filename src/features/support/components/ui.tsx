// FILE: src/features/support/components/ui.tsx
// Small building blocks of the Support Desk screens — same look as the rest of FlowNest
// (src/theme tokens; the dark theme converts them automatically).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps,
  TouchableOpacity, useWindowDimensions, View, ViewStyle,
} from 'react-native';
import { create } from 'zustand';
import { colorFor, initials, priorityOf, statusOf, typeOf, ymdToDate, toYmd } from '../model';

export const WEB = Platform.OS === 'web';
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;
const noOutline = WEB ? ({ outlineStyle: 'none' } as any) : null;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, phone: width < 700, wide: width >= 1100, tablet: width >= 700 && width < 1100 };
}

/* ------------------------------- toast -------------------------------- */
type ToastState = { msg: string; tone: 'ok' | 'err' | 'info'; at: number; show: (msg: string, tone?: 'ok' | 'err' | 'info') => void };
export const useToast = create<ToastState>((set) => ({ msg: '', tone: 'info', at: 0, show: (msg, tone = 'info') => set({ msg, tone, at: Date.now() }) }));
export const toast = (msg: string, tone: 'ok' | 'err' | 'info' = 'info') => useToast.getState().show(msg, tone);

export function ToastHost() {
  const { msg, tone, at } = useToast();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!msg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), tone === 'err' ? 4500 : 2600);
    return () => clearTimeout(t);
  }, [msg, at, tone]);
  if (!visible || !msg) return null;
  const c = tone === 'err' ? T.red : tone === 'ok' ? T.green : T.nav;
  return (
    <View pointerEvents="none" style={st.toastWrap}>
      <View style={[st.toast, { backgroundColor: c }]}>
        <Icon name={tone === 'err' ? 'error-outline' : tone === 'ok' ? 'check-circle' : 'info-outline'} size={17} color="#fff" />
        <Text style={st.toastText} numberOfLines={3}>{msg}</Text>
      </View>
    </View>
  );
}

/* ------------------------------ atoms --------------------------------- */
export function Avatar({ name, id, color, size = 26 }: { name: string; id?: number; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color || colorFor(id || name.length), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>{initials(name)}</Text>
    </View>
  );
}

export function Pill({ label, color, icon, small, solid }: { label: string; color: string; icon?: string; small?: boolean; solid?: boolean }) {
  return (
    <View style={[st.pill, small && st.pillSmall, { backgroundColor: solid ? color : `${color}16`, borderColor: `${color}${solid ? 'ff' : '44'}` }]}>
      {icon ? <Icon name={icon as any} size={small ? 11 : 13} color={solid ? '#fff' : color} /> : null}
      <Text style={[st.pillText, small && { fontSize: 10 }, { color: solid ? '#fff' : color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export const StatusPill = ({ status, client, small }: { status: string; client?: boolean; small?: boolean }) => {
  const s = statusOf(status);
  return <Pill label={client ? s.client : s.label} color={s.color} icon={s.icon} small={small} />;
};
export const TypePill = ({ type, small }: { type: string; small?: boolean }) => {
  const t = typeOf(type);
  return <Pill label={t.label} color={t.color} icon={t.icon} small={small} />;
};
export const PriorityPill = ({ p, small }: { p: number; small?: boolean }) => {
  const x = priorityOf(p);
  return <Pill label={x.label} color={x.color} icon={x.icon} small={small} solid={p === 4} />;
};

export function IconBtn({ icon, onPress, label, color = T.nav, size = 20, disabled, badge, style, tone }: {
  icon: string; onPress?: () => void; label: string; color?: string; size?: number; disabled?: boolean; badge?: number; style?: ViewStyle; tone?: 'dark';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[st.iconBtn, tone === 'dark' && st.iconBtnDark, disabled && { opacity: 0.45 }, style]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Icon name={icon as any} size={size} color={tone === 'dark' ? '#fff' : color} />
      {badge ? <View style={st.badge}><Text style={st.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
    </TouchableOpacity>
  );
}

export function Btn({ title, onPress, icon, kind = 'primary', disabled, busy, small, style }: {
  title: string; onPress?: () => void; icon?: string; kind?: 'primary' | 'ghost' | 'danger' | 'dark' | 'success'; disabled?: boolean; busy?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? T.copper : kind === 'danger' ? T.red : kind === 'dark' ? T.nav : kind === 'success' ? T.green : T.surface;
  const fg = kind === 'ghost' ? T.nav : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || busy}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[st.btn, small && st.btnSmall, { backgroundColor: bg }, kind === 'ghost' && st.btnGhost, (disabled || busy) && { opacity: 0.55 }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon as any} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[st.btnText, small && { fontSize: 12.5 }, { color: fg }]} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, required, hint, error, children, style }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={st.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      {children}
      {error ? <Text style={st.error}>{error}</Text> : hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { icon?: string; right?: React.ReactNode; compact?: boolean }) {
  const { icon, right, style, multiline, compact, ...rest } = props;
  return (
    <View style={[st.inputBox, multiline && { alignItems: 'flex-start', minHeight: compact ? 44 : 96, paddingVertical: compact ? 2 : 8 }]}>
      {icon ? <Icon name={icon as any} size={18} color={T.muted} style={multiline ? { marginTop: 2 } : undefined} /> : null}
      <TextInput
        placeholderTextColor={T.muted}
        style={[st.input, multiline && { minHeight: compact ? 38 : 80, textAlignVertical: 'top' }, noOutline, style]}
        multiline={multiline}
        {...rest}
      />
      {right}
    </View>
  );
}

/** single choice as a row of chips */
export function Segmented<V extends string | number>({ value, options, onChange, scroll }: { value: V; options: { value: V; label: string; icon?: string; color?: string }[]; onChange: (v: V) => void; scroll?: boolean }) {
  return (
    <View style={[st.seg, scroll && { flexWrap: 'wrap' }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)} style={[st.segBtn, on && { backgroundColor: o.color || T.nav, borderColor: o.color || T.nav }]} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: on }}>
            {o.icon ? <Icon name={o.icon as any} size={15} color={on ? '#fff' : o.color || T.nav} /> : null}
            <Text style={[st.segText, on && { color: '#fff' }]} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={st.empty}>
      <View style={st.emptyIcon}><Icon name={icon as any} size={28} color={T.copper} /></View>
      <Text style={st.emptyTitle}>{title}</Text>
      {text ? <Text style={st.emptyText}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </View>
  );
}

/* ---------------------- panel / dialog (responsive) ---------------------- */
/** wide screens: panel on the right side · phones: full screen */
export function Panel({ visible, onClose, title, subtitle, children, width = 560, right, footer }: {
  visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; width?: number; right?: React.ReactNode; footer?: React.ReactNode;
}) {
  const { phone, width: W } = useLayout();
  return (
    <Modal visible={visible} transparent animationType={phone ? 'slide' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View style={[st.backdrop, phone && { backgroundColor: T.bg }]}>
        {!phone ? <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" /> : null}
        <View style={[st.panel, phone ? st.panelPhone : { width: Math.min(width, W - 40) }]}>
          <View style={st.panelHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.panelTitle} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={st.panelSub} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {right}
            <IconBtn icon="close" label="Close" onPress={onClose} />
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          {footer ? <View style={st.panelFoot}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** small centered dialog */
export function Dialog({ visible, onClose, title, children, footer, width = 440 }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  const { width: W } = useLayout();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[st.backdrop, { alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[st.dialog, { width: Math.min(width, W - 32) }]}>
          <View style={[st.panelHead, { paddingHorizontal: 16 }]}>
            <Text style={[st.panelTitle, { flex: 1 }]} numberOfLines={1}>{title}</Text>
            <IconBtn icon="close" label="Close" onPress={onClose} />
          </View>
          <View style={{ padding: 16 }}>{children}</View>
          {footer ? <View style={[st.panelFoot, { paddingHorizontal: 16 }]}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------ select -------------------------------- */
export type Opt = { value: string; label: string; sub?: string; icon?: string; color?: string; avatar?: { name: string; id?: number; color?: string } };

export function Select({ value, options, onChange, placeholder = 'Select', title, icon, disabled, searchable = true, clearable }: {
  value: string; options: Opt[]; onChange: (v: string) => void; placeholder?: string; title: string; icon?: string; disabled?: boolean; searchable?: boolean; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const close = () => { setOpen(false); setQ(''); };
  return (
    <>
      <TouchableOpacity style={[st.selectBox, disabled && { opacity: 0.6 }]} onPress={() => setOpen(true)} disabled={disabled} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={title}>
        {sel?.avatar ? <Avatar {...sel.avatar} size={22} /> : <Icon name={(sel?.icon || icon || 'arrow-drop-down-circle') as any} size={18} color={sel?.color || T.copper} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.selectText, !sel && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>{sel ? sel.label : placeholder}</Text>
          {sel?.sub ? <Text style={st.selectSub} numberOfLines={1}>{sel.sub}</Text> : null}
        </View>
        {clearable && sel ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Clear ${title}`}>
            <Icon name="cancel" size={17} color={T.muted} />
          </TouchableOpacity>
        ) : <Icon name="keyboard-arrow-down" size={20} color={T.muted} />}
      </TouchableOpacity>
      <Dialog visible={open} onClose={close} title={title} width={480}>
        {searchable && options.length > 7 ? (
          <View style={{ marginBottom: 10 }}><Input icon="search" value={q} onChangeText={setQ} placeholder={`Search ${title.toLowerCase()}…`} autoFocus={WEB} /></View>
        ) : null}
        <FlatList
          data={shown}
          keyExtractor={(o) => o.value}
          style={{ maxHeight: 420 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => {
            const on = item.value === value;
            return (
              <TouchableOpacity style={[st.optRow, on && { backgroundColor: `${T.copper}12` }]} onPress={() => { onChange(item.value); close(); }} activeOpacity={0.75}>
                {item.avatar ? <Avatar {...item.avatar} size={26} /> : item.icon ? <Icon name={item.icon as any} size={19} color={item.color || T.nav} /> : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[st.optText, on && { color: T.copper }]} numberOfLines={1}>{item.label}</Text>
                  {item.sub ? <Text style={st.selectSub} numberOfLines={1}>{item.sub}</Text> : null}
                </View>
                {on ? <Icon name="check" size={18} color={T.copper} /> : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={[st.hint, { textAlign: 'center', paddingVertical: 20 }]}>Nothing found</Text>}
        />
      </Dialog>
    </>
  );
}

/* ---------------------------- date (yyyymmdd) ---------------------------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function DateInput({ value, onChange, placeholder = 'No date', title = 'Date', clearable = true }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; title?: string; clearable?: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = ymdToDate(value) || new Date();
  const [view, setView] = useState(new Date(cur.getFullYear(), cur.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();
  const offset = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const today = toYmd(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => { const d = i - offset + 1; return d >= 1 && d <= dim ? toYmd(new Date(y, m, d)) : null; });
  const label = value ? (() => { const d = ymdToDate(value)!; return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; })() : '';
  const pick = (v: number | null) => { onChange(v); setOpen(false); };
  return (
    <>
      <TouchableOpacity style={st.selectBox} onPress={() => { const c = ymdToDate(value) || new Date(); setView(new Date(c.getFullYear(), c.getMonth(), 1)); setOpen(true); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={title}>
        <Icon name="event" size={18} color={value ? T.copper : T.muted} />
        <Text style={[st.selectText, !value && { color: T.muted, fontWeight: '600' }, { flex: 1 }]} numberOfLines={1}>{label || placeholder}</Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Clear ${title}`}><Icon name="cancel" size={17} color={T.muted} /></TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      <Dialog visible={open} onClose={() => setOpen(false)} title={title} width={360}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {[['Today', 0], ['Tomorrow', 1], ['+7 days', 7]].map(([l, n]) => (
            <TouchableOpacity key={String(l)} style={st.quick} onPress={() => { const d = new Date(); d.setDate(d.getDate() + Number(n)); pick(toYmd(d)); }}>
              <Text style={st.quickText}>{l}</Text>
            </TouchableOpacity>
          ))}
          {clearable ? <TouchableOpacity style={st.quick} onPress={() => pick(null)}><Text style={[st.quickText, { color: T.red }]}>Clear</Text></TouchableOpacity> : null}
        </View>
        <View style={st.calHead}>
          <IconBtn icon="chevron-left" label="Previous month" onPress={() => setView(new Date(y, m - 1, 1))} />
          <Text style={st.calTitle}>{MONTHS[m]} {y}</Text>
          <IconBtn icon="chevron-right" label="Next month" onPress={() => setView(new Date(y, m + 1, 1))} />
        </View>
        <View style={st.calGrid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={st.calDow}>{d}</Text>)}
          {cells.map((c, i) => (
            <TouchableOpacity key={i} disabled={!c} style={st.calCell} onPress={() => c && pick(c)}>
              {c ? (
                <View style={[st.calDay, c === value && { backgroundColor: T.copper }, c === today && c !== value && { borderWidth: 1, borderColor: T.copper }]}>
                  <Text style={[st.calDayText, c === value && { color: '#fff', fontWeight: '900' }]}>{Number(String(c).slice(6, 8))}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </Dialog>
    </>
  );
}

export const LiveDot = ({ status }: { status: string }) => {
  const c = status === 'live' ? '#22c55e' : status === 'polling' ? T.amber : status === 'offline' ? T.red : '#94a3b8';
  const label = status === 'live' ? 'Live' : status === 'polling' ? 'Auto-refresh' : status === 'offline' ? 'Offline' : 'Connecting';
  return (
    <View style={st.live} accessibilityLabel={`Updates: ${label}`}>
      <View style={[st.liveDot, { backgroundColor: c }]} />
      <Text style={st.liveText}>{label}</Text>
    </View>
  );
};

export const st = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', zIndex: 9999 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 520, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  pillSmall: { height: 20, paddingHorizontal: 6, borderRadius: 10, gap: 3 },
  pillText: { fontSize: 11.5, fontWeight: '800' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  iconBtnDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#2A4055' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: T.nav },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
  btn: { height: 42, paddingHorizontal: 16, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnSmall: { height: 34, paddingHorizontal: 12, borderRadius: 9, gap: 5 },
  btnGhost: { borderWidth: 1, borderColor: T.border },
  btnText: { fontSize: 13.5, fontWeight: '800' },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  hint: { fontSize: 11.5, color: T.muted, marginTop: 4, fontWeight: '600' },
  error: { fontSize: 11.5, color: T.red, marginTop: 4, fontWeight: '700' },
  inputBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 11 },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, paddingVertical: 9, fontWeight: '600' },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 11, borderRadius: 17, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  segText: { fontSize: 12.5, fontWeight: '800', color: T.nav },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 12, textAlign: 'center' },
  emptyText: { fontSize: 12.5, color: T.muted, marginTop: 5, textAlign: 'center', fontWeight: '600', maxWidth: 420 },
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.45)', alignItems: 'flex-end' },
  panel: { flex: 1, backgroundColor: T.bg, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, elevation: 16 },
  panelPhone: { width: '100%', paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? 28 : 0 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  panelTitle: { fontSize: 16, fontWeight: '900', color: T.nav },
  panelSub: { fontSize: 11.5, color: T.muted, marginTop: 1, fontWeight: '700' },
  panelFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
  dialog: { backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden', maxHeight: '90%' as any },
  selectBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 11, paddingVertical: 6 },
  selectText: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  selectSub: { fontSize: 11, color: T.muted, fontWeight: '600', marginTop: 1 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10 },
  optText: { fontSize: 13.5, fontWeight: '700', color: T.ink },
  quick: { height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: T.alt, justifyContent: 'center' },
  quickText: { fontSize: 12, fontWeight: '800', color: T.nav },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  calTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDow: { width: `${100 / 7}%` as any, textAlign: 'center', fontSize: 11, fontWeight: '800', color: T.muted, paddingVertical: 4 },
  calCell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 2 },
  calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calDayText: { fontSize: 13, fontWeight: '700', color: T.ink },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { color: '#cbd5e1', fontSize: 10.5, fontWeight: '800' },
});
