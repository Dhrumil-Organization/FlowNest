// screens/CriteriaScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
    StatusBar,
    Modal,
    FlatList,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../../../common/API/dynamicAPI';
import axios from 'axios';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../../common/API/Functions';
import Icon from "react-native-vector-icons/MaterialIcons";

const BLUE = '#2148C8';
const HEADER_BG = '#1A3DB8';

// ─── Single unified form state ───────────────────────────────────────────────
// Toggle options use  1 = checked (ON)  /  0 = unchecked (OFF)
const INITIAL_FORM_STATE = {
    // Selection Criteria
    property: 'TEXPROCIL PVT. LTD.',
    year: '2025 - 2026',
    store: 'MAIN STORE',

    // Options  →  1 = ON, 0 = OFF
    updateStock: 1,
    autoFound: 1,
    manual: 1,
    stockNotFound: 1,
    autoNotFound: 1,
    autoForRepacking: 1,
    duplicate: 1,
};

// ─── Reusable sub-components ─────────────────────────────────────────────────

const DropdownField = ({ label, value, onPress }) => (
    <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity style={styles.dropdown} activeOpacity={0.8} onPress={onPress}>
            <Text style={styles.dropdownText}>{value}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>
    </View>
);

// value is 0 or 1  — Switch needs a boolean, so we convert with === 1
const ToggleRow = ({ label, value, onToggle }) => (
    <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <View style={styles.toggleRight}>
            {/* <Text style={[styles.toggleBadge, value === 1 ? styles.badgeOn : styles.badgeOff]}>
                {value === 1 ? '1' : '0'}
            </Text> */}
            <Switch
                value={value === 1}
                onValueChange={onToggle}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor="#ccc"
            />
        </View>
    </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CriteriaScreen({ navigation, token }) {
    // const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [getStockTypesFilterForm, setStockTypesFilterForm] = useState([
        { 'label': 'All', 'value': 'A' },
        { 'label': 'In house', 'value': 'I' },
        { 'label': 'Process house', 'value': 'P' }
    ]);
    const [formState, setFormState] = useState({
        PrpCode: '',
        YearNo: '',
        StrCode: '',
        updateStock: 1,
        autoFound: 1,
        manual: 1,
        stockNotFound: 1,
        autoNotFound: 1,
        autoForRepacking: 1,
        duplicate: 1,
        StkType: ''
    });

    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [propertyVisible, setPropertyVisible] = useState(false);
    const [yearVisible, setYearVisible] = useState(false);
    const [storeVisible, setStoreVisible] = useState(false);
    const [stockTypeVisible, setStockTypeVisible] = useState(false);


    const getToken = () => {
        return token;
    };


    const setField = (key, value) =>
        setFormState((prev) => ({ ...prev, [key]: value }));


    const toggleField = (key) =>
        setFormState((prev) => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));


    useEffect(() => {
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
    }, []);



    useEffect(() => {
        if (typeof formState.PrpCode != 'undefined' && formState.PrpCode != null && formState.PrpCode != '') {
            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, formState.PrpCode)
                setAllYearData(allyeardata)
            }
            testFinct();
        }
    }, [formState.PrpCode])


    useEffect(() => {
        if (typeof formState.YearNo != 'undefined' && formState.YearNo != null && formState.YearNo != '') {
            const testFinctStore = async () => {
                const allstoredata = await fetchAllStoredata(token, formState.PrpCode, formState.YearNo)
                setAllStoreData(allstoredata)
            }
            testFinctStore();
        }
    }, [formState.YearNo])


    // Navigate and pass the entire formState as a param
    // const handleLoadStock = async () => {
    //     try {

    //         const payload = {
    //             prptype: 'S',
    //             prpcodes: [formState.PrpCode],
    //             yearno: formState.YearNo,
    //             strcode: formState.StrCode,

    //             updateStock: formState.updateStock,
    //             autoFound: formState.autoFound,
    //             manual: formState.manual,
    //             stockNotFound: formState.stockNotFound,
    //             autoNotFound: formState.autoNotFound,
    //             autoForRepacking: formState.autoForRepacking,
    //             duplicate: formState.duplicate,
    //             txntype: 'yarnStockVerification',
    //             stktype: formState.StkType || 'I',
    //         };

    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };

    //         console.log('payload =>', payload);

    //         const response = await axios.post(
    //             `${API}/api/get_verify_manual_stock`,
    //             payload,
    //             { headers }
    //         );

    //         console.log('response =>', response.data);

    //         if (
    //             response?.data?.success === true &&
    //             response?.data?.response?.data?.length > 0
    //         ) {
    //             navigation.navigate('StockList', {
    //                 criteriaForm: formState,
    //                 stockData: response.data.response.data,
    //             });
    //         } else {
    //             Alert.alert('No Data Found');
    //         }

    //     } catch (error) {
    //         console.log(error);
    //         Alert.alert('Server Error');
    //     }
    // };


    const handleLoadStock = async () => {

        const staticData = [
            {
                UId: "100001",
                CartNo: "CTN0001",
                ItmName: "40s Cotton Yarn",
                MerName: "Cotton",
                GrdName: "A Grade",
                ShdName: "White",
                Chees: 24,
                Denier: 150,
                StkType: "Manual",
                UsrCode: "ADMIN",
                TranDate: "20250616",
                Wt: 48.75,
                IsAuto: "No",
                TranName: "Manual Verification",
                Status: "1"
            },
            {
                UId: "100002",
                CartNo: "CTN0002",
                ItmName: "60s Cotton Yarn",
                MerName: "Polyester",
                GrdName: "B Grade",
                ShdName: "Black",
                Chees: 30,
                Denier: 200,
                StkType: "Auto Found",
                UsrCode: "USER01",
                TranDate: "20250615",
                Wt: 52.25,
                IsAuto: "Yes",
                TranName: "Auto Verification",
                Status: "2"
            }
        ];

        navigation.navigate('StockList', {
            criteriaForm: formState,
            stockData: staticData,
        });
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar backgroundColor={'#0f8f9a'} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <Icon
                        name="arrow-back-ios"
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Fabric Stock Verification</Text>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

                {/* ── Selection Criteria ── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Selection Criteria</Text>

                    <DropdownField
                        label="Property"
                        value={
                            getAllPropertyData.find(
                                x => x.PrpCode === formState.PrpCode
                            )?.PrpName || ''
                        }
                        onPress={() => setPropertyVisible(true)}
                    />

                    <DropdownField
                        label="Year"
                        value={
                            getAllYearData.find(
                                x => x.YearNo === formState.YearNo
                            )?.YearName || ''
                        }
                        onPress={() => setYearVisible(true)}
                    />

                    <DropdownField
                        label="Store"
                        value={
                            getAllStoreData.find(
                                x => x.StrCode === formState.StrCode
                            )?.StrName || ''
                        }
                        onPress={() => setStoreVisible(true)}
                    />

                    <DropdownField
                        label="Stock Type"
                        value={
                            getStockTypesFilterForm.find(
                                x => x.value === formState.StkType
                            )?.label || ''
                        }
                        onPress={() => setStockTypeVisible(true)}
                    />

                </View>

                {/* ── Options (toggles) ── */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: '#000' }]}>Options</Text>

                    <ToggleRow
                        label="Update Stock"
                        value={formState.updateStock}
                        onToggle={() => toggleField('updateStock')}
                    />
                    <ToggleRow
                        label="Auto Found"
                        value={formState.autoFound}
                        onToggle={() => toggleField('autoFound')}
                    />
                    <ToggleRow
                        label="Manual"
                        value={formState.manual}
                        onToggle={() => toggleField('manual')}
                    />
                    <ToggleRow
                        label="Stock Not Found"
                        value={formState.stockNotFound}
                        onToggle={() => toggleField('stockNotFound')}
                    />
                    <ToggleRow
                        label="Auto Not Found"
                        value={formState.autoNotFound}
                        onToggle={() => toggleField('autoNotFound')}
                    />
                    <ToggleRow
                        label="Auto For Repacking"
                        value={formState.autoForRepacking}
                        onToggle={() => toggleField('autoForRepacking')}
                    />
                    <ToggleRow
                        label="Duplicate"
                        value={formState.duplicate}
                        onToggle={() => toggleField('duplicate')}
                    />
                </View>

                {/* ── Load Stock ── */}
                <TouchableOpacity
                    style={styles.loadBtn}
                    activeOpacity={0.85}
                    onPress={handleLoadStock}
                >
                    <Text style={styles.loadBtnText}>LOAD STOCK</Text>
                </TouchableOpacity>

            </ScrollView>

            <Modal
                visible={propertyVisible}
                animationType="slide"
                onRequestClose={() => setPropertyVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#fff' }}>

                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 15,
                            paddingVertical: 15,
                            borderBottomWidth: 1,
                            borderBottomColor: '#ddd',
                            backgroundColor: '#0B6B6F',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: '#000',
                            }}
                        >
                            Select Property
                        </Text>

                        <TouchableOpacity
                            onPress={() => setPropertyVisible(false)}
                        >
                            <Icon
                                name="close"
                                size={26}
                                color="#000"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Property List */}
                    <FlatList
                        data={getAllPropertyData}
                        keyExtractor={(item) => item.PrpCode}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 18,
                                    paddingHorizontal: 15,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#eee',
                                    backgroundColor:
                                        formState.PrpCode === item.PrpCode
                                            ? '#E8F5F5'
                                            : '#fff',
                                }}
                                onPress={() => {
                                    setFormState(prev => ({
                                        ...prev,
                                        PrpCode: item.PrpCode,
                                        YearNo: '',
                                        StrCode: '',
                                    }));

                                    setPropertyVisible(false);
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: '#222',
                                    }}
                                >
                                    {item.PrpName}
                                </Text>

                                <Text
                                    style={{
                                        marginTop: 4,
                                        fontSize: 13,
                                        color: '#777',
                                    }}
                                >
                                    {item.PrpCode}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            <Modal
                visible={yearVisible}
                animationType="slide"
                onRequestClose={() => setYearVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#fff' }}>

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 15,
                            paddingVertical: 15,
                            backgroundColor: '#0B6B6F',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: '#fff',
                            }}
                        >
                            Select Year
                        </Text>

                        <TouchableOpacity onPress={() => setYearVisible(false)}>
                            <Icon name="close" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={getAllYearData}
                        keyExtractor={(item) => item.YearNo}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 18,
                                    paddingHorizontal: 15,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#eee',
                                    backgroundColor:
                                        formState.YearNo === item.YearNo
                                            ? '#E8F5F5'
                                            : '#fff',
                                }}
                                onPress={() => {
                                    setFormState(prev => ({
                                        ...prev,
                                        YearNo: item.YearNo,
                                        StrCode: '',
                                    }));
                                    setYearVisible(false);
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: '#222',
                                    }}
                                >
                                    {item.YearName}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
            <Modal visible={storeVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <FlatList
                        data={getAllStoreData}
                        keyExtractor={(item) => item.StrCode}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setFormState(prev => ({
                                        ...prev,
                                        StrCode: item.StrCode,
                                    }));
                                    setStoreVisible(false);
                                }}
                            >
                                <Text>{item.StrName}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
            <Modal visible={stockTypeVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <FlatList
                        data={getStockTypesFilterForm}
                        keyExtractor={(item) => item.value}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setFormState(prev => ({
                                        ...prev,
                                        StkType: item.value,
                                    }));
                                    setStockTypeVisible(false);
                                }}
                            >
                                <Text>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </SafeAreaView>

    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        backgroundColor: '#0f8f9a',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    menuBtn: { marginRight: 14 },
    menuIcon: { color: '#fff', fontSize: 22 },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    body: { padding: 16, paddingBottom: 32 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        marginBottom: 14,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    fieldLabel: {
        width: 72,
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    dropdown: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D0D5E8',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#FAFBFF',
    },
    dropdownText: { fontSize: 13, color: '#222', flex: 1 },
    dropdownArrow: { fontSize: 14, color: '#888', marginLeft: 6 },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EFEFEF',
    },
    toggleLabel: { fontSize: 14, color: '#333', flex: 1 },
    toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleBadge: {
        width: 22,
        height: 22,
        borderRadius: 4,
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
    badgeOn: { backgroundColor: '#E6F9ED', color: '#27AE60' },
    badgeOff: { backgroundColor: '#FFE8E8', color: '#E53935' },
    loadBtn: {
        backgroundColor: '#0f8f9a',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 4,
        elevation: 3,
        shadowColor: '#0f8f9a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    loadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
    modalItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});