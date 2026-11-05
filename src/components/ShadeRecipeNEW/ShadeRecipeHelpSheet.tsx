// FILE: src/components/ShadeRecipeNEW/ShadeRecipeHelpSheet.tsx
// ONE sheet for both "Browse" and "Copy Recipe" (the legacy RECIPE HELP list):
//   RECIPE NO · DATE · DESCRIPTION · SHADE NAME · RANGE · ITEM NAME
//   mode 'browse' -> click a row to open it; the row has an Edit icon only (NO delete here, by requirement).
//   mode 'copy'   -> click a row to copy it straight into the recipe being edited.
// Column sizing (drag a header edge, double-click = autosize, right-click header = Autosize all columns /
// Reset) is the shared ../ProcessChemicalsNEW/columnSizing — same behaviour as every other grid.
// desktop/tablet (>= 760): table with sortable headers + per-column filter row (like the legacy grid)
// phone: search + sort chips + tappable cards, nothing scrolls sideways.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { fetchBrowse } from './api';
import { BrowseRow, BrowseFilters, BrowseSortKey, NO_FILTERS, filterBrowse, fmtDate } from './model';
import { BrowseSkeleton } from '../StoreItemMasterNew/Skeleton';
import { Banner, Btn, EmptyState, FilterChip, SearchBox, Sheet, useWebKeys } from '../StoreItemMasterNew/ui';
import { ColDef, ColumnMenu, ResizeHandle, useColumnSizing } from '../ProcessChemicalsNEW/columnSizing';

type Props = {
  visible: boolean;
  mode: 'browse' | 'copy';
  API: string;
  token: string;
  /** Recipe currently on screen (highlighted, and excluded from the Copy list). */
  activeNo?: string;
  /** Bump to reload the list (e.g. after a delete). */
  reloadKey?: number;
  onClose: () => void;
  onPick: (row: BrowseRow) => void;
  onEdit?: (row: BrowseRow) => void;
};

const ACT_W = 52; // only the Edit icon is left in the row
const COLS: { k: BrowseSortKey; label: string; flex?: number; w?: number; right?: boolean }[] = [
  { k: 'recipeNo', label: 'Recipe No', w: 92, right: true },
  { k: 'date', label: 'Date', w: 104 },
  { k: 'description', label: 'Description', flex: 1.4 },
  { k: 'shadeName', label: 'Shade name', flex: 1.2 },
  { k: 'color', label: 'Color', w: 110 },
  { k: 'range', label: 'Range', w: 96 },
  { k: 'itemName', label: 'Item name', flex: 1 },
];
const SORTS: { k: BrowseSortKey; label: string }[] = [
  { k: 'recipeNo', label: 'Recipe no' }, { k: 'date', label: 'Date' }, { k: 'description', label: 'Description' }, { k: 'shadeName', label: 'Shade' },
];

