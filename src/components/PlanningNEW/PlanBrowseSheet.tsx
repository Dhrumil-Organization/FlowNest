// FILE: src/components/PlanningNEW/PlanBrowseSheet.tsx
// PLANNING HELP (Browse): Voucher No | Date | Job | Process | Item | Shade | Machine | Qty | Party
//   • click a row → opens it (view)    • Edit icon → opens it in Modify (only for Pending plans)
//   • NO delete here, by requirement — Delete lives only on the opened plan
//   • desktop/tablet: sortable headers, per-column filter row, resizable columns (right-click → Autosize all columns)
//   • phone: search + sort chips + tappable cards, nothing scrolls sideways
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { fetchBrowse } from './api';
import { BrowseFilters, BrowseRow, BrowseSortKey, NO_FILTERS, browseText, filterBrowse, fmtDate, fmtQty, typeLabel, voucherLabel } from './model';
import { BrowseSkeleton } from '../StoreItemMasterNew/Skeleton';
import { Banner, Btn, EmptyState, FilterChip, SearchBox, Sheet, useWebKeys } from '../StoreItemMasterNew/ui';
import { ColDef, ColumnMenu, ResizeHandle, useColumnSizing } from '../ProcessChemicalsNEW/columnSizing';

type Props = {
  visible: boolean; API: string; token: string; activeNo?: string; reloadKey?: number;
  onClose: () => void; onPick: (row: BrowseRow) => void; onEdit?: (row: BrowseRow) => void;
};
const ACT_W = 52;
const COLS: { k: BrowseSortKey; label: string; flex?: number; w?: number; right?: boolean }[] = [
  { k: 'voucher', label: 'Voucher No', w: 112 },
  { k: 'date', label: 'Date', w: 104 },
  { k: 'type', label: 'Job', w: 96 },
  { k: 'process', label: 'Process', flex: 1 },
  { k: 'item', label: 'Item', flex: 1 },
  { k: 'shade', label: 'Shade', w: 130 },
  { k: 'machine', label: 'Machine', w: 100 },
  { k: 'qty', label: 'Qty', w: 100, right: true },
  { k: 'party', label: 'Party', flex: 1.2 },
];
const SORTS: { k: BrowseSortKey; label: string }[] = [{ k: 'voucher', label: 'Voucher' }, { k: 'date', label: 'Date' }, { k: 'machine', label: 'Machine' }];

