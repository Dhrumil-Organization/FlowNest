// FILE: src/components/StoreItemMasterNew/ui.tsx
// Presentation primitives for Store Item Master.
//
// THEME RULE (same as every NEW ERP screen): colours come ONLY from the light
// tokens T / S in '@/src/theme'. The app-wide dark theme (src/core/theme) converts
// them at render time, so nothing here has its own palette or its own dark switch.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Breakpoint, Opt, StatusKind, breakpointFor } from './model';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Width of the screen's own box (sidebar already excluded) + its breakpoint. */
export function useContainerWidth() {
  const { width: win } = useWindowDimensions();
  const [w, setW] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    setW((p) => (p === next ? p : next));
  }, []);
  const width = w || win;
  return { width, bp: breakpointFor(width) as Breakpoint, onLayout };
}

/** Grid cell: percentage width + padding gutters, `span` columns wide. */
export const Cell = ({ cols, span = 1, gutter = 12, children }: { cols: number; span?: number; gutter?: number; children: React.ReactNode }) => (
  <View style={{ width: `${(Math.min(span, cols) / cols) * 100}%` as any, paddingHorizontal: gutter / 2 }}>{children}</View>
);

/** Calls `fn` for Escape / Ctrl+S etc. on web only. */
export function useWebKeys(handler: (e: KeyboardEvent) => void, active = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') return;
    const h = (e: KeyboardEvent) => handler(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handler, active]);
}

/* ------------------------------------------------------------------ */
/* Card / headings / banners                                           */
/* ------------------------------------------------------------------ */

