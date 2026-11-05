// FILE: src/components/YarnSalesOrderNEW/DetailsStep.tsx
// Enter Details (legacy components/YarnSalesOrder/SalesOrderDetails.tsx).
//   POST /api/get_so_current_stock { prptype, prpcode, strcode, yearno, d1, selectedd1 } -> stockdata rows
// Add  : Qty / Pcs / Rate / Remark for the picked shade(s). Amount = Qty x Rate (2 decimals).
//        "Stock Sales" is ticked automatically when the available stock is above 0 and can
//        be changed by hand. A shade whose Item + Grade + Shade is already on the order is
//        not added twice.
// Edit : (flow.replace === 'details', row menu > "Edit qty / rate / remark") the same row,
//        only Qty / Pcs / Rate / Amount / Remark / Stock Sales change. The row's saved
//        Stock Sales tick is kept as it was until the user changes it.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, Field, IconBtn, PanelHeader, Sheet } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage, fetchCurrentStock } from './api';
import { addShadeRows, buildStockLines, DetailsInput, lineAmount, money, Row, totalStockQty, updateRowDetails, validateDetails } from './model';
import { Nav, PickFlow } from './nav';
import { CheckRow, CONTENT, ContextStrip, FooterBar, useCols } from './ui';

type Props = { token: string; API: string; nav: Nav; flow: PickFlow };

