// FILE: src/components/YarnSalesOrderNEW/GradeStep.tsx
// Select Grade / Modify Grade (legacy components/YarnSalesOrder/SalesOrderGradeList.tsx).
//   GET /api/getgrade { prpcode, strcode, yearno, ItmCode, ttype:[8,3,30,2,34,83,42], fetch, MerCode, ShdCode,
//                       txntype:'mob_app_sales_order' }
// Add flow    : pick a grade -> Shade step.
// Pencil flow : (flow.replace === 'grade') only the grade of that row is replaced.
import { AppAlert } from '@/common/utils/appAlert';
import { EmptyState, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { fetchGrades } from './api';
import { filterGrades, replaceGradeOnRow, Row } from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT, ContextStrip, ListSkeleton, OptionRow, SearchInput, useCols } from './ui';

type Props = { token: string; API: string; nav: Nav; flow: PickFlow };

export default function GradeStep({ token, API, nav, flow }: Props) {
  const { cols } = useCols();
  const { editMode, oldRow, selectedItem } = flow;
  const [search, setSearch] = useState('');
  const [grades, setGrades] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadGrades = useCallback(async () => {
    if (!selectedItem?.ItmCode) {
      setLoading(false);
      AppAlert.alert('Required', 'Item is missing.');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchGrades(API, token, flow.ctx, selectedItem.ItmCode);
      if (aliveRef.current) setGrades(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] grade list error', error?.response?.data || error?.message);
      if (aliveRef.current) {
        AppAlert.alert('Error', 'Unable to load grades');
        setGrades([]);
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const filteredGrades = useMemo(() => filterGrades(grades, search, editMode, oldRow), [grades, search, editMode, oldRow]);

  const selectGrade = (grade: Row) => {
    if (editMode && oldRow && flow.replace === 'grade') {
      flow.onDone(replaceGradeOnRow(flow.workingRows, oldRow, grade), false);
      return;
    }
    nav.push('shade', {
      ...flow,
      selectedGrade: {
        GrdCode: grade.GrdCode,
        GrdName: grade.GrdName || grade.GradeName || '',
        Raw: grade,
      },
    });
  };

  const renderItem = ({ item }: { item: Row }) => {
    const grdname = item.GrdName || item.GradeName || '';
    const isOld = editMode && !!oldRow && String(oldRow.GrdCode) === String(item.GrdCode);
    return (
      <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <OptionRow
          icon="category"
          title={String(grdname || '-')}
          lines={[`Grade code : ${item.GrdCode}`]}
          selected={isOld}
          badge={isOld ? 'Selected Old Grade' : undefined}
          onPress={() => selectGrade(item)}
        />
      </View>
    );
  };

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order', 'Item']}
        title={editMode ? 'Modify Grade' : 'Select Grade'}
        subtitle={loading ? undefined : `${filteredGrades.length} grade${filteredGrades.length === 1 ? '' : 's'}`}
      />
      <View style={[CONTENT, st.head]}>
        <ContextStrip entries={[{ label: 'Selected item', value: `${selectedItem?.ItmCode ?? ''} - ${selectedItem?.ItmName ?? ''}` }]} />
        {editMode && oldRow ? (
          <ContextStrip
            tone="saved"
            entries={[
              { label: 'Currently saved grade', value: `${oldRow.GrdCode} - ${oldRow.GrdName || ''}` },
              { label: 'Shade', value: `${oldRow.ShdCode} ${oldRow.ShdName || ''}` },
            ]}
          />
        ) : null}
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search grade code or name" onRefresh={loadGrades} loading={loading} />
      </View>
      {loading ? (
        <View style={[CONTENT, { paddingHorizontal: 12 }]}>
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={filteredGrades}
          numColumns={cols}
          keyExtractor={(item, index) => `${item.GrdCode}_${index}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[CONTENT, st.listContent]}
          ListEmptyComponent={<EmptyState icon="category" title="No Grade found" />}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  head: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, gap: 10 },
  listContent: { paddingHorizontal: 7, paddingBottom: 24 },
  cell: { width: '100%', padding: 5 },
});
