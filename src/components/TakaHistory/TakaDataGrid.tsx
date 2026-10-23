// FILE: src/components/TakaHistory/TakaDataGrid.tsx
// Wide grid: step-group header + column names (tap = sort, ▾ = column filter) + totals row + virtualised rows.
// Rows come page by page (onEndReached) - same lazy loading as the cards.
import { T } from '@/src/theme';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GridColumn, GridFilter } from './gridApi';
import { columnWidth, fmtNum } from './gridUtils';
import { processColor } from './model';

const ROW_H = 34;

type Props = {
  columns: GridColumn[];
  colIndex: Record<string, number>;
  rows: any[][];
  totals: Record<string, number>;
  sort: { col: string; dir: 'asc' | 'desc' };
  filters: GridFilter[];
  onSort: (col: string) => void;
  onFilter: (c: GridColumn) => void;
  onEndReached: () => void;
  loading: boolean;
  emptyText?: string;
};

export default function TakaDataGrid({ columns, colIndex, rows, totals, sort, filters, onSort, onFilter, onEndReached, loading, emptyText }: Props) {
  const widths = useMemo(() => columns.map(columnWidth), [columns]);
  const totalWidth = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths]);
  const filtered = useMemo(() => new Set(filters.map((f) => f.col)), [filters]);

  // group header spans ("Step 1" over Process / Design / Shade / Qty / Date)
  const groups = useMemo(() => {
    const out: { group: string; width: number; key: string }[] = [];
    columns.forEach((c, i) => {
      const g = c.group || '';
      const last = out[out.length - 1];
      if (last && last.group === g) last.width += widths[i];
      else out.push({ group: g, width: widths[i], key: `${g}-${i}` });
    });
    return out;
  }, [columns, widths]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
      <View style={{ width: totalWidth, flex: 1 }}>
        {/* group row */}
        <View style={st.groupRow}>
          {groups.map((g, i) => (
            <View key={g.key} style={[st.groupCell, { width: g.width }, g.group && i % 2 ? st.groupAlt : null]}>
              <Text style={st.groupText} numberOfLines={1}>
                {g.group}
              </Text>
            </View>
          ))}
        </View>

        {/* column names: tap = sort, ▾ = filter (sibling buttons - no button inside a button on web) */}
        <View style={st.headRow}>
          {columns.map((c, i) => {
            const isSorted = sort.col === c.name;
            const hasFilter = filtered.has(c.name);
            return (
              <View key={c.name} style={[st.headCell, { width: widths[i] }]}>
                <Pressable style={st.headLabel} onPress={() => onSort(c.name)} onLongPress={() => onFilter(c)}>
                  <Text style={st.headText} numberOfLines={2}>
                    {c.label}
                    {isSorted ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onFilter(c)} hitSlop={8} style={[st.filterBtn, hasFilter && st.filterOn]} accessibilityLabel={`Filter ${c.name}`}>
                  <Text style={[st.filterIcon, hasFilter && { color: '#fff' }]}>▾</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* totals of the filtered rows */}
        <View style={st.totalRow}>
          {columns.map((c, i) => (
            <View key={c.name} style={[st.cell, { width: widths[i] }]}>
              <Text style={[st.totalText, c.type === 'number' && st.num]} numberOfLines={1}>
                {i === 0 ? 'Total' : c.type === 'number' && c.total !== false ? fmtNum(totals[c.name], c.decimals) : ''}
              </Text>
            </View>
          ))}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => <Row row={item} index={index} columns={columns} colIndex={colIndex} widths={widths} />}
          getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={7}
          removeClippedSubviews
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator
          style={{ flex: 1 }}
          ListFooterComponent={loading ? <ActivityIndicator color={T.copper} style={{ margin: 12, alignSelf: 'flex-start', marginLeft: 40 }} /> : null}
          ListEmptyComponent={!loading ? <Text style={st.empty}>{emptyText || 'No rows'}</Text> : null}
        />
      </View>
    </ScrollView>
  );
}

const Row = memo(function Row({ row, index, columns, colIndex, widths }: { row: any[]; index: number; columns: GridColumn[]; colIndex: Record<string, number>; widths: number[] }) {
  return (
    <View style={[st.row, index % 2 ? st.rowAlt : null]}>
      {columns.map((c, i) => {
        const v = row[colIndex[c.name]];
        const isProcess = c.label === 'Process' && !!v;
        return (
          <View key={c.name} style={[st.cell, { width: widths[i] }]}>
            <Text
              numberOfLines={1}
              style={[
                st.cellText,
                c.type === 'number' && st.num,
                isProcess && { color: processColor(String(v)), fontWeight: '800' },
                c.name === 'Taka No' && { fontWeight: '900', color: T.nav },
              ]}
            >
              {c.type === 'number' ? fmtNum(v, c.decimals) : v || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  groupRow: { flexDirection: 'row', backgroundColor: T.nav },
  groupCell: { height: 22, justifyContent: 'center', paddingHorizontal: 6 },
  groupAlt: { backgroundColor: '#22344f' },
  groupText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  headRow: { flexDirection: 'row', backgroundColor: T.alt, borderBottomWidth: 1, borderColor: T.border },
  headCell: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingLeft: 6, paddingRight: 2, borderRightWidth: StyleSheet.hairlineWidth, borderColor: T.border },
  headLabel: { flex: 1, paddingVertical: 4 },
  headText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  filterBtn: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  filterOn: { backgroundColor: T.copper },
  filterIcon: { fontSize: 12, color: T.muted },
  totalRow: { flexDirection: 'row', backgroundColor: `${T.amber}1A`, borderBottomWidth: 1, borderColor: T.border },
  totalText: { fontSize: 12, fontWeight: '800', color: T.nav },
  row: { flexDirection: 'row', height: ROW_H, backgroundColor: T.surface },
  rowAlt: { backgroundColor: T.sub },
  cell: { height: ROW_H, justifyContent: 'center', paddingHorizontal: 6, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: T.border },
  cellText: { fontSize: 12, fontWeight: '600', color: T.ink },
  num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  empty: { padding: 20, color: T.muted, fontWeight: '600' },
});
