import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput as RNTextInput,
    Platform,
    StatusBar,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SearchableDropdown from '../Shared/SearchableDropdown';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import FullScreenLoader from '../Loader/Loader';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
    primary: '#1565C0',       // deep blue header
    primaryLight: '#1976D2',
    accent: '#1E88E5',
    white: '#FFFFFF',
    background: '#F0F4F8',
    card: '#FFFFFF',
    border: '#E0E7EF',
    label: '#1A237E',
    sectionTitle: '#1565C0',
    inputText: '#212121',
    inputBg: '#FAFBFD',
    placeholder: '#90A4AE',
    required: '#E53935',
    btnClear: '#E53935',
    btnSave: '#1565C0',
    shadow: '#B0BEC5',
    divider: '#E8EEF4',
};

// ─── Helper: section card ──────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionBody}>{children}</View>
    </View>
);

// ─── Helper: field row ─────────────────────────────────────────────────────────
const FieldRow = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
        </Text>
        {children}
    </View>
);

// ─── Main component ────────────────────────────────────────────────────────────
const NewCartonScreen = (props) => {
    const {
        isVisible,
        onClose,
        isLoading,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        getAllStoreData,
        setAllStockData,
        token,
        setFormCartonDataState,
        FormCartonDataState,
        getAllStockDataInserted,
        setAllStockDataInserted,
    } = props;

    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);
    const [getStockTypes] = useState([
        { label: 'Normal', value: 'N' },
        { label: 'In house', value: 'I' },
        { label: 'Process house', value: 'P' },
    ]);
    const [loading, setLoading] = useState(false);

    // ── Token helper ─────────────────────────────────────────────────────────
    const getToken = () => token;

    let cancelToken: any;
    const getRequestConfig = (p: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: p.params,
        cancelToken: cancelToken?.token,
    });

    // ── API helpers ───────────────────────────────────────────────────────────
    const getAllItems = async () => {
        try {
            const payload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '', itemname: '', isall: '1',
                txntype: 'yarnStockVerification', billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'], fetch: '',
            };
            const res = await axios.get(`${API}/api/itemdrop`, getRequestConfig({ params: payload }));
            return res.data.response.data.length > 0 ? res.data.response.data : [];
        } catch { return []; }
    };

    const getAllMerges = async () => {
        try {
            const payload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '', itemname: '', isall: 1,
                txntype: 'yarnStockVerification', billdate: '',
            };
            const res = await axios.get(`${API}/api/mergedrop`, getRequestConfig({ params: payload }));
            return res.data.response.data.length > 0 ? res.data.response.data : [];
        } catch { return []; }
    };

    const getAllGrades = async () => {
        try {
            const payload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '', itemname: '', isall: 1,
                txntype: 'yarnStockVerification', billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'], fetch: 'grade',
            };
            const res = await axios.get(`${API}/api/gradedrop`, getRequestConfig({ params: payload }));
            return res.data.response.data.length > 0 ? res.data.response.data : [];
        } catch { return []; }
    };

    const getAllShades = async () => {
        try {
            const payload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '', itemname: '', isall: 1,
                txntype: 'yarnStockVerification', billdate: '',
            };
            const res = await axios.get(`${API}/api/shadedrop`, getRequestConfig({ params: payload }));
            return res.data.response.data.length > 0 ? res.data.response.data : [];
        } catch { return []; }
    };

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode: prev.values.PrpCode || FormState.values.PrpCode || '',
                YearNo: prev.values.YearNo || FormState.values.YearNo || '',
                StrCode: prev.values.StrCode || FormState.values.StrCode || '',
            },
        }));
    }, [FormState.values.PrpCode, FormState.values.YearNo, FormState.values.StrCode]);

    useEffect(() => {
        if (!FormCartonDataState.values.StkType) {
            setFormCartonDataState(prev => ({
                ...prev,
                values: { ...prev.values, StkType: 'I' },
            }));
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            const { PrpCode, YearNo, StrCode } = FormCartonDataState.values;
            if (PrpCode && YearNo && StrCode) {
                const [itm, mer, grd, shd] = await Promise.all([
                    getAllItems(), getAllMerges(), getAllGrades(), getAllShades(),
                ]);
                setItemData(itm);
                setMergeData(mer);
                setGradeData(grd);
                setShadeData(shd);
            }
        };
        load();
    }, [FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo, FormCartonDataState.values.StrCode]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleChange = (name: string, value: any) => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: { ...prev.values, [name]: value },
        }));
    };

    const handleClearForm = () => {
        const { PrpCode, YearNo, StrCode, StkType } = FormCartonDataState.values;
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                PrpCode: PrpCode || FormState.values.PrpCode || '',
                YearNo: YearNo || FormState.values.YearNo || '',
                StrCode: StrCode || FormState.values.StrCode || '',
                CartNo: '', Chees: '', ItmCode: '', MerCode: '',
                GrdCode: '', ShdCode: '', Denier: '', grsWt: 0,
                netWt: '', StkType: StkType || '',
            },
        }));
    };

    const showError = (text: string) =>
        Snackbar.show({
            text,
            duration: Snackbar.LENGTH_LONG,
            backgroundColor: COLORS.btnClear,
            textColor: '#fff',
            action: { text: 'OK', textColor: 'white' },
        });

    const handleStockData = async (newdata: any[]) => {
        setLoading(true);
        setAllStockData([]);
        const { PrpCode, YearNo, StrCode } = FormCartonDataState.values;
        const sv = FormState.values;
        const safeVal = (v: any) => (!v ? '0' : v);

        const payload = {
            prptype: 'S', prpcodes: [PrpCode], yearno: YearNo, strcode: StrCode,
            updateStock: sv.updateStock, autoFound: safeVal(sv.autoFound),
            manual: safeVal(sv.manual), stockNotFound: safeVal(sv.stockNotFound),
            autoNotFound: safeVal(sv.autoNotFound), autoForRepacking: safeVal(sv.autoForRepacking),
            duplicate: safeVal(sv.duplicate), txntype: 'yarnStockVerification',
            stktype: sv.StkType || '',
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.post(`${API}/api/get_verify_manual_stock`, payload, { headers });
            if (response.data.success === true && response.data.response.data.length > 0) {
                let finalrespo = response.data.response.data;
                if (newdata?.length > 0) {
                    const cartons = newdata.map(el => el.CartNo);
                    finalrespo = finalrespo.filter(el => !cartons.includes(el.CartNo));
                    setAllStockData(newdata.concat(finalrespo));
                } else {
                    setAllStockData(finalrespo);
                }
                setFormState(prev => ({
                    ...prev,
                    values: { ...prev.values, PrpCode, YearNo, StrCode },
                }));
                handleClearForm();
            } else {
                Alert.alert(response.data.message || 'No Data Found');
            }
        } catch (error) {
            Alert.alert('Server Error: ' + error);
        } finally {
            setLoading(false);
            onClose();
        }
    };

    const handleSaveCarton = async () => {
        const v = FormCartonDataState.values;
        if (!v.PrpCode) return showError('Please select property');
        if (!v.YearNo) return showError('Please select year');
        if (!v.StrCode) return showError('Please select store');
        if (!v.CartNo) return showError('Carton no. cannot be blank');
        if (!v.Chees || parseFloat(v.Chees) <= 0) return showError('Chees cannot be blank or 0');
        if (!v.ItmCode) return showError('Item cannot be blank');
        if (!v.MerCode) return showError('Merge cannot be blank');
        if (!v.GrdCode) return showError('Grade cannot be blank');
        if (!v.ShdCode) return showError('Shade cannot be blank');
        if (!v.Denier) return showError('Denier cannot be blank');
        if (!v.netWt || parseFloat(v.netWt) <= 0) return showError('Net weight cannot be blank or 0');
        if (!v.StkType) return showError('Please select stock type');

        setLoading(true);
        const payload = {
            prptype: 'S', prpcodes: [v.PrpCode], yearno: v.YearNo, strcode: v.StrCode,
            CartNo: v.CartNo, Chees: v.Chees, ItmCode: v.ItmCode, MerCode: v.MerCode,
            GrdCode: v.GrdCode, ShdCode: v.ShdCode, Denier: v.Denier,
            GrsWt: v.grsWt, NetWt: v.netWt, StkType: v.StkType,
            txntype: 'yarnStockVerification',
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.post(`${API}/api/insert_verify_manual_stock`, payload, { headers });
            if (response.data.success === true && response.data.data.length > 0) {
                setAllStockDataInserted(prev => [...prev, response.data.data[0]]);
                handleStockData(response.data.data.concat(getAllStockDataInserted));
            } else {
                Alert.alert(response.data.message || 'No Data Found');
            }
        } catch (error) {
            Alert.alert('Server Error: ' + error);
        } finally {
            // loader cleared inside handleStockData
        }
    };

    // ── Derived selections ────────────────────────────────────────────────────
    const v = FormCartonDataState.values;
    const selectedProperty  = getAllPropertyData?.find(p => p.PrpCode === v.PrpCode) || null;
    const selectedYear      = getAllYearData?.find(y => y.YearNo === v.YearNo) || null;
    const selectedStore     = getAllStoreData?.find(s => s.StrCode === v.StrCode) || null;
    const selectedItem      = getItemData?.find(i => i.ItmCode === v.ItmCode) || null;
    const selectedMerge     = getMergeData?.find(m => m.MerCode === v.MerCode) || null;
    const selectedGrade     = getGradeData?.find(g => g.GrdCode === v.GrdCode) || null;
    const selectedShade     = getShadeData?.find(s => s.ShdCode === v.ShdCode) || null;
    const selectedStockType = getStockTypes?.find(s => s.value === v.StkType) || null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Modal
            visible={isVisible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={Platform.OS === 'android'}
        >
            <SafeAreaView style={styles.safeArea}>
                <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
                {loading && <FullScreenLoader />}

                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Carton</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* ── Scrollable form ── */}
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Stock Information */}
                    <SectionCard title="Stock Information">
                        <FieldRow label="Property" required>
                            <SearchableDropdown
                                data={getAllPropertyData}
                                labelKey="LngName"
                                valueKey="PrpCode"
                                placeholder="Choose property..."
                                pageSize={10}
                                initialValue={selectedProperty}
                                value={v.PrpCode || FormState.values.PrpCode}
                                onSelect={item =>
                                    handleChange('PrpCode', item?.PrpCode || '')
                                }
                                multiple={false}
                                emptyMessage="No properties available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Store" required>
                            <SearchableDropdown
                                key={v.StrCode}
                                data={getAllStoreData}
                                labelKey="StrName"
                                valueKey="StrCode"
                                placeholder="Choose store..."
                                pageSize={10}
                                initialValue={selectedStore}
                                value={v.StrCode || FormState.values.StrCode}
                                onSelect={str =>
                                    handleChange('StrCode', str?.StrCode || '')
                                }
                                multiple={false}
                                emptyMessage="No stores available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Year" required>
                            <SearchableDropdown
                                key={v.YearNo}
                                data={getAllYearData}
                                labelKey="YearName"
                                valueKey="YearNo"
                                placeholder="Choose year..."
                                pageSize={10}
                                initialValue={selectedYear}
                                value={v.YearNo || FormState.values.YearNo}
                                onSelect={yr =>
                                    handleChange('YearNo', yr?.YearNo || '')
                                }
                                multiple={false}
                                emptyMessage="No years available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Stock Type" required>
                            <SearchableDropdown
                                key={v.StkType}
                                data={getStockTypes}
                                labelKey="label"
                                valueKey="value"
                                placeholder="Choose stock type..."
                                pageSize={10}
                                initialValue={selectedStockType}
                                value={v.StkType}
                                onSelect={stk =>
                                    handleChange('StkType', stk?.value || '')
                                }
                                multiple={false}
                                emptyMessage="No stock types available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                    </SectionCard>

                    {/* Yarn Details */}
                    <SectionCard title="Yarn Details">
                        <FieldRow label="Item" required>
                            <SearchableDropdown
                                key={v.ItmCode}
                                data={getItemData}
                                labelKey="ItmName"
                                valueKey="ItmCode"
                                placeholder="Choose item..."
                                pageSize={10}
                                initialValue={selectedItem}
                                onSelect={itm => {
                                    handleChange('ItmCode', itm?.ItmCode || '');
                                    if (itm?.Denier) handleChange('Denier', itm.Denier);
                                }}
                                multiple={false}
                                emptyMessage="No items available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Merge" required>
                            <SearchableDropdown
                                key={v.MerCode}
                                data={getMergeData}
                                labelKey="MerName"
                                valueKey="MerCode"
                                placeholder="Choose merge..."
                                pageSize={10}
                                initialValue={selectedMerge}
                                onSelect={mrg => handleChange('MerCode', mrg?.MerCode || '')}
                                multiple={false}
                                emptyMessage="No merge data available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Grade" required>
                            <SearchableDropdown
                                key={v.GrdCode}
                                data={getGradeData}
                                labelKey="GrdName"
                                valueKey="GrdCode"
                                placeholder="Choose grade..."
                                pageSize={10}
                                initialValue={selectedGrade}
                                onSelect={grd => handleChange('GrdCode', grd?.GrdCode || '')}
                                multiple={false}
                                emptyMessage="No grade data available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Shade" required>
                            <SearchableDropdown
                                key={v.ShdCode}
                                data={getShadeData}
                                labelKey="ShdName"
                                valueKey="ShdCode"
                                placeholder="Choose shade..."
                                pageSize={10}
                                initialValue={selectedShade}
                                onSelect={shd => handleChange('ShdCode', shd?.ShdCode || '')}
                                multiple={false}
                                emptyMessage="No shade data available"
                                containerStyle={styles.dropdownContainer}
                            />
                        </FieldRow>
                        <FieldRow label="Denier" required>
                            <RNTextInput
                                style={styles.textInput}
                                value={String(v.Denier || '')}
                                onChangeText={t => handleChange('Denier', t)}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.placeholder}
                                placeholder="e.g. 80"
                            />
                        </FieldRow>
                    </SectionCard>

                    {/* Quantity Details */}
                    <SectionCard title="Quantity Details">
                        <FieldRow label="Carton No" required>
                            <RNTextInput
                                style={[styles.textInput, styles.textInputReadonly]}
                                value={v.CartNo || ''}
                                onChangeText={t => handleChange('CartNo', t)}
                                placeholderTextColor={COLORS.placeholder}
                                placeholder="e.g. C000126"
                            />
                        </FieldRow>
                        <View style={styles.twoColRow}>
                            <View style={styles.col}>
                                <Text style={styles.fieldLabel}>
                                    Chees <Text style={styles.required}>*</Text>
                                </Text>
                                <RNTextInput
                                    style={styles.textInput}
                                    value={String(v.Chees || '')}
                                    onChangeText={t => handleChange('Chees', t)}
                                    keyboardType="numeric"
                                    placeholderTextColor={COLORS.placeholder}
                                    placeholder="0"
                                />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.fieldLabel}>
                                    Gross Weight (KG) <Text style={styles.required}>*</Text>
                                </Text>
                                <RNTextInput
                                    style={styles.textInput}
                                    value={String(v.grsWt || '')}
                                    onChangeText={t => handleChange('grsWt', t)}
                                    keyboardType="numeric"
                                    placeholderTextColor={COLORS.placeholder}
                                    placeholder="0.00"
                                />
                            </View>
                        </View>
                        <FieldRow label="Net Weight (KG)" required>
                            <RNTextInput
                                style={styles.textInput}
                                value={String(v.netWt || '')}
                                onChangeText={t => handleChange('netWt', t)}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.placeholder}
                                placeholder="0.00"
                            />
                        </FieldRow>
                    </SectionCard>

                    {/* Bottom spacing so fab doesn't cover last field */}
                    <View style={{ height: 24 }} />
                </ScrollView>

                {/* ── Save button ── */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSaveCarton}
                        activeOpacity={0.85}
                        disabled={isLoading || loading}
                    >
                        {isLoading || loading ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.saveBtnText}>SAVE CARTON</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 4 : 8,
        paddingBottom: 14,
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        // Android shadow
        elevation: 6,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
        letterSpacing: 0.3,
    },

    // Scroll
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 20,
    },

    // Section card
    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 14,
        // iOS shadow
        shadowColor: '#90A4AE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 6,
        // Android shadow
        elevation: 3,
        overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    sectionAccent: {
        width: 4,
        height: 18,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
        color: COLORS.sectionTitle,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    sectionBody: {
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 12,
    },

    // Field row
    fieldRow: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 13,
        color: COLORS.label,
        fontWeight: '500',
        marginBottom: 6,
    },
    required: {
        color: COLORS.required,
        fontWeight: '700',
    },

    // Two-column row
    twoColRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    col: {
        flex: 1,
    },

    // Inputs
    textInput: {
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        color: COLORS.inputText,
        backgroundColor: COLORS.inputBg,
        // iOS shadow inside
        shadowColor: '#CFD8DC',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    textInputReadonly: {
        backgroundColor: '#F5F7FA',
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: COLORS.inputBg,
        minHeight: 44,
    },

    // Footer
    footer: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        // iOS shadow
        shadowColor: '#90A4AE',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 8,
    },
    saveBtn: {
        backgroundColor: COLORS.btnSave,
        borderRadius: 10,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        // iOS shadow
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    saveBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
        letterSpacing: 1.2,
    },
});

export default NewCartonScreen;