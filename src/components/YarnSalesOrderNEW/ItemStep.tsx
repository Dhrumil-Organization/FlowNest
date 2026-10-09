// FILE: src/components/YarnSalesOrderNEW/ItemStep.tsx
// Select Item / Modify Item (legacy components/YarnSalesOrder/SalesOrderItemList.tsx).
//   GET /api/getitem { prpcode, strcode, yearno, txntype:'yarn_sales_order' }
// Add flow    : pick an item -> Grade step.
// Pencil flow : (flow.replace === 'item') only the item of that row is replaced and
//               the order summary opens again; the row's old item is pinned on top.
// "+ Add New Item" opens the new-item form (item code '-1', created by the server on save).
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, EmptyState, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { fetchItems } from './api';
import { filterItems, replaceItemOnRow, Row } from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT, ContextStrip, FooterBar, ListSkeleton, OptionRow, SearchInput, useCols } from './ui';

type Props = { token: string; API: string; nav: Nav; flow: PickFlow };

/** Shared by the item list and the new-item form: what happens once an item is chosen. */
export function chooseItem(nav: Nav, flow: PickFlow, item: Row) {
  if (flow.editMode && flow.oldRow && flow.replace === 'item') {
    flow.onDone(replaceItemOnRow(flow.workingRows, flow.oldRow, item), false);
    return;
  }
  nav.push('grade', { ...flow, selectedItem: item });
}

export default function ItemStep({ token, API, nav, flow }: Props) {
  const { cols } = useCols();
  const editMode = flow.editMode;
  const oldRow = flow.oldRow;
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchItems(API, token, flow.ctx);
      if (aliveRef.current) setItems(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] item list error', error?.response?.data || error?.message);
      if (aliveRef.current) {
        AppAlert.alert('Error', 'Unable to load item list');
        setItems([]);
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  useEffect(() => {
    if (!token) return;
    loadItems();
  }, [token, loadItems]);

  const filteredItems = useMemo(() => filterItems(items, search, editMode, oldRow), [items, search, editMode, oldRow]);

  const renderItem = ({ item }: { item: Row }) => {
    const isOld = editMode && !!oldRow && String(oldRow.ItmCode) === String(item.ItmCode);
    return (
      <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <OptionRow
          icon="inventory-2"
          title={`${item.ItmCode} - ${item.ItmName}`}
          lines={[`${item.UOM || '-'}${item.MItmCode ? `  •  Main: ${item.MItmCode}` : ''}`, `Denier : ${item.Denier || '-'}`]}
          selected={isOld}
          badge={isOld ? 'Selected Old Item' : undefined}
          onPress={() => chooseItem(nav, flow, item)}
        />
      </View>
    );
  };

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order', flow.party?.ParName]}
        title={editMode ? 'Modify Item' : 'Select Item'}
        subtitle={loading ? undefined : `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}
      />
      <View style={[CONTENT, st.head]}>
        {editMode && oldRow ? (
          <ContextStrip
            tone="saved"
            entries={[
              { label: 'Currently saved item', value: `${oldRow.ItmCode} - ${oldRow.ItmName}` },
              { label: 'Grade', value: `${oldRow.GrdCode} ${oldRow.GrdName || ''}` },
              { label: 'Shade', value: `${oldRow.ShdCode} ${oldRow.ShdName || ''}` },
            ]}
          />
        ) : null}
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search item name or code" onRefresh={loadItems} loading={loading} />
      </View>
      {loading ? (
        <View style={[CONTENT, { paddingHorizontal: 12 }]}>
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={filteredItems}
          numColumns={cols}
          keyExtractor={(item, index) => `${item.ItmCode}_${index}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          contentContainerStyle={[CONTENT, st.listContent]}
          ListEmptyComponent={<EmptyState icon="inventory-2" title="No item found" />}
        />
      )}
      <FooterBar>
        <Btn label="Add New Item" icon="add" kind="soft" onPress={() => nav.push('addItem', flow)} style={{ flex: 1 }} />
      </FooterBar>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  head: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, gap: 10 },
  listContent: { paddingHorizontal: 7, paddingBottom: 24 },
  cell: { width: '100%', padding: 5 },
});
