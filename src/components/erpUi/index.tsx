// FILE: src/components/erpUi/index.tsx
// Shared NEW ERP theme building blocks (first built for Sales Order Tracking).
// Pure presentation only — no API / business logic lives here, so the
// screen's existing behaviour (payloads, sorting, pagination, drill-downs)
// stays exactly as it was in index.tsx / CustomDrawer / SOPartyDetails.
//
// Tokens come from the single canonical theme (T / S from '@/src/theme').
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

/** Breakpoints shared by every list in this module. */
export function useSotLayout() {
  const { width, height } = useWindowDimensions();
  const isPhone = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const cols = isPhone ? 1 : isTablet ? 2 : 3;
  const gutter = isPhone ? 12 : 16;
  return { width, height, isPhone, isTablet, isDesktop, cols, gutter };
}

/** Width style for a grid cell so the last row never stretches. */
export const cellWidth = (cols: number) =>
  cols <= 1 ? ({ width: '100%' } as const) : ({ width: `${100 / cols}%` } as any);

/** Max content width used by drill-down panels on large screens. */
export const CONTENT_MAX = 1280;

const n0 = (v: any) => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

/** % of b that a represents, clamped 0–100. */
export const pct = (a: any, b: any) => {
  const den = n0(b);
  if (den <= 0) return 0;
  return Math.max(0, Math.min(100, (n0(a) / den) * 100));
};

/* ------------------------------------------------------------------ */
/* Status colours (same mapping the legacy screen used, NEW tokens)    */
/* ------------------------------------------------------------------ */

export const statusTone = (status?: string) => {
  switch (String(status || '').toUpperCase().trim()) {
    case 'CLOSED':
      return { fg: T.green, bg: `${T.green}18`, bd: `${T.green}40` };
    case 'PARTIAL':
      return { fg: T.amber, bg: `${T.amber}1F`, bd: `${T.amber}55` };
    case 'PENDING':
      return { fg: T.red, bg: `${T.red}14`, bd: `${T.red}40` };
    case 'OPEN':
      return { fg: T.blue, bg: `${T.blue}14`, bd: `${T.blue}40` };
    default:
      return { fg: T.muted, bg: T.alt, bd: T.border };
  }
};

