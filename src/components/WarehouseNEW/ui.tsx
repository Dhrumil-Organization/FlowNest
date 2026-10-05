// FILE: src/components/WarehouseNEW/ui.tsx
// Presentation-only pieces shared by the Warehouse steps (NEW theme, tokens
// from T / S only). No API calls and no business rules live here.
//   LocationCard     <- legacy components/WarehouseCard.tsx
//   CartonCard       <- legacy components/CartonCard.tsx
//   ActionSheet      <- legacy WarehouseActionSheet.tsx
//   PickerSheet      <- the legacy full-screen "Select Property / Store / Location" modals
//   LocationSummary  <- the Location / Capacity card on top of Assign / Transfer / View
import { Sheet } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import {
  cartonGradeOf,
  cartonItemOf,
  cartonNoOf,
  cartonPackingOf,
  locationCapacityText,
  locationStats,
  locationTitle,
  Row,
} from './model';

/** Brief breakpoints: phone < 768 = 1 column, tablet 2, desktop (>= 1180) 3. */
export function useCols() {
  const { width, height } = useWindowDimensions();
  const isPhone = width < 768;
  const cols = isPhone ? 1 : width >= 1180 ? 3 : 2;
  return { width, height, isPhone, cols };
}

export const CONTENT: any = { maxWidth: 1200, alignSelf: 'center', width: '100%' };