export default function DetailsStep({ token, API, nav, flow }: Props) {
  const { isPhone } = useCols();
  const { selectedItem, selectedGrade, oldRow } = flow;
  const selectedShades = useMemo(() => flow.selectedShades || [], [flow.selectedShades]);
  const isEdit = flow.replace === 'details' && flow.editMode && !!oldRow;

  const [qty, setQty] = useState(isEdit ? String(oldRow?.Qty ?? '') : '');
  const [pcs, setPcs] = useState(isEdit ? String(oldRow?.Pcs ?? '') : '');
  const [rate, setRate] = useState(isEdit ? String(oldRow?.Rate ?? '') : '');
  const [remark, setRemark] = useState(isEdit ? String(oldRow?.Remark ?? '') : '');
  const [remark3, setRemark3] = useState(isEdit ? String(oldRow?.Remark3 ?? oldRow?.Raw?.Remark3 ?? '') : '');
  const [isDyeing, setIsDyeing] = useState<number>(isEdit ? (oldRow?.IsDyeing ? 1 : 0) : 0);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<Row[]>([]);
  const [stockQty, setStockQty] = useState(0);
  const [stockModalVisible, setStockModalVisible] = useState(false);

  const amount = useMemo(() => lineAmount(qty, rate), [qty, rate]);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Available stock of the picked item / grade / shade(s)
  useEffect(() => {
    if (!(selectedItem?.ItmCode && selectedGrade?.GrdCode && selectedShades.length > 0)) return;
    (async () => {
      try {
        setLoading(true);
        const { d1, selectedd1 } = buildStockLines(selectedItem, selectedGrade, selectedShades, flow.workingRows, oldRow);
        const stockRows = await fetchCurrentStock(API, token, flow.ctx, d1, selectedd1);
        if (!aliveRef.current) return;
        const totalQty = totalStockQty(stockRows);
        setStockData(stockRows);
        setStockQty(totalQty);
        if (!isEdit) setIsDyeing(totalQty > 0 ? 1 : 0);
      } catch (error: any) {
        console.log('[YarnSalesOrderNEW] stock error', error?.response?.data || error?.message);
        AppAlert.alert('Error', `Unable to get stock. Error: ${errorMessage(error, error?.message || '')}`);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = () => {
    const input: DetailsInput = {
      ctx: flow.ctx,
      mode: flow.mode,
      uid: flow.uid,
      selectedItem: selectedItem as Row,
      selectedGrade: selectedGrade as Row,
      selectedShades,
      workingRows: flow.workingRows,
      qty,
      pcs,
      rate,
      remark,
      remark3,
      isDyeing,
    };
    const invalid = validateDetails(input);
    if (invalid) {
      AppAlert.alert(invalid[0], invalid[1]);
      return;
    }
    const result = isEdit
      ? updateRowDetails(flow.workingRows, oldRow as Row, { qty, pcs, rate, remark, remark3, isDyeing })
      : addShadeRows(input);
    nav.push('shadeDone', { flow, rows: result.rows, lastRow: result.lastRow, isEdit });
  };

  const shadeText = selectedShades.map((x) => `${x?.ShdCode} - ${x?.ShdName || x?.ShadeName || ''}`).join(', ');

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order', 'Item', 'Grade', 'Shade']}
        title={isEdit ? 'Modify Details' : 'Enter Details'}
        subtitle={!isEdit && selectedShades.length > 1 ? `Same values for ${selectedShades.length} shades` : undefined}
      />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[CONTENT, st.content]}>
        <View style={[st.grid, !isPhone && { flexDirection: 'row', alignItems: 'flex-start' }]}>
          <View style={[{ gap: 12 }, !isPhone && { flex: 1 }]}>
            <ContextStrip
              entries={[
                { label: 'Item', value: `${selectedItem?.ItmCode ?? ''} - ${selectedItem?.ItmName ?? ''}` },
                { label: 'Grade', value: `${selectedGrade?.GrdCode ?? ''} - ${selectedGrade?.GrdName ?? ''}` },
                { label: selectedShades.length > 1 ? `Shades (${selectedShades.length})` : 'Shade', value: shadeText },
              ]}
            />
            <Card style={st.stock}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.stockLabel}>Available Stock</Text>
                {loading ? (
                  <ActivityIndicator size="small" color={T.copper} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
                ) : (
                  <Text style={[st.stockValue, { color: stockQty > 0 ? T.green : T.muted }]}>{Number(stockQty).toFixed(3)}</Text>
                )}
              </View>
              <CheckRow label="Stock Sales" checked={isDyeing === 1} onToggle={() => setIsDyeing((prev) => (prev === 1 ? 0 : 1))} />
              <IconBtn icon="info-outline" label="Stock details" color={T.copper} tone="soft" onPress={() => setStockModalVisible(true)} />
            </Card>
          </View>

          <Card style={[{ gap: 14 }, !isPhone && { flex: 1.2 }]}>
            <View style={st.pair}>
              <Field label="Qty" required value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="Enter qty" style={{ flex: 1 }} autoFocus />
              <Field label="Pcs" value={pcs} onChangeText={(text: string) => setPcs(text || '0')} keyboardType="numeric" placeholder="Enter pcs" style={{ flex: 1 }} selectTextOnFocus />
            </View>
            <View style={st.pair}>
              <Field label="Rate" required value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="Enter rate" style={{ flex: 1 }} />
              <Field label="Amount" value={`₹ ${money(amount)}`} editable={false} style={{ flex: 1 }} />
            </View>
            <Field label="Remark" value={remark} onChangeText={setRemark} placeholder="Enter remark" multiline />
            <Field label="Remark 3" value={remark3} onChangeText={setRemark3} placeholder="Enter remark 3" multiline />
          </Card>
        </View>
      </ScrollView>
      <FooterBar>
        <Btn label={isEdit ? 'Update Shade' : selectedShades.length > 1 ? `Add ${selectedShades.length} Shades` : 'Add This Shade'} icon="check" onPress={onSave} style={{ flex: 1 }} />
      </FooterBar>

      <Sheet open={stockModalVisible} onClose={() => setStockModalVisible(false)} title="Stock Details" wideMax={520}>
        {stockData.length === 0 ? (
          <Text style={st.stockEmpty}>No stock found</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {stockData.map((item, index) => (
              <View key={index} style={st.stockCard}>
                <View style={st.stockTop}>
                  <Text style={st.stockMer} numberOfLines={1}>{item?.MerCode}</Text>
                  <Text style={st.stockQty}>{Number(item?.StkQty || 0).toFixed(3)}</Text>
                </View>
                <Text style={st.stockName}>{item?.MerName}</Text>
                <Text style={st.stockSmall}>Carton : {item?.TotCarton}</Text>
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, paddingBottom: 28 },
  grid: { gap: 12 },
  pair: { flexDirection: 'row', gap: 12 },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  stockValue: { fontSize: 20, fontWeight: '900', marginTop: 3 },
  stockEmpty: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },
  stockCard: { borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, backgroundColor: T.sub },
  stockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stockMer: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '900', color: T.nav },
  stockQty: { fontSize: 15, fontWeight: '900', color: T.green },
  stockName: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 4 },
  stockSmall: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 4 },
});
