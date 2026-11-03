// FILE: src/components/YarnSalesOrderNEW/ui.tsx
// Presentation-only pieces shared by the Yarn Sales Order steps (NEW theme,
// tokens from T / S only). No API calls and no business rules live here.
import { Sheet } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

/** Phone < 768 = 1 column, tablet 2, desktop (>= 1180) 3. */
export function useCols() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const cols = isPhone ? 1 : width >= 1180 ? 3 : 2;
  return { width, isPhone, cols };
}

/** Property chip shown beside the header title (Select Party / New Sales Order). */
export function PropertyChip({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <View style={pcSt.chip} accessibilityLabel={`Property ${name}`}>
      <Icon name="apartment" size={14} color={T.copper} />
      <Text style={pcSt.text} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const pcSt = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 240,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: `${T.copper}14`,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
  },
  text: { flexShrink: 1, fontSize: 11.5, fontWeight: '800', color: T.copper },
});

/** Centred, max-width wrapper used by every step body. */
export const CONTENT: any = { maxWidth: 1200, alignSelf: 'center', width: '100%' };

/* ------------------------------------------------------------------ */
/* Search input with an optional trailing action (refresh)             */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onRefresh,
  loading,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onRefresh?: () => void;
  loading?: boolean;
  style?: any;
}) {
  return (
    <View style={[st.search, style]}>
      <Icon name="search" size={18} color={T.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        style={st.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Clear search"
        >
          <Icon name="cancel" size={17} color={T.muted} />
        </TouchableOpacity>
      ) : null}
      {onRefresh ? (
        <TouchableOpacity
          onPress={onRefresh}
          disabled={loading}
          style={st.searchAction}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Reload list"
        >
          {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={19} color={T.copper} />}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton rows shown while a list loads                              */
/* ------------------------------------------------------------------ */

export function ListSkeleton({ rows = 5, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[st.skel, tall && { minHeight: 116 }]}>
          <View style={st.skelIcon} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[st.skelLine, { width: '70%' }]} />
            <View style={[st.skelLine, { width: '45%', backgroundColor: T.hair }]} />
            {tall ? <View style={[st.skelLine, { width: '85%', backgroundColor: T.hair, marginTop: 8 }]} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pickable list row (item / grade / shade / party)                    */
/* ------------------------------------------------------------------ */

export function OptionRow({
  title,
  lines,
  icon,
  selected,
  badge,
  check,
  onPress,
}: {
  title: string;
  lines?: (string | null | undefined | false)[];
  icon?: string;
  /** Highlighted (currently saved / picked) row. */
  selected?: boolean;
  badge?: string;
  /** Shows a check box instead of a chevron (multi select lists). */
  check?: boolean;
  onPress: () => void;
}) {
  const subs = (lines || []).filter(Boolean) as string[];
  return (
    <TouchableOpacity
      style={[st.option, selected && st.optionOn]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole={check ? 'checkbox' : 'button'}
      accessibilityState={check ? { checked: !!selected } : { selected: !!selected }}
      accessibilityLabel={title}
    >
      {check ? (
        <Icon
          name={selected ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={selected ? T.copper : T.muted}
        />
      ) : icon ? (
        <View style={[st.optionIcon, selected && { backgroundColor: T.copper }]}>
          <Icon name={(selected ? 'check' : icon) as any} size={19} color={selected ? '#fff' : T.copper} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.optionTitle} numberOfLines={2}>{title}</Text>
        {subs.map((line, i) => (
          <Text key={i} style={st.optionSub} numberOfLines={2}>{line}</Text>
        ))}
        {badge ? (
          <View style={st.badge}>
            <Text style={st.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {!check ? <Icon name="chevron-right" size={22} color={T.muted} /> : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* "What you picked so far" strip on top of the picker steps           */
/* ------------------------------------------------------------------ */

export function ContextStrip({ entries, tone = 'plain' }: { entries: { label: string; value: string }[]; tone?: 'plain' | 'saved' }) {
  const shown = entries.filter((e) => e.value);
  if (!shown.length) return null;
  return (
    <View style={[st.ctx, tone === 'saved' && st.ctxSaved]}>
      {shown.map((e, i) => (
        <View key={`${e.label}-${i}`} style={st.ctxRow}>
          <Text style={st.ctxLabel} numberOfLines={1}>{e.label}</Text>
          <Text style={st.ctxValue} numberOfLines={2}>{e.value}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky bottom action bar                                            */
/* ------------------------------------------------------------------ */

export function FooterBar({ children }: { children: React.ReactNode }) {
  return (
    <View style={st.footer}>
      <View style={st.footerInner}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Centred dialog: delete confirmation / success                       */
/* ------------------------------------------------------------------ */

export function Dialog({
  open,
  tone = 'danger',
  icon,
  title,
  message,
  onClose,
  actions,
}: {
  open: boolean;
  tone?: 'danger' | 'success';
  icon: string;
  title: string;
  message?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
}) {
  const color = tone === 'danger' ? T.red : T.green;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.dialogWrap}>
        <View style={st.dialog}>
          <View style={[st.dialogIcon, { backgroundColor: `${color}18` }]}>
            <Icon name={icon as any} size={32} color={color} />
          </View>
          <Text style={st.dialogTitle}>{title}</Text>
          {message ? <Text style={st.dialogMsg}>{message}</Text> : null}
          {actions ? <View style={st.dialogActions}>{actions}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Searchable single-select sheet (Property / Year)                    */
/* ------------------------------------------------------------------ */

const PAGE = 200;

export function PickerSheet<R>({
  open,
  title,
  searchPlaceholder,
  rows,
  keyOf,
  labelOf,
  searchOf,
  selectedKey,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  /** Omit to hide the search box (short lists). */
  searchPlaceholder?: string;
  rows: R[];
  keyOf: (row: R, index: number) => string;
  labelOf: (row: R) => string;
  searchOf?: (row: R) => string;
  selectedKey?: string;
  onPick: (row: R) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // legacy cleared the search text whenever the picker was closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setLimit(PAGE);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchOf) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => String(searchOf(r) ?? '').toLowerCase().includes(q));
  }, [rows, query, searchOf]);

  const shown = filtered.slice(0, limit);

  return (
    <Sheet open={open} onClose={onClose} title={title} wideMax={520}>
      {searchPlaceholder ? (
        <SearchInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setLimit(PAGE);
          }}
          placeholder={searchPlaceholder}
        />
      ) : null}
      <View>
        {shown.map((row, index) => {
          const k = keyOf(row, index);
          const on = selectedKey !== undefined && selectedKey !== '' && k === selectedKey;
          return (
            <TouchableOpacity
              key={`${k}_${index}`}
              style={[st.pickRow, on && st.pickRowOn]}
              onPress={() => onPick(row)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={st.pickText} numberOfLines={2}>{labelOf(row)}</Text>
              {on ? <Icon name="check" size={18} color={T.copper} /> : null}
            </TouchableOpacity>
          );
        })}
        {filtered.length > shown.length ? (
          <TouchableOpacity style={st.moreRow} onPress={() => setLimit((v) => v + PAGE)} accessibilityRole="button">
            <Text style={st.moreText}>Show more ({filtered.length - shown.length})</Text>
          </TouchableOpacity>
        ) : null}
        {filtered.length === 0 ? <Text style={st.pickEmpty}>No records found</Text> : null}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Small labelled value (read-only)                                    */
/* ------------------------------------------------------------------ */

export function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={st.infoRow}>
      <Icon name={icon as any} size={18} color={T.copper} />
      <Text style={st.infoLabel} numberOfLines={1}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
}

/** Tick box with a label (browse "Show Authorized Data", details "Stock Sales"). */
export function CheckRow({
  label,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[st.checkRow, disabled && { opacity: 0.55 }]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
    >
      <Icon name={checked ? 'check-box' : 'check-box-outline-blank'} size={24} color={checked ? T.copper : T.muted} />
      <Text style={st.checkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    fontSize: 14,
    color: T.ink,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  searchAction: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  skel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  skelIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.alt },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: T.alt },

  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optionOn: { borderColor: T.copper, backgroundColor: `${T.copper}10` },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  optionTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  optionSub: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: `${T.green}18`,
  },
  badgeText: { fontSize: 10.5, fontWeight: '800', color: T.green, letterSpacing: 0.3 },

  ctx: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  ctxSaved: { backgroundColor: `${T.amber}12`, borderColor: `${T.amber}55` },
  ctxRow: { gap: 2 },
  ctxLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  ctxValue: { fontSize: 14, fontWeight: '800', color: T.nav },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, ...S.sheet, shadowOpacity: 0.06 },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  dialogWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(13,27,42,0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    ...S.sheet,
  },
  dialogIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontSize: 18, fontWeight: '900', color: T.ink, textAlign: 'center' },
  dialogMsg: { fontSize: 13.5, lineHeight: 20, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 8 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },

  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  pickRowOn: { backgroundColor: `${T.copper}10`, borderRadius: 8 },
  pickText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: T.ink },
  pickEmpty: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },
  moreRow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: T.copper, fontWeight: '800', fontSize: 13 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  infoLabel: { width: 136, fontSize: 12.5, fontWeight: '700', color: T.muted },
  infoValue: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: T.ink },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  checkText: { fontSize: 13.5, fontWeight: '700', color: T.ink },
});