export default function ShadeRecipeHelpSheet({ visible, mode, API, token, activeNo, reloadKey = 0, onClose, onPick, onEdit }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const copy = mode === 'copy';
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<BrowseFilters>(NO_FILTERS);
  const [sort, setSort] = useState<BrowseSortKey>('recipeNo');
  const [dir, setDir] = useState<'asc' | 'desc'>(copy ? 'asc' : 'desc');
  const [sel, setSel] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try {
      const r = await fetchBrowse(API, token);
      if (id === seq.current) setRows(r);
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || 'Could not load the recipes.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [API, token]);

  // fresh list + clean filters every time the sheet opens
  useEffect(() => {
    if (!visible) { seq.current++; return; }
    setQuery(''); setFilters(NO_FILTERS); setSel(''); setDir(copy ? 'asc' : 'desc'); setSort('recipeNo');
    load();
  }, [visible, copy, load]);
  // list changed from outside (delete) -> reload but keep the user's filters
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (visible) load(); }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo(() => {
    const base = copy ? rows.filter((r) => r.recipeNo !== activeNo) : rows;
    return filterBrowse(base, query, filters, sort, dir);
  }, [rows, copy, activeNo, query, filters, sort, dir]);

  const actW = !copy && onEdit ? ACT_W : 0;
  const defs = useMemo<ColDef[]>(() => COLS.map((c) => ({ key: c.k, header: c.label, extra: 18, bold: c.k === 'recipeNo' })), []);
  const sz = useColumnSizing(defs, (k) => {
    const out: string[] = [];
    for (const r of data) {
      if (k === 'recipeNo') out.push(String(r.recipeNo));
      else if (k === 'date') out.push(fmtDate(r.date));
      else if (k === 'description') out.push(r.description || '');
      else if (k === 'shadeName') out.push(r.shadeName || '');
      else if (k === 'color') out.push(r.color || '—');
      else if (k === 'range') out.push(r.range || '');
      else if (k === 'itemName') out.push(r.itemName || '—');
    }
    return out;
  });
  const colBase = (c: (typeof COLS)[number]) => (c.w ? { width: c.w } : { flex: c.flex });

  const toggleSort = (k: BrowseSortKey) => { if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSort(k); setDir('asc'); } };
  const confirm = useCallback(() => { const r = data.find((x) => x.recipeNo === sel); if (r) onPick(r); }, [data, sel, onPick]);
  const hasFilter = !!query.trim() || Object.values(filters).some((v) => v.trim());

  useWebKeys(useCallback((e: KeyboardEvent) => {
    if (!data.length) return;
    const i = data.findIndex((r) => r.recipeNo === sel);
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(data[Math.min(data.length - 1, i + 1)].recipeNo); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(data[Math.max(0, i - 1)].recipeNo); }
    else if (e.key === 'Enter' && i >= 0 && !(e.target as any)?.tagName?.match?.(/INPUT/i)) { e.preventDefault(); confirm(); }
  }, [data, sel, confirm]), visible);

  // one click on a recipe opens / copies it straight away (copy mode: fills description, process, item and all chemicals).
  // Arrow keys + Enter and the "Copy recipe" button still work for keyboard users.
  const press = (r: BrowseRow) => { setSel(r.recipeNo); onPick(r); };

  const renderRow = ({ item: r }: { item: BrowseRow }) => {
    const on = r.recipeNo === sel, current = r.recipeNo === activeNo;
    const actions = !copy ? (
      <View style={st.rowActions}>
        {onEdit ? <Btn icon="edit" iconOnly compact kind="quiet" onPress={() => onEdit(r)} accessibilityLabel={`Modify recipe ${r.recipeNo}`} /> : null}
      </View>
    ) : null;
    if (wide) {
      return (
        <Pressable onPress={() => press(r)} accessibilityRole="button" accessibilityState={{ selected: on }}
          style={(p: any) => [st.tr, on && st.trOn, p.hovered && !on && { backgroundColor: T.alt }]}>
          <Text style={[st.td, sz.col('recipeNo', { width: 92 }), { textAlign: 'right', fontWeight: '800' }]} numberOfLines={1}>{r.recipeNo}</Text>
          <Text style={[st.td, sz.col('date', { width: 104 })]} numberOfLines={1}>{fmtDate(r.date)}</Text>
          <Text style={[st.td, sz.col('description', { flex: 1.4 })]} numberOfLines={1}>{r.description}</Text>
          <Text style={[st.td, sz.col('shadeName', { flex: 1.2 })]} numberOfLines={1}>{r.shadeName}</Text>
          <Text style={[st.td, sz.col('color', { width: 110 })]} numberOfLines={1}>{r.color || '—'}</Text>
          <Text style={[st.td, sz.col('range', { width: 96 })]} numberOfLines={1}>{r.range}</Text>
          <Text style={[st.td, sz.col('itemName', { flex: 1 })]} numberOfLines={1}>{r.itemName || '—'}</Text>
          {actW ? <View style={{ width: actW }}>{actions}</View> : null}
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => press(r)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.card, on && st.cardOn]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.noBadge}><Text style={st.noText}>#{r.recipeNo}</Text></View>
          <Text style={st.cardDate}>{fmtDate(r.date)}</Text>
          {current ? <Text style={st.cur}>OPEN</Text> : null}
          <View style={{ flex: 1 }} />
          {copy ? <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={on ? T.copper : T.muted} /> : null}
        </View>
        <Text style={st.cardTitle} numberOfLines={2}>{r.description || '—'}</Text>
        <Text style={st.cardMeta} numberOfLines={1}>{[r.shadeName, r.color, r.range, r.itemName].filter(Boolean).join('  ·  ')}</Text>
        {actions ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>{actions}</View> : null}
      </Pressable>
    );
  };

  const header = (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      <SearchBox value={query} onChangeText={setQuery} placeholder="Search recipe no, description, shade, color, range, item…" autoFocus={wide} />
      {wide ? (
        <View style={st.tableHead}>
          <ColumnMenu sizing={sz} style={st.tr0}>
            {COLS.map((c) => (
              <View key={c.k} style={sz.col(c.k, colBase(c))} onLayout={sz.onLayout(c.k)}>
                <Pressable onPress={() => toggleSort(c.k)} accessibilityRole="button" accessibilityLabel={`Sort by ${c.label}`}
                  style={[st.th, c.right && { justifyContent: 'flex-end' }]}>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {SORTS.map((x) => <FilterChip key={x.k} label={`${x.label}${sort === x.k ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}`} active={sort === x.k} onPress={() => toggleSort(x.k)} />)}
        </View>
      )}
    </View>
  );

  const list = (
    <FlatList
      data={data}
      keyExtractor={(r) => r.recipeNo}
      renderItem={renderRow}
      ListHeaderComponent={header}
      stickyHeaderIndices={wide ? [0] : undefined}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={20}
      windowSize={9}
      ItemSeparatorComponent={wide ? undefined : () => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <EmptyState icon="palette" title={hasFilter ? 'No recipe matches' : 'No recipes yet'}
          message={hasFilter ? 'Try a different search or clear the filters.' : copy ? 'There is no other recipe to copy from.' : 'Press Add to create the first recipe.'} />
      }
    />
  );

  return (
    <Sheet
      visible={visible}
      title={copy ? 'Copy recipe' : 'Browse recipes'}
      subtitle={copy ? 'Click a recipe to copy its description, shade, item and chemicals into this recipe' : `${rows.length} recipe${rows.length === 1 ? '' : 's'}${hasFilter ? ` · ${data.length} shown` : ''}`}
      onClose={onClose}
      size="lg"
      fill
      scroll={false}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon="refresh" label="Refresh" onPress={load} loading={loading} flex={!wide} />
          {hasFilter ? <Btn icon="filter-alt-off" label="Clear" onPress={() => { setQuery(''); setFilters(NO_FILTERS); }} flex={!wide} /> : null}
          <View style={{ flex: wide ? 1 : 0 }} />
          <Btn label="Cancel" onPress={onClose} flex={!wide} />
          {copy ? <Btn kind="primary" icon="content-copy" label="Copy recipe" onPress={confirm} disabled={!sel} flex={!wide} /> : null}
        </View>
      }
    >
      <View style={{ flex: 1, minHeight: 0, padding: wide ? 16 : 12 }}>
        {error ? <View style={{ marginBottom: 10 }}><Banner text={error} action={{ label: 'Retry', onPress: load }} /></View> : null}
        {loading && !rows.length ? (
          <BrowseSkeleton layout={wide ? 'desktop' : 'phone'} />
        ) : (
          wide ? (
            <ScrollView horizontal style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ minWidth: '100%', height: '100%' }}>
              <View style={[{ flexGrow: 1, flexShrink: 0, minWidth: '100%', height: '100%' }, sz.widths ? { width: sz.total + actW + 8 } : null]}>
                {list}
              </View>
            </ScrollView>
          ) : list
        )}
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  cardMeta: { fontSize: 12.5, color: T.muted },
});
