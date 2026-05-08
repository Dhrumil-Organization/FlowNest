import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useSalesOrder } from './SalesOrderContext';
import { API } from '../../common/API/dynamicAPI';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_BASE_URL = 'https://erp.sharpskillit.com/api';

// 🔥 CHANGE THIS TO YOUR ACTUAL LOAD API
const LOAD_SO_API_URL = `${API}/api/YOUR_LOAD_SO_API`;

const money = value => {
    return Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const toNumber = value => {
    const n = Number(value || 0);
    return isNaN(n) ? 0 : n;
};

const OrderSummaryScreen = ({ navigation, route }) => {
    const { salesOrderParams } = useSalesOrder();

    const routeParty = route?.params?.partyData || route?.params?.party || null;

    const [mode, setMode] = useState('ADD');
    const [uid, setUid] = useState('');
    const [prpcode, setPrpcode] = useState('');
    const [strcode, setStrcode] = useState('');
    const [yearno, setYearno] = useState('');
    const [token, setToken] = useState('');

    const [party, setParty] = useState(routeParty);
    const [headerData, setHeaderData] = useState({});
    const [orderItems, setOrderItems] = useState([]);

    const [discount, setDiscount] = useState('0');
    const [tax, setTax] = useState('0');
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);

    useEffect(() => {
        const p = {
            ...(salesOrderParams || {}),
            ...(route?.params || {}),
        };

        if (p.mode === 'EDIT' || p.mode === 'VIEW') {
            setMode(p.mode);
            setUid(p.uid || '');
            setPrpcode(p.prpcode || '');
            setStrcode(p.strcode || '012');
            setYearno(p.yearno || '');
            setToken(p.token || '');

            loadOrderFromBackend(p);
        } else {
            setMode('ADD');
            setUid(0);
            setPrpcode(p.prpcode || '');
            setStrcode(p.strcode || '012');
            setYearno(p.yearno || '');
            setToken(p.token || '');
            setParty(p.partyData || routeParty);

            setHeaderData({});
            setOrderItems([]);
            setDiscount('0');
            setTax('0');
            setRemark('');
        }
    }, [salesOrderParams, route?.params]);

    const convertD1ToOrderItems = d1Rows => {
        return (d1Rows || []).map(row => ({
            SrNo: row.SrNo,
            UId: row.UId,
            StrCode: row.StrCode,

            ItmCode: row.ItmCode,
            ItmName: row.ItmName,

            DsnCode: row.DsnCode,
            DsnName: row.DsnName,

            ShdCode: row.ShdCode,
            ShdName: row.ShdName,

            Qty: toNumber(row.Qty),
            Pcs: toNumber(row.QtyPcs),
            Rate: toNumber(row.UnitRate),
            Amount: toNumber(row.Amount),

            UOM: row.UOM,
            Denier: row.Denier,
            HsnCode: row.HsnCode,
            HSNName: row.HSNName,

            Raw: row,
        }));
    };

    const loadOrderFromBackend = async params => {
        try {
            setLoadingOrder(true);

            const res = await axios.get(`${API}/api/soshow`, {
                headers: {
                    Authorization: `Bearer ${params.token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob',
                },
                params: {
                    uid: params.uid,
                    prpcode: params.prpcode,
                    strcode: params.strcode,
                    yearno: params.yearno,
                    mode: params.mode,
                },
            });

            console.log("res ::", res)

            const data = res.data.response || res.data.data || res.data;

            const main = data.main?.[0] || null;
            const d1 = data.d1 || [];

            if (!main) {
                Alert.alert('Error', 'Sales order header not found.');
                return;
            }

            setHeaderData(main);

            setParty({
                ParCode: main.ParCode,
                ParName: main.ParName,
                City: main.city || main.DCity || main.Station || '',
                Address: main.address || main.DAdd || '',
            });

            setMode(params.mode || 'EDIT');
            setUid(main.UId || params.uid);
            setPrpcode(main.PrpCode || params.prpcode);
            setStrcode(main.StrCode || params.strcode);
            setYearno(params.yearno || '');

            setDiscount(String(toNumber(main.DisAmt || main.TDisAmt || main.NDisAmt)));
            setTax('0');
            setRemark(main.Remark || '');

            setOrderItems(convertD1ToOrderItems(d1));
        } catch (error) {
            console.log('LOAD SO ERROR:', error?.response?.data || error.message);
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to load sales order data',
            );
        } finally {
            setLoadingOrder(false);
        }
    };

    const removeItem = index => {
        if (mode === 'VIEW') return;

        const updated = [...orderItems];
        updated.splice(index, 1);
        setOrderItems(updated);
    };

    const totals = useMemo(() => {
        return {
            itemCount: orderItems.length,
            totalPcs: orderItems.reduce((sum, item) => {
                return sum + toNumber(item.Pcs);
            }, 0),
            totalQty: orderItems.reduce((sum, item) => {
                return sum + toNumber(item.Qty);
            }, 0),
            totalAmount: orderItems.reduce((sum, item) => {
                return sum + toNumber(item.Amount);
            }, 0),
        };
    }, [orderItems]);

    const discountAmt = toNumber(discount);
    const taxPercent = toNumber(tax);
    const taxAmt = ((totals.totalAmount - discountAmt) * taxPercent) / 100;
    const grandTotal = totals.totalAmount - discountAmt + taxAmt;

    const validateBeforeSave = () => {
        if (mode === 'VIEW') {
            Alert.alert('View Mode', 'You cannot save in view mode.');
            return false;
        }

        if (!party) {
            Alert.alert('Required', 'Please select party.');
            return false;
        }

        if (orderItems.length === 0) {
            Alert.alert('Required', 'Please add at least one item.');
            return false;
        }

        for (const item of orderItems) {
            if (toNumber(item.Qty) <= 0) {
                Alert.alert('Invalid Qty', `${item.ItmName} - ${item.ShdName}`);
                return false;
            }

            if (toNumber(item.Pcs) <= 0) {
                Alert.alert('Invalid Pcs', `${item.ItmName} - ${item.ShdName}`);
                return false;
            }

            if (toNumber(item.Rate) <= 0) {
                Alert.alert('Invalid Rate', `${item.ItmName} - ${item.ShdName}`);
                return false;
            }
        }

        return true;
    };

    const saveOrder = async () => {
        if (!validateBeforeSave()) return;

        try {
            setSaving(true);

            const payload = {
                Mode: mode,
                UId: uid,
                PrpCode: prpcode,
                StrCode: strcode,
                YearNo: yearno,
                ParCode: party.ParCode,
                ParName: party.ParName,
                GrossAmount: totals.totalAmount,
                DiscountAmount: discountAmt,
                TaxPercent: taxPercent,
                TaxAmount: taxAmt,
                NetAmount: grandTotal,
                Remark: remark,
                Items: orderItems,
            };

            const res = await axios.post(`${API_BASE_URL}/sales-order/save`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob',
                },
            });

            if (res.data.status === true) {
                Alert.alert(
                    'Success',
                    res.data.message || 'Sales order saved successfully',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.goBack(),
                        },
                    ],
                );
            } else {
                Alert.alert('Save Failed', res.data.message || 'Unable to save order');
            }
        } catch (error) {
            console.log('SAVE ORDER ERROR:', error?.response?.data || error.message);
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Something went wrong while saving',
            );
        } finally {
            setSaving(false);
        }
    };

    // const renderShade = shade => {
    //     return (
    //         <View style={styles.shadeRow}>
    //             <View style={styles.dot} />
    //             <Text style={styles.shadeName}>{shade.ShdName}</Text>
    //             <Text style={styles.shadeText}>{shade.Qty}</Text>
    //             <Text style={styles.shadeText}>{shade.Pcs}</Text>
    //             <Text style={styles.shadeText}>{money(shade.Rate)}</Text>
    //             <Text style={styles.amountText}>{money(shade.Amount)}</Text>
    //         </View>
    //     );
    // };

    const renderItem = ({ item, index }) => {
        return (
            <View style={styles.itemCard}>
                <View style={styles.itemTop}>
                    <View style={styles.itemNo}>
                        <Text style={styles.itemNoText}>{item.SrNo || index + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.ItmCode} - {item.ItmName}
                        </Text>

                        <Text style={styles.designText} numberOfLines={1}>
                            Design : {item.DsnCode} {item.DsnName ? `- ${item.DsnName}` : ''}
                        </Text>

                        <Text style={styles.designText} numberOfLines={1}>
                            Shade : {item.ShdCode} {item.ShdName ? `- ${item.ShdName}` : ''}
                        </Text>
                    </View>

                    {mode !== 'VIEW' && (
                        <TouchableOpacity onPress={() => removeItem(index)}>
                            <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.rowInfoBox}>
                    <View style={styles.rowInfoItem}>
                        <Text style={styles.rowInfoLabel}>Qty</Text>
                        <Text style={styles.rowInfoValue}>{item.Qty}</Text>
                    </View>

                    <View style={styles.rowInfoItem}>
                        <Text style={styles.rowInfoLabel}>Pcs</Text>
                        <Text style={styles.rowInfoValue}>{item.Pcs}</Text>
                    </View>

                    <View style={styles.rowInfoItem}>
                        <Text style={styles.rowInfoLabel}>Rate</Text>
                        <Text style={styles.rowInfoValue}>₹ {money(item.Rate)}</Text>
                    </View>

                    <View style={styles.rowAmountItem}>
                        <Text style={styles.rowInfoLabel}>Amount</Text>
                        <Text style={styles.rowAmount}>₹ {money(item.Amount)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loadingOrder) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.back}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Summary</Text>
                    <View style={{ width: 35 }} />
                </View>

                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#13879A" />
                    <Text style={styles.loadingText}>Loading sales order...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {mode === 'ADD'
                        ? 'New Sales Order'
                        : mode === 'VIEW'
                            ? 'View Sales Order'
                            : 'Modify Sales Order'}
                </Text>
                <View style={{ width: 35 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.orderInfoCard}>
                    <View>
                        <Text style={styles.orderNo}>
                            SO No : {headerData?.SONo || headerData?.OrderNo || 'New'}
                        </Text>
                        <Text style={styles.orderDate}>
                            SO Date : {headerData?.SODate || headerData?.OrderDate || '-'}
                        </Text>
                    </View>

                    <View style={styles.modeBadge}>
                        <Text style={styles.modeText}>{mode}</Text>
                    </View>
                </View>

                <View style={styles.partyCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.partyName}>{party?.ParName || '-'}</Text>
                        <Text style={styles.partySub}>
                            {party?.ParCode || '-'} | {party?.City || '-'}
                        </Text>
                    </View>

                    {mode === 'ADD' && (
                        <TouchableOpacity
                            style={styles.changeBtn}
                            onPress={() => navigation.navigate('PartyListScreen')}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.totalCard}>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>{totals.itemCount}</Text>
                        <Text style={styles.totalLabel}>Items</Text>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>{totals.totalPcs}</Text>
                        <Text style={styles.totalLabel}>Total Pcs</Text>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>₹ {money(totals.totalAmount)}</Text>
                        <Text style={styles.totalLabel}>Amount</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Items List</Text>

                {orderItems.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>No items added</Text>
                        <Text style={styles.emptySub}>
                            Tap Add Item to start creating sales order.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={orderItems}
                        keyExtractor={(item, index) =>
                            `${item.UId}_${item.SrNo}_${item.ItmCode}_${item.DsnCode}_${item.ShdCode}_${index}`
                        }
                        renderItem={renderItem}
                        scrollEnabled={false}
                    />
                )}

                <View style={styles.calculationCard}>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Discount ₹</Text>
                        <TextInput
                            value={discount}
                            onChangeText={setDiscount}
                            editable={mode !== 'VIEW'}
                            keyboardType="numeric"
                            style={styles.smallInput}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Tax %</Text>
                        <TextInput
                            value={tax}
                            onChangeText={setTax}
                            editable={mode !== 'VIEW'}
                            keyboardType="numeric"
                            style={styles.smallInput}
                        />
                    </View>

                    <View style={styles.grandRow}>
                        <Text style={styles.grandLabel}>Grand Total</Text>
                        <Text style={styles.grandAmount}>₹ {money(grandTotal)}</Text>
                    </View>

                    <TextInput
                        value={remark}
                        onChangeText={setRemark}
                        editable={mode !== 'VIEW'}
                        placeholder="Remark Optional"
                        placeholderTextColor="#98A2B3"
                        multiline
                        style={styles.remarkInput}
                    />
                </View>

                <View style={{ height: 90 }} />
            </ScrollView>

            {mode !== 'VIEW' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('SalesOrderItemList')}>
                        <Text style={styles.addBtnText}>＋ Add Item</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.fab}
                        onPress={() => navigation.navigate('SalesOrderItemList')}
                    >
                        <Icon name="add" size={30} color="#fff" />
                    </TouchableOpacity> */}

                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={saveOrder}
                        disabled={saving}>
                        <Text style={styles.saveBtnText}>
                            {saving ? 'Saving...' : mode === 'ADD' ? 'Save Order' : 'Update Order'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

export default OrderSummaryScreen;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f7fb' },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    back: { color: '#fff', fontSize: 34, width: 35 },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
    },
    container: { flex: 1, padding: 14 },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#667085',
        fontWeight: '700',
    },
    orderInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    orderNo: {
        color: '#101828',
        fontSize: 15,
        fontWeight: '900',
    },
    orderDate: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    modeBadge: {
        backgroundColor: '#E7F6F8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modeText: {
        color: '#13879A',
        fontSize: 11,
        fontWeight: '900',
    },
    partyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    partyName: { fontSize: 16, color: '#101828', fontWeight: '800' },
    partySub: { fontSize: 12, color: '#667085', marginTop: 4 },
    changeBtn: {
        backgroundColor: '#ecfdf3',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    changeText: { color: '#027a48', fontWeight: '700' },
    totalCard: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    totalBox: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#edf0f5',
    },
    totalValue: { fontSize: 15, color: '#13879A', fontWeight: '900' },
    totalLabel: { fontSize: 11, color: '#667085', marginTop: 4 },
    sectionTitle: {
        marginTop: 18,
        marginBottom: 8,
        color: '#101828',
        fontWeight: '900',
        fontSize: 15,
    },
    emptyBox: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#101828' },
    emptySub: { fontSize: 12, color: '#667085', marginTop: 6 },
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    itemTop: { flexDirection: 'row', alignItems: 'flex-start' },
    itemNo: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E7F6F8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    itemNoText: { color: '#13879A', fontWeight: '900' },
    itemName: { color: '#101828', fontWeight: '800', fontSize: 13 },
    designText: { color: '#667085', fontSize: 12, marginTop: 3 },
    deleteText: { color: '#dc2626', fontWeight: '700' },
    tableHeader: {
        marginTop: 12,
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    th: { flex: 1, color: '#667085', fontSize: 11, fontWeight: '800' },
    shadeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f5',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#13879A',
        marginRight: 8,
    },
    shadeName: { flex: 2, color: '#344054', fontSize: 12 },
    shadeText: { flex: 1, color: '#344054', fontSize: 12 },
    amountText: { flex: 1, color: '#101828', fontSize: 12, fontWeight: '800' },
    calculationCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        marginTop: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: { flex: 1, color: '#344054', fontWeight: '700' },
    smallInput: {
        width: 130,
        height: 42,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        borderRadius: 9,
        paddingHorizontal: 10,
        textAlign: 'right',
        color: '#101828',
        backgroundColor: '#fff',
    },
    grandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#edf0f5',
        paddingTop: 12,
        marginTop: 6,
    },
    grandLabel: { flex: 1, color: '#101828', fontWeight: '900', fontSize: 15 },
    grandAmount: { color: '#16a34a', fontWeight: '900', fontSize: 16 },
    remarkInput: {
        marginTop: 14,
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        borderRadius: 10,
        padding: 10,
        color: '#101828',
        textAlignVertical: 'top',
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 14,
        backgroundColor: '#fff',
        flexDirection: 'row',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#e4e7ef',
    },
    addBtn: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    addBtnText: { color: '#13879A', fontWeight: '900' },
    saveBtn: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '900' },
    rowInfoBox: {
        marginTop: 12,
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    rowInfoItem: {
        flex: 1,
        alignItems: 'center',
    },
    rowAmountItem: {
        flex: 1.4,
        alignItems: 'flex-end',
    },
    rowInfoLabel: {
        color: '#667085',
        fontSize: 11,
        fontWeight: '700',
    },
    rowInfoValue: {
        color: '#101828',
        fontSize: 13,
        fontWeight: '900',
        marginTop: 4,
    },
    rowAmount: {
        color: '#16A34A',
        fontSize: 14,
        fontWeight: '900',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 22,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
});