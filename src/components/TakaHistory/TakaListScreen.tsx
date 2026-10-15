// FILE: src/components/TakaHistory/TakaListScreen.tsx
// Step 2 — totals bar · search · "In stock" · sort · endless list of takas (1 / 2 / 3 columns by width).
import { S, T } from '@/src/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, CONTENT_MAX, SearchBox } from '../erpUi';
import { getTakas, getTakaTotals } from './api';
import { fmtQty, SORTS, type TakaFilters, type TakaRow, type TakaRun, type TakaSort, type TakaTotals } from './model';
import TakaCard from './TakaCard';

type Props = { token: string; API: string; run: TakaRun; onOpen: (taka: TakaRow) => void };

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[st.chip, active && st.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[st.chipText, active && st.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Total({ label, value, color, cols }: { label: string; value: string; color: string; cols: number }) {
  return (
    <View style={[st.totalCell, { flexBasis: cols === 4 ? '25%' : '50%' }]}>
      <View style={st.totalCard}>
        <Text style={[st.totalValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
        <Text style={st.totalLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function TakaListScreen({ token, API, run, onOpen }: Props) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced search
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [sort, setSort] = useState<TakaSort>('taka');

  const [items, setItems] = useState<TakaRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totals, setTotals] = useState<TakaTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);
  const requestId = useRef(0);

  // debounce typing
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadPage = useCallback(
    async (p: number) => {
      const id = ++requestId.current;
      const filters: TakaFilters = { search: query, only_in_stock: onlyInStock ? 1 : 0 };
      setLoading(true);
      setError('');
      try {
        const [res, tot] = await Promise.all([
          getTakas(API, token, run.run_id, { ...filters, sort, page: p, per_page: 30 }),
          p === 1 ? getTakaTotals(API, token, run.run_id, filters) : Promise.resolve(null),
        ]);
        if (id !== requestId.current) return; // a newer request is running
        setItems((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
        setPage(res.page);
        setLastPage(res.last_page);
        if (tot) setTotals(tot);
      } catch (e: any) {
        if (id === requestId.current) setError(e?.message || 'Could not load takas.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [API, token, run.run_id, query, onlyInStock, sort],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const loadMore = () => {
    if (!loading && page < lastPage) void loadPage(page + 1);
  };

  const cols = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  const totalCols = width >= 640 ? 4 : 2;

  const header = (
    <View style={{ gap: 10, paddingHorizontal: 5, paddingBottom: 8 }}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search taka no, design or shade" />

      <View style={st.chips}>
        <Chip label="In stock" active={onlyInStock} onPress={() => setOnlyInStock(!onlyInStock)} />
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </View>

      {totals ? (
        <View style={st.totalsGrid}>
          <Total cols={totalCols} label="Takas" value={String(totals.takas)} color={T.nav} />
          <Total cols={totalCols} label="Sales" value={fmtQty(totals.total_sales)} color={T.green} />
          <Total cols={totalCols} label="Closing" value={fmtQty(totals.closing)} color={T.copper} />
          <Total cols={totalCols} label="At job" value={fmtQty(totals.at_job_worker)} color={T.amber} />
        </View>
      ) : null}

      {error ? (
        <View style={st.errorBox}>
          <Text style={st.errorText}>{error}</Text>
          <Btn label="Retry" icon="refresh" compact onPress={() => void loadPage(1)} style={{ marginTop: 8 }} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <FlatList
        key={cols}
        data={items}
        numColumns={cols}
        keyExtractor={(t) => t.key}
        renderItem={({ item }) => (
          <View style={[st.cell, { flexBasis: `${100 / cols}%`, maxWidth: `${100 / cols}%` }]}>
            <TakaCard taka={item} onPress={() => onOpen(item)} />
          </View>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={T.copper} style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={T.copper} style={{ marginTop: 40 }} />
          ) : error ? null : (
            <View style={st.emptyBox}>
              <Text style={st.emptyText}>No takas found</Text>
            </View>
          )
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void loadPage(1)} colors={[T.copper]} tintColor={T.copper} />}
        contentContainerStyle={st.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const st = StyleSheet.create({
  list: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', padding: 7, paddingBottom: 32 },
  cell: { padding: 5, flexGrow: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  chipTextOn: { color: '#fff', fontWeight: '800' },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  totalCell: { padding: 4, flexGrow: 1, minWidth: 0 },
  totalCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...S.card,
    shadowOpacity: 0.03,
    elevation: 1,
  },
  totalValue: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  totalLabel: { marginTop: 1, fontSize: 11, fontWeight: '600', color: T.muted },
  errorBox: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.red}40`, backgroundColor: `${T.red}10`, alignItems: 'flex-start' },
  errorText: { fontSize: 12.5, fontWeight: '700', color: T.red },
  emptyBox: {
    alignItems: 'center',
    margin: 5,
    paddingVertical: 32,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyText: { fontSize: 12.5, fontWeight: '600', color: T.muted },
});
