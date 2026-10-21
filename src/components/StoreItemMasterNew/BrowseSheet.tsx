// FILE: src/components/StoreItemMasterNew/BrowseSheet.tsx
// Browse (legacy "ITEM LIST" grid) — one component, three layouts chosen from its own width:
//   desktop ≥ 900  full grid: sortable headers + per-column filter row + keyboard (↑ ↓ Enter Esc)
//   tablet  ≥ 560  compact grid: code, name, UOM, group (+ sub group under it), rate
//   phone   < 560  cards with search, group chips and sort chips
// Mount it only while it is open; it loads on mount and has its own loading / error / empty states.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import {
  BP_DESKTOP,
  BP_TABLET,
  BrowseFilters,
  BrowseRow,
  BrowseSortKey,
  filterBrowse,
  fmtRate,
  NO_COLUMN_FILTERS,
} from './model';
import { BrowseSkeleton } from './Skeleton';
import { Btn, EmptyState, FilterChip, SearchBox, Sheet, useWebKeys } from './ui';

type ColKey = 'code' | 'name' | 'uom' | 'group' | 'subGroup' | 'rate' | 'location';
type Col = { key: ColKey; label: string; flex?: number; w?: number; right?: boolean; sort?: BrowseSortKey; filter?: keyof BrowseFilters };

const DESKTOP_COLS: Col[] = [
  { key: 'code', label: 'Code', w: 84, right: true, sort: 'code', filter: 'code' },
  { key: 'name', label: 'Item name', flex: 2.6, sort: 'name', filter: 'name' },
  { key: 'uom', label: 'UOM', w: 76, filter: 'uom' },
  { key: 'group', label: 'Group', flex: 1.3, sort: 'group', filter: 'group' },
  { key: 'subGroup', label: 'Sub group', flex: 1.3, filter: 'subGroup' },
  { key: 'rate', label: 'Rate', w: 100, right: true, sort: 'rate', filter: 'rate' },
  { key: 'location', label: 'Location', flex: 1, filter: 'location' },
];
const TABLET_COLS: Col[] = [
  { key: 'code', label: 'Code', w: 70, right: true, sort: 'code' },
  { key: 'name', label: 'Item name', flex: 2.4, sort: 'name' },
  { key: 'uom', label: 'UOM', w: 64 },
  { key: 'group', label: 'Group', flex: 1.4, sort: 'group' },
  { key: 'rate', label: 'Rate', w: 92, right: true, sort: 'rate' },
];

const ROW_H = { desktop: 44, tablet: 56 };

