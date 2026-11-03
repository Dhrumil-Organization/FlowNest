// FILE: src/components/MergeMasterDataNEW/ui.tsx
// Presentation primitives for Merge Master Data (phone · tablet · desktop web).
//
// THEME RULE (same as every NEW ERP screen): colours come ONLY from the light tokens T / S in
// '@/src/theme'. The app-wide dark theme converts them at render time.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { Breakpoint, PropertyOpt, breakpointFor, filterRows } from './model';

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

/** Runs `handler` on window keydown (web only) — Escape to close dialogs, etc. */
export function useWebKeys(handler: (e: KeyboardEvent) => void, active = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') return;
    const h = (e: KeyboardEvent) => handler(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handler, active]);
}

/** Debounced copy of a value (used by the panel search boxes on very long lists). */
export function useDebounced<V>(value: V, ms = 180): V {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Card · buttons                                                      */
/* ------------------------------------------------------------------ */

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[u.card, S.card, style]}>{children}</View>;
}

export function StepLabel({ n, text, hint }: { n: number; text: string; hint?: string }) {
  return (
    <View style={u.stepRow}>
      <View style={u.stepDot}><Text style={u.stepDotText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={u.stepText}>{text}</Text>
        {hint ? <Text style={u.stepHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

type BtnProps = {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Icon>['name'];
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
};
export function Btn({ label, onPress, icon, variant = 'primary', loading, disabled, fullWidth, testID }: BtnProps) {
  const off = !!disabled || !!loading;
  const solid = variant !== 'ghost';
  const bg = variant === 'danger' ? T.red : variant === 'primary' ? T.copper : 'transparent';
  const fg = solid ? '#FFFFFF' : T.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        u.btn,
        { backgroundColor: bg, borderColor: solid ? bg : T.border },
        fullWidth && { alignSelf: 'stretch' },
        off && { opacity: 0.5 },
        (pressed || hovered) && !off && { opacity: 0.88 },
        Platform.OS === 'web' && ({ cursor: off ? 'not-allowed' : 'pointer' } as any),
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[u.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Banner (success / error)                                            */
/* ------------------------------------------------------------------ */

export type BannerState = { kind: 'success' | 'error' | 'info'; text: string; id: number } | null;

export function Banner({ banner, onClose }: { banner: BannerState; onClose: () => void }) {
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(onClose, banner.kind === 'error' ? 9000 : 5000);
    return () => clearTimeout(t);
  }, [banner, onClose]);
  if (!banner) return null;
  const tone = banner.kind === 'success' ? T.green : banner.kind === 'error' ? T.red : T.blue;
  const icon = banner.kind === 'success' ? 'check-circle' : banner.kind === 'error' ? 'error-outline' : 'info-outline';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[u.banner, { borderColor: tone, backgroundColor: T.surface }]}
    >
      <View style={[u.bannerBar, { backgroundColor: tone }]} />
      <Icon name={icon} size={22} color={tone} />
      <Text style={u.bannerText} selectable>{banner.text}</Text>
      <Pressable onPress={onClose} accessibilityLabel="Dismiss message" hitSlop={10} style={u.bannerClose}>
        <Icon name="close" size={18} color={T.muted} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Searchable dropdown (Code | Name columns, like the desktop ERP)     */
/* ------------------------------------------------------------------ */

type SelectProps = {
  label: string;
  value: string;
  options: PropertyOpt[];
  onChange: (code: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onRetry?: () => void;
  bp: Breakpoint;
};

export function PropertySelect({ label, value, options, onChange, placeholder = 'Select', loading, disabled, error, onRetry, bp }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 120);
  const selected = useMemo(() => options.find((o) => o.code === value), [options, value]);
  const list = useMemo(() => filterRows(options.map((o) => ({ ...o, address: '' })), dq), [options, dq]);
  const sheet = bp === 'phone';
  const { height } = useWindowDimensions();

  const close = useCallback(() => { setOpen(false); setQ(''); }, []);
  useWebKeys(useCallback((e) => { if (e.key === 'Escape') close(); }, [close]), open);

  const pick = (code: string) => { onChange(code); close(); };

  return (
    <View style={{ alignSelf: 'stretch' }}>
      <Text style={u.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        disabled={disabled || loading}
        onPress={() => (error && onRetry && !options.length ? onRetry() : setOpen(true))}
        style={({ hovered }: any) => [
          u.select,
          error ? { borderColor: T.red } : null,
          hovered && !disabled ? { borderColor: T.copper } : null,
          disabled && { opacity: 0.55 },
          Platform.OS === 'web' && ({ cursor: disabled ? 'not-allowed' : 'pointer' } as any),
        ]}
      >
        {selected ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={u.codePill}><Text style={u.codePillText}>{selected.code}</Text></View>
            <Text style={u.selectValue} numberOfLines={1}>{selected.name}</Text>
          </View>
        ) : (
          <Text style={[u.selectValue, { color: T.muted, flex: 1 }]} numberOfLines={1}>
            {loading ? 'Loading…' : error && !options.length ? 'Tap to retry' : placeholder}
          </Text>
        )}
        {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="expand-more" size={22} color={T.muted} />}
      </Pressable>
      {error ? <Text style={u.errText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType={sheet ? 'slide' : 'fade'} onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[u.overlay, sheet ? { justifyContent: 'flex-end' } : { justifyContent: 'center', alignItems: 'center' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={[u.picker, S.sheet, sheet ? u.pickerSheet : u.pickerDialog, { maxHeight: Math.min(height * (sheet ? 0.85 : 0.75), 620) }]}>
            <View style={u.pickerHead}>
              <Text style={u.pickerTitle}>{label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <Icon name="close" size={22} color={T.ink} />
              </Pressable>
            </View>
            <View style={u.searchBox}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search code or name"
                placeholderTextColor={T.muted}
                autoFocus={Platform.OS === 'web'}
                autoCorrect={false}
                autoCapitalize="none"
                style={[u.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                accessibilityLabel="Search"
              />
              {q ? (
                <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search"><Icon name="cancel" size={18} color={T.muted} /></Pressable>
              ) : null}
            </View>
            <View style={u.thead}>
              <Text style={[u.th, { width: 64 }]}>Code</Text>
              <Text style={[u.th, { flex: 1 }]}>Name</Text>
            </View>
            <FlatList
              data={list}
              keyExtractor={(i) => i.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={30}
              windowSize={7}
              ListEmptyComponent={<Text style={u.emptyText}>{options.length ? 'No match found' : 'No data'}</Text>}
              renderItem={({ item }) => {
                const on = item.code === value;
                return (
                  <Pressable
                    onPress={() => pick(item.code)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: on }}
                    style={({ hovered, pressed }: any) => [u.optRow, on && { backgroundColor: T.copper }, !on && (hovered || pressed) && { backgroundColor: T.alt }]}
                  >
                    <Text style={[u.optCode, on && { color: '#FFFFFF' }]}>{item.code}</Text>
                    <Text style={[u.optName, on && { color: '#FFFFFF' }]} numberOfLines={2}>{item.name}</Text>
                    {on ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Simple action dropdown (Passive / Delete)                           */
/* ------------------------------------------------------------------ */

export function ActionSelect<V extends string>({
  label, value, options, onChange, disabled, placeholder = 'Select action',
}: {
  label: string;
  value: V | '';
  options: ReadonlyArray<{ value: V; label: string; hint?: string; danger?: boolean }>;
  onChange: (v: V) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const close = useCallback(() => setOpen(false), []);
  useWebKeys(useCallback((e) => { if (e.key === 'Escape') close(); }, [close]), open);
  return (
    <View style={{ alignSelf: 'stretch' }}>
      <Text style={u.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ hovered }: any) => [
          u.select,
          selected?.danger ? { borderColor: T.red } : null,
          hovered && !disabled ? { borderColor: T.copper } : null,
          disabled && { opacity: 0.55 },
          Platform.OS === 'web' && ({ cursor: disabled ? 'not-allowed' : 'pointer' } as any),
        ]}
      >
        <Text style={[u.selectValue, { flex: 1 }, !selected && { color: T.muted }, selected?.danger && { color: T.red, fontWeight: '700' }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="expand-more" size={22} color={T.muted} />
      </Pressable>
      {selected?.hint ? <Text style={[u.hint, selected.danger && { color: T.red }]}>{selected.hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={[u.overlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={[u.picker, S.sheet, u.pickerDialog, { maxWidth: 420 }]}>
            <View style={u.pickerHead}>
              <Text style={u.pickerTitle}>{label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close"><Icon name="close" size={22} color={T.ink} /></Pressable>
            </View>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => { onChange(o.value); close(); }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                  style={({ hovered, pressed }: any) => [u.actionRow, on && { backgroundColor: T.sub }, (hovered || pressed) && { backgroundColor: T.alt }]}
                >
                  <Icon name={o.danger ? 'delete-forever' : 'block'} size={22} color={o.danger ? T.red : T.amber} />
                  <View style={{ flex: 1 }}>
                    <Text style={[u.optName, o.danger && { color: T.red }]}>{o.label}</Text>
                    {o.hint ? <Text style={u.hint}>{o.hint}</Text> : null}
                  </View>
                  {on ? <Icon name="check" size={20} color={T.copper} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  visible, title, subtitle, danger, yesLabel = 'Yes', noLabel = 'No', busy, requireAck, children, onConfirm, onCancel,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  danger?: boolean;
  /** Text of the YES button (the one that calls the API). */
  yesLabel?: string;
  /** Text of the NO button (just closes the box, nothing is sent). */
  noLabel?: string;
  busy?: boolean;
  /** Text of a checkbox the user must tick before YES is enabled (used for irreversible Delete). */
  requireAck?: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const sheet = width < 600; // phone -> bottom sheet, tablet / web -> centred card
  const [ack, setAck] = useState(false);
  useEffect(() => { if (!visible) setAck(false); }, [visible]);
  const close = useCallback(() => { if (!busy) onCancel(); }, [busy, onCancel]);
  useWebKeys(useCallback((e) => { if (e.key === 'Escape') close(); }, [close]), visible);
  const tone = danger ? T.red : T.copper;
  const yesOff = !!requireAck && !ack;

  const noBtn = <Btn label={noLabel} icon="close" variant="ghost" onPress={close} disabled={busy} fullWidth={sheet} testID="confirm-no" />;
  const yesBtn = (
    <Btn
      label={yesLabel}
      icon="check"
      variant={danger ? 'danger' : 'primary'}
      onPress={onConfirm}
      loading={busy}
      disabled={yesOff}
      fullWidth={sheet}
      testID="confirm-yes"
    />
  );

  return (
    <Modal visible={visible} transparent animationType={sheet ? 'slide' : 'fade'} onRequestClose={close} statusBarTranslucent>
      <View style={[u.overlay, sheet ? { justifyContent: 'flex-end' } : { justifyContent: 'center', alignItems: 'center' }]}>
        {/* tapping outside = No */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={noLabel} />
        <View
          accessibilityViewIsModal
          accessibilityRole={Platform.OS === 'web' ? ('alertdialog' as any) : undefined}
          style={[
            u.picker,
            S.sheet,
            sheet ? u.pickerSheet : u.confirmCard,
            { maxHeight: height * (sheet ? 0.92 : 0.88), borderTopWidth: 4, borderTopColor: tone },
          ]}
        >
          {sheet ? <View style={u.grabber} /> : null}
          <View style={u.confirmHead}>
            <View style={[u.confirmIcon, { backgroundColor: tone }]}>
              <Icon name={danger ? 'warning' : 'help-outline'} size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={u.confirmTitle} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={u.confirmSub}>{subtitle}</Text> : null}
            </View>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8, gap: 12 }} showsVerticalScrollIndicator={false}>
            {children}
            {requireAck ? (
              <Pressable
                onPress={() => setAck((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ack }}
                style={u.ackRow2}
              >
                <Icon name={ack ? 'check-box' : 'check-box-outline-blank'} size={22} color={ack ? T.red : T.muted} />
                <Text style={u.ackText}>{requireAck}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={[u.confirmFoot2, sheet ? { flexDirection: 'column', paddingBottom: Platform.OS === 'ios' ? 30 : 18 } : { flexDirection: 'row', justifyContent: 'flex-end' }]}>
            {sheet ? <>{yesBtn}{noBtn}</> : <>{noBtn}{yesBtn}</>}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Result dialog (success / error of the Save / Merge API)             */
/* ------------------------------------------------------------------ */

export function ResultDialog({
  visible, kind, title, message, details, children, primaryLabel, onPrimary, secondaryLabel, onSecondary,
}: {
  visible: boolean;
  kind: 'success' | 'error';
  title: string;
  /** The text the SERVER sent — shown as it is. */
  message: string;
  /** Technical text (SQL / exception) — hidden behind "Technical details". */
  details?: string;
  children?: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const sheet = width < 600;
  const ok = kind === 'success';
  const tone = ok ? T.green : T.red;
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { setShowDetails(false); setCopied(false); pop.setValue(0); return; }
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [visible, pop]);

  useWebKeys(useCallback((e) => { if (e.key === 'Escape') onPrimary(); }, [onPrimary]), visible);

  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!(navigator as any).clipboard;
  const copy = async () => {
    try {
      await (navigator as any).clipboard.writeText(`${message}${details ? `\n\n${details}` : ''}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — ignore */ }
  };

  const primary = <Btn label={primaryLabel} icon={ok ? 'check' : 'close'} variant={ok ? 'primary' : 'ghost'} onPress={onPrimary} fullWidth={sheet} testID="result-primary" />;
  const secondary = secondaryLabel && onSecondary
    ? <Btn label={secondaryLabel} icon="refresh" variant="primary" onPress={onSecondary} fullWidth={sheet} testID="result-secondary" />
    : null;

  return (
    <Modal visible={visible} transparent animationType={sheet ? 'slide' : 'fade'} onRequestClose={onPrimary} statusBarTranslucent>
      <View style={[u.overlay, sheet ? { justifyContent: 'flex-end' } : { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onPrimary} accessibilityLabel={primaryLabel} />
        <View
          accessibilityViewIsModal
          accessibilityLiveRegion="assertive"
          accessibilityRole={Platform.OS === 'web' ? ('alertdialog' as any) : undefined}
          style={[u.picker, S.sheet, sheet ? u.pickerSheet : u.confirmCard, { maxHeight: height * (sheet ? 0.92 : 0.88), borderTopWidth: 4, borderTopColor: tone }]}
        >
          {sheet ? <View style={u.grabber} /> : null}
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={u.resBody} showsVerticalScrollIndicator={false}>
            <Animated.View style={[u.resRing, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 48, backgroundColor: tone, opacity: 0.14 }]} />
              <View style={[u.resCore, { backgroundColor: tone }]}>
                <Icon name={ok ? 'check' : 'priority-high'} size={36} color="#FFFFFF" />
              </View>
            </Animated.View>

            <Text style={u.resTitle} accessibilityRole="header">{title}</Text>
            <Text style={[u.resMsg, !ok && { color: T.red }]} selectable>{message}</Text>

            {children ? <View style={{ alignSelf: 'stretch', gap: 12 }}>{children}</View> : null}

            {details ? (
              <View style={u.resDetails}>
                <Pressable onPress={() => setShowDetails((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showDetails }} style={u.resDetailsHead}>
                  <Icon name={showDetails ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
                  <Text style={u.resDetailsTitle}>Technical details</Text>
                  {canCopy && showDetails ? (
                    <Pressable onPress={copy} hitSlop={8} accessibilityLabel="Copy details" style={u.resCopy}>
                      <Icon name={copied ? 'check' : 'content-copy'} size={14} color={copied ? T.green : T.muted} />
                      <Text style={u.resCopyText}>{copied ? 'Copied' : 'Copy'}</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
                {showDetails ? (
                  <ScrollView style={{ maxHeight: 170 }} nestedScrollEnabled>
                    <Text style={u.resDetailsText} selectable>{details}</Text>
                  </ScrollView>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View style={[u.confirmFoot2, sheet ? { flexDirection: 'column', paddingBottom: Platform.OS === 'ios' ? 30 : 18 } : { flexDirection: 'row', justifyContent: 'flex-end' }]}>
            {sheet ? <>{secondary}{primary}</> : <>{primary}{secondary}</>}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton rows                                                       */
/* ------------------------------------------------------------------ */

export function SkeletonRows({ count = 8, height = 46 }: { count?: number; height?: number }) {
  return (
    <View accessibilityLabel="Loading" style={{ paddingHorizontal: 10, paddingTop: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ height, justifyContent: 'center' }}>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: T.alt, width: `${55 + ((i * 17) % 40)}%` }} />
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export const u = StyleSheet.create({
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  stepText: { color: T.ink, fontSize: 14, fontWeight: '800' },
  stepHint: { color: T.muted, fontSize: 12, marginTop: 1 },

  btn: { minHeight: 46, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 14, fontWeight: '800' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingRight: 10, paddingLeft: 16, overflow: 'hidden' },
  bannerBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  bannerText: { flex: 1, color: T.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  bannerClose: { padding: 4 },

  fieldLabel: { color: T.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  select: { minHeight: 48, borderWidth: 1.5, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectValue: { color: T.ink, fontSize: 14, fontWeight: '600' },
  codePill: { backgroundColor: T.alt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  codePillText: { color: T.ink, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  errText: { color: T.red, fontSize: 12, marginTop: 5 },
  hint: { color: T.muted, fontSize: 12, marginTop: 5, lineHeight: 16 },

  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.55)' },
  picker: { backgroundColor: T.surface, overflow: 'hidden' },
  pickerSheet: { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerDialog: { width: '92%', maxWidth: 540, borderRadius: 16 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  pickerTitle: { color: T.ink, fontSize: 16, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, minHeight: 44, backgroundColor: T.sub },
  searchInput: { flex: 1, color: T.ink, fontSize: 14, paddingVertical: 8 },
  thead: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 7, backgroundColor: T.sub, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair },
  th: { color: T.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, minHeight: 48, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hair },
  optCode: { width: 64, color: T.muted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  optName: { flex: 1, color: T.ink, fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hair },
  emptyText: { color: T.muted, textAlign: 'center', padding: 24, fontSize: 13 },

  confirmCard: { width: '92%', maxWidth: 540, borderRadius: 18 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginTop: 8 },
  confirmTitle: { color: T.ink, fontSize: 18, fontWeight: '900' },
  confirmSub: { color: T.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  confirmFoot2: { gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hair, marginTop: 8 },
  ackRow2: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  resBody: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 6, gap: 12 },
  resRing: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  resCore: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  resTitle: { color: T.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  resMsg: { color: T.ink, fontSize: 14, lineHeight: 21, textAlign: 'center', fontWeight: '600' },
  resDetails: { alignSelf: 'stretch', borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, overflow: 'hidden' },
  resDetailsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10 },
  resDetailsTitle: { flex: 1, color: T.muted, fontSize: 12.5, fontWeight: '800' },
  resCopy: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  resCopyText: { color: T.muted, fontSize: 11.5, fontWeight: '700' },
  resDetailsText: { color: T.muted, fontSize: 11.5, lineHeight: 17, paddingHorizontal: 12, paddingBottom: 12, fontFamily: Platform.select({ web: 'monospace', ios: 'Menlo', default: 'monospace' }) },
  confirmHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  confirmIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  confirmFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, flexWrap: 'wrap' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 18, marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  ackText: { flex: 1, color: T.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
