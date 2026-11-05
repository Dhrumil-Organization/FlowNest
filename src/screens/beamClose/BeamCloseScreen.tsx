import AppAlert from '@/common/utils/appAlert';
// FILE: src/screens/beamClose/BeamCloseScreen.tsx
// Migrated from BeamClose/index.tsx to the app's standard architecture.
// Business logic (financial-year matching, validation, payload shape)
// preserved exactly. Structural changes: header/theme/API-client/
// master-selector/permissions, and the landscape/portrait branches (which
// were byte-for-byte identical JSX in the original, just wrapped
// differently) collapsed into one render path — a ScrollView works fine
// in both orientations, so the duplication wasn't adding anything.
import { MasterSelectField } from '@/src/components/forms/MasterSelectField';
import { BeamCloseAPI } from '@/src/api/legacyClient';
import { fetchAllYeardata } from '@/src/api/legacyFunctions';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SelectBeamSheet } from './SelectBeamSheet';

interface Props {
    token: string;
    // Kept optional for callers that still track device connectivity —
    // no equivalent global connectivity store exists in this app yet, so
    // this defaults to true (buttons enabled) rather than requiring one.
    // Worth wiring to a real NetInfo-based hook if offline handling
    // matters for this screen in practice.
    isConnected?: boolean;
}