export default function BrowseSheet({
  storeLabel,
  currentCode,
  fetchRows,
  onPick,
  onClose,
}: {
  storeLabel: string;
  currentCode?: string;
  fetchRows: () => Promise<BrowseRow[]>;
  onPick: (row: BrowseRow) => void;
  onClose: () => void;
}) {
  const { width: win } = useWindowDimensions();
  const inner = win >= 700 ? Math.min(1080, win - 48) : win;
  const layout: 'desktop' | 'tablet' | 'phone' = inner >= BP_DESKTOP ? 'desktop' : inner >= BP_TABLET ? 'tablet' : 'phone';
  const cols = layout === 'desktop' ? DESKTOP_COLS : TABLET_COLS;

  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [colF, setColF] = useState<BrowseFilters>(NO_COLUMN_FILTERS);
  const [sortKey, setSortKey] = useState<BrowseSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const listRef = useRef<FlatList<BrowseRow>>(null);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRows();
      if (id === seq.current) setRows(data);
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || 'Could not load the item list.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [fetchRows]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++; // ignore late responses after close
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.group).filter(Boolean))).sort(), [rows]);
  const data = useMemo(() => filterBrowse(rows, q, group, colF, sortKey, sortDir), [rows, q, group, colF, sortKey, sortDir]);
  const filtering = !!(q || group || Object.values(colF).some(Boolean));

  useEffect(() => setActive(0), [q, group, colF, sortKey, sortDir]);

  const clearFilters = () => {
    setQ('');
    setGroup('');
    setColF(NO_COLUMN_FILTERS);
  };

  const toggleSort = (k: BrowseSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const rowH = layout === 'desktop' ? ROW_H.desktop : ROW_H.tablet;
  const scrollTo = (i: number) => {
    try {
      listRef.current?.scrollToIndex({ index: i, viewPosition: 0.5, animated: false });
    } catch {
      // list not measured yet
    }
  };

  /* keyboard: ↑ ↓ move, Enter opens (Esc is handled by Sheet) — grid layouts only */
  useWebKeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (layout === 'phone' || loading || data.length === 0) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((a) => {
            const n = Math.max(0, Math.min(data.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1)));
            scrollTo(n);
            return n;
          });
        } else if (e.key === 'Enter') {
          // let Enter work normally on buttons (Cancel, Refresh, chips…)
          const role = (e.target as any)?.getAttribute?.('role');
          if (role === 'button' || role === 'checkbox') return;
          e.preventDefault();
          const r = data[active];
          if (r) onPick(r);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [layout, loading, data, active, onPick],
    ),
  );

  /* ---------------------------------- cells --------------------------------- */
  const cellStyle = (c: Col) => (c.w ? { width: c.w } : { flex: c.flex ?? 1, minWidth: 0 });

  const renderGridRow = ({ item, index }: { item: BrowseRow; index: number }) => {
    const isActive = index === active;
    const isCurrent = !!currentCode && item.code === currentCode;
    return (
      <Pressable
        onPress={() => onPick(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open item ${item.code} ${item.name}`}
        style={(st: any) => [
          g.row,
          { height: rowH },
          index % 2 === 1 && { backgroundColor: T.sub },
          st.hovered && { backgroundColor: `${T.copper}10` },
          isActive && Platform.OS === 'web' && { backgroundColor: `${T.copper}1C` },
          isCurrent && { borderLeftColor: T.copper },
        ]}
      >
        {cols.map((c) => {
          const v =
            c.key === 'rate' ? fmtRate(item.rate) : c.key === 'uom' ? item.uom : c.key === 'code' ? item.code : (item as any)[c.key] || '';
          const muted = !v && c.key !== 'rate';
          return (
            <View key={c.key} style={[cellStyle(c), { paddingRight: 10 }]}>
              <Text
                numberOfLines={1}
                style={[g.td, c.right && { textAlign: 'right' }, c.key === 'name' && { fontWeight: '700' }, c.key === 'code' && { color: T.muted }, muted && { color: T.muted }]}
              >
                {v || '—'}
              </Text>
              {layout === 'tablet' && c.key === 'group' && item.subGroup ? (
                <Text numberOfLines={1} style={g.tdSub}>
                  {item.subGroup}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Pressable>
    );
  };

  const renderCard = ({ item }: { item: BrowseRow }) => {
    const isCurrent = !!currentCode && item.code === currentCode;
    return (
      <Pressable
        onPress={() => onPick(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open item ${item.code} ${item.name}`}
        style={({ pressed }) => [g.card, isCurrent && { borderColor: T.copper }, pressed && { backgroundColor: T.alt }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Text style={[g.cardName]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={g.codeBadge}>
            <Text style={g.codeBadgeText}>{item.code}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={g.cardMeta} numberOfLines={1}>
              {item.group || 'No group'}
              {item.subGroup ? `, ${item.subGroup}` : ''}
            </Text>
            <Text style={g.cardMeta} numberOfLines={1}>
              {item.uom}
              {item.location ? `, ${item.location}` : ''}
            </Text>
          </View>
          <Text style={g.cardRate}>{fmtRate(item.rate)}</Text>
        </View>
      </Pressable>
    );
  };

  /* --------------------------------- chrome --------------------------------- */
  const sortArrow = (k?: BrowseSortKey) => (k && k === sortKey ? (sortDir === 'asc' ? 'arrow-upward' : 'arrow-downward') : null);

  const header = layout !== 'phone' && (
    <View>
      <View style={[g.head]}>
        {cols.map((c) => {
          const arrow = sortArrow(c.sort);
          const inside = (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: c.right ? 'flex-end' : 'flex-start' }}>
              <Text style={g.th} numberOfLines={1}>
                {c.label}
              </Text>
              {arrow ? <Icon name={arrow as any} size={13} color={T.copper} /> : null}
            </View>
          );
          return c.sort ? (
            <Pressable
              key={c.key}
              onPress={() => toggleSort(c.sort!)}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${c.label}`}
              style={[cellStyle(c), { paddingRight: 10, minHeight: 40, justifyContent: 'center' }]}
            >
              {inside}
            </Pressable>
          ) : (
            <View key={c.key} style={[cellStyle(c), { paddingRight: 10, minHeight: 40, justifyContent: 'center' }]}>
              {inside}
            </View>
          );
        })}
      </View>
      {layout === 'desktop' ? (
        <View style={g.filterRow}>
          {cols.map((c) => (
            <View key={c.key} style={[cellStyle(c), { paddingRight: 8 }]}>
              {c.filter ? (
                <TextInput
                  value={colF[c.filter]}
                  onChangeText={(v) => setColF((p) => ({ ...p, [c.filter!]: v }))}
                  placeholder="Filter"
                  placeholderTextColor={T.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={`Filter by ${c.label}`}
                  style={[g.filterInput, c.right && { textAlign: 'right' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <BrowseSkeleton layout={layout} />
  ) : error ? (
    <EmptyState icon="cloud-off" title="Could not load items" message={error} action={<Btn kind="primary" icon="refresh" label="Try again" onPress={load} />} />
  ) : rows.length === 0 ? (
    <EmptyState icon="inventory-2" title="No items in this store yet" message="Use Add on the main screen to create the first item." />
  ) : (
    <EmptyState
      icon="search-off"
      title="No items match"
      message="Try a different word, or clear the filters."
      action={<Btn label="Clear filters" onPress={clearFilters} />}
    />
  );

  return (
    <Sheet
      visible
      size="lg"
      fill
      scroll={false}
      title="Browse items"
      subtitle={storeLabel}
      onClose={onClose}
      headerRight={<Btn icon="refresh" iconOnly kind="quiet" compact onPress={load} disabled={loading} accessibilityLabel="Refresh item list" />}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={g.count} numberOfLines={1}>
              {loading ? 'Loading…' : `Showing ${data.length} of ${rows.length} lines`}
            </Text>
            {layout === 'desktop' && !loading && data.length > 0 ? <Text style={g.hint}>Use ↑ ↓ to move, Enter to open, Esc to close</Text> : null}
          </View>
          {filtering ? <Btn compact label="Clear filters" onPress={clearFilters} /> : null}
          <Btn label="Cancel" onPress={onClose} />
        </View>
      }
    >
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* search + group chips + (phone) sort chips */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <SearchBox value={q} onChangeText={setQ} placeholder="Search code, item, group or location" autoFocus={Platform.OS === 'web'} />
          {groups.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }} keyboardShouldPersistTaps="handled">
              <FilterChip label="All groups" active={!group} onPress={() => setGroup('')} />
              {groups.map((gr) => (
                <FilterChip key={gr} label={gr} active={group === gr} onPress={() => setGroup(group === gr ? '' : gr)} />
              ))}
            </ScrollView>
          ) : null}
          {layout === 'phone' ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ color: T.muted, fontSize: 12, fontWeight: '600' }}>Sort</Text>
              {(['name', 'code', 'rate'] as BrowseSortKey[]).map((k) => (
                <FilterChip
                  key={k}
                  label={`${k === 'name' ? 'Name' : k === 'code' ? 'Code' : 'Rate'}${sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}`}
                  active={sortKey === k}
                  onPress={() => toggleSort(k)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={[{ flex: 1, minHeight: 0, marginTop: 12 }, layout !== 'phone' && { borderTopWidth: 1, borderTopColor: T.border }]}>
          {header}
          <FlatList
            ref={listRef}
            data={loading || error ? [] : data}
            keyExtractor={(r) => r.key}
            renderItem={layout === 'phone' ? renderCard : renderGridRow}
            getItemLayout={layout === 'phone' ? undefined : (_, index) => ({ length: rowH, offset: rowH * index, index })}
            ListEmptyComponent={empty}
            initialNumToRender={24}
            windowSize={9}
            maxToRenderPerBatch={24}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={layout === 'phone' ? { padding: 16, paddingTop: 4, gap: 10 } : undefined}
            onScrollToIndexFailed={() => { }}
            extraData={active}
          />
        </View>
      </View>
    </Sheet>
  );
}

const g = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 19, paddingRight: 9, backgroundColor: T.alt, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { fontSize: 12, fontWeight: '800' as const, color: T.muted },
  filterRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 19, paddingRight: 9, paddingVertical: 6, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  filterInput: { height: 32, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 8, fontSize: 12.5, color: T.ink },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 16, paddingRight: 6, borderLeftWidth: 3, borderLeftColor: 'transparent', borderBottomWidth: 1, borderBottomColor: T.hair },
  td: { fontSize: 13.5, fontWeight: '500' as const, color: T.ink },
  tdSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  card: { borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 14, padding: 12 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: T.ink },
  codeBadge: { backgroundColor: T.alt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadgeText: { fontSize: 12, fontWeight: '800' as const, color: T.muted },
  cardMeta: { fontSize: 12.5, color: T.muted, marginTop: 1 },
  cardRate: { fontSize: 16, fontWeight: '800' as const, color: T.ink },
  count: { fontSize: 12.5, fontWeight: '600' as const, color: T.muted },
  hint: { fontSize: 11.5, color: T.muted, marginTop: 2 },
};
