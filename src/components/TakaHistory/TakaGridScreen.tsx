// FILE: src/components/TakaHistory/TakaGridScreen.tsx
// Grid view: one row per taka, every step as columns. Server side search / sort / column filters,
// totals row, Columns chooser, Excel export, lazy loading (200 rows per page).
// The grid has its own snapshot (taka-grid run) which is built the first time this view is opened.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SearchBox } from '../erpUi';
import { createGridRun, downloadGridExcel, getGridColumns, getGridRows, GRID_PAGE_SIZE, type GridColumn, type GridCreate, type GridFilter, type GridRun } from './gridApi';
import GridColumnsModal from './GridColumnsModal';
import GridFilterModal from './GridFilterModal';
import { describeFilter } from './gridUtils';
import TakaDataGrid from './TakaDataGrid';

const notify = (title: string, msg: string) => (Platform.OS === 'web' ? (globalThis as any).alert(`${title}\n${msg}`) : Alert.alert(title, msg));

type Props = { token: string; API: string; create: GridCreate };

export default function TakaGridScreen({ token, API, create }: Props) {
  const [run, setRun] = useState<GridRun | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');

  const [meta, setMeta] = useState<GridColumn[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<any[][]>([]);
  const [colIndex, setColIndex] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: '', dir: 'asc' });
  const [filters, setFilters] = useState<GridFilter[]>([]);

  const [filterCol, setFilterCol] = useState<GridColumn | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  // 1) build / re-use the grid snapshot (30-60 s the first time)
  const build = useCallback(async () => {
    setBuilding(true);
    setBuildError('');
    try {
      const r = await createGridRun(API, token, create);
      const c = await getGridColumns(API, token, r.run_id);
      setMeta(c.columns);
      setRun(r);
    } catch (e: any) {
      setBuildError(e?.message || 'Could not build the grid.');
    } finally {
      setBuilding(false);
    }
  }, [API, token, create]);

  useEffect(() => {
    void build();
  }, [build]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => ({ search: query, sort: sort.col, dir: sort.dir, filters }), [query, sort, filters]);

  const load = useCallback(
    async (p: number) => {
      if (!run) return;
      const id = ++reqId.current;
      setLoading(true);
      setError('');
      try {
        const res = await getGridRows(API, token, run.run_id, { ...params, page: p, per_page: GRID_PAGE_SIZE });
        if (id !== reqId.current) return;
        const idx: Record<string, number> = {};
        res.columns.forEach((n, i) => {
          idx[n] = i;
        });
        setColIndex(idx);
        setRows((prev) => (p === 1 ? res.rows : prev.concat(res.rows)));
        setTotals(res.totals || {});
        setPage(res.page);
        setLastPage(res.last_page);
        setTotal(res.total);
      } catch (e: any) {
        if (id === reqId.current) setError(e?.message || 'Could not load rows.');
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [API, token, run, params],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const loadMore = () => {
    if (!loading && page < lastPage) void load(page + 1);
  };

  // header tap: asc -> desc -> off
  const onSort = (col: string) =>
    setSort((s) => {
      if (s.col !== col) return { col, dir: 'asc' };
      if (s.dir === 'asc') return { col, dir: 'desc' };
      return { col: '', dir: 'asc' };
    });

  const applyFilter = (f: GridFilter | null) => {
    if (!filterCol) return;
    const col = filterCol.name;
    setFilters((prev) => {
      const rest = prev.filter((x) => x.col !== col);
      return f ? [...rest, f] : rest;
    });
    setFilterCol(null);
  };

  const visibleCols = useMemo(() => meta.filter((c) => !hidden.has(c.name)), [meta, hidden]);
  const metaByName = useMemo(() => Object.fromEntries(meta.map((c) => [c.name, c])) as Record<string, GridColumn>, [meta]);

  const exportExcel = async () => {
    if (!run) return;
    setExporting(true);
    try {
      const dmy = (t?: string | null) => (t || '').split('/').reverse().join('');
      const day = run.from_date || run.to_date ? `Sold_${dmy(run.from_date)}_${dmy(run.to_date)}` : dmy(run.as_on_date);
      await downloadGridExcel(
        API,
        token,
        run.run_id,
        {
          ...params,
          // send the column list only when some columns are hidden
          cols: hidden.size ? visibleCols.map((c) => c.name) : [],
        },
        `TakaHistory_${day}`, // extension (.xlsx / .csv) is added from the server response
      );
    } catch (e: any) {
      notify('Excel', e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearAll = () => {
    setFilters([]);
    setSearch('');
    setSort({ col: '', dir: 'asc' });
  };

  // ---- building / error state ----
  if (!run) {
    return (
      <View style={st.center}>
        {buildError ? (
          <View style={st.centerCard}>
            <Text style={st.errText}>{buildError}</Text>
            <TouchableOpacity style={[st.tool, st.toolMain, { marginTop: 12 }]} onPress={() => void build()} accessibilityRole="button">
              <Icon name="refresh" size={16} color="#fff" />
              <Text style={[st.toolText, { color: '#fff' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.centerCard}>
            <ActivityIndicator color={T.copper} size="large" />
            <Text style={st.centerTitle}>{building ? 'Building grid…' : 'Loading…'}</Text>
            <Text style={st.centerText}>The first time this can take up to a minute.</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* toolbar */}
      <View style={st.toolbar}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Search all text columns" />
        </View>
        <TouchableOpacity style={st.tool} onPress={() => setShowColumns(true)} accessibilityRole="button">
          <Icon name="view-column" size={16} color={T.nav} />
          <Text style={st.toolText}>Columns</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tool, st.toolMain, exporting && { opacity: 0.7 }]} onPress={exportExcel} disabled={exporting} accessibilityRole="button">
          <Icon name="file-download" size={16} color="#fff" />
          <Text style={[st.toolText, { color: '#fff' }]}>{exporting ? 'Exporting…' : 'Excel'}</Text>
        </TouchableOpacity>
      </View>

      {/* active sort / filters */}
      {filters.length || sort.col || query ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {sort.col ? <Chip text={`Sort: ${sort.col} ${sort.dir === 'asc' ? '▲' : '▼'}`} onPress={() => setSort({ col: '', dir: 'asc' })} /> : null}
          {filters.map((f) => (
            <Chip key={f.col} text={describeFilter(f, metaByName[f.col])} onPress={() => setFilters(filters.filter((x) => x !== f))} />
          ))}
          <Chip text="Clear all" onPress={clearAll} danger />
        </ScrollView>
      ) : null}

      <View style={st.status}>
        <Text style={st.statusText} numberOfLines={1}>
          {loading && !rows.length ? 'Loading…' : `${rows.length.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} takas`}
          {'  ·  '}Tap a heading to sort · ▾ to filter
        </Text>
        {loading ? <ActivityIndicator size="small" color={T.copper} /> : null}
      </View>
      {error ? <Text style={st.error}>{error}</Text> : null}

      <TakaDataGrid
        columns={visibleCols}
        colIndex={colIndex}
        rows={rows}
        totals={totals}
        sort={sort}
        filters={filters}
        onSort={onSort}
        onFilter={(c) => setFilterCol(c)}
        onEndReached={loadMore}
        loading={loading}
        emptyText="No takas match the filters"
      />

      <GridFilterModal column={filterCol} current={filterCol ? filters.find((f) => f.col === filterCol.name) : null} onApply={applyFilter} onClose={() => setFilterCol(null)} />
      <GridColumnsModal visible={showColumns} columns={meta} hidden={hidden} onChange={setHidden} onClose={() => setShowColumns(false)} />
    </View>
  );
}

function Chip({ text, onPress, danger }: { text: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.chip, danger && st.chipDanger]} accessibilityRole="button">
      <Text style={[st.chipText, danger && { color: T.red }]} numberOfLines={1}>
        {text}  ✕
      </Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 12 },
  centerCard: { width: '100%', maxWidth: 420, alignItems: 'center', marginTop: 24, padding: 28, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, ...S.card, shadowOpacity: 0.04, elevation: 1 },
  centerTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 14 },
  centerText: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 4, textAlign: 'center' },
  errText: { fontSize: 13, fontWeight: '700', color: T.red, textAlign: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 10, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  toolMain: { backgroundColor: T.nav, borderColor: T.nav },
  toolText: { fontSize: 13, fontWeight: '800', color: T.nav },
  chipBar: { flexGrow: 0, backgroundColor: T.surface, paddingVertical: 8 },
  chip: { paddingHorizontal: 10, height: 28, justifyContent: 'center', borderRadius: 14, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border, marginRight: 6, maxWidth: 260 },
  chipDanger: { backgroundColor: `${T.red}10`, borderColor: `${T.red}40` },
  chipText: { fontSize: 12, fontWeight: '700', color: T.nav },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: T.muted, flex: 1 },
  error: { color: T.red, fontWeight: '700', paddingHorizontal: 12, paddingBottom: 6 },
});
