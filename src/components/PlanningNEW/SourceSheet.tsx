// FILE: src/components/PlanningNEW/SourceSheet.tsx
// ITEM HELP — pending Sales Order (SO) and Job Order (JO) item rows that can be planned.
//   • shows SO no + SO date  or  JO no + JO date, party, item, shade, order qty and what is still free to plan
//   • tick one or more rows → "Add to plan"; a plan can only hold ONE item, so rows of another item are disabled
//   • wide (>= 760)  table with sortable / resizable columns + filter box      phone  tappable cards, nothing scrolls sideways
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fetchSources } from './api';
import { PlanType, SourceKind, SourceRow, fmtDate, fmtQty } from './model';
import { BrowseSkeleton } from '../StoreItemMasterNew/Skeleton';
import { Banner, Btn, EmptyState, FilterChip, SearchBox, Sheet } from '../StoreItemMasterNew/ui';
import { ColDef, ColumnMenu, ResizeHandle, useColumnSizing } from '../ProcessChemicalsNEW/columnSizing';

type Props = {
  visible: boolean;
  API: string;
  token: string;
  type: PlanType;
  processCode: string;
  /** item already in the grid (the plan can have only one) */
  lockedItem: string;
  /** keys (kind|no|item|shade) already in the grid */
  taken: string[];
  onClose: () => void;
  onApply: (rows: SourceRow[]) => void;
};

const ACT_W = 44;
const COLS = [
  { k: 'kind', label: 'Type', w: 64 },
  { k: 'orderNo', label: 'Order No', w: 120 },
  { k: 'orderDate', label: 'Order Date', w: 108 },
  { k: 'partyName', label: 'Party Name', flex: 1.4 },
  { k: 'itemName', label: 'Item Name', flex: 1.1 },
  { k: 'shadeName', label: 'Shade', w: 130 },
  { k: 'orderQty', label: 'Order Qty', w: 104, right: true },
  { k: 'balance', label: 'Balance', w: 104, right: true },
] as const;
type K = (typeof COLS)[number]['k'];
const cell = (r: SourceRow, k: K) => (k === 'orderDate' ? fmtDate(r.orderDate) : k === 'orderQty' ? fmtQty(r.orderQty) : k === 'balance' ? fmtQty(r.balance) : String(r[k] ?? ''));