export function Card({
  title,
  subtitle,
  right,
  stack,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Phone: title on its own line, `right` (actions) on a full-width line below it. */
  stack?: boolean;
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[u.card, S.card, style]}>
      {title ? (
        <View style={[u.cardHead, stack && { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap', gap: 12 }]}>
          <View style={stack ? { minWidth: 0 } : { flex: 1, minWidth: 0 }}>
            <Text style={u.cardTitle} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={u.cardSub}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Banner({ tone = 'error', text, action }: { tone?: 'error' | 'info'; text: string; action?: { label: string; onPress: () => void } }) {
  const c = tone === 'error' ? T.red : T.blue;
  return (
    <View style={[u.banner, { backgroundColor: `${c}14`, borderColor: `${c}44` }]} accessibilityRole="alert">
      <Icon name={tone === 'error' ? 'error-outline' : 'info-outline'} size={18} color={c} />
      <Text style={[u.bannerText, { color: c }]}>{text}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={[u.bannerAction, { color: c }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: string; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <View style={u.empty}>
      <View style={u.emptyIcon}>
        <Icon name={icon as any} size={26} color={T.copper} />
      </View>
      <Text style={u.emptyTitle}>{title}</Text>
      {message ? <Text style={u.emptyMsg}>{message}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function StatusPill({ kind, label }: { kind: StatusKind | 'dead' | 'passive'; label: string }) {
  const c = kind === 'active' ? T.green : kind === 'noInward' || kind === 'noIssue' ? T.amber : kind === 'stopped' || kind === 'dead' ? T.red : T.muted;
  return (
    <View style={[u.pill, { backgroundColor: `${c}1A`, borderColor: `${c}55` }]}>
      <View style={[u.pillDot, { backgroundColor: c }]} />
      <Text style={[u.pillText, { color: c }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export type BtnKind = 'primary' | 'ghost' | 'danger' | 'quiet';

export function Btn({
  label,
  icon,
  onPress,
  kind = 'ghost',
  disabled,
  loading,
  flex,
  compact,
  iconOnly,
  accessibilityLabel,
}: {
  label?: string;
  icon?: string;
  onPress: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  loading?: boolean;
  flex?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  accessibilityLabel?: string;
}) {
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? T.red : kind === 'quiet' ? T.copper : T.ink;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={(st: any) => [
        u.btn,
        compact && u.btnCompact,
        iconOnly && { width: compact ? 38 : 44, paddingHorizontal: 0 },
        kind === 'primary' && { backgroundColor: T.copper, borderColor: T.copper },
        kind === 'ghost' && { backgroundColor: T.surface, borderColor: T.border },
        kind === 'danger' && { backgroundColor: T.surface, borderColor: `${T.red}66` },
        kind === 'quiet' && { backgroundColor: 'transparent', borderColor: 'transparent' },
        st.hovered && !off && (kind === 'primary' ? { opacity: 0.92 } : { backgroundColor: T.alt }),
        st.pressed && !off && { opacity: 0.8 },
        off && { opacity: 0.45 },
        flex && { flex: 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon name={icon as any} size={compact ? 17 : 19} color={fg} />
      ) : null}
      {!iconOnly && label ? (
        <Text style={[u.btnText, { color: fg }, compact && { fontSize: 13 }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={u.label}>
      {label}
      {required ? <Text style={{ color: T.red }}> *</Text> : null}
    </Text>
  );
}

export function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Text style={u.error} accessibilityRole="alert">
      {text}
    </Text>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  readOnly,
  required,
  error,
  hint,
  placeholder,
  keyboardType,
  autoCapitalize,
  align,
  maxLength,
  onSubmitEditing,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters';
  align?: 'right';
  maxLength?: number;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <FieldLabel label={label} required={required && !readOnly} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={!readOnly}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        onFocus={() => { setFocus(true); onFocus?.(); }}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        style={[
          u.input,
          { textAlign: align },
          readOnly && { backgroundColor: T.alt, color: T.muted },
          focus && !readOnly && { borderColor: T.copper, borderWidth: 1.5 },
          !!error && { borderColor: T.red },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
        ]}
      />
      {error ? <FieldError text={error} /> : hint ? <Text style={u.hint}>{hint}</Text> : null}
    </View>
  );
}

export function CheckChip({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={(st: any) => [
        u.chip,
        value && { borderColor: T.copper, backgroundColor: `${T.copper}14` },
        st.hovered && !disabled && !value && { backgroundColor: T.alt },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[u.box, value && { backgroundColor: T.copper, borderColor: T.copper }]}>
        {value ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <Text style={u.chipText}>{label}</Text>
    </Pressable>
  );
}

/** Small tap-to-filter pill (browse group chips). */
export function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={(st: any) => [
        u.filterChip,
        active && { backgroundColor: T.nav, borderColor: T.nav },
        st.hovered && !active && { backgroundColor: T.alt },
      ]}
    >
      <Text style={[u.filterChipText, active && { color: '#FFFFFF' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SearchBox({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={u.search}>
      <Icon name="search" size={19} color={T.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={placeholder || 'Search'}
        style={[u.searchInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Icon name="cancel" size={18} color={T.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet: bottom sheet on phones, centred dialog on wide screens       */
/* ------------------------------------------------------------------ */

export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  fill,
  scroll = true,
  headerRight,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Take most of the screen height (browse grid). */
  fill?: boolean;
  scroll?: boolean;
  headerRight?: React.ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const tablet = width >= 560 && width < 760;
  const boxW = size === 'sm' ? 440 : size === 'md' ? 640 : 1080;
  const horizontalInset = tablet ? 16 : 24;

  useWebKeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      },
      [onClose],
    ),
    visible,
  );

  const pad = width < 420 ? 12 : 16;
  // `fill` sheets have a fixed height -> body takes all of it (flex:1).
  // Auto-height sheets -> body only shrinks when the sheet hits its max height (never collapses to 0).
  const bodyFlex: any = fill ? { flex: 1, minHeight: 0 } : { flexGrow: 0, flexShrink: 1, minHeight: 0 };
  const body = scroll ? (
    <ScrollView
      style={bodyFlex}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      contentContainerStyle={{ padding: pad, paddingBottom: 12 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={bodyFlex}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          style={[u.backdrop, { justifyContent: wide || tablet ? 'center' : 'flex-end', alignItems: 'center', paddingHorizontal: wide || tablet ? horizontalInset : 0, paddingVertical: wide || tablet ? 16 : 0 } ]}
          onPress={onClose}
          accessibilityLabel="Close"
        >
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            style={[
              u.sheet,
              S.sheet,
              {
                width: wide ? Math.min(boxW, width - 48) : tablet ? Math.min(boxW, width - 32) : '100%',
                maxHeight: wide ? height - 48 : Math.round(height * 0.92),
                borderRadius: wide || tablet ? 18 : 0,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
              },
              fill && { height: wide ? Math.min(height - 48, 760) : Math.round(height * 0.92) },
            ]}
          >
            {!wide ? <View style={u.grabber} /> : null}
            <View style={u.sheetHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={u.sheetTitle} numberOfLines={1} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={u.cardSub} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              {headerRight}
              <Btn icon="close" iconOnly kind="quiet" compact onPress={onClose} accessibilityLabel="Close" />
            </View>
            {body}
            {footer ? <View style={[u.sheetFoot, !wide && !tablet && { paddingBottom: Platform.OS === 'ios' ? 24 : 14 }]}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* SelectField: searchable picker                                      */
/* ------------------------------------------------------------------ */

export function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  required,
  error,
  placeholder = 'Select…',
  allowClear,
}: {
  label: string;
  value: string;
  options: Opt[];
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { width: winW, height: winH } = useWindowDimensions();
  const desktop = winW >= 760;
  const searchable = options.length > 7;
  // Sheet chrome (grabber + title + paddings + search box) takes ~150-210px; the list gets whatever is left,
  // so the LAST option is always reachable by scrolling - nothing is clipped by the sheet.
  const listMax = Math.max(150, Math.min(desktop ? 380 : 420, Math.round(winH * 0.92) - (searchable ? 200 : 140)));
  const current = options.find((o) => o.id === value);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View>
      <FieldLabel label={label} required={required && !disabled} />
      <Pressable
        disabled={disabled}
        onPress={() => {
          setQ('');
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label || 'not selected'}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={(st: any) => [
          u.input,
          u.selectRow,
          disabled && { backgroundColor: T.alt },
          st.hovered && !disabled && { borderColor: T.muted },
          !!error && { borderColor: T.red },
        ]}
      >
        <Text style={[u.selectText, !current && { color: T.muted }, disabled && current && { color: T.muted }]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Icon name="expand-more" size={20} color={T.muted} />
      </Pressable>
      <FieldError text={error} />

      <Sheet visible={open} title={label} onClose={() => setOpen(false)} size="sm" scroll={false}>
        <View style={{ padding: winW < 420 ? 12 : 16, paddingBottom: 8, flexShrink: 1, minHeight: 0 }}>
          {searchable ? (
            <View style={{ marginBottom: 10 }}>
              {/* autofocus only on desktop - on phones it pops the keyboard and hides half of the list */}
              <SearchBox value={q} onChangeText={setQ} placeholder={`Search ${label.toLowerCase()}`} autoFocus={Platform.OS === 'web' && desktop} />
            </View>
          ) : null}
          <FlatList
            data={list}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0, flexShrink: 1, maxHeight: listMax }}
            contentContainerStyle={{ paddingBottom: 6 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
            ListHeaderComponent={
              allowClear && value ? (
                <Pressable onPress={() => pick('')} style={u.opt} accessibilityRole="button">
                  <Text style={{ color: T.muted, fontSize: 15, fontWeight: '600' }}>Clear selection</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={<Text style={u.noMatch}>Nothing matches “{q}”.</Text>}
            renderItem={({ item }) => {
              const sel = item.id === value;
              return (
                <Pressable
                  onPress={() => pick(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  style={(st: any) => [u.opt, sel && { backgroundColor: `${T.copper}14` }, st.hovered && !sel && { backgroundColor: T.alt }]}
                >
                  <Text style={{ color: sel ? T.copper : T.ink, fontSize: 15, fontWeight: sel ? '700' : '500', flex: 1 }} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {sel ? <Icon name="check" size={18} color={T.copper} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export const u = StyleSheet.create({
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
  cardSub: { fontSize: 12.5, fontWeight: '500', color: T.muted, marginTop: 2 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  bannerAction: { fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: `${T.copper}14`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink, textAlign: 'center' },
  emptyMsg: { fontSize: 13, color: T.muted, textAlign: 'center', marginTop: 4, maxWidth: 360 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11.5, fontWeight: '700' },

  btn: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnCompact: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 14, fontWeight: '700' },

  label: { fontSize: 12, fontWeight: '600', color: T.muted, marginBottom: 6 },
  hint: { fontSize: 11.5, color: T.muted, marginTop: 4 },
  error: { fontSize: 12, fontWeight: '600', color: T.red, marginTop: 4 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12, fontSize: 15, color: T.ink },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectText: { flex: 1, fontSize: 15, color: T.ink },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  chipText: { fontSize: 14, fontWeight: '600', color: T.ink },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: T.muted, alignItems: 'center', justifyContent: 'center' },
  filterChip: { borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 999, paddingHorizontal: 13, minHeight: 34, justifyContent: 'center' },
  filterChipText: { fontSize: 12.5, fontWeight: '700', color: T.ink },

  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, color: T.ink, paddingVertical: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.55)' },
  sheet: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: T.ink },
  sheetFoot: { borderTopWidth: 1, borderTopColor: T.hair, padding: 12, backgroundColor: T.sub },
  opt: { minHeight: 48, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  noMatch: { color: T.muted, textAlign: 'center', padding: 18, fontSize: 14 },
});
