// FILE: src/components/YarnSalesOrderNEW/ShadeStep.tsx
// Select Shade / Modify Shade (legacy components/YarnSalesOrder/SalesOrderShadeList.tsx).
//   GET /api/getmobshade { prpcode, strcode, yearno, itmcode, mitmcode, search, limit:100 }
// The search is done by the server (500 ms after typing, 100 rows) — the list shows
// exactly what the server returns, as legacy.
// Add flow    : tick one or MORE shades -> Next -> Details (same Qty / Rate for each).
// Pencil flow : (flow.replace === 'shade') one shade only; it replaces the shade of that row.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, EmptyState, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { fetchShades } from './api';
import { replaceShadeOnRow, Row } from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT, ContextStrip, FooterBar, ListSkeleton, OptionRow, SearchInput, useCols } from './ui';

type Props = { token: string; API: string; nav: Nav; flow: PickFlow };

export default function ShadeStep({ token, API, nav, flow }: Props) {
  const { cols } = useCols();
  const { editMode, oldRow, selectedItem, selectedGrade } = flow;
  const [search, setSearch] = useState('');
  const [shades, setShades] = useState<Row[]>([]);
  // edit: the row's saved shade starts ticked (legacy)
  const [selectedShade, setSelectedShade] = useState<Row[]>(() =>
    editMode && oldRow?.ShdCode
      ? [{ ShdCode: oldRow.ShdCode, ShdName: oldRow.ShdName, ShadeName: oldRow.ShdName }]
      : [],
  );
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadShades = useCallback(
    async (searchText = '') => {
      if (!selectedItem?.ItmCode) {
        setLoading(false);
        AppAlert.alert('Required', 'Item is missing.');
        return;
      }
      const seq = ++loadSeq.current;
      try {
        setLoading(true);
        const data = await fetchShades(API, token, flow.ctx, selectedItem, searchText);
        if (aliveRef.current && seq === loadSeq.current) setShades(data);
      } catch (error: any) {
        console.log('[YarnSalesOrderNEW] shade list error', error?.response?.data || error?.message);
        if (aliveRef.current && seq === loadSeq.current) {
          AppAlert.alert('Error', 'Unable to load shade list');
          setShades([]);
        }
      } finally {
        if (aliveRef.current && seq === loadSeq.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [API, token],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      loadShades(search);
    }, 500);
    return () => clearTimeout(t);
  }, [search, loadShades]);

  const handleShadeSelect = (item: Row) => {
    if (editMode) {
      setSelectedShade([item]);
      return;
    }
    setSelectedShade((prev) =>
      prev.some((x) => String(x.ShdCode) === String(item.ShdCode))
        ? prev.filter((x) => String(x.ShdCode) !== String(item.ShdCode))
        : [...prev, item],
    );
  };

  const onNext = () => {
    if (selectedShade.length === 0) {
      AppAlert.alert('Required', 'Please select shade');
      return;
    }
    if (editMode && oldRow && flow.replace === 'shade') {
      flow.onDone(replaceShadeOnRow(flow.workingRows, oldRow, selectedShade[0]), false);
      return;
    }
    nav.push('details', {
      ...flow,
      selectedShades: selectedShade.map((x) => ({
        ShdCode: x?.ShdCode,
        ShdName: x?.ShdName || x?.ShadeName || '',
        Raw: x,
      })),
    });
  };

  const renderItem = ({ item }: { item: Row }) => {
    const shdName = item.ShdName || item.ShadeName || '';
    const isSelected = selectedShade.some((x) => String(x.ShdCode) === String(item.ShdCode));
    const isOld = editMode && !!oldRow && String(oldRow.ShdCode) === String(item.ShdCode);
    return (
      <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <OptionRow
          check
          title={String(shdName || '-')}
          lines={[`Shade code : ${item.ShdCode}`]}
          selected={isSelected}
          badge={isOld ? 'Selected Old Shade' : undefined}
          onPress={() => handleShadeSelect(item)}
        />
      </View>
    );
  };

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order', 'Item', 'Grade']}
        title={editMode ? 'Modify Shade' : 'Select Shade'}
        subtitle={editMode ? 'Pick one shade' : 'Pick one or more shades'}
      />
      <View style={[CONTENT, st.head]}>
        <ContextStrip
          entries={[
            { label: 'Selected item', value: `${selectedItem?.ItmCode ?? ''} - ${selectedItem?.ItmName ?? ''}` },
            { label: 'Selected grade', value: `${selectedGrade?.GrdCode ?? ''} - ${selectedGrade?.GrdName ?? ''}` },
          ]}
        />
        {editMode && oldRow ? (
          <ContextStrip
            tone="saved"
            entries={[
              { label: 'Currently saved shade', value: `${oldRow.ShdCode} - ${oldRow.ShdName || ''}` },
              { label: 'Row values', value: `Qty: ${oldRow.Qty} | Pcs: ${oldRow.Pcs} | Rate: ₹ ${oldRow.Rate}` },
            ]}
          />
        ) : null}
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search shade code or name"
          onRefresh={() => loadShades(search)}
          loading={loading}
        />
      </View>
      {loading ? (
        <View style={[CONTENT, { paddingHorizontal: 12 }]}>
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={shades}
          numColumns={cols}
          keyExtractor={(item, index) => `${item.ShdCode}_${index}`}
          renderItem={renderItem}
          extraData={selectedShade}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[CONTENT, st.listContent]}
          ListEmptyComponent={<EmptyState icon="palette" title="No shade found" text="Try another shade code or name." />}
        />
      )}
      <FooterBar>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.count}>{selectedShade.length} selected</Text>
          {selectedShade.length > 0 ? (
            <Text style={st.countSub} numberOfLines={1}>
              {selectedShade.map((x) => x.ShdName || x.ShadeName || x.ShdCode).join(', ')}
            </Text>
          ) : null}
        </View>
        <Btn label="Next" icon="arrow-forward" onPress={onNext} style={{ minWidth: 132 }} />
      </FooterBar>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  head: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, gap: 10 },
  listContent: { paddingHorizontal: 7, paddingBottom: 24 },
  cell: { width: '100%', padding: 5 },
  count: { fontSize: 14, fontWeight: '900', color: T.nav },
  countSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },
});
