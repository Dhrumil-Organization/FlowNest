import AppAlert from '@/common/utils/appAlert';
// FILE: src/screens/orders/tabs/NewOrderTab.tsx
// Migrated from SalesOrderNew/index.tsx's NewOrderTab (~915 lines).
// Business logic (step-by-step reveal, validation, payload shape) is
// preserved exactly. Structural changes only: shared API client, shared
// master selector, shared theme, permission gate.
import { MasterSelectField } from '@/src/components/forms/MasterSelectField';
import { SalesOrderAPI } from '@/src/api/legacyClient';
import { fetchPropertyData } from '@/src/api/legacyFunctions';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import AsyncStorage from '@/common/utils/compatibleStorage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDisplay = (d: any) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};
const ymd = (d: any) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
};
const fmt = (v: any, dec = 2) => Number(v || 0).toFixed(dec);

interface Props {
    token: string;
    userid?: any;
}

export function NewOrderTab({ token, userid }: Props) {
    const { canDo } = usePermission();
    const canSubmitOrder = canDo('orders.new_order', 'submit_authorization');

    const { loadDefaultPreference, savePreference } = useMobileUserPreference({
        UserId: userid || 0,
        ModuleCode: 'SALES ORDER ENTRY',
        ModuleName: 'SALES ORDER',
        ScreenCode: 'SALES_ORDER_BROWSER',
        ScreenName: 'Sales Order Entry',
        token,
    });

    const [propertyData, setPropertyData] = useState<any[]>([]);
    const [selectedProp, setSelectedProp] = useState<any>(null);
    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [showYearPicker, setShowYearPicker] = useState(false);

    const [parties, setParties] = useState<any[]>([]);
    const [partyLoading, setPartyLoading] = useState(false);
    const [showPartyPicker, setShowPartyPicker] = useState(false);
    const [selectedParty, setSelectedParty] = useState<any>(null);

    const [selectedExec, setSelectedExec] = useState<any>(null);
    const [execList, setExecList] = useState<any[]>([]);
    const [showExecPicker, setShowExecPicker] = useState(false);

    const [itemList, setItemList] = useState<any[]>([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const [designList, setDesignList] = useState<any[]>([]);
    const [designLoading, setDesignLoading] = useState(false);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<any>(null);

    const [designRateList, setDesignRateList] = useState<any[]>([]);
    const [pricePerM, setPricePerM] = useState('');
    const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [latestCosting, setLatestCosting] = useState<any>(null);

    const [shadeList, setShadeList] = useState<any[]>([]);
    const [shadeLoading, setShadeLoading] = useState(false);
    const [showShadePicker, setShowShadePicker] = useState(false);
    const [selectedShade, setSelectedShade] = useState<any>(null);
    const [qty, setQty] = useState('');
    const [colourways, setColourways] = useState<any[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [successSO, setSuccessSO] = useState<string | null>(null);

    const yrno = selectedYear ? selectedYear.slice(-2) : '';
    const prpcode = selectedProp?.PrpCode || '';

    useEffect(() => {
        const loadPreferenceData = async () => {
            if (!token) return;
            const saved = await loadDefaultPreference();
            if (saved?.criteria) {
                const savedPrpcode = saved.criteria.prpcode || '';
                const savedYearno = saved.criteria.yearno || '';
                const property = propertyData.find((x) => String(x.PrpCode) === String(savedPrpcode));
                if (property) setSelectedProp(property);
                const year = yearOptions.find((y) => String(y).slice(-2) === String(savedYearno));
                if (year) setSelectedYear(year);
            }
        };
        loadPreferenceData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, propertyData, yearOptions]);

    // Init: load property and year options
    useEffect(() => {
        if (!token) return;
        fetchPropertyData(token).then((d) => setPropertyData(d || []));
        const y = new Date().getFullYear();
        const arr = Array.from({ length: 5 }, (_, i) => `${y - i}-${y - i + 1}`);
        setYearOptions(arr);
        setSelectedYear(arr[0]);
    }, [token]);

    useEffect(() => {
        const saveDefaultYear = async () => {
            if (selectedYear) await AsyncStorage.setItem('selectedyear', selectedYear.toString());
        };
        saveDefaultYear();
    }, [selectedYear]);

    const loadParties = useCallback(async () => {
        if (!prpcode) return;
        try {
            setPartyLoading(true);
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const res = await SalesOrderAPI.accountBasic({
                prpcode, prptype: userPtype, yearno: yrno, strcode: '012',
                txntype: 'sales_order', partytype: 'p', type: 'S',
                page: '', limit: '', search: '', isceo: '', partype: '',
                grntype: '', fetch: '', acccode: '', billdate: '', strtype: '', isfaint: '',
            });
            setParties(res.data?.response?.data || []);
            if (userid) {
                await savePreference({
                    CriteriaName: 'Default',
                    IsDefault: true,
                    PreferenceJson: {
                        criteria: { prpcode, yearno: yrno, strcode: '012', fromdate: '', todate: '', show_authorized: false },
                    },
                });
            }
        } catch (e) {
            setParties([]);
        } finally {
            setPartyLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    useEffect(() => {
        if (!token) return;
        loadParties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadSalesExec = useCallback(async () => {
        if (!prpcode) return;
        try {
            const res = await SalesOrderAPI.criterion({ prpcode, strcode: '012', yearno: yrno, txntype: 'sales_order', fetch: 'salesexe', prptype: '' });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setExecList(Array.isArray(data) ? data : []);
        } catch (e) {
            setExecList([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    useEffect(() => {
        if (!token) return;
        loadSalesExec();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadDesigns = useCallback(async () => {
        if (!prpcode) return;
        try {
            setDesignLoading(true);
            const res = await SalesOrderAPI.getItem({ prpcode, strcode: '012', yearno: yrno });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setDesignList(Array.isArray(data) ? data : []);
        } catch (e) {
            setDesignList([]);
        } finally {
            setDesignLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    useEffect(() => {
        if (!token) return;
        loadDesigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadDesignsRate = useCallback(async (_design: any, item: any) => {
        if (!prpcode) return;
        try {
            setDesignLoading(true);
            const res = await SalesOrderAPI.getDesignRate({ prpcode, strcode: '012', yearno: yrno, dsncode: item.DsnCode });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setDesignRateList(Array.isArray(data) ? data : []);
        } catch (e) {
            setDesignRateList([]);
        } finally {
            setDesignLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadItems = useCallback(async (design: any) => {
        if (!design?.ItmCode || !prpcode) return;
        try {
            setItemLoading(true);
            const res = await SalesOrderAPI.getDesign({
                prpcode, strcode: '012', yearno: yrno,
                itmcode: design.ItmCode, mitmcode: design.MItmCode || design.ItmCode,
                txntype: 'mob_app_sales_order',
            });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setItemList(Array.isArray(data) ? data : []);
        } catch (e) {
            setItemList([]);
        } finally {
            setItemLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadShades = useCallback(async (design: any, item: any) => {
        if (!design?.ItmCode || !item?.DsnCode || !prpcode) return;
        try {
            setShadeLoading(true);
            const res = await SalesOrderAPI.getShade({
                prpcode, strcode: '012', yearno: yrno,
                itmcode: design.ItmCode, mitmcode: design.MItmCode || design.ItmCode, dsncode: item.DsnCode,
            });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setShadeList(Array.isArray(data) ? data : []);
        } catch (e) {
            setShadeList([]);
        } finally {
            setShadeLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const loadLatestCosting = useCallback(async (design: any, item: any) => {
        if (!design?.ItmCode || !item?.DsnCode || !prpcode) return;
        try {
            const res = await SalesOrderAPI.getLatestCosting({ prpcode, strcode: '012', yearno: yrno, itmcode: design.ItmCode, dsncode: item.DsnCode });
            setLatestCosting(res.data?.response?.data || res.data?.data || null);
        } catch (e) {
            setLatestCosting(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yrno, token]);

    const onSelectParty = (party: any) => {
        setSelectedParty(party);
        if (party.sexe || party.SExe) {
            setSelectedExec({ Code: party.sexe || party.SExe || '', SalesExecutive: party.SExeName || party.sexe || '', note: '' });
        } else {
            setSelectedExec(null);
        }
        setSelectedDesign(null);
        setSelectedItem(null);
        setPricePerM('');
        setDeliveryDate(null);
        setColourways([]);
        setSelectedShade(null);
        setQty('');
    };

    const onSelectDesign = (design: any) => {
        setSelectedDesign(design);
        setSelectedItem(null);
        setColourways([]);
        setSelectedShade(null);
        setQty('');
        setPricePerM('');
        setDeliveryDate(null);
        loadItems(design);
    };

    const onSelectItem = (item: any) => {
        setSelectedItem(item);
        setColourways([]);
        setSelectedShade(null);
        setQty('');
        loadShades(selectedDesign, item);
        loadLatestCosting(selectedDesign, item);
        loadDesignsRate(selectedDesign, item);
    };

    const addColourway = () => {
        if (!selectedShade || !qty) return;
        if (colourways.find((c) => c.shade.ShdCode === selectedShade.ShdCode)) {
            AppAlert.alert('Already added', `${selectedShade.ShdName} is already in the list.`);
            return;
        }
        const amount = Number(qty) * Number(pricePerM || 0);
        setColourways((prev) => [...prev, { shade: { ...selectedShade }, qty: Number(qty), rate: Number(pricePerM || 0), amount }]);
        setSelectedShade(null);
        setQty('');
    };

    const removeColourway = (code: string) => {
        setColourways((prev) => prev.filter((c) => c.shade.ShdCode !== code));
    };

    const totalQty = colourways.reduce((s, c) => s + Number(c.qty || 0), 0);
    const totalAmt = colourways.reduce((s, c) => s + Number(c.amount || 0), 0);

    const costDiff = latestCosting && pricePerM ? Number(pricePerM) - Number(latestCosting.CostPerM || latestCosting.UnitRate || 0) : null;
    const costMonth = latestCosting?.Month || latestCosting?.SODate || '';
    const latestCost = latestCosting ? Number(latestCosting.CostPerM || latestCosting.UnitRate || 0) : 0;
    const marginPct = costDiff !== null && latestCost > 0 ? (costDiff / latestCost) * 100 : null;

    const submitOrder = async () => {
        if (!canSubmitOrder) return AppAlert.alert('Not permitted', 'You do not have permission to submit a new order.');
        if (!selectedProp?.PrpCode) return AppAlert.alert('Required', 'Select a property first');
        if (!selectedParty) return AppAlert.alert('Required', 'Select a customer');
        if (!selectedDesign) return AppAlert.alert('Required', 'Select a design');
        if (!selectedItem) return AppAlert.alert('Required', 'Select a fabric type');
        if (!pricePerM) return AppAlert.alert('Required', 'Enter price per metre');
        if (!deliveryDate) return AppAlert.alert('Required', 'Select expected delivery date');
        if (colourways.length === 0) return AppAlert.alert('Required', 'Add at least one shade');

        try {
            setSubmitting(true);
            const rows = colourways.map((c, i) => ({
                SrNo: i + 1,
                StrCode: '012',
                ItmCode: selectedDesign.ItmCode,
                MItmCode: selectedDesign.MItmCode || selectedDesign.ItmCode,
                ItmName: selectedDesign.ItmName,
                DsnCode: selectedItem.DsnCode,
                DsnName: selectedItem.DsnName,
                ShdCode: c.shade.ShdCode,
                ShdName: c.shade.ShdName || c.shade.ShadeName,
                Qty: fmt(c.qty, 3),
                QtyPcs: '0',
                UnitRate: fmt(c.rate, 5),
                Amount: fmt(c.amount),
                D1NetAmt: fmt(c.amount),
                Remark1: '', Remark2: '', Remark3: '', Remark4: '', Remark5: '',
                PkgQty: '1.000', PkgRate: '.00000', AmtCalc: 'U',
                MerCode: '0', GrdCode: '0',
                DisPer: '.00', DisAmt: '.00',
                CGSTPer: '.00', CGSTAmt: '.00',
                SGSTPer: '.00', SGSTAmt: '.00',
                IGSTPer: '.00', IGSTAmt: '.00',
                Denier: selectedDesign.Denier || '',
                UOM: selectedDesign.UOM || '',
                HsnCode: '', HSNName: '',
            }));

            const payload = {
                Mode: 'ADD',
                UId: 0,
                main: {
                    UId: 0,
                    Mode: 'ADD',
                    PrpCode: prpcode,
                    StrCode: '012',
                    YearNo: yrno,
                    ParCode: selectedParty.acccode || selectedParty.ParCode,
                    ParName: selectedParty.accountname || selectedParty.ParName,
                    SExe: selectedExec?.Code || selectedExec?.ExecCode || selectedParty.sexe || '',
                    SExeName: selectedExec?.SalesExecutive || selectedExec?.ExecName || selectedParty.SExeName || '',
                    GrsAmt: fmt(totalAmt),
                    DisAmt: '.00', NDisAmt: '.00', TDisAmt: '.00',
                    TaxAmt: '.00', NTaxAmt: '.00', TTaxAmt: '.00', GSTAmt: '.00',
                    NetAmt: fmt(totalAmt),
                    D1NetAmt: fmt(totalAmt),
                    Remark: '',
                    DDays: deliveryDate ? String(Math.ceil(((deliveryDate as any) - (new Date() as any)) / (1000 * 60 * 60 * 24))) : '',
                    DAdd: selectedParty.Address || '',
                    DCity: selectedParty.City || '',
                    Station: selectedParty.City || '',
                    Status: 'P',
                    EntType: 'G2',
                    TaxStru: '123',
                    SONo: '', SODate: '',
                    DueDate: ymd(deliveryDate),
                    DueDay: selectedParty.crday || '',
                },
                d1: rows,
                tax: [],
                exp: {},
            };

            const res = await SalesOrderAPI.mobAppSave(payload);

            if (res.data?.success === true) {
                setSuccessSO(res.data?.response?.sono || res.data?.response?.SONo || 'SO-' + Date.now());
            } else {
                AppAlert.alert('Save Failed', res.data?.message || 'Unable to save order');
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

    const showStep2 = !!selectedParty;
    const showStep3 = showStep2 && !!selectedExec;
    const showStep4 = showStep3 && !!selectedDesign && !!selectedItem;
    const showStep5 = showStep4 && !!pricePerM && !!deliveryDate;
    const canSubmit = showStep5 && colourways.length > 0;

    if (successSO) {
        return (
            <View style={s.successScreen}>
                <Text style={s.successTick}>✓</Text>
                <Text style={s.successTitle}>Sent for authorization</Text>
                <Text style={s.successSub}>Pending manager approval.</Text>
                <View style={s.successSOBox}>
                    <Text style={s.successSOLabel}>SO NUMBER</Text>
                    <Text style={s.successSONo}>{successSO}</Text>
                </View>
                <TouchableOpacity style={s.newOrderBtn} onPress={resetForm} activeOpacity={0.85}>
                    <Text style={s.newOrderBtnText}>+ New order</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scrollContent}>
                <View style={s.configStrip}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.fieldLabel}>PROPERTY</Text>
                        <MasterSelectField data={propertyData} labelKey="LngName" valueKey="PrpCode" placeholder="Select property" selected={selectedProp} onSelect={async (item) => {
                            setSelectedProp(item); setSelectedParty(null); setSelectedExec(null); setSelectedItem(null); setSelectedDesign(null); setColourways([]);
                            await AsyncStorage.setItem('selected_prpcode', item.PrpCode);
                        }} />
                    </View>
                    <View style={{ width: 120 }}>
                        <Text style={s.fieldLabel}>YEAR</Text>
                        <MasterSelectField data={yearOptions.map((y) => ({ YearName: y }))} labelKey="YearName" valueKey="YearName" placeholder="Select year" selected={selectedYear ? { YearName: selectedYear } : null} onSelect={async (item) => {
                            setSelectedYear(item.YearName);
                            await AsyncStorage.setItem('selectedyear', item.YearName);
                        }} />
                    </View>
                </View>

                {/* Step 1: Customer */}
                <View style={s.stepCard}>
                    <View style={s.stepHead}>
                        <View style={[s.stepBadge, !!selectedParty && s.stepBadgeDone]}>
                            <Text style={s.stepBadgeText}>{selectedParty ? '✓' : '1'}</Text>
                        </View>
                        <Text style={s.stepTitle}>Customer</Text>
                    </View>
                    <MasterSelectField
                        data={parties}
                        labelKey={['accountname', 'acccode']}
                        valueKey="acccode"
                        placeholder={prpcode ? 'Select customer' : 'Select a property first'}
                        selected={selectedParty}
                        loading={partyLoading}
                        disabled={!prpcode}
                        onSelect={onSelectParty}
                    />
                    {selectedParty && (
                        <Text style={s.stepHint}>
                            {selectedParty.Address || selectedParty.City || ''}{selectedParty.SExeName ? ` · default exec: ${selectedParty.SExeName}` : ''}
                        </Text>
                    )}
                </View>

                {/* Step 2: Sales Executive */}
                {showStep2 && (
                    <View style={s.stepCard}>
                        <View style={s.stepHead}>
                            <View style={[s.stepBadge, !!selectedExec && s.stepBadgeDone]}>
                                <Text style={s.stepBadgeText}>{selectedExec ? '✓' : '2'}</Text>
                            </View>
                            <Text style={s.stepTitle}>Sales executive</Text>
                        </View>
                        <MasterSelectField
                            data={execList.length > 0 ? execList : (selectedParty?.SalesExecutive ? [{ Code: selectedParty.sexe || 'EX', SalesExecutive: selectedParty.SalesExecutive, note: '' }] : [])}
                            labelKey="SalesExecutive"
                            valueKey="Code"
                            placeholder="Select executive"
                            selected={selectedExec}
                            onSelect={(item) => setSelectedExec(item)}
                        />
                        {selectedExec?.note ? (
                            <View style={s.warnBox}><Text style={s.warnText}>⚠ {selectedExec.note}</Text></View>
                        ) : null}
                    </View>
                )}

                {/* Step 3: Item & Design */}
                {showStep3 && (
                    <View style={s.stepCard}>
                        <View style={s.stepHead}>
                            <View style={[s.stepBadge, !!(selectedDesign && selectedItem) && s.stepBadgeDone]}>
                                <Text style={s.stepBadgeText}>{selectedDesign && selectedItem ? '✓' : '3'}</Text>
                            </View>
                            <Text style={s.stepTitle}>Item &amp; Design</Text>
                        </View>
                        <Text style={s.fieldLabel}>ITEM</Text>
                        <MasterSelectField data={designList} labelKey={['ItmName', 'ItmDesc']} valueKey="ItmCode" placeholder="Select design" selected={selectedDesign} loading={designLoading} onSelect={onSelectDesign} />
                        {selectedDesign && (
                            <>
                                <Text style={[s.fieldLabel, { marginTop: 14 }]}>DESIGN</Text>
                                <MasterSelectField data={itemList} labelKey={['DsnName', 'DsnCode']} valueKey="DsnCode" placeholder="Select fabric type" selected={selectedItem} loading={itemLoading} onSelect={onSelectItem} />
                            </>
                        )}
                    </View>
                )}

                {/* Step 4: Price & delivery */}
                {showStep4 && (
                    <View style={s.stepCard}>
                        <View style={s.stepHead}>
                            <View style={[s.stepBadge, !!(pricePerM && deliveryDate) && s.stepBadgeDone]}>
                                <Text style={s.stepBadgeText}>{pricePerM && deliveryDate ? '✓' : '4'}</Text>
                            </View>
                            <Text style={s.stepTitle}>Price &amp; delivery</Text>
                        </View>
                        <Text style={[s.fieldLabel, { marginTop: 0 }]}>PRICE</Text>
                        <View style={s.inputWrap}>
                            <TextInput
                                value={pricePerM}
                                onChangeText={setPricePerM}
                                keyboardType="decimal-pad"
                                style={s.textInput}
                                returnKeyType="done"
                            />
                            <Text style={s.inputUnit}>₹</Text>
                        </View>

                        <Text style={[s.fieldLabel, { marginTop: 14 }]}>EXPECTED DELIVERY</Text>
                        <TouchableOpacity style={s.dropdownBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                            <Text style={[s.dropdownText, !deliveryDate && s.placeholder]}>{deliveryDate ? fmtDisplay(deliveryDate) : 'Select date'}</Text>
                            <Text style={{ color: T.muted, fontSize: 16 }}>📅</Text>
                        </TouchableOpacity>

                        {pricePerM && latestCosting && (
                            <View style={s.costingBox}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.costingLabel}>VS LATEST COSTING{costMonth ? ` (${costMonth})` : ''}</Text>
                                        <Text style={s.costingDetail}>Cost ₹{latestCost.toFixed(0)} Rate ₹{pricePerM}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[s.costingDiff, { color: (costDiff || 0) >= 0 ? T.green : T.red }]}>
                                            ₹{(costDiff || 0) >= 0 ? '+' : ''}{Math.round(costDiff || 0)}
                                        </Text>
                                        {marginPct !== null && (
                                            <Text style={[s.marginText, { color: marginPct >= 0 ? T.green : T.red }]}>{marginPct.toFixed(1)}% margin</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Step 5: Shade & quantities */}
                {showStep5 && (
                    <View style={s.stepCard}>
                        <View style={s.stepHead}>
                            <View style={[s.stepBadge, colourways.length > 0 && s.stepBadgeDone]}>
                                <Text style={s.stepBadgeText}>{colourways.length > 0 ? '✓' : '5'}</Text>
                            </View>
                            <View>
                                <Text style={s.stepTitle}>Shade &amp; quantities</Text>
                                <Text style={s.stepSub}>Pick a saved shade</Text>
                            </View>
                        </View>

                        <Text style={[s.fieldLabel, { marginTop: 0 }]}>SHADE</Text>
                        <MasterSelectField data={shadeList} labelKey={['ShdName', 'ShdCode']} valueKey="ShdCode" placeholder="Select shade" selected={selectedShade} loading={shadeLoading} onSelect={(item) => setSelectedShade(item)} />

                        <Text style={[s.fieldLabel, { marginTop: 12 }]}>QUANTITY</Text>
                        <View style={s.inputWrap}>
                            <TextInput value={qty} onChangeText={setQty} keyboardType="decimal-pad" style={s.textInput} returnKeyType="done" />
                        </View>

                        <TouchableOpacity style={[s.addCwBtn, (!selectedShade || !qty) && { opacity: 0.4 }]} onPress={addColourway} disabled={!selectedShade || !qty} activeOpacity={0.8}>
                            <Text style={s.addCwBtnText}>+ Add Shade</Text>
                        </TouchableOpacity>

                        {colourways.map((c) => (
                            <View key={c.shade.ShdCode} style={s.cwChip}>
                                <View style={[s.cwSwatch, { backgroundColor: c.shade.ShdColor || T.ink }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.cwName}>{c.shade.ShdName || c.shade.ShadeName}</Text>
                                    <Text style={s.cwSub}>yarn-dyed shade</Text>
                                </View>
                                <Text style={s.cwQty}>{c.qty.toLocaleString('en-IN')}</Text>
                                <TouchableOpacity onPress={() => removeColourway(c.shade.ShdCode)} style={{ paddingLeft: 10 }}>
                                    <Text style={s.cwX}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        {colourways.length > 0 && (
                            <View style={s.totalRow}>
                                <Text style={s.totalLabel}>Total</Text>
                                <Text style={s.totalValue}>{totalQty.toLocaleString('en-IN')} · ₹{totalAmt.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {canSubmitOrder && (
                <View style={s.submitWrap}>
                    <TouchableOpacity style={[s.submitBtn, (!canSubmit || submitting) && { opacity: 0.45 }]} onPress={submitOrder} disabled={!canSubmit || submitting} activeOpacity={0.85}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit for authorization →</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {showDatePicker && (
                <DateTimePicker
                    value={deliveryDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(e: any, d?: Date) => {
                        setShowDatePicker(false);
                        if (e.type === 'set' && d) setDeliveryDate(d);
                    }}
                />
            )}
        </>
    );
}

const s = StyleSheet.create({
    scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
    configStrip: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
    stepCard: { backgroundColor: T.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: T.border },
    stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    stepBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.alt, justifyContent: 'center', alignItems: 'center' },
    stepBadgeDone: { backgroundColor: T.nav },
    stepBadgeText: { fontSize: 13, fontWeight: '700', color: T.ink },
    stepTitle: { fontSize: 15, fontWeight: '600', color: T.ink },
    stepSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    stepHint: { fontSize: 12, color: T.muted, marginTop: 6 },
    dropdownBox: { height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 12, backgroundColor: T.sub, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 4 },
    dropdownText: { flex: 1, fontSize: 14, color: T.ink },
    placeholder: { color: T.muted },
    inputWrap: { position: 'relative', marginBottom: 4 },
    textInput: { height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 12, backgroundColor: T.sub, paddingLeft: 14, paddingRight: 46, fontSize: 16, color: T.ink },
    inputUnit: { position: 'absolute', right: 14, top: 14, fontSize: 13, color: T.muted },
    warnBox: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#FDE68A' },
    warnText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
    costingBox: { backgroundColor: T.sub, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: T.border },
    costingLabel: { fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    costingDetail: { fontSize: 12, color: T.muted, marginTop: 3 },
    costingDiff: { fontSize: 16, fontWeight: '700' },
    marginText: { fontSize: 12, fontWeight: '700', marginTop: 3 },
    addCwBtn: { height: 46, borderWidth: 1, borderColor: T.border, borderRadius: 12, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 2 },
    addCwBtnText: { fontSize: 14, color: T.ink },
    cwChip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: T.sub, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: T.border },
    cwSwatch: { width: 42, height: 42, borderRadius: 10, flexShrink: 0 },
    cwName: { fontSize: 14, fontWeight: '600', color: T.ink },
    cwSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    cwQty: { fontSize: 14, fontWeight: '700', color: T.ink },
    cwX: { fontSize: 24, fontWeight: '300', color: T.red, lineHeight: 28 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border, marginTop: 10 },
    totalLabel: { fontSize: 14, color: T.muted },
    totalValue: { fontSize: 14, fontWeight: '700', color: T.copper },
    submitWrap: { padding: 12, paddingBottom: 20, backgroundColor: T.bg },
    submitBtn: { height: 52, backgroundColor: T.nav, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: T.bg },
    successTick: { fontSize: 52, color: T.nav, marginBottom: 12 },
    successTitle: { fontSize: 22, fontWeight: '600', color: T.nav, marginBottom: 6 },
    successSub: { fontSize: 14, color: T.ink, marginBottom: 28 },
    successSOBox: { backgroundColor: T.surface, borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: T.border, marginBottom: 24 },
    successSOLabel: { fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7 },
    successSONo: { fontSize: 22, fontWeight: '700', color: T.ink, marginTop: 6 },
    newOrderBtn: { height: 50, backgroundColor: T.nav, borderRadius: 14, width: '100%', justifyContent: 'center', alignItems: 'center' },
    newOrderBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