export function BeamCloseScreen({ token, isConnected = true }: Props) {
    const { canDo } = usePermission();
    const canSave = canDo('beam_close', 'save');
    const canLoadBeam = canDo('beam_close', 'load_beam');

    const [FormState, setFormState] = useState<{ values: Record<string, any> }>({
        values: {
            CheckingDate: new Date(),
            PrpCode: '',
            YearNo: '',
            MacCode: '',
            MacName: '',
            DsnCode: '',
            DsnName: '',
            BeamNo: '',
            islasttaka: 0,
        },
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [getAllYearData, setAllYearData] = useState<any[]>([]);
    const [machineData, setMachineData] = useState<any[]>([]);
    const [designData, setDesignData] = useState<any[]>([]);
    const [machineLoading, setMachineLoading] = useState(false);
    const [designLoading, setDesignLoading] = useState(false);
    const [BeamHelp, setBeamHelpOpen] = useState(false);

    // Load Year
    useEffect(() => {
        if (!token) return;
        const loadYear = async () => {
            try {
                const data = await fetchAllYeardata(token, 'SIP');
                setAllYearData(Array.isArray(data) ? data : []);
            } catch (error: any) {
                const status = error?.response?.status;
                const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
                console.error('Beam Close year API failed', {
                    status,
                    data: error?.response?.data,
                    url: error?.config?.url,
                    baseURL: error?.config?.baseURL,
                });
                AppAlert.alert(
                    'Unable to load financial years',
                    serverMessage || (status ? `Server returned HTTP ${status}.` : 'Please check the API connection and try again.'),
                );
                setAllYearData([]);
            }
        };
        void loadYear();
    }, [token]);

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    let cancelToken: any;

    const fetchMachine = async () => {
        try {
            setMachineLoading(true);
            const response = await BeamCloseAPI.checkingHelp({
                PrpCode: 'SIP',
                yearno: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_close_tablet',
            });
            setMachineData(response?.data?.response?.data || []);
        } catch (err) {
            console.log('API ERROR:', err);
        } finally {
            setMachineLoading(false);
        }
    };

    // Fetch Machine + Design + Beam
    useEffect(() => {
        if (!token) return;
        if (FormState.values.YearNo && FormState.values.CheckingDate) {
            fetchMachine();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, FormState.values.YearNo, FormState.values.CheckingDate]);

    const fetchDesign = async (macCode: string) => {
        try {
            setDesignLoading(true);
            const response = await BeamCloseAPI.checkingHelp({
                PrpCode: 'SIP',
                yearno: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                MacCode: macCode,
                txntype: 'beam_close_tablet',
            });

            const data = response?.data?.response?.data || [];
            setDesignData(data);

            if (data.length > 0) {
                const first = data[0];
                setFormState((prev) => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        DsnCode: first?.DsnCode || '',
                        DsnName: first?.DsnName || '',
                        BeamNo: first?.BeamNo || '',
                        WarpLen: first?.WarpLen || '',
                        BeamUId: first?.BeamUId || '',
                        QltWt: first?.QltWt || '',
                        UId: first?.UId || '',
                    },
                }));
            }
        } catch (err) {
            console.log('DESIGN API ERROR:', err);
        } finally {
            setDesignLoading(false);
        }
    };

    const formattedMachineData = machineData.map((item) => ({
        MacCode: item.MacCode,
        MacName: item.MacName,
        PrpCode: item.PrpCode,
        displayLabel: `${item.MacCode} - ${item.MacName}`,
    }));

    const formattedDesignData = designData.map((item) => ({
        DsnCode: item.DsnCode,
        DsnName: item.DsnName,
        BeamNo: item.BeamNo,
        BeamUId: item.BeamUId,
        QltWt: item.QltWt,
        WarpLen: item.WarpLen,
        UId: item.UId,
        displayLabel: `${item.DsnCode} - ${item.DsnName}`,
    }));

    const selectedDesign = formattedDesignData.find((d) => d.DsnCode === FormState.values.DsnCode);
    const selectedMachine = formattedMachineData.find((m) => m.MacCode === FormState.values.MacCode);
    const selectedYear = getAllYearData.find((y) => y.YearNo === FormState.values.YearNo);

    // DD-MM-YYYY -> Financial Year
    const getFinancialYearFromDate = (date: any) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return month <= 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
    };

    const handleCheckTranDate = (dateValue: any, isFromPicker = false) => {
        if (!dateValue) return;
        const calculatedFY = getFinancialYearFromDate(dateValue);
        if (!calculatedFY) return;
        const matchedYear = getAllYearData.find((y) => y.YearName === calculatedFY);
        if (!matchedYear) return;

        if (isFromPicker) {
            setFormState((prev) => ({ ...prev, values: { ...prev.values, YearNo: matchedYear.YearNo } }));
        } else if (FormState.values.YearNo !== matchedYear.YearNo) {
            AppAlert.alert('Error', 'Selected date does not match selected financial year');
        }
    };

    const onChangeDate = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFormState((prev) => ({ ...prev, values: { ...prev.values, CheckingDate: selectedDate } }));
        }
        handleCheckTranDate(selectedDate, true);
    };

    useEffect(() => {
        if (getAllYearData.length > 0) {
            const today = new Date();
            const calculatedFY = getFinancialYearFromDate(today);
            const matchedYear = getAllYearData.find((y) => y.YearName === calculatedFY);
            if (matchedYear) {
                setFormState((prev) => ({
                    ...prev,
                    values: { ...prev.values, YearNo: matchedYear.YearNo, CheckingDate: today },
                }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllYearData]);

    const resetForm = () => {
        setFormState({
            values: {
                CheckingDate: new Date(),
                PrpCode: '',
                YearNo: FormState.values.YearNo,
                MacCode: '',
                MacName: '',
                DsnCode: '',
                DsnName: '',
                BeamNo: '',
                WarpLen: '',
                BeamUId: '',
                QltWt: '',
                UId: '',
                islasttaka: 0,
            },
        });
        setMachineData([]);
        setDesignData([]);
    };

    useEffect(() => {
        resetForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const validateFinancialYear = () => {
        const calculatedFY = getFinancialYearFromDate(FormState.values.CheckingDate);
        const matchedYear = getAllYearData.find((y) => y.YearName === calculatedFY);
        const selectedYearObj = getAllYearData.find((y) => y.YearNo === FormState.values.YearNo);
        const selectedYearName = selectedYearObj?.YearName || 'N/A';

        if (!matchedYear || FormState.values.YearNo !== matchedYear.YearNo) {
            AppAlert.alert(
                'Warning',
                `Checking Date (${formatDate(FormState.values.CheckingDate)}) belongs to FY (${calculatedFY}) but selected year is (${selectedYearName})`,
            );
            return false;
        }
        return true;
    };

    const handleSaveData = async () => {
        if (!canSave) return AppAlert.alert('Not permitted', 'You do not have permission to add a beam close entry.');
        try {
            if (!validateFinancialYear()) return;
            if (!FormState.values.MacCode) return AppAlert.alert('Warning', 'Please select Machine');
            if (!FormState.values.DsnCode) return AppAlert.alert('Warning', 'Please select Design');

            const d1Obj = {
                AvgWt: FormState.values.AvgWt || 0,
                BalLen: null,
                BeamNo: FormState.values.BeamNo,
                BeamUId: FormState.values.BeamUId,
                ChkCode: FormState.values.ChkCode || null,
                ChkName: FormState.values.ChkName || null,
                CutLen: null,
                DsnCode: FormState.values.DsnCode,
                DsnName: FormState.values.DsnName,
                GStatus: null,
                GrdCode: FormState.values.GrdCode || '',
                GrdName: FormState.values.GrdName || '',
                MacCode: FormState.values.MacCode,
                MacName: FormState.values.MacName,
                OQty: null,
                PlanSrNo: null,
                PlanUId: null,
                Qty: FormState.values.Qty || 0,
                QltWt: FormState.values.QltWt,
                RecType: null,
                Remarks: FormState.values.Remarks || '',
                SrNo: FormState.values.SrNo || 0,
                Status: FormState.values.Status || 0,
                SupCode: FormState.values.SupCode || '',
                SupName: FormState.values.SupName || '',
                TakaNo: FormState.values.TakaNo || null,
                TechSup: FormState.values.TechSup || '',
                TechSupName: FormState.values.TechSupName || '',
                UId: FormState.values.UId,
                WarpLen: FormState.values.WarpLen,
                Wt: FormState.values.Wt || 0,
                WvrCode: FormState.values.WvrCode || '',
                WvrName: FormState.values.WvrName || '',
                font: 0,
                isalldata: 0,
                islasttaka: FormState.values.islasttaka || 0,
                ismending: FormState.values.ismending || 0,
            };

            const payload = {
                ShfCode: 0,
                ChkDate: formatDate(FormState.values.CheckingDate),
                MacGrp: '',
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                yearno: FormState.values.YearNo,
                txntype: 'beam_close_tablet',
                d1: [d1Obj],
                d2: [],
            };

            const response = await BeamCloseAPI.addBeamClose(payload);

            if (response?.data?.success === false) {
                AppAlert.alert('Warning', `${response?.data?.message}`);
            } else {
                AppAlert.alert('Success', `${response?.data?.message}` || 'Saved successfully.');
                resetForm();
            }
        } catch (error) {
            console.log('SAVE ERROR:', error);
            AppAlert.alert('Error', 'API Failed');
        }
    };

    const openDrawer = () => setBeamHelpOpen(true);
    const closeDrawer = () => setBeamHelpOpen(false);

    return (
        <View style={s.flex}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={s.card}>
                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Select Year *</Text>
                            <MasterSelectField
                                data={getAllYearData}
                                labelKey="YearName"
                                valueKey="YearNo"
                                placeholder="Choose year..."
                                selected={selectedYear}
                                onSelect={(item) => {
                                    setFormState((prev) => ({ ...prev, values: { ...prev.values, YearNo: item?.YearNo } }));
                                }}
                            />
                        </View>

                        <View style={s.col}>
                            <Text style={s.label}>Checking Date *</Text>
                            <View style={s.inputRow}>
                                <Text style={s.inputText}>{formatDate(FormState.values.CheckingDate)}</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <Icon name="event" size={20} color={T.muted} />
                                </TouchableOpacity>
                            </View>
                            {showDatePicker && (
                                <DateTimePicker value={FormState.values.CheckingDate} mode="date" display="default" onChange={onChangeDate} />
                            )}
                        </View>
                    </View>

                    <Text style={s.label}>Select Machine</Text>
                    {machineLoading ? (
                        <Text style={{ padding: 10 }}>Loading machines...</Text>
                    ) : (
                        <MasterSelectField
                            data={formattedMachineData}
                            placeholder="Choose machine..."
                            labelKey={['MacName', 'MacCode']}
                            valueKey="MacCode"
                            selected={selectedMachine}
                            onSelect={(item) => {
                                setFormState((prev) => ({
                                    ...prev,
                                    values: {
                                        ...prev.values,
                                        MacCode: item?.MacCode || '',
                                        MacName: item?.MacName || '',
                                        PrpCode: item?.PrpCode || '',
                                        DsnCode: '',
                                        DsnName: '',
                                        BeamNo: '',
                                        WarpLen: '',
                                    },
                                }));
                                fetchDesign(item?.MacCode);
                            }}
                        />
                    )}

                    <Text style={s.label}>Select Design</Text>
                    {designLoading ? (
                        <Text style={{ padding: 10 }}>Loading designs...</Text>
                    ) : (
                        <MasterSelectField
                            data={formattedDesignData}
                            selected={selectedDesign}
                            labelKey="displayLabel"
                            valueKey="DsnCode"
                            placeholder="Choose design..."
                            onSelect={(item) => {
                                setFormState((prev) => ({
                                    ...prev,
                                    values: {
                                        ...prev.values,
                                        DsnCode: item?.DsnCode || '',
                                        DsnName: item?.DsnName || '',
                                        BeamNo: item?.BeamNo || '',
                                        WarpLen: item?.WarpLen || '',
                                        BeamUId: item?.BeamUId || '',
                                        QltWt: item?.QltWt || '',
                                        UId: item?.UId || '',
                                    },
                                }));
                            }}
                        />
                    )}

                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Beam *</Text>
                            <View style={s.beamBox}>
                                <Text>{FormState.values.BeamNo}</Text>
                            </View>
                        </View>
                        <View style={s.col}>
                            <Text style={s.label}>Beam Balance *</Text>
                            <View style={s.beamBox}>
                                <Text>{FormState.values.WarpLen}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.footer}>
                        {canSave && (
                            <TouchableOpacity style={s.allBtn} onPress={handleSaveData} disabled={!isConnected}>
                                <Icon name="check-circle" size={16} color="#fff" />
                                <Text style={s.saveText}>ADD BEAM CLOSE</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={s.allBtn} onPress={resetForm} disabled={!isConnected}>
                            <Icon name="refresh" size={16} color="#fff" />
                            <Text style={s.saveText}>CLEAR FORM</Text>
                        </TouchableOpacity>

                        {canLoadBeam && (
                            <TouchableOpacity
                                style={s.allBtn}
                                onPress={() => {
                                    if (!validateFinancialYear()) return;
                                    openDrawer();
                                }}
                                disabled={!isConnected}
                            >
                                <Icon name="download" size={16} color="#fff" />
                                <Text style={s.saveText}>LOAD BEAM</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {canLoadBeam && (
                <SelectBeamSheet visible={BeamHelp} onClose={closeDrawer} FormState={FormState} setFormState={setFormState} token={token} />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    flex: { flex: 1, backgroundColor: T.bg },
    scrollContent: { padding: 16, paddingBottom: 140 },
    card: { backgroundColor: T.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: T.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    col: { width: '48%' },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10, color: T.muted },
    beamBox: { backgroundColor: T.alt, borderRadius: 8, padding: 12, minHeight: 50, justifyContent: 'center' },
    allBtn: { flex: 1, backgroundColor: T.nav, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
    saveText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
    footer: { flexDirection: 'row', padding: 10, backgroundColor: T.surface, borderTopWidth: 1, borderColor: T.border, gap: 8, borderRadius: 12, marginTop: 20 },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.sub, borderRadius: 10, height: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: T.border },
    inputText: { fontSize: 14, color: T.ink },
});
