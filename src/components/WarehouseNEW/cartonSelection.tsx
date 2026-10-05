// FILE: src/components/WarehouseNEW/cartonSelection.tsx
// The carton list + selection logic that legacy duplicated in
// WarehouseAssignScreen.tsx and WarehouseTransferScreen.tsx:
//   180 ms search debounce, precomputed search text / keys, selected rows
//   pinned on top in most-recently-selected order, toggle, "Clear All",
//   and the merge of rows returned by the scanner (onScanResult).
import { AppAlert } from '@/common/utils/appAlert';
import { EmptyState } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { keyOf, Row, searchable } from './model';
import { CartonCard, SearchInput, useCols } from './ui';

type Entry = { item: Row; key: string; search: string };

export function useCartonSelection(fallbackKeyPrefix: string) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [cartons, setCartons] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Record<string, Row>>({});
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);

  const selectedCount = Object.keys(selected).length;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 180);
    return () => clearTimeout(timer);
  }, [searchText]);

  const indexedCartons = useMemo<Entry[]>(
    () =>
      cartons.map((item, index) => ({
        item,
        key: keyOf(item) || `${fallbackKeyPrefix}${index}`,
        search: searchable(item),
      })),
    [cartons, fallbackKeyPrefix],
  );

  const selectedKeySet = useMemo(() => new Set(Object.keys(selected)), [selected]);

  const selectedOrderRank = useMemo(() => {
    const rank = new Map<string, number>();
    selectedOrder.forEach((key, index) => rank.set(key, index));
    return rank;
  }, [selectedOrder]);

  const filteredCartons = useMemo(() => {
    const query = debouncedSearchText.trim().toLowerCase();
    const selectedRows: Entry[] = [];
    const remainingRows: Entry[] = [];

    indexedCartons.forEach((entry) => {
      if (query && !entry.search.includes(query)) return;
      if (selectedKeySet.has(entry.key)) selectedRows.push(entry);
      else remainingRows.push(entry);
    });

    selectedRows.sort(
      (a, b) =>
        (selectedOrderRank.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
        (selectedOrderRank.get(b.key) ?? Number.MAX_SAFE_INTEGER),
    );

    return [...selectedRows, ...remainingRows];
  }, [indexedCartons, debouncedSearchText, selectedKeySet, selectedOrderRank]);

  const clearSelected = () => {
    setSelected({});
    setSelectedOrder([]);
  };

  const toggleSelect = (item: Row) => {
    const key = keyOf(item);
    if (!key) {
      AppAlert.alert('Validation', 'Carton number missing');
      return;
    }
    const wasSelected = !!selected[key];
    setSelected((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
    setSelectedOrder((order) => (wasSelected ? order.filter((x) => x !== key) : [key, ...order.filter((x) => x !== key)]));
  };

  /** legacy `onScanResult` passed to WarehouseQRScanner / WarehouseQRCameraScanner */
  const applyScanResult = (result: Row[] | Row) => {
    const rows = Array.isArray(result) ? result : [result];
    const validRows = rows.filter(Boolean);
    if (!validRows.length) return;

    setSelected((prev) => {
      const next = { ...prev };
      validRows.forEach((row) => {
        const key = keyOf(row);
        if (key) next[key] = row;
      });
      return next;
    });

    setSelectedOrder((prev) => {
      const newKeys = validRows.map((row) => keyOf(row)).filter(Boolean);
      return [...newKeys.reverse(), ...prev.filter((x) => !newKeys.includes(x))];
    });
  };

  return {
    searchText,
    setSearchText,
    searchFocused,
    setSearchFocused,
    cartons,
    setCartons,
    selected,
    setSelected,
    selectedCount,
    filteredCartons,
    clearSelected,
    toggleSelect,
    applyScanResult,
  };
}

export type CartonSelection = ReturnType<typeof useCartonSelection>;

/** Search box + "Carton List (n)" / Clear All + the selectable list. */
export function CartonListSection({ sel }: { sel: CartonSelection }) {
  const { cols } = useCols();
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <SearchInput
        value={sel.searchText}
        onChangeText={sel.setSearchText}
        onFocus={() => sel.setSearchFocused(true)}
        onBlur={() => sel.setSearchFocused(false)}
        placeholder="Manual search carton / item / shade / voucher"
        style={{ marginBottom: 10 }}
      />

      <View style={st.listHead}>
        <View style={st.listHeadLeft}>
          <Icon name="inventory" size={18} color={T.copper} />
          <Text style={st.listTitle} numberOfLines={1}>Carton List ({sel.filteredCartons.length})</Text>
        </View>
        <TouchableOpacity onPress={sel.clearSelected} style={st.clearBtn} accessibilityRole="button">
          <Icon name="delete-sweep" size={16} color={T.red} />
          <Text style={st.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={'cols-' + cols}
        numColumns={cols}
        style={[{ flex: 1, minHeight: 0 }, Platform.OS === 'web' ? ({ overflowY: 'auto' } as any) : null]}
        data={sel.filteredCartons}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        extraData={sel.selected}
        keyExtractor={(entry) => entry.key}
        initialNumToRender={16}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item: entry }) => (
          <View style={{ flex: 1, maxWidth: `${100 / cols}%`, padding: 4 }}>
            <CartonCard item={entry.item} selected={!!sel.selected[entry.key]} onPress={sel.toggleSelect} />
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="inventory-2" title="No cartons available" />}
      />
    </View>
  );
}

/** Bottom bar: "Selected: n" + save button (legacy hid it while the search box had focus). */
export function SelectionBar({
  count,
  label,
  onSave,
  busy,
}: {
  count: number;
  label: string;
  onSave: () => void;
  busy?: boolean;
}) {
  return (
    <View style={st.bar}>
      <View style={st.barInner}>
        <View style={st.listHeadLeft}>
          <Icon name="check-circle" size={18} color="#fff" />
          <Text style={st.barText} numberOfLines={1}>Selected: {count}</Text>
        </View>
        <TouchableOpacity
          style={[st.barBtn, busy && { opacity: 0.55 }]}
          onPress={onSave}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Icon name="save-alt" size={18} color="#fff" />
          <Text style={st.barBtnText} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  listHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  listTitle: { fontSize: 14, fontWeight: '900', color: T.ink, flexShrink: 1 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: 6 },
  clearText: { color: T.red, fontWeight: '800', fontSize: 13 },
  bar: { backgroundColor: T.nav, paddingHorizontal: 12, paddingVertical: 8, ...S.sheet },
  barInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  barText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: T.copper,
  },
  barBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
