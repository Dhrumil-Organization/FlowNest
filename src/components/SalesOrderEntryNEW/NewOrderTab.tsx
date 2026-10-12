// FILE: src/components/SalesOrderEntryNEW/NewOrderTab.tsx
// "New Order" tab — Legacy NewOrderTab (components/SalesOrderNew/index.tsx):
// Property + Year -> 1 Customer -> 2 Sales executive -> 3 Item & Design ->
// SO Type & Fabric Type -> 4 Price & delivery (vs latest costing) ->
// 5 Shade & quantities -> Submit for authorization.
// Same requests, same order of resets, same validations, same save payload
// (model.buildNewOrderPayload). Only the look is the NEW ERP theme.
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Btn, Field, PickField } from '@/src/components/erpUi';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as api from './api';
import {
  buildNewOrderPayload,
  buildYearOptions,
  Colourway,
  colourwayTotals,
  costingInfo,
  execFromParty,
  execPickerRows,
  makeColourway,
  Row,
  validateNewOrder,
} from './model';
import { CONTENT, DateInput, SearchPicker, StepCard, Swatch, Toggle } from './ui';

type Props = { token: string; API: string; userid: string | number };

type PickerName = 'prop' | 'year' | 'party' | 'exec' | 'design' | 'item' | 'shade' | null;