/* ------------------------------------------------------------------ */
/* Search input with focus callbacks (kit SearchBox has none)          */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onFocus,
  onBlur,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: any;
}) {
  return (
    <View style={[st.search, style]}>
      <Icon name="search" size={18} color={T.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard location tile                                             */
/* ------------------------------------------------------------------ */

export function LocationCard({ item, onMenu }: { item: Row; onMenu: (item: Row) => void }) {
  const s = locationStats(item);
  const statusColor = s.isFull ? T.red : s.isEmpty ? T.muted : T.green;
  return (
    <TouchableOpacity
      style={st.locCard}
      activeOpacity={0.85}
      onPress={() => onMenu(item)}
      accessibilityRole="button"
      accessibilityLabel={`Location ${s.locationName}`}
    >
      <View style={[st.locStripe, { backgroundColor: statusColor }]} />
      <View style={st.locBody}>
        <View style={st.locTop}>
          <Text numberOfLines={1} style={st.locName}>{s.locationName}</Text>
          <View style={st.locMenu}>
            <Icon name="more-vert" size={20} color={T.nav} />
          </View>
        </View>
        <Text numberOfLines={1} style={st.locCapacity}>{s.capacity}</Text>
        <View style={st.locRow}>
          <Text style={st.locLabel} numberOfLines={1}>Location In</Text>
          <Text style={st.locValue} numberOfLines={1}>{s.locationIn}</Text>
        </View>
        <View style={st.track}>
          <View style={{ width: `${s.progress}%`, height: 6, borderRadius: 6, backgroundColor: statusColor }} />
        </View>
        <Text style={st.locFooter} numberOfLines={1}>{s.footer}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Carton row                                                          */
/* ------------------------------------------------------------------ */

function CartonCardBase({
  item,
  selected,
  onPress,
  hideCheckbox = false,
}: {
  item: Row;
  selected?: boolean;
  onPress?: (item: Row) => void;
  hideCheckbox?: boolean;
}) {
  const body = (
    <>
      {!hideCheckbox ? (
        <Icon
          name={selected ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={selected ? T.copper : T.muted}
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.cartNo} numberOfLines={1}>{cartonNoOf(item)}</Text>
        <Text style={st.cartLine} numberOfLines={1}>Packing | {cartonPackingOf(item)}</Text>
        <Text style={st.cartLine} numberOfLines={1}>
          {cartonItemOf(item)} | Grade: {cartonGradeOf(item)}
        </Text>
      </View>
    </>
  );
  if (!onPress) return <View style={st.cartCard}>{body}</View>;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={[st.cartCard, selected && st.cartCardOn]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
    >
      {body}
    </TouchableOpacity>
  );
}
export const CartonCard = React.memo(CartonCardBase);

/* ------------------------------------------------------------------ */
/* Location / capacity summary rows                                    */
/* ------------------------------------------------------------------ */

export function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={st.sumRow}>
      <Icon name={icon as any} size={17} color={T.copper} />
      <Text style={st.sumLabel} numberOfLines={1}>{label}</Text>
      <Text style={st.sumValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function LocationSummary({ location, fromPrefix = '' }: { location: Row; fromPrefix?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <SummaryRow icon="place" label={`${fromPrefix}Location`} value={String(locationTitle(location) ?? '')} />
      <SummaryRow icon="stacked-bar-chart" label={`${fromPrefix}Capacity`} value={locationCapacityText(location)} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Square outline button (scanner / camera entry)                      */
/* ------------------------------------------------------------------ */

export function SquareBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={st.squareBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon as any} size={26} color={T.copper} />
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard action sheet: Assign / View / Transfer / Cancel           */
/* ------------------------------------------------------------------ */

export function ActionSheet({
  visible,
  item,
  onClose,
  onAssign,
  onView,
  onTransfer,
}: {
  visible: boolean;
  item: Row | null;
  onClose: () => void;
  onAssign: () => void;
  onView: () => void;
  onTransfer: () => void;
}) {
  const name = item ? locationStats(item).locationName : '';
  const row = (icon: string, text: string, onPress: () => void, cancel?: boolean) => (
    <TouchableOpacity style={[st.actRow, cancel && st.actCancel]} onPress={onPress} accessibilityRole="button">
      <Icon name={icon as any} size={22} color={cancel ? T.muted : T.copper} />
      <Text style={st.actText}>{text}</Text>
    </TouchableOpacity>
  );
  return (
    <Sheet open={visible} onClose={onClose} eyebrow="LOCATION" title={String(name || 'Warehouse')} wideMax={420}>
      <View>
        {row('inventory-2', 'Assign', onAssign)}
        {row('visibility', 'View', onView)}
        {row('compare-arrows', 'Transfer', onTransfer)}
        {row('cancel', 'Cancel', onClose, true)}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Searchable single-select sheet                                      */
/* The caller supplies the legacy search field through `searchOf`.     */
/* ------------------------------------------------------------------ */

const PAGE = 200;

export function PickerSheet({
  open,
  title,
  searchPlaceholder,
  rows,
  keyOf,
  labelOf,
  subOf,
  searchOf,
  selectedKey,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  searchPlaceholder: string;
  rows: Row[];
  keyOf: (row: Row, index: number) => string;
  labelOf: (row: Row) => string;
  subOf?: (row: Row) => string;
  searchOf: (row: Row) => string;
  selectedKey?: string;
  onPick: (row: Row) => void;
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
    const q = query.toLowerCase();
    return rows.filter((r) => String(searchOf(r) ?? '').toLowerCase().includes(q));
  }, [rows, query, searchOf]);

  const shown = filtered.slice(0, limit);

  return (
    <Sheet open={open} onClose={onClose} title={title} wideMax={520}>
      <SearchInput value={query} onChangeText={(t) => { setQuery(t); setLimit(PAGE); }} placeholder={searchPlaceholder} />
      <View>
        {shown.map((row, index) => {
          const k = keyOf(row, index);
          const on = selectedKey !== undefined && selectedKey !== '' && k === selectedKey;
          const sub = subOf ? subOf(row) : '';
          return (
            <TouchableOpacity
              key={`${k}_${index}`}
              style={[st.pickRow, on && st.pickRowOn]}
              onPress={() => onPick(row)}
              accessibilityRole="button"
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.pickText} numberOfLines={2}>{labelOf(row)}</Text>
                {sub ? <Text style={st.pickSub} numberOfLines={1}>{sub}</Text> : null}
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
        {filtered.length === 0 ? <Text style={st.pickEmpty}>No records found</Text> : null}
      </View>
    </Sheet>
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
  searchInput: { flex: 1, minWidth: 0, height: 44, fontSize: 14, color: T.ink, paddingVertical: 0 },

  locCard: {
    flex: 1,
    minHeight: 140,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...S.card,
  },
  locStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  locBody: { flex: 1, paddingLeft: 16, paddingRight: 10, paddingVertical: 10 },
  locTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  locName: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 18, fontWeight: '900', color: T.yd, marginRight: 6 },
  locMenu: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  locCapacity: { fontSize: 18, lineHeight: 22, fontWeight: '900', color: T.ink, marginBottom: 10 },
  locRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 6 },
  locLabel: { flexShrink: 1, fontSize: 11, lineHeight: 13, fontWeight: '700', color: T.muted },
  locValue: { fontSize: 12, lineHeight: 14, fontWeight: '900', color: T.ink },
  track: { height: 6, borderRadius: 6, backgroundColor: T.alt, overflow: 'hidden', marginTop: 4 },
  locFooter: { fontSize: 12, lineHeight: 14, fontWeight: '900', color: T.nav, marginTop: 6 },

  cartCard: {
    flex: 1,
    minHeight: 72,
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartCardOn: { backgroundColor: `${T.copper}12`, borderColor: T.copper },
  cartNo: { fontSize: 15, fontWeight: '900', color: T.ink },
  cartLine: { fontSize: 12.5, color: T.nav, marginTop: 2 },

  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 22 },
  sumLabel: { fontSize: 12, fontWeight: '800', color: T.muted, flexShrink: 0 },
  sumValue: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 14, fontWeight: '900', color: T.ink },

  squareBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.copper,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingHorizontal: 4 },
  actCancel: { borderTopWidth: 1, borderTopColor: T.border, marginTop: 6 },
  actText: { fontSize: 15, fontWeight: '800', color: T.ink },

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
  pickText: { fontSize: 14, fontWeight: '700', color: T.ink },
  pickSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  pickEmpty: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },
  moreRow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: T.copper, fontWeight: '800', fontSize: 13 },
});