export default function PlanBrowseSheet({ visible, API, token, activeNo, reloadKey = 0, onClose, onPick, onEdit }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<BrowseFilters>(NO_FILTERS);
  const [sort, setSort] = useState<BrowseSortKey>('voucher');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [sel, setSel] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try { const r = await fetchBrowse(API, token); if (id === seq.current) setRows(r); }
    catch (e: any) { if (id === seq.current) setError(e?.message || 'Could not load the plans.'); }
    finally { if (id === seq.current) setLoading(false); }
  }, [API, token]);

  useEffect(() => {
    if (!visible) { seq.current++; return; }
    setQuery(''); setFilters(NO_FILTERS); setSel(''); setSort('voucher'); setDir('desc');
    load();
  }, [visible, load]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (visible) load(); }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo(() => filterBrowse(rows, query, filters, sort, dir), [rows, query, filters, sort, dir]);
  const actW = onEdit ? ACT_W : 0;
  const defs = useMemo<ColDef[]>(() => COLS.map((c) => ({ key: c.k, header: c.label, extra: 18, bold: c.k === 'voucher' })), []);
  const sz = useColumnSizing(defs, (k) => data.map((r) => browseText(r, k as BrowseSortKey)));
  const colBase = (c: (typeof COLS)[number]) => (c.w ? { width: c.w } : { flex: c.flex });
  const toggleSort = (k: BrowseSortKey) => { if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSort(k); setDir('asc'); } };
  const hasFilter = !!query.trim() || Object.values(filters).some((v) => v.trim());
  const keyOf = (r: BrowseRow) => r.voucherNo;

  useWebKeys(useCallback((e: KeyboardEvent) => {
    if (!data.length) return;
    const i = data.findIndex((r) => keyOf(r) === sel);
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(keyOf(data[Math.min(data.length - 1, i + 1)])); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(keyOf(data[Math.max(0, i - 1)])); }
    else if (e.key === 'Enter' && i >= 0 && !(e.target as any)?.tagName?.match?.(/INPUT/i)) { e.preventDefault(); onPick(data[i]); }
  }, [data, sel, onPick]), visible);

  const press = (r: BrowseRow) => { setSel(keyOf(r)); onPick(r); };
  const pending = (r: BrowseRow) => String(r.status || 'Pending').toLowerCase() === 'pending';

  const renderRow = ({ item: r }: { item: BrowseRow }) => {
    const on = keyOf(r) === sel, current = keyOf(r) === activeNo;
    const edit = onEdit && pending(r) ? <Btn icon="edit" iconOnly compact kind="quiet" onPress={() => onEdit(r)} accessibilityLabel={`Modify planning ${voucherLabel(r)}`} /> : null;
    if (wide) {
      return (
        <Pressable onPress={() => press(r)} accessibilityRole="button" accessibilityState={{ selected: on }} style={(p: any) => [st.tr, on && st.trOn, p.hovered && !on && { backgroundColor: T.alt }]}>
          <Text style={[st.td, sz.col('voucher', { width: 112 }), { fontWeight: '800' }]} numberOfLines={1}>{voucherLabel(r)}</Text>
          <Text style={[st.td, sz.col('date', { width: 104 })]} numberOfLines={1}>{fmtDate(r.date)}</Text>
          <Text style={[st.td, sz.col('type', { width: 96 })]} numberOfLines={1}>{typeLabel(r.type)}</Text>
          <Text style={[st.td, sz.col('process', { flex: 1 })]} numberOfLines={1}>{r.process}</Text>
          <Text style={[st.td, sz.col('item', { flex: 1 })]} numberOfLines={1}>{r.itemName || '—'}</Text>
          <Text style={[st.td, sz.col('shade', { width: 130 })]} numberOfLines={1}>{r.shade || '—'}</Text>
          <Text style={[st.td, sz.col('machine', { width: 100 })]} numberOfLines={1}>{r.machine}</Text>
          <Text style={[st.td, sz.col('qty', { width: 100 }), { textAlign: 'right', fontVariant: ['tabular-nums'] }]} numberOfLines={1}>{fmtQty(r.qty)}</Text>
          <Text style={[st.td, sz.col('party', { flex: 1.2 })]} numberOfLines={1}>{r.party || '—'}</Text>
          {actW ? <View style={{ width: actW }}><View style={st.rowActions}>{edit}</View></View> : null}
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => press(r)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.card, on && st.cardOn]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.noBadge}><Text style={st.noText}>{voucherLabel(r)}</Text></View>
          <Text style={st.cardDate}>{fmtDate(r.date)}</Text>
          {current ? <Text style={st.cur}>OPEN</Text> : null}
          <View style={{ flex: 1 }} />
          <Text style={[st.state, { color: pending(r) ? T.amber : T.green }]}>{(r.status || 'Pending').toUpperCase()}</Text>
        </View>
        <Text style={st.cardTitle} numberOfLines={2}>{r.itemName || '—'}{r.shade ? `  ·  ${r.shade}` : ''}</Text>
        <Text style={st.cardMeta} numberOfLines={1}>{[typeLabel(r.type), r.process, r.machine].filter(Boolean).join('  ·  ')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[st.cardMeta, { flex: 1 }]} numberOfLines={1}>{r.party}</Text>
          <Text style={st.cardQty}>{fmtQty(r.qty)}</Text>
          {edit}
        </View>
      </Pressable>
    );
  };

  const header = (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      <SearchBox value={query} onChangeText={setQuery} placeholder="Search voucher, item, shade, machine, party…" autoFocus={wide} />
      {wide ? (
        <View style={st.tableHead}>
          <ColumnMenu sizing={sz} style={st.tr0}>
            {COLS.map((c) => (
              <View key={c.k} style={sz.col(c.k, colBase(c))} onLayout={sz.onLayout(c.k)}>
                <Pressable onPress={() => toggleSort(c.k)} accessibilityRole="button" accessibilityLabel={`Sort by ${c.label}`} style={[st.th, c.right && { justifyContent: 'flex-end' }]}>
                  <Text style={st.thText} numberOfLines={1}>{c.label.toUpperCase()}</Text>
                  {sort === c.k ? <Icon name={dir === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={13} color={T.copper} /> : null}
                </Pressable>
                <ResizeHandle sizing={sz} k={c.k} />
              </View>
            ))}
            {actW ? <View style={{ width: actW }} /> : null}
          </ColumnMenu>
          <View style={st.tr0}>
            {COLS.map((c) => (
              <View key={c.k} style={[sz.col(c.k, colBase(c)), { paddingHorizontal: 4, paddingBottom: 6 }]}>
                <TextInput value={filters[c.k]} onChangeText={(v) => setFilters((f) => ({ ...f, [c.k]: v }))} placeholder="Filter" placeholderTextColor={T.muted}
                  style={[st.filter, c.right && { textAlign: 'right' }]} accessibilityLabel={`Filter ${c.label}`} />
              </View>
            ))}
            {actW ? <View style={{ width: actW }} /> : null}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SORTS.map((x) => <FilterChip key={x.k} label={`${x.label}${sort === x.k ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}`} active={sort === x.k} onPress={() => toggleSort(x.k)} />)}
        </View>
      )}
    </View>
  );

  const list = (
    <FlatList data={data} keyExtractor={keyOf} renderItem={renderRow} ListHeaderComponent={header} stickyHeaderIndices={wide ? [0] : undefined} extraData={sel}
      keyboardShouldPersistTaps="handled" initialNumToRender={20} windowSize={9} ItemSeparatorComponent={wide ? undefined : () => <View style={{ height: 10 }} />}
      ListEmptyComponent={<EmptyState icon="event-note" title={hasFilter ? 'No plan matches' : 'No plans yet'} message={hasFilter ? 'Try a different search or clear the filters.' : 'Press Add to create the first plan.'} />} />
  );

  return (
    <Sheet visible={visible} title="Planning help" size="lg" fill scroll={false} onClose={onClose}
      subtitle={`${rows.length} plan${rows.length === 1 ? '' : 's'}${hasFilter ? ` · ${data.length} shown` : ''}`}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon="refresh" label="Refresh" onPress={load} loading={loading} flex={!wide} />
          {hasFilter ? <Btn icon="filter-alt-off" label="Clear" onPress={() => { setQuery(''); setFilters(NO_FILTERS); }} flex={!wide} /> : null}
          <View style={{ flex: wide ? 1 : 0 }} />
          <Btn label="Cancel" onPress={onClose} flex={!wide} />
        </View>
      }>
      <View style={{ flex: 1, minHeight: 0, padding: wide ? 16 : 12 }}>
        {error ? <View style={{ marginBottom: 10 }}><Banner text={error} action={{ label: 'Retry', onPress: load }} /></View> : null}
        {loading && !rows.length ? <BrowseSkeleton layout={wide ? 'desktop' : 'phone'} /> : wide ? (
          <ScrollView horizontal style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ minWidth: '100%', height: '100%' }}>
            <View style={[{ flexGrow: 1, flexShrink: 0, minWidth: '100%', height: '100%' }, sz.widths ? { width: sz.total + actW + 8 } : null]}>{list}</View>
          </ScrollView>
        ) : list}
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  tableHead: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  tr0: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.sub },
  th: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 38 },
  thText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: T.muted },
  filter: { minHeight: 34, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8, fontSize: 13, color: T.ink, backgroundColor: T.surface },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.hair, borderLeftWidth: 3, borderLeftColor: 'transparent', backgroundColor: T.surface },
  trOn: { backgroundColor: `${T.copper}14`, borderLeftColor: T.copper },
  td: { fontSize: 13.5, color: T.ink, paddingHorizontal: 10, paddingVertical: 8 },
  rowActions: { flexDirection: 'row', gap: 4, justifyContent: 'flex-end', paddingRight: 6 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 12, gap: 6 },
  cardOn: { borderColor: T.copper, backgroundColor: `${T.copper}0F` },
  noBadge: { backgroundColor: `${T.copper}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  noText: { fontSize: 12.5, fontWeight: '800', color: T.copper },
  cardDate: { fontSize: 12.5, color: T.muted, fontWeight: '600' },
  cur: { fontSize: 10.5, fontWeight: '800', color: T.green, letterSpacing: 0.5 },
  state: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  cardMeta: { fontSize: 12.5, color: T.muted },
  cardQty: { fontSize: 14.5, fontWeight: '800', color: T.ink, fontVariant: ['tabular-nums'], marginRight: 4 },
});