export default function NewOrderTab({ token, API, userid }: Props) {
  const { loadDefaultPreference, savePreference } = useMobileUserPreference({
    UserId: userid || 0,
    ModuleCode: 'SALES ORDER ENTRY',
    ModuleName: 'SALES ORDER',
    ScreenCode: 'SALES_ORDER_BROWSER',
    ScreenName: 'Sales Order Entry',
    token,
  });

  const [picker, setPicker] = useState<PickerName>(null);

  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProp, setSelectedProp] = useState<Row | null>(null);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Step 1 - Party
  const [parties, setParties] = useState<Row[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Row | null>(null);

  // Step 2 - Exec (auto from party, user can change)
  const [selectedExec, setSelectedExec] = useState<Row | null>(null);
  const [execList, setExecList] = useState<Row[]>([]);

  // Step 3 - Item & Design. Legacy names: "designList / selectedDesign" = ITEM (getitem),
  // "itemList / selectedItem" = DESIGN (getdesign). Kept so the payload code reads the same.
  const [itemList, setItemList] = useState<Row[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Row | null>(null);
  const [designList, setDesignList] = useState<Row[]>([]);
  const [designLoading, setDesignLoading] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Row | null>(null);

  const [soType, setSoType] = useState(0);
  const [fabricType, setFabricType] = useState(0);

  // Step 4 - Price & Delivery
  const [, setDesignRateList] = useState<Row[]>([]);
  const [pricePerM, setPricePerM] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [latestCosting, setLatestCosting] = useState<Row | null>(null);

  // Step 5 - Shades & Quantities
  const [shadeList, setShadeList] = useState<Row[]>([]);
  const [shadeLoading, setShadeLoading] = useState(false);
  const [selectedShade, setSelectedShade] = useState<Row | null>(null);
  const [qty, setQty] = useState('');
  const [colourways, setColourways] = useState<Colourway[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [successSO, setSuccessSO] = useState<string | null>(null);

  const yrno = selectedYear ? selectedYear.slice(-2) : '';
  const prpcode = selectedProp?.PrpCode || '';

  // the newest values for async callbacks (a reply for an old property is ignored)
  const live = useRef({ prpcode, yrno });
  live.current = { prpcode, yrno };

  /* ---------------- saved default property / year ---------------- */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadDefaultPreference();
        if (cancelled || !saved?.criteria) return;
        const savedPrp = saved.criteria.prpcode || '';
        const savedYear = saved.criteria.yearno || '';
        const property = propertyData.find((x) => String(x.PrpCode) === String(savedPrp));
        if (property) setSelectedProp(property);
        const year = yearOptions.find((y) => String(y).slice(-2) === String(savedYear));
        if (year) setSelectedYear(year);
      } catch (e) {
        console.log('[SalesOrderEntryNEW] loadDefaultPreference error', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, propertyData, yearOptions]);

  /* ---------------- init: properties + years ---------------- */
  useEffect(() => {
    if (!token) return;
    api.fetchPropertyData(API, token).then((d) => setPropertyData(d || []));
    const arr = buildYearOptions();
    setYearOptions(arr);
    setSelectedYear(arr[0]);
  }, [token, API]);

  // Year for every tab: Summary reads 'selectedyear', Auth / Tracking read 'selected_yearno'
  // (Legacy never wrote 'selected_yearno', so those two tabs ignored the picked year).
  useEffect(() => {
    if (!selectedYear) return;
    AsyncStorage.setItem('selectedyear', selectedYear.toString());
    AsyncStorage.setItem('selected_yearno', selectedYear.toString());
  }, [selectedYear]);

  // Keep the property for the Auth / Tracking / Summary tabs — also when it was
  // auto-selected from the saved default (Legacy only saved a hand-picked property).
  useEffect(() => {
    if (selectedProp?.PrpCode) AsyncStorage.setItem('selected_prpcode', String(selectedProp.PrpCode));
  }, [selectedProp]);

  /* ---------------- masters that follow property / year ---------------- */
  useEffect(() => {
    if (!token || !prpcode) return;
    let cancelled = false;

    (async () => {
      let loaded = false;
      try {
        setPartyLoading(true);
        const list = await api.getParties(API, token, prpcode, yrno);
        if (cancelled) return;
        setParties(list);
        loaded = true;
      } catch (e) {
        if (!cancelled) setParties([]);
      } finally {
        if (!cancelled) setPartyLoading(false);
      }
      // Legacy saves this property / year as the default criteria after a successful party load.
      if (!cancelled && loaded && userid) {
        try {
          await savePreference({
            CriteriaName: 'Default',
            IsDefault: true,
            PreferenceJson: {
              criteria: { prpcode, yearno: yrno, strcode: '012', fromdate: '', todate: '', show_authorized: false },
            },
          });
        } catch (e) {
          console.log('[SalesOrderEntryNEW] savePreference error', e);
        }
      }
    })();

    (async () => {
      try {
        const list = await api.getSalesExecs(API, token, prpcode, yrno);
        if (!cancelled) setExecList(list);
      } catch (e) {
        if (!cancelled) setExecList([]);
      }
    })();

    (async () => {
      try {
        setDesignLoading(true);
        const list = await api.getItems(API, token, prpcode, '012', yrno);
        if (!cancelled) setDesignList(list);
      } catch (e) {
        if (!cancelled) setDesignList([]);
      } finally {
        if (!cancelled) setDesignLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prpcode, yrno, token, API]);

  const stillCurrent = (p: string, y: string) => live.current.prpcode === p && live.current.yrno === y;

  const loadItems = async (design: Row) => {
    if (!design?.ItmCode || !prpcode) return;
    const p = prpcode;
    const y = yrno;
    try {
      setItemLoading(true);
      const list = await api.getDesigns(API, token, p, '012', y, design);
      if (stillCurrent(p, y)) setItemList(list);
    } catch (e) {
      if (stillCurrent(p, y)) setItemList([]);
    } finally {
      setItemLoading(false);
    }
  };

  const loadShades = async (design: Row | null, item: Row) => {
    if (!design?.ItmCode || !item?.DsnCode || !prpcode) return;
    const p = prpcode;
    const y = yrno;
    try {
      setShadeLoading(true);
      const list = await api.getShadesOf(API, token, {
        prpcode: p,
        strcode: '012',
        yearno: y,
        itmcode: design.ItmCode,
        mitmcode: design.MItmCode || design.ItmCode,
        dsncode: item.DsnCode,
      });
      if (stillCurrent(p, y)) setShadeList(list);
    } catch (e) {
      if (stillCurrent(p, y)) setShadeList([]);
    } finally {
      setShadeLoading(false);
    }
  };

  const loadLatestCosting = async (design: Row | null, item: Row) => {
    if (!design?.ItmCode || !item?.DsnCode || !prpcode) return;
    try {
      setLatestCosting(await api.getLatestCosting(API, token, prpcode, yrno, design.ItmCode, item.DsnCode));
    } catch (e) {
      setLatestCosting(null);
    }
  };

  const loadDesignsRate = async (item: Row) => {
    if (!prpcode) return;
    try {
      setDesignLoading(true);
      setDesignRateList(await api.getDesignRate(API, token, prpcode, yrno, item.DsnCode));
    } catch (e) {
      setDesignRateList([]);
    } finally {
      setDesignLoading(false);
    }
  };

  /* ---------------- handlers (same resets as Legacy) ---------------- */
  const onSelectProp = (item: Row) => {
    setSelectedProp(item);
    setSelectedParty(null);
    setSelectedExec(null);
    setSelectedItem(null);
    setSelectedDesign(null);
    setColourways([]);
    AsyncStorage.setItem('selected_prpcode', item.PrpCode);
  };

  const onSelectYear = (item: string) => {
    setSelectedYear(item);
    AsyncStorage.setItem('selectedyear', item.toString());
    AsyncStorage.setItem('selected_yearno', item.toString());
  };

  const onSelectParty = (party: Row) => {
    setSelectedParty(party);
    setSelectedExec(execFromParty(party));
    setSelectedDesign(null);
    setSelectedItem(null);
    setPricePerM('');
    setDeliveryDate(null);
    setColourways([]);
    setSelectedShade(null);
    setQty('');
  };

  // ITEM picked (getitem row)
  const onSelectDesign = (design: Row) => {
    setSelectedDesign(design);
    setSelectedItem(null);
    setColourways([]);
    setSelectedShade(null);
    setQty('');
    setPricePerM('');
    setDeliveryDate(null);
    loadItems(design);
  };

  // DESIGN picked (getdesign row)
  const onSelectItem = (item: Row) => {
    setSelectedItem(item);
    setColourways([]);
    setSelectedShade(null);
    setQty('');
    loadShades(selectedDesign, item);
    loadLatestCosting(selectedDesign, item);
    loadDesignsRate(item);
  };

  const addColourway = () => {
    if (!selectedShade || !qty) return;
    if (colourways.find((c) => c.shade.ShdCode === selectedShade.ShdCode)) {
      AppAlert.alert('Already added', `${selectedShade.ShdName} is already in the list.`);
      return;
    }
    setColourways((prev) => [...prev, makeColourway(selectedShade, qty, pricePerM)]);
    setSelectedShade(null);
    setQty('');
  };

  const removeColourway = (code: any) => setColourways((prev) => prev.filter((c) => c.shade.ShdCode !== code));

  const { totalQty, totalAmt } = colourwayTotals(colourways);
  const { costDiff, costMonth, latestCost, marginPct } = costingInfo(latestCosting, pricePerM);

  const submitOrder = async () => {
    const error = validateNewOrder({ selectedProp, selectedParty, selectedDesign, selectedItem, pricePerM, deliveryDate, colourways });
    if (error) {
      AppAlert.alert('Required', error);
      return;
    }
    try {
      setSubmitting(true);
      const payload = buildNewOrderPayload({
        prpcode,
        yrno,
        selectedParty: selectedParty as Row,
        selectedExec,
        selectedDesign: selectedDesign as Row,
        selectedItem: selectedItem as Row,
        deliveryDate,
        colourways,
        soType,
        fabricType,
      });
      const data = await api.saveOrder(API, token, payload);
      if (data?.success === true) {
        setSuccessSO(data?.response?.sono || data?.response?.SONo || 'SO-' + Date.now());
      } else {
        AppAlert.alert('Save Failed', data?.message || 'Unable to save order');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedParty(null);
    setSelectedExec(null);
    setSelectedItem(null);
    setSelectedDesign(null);
    setPricePerM('');
    setDeliveryDate(null);
    setColourways([]);
    setSelectedShade(null);
    setQty('');
    setLatestCosting(null);
    setSuccessSO(null);
  };

  // Step visibility (Legacy)
  const showStep2 = !!selectedParty;
  const showStep3 = showStep2 && !!selectedExec;
  const showStep4 = showStep3 && !!selectedDesign && !!selectedItem;
  const showStep5 = showStep4 && !!pricePerM && !!deliveryDate;
  const canSubmit = showStep5 && colourways.length > 0;

  /* ---------------- success ---------------- */
  if (successSO) {
    return (
      <ScrollView contentContainerStyle={s.successWrap}>
        <View style={s.successCard}>
          <View style={s.successIcon}>
            <Icon name="check-circle" size={44} color={T.green} />
          </View>
          <Text style={s.successTitle}>Sent for authorization</Text>
          <Text style={s.successSub}>Pending manager approval.</Text>
          <View style={s.soBox}>
            <Text style={s.soLabel}>SO NUMBER</Text>
            <Text style={s.soNo}>{successSO}</Text>
          </View>
          <Btn label="New order" icon="add" kind="copper" onPress={resetForm} style={{ alignSelf: 'stretch' }} />
        </View>
      </ScrollView>
    );
  }

  const execLabel = (e: Row | null) => e?.SalesExecutive || e?.ExecName || '';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        <View style={[CONTENT, { gap: 12 }]}>
          {/* Property + Year */}
          <View style={s.configRow}>
            <PickField
              label="Property"
              icon="apartment"
              value={selectedProp?.LngName || ''}
              placeholder="Select"
              onPress={() => setPicker('prop')}
              style={{ flex: 1 }}
            />
            <PickField label="Year" value={selectedYear} placeholder="Select" onPress={() => setPicker('year')} style={{ width: 140 }} />
          </View>

          {/* 1 Customer */}
          <StepCard n={1} done={!!selectedParty} title="Customer">
            <PickField
              value={selectedParty ? selectedParty.accountname || selectedParty.ParName : ''}
              placeholder="Select customer"
              icon="person-outline"
              loading={partyLoading}
              onPress={() => {
                if (prpcode) setPicker('party');
                else AppAlert.alert('Required', 'Select a property first');
              }}
            />
            {selectedParty ? (
              <Text style={s.hint}>
                {selectedParty.Address || selectedParty.City || ''}
                {selectedParty.SExeName ? ` · default exec: ${selectedParty.SExeName}` : ''}
              </Text>
            ) : null}
          </StepCard>

          {/* 2 Sales executive */}
          {showStep2 ? (
            <StepCard n={2} done={!!selectedExec} title="Sales executive">
              <PickField value={execLabel(selectedExec)} placeholder="Select executive" icon="badge" onPress={() => setPicker('exec')} />
              {selectedExec?.note ? (
                <View style={s.warn}>
                  <Icon name="warning-amber" size={16} color={T.amber} />
                  <Text style={s.warnText}>{selectedExec.note}</Text>
                </View>
              ) : null}
            </StepCard>
          ) : null}

          {/* 3 Item & Design */}
          {showStep3 ? (
            <StepCard n={3} done={!!selectedDesign && !!selectedItem} title="Item & Design">
              <PickField
                label="Item"
                value={selectedDesign ? selectedDesign.ItmName : ''}
                placeholder="Select design"
                icon="category"
                loading={designLoading}
                onPress={() => setPicker('design')}
              />
              {selectedDesign ? (
                <PickField
                  label="Design"
                  value={selectedItem ? `${selectedItem.DsnCode} · ${selectedItem.DsnName}` : ''}
                  placeholder="Select fabric type"
                  icon="style"
                  loading={itemLoading}
                  onPress={() => setPicker('item')}
                />
              ) : null}
            </StepCard>
          ) : null}

          {/* SO Type & Fabric Type */}
          {showStep3 && selectedDesign && selectedItem ? (
            <StepCard n={3} done title="SO Type & Fabric Type">
              <Toggle
                label="SO Type"
                value={soType}
                options={[
                  { value: 1, label: 'MTO' },
                  { value: 0, label: 'Stock Order' },
                ]}
                onChange={setSoType}
              />
              <Toggle
                label="Fabric Type"
                value={fabricType}
                options={[
                  { value: 0, label: 'Greige' },
                  { value: 1, label: 'Finished' },
                ]}
                onChange={setFabricType}
              />
            </StepCard>
          ) : null}

          {/* 4 Price & delivery */}
          {showStep4 ? (
            <StepCard n={4} done={!!pricePerM && !!deliveryDate} title="Price & delivery">
              <Field
                label="Price"
                value={pricePerM}
                onChangeText={setPricePerM}
                keyboardType="decimal-pad"
                right={<Text style={s.unit}>₹</Text>}
              />
              <View style={{ gap: 6 }}>
                <Text style={s.fieldLabel}>Expected delivery</Text>
                <DateInput label="Expected delivery" value={deliveryDate} onChange={setDeliveryDate} minimumDate={new Date()} />
              </View>

              {pricePerM && latestCosting && costDiff !== null ? (
                <View style={s.costBox}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.costLabel}>VS LATEST COSTING{costMonth ? ` (${costMonth})` : ''}</Text>
                    <Text style={s.costDetail}>
                      Cost ₹{latestCost.toFixed(0)} · Rate ₹{pricePerM}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.costDiff, { color: costDiff >= 0 ? T.green : T.red }]}>
                      ₹{costDiff >= 0 ? '+' : ''}
                      {Math.round(costDiff)}
                    </Text>
                    {marginPct !== null ? (
                      <Text style={[s.margin, { color: marginPct >= 0 ? T.green : T.red }]}>{marginPct.toFixed(1)}% margin</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </StepCard>
          ) : null}

          {/* 5 Shade & quantities */}
          {showStep5 ? (
            <StepCard n={5} done={colourways.length > 0} title="Shade & quantities" sub="Pick a saved shade">
              <PickField
                label="Shade"
                value={selectedShade ? selectedShade.ShdName || selectedShade.ShadeName : ''}
                placeholder="Select shade"
                icon="palette"
                loading={shadeLoading}
                onPress={() => setPicker('shade')}
              />
              <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
              <Btn label="Add Shade" icon="add" kind="soft" onPress={addColourway} disabled={!selectedShade || !qty} />

              {colourways.map((c) => (
                <View key={String(c.shade.ShdCode)} style={s.cw}>
                  <Swatch color={c.shade.ShdColor || '#334155'} size={38} radius={9} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cwName} numberOfLines={1}>
                      {c.shade.ShdName || c.shade.ShadeName}
                    </Text>
                    <Text style={s.cwSub}>yarn-dyed shade</Text>
                  </View>
                  <Text style={s.cwQty}>{c.qty.toLocaleString('en-IN')}</Text>
                  <TouchableOpacity
                    onPress={() => removeColourway(c.shade.ShdCode)}
                    style={s.cwX}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${c.shade.ShdName || 'shade'}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close" size={18} color={T.red} />
                  </TouchableOpacity>
                </View>
              ))}

              {colourways.length > 0 ? (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>
                    {totalQty.toLocaleString('en-IN')} · ₹{totalAmt.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </StepCard>
          ) : null}
        </View>
      </ScrollView>

      {/* Submit — always visible at the bottom */}
      <View style={s.footer}>
        <View style={[CONTENT, { paddingHorizontal: 12 }]}>
          <Btn
            label="Submit for authorization"
            icon="send"
            kind="copper"
            onPress={submitOrder}
            disabled={!canSubmit}
            loading={submitting}
          />
        </View>
      </View>

      {/* Pickers */}
      <SearchPicker
        open={picker === 'prop'}
        title="Property"
        rows={propertyData}
        keyField="PrpCode"
        labelField="LngName"
        selectedKey={selectedProp ? String(selectedProp.PrpCode) : ''}
        onPick={onSelectProp}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'year'}
        title="Select Year"
        rows={yearOptions.map((y) => ({ y }))}
        keyField="y"
        labelField="y"
        selectedKey={selectedYear}
        onPick={(r) => onSelectYear(r.y)}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'party'}
        title="Customer"
        rows={parties}
        keyField="acccode"
        labelField="accountname"
        loading={partyLoading}
        leftOf={(r) => <Initials name={String(r.accountname || '')} />}
        subOf={(r) => `Code: ${r.acccode}${r.SExeName ? ` · Exec: ${r.SExeName}` : ''}`}
        selectedKey={selectedParty ? String(selectedParty.acccode ?? '') : ''}
        onPick={onSelectParty}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'exec'}
        title="Sales Executive"
        rows={execPickerRows(execList, selectedParty).map((r) => ({ ...r, __label: r.SalesExecutive || r.ExecName || '' }))}
        keyField="Code"
        labelField="__label"
        selectedKey={selectedExec ? String(selectedExec.Code ?? '') : ''}
        onPick={(r) => {
          const { __label, ...exec } = r;
          setSelectedExec(exec);
        }}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'design'}
        title="Item"
        rows={designList}
        keyField="ItmCode"
        labelField="ItmName"
        subOf={(r) => (r.ItmDesc ? String(r.ItmDesc) : '')}
        loading={designLoading}
        selectedKey={selectedDesign ? String(selectedDesign.ItmCode ?? '') : ''}
        onPick={onSelectDesign}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'item'}
        title="Design"
        rows={itemList}
        keyField="DsnCode"
        labelField="DsnName"
        subOf={(r) => (r.DsnCode ? String(r.DsnCode) : '')}
        loading={itemLoading}
        selectedKey={selectedItem ? String(selectedItem.DsnCode ?? '') : ''}
        onPick={onSelectItem}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'shade'}
        title="Shade"
        rows={shadeList.map((r) => ({ ...r, __label: r.ShdName || r.ShadeName || '' }))}
        keyField="ShdCode"
        labelField="__label"
        loading={shadeLoading}
        leftOf={(r) => <Swatch color={r.ShdColor || '#334155'} />}
        selectedKey={selectedShade ? String(selectedShade.ShdCode ?? '') : ''}
        onPick={(r) => {
          const { __label, ...shade } = r;
          setSelectedShade(shade);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

/** Legacy party row badge: first two letters of the party name. */
function Initials({ name }: { name: string }) {
  return (
    <View style={s.initials}>
      <Text style={s.initialsText}>{name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  initials: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}18` },
  initialsText: { fontSize: 13, fontWeight: '800', color: T.copper },
  scroll: { padding: 12, paddingBottom: 24 },
  configRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  hint: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  unit: { fontSize: 14, fontWeight: '700', color: T.muted },
  warn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.amber}55`,
    backgroundColor: `${T.amber}12`,
  },
  warnText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: T.ink, lineHeight: 18 },

  costBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  costLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  costDetail: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 3 },
  costDiff: { fontSize: 16, fontWeight: '900' },
  margin: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  cw: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  cwName: { fontSize: 14, fontWeight: '800', color: T.ink },
  cwSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  cwQty: { fontSize: 14, fontWeight: '900', color: T.nav },
  cwX: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}10` },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },
  totalLabel: { fontSize: 13.5, fontWeight: '700', color: T.muted },
  totalValue: { fontSize: 14, fontWeight: '900', color: T.copper },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 10, ...S.sheet, shadowOpacity: 0.06 },

  successWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    ...S.card,
  },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.green}14`, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '900', color: T.ink },
  successSub: { fontSize: 13.5, fontWeight: '600', color: T.muted, marginTop: 4, marginBottom: 18 },
  soBox: { alignSelf: 'stretch', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, marginBottom: 18 },
  soLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  soNo: { fontSize: 22, fontWeight: '900', color: T.nav, marginTop: 4 },
});
