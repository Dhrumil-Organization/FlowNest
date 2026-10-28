// FILE: src/components/StoreItemMasterNew/BrowseSheet.tsx
// Browse (legacy "ITEM LIST" grid) — one component, three layouts chosen from its own width:
//   desktop ≥ 900  full grid: sortable headers + per-column filter row + keyboard (↑ ↓ Enter Esc)
//   tablet  ≥ 560  compact grid: code, name, UOM, group (+ sub group under it), rate
//   phone   < 560  cards with search, group chips and sort chips
// Mount it only while it is open; it loads on mount and has its own loading / error / empty states.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
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

type ColKey = string;
type Col = { key: ColKey; label: string; flex?: number; w?: number; right?: boolean; sort?: BrowseSortKey; filter?: keyof BrowseFilters };

const DESKTOP_COLS: Col[] = [
  { key: 'code', label: 'Item Code', w: 84, right: true, sort: 'code', filter: 'code' },
  { key: 'name', label: 'Item name', flex: 2.6, sort: 'name', filter: 'name' },
  { key: 'group', label: 'Item Group', flex: 1.3, sort: 'group', filter: 'group' },
  { key: 'rate', label: 'Rate', w: 100, right: true, sort: 'rate', filter: 'rate' },
];
/** UOM is always the LAST column. */
const UOM_COL: Col = { key: 'uom', label: 'UOM', w: 76, filter: 'uom' };
const TABLET_COLS: Col[] = [
  { key: 'code', label: 'Item Code', w: 70, right: true, sort: 'code' },
  { key: 'name', label: 'Item name', flex: 2.4, sort: 'name' },
  { key: 'group', label: 'Item Group', flex: 1.4, sort: 'group' },
  { key: 'rate', label: 'Rate', w: 92, right: true, sort: 'rate' },
  { key: 'uom', label: 'UOM', w: 64 },
];

const ROW_H = { desktop: 44, tablet: 56 };

/** API keys already shown by the fixed columns. */
const KNOWN_KEYS = ['ItmCode','MItmCode','itmcode','code','item_name','ItmName','itmname','name','uom','UOM','PUOM','group_name','GroupName','IGName','itmgrp','sub_group_name','SubGroupName','ISGName','ItmSGrp','rate','Rate','LastRate','last_rate','location','StrLoc','str_code','StrCode',
  // Not wanted in Browse: Item Sub Group, Location, Stop In, Lct Name
  'StopIn','StopIss','stop_in','stop_issue','stop_inward','LctName','lct_name','location_name','sub_group','SubGroup','ItmSGrpName'];
/** Extra API columns that only carry a code (ItmGrp, ItmSGrp, StrLoc, ...) are not shown — only the leading item Code column stays. */
const isCodeKey = (k: string) => /code/i.test(k) || /^(itmgrp|itmsgrp|strloc|yearno|srno|maksrno|make_srno)$/i.test(k);
const showApiKey = (k: string) => !KNOWN_KEYS.includes(k) && !isCodeKey(k);

const MIN_COL_W = 50;
/** Drag handle on the right edge of a header cell: lets the user widen / narrow that column. */
function ResizeHandle({ getWidth, onResize }: { getWidth: () => number; onResize: (w: number) => void }) {
  const live = useRef({ getWidth, onResize });
  live.current = { getWidth, onResize };
  const start = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { start.current = live.current.getWidth(); },
      onPanResponderMove: (_e, gs) => live.current.onResize(Math.max(MIN_COL_W, Math.round(start.current + gs.dx))),
    }),
  ).current;
  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel="Resize column"
      style={[{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 12, zIndex: 5, alignItems: 'center', justifyContent: 'center' }, Platform.OS === 'web' ? ({ cursor: 'col-resize' } as any) : null]}
    >
      <View style={{ width: 2, height: 18, borderRadius: 1, backgroundColor: T.border }} />
    </View>
  );
}