export default function SourceSheet({ visible, API, token, type, processCode, lockedItem, taken, onClose, onApply }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'ALL' | SourceKind>('ALL');
  const [sort, setSort] = useState<K>('orderDate');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [sel, setSel] = useState<string[]>([]);
  const [hint, setHint] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try { const r = await fetchSources(API, token, type, processCode); if (id === seq.current) setRows(r); }
    catch (e: any) { if (id === seq.current) setError(e?.message || 'Could not load the orders.'); }
    finally { if (id === seq.current) setLoading(false); }
  }, [API, token, type, processCode]);

  useEffect(() => {
    if (!visible) { seq.current++; return; }
    setQuery(''); setKind('ALL'); setSel([]); setHint(''); setSort('orderDate'); setDir('desc');
    load();
  }, [visible, load]);

  const takenSet = useMemo(() => new Set(taken), [taken]);
  const selRows = useMemo(() => rows.filter((r) => sel.includes(r.key)), [rows, sel]);
  const pickedItem = lockedItem || selRows[0]?.itemCode || '';

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => !takenSet.has(r.key) && (kind === 'ALL' || r.kind === kind)
      && (!q || COLS.some((c) => cell(r, c.k).toLowerCase().includes(q))));
    const m = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const x: any = sort === 'orderQty' || sort === 'balance' ? a[sort] : sort === 'orderDate' ? a.orderDate : String(a[sort]);
      const y: any = sort === 'orderQty' || sort === 'balance' ? b[sort] : sort === 'orderDate' ? b.orderDate : String(b[sort]);
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * m;
    });
  }, [rows, takenSet, kind, query, sort, dir]);

  const defs = useMemo<ColDef[]>(() => COLS.map((c) => ({ key: c.k, header: c.label, extra: 18, bold: c.k === 'orderNo' })), []);
  const sz = useColumnSizing(defs, (k) => data.map((r) => cell(r, k as K)));
  const colBase = (c: (typeof COLS)[number]) => ('w' in c ? { width: c.w } : { flex: (c as any).flex });

  const blocked = (r: SourceRow) => !!pickedItem && r.itemCode !== pickedItem;
  const toggle = (r: SourceRow) => {
    if (blocked(r)) { setHint(`A plan can have only one item. Clear the selection to pick ${r.itemName}.`); return; }
    setHint('');
    setSel((s) => (s.includes(r.key) ? s.filter((x) => x !== r.key) : [...s, r.key]));
  };
  const toggleSort = (k: K) => { if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSort(k); setDir('asc'); } };
  const apply = () => { if (selRows.length) onApply(selRows); };
  const hasFilter = !!query.trim() || kind !== 'ALL';

  const check = (on: boolean, off: boolean) => <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? T.copper : off ? T.border : T.muted} />;

  const renderRow = ({ item: r }: { item: SourceRow }) => {
    const on = sel.includes(r.key), off = blocked(r);
    if (wide) {
      return (
        <Pressable onPress={() => toggle(r)} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: off }}
          style={(p: any) => [st.tr, on && st.trOn, off && { opacity: 0.45 }, p.hovered && !on && { backgroundColor: T.alt }]}>
          <View style={{ width: ACT_W, alignItems: 'center' }}>{check(on, off)}</View>
          {COLS.map((c) => (
            <Text key={c.k} style={[st.td, sz.col(c.k, colBase(c)), ('right' in c && c.right) ? { textAlign: 'right' } : null, c.k === 'orderNo' && { fontWeight: '800' }]} numberOfLines={1}>{cell(r, c.k) || '—'}</Text>
          ))}
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => toggle(r)} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: off }} style={[st.card, on && st.cardOn, off && { opacity: 0.45 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.kind}><Text style={st.kindTx}>{r.kind}</Text></View>
          <Text style={st.cardNo}>{r.orderNo}</Text>
          <Text style={st.cardDate}>{fmtDate(r.orderDate)}</Text>
          <View style={{ flex: 1 }} />
          {check(on, off)}
        </View>
        <Text style={st.cardTitle} numberOfLines={2}>{r.partyName || '—'}</Text>
        <Text style={st.cardMeta} numberOfLines={1}>{[r.itemName, r.shadeName].filter(Boolean).join('  ·  ')}</Text>
        <Text style={st.cardMeta}>Order {fmtQty(r.orderQty)}   ·   <Text style={{ color: T.copper, fontWeight: '800' }}>Balance {fmtQty(r.balance)}</Text></Text>
      </Pressable>
    );
  };

  const header = (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      <SearchBox value={query} onChangeText={setQuery} placeholder="Search order no, party, item, shade…" autoFocus={wide} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <FilterChip label="All" active={kind === 'ALL'} onPress={() => setKind('ALL')} />
        <FilterChip label="Sales Order" active={kind === 'SO'} onPress={() => setKind('SO')} />
        <FilterChip label="Job Order" active={kind === 'JO'} onPress={() => setKind('JO')} />
        {!wide ? <FilterChip label={`Date ${dir === 'asc' ? '↑' : '↓'}`} active onPress={() => toggleSort('orderDate')} /> : null}
      </View>
      {hint ? <Banner tone="info" text={hint} /> : null}
      {wide ? (
        <View style={st.tableHead}>
          <ColumnMenu sizing={sz} style={st.tr0}>
            <View style={{ width: ACT_W }} />
            {COLS.map((c) => (
              <View key={c.k} style={sz.col(c.k, colBase(c))} onLayout={sz.onLayout(c.k)}>
                <Pressable onPress={() => toggleSort(c.k)} accessibilityRole="button" accessibilityLabel={`Sort by ${c.label}`} style={[st.th, ('right' in c && c.right) && { justifyContent: 'flex-end' }]}>
                  <Text style={st.thText} numberOfLines={1}>{c.label.toUpperCase()}</Text>
                  {sort === c.k ? <Icon name={dir === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={13} color={T.copper} /> : null}
                </Pressable>
                <ResizeHandle sizing={sz} k={c.k} />
              </View>
            ))}
          </ColumnMenu>
        </View>
      ) : null}
    </View>
  );

  const list = (
    <FlatList data={data} keyExtractor={(r) => r.key} renderItem={renderRow} ListHeaderComponent={header} stickyHeaderIndices={wide ? [0] : undefined}
      keyboardShouldPersistTaps="handled" initialNumToRender={20} windowSize={9} extraData={sel}
      ItemSeparatorComponent={wide ? undefined : () => <View style={{ height: 10 }} />}
      ListEmptyComponent={<EmptyState icon="inbox" title={hasFilter ? 'No order matches' : 'No pending orders'} message={hasFilter ? 'Try a different search or clear the filters.' : 'There is no Sales Order / Job Order left to plan for this type.'} />} />
  );

  return (
    <Sheet visible={visible} title="Item help — Sales / Job Orders" size="lg" fill scroll={false} onClose={onClose}
      subtitle={`${data.length} order${data.length === 1 ? '' : 's'} to plan${pickedItem ? ' · one item per plan' : ''}`}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn icon="refresh" label="Refresh" onPress={load} loading={loading} flex={!wide} />
          {sel.length ? <Btn icon="clear-all" label="Clear" onPress={() => { setSel([]); setHint(''); }} flex={!wide} /> : null}
          <View style={{ flex: wide ? 1 : 0 }} />
          <Btn label="Cancel" onPress={onClose} flex={!wide} />
          <Btn kind="primary" icon="playlist-add" label={sel.length ? `Add ${sel.length} to plan` : 'Add to plan'} onPress={apply} disabled={!sel.length} flex={!wide} />
        </View>
      }>
      <View style={{ flex: 1, minHeight: 0, padding: wide ? 16 : 12 }}>
        {error ? <View style={{ marginBottom: 10 }}><Banner text={error} action={{ label: 'Retry', onPress: load }} /></View> : null}
        {loading && !rows.length ? <BrowseSkeleton layout={wide ? 'desktop' : 'phone'} /> : wide ? (
          <ScrollView horizontal style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ minWidth: '100%', height: '100%' }}>
            <View style={[{ flexGrow: 1, flexShrink: 0, minWidth: '100%', height: '100%' }, sz.widths ? { width: sz.total + ACT_W + 8 } : null]}>{list}</View>
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
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.hair, borderLeftWidth: 3, borderLeftColor: 'transparent', backgroundColor: T.surface },
  trOn: { backgroundColor: `${T.copper}14`, borderLeftColor: T.copper },
  td: { fontSize: 13.5, color: T.ink, paddingHorizontal: 10, paddingVertical: 8 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 12, gap: 6 },
  cardOn: { borderColor: T.copper, backgroundColor: `${T.copper}0F` },
  kind: { backgroundColor: `${T.copper}18`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  kindTx: { fontSize: 10.5, fontWeight: '800', color: T.copper },
  cardNo: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  cardDate: { fontSize: 12.5, color: T.muted, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  cardMeta: { fontSize: 12.5, color: T.muted },
});