export function StatusPill({ status, style }: { status?: string; style?: any }) {
  const t = statusTone(status);
  return (
    <View style={[u.pill, { backgroundColor: t.bg, borderColor: t.bd }, style]}>
      <View style={[u.pillDot, { backgroundColor: t.fg }]} />
      <Text style={[u.pillText, { color: t.fg }]} numberOfLines={1}>
        {String(status || '—').toUpperCase()}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export function SearchBox({
  value,
  onChangeText,
  placeholder,
  style,
  loading,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: any;
  loading?: boolean;
}) {
  return (
    <View style={[u.search, style]}>
      <Icon name="search" size={18} color={T.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        style={u.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {loading ? <ActivityIndicator size="small" color={T.copper} /> : null}
      {!!value && !loading ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
        >
          <Icon name="cancel" size={17} color={T.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Segment<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: V;
  options: { value: V; label: string; icon?: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={u.label}>{label}</Text> : null}
      <View style={u.seg}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[u.segItem, on && u.segOn]}
              onPress={() => onChange(o.value)}
              accessibilityState={{ selected: on }}
              accessibilityRole="button"
            >
              {o.icon ? <Icon name={o.icon as any} size={15} color={on ? '#fff' : T.nav} /> : null}
              <Text style={[u.segText, on && { color: '#fff' }]} numberOfLines={1}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const pad2 = (x: number) => String(x).padStart(2, '0');
const dmy = (d: Date) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Light-theme date pill (web <input type=date>, native dialog on Android,
 *  inline calendar sheet on iOS). Same onChange(Date) contract as the
 *  shared PlatformDatePicker, which is styled for dark backgrounds only. */
export function DateField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={u.datePill}>
        <Icon name="event" size={17} color={T.copper} />
        {React.createElement('input', {
          type: 'date',
          value: iso(value),
          'aria-label': 'Delivery date',
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
            cursor: 'pointer',
            fontFamily: 'inherit',
          },
        })}
      </View>
    );
  }

  const handleNative = (event: any, selected?: Date) => {
    setOpen(Platform.OS === 'ios');
    if (event?.type === 'dismissed' || !selected) return;
    onChange(selected);
    if (Platform.OS === 'ios') setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={u.datePill}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Delivery date ${dmy(value)}`}
      >
        <Icon name="event" size={17} color={T.copper} />
        <Text style={u.dateText}>{dmy(value)}</Text>
        <Icon name="expand-more" size={20} color={T.muted} />
      </TouchableOpacity>
      {Platform.OS === 'android' && open ? (
        <DateTimePicker value={value} mode="date" display="default" onChange={handleNative} />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <View style={u.iosCal}>
          <DateTimePicker
            value={value}
            mode="date"
            display="inline"
            onChange={handleNative}
            themeVariant="light"
            accentColor={T.copper}
          />
        </View>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Btn({
  label,
  icon,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  style,
  compact,
  badge,
}: {
  label: string;
  icon?: string;
  onPress: () => void;
  kind?: 'primary' | 'copper' | 'ghost' | 'danger' | 'soft';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  compact?: boolean;
  badge?: number;
}) {
  const bg =
    kind === 'primary' ? T.nav
      : kind === 'copper' ? T.copper
        : kind === 'danger' ? T.red
          : kind === 'soft' ? `${T.copper}16`
            : T.surface;
  const fg = kind === 'ghost' ? T.nav : kind === 'soft' ? T.copper : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        u.btn,
        compact && u.btnCompact,
        { backgroundColor: bg },
        kind === 'ghost' && { borderWidth: 1, borderColor: T.border },
        kind === 'soft' && { borderWidth: 1, borderColor: `${T.copper}40` },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon name={icon as any} size={compact ? 16 : 18} color={fg} />
      ) : null}
      {label ? (
        <Text style={[u.btnText, compact && { fontSize: 12.5 }, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {badge ? (
        <View style={u.btnBadge}>
          <Text style={u.btnBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function IconBtn({
  icon,
  onPress,
  color = T.nav,
  loading,
  label,
  tone = 'plain',
  disabled,
}: {
  icon: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
  label: string;
  tone?: 'plain' | 'soft' | 'danger';
  disabled?: boolean;
}) {
  const bg = tone === 'soft' ? `${T.copper}14` : tone === 'danger' ? `${T.red}10` : T.surface;
  const bd = tone === 'soft' ? `${T.copper}40` : tone === 'danger' ? `${T.red}40` : T.border;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[u.iconBtn, { backgroundColor: bg, borderColor: bd }, disabled && { opacity: 0.5 }]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : <Icon name={icon as any} size={18} color={color} />}
    </TouchableOpacity>
  );
}

export function SortChip({
  label,
  order,
  onPress,
}: {
  label: string;
  order: 'asc' | 'desc';
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={u.sortChip}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${order === 'asc' ? 'ascending' : 'descending'}`}
    >
      <Icon name="sort" size={15} color={T.nav} />
      <Text style={u.sortText}>{label}</Text>
      <Icon name={order === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={14} color={T.copper} />
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only display                                                   */
/* ------------------------------------------------------------------ */

export function Kpi({
  label,
  value,
  sub,
  icon,
  accent = T.copper,
  valueColor,
  style,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  accent?: string;
  valueColor?: string;
  style?: any;
}) {
  return (
    <View style={[u.kpi, style]}>
      <View style={u.kpiHead}>
        {icon ? (
          <View style={[u.kpiIcon, { backgroundColor: `${accent}16` }]}>
            <Icon name={icon as any} size={15} color={accent} />
          </View>
        ) : null}
        <Text style={u.kpiLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[u.kpiValue, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={u.kpiSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

/** KPI grid: 2 per row on phones, all in one row on wider screens. */
export function KpiGrid({ children, isPhone }: { children: React.ReactNode; isPhone: boolean }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={u.kpiGrid}>
      {items.map((child, i) => (
        <View key={i} style={[u.kpiCell, isPhone ? { width: '50%' } : { flex: 1 }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Metric({
  label,
  value,
  color,
  align = 'left',
  style,
}: {
  label: string;
  value: string;
  color?: string;
  align?: 'left' | 'right';
  style?: any;
}) {
  return (
    <View style={[u.metric, align === 'right' && { alignItems: 'flex-end' }, style]}>
      <Text style={u.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={[u.metricValue, color ? { color } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = T.green, height = 6 }: { value: number; color?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <View style={[u.track, { height, borderRadius: height }]}>
      <View style={{ width: `${v}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function SectionHead({
  title,
  meta,
  right,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={u.sectionHead}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={u.sectionTitle} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={u.sectionMeta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={u.empty}>
      <View style={u.emptyIcon}>
        <Icon name={icon as any} size={30} color={T.copper} />
      </View>
      <Text style={u.emptyTitle}>{title}</Text>
      {text ? <Text style={u.emptyText}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[u.avatar, { width: size, height: size, borderRadius: size / 2.6 }]}>
      <Text style={[u.avatarText, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Panels & overlays                                                   */
/* ------------------------------------------------------------------ */

/** Header for an in-screen drill-down panel (Back + breadcrumb + title). */
export function PanelHeader({
  onBack,
  crumbs,
  title,
  subtitle,
  right,
  backLabel = 'Back',
}: {
  onBack: () => void;
  crumbs?: string[];
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backLabel?: string;
}) {
  return (
    <View style={u.panelHead}>
      <View style={u.panelHeadInner}>
        <TouchableOpacity
          onPress={onBack}
          style={u.backBtn}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon name="arrow-back" size={18} color={T.nav} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          {crumbs && crumbs.length ? (
            <Text style={u.crumbs} numberOfLines={1}>
              {crumbs.filter(Boolean).join('  ›  ')}
            </Text>
          ) : null}
          <Text style={u.panelTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={u.panelSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Blocking "working…" overlay drawn above every panel. */
export function BusyOverlay({ visible, text = 'Loading…' }: { visible: boolean; text?: string }) {
  if (!visible) return null;
  return (
    <View style={u.busy} pointerEvents="auto">
      <View style={u.busyCard}>
        <ActivityIndicator size="large" color={T.copper} />
        <Text style={u.busyText}>{text}</Text>
      </View>
    </View>
  );
}

/** Bottom sheet on phones, centred dialog / right-side panel on wide screens. */
export function Sheet({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  wideMax = 620,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wideMax?: number;
  side?: boolean;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const asSide = wide && side;
  return (
    <Modal
      visible={open}
      transparent
      animationType={wide ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[u.flex, asSide ? u.sideWrap : wide ? u.centerWrap : u.bottomWrap]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={u.scrim} />
        </TouchableWithoutFeedback>
        <View
          style={[
            u.sheet,
            asSide ? [u.sheetSide, { maxWidth: wideMax }] : wide ? [u.sheetWide, { maxWidth: wideMax }] : u.sheetPhone,
          ]}
        >
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
          <ScrollView
            style={asSide ? { flex: 1 } : { flexGrow: 0, flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={{ padding: 16, gap: 14 }}
          >
            {children}
          </ScrollView>
          {footer ? <View style={u.sheetFoot}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


/* ------------------------------------------------------------------ */
/* Forms & screen chrome (added for the module-wide NEW ERP migration)  */
/* ------------------------------------------------------------------ */

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: any; padded?: boolean }) {
  return <View style={[u.card, padded && { padding: 14 }, style]}>{children}</View>;
}

/** Labelled text input. Same props contract as TextInput for value/onChangeText. */
export function Field({
  label,
  required,
  error,
  hint,
  right,
  style,
  inputStyle,
  multiline,
  editable = true,
  ...inputProps
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  right?: React.ReactNode;
  style?: any;
  inputStyle?: any;
  multiline?: boolean;
  editable?: boolean;
  [k: string]: any;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={u.label}>
          {label}
          {required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          u.fieldBox,
          multiline && { height: undefined, minHeight: 84, alignItems: 'flex-start', paddingVertical: 10 },
          !editable && { backgroundColor: T.alt },
          !!error && { borderColor: T.red },
        ]}
      >
        <TextInput
          placeholderTextColor={T.muted}
          editable={editable}
          multiline={multiline}
          style={[u.fieldInput, multiline && { textAlignVertical: 'top', minHeight: 64 }, inputStyle]}
          {...inputProps}
        />
        {right}
      </View>
      {error ? <Text style={u.fieldError}>{error}</Text> : hint ? <Text style={u.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/** Tappable "select" trigger: shows the current value and opens whatever
 *  picker/modal the screen already uses via onPress. */
export function PickField({
  label,
  value,
  placeholder = 'Select…',
  onPress,
  required,
  disabled,
  loading,
  icon,
  onClear,
  error,
  style,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  onClear?: () => void;
  error?: string;
  style?: any;
}) {
  const has = !!String(value ?? '').trim();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={u.label}>
          {label}
          {required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[u.fieldBox, has && { borderColor: `${T.nav}66` }, disabled && { opacity: 0.55 }, !!error && { borderColor: T.red }]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Select'}: ${has ? value : placeholder}`}
      >
        {icon ? <Icon name={icon as any} size={17} color={T.copper} /> : null}
        <Text style={[u.pickText, !has && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>
          {has ? value : placeholder}
        </Text>
        {loading ? <ActivityIndicator size="small" color={T.muted} /> : null}
        {onClear && has && !loading ? (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear">
            <Icon name="cancel" size={17} color={T.muted} />
          </TouchableOpacity>
        ) : null}
        {!loading ? <Icon name="expand-more" size={20} color={T.muted} /> : null}
      </TouchableOpacity>
      {error ? <Text style={u.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  icon,
  onPress,
  active,
  tone = 'neutral',
  style,
}: {
  label: string;
  icon?: string;
  onPress?: () => void;
  active?: boolean;
  tone?: 'neutral' | 'copper' | 'green' | 'red' | 'blue' | 'amber';
  style?: any;
}) {
  const toneColor: Record<string, string> = { neutral: T.nav, copper: T.copper, green: T.green, red: T.red, blue: T.blue, amber: T.amber };
  const c = toneColor[tone] || T.nav;
  const body = (
    <View style={[u.chip, active ? { backgroundColor: c, borderColor: c } : tone !== 'neutral' ? { backgroundColor: `${c}12`, borderColor: `${c}40` } : null, style]}>
      {icon ? <Icon name={icon as any} size={13} color={active ? '#fff' : tone === 'neutral' ? T.copper : c} /> : null}
      <Text style={[u.chipText, { color: active ? '#fff' : c }]} numberOfLines={1}>{label}</Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}>
      {body}
    </TouchableOpacity>
  ) : body;
}

/** The standard list-screen toolbar: search + optional Filters button +
 *  optional extra actions + a horizontal row of filter chips. */
export function Toolbar({
  search,
  onSearch,
  placeholder,
  onFilters,
  filterCount,
  actions,
  chips,
  onChipPress,
}: {
  search?: string;
  onSearch?: (t: string) => void;
  placeholder?: string;
  onFilters?: () => void;
  filterCount?: number;
  actions?: React.ReactNode;
  chips?: { icon?: string; text: string }[];
  onChipPress?: () => void;
}) {
  const { isPhone, gutter } = useSotLayout();
  return (
    <View style={u.toolbar}>
      <View style={[u.toolbarInner, { paddingHorizontal: gutter }]}>
        {onSearch ? (
          <SearchBox value={search || ''} onChangeText={onSearch} placeholder={placeholder || 'Search…'} style={{ flex: 1 }} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {actions}
        {onFilters ? (
          <Btn
            label={isPhone ? '' : 'Filters'}
            icon="tune"
            onPress={onFilters}
            compact
            badge={filterCount || undefined}
            style={{ height: 42, minWidth: 46 }}
          />
        ) : null}
      </View>
      {chips && chips.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[u.chipRow, { paddingHorizontal: gutter }]}>
          {chips.map((c, i) => (
            <Chip key={`${c.text}-${i}`} label={c.text} icon={c.icon} onPress={onChipPress} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** Centred, max-width content wrapper for ScrollView/FlatList content. */
export function useContentStyle() {
  const { gutter } = useSotLayout();
  return { paddingHorizontal: gutter, width: '100%' as const, maxWidth: CONTENT_MAX, alignSelf: 'center' as const };
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export const u = StyleSheet.create({
  flex: { flex: 1 },

  // pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  // search
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.ink,
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },

  // segment
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  seg: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3, gap: 3 },
  segItem: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 6,
  },
  segOn: { backgroundColor: T.nav },
  segText: { fontSize: 12.5, fontWeight: '700', color: T.nav },

  // date
  datePill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  iosCal: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    overflow: 'hidden',
    alignItems: 'center',
  },

  // buttons
  btn: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnCompact: { height: 38, paddingHorizontal: 12, borderRadius: 9, gap: 6 },
  btnText: { fontSize: 14, fontWeight: '800' },
  btnBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  sortText: { fontSize: 11.5, fontWeight: '700', color: T.nav },

  // kpi
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  kpiCell: { padding: 5 },
  kpi: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 84,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kpiIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { flex: 1, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  kpiValue: { fontSize: 19, fontWeight: '900', color: T.ink, marginTop: 8 },
  kpiSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 2 },

  // metric
  metric: { flex: 1, minWidth: 0 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 2 },

  track: { width: '100%', backgroundColor: T.alt, overflow: 'hidden' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '900', color: T.ink, textAlign: 'center' },
  emptyText: { marginTop: 5, fontSize: 13, lineHeight: 19, color: T.muted, textAlign: 'center', maxWidth: 320 },

  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: T.nav },
  avatarText: { color: '#fff', fontWeight: '900' },

  // panel
  panelHead: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  panelHeadInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.alt,
  },
  crumbs: { fontSize: 10.5, fontWeight: '700', color: T.copper, letterSpacing: 0.3 },
  panelTitle: { fontSize: 16, fontWeight: '900', color: T.nav, marginTop: 1 },
  panelSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  busy: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    elevation: 50,
    backgroundColor: 'rgba(13,27,42,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
    ...S.sheet,
  },
  busyText: { fontSize: 13, fontWeight: '800', color: T.nav },

  // sheet
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  sideWrap: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  bottomWrap: { justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.5)' },
  sheet: { backgroundColor: T.surface, overflow: 'hidden' },
  sheetPhone: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '92%' },
  sheetWide: { width: '100%', borderRadius: 16, maxHeight: '90%' },
  sheetSide: { width: '100%', height: '100%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  handle: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border, marginTop: 8 },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  sheetFoot: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.sub,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.alt,
  },
  // forms & chrome
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  fieldBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    backgroundColor: T.surface,
    paddingHorizontal: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.ink,
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  fieldError: { fontSize: 11.5, fontWeight: '700', color: T.red },
  fieldHint: { fontSize: 11.5, fontWeight: '600', color: T.muted },
  pickText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: T.sub,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipText: { fontSize: 11.5, fontWeight: '700', maxWidth: 220 },
  chipRow: { gap: 6, alignItems: 'center' },
  toolbar: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
  },
});