export default function BrowseSheet({
  storeLabel,
  currentCode,
  fetchPage,
  onPick,
  onClose,
}: {
  storeLabel: string;
  currentCode?: string;
  /** Lazy loading: one page at a time (search is sent to the server). */
  fetchPage: (page: number, perPage: number, search: string) => Promise<{ rows: BrowseRow[]; hasMore: boolean; total?: number }>;
  onPick: (row: BrowseRow) => void;
  onClose: () => void;
}) {
  const { width: win } = useWindowDimensions();
  const inner = win >= 700 ? Math.min(1080, win - 48) : win;
  const layout: 'desktop' | 'tablet' | 'phone' = inner >= BP_DESKTOP ? 'desktop' : inner >= BP_TABLET ? 'tablet' : 'phone';
  const [groupBy, setGroupBy] = useState('');
  const [groupPickerIndex, setGroupPickerIndex] = useState(0);
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [colF, setColF] = useState<BrowseFilters>(NO_COLUMN_FILTERS);
  // Filters for API-provided columns are kept separately because their keys are dynamic.
  const [dynamicColF, setDynamicColF] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<BrowseSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  // user-resized column widths (px) by column key; unresized columns use their default width
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [wrapW, setWrapW] = useState(0);
  const listRef = useRef<FlatList<BrowseRow>>(null);

  const dynamicCols = useMemo<Col[]>(() => {
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.apiData || {}))));
    return keys.filter(showApiKey).map((k) => ({ key: `api:${k}`, label: k, flex: 1.2 }));
  }, [rows]);
  const cols = layout === 'desktop' ? [...DESKTOP_COLS, ...dynamicCols, UOM_COL] : TABLET_COLS;

  /* ---------------- lazy loading: first page fast, the rest while scrolling ---------------- */
  // All layouts use an explicit Show more button (like Owner Dashboard).
  // Phone reveals smaller batches; tablet/desktop reveal 50 rows at a time.
  const manual = true;
  const PER_PAGE = layout === 'phone' ? 10 : 50;
  const rk = (r: BrowseRow) => `${r.code}|${r.mItmCode}`;
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0); // server total (0 = unknown)
  const [loadingMore, setLoadingMore] = useState(false);
  const [qServer, setQServer] = useState('');   // debounced search text that is sent to the server
  const pageRef = useRef(1);
  const rowsRef = useRef<BrowseRow[]>([]);
  rowsRef.current = rows;
  const mounted = useRef(false);
  // Search over the WHOLE list: if the server does not filter by `search`, the full list is fetched once (cached)
  // and searched on the device; it is still shown PER_PAGE at a time ("localMode").
  const [localMode, setLocalMode] = useState(false);
  const [shown, setShown] = useState(PER_PAGE);
  const allRef = useRef<BrowseRow[] | null>(null);

  const dedupe = (list: BrowseRow[]) => {
    const seen = new Set<string>();
    return list.filter((x) => (seen.has(rk(x)) ? false : (seen.add(rk(x)), true)));
  };
  /** Every row of the store, page by page (only used when the server ignores `search`). */
  const loadAll = async (id: number): Promise<BrowseRow[] | null> => {
    const out: BrowseRow[] = [];
    const seen = new Set<string>();
    for (let p = 1; p <= 100; p++) {
      const r = await fetchPage(p, 200, '');
      if (id !== seq.current) return null;
      const add = r.rows.filter((x) => (seen.has(rk(x)) ? false : (seen.add(rk(x)), true)));
      out.push(...add);
      if (!add.length || !r.hasMore) break;
    }
    return out;
  };

  const fetchFirst = useCallback(async (search: string) => {
    const id = ++seq.current; // also cancels any page still in flight
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setShown(PER_PAGE);
    try {
      // 1) search already known to need the whole list -> use the cache
      if (search && allRef.current) {
        setRows(allRef.current); setLocalMode(true); setHasMore(false); setTotal(0);
        return;
      }
      const r = await fetchPage(1, PER_PAGE, search);
      if (id !== seq.current) return;
      const first = dedupe(r.rows);
      // 2) does the server really filter by `search`? (every returned row should match what was typed)
      const honored = !search || first.length === 0 || filterBrowse(first, search, '', NO_COLUMN_FILTERS, 'name', 'asc').length === first.length;
      if (!honored) {
        const all = await loadAll(id);
        if (!all || id !== seq.current) return;
        allRef.current = all;
        setRows(all); setLocalMode(true); setHasMore(false); setTotal(0);
        return;
      }
      setLocalMode(false);
      setRows(first);
      pageRef.current = 1;
      setHasMore(r.hasMore);
      setTotal(r.total || 0);
    } catch (e: any) {
      if (id === seq.current) { setError(e?.message || 'Could not load the item list.'); setHasMore(false); }
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [fetchPage, PER_PAGE]);

  const load = useCallback(() => fetchFirst(qServer), [fetchFirst, qServer]);

  useEffect(() => {
    void fetchFirst('');
    mounted.current = true;
    return () => {
      seq.current++; // ignore late responses after close
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // typing in search -> wait 400 ms, then ask the server (so a huge list is never downloaded just to search it)
  useEffect(() => {
    const t = setTimeout(() => setQServer(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (mounted.current) void fetchFirst(qServer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qServer]);

  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.group).filter(Boolean))).sort(), [rows]);
  const data = useMemo(() => {
    const baseFiltered = filterBrowse(rows, q, group, colF, sortKey, sortDir);
    const filtered = baseFiltered.filter((r) => dynamicCols.every((c) => {
      const needle = (dynamicColF[c.key.slice(4)] || '').trim().toLowerCase();
      if (!needle) return true;
      return String((r.apiData || {})[c.key.slice(4)] ?? '').toLowerCase().includes(needle);
    }));
    if (!groupBy) return filtered;
    const value = (r: BrowseRow) => String((r.apiData || {})[groupBy] ?? (r as any)[groupBy] ?? '—');
    return [...filtered].sort((a, b) => value(a).localeCompare(value(b), undefined, { numeric: true }) || a.name.localeCompare(b.name));
  }, [rows, q, group, colF, dynamicColF, dynamicCols, sortKey, sortDir, groupBy]);
  const loadMore = useCallback(async () => {
    // If the API already returned more rows than are visible, reveal the next batch locally.
    if (data.length > shown) { setShown((n) => n + PER_PAGE); return; }
    if (localMode) { setShown((n) => n + PER_PAGE); return; }
    if (loading || loadingMore || !hasMore || error) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const r = await fetchPage(next, PER_PAGE, qServer);
      if (id !== seq.current) return;
      const seen = new Set(rowsRef.current.map(rk));
      const add = r.rows.filter((x) => (seen.has(rk(x)) ? false : (seen.add(rk(x)), true)));
      pageRef.current = next;
      if (add.length) setRows((prev) => [...prev, ...add]);
      if (add.length) setShown((n) => n + PER_PAGE);
      if (r.total) setTotal(r.total);
      setHasMore(add.length > 0 && r.hasMore); // a page with nothing new = server has no more
    } catch (e: any) {
      if (id === seq.current) setHasMore(false);
    } finally {
      if (id === seq.current) setLoadingMore(false);
    }
  }, [data.length, shown, localMode, loading, loadingMore, hasMore, error, fetchPage, qServer, PER_PAGE]);

  // Always cap the visible list. Some APIs return every record despite page parameters,
  // so this also prevents a huge browse list from rendering all rows at once.
  const shownData = useMemo(() => data.slice(0, shown), [data, shown]);
  const canMore = data.length > shown || (!localMode && hasMore);
  // any new search / filter starts again from the first PER_PAGE
  useEffect(() => setShown(PER_PAGE), [q, group, colF, dynamicColF, sortKey, sortDir, groupBy, PER_PAGE]);
  const filtering = !!(q || group || Object.values(colF).some(Boolean) || Object.values(dynamicColF).some(Boolean));
  // Never auto-fetch on scroll: users explicitly choose Show more on every screen size.
  // This keeps browse responsive even when the store contains tens of thousands of items.
  const exportRows = (format: 'csv' | 'pdf') => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const exportCols = cols.map((c) => ({ key: c.key, label: c.label }));
    const value = (r: BrowseRow, key: string) => key.startsWith('api:') ? (r.apiData || {})[key.slice(4)] : key === 'rate' ? fmtRate(r.rate) : (r as any)[key] ?? '';
    if (format === 'csv') {
      const quote = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [exportCols.map((c) => quote(c.label)).join(','), ...data.map((r) => exportCols.map((c) => quote(value(r, c.key))).join(','))].join('\r\n');
      const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = 'store-item-master-browse.csv'; a.click(); URL.revokeObjectURL(url);
    } else {
      const escape = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
      const html = `<!doctype html><html><head><title>Store Item Master</title><style>body{font:12px Arial;padding:16px}h2{margin-bottom:4px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:5px;text-align:left;overflow-wrap:anywhere}th{background:#eee} @page{size:landscape}</style></head><body><h2>Store Item Master - Browse</h2><p>${data.length} records</p><table><thead><tr>${exportCols.map(c=>`<th>${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr>${exportCols.map(c=>`<td>${escape(value(r,c.key))}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
      const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
    }
  };

  useEffect(() => setActive(0), [q, group, colF, dynamicColF, sortKey, sortDir, groupBy]);

  const clearFilters = () => {
    setQ('');
    setGroup('');
    setColF(NO_COLUMN_FILTERS);
    setDynamicColF({});
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
  const baseW = (c: Col) => c.w ?? Math.round((c.flex ?? 1) * 110);
  const GRID_PAD = 30;
  const sumBase = cols.reduce((n, c) => n + (widths[c.key] ?? baseW(c)), 0);
  // spare room (wide screens) goes to the Item name column until the user sizes it themselves
  const spare = Math.max(0, wrapW - GRID_PAD - sumBase);
  const colW = (c: Col) => widths[c.key] ?? baseW(c) + (c.key === 'name' ? spare : 0);
  const tableW = cols.reduce((n, c) => n + colW(c), 0) + GRID_PAD;
  const cellStyle = (c: Col) => ({ width: colW(c) });

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
          const v = c.key.startsWith('api:') ? (item.apiData || {})[c.key.slice(4)] : c.key === 'rate' ? fmtRate(item.rate) : (item as any)[c.key] ?? ''; 
          const muted = !v && c.key !== 'rate';
          return (
            <View key={c.key} style={[cellStyle(c), { paddingRight: 10 }]}>
              <Text
                numberOfLines={1}
                style={[g.td, c.right && { textAlign: 'right' }, c.key === 'name' && { fontWeight: '700' }, c.key === 'code' && { color: T.muted }, muted && { color: T.muted }]}
              >
                {v || '—'}
              </Text>
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
            </Text>
            <Text style={g.cardMeta} numberOfLines={1}>
              {item.uom}
            </Text>
          </View>
          <Text style={g.cardRate}>{fmtRate(item.rate)}</Text>
        </View>
        {Object.entries(item.apiData || {}).filter(([k]) => showApiKey(k)).map(([k, v]) => (
          <Text key={k} style={g.cardMeta} numberOfLines={2}>{k}: {String(v ?? '—')}</Text>
        ))}
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
          const body = c.sort ? (
            <Pressable
              onPress={() => toggleSort(c.sort!)}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${c.label}`}
              style={{ paddingRight: 14, minHeight: 40, justifyContent: 'center' }}
            >
              {inside}
            </Pressable>
          ) : (
            <View style={{ paddingRight: 14, minHeight: 40, justifyContent: 'center' }}>{inside}</View>
          );
          return (
            <View key={c.key} style={[cellStyle(c), { position: 'relative' }]}>
              {body}
              <ResizeHandle getWidth={() => colW(c)} onResize={(w) => setWidths((p) => ({ ...p, [c.key]: w }))} />
            </View>
          );
        })}
      </View>
      {layout === 'desktop' ? (
        <View style={g.filterRow}>
          {cols.map((c) => (
            <View key={c.key} style={[cellStyle(c), { paddingRight: 8 }]}>
              {c.key.startsWith('api:') ? (
                <TextInput
                  value={dynamicColF[c.key.slice(4)] || ''}
                  onChangeText={(v) => setDynamicColF((p) => ({ ...p, [c.key.slice(4)]: v }))}
                  placeholder="Filter"
                  placeholderTextColor={T.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={`Filter by ${c.label}`}
                  style={[g.filterInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
                />
              ) : c.filter ? (
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
  ) : rows.length === 0 && !qServer && !filtering ? (
    <EmptyState icon="inventory-2" title="No items in this store yet" message="Use Add on the main screen to create the first item." />
  ) : (
    <EmptyState
      icon="search-off"
      title="No items match"
      message="Try a different word, or clear the filters."
      action={<Btn label="Clear filters" onPress={clearFilters} />}
    />
  );

  const table = (
    <>
      {header}
      <FlatList
        ref={listRef}
        data={loading || error ? [] : shownData}
        keyExtractor={(r) => r.key}
        renderItem={layout === 'phone' ? renderCard : renderGridRow}
        getItemLayout={layout === 'phone' ? undefined : (_, index) => ({ length: rowH, offset: rowH * index, index })}
        ListEmptyComponent={empty}
        initialNumToRender={manual ? 10 : 24}
        windowSize={manual ? 5 : 9}
        maxToRenderPerBatch={manual ? 10 : 24}
        removeClippedSubviews={manual}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={layout === 'phone' ? { padding: 16, paddingTop: 4, gap: 10 } : undefined}
        onScrollToIndexFailed={() => { }}
        onEndReached={undefined}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
              <ActivityIndicator size="small" color={T.copper} />
              <Text style={g.count}>Loading more…</Text>
            </View>
          ) : canMore && !loading && shownData.length > 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 14 }}>
              {/* same pill as Owner Dashboard: "Show more (50 of 214)" */}
              <Pressable
                onPress={() => void loadMore()}
                accessibilityRole="button"
                accessibilityLabel="Show more items"
                style={(st: any) => [
                  { minHeight: 44, paddingHorizontal: 24, borderRadius: 999, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
                  st.hovered && { backgroundColor: T.alt },
                  st.pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: T.copper, fontSize: 14, fontWeight: '800' }}>
                  {`Show more  (${shownData.length} of ${localMode ? data.length : total && !filtering ? total : hasMore ? `${rows.length}+` : data.length})`}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        extraData={{ active, widths, wrapW, loadingMore, hasMore, canMore, shown }}
      />
    </>
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
        <View style={{ gap: 10 }}>
          <View style={{ minWidth: 0 }}>
            <Text style={g.count} numberOfLines={2}>
              {loading ? 'Loading…' : `Showing ${shownData.length} of ${localMode ? data.length : total && !filtering ? total : hasMore ? `${rows.length}+` : data.length} lines`}
            </Text>
            {layout === 'desktop' && !loading && data.length > 0 ? <Text style={g.hint}>Use ↑ ↓ to move, Enter to open, Esc to close</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            {filtering ? <Btn compact label="Clear filters" onPress={clearFilters} /> : null}
            <Btn label="Cancel" onPress={onClose} />
          </View>
        </View>
      }
    >
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* search + group chips + (phone) sort chips */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <SearchBox value={q} onChangeText={setQ} placeholder="Search code, item or group" autoFocus={Platform.OS === 'web' && win >= 760} />
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: T.muted, fontSize: 12, fontWeight: '700' }}>Group by</Text>
              <Pressable onPress={() => setGroupBy('')} style={g.toolBtn}><Text style={g.toolText}>None</Text></Pressable>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0, maxWidth: '100%' }}>
                {cols.map((c) => { const fieldKey = c.key.startsWith('api:') ? c.key.slice(4) : c.key; return <FilterChip key={c.key} label={c.label} active={groupBy === fieldKey} onPress={() => setGroupBy(groupBy === fieldKey ? '' : fieldKey)} />; })}
              </ScrollView>
            </View>
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
                <Btn compact label="Excel / CSV" onPress={() => exportRows('csv')} />
                <Btn compact label="PDF / Print" onPress={() => exportRows('pdf')} />
              </View>
            ) : null}
          </View>
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
                  label={`${k === 'name' ? 'Name' : k === 'code' ? 'Item Code' : 'Rate'}${sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}`}
                  active={sortKey === k}
                  onPress={() => toggleSort(k)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View
          onLayout={(e) => setWrapW(e.nativeEvent.layout.width)}
          style={[{ flex: 1, minHeight: 0, marginTop: 12 }, layout !== 'phone' && { borderTopWidth: 1, borderTopColor: T.border }]}
        >
          {layout === 'phone' ? (
            table
          ) : (
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={{ flex: 1 }} contentContainerStyle={{ width: tableW }}>
              <View style={{ flex: 1, minHeight: 0 }}>{table}</View>
            </ScrollView>
          )}
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
  toolBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  toolText: { color: T.ink, fontSize: 12, fontWeight: '700' as const },
  count: { fontSize: 12.5, fontWeight: '600' as const, color: T.muted },
  hint: { fontSize: 11.5, color: T.muted, marginTop: 2 },
};
