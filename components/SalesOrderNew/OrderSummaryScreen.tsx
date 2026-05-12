import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../../common/API/dynamicAPI';
import { useSalesOrder } from './SalesOrderContext';

const money = value => {
    return Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const num = v => {
    const n = parseFloat(String(v || 0).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

const createLineId = () =>
    `LINE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeRowKey = row =>
    `${row.ItmCode}_${row.DsnCode}_${row.ShdCode}`;

const reSrNo = rows =>
    rows.map((row, index) => ({
        ...row,
        SrNo: index + 1,
        LineId: row.LineId || createLineId(),
    }));

const normalizeRows = orderItems => {
    if (!Array.isArray(orderItems)) return [];

    const rows = [];

    orderItems.forEach(item => {
        if (Array.isArray(item.Shades)) {
            item.Shades.forEach(shade => {
                rows.push({
                    LineId: item.LineId || shade.LineId || createLineId(),
                    SrNo: rows.length + 1,

                    ItmCode: item.ItmCode,
                    ItmName: item.ItmName,
                    MItmCode: item.MItmCode || item.ItmCode,

                    DsnCode: item.DsnCode,
                    DsnName: item.DsnName || '',

                    ShdCode: shade.ShdCode,
                    ShdName: shade.ShdName,

                    Qty: num(shade.Qty),
                    Pcs: num(shade.Pcs),
                    Rate: num(shade.Rate),
                    Amount: num(shade.Amount),
                    Remark: shade.Remark || '',
                });
            });
        } else if (item.ItmCode && item.DsnCode && item.ShdCode) {
            rows.push({
                ...item,
                LineId: item.LineId || createLineId(),
                SrNo: rows.length + 1,
                Qty: num(item.Qty),
                Pcs: num(item.Pcs),
                Rate: num(item.Rate),
                Amount: num(item.Amount),
            });
        }
    });

    return rows;
};

const OrderSummaryScreen = ({ navigation, route }) => {
    const salesOrder = useSalesOrder();

    const {
        mode: contextMode = 'ADD',
        uid: contextUid = 0,
        party: contextParty = null,
        orderItems: contextItems = [],
        headerData = {},
        clearOrder,
    } = salesOrder || {};

    const {
        mode: routeMode,
        uid: routeUid,
        party: routeParty,
        partyData,
        selectedParty,
        prpcode = '',
        strcode = '012',
        yearno = '',
        token = '',
    } = route?.params || {};

    const mode = routeMode || contextMode || 'ADD';
    const uid = routeUid || contextUid || 0;

    const party =
        routeParty ||
        partyData ||
        selectedParty ||
        contextParty ||
        headerData?.Party ||
        headerData?.party ||
        null;

    const [rows, setRows] = useState(() => reSrNo(normalizeRows(contextItems)));

    const [discount, setDiscount] = useState(
        String(headerData?.DiscountAmount || '0'),
    );
    const [tax, setTax] = useState(String(headerData?.TaxPercent || '0'));
    const [remark, setRemark] = useState(headerData?.Remark || '');
    const [saving, setSaving] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [soDate, setSoDate] = useState('');
    const [soNo, setSoNo] = useState('');
    const [rawMain, setRawMain] = useState(null);
    const [rawTax, setRawTax] = useState([]);
    const [rawExp, setRawExp] = useState(null);
    const [rawExtra, setRawExtra] = useState({});
    const toNumber = value => {
        const n = Number(value || 0);
        return isNaN(n) ? 0 : n;
    };

    useFocusEffect(
        useCallback(() => {
            const p = route?.params || {};

            if (!Array.isArray(p.completedRows)) return;

            setRows(prev => {
                let next = [...prev];

                // ==================================================
                // EDIT MODE
                // ==================================================
                // During edit we receive FULL updated rows
                // so replace everything safely
                // ==================================================

                if (p.editMode) {
                    next = reSrNo(
                        (p.completedRows || []).map(row => ({
                            ...row,
                            LineId: row.LineId || createLineId(),
                        })),
                    );
                }

                // ==================================================
                // ADD MODE
                // ==================================================
                // During add we receive ONLY new rows
                // so append/merge with old rows
                // ==================================================

                else {
                    (p.completedRows || []).forEach(rawRow => {
                        const newRow = {
                            ...rawRow,
                            LineId: rawRow.LineId || createLineId(),
                        };

                        // prevent duplicate same LineId
                        const lineExists = next.findIndex(
                            x => String(x.LineId) === String(newRow.LineId),
                        );

                        if (lineExists >= 0) {
                            next[lineExists] = {
                                ...newRow,
                            };

                            return;
                        }

                        // merge same item/design/shade
                        const existsIndex = next.findIndex(
                            oldRow =>
                                makeRowKey(oldRow) === makeRowKey(newRow),
                        );

                        if (existsIndex >= 0) {
                            const newQty =
                                num(next[existsIndex].Qty) +
                                num(newRow.Qty);

                            const newPcs =
                                num(next[existsIndex].Pcs) +
                                num(newRow.Pcs);

                            next[existsIndex] = {
                                ...next[existsIndex],
                                Qty: newQty,
                                Pcs: newPcs,
                                Rate: num(newRow.Rate),
                                Amount: newQty * num(newRow.Rate),
                                Remark:
                                    newRow.Remark ||
                                    next[existsIndex].Remark ||
                                    '',
                            };
                        } else {
                            next.push(newRow);
                        }
                    });

                    next = reSrNo(next);
                }

                return next;
            });

            navigation.setParams({
                completedRows: undefined,
                completedRow: undefined,
                editMode: undefined,
                editIndex: undefined,
                editLineId: undefined,
                oldRow: undefined,
                originalKey: undefined,
            });
        }, [route?.params, navigation]),
    );

    // const totals = useMemo(() => {
    //     return {
    //         itemCount: rows.length,
    //         shadeCount: rows.length,
    //         totalQty: rows.reduce((s, x) => s + num(x.Qty), 0),
    //         totalPcs: rows.reduce((s, x) => s + num(x.Pcs), 0),
    //         totalAmount: rows.reduce((s, x) => s + num(x.Amount), 0),
    //     };
    // }, [rows]);

    const totals = useMemo(() => {
        const totalQty = rows.reduce(
            (s, x) => s + num(x.Qty),
            0,
        );
        const totalPcs = rows.reduce(
            (s, x) => s + num(x.Pcs),
            0,
        );
        const totalAmount = rows.reduce(
            (s, x) => s + num(x.Amount),
            0,
        );
        return {
            itemCount: rows.length,
            shadeCount: rows.length,
            totalQty: totalQty.toFixed(3),
            totalPcs,
            totalAmount: totalAmount.toFixed(2),
        };

    }, [rows]);

    const discountAmt = num(discount);
    const taxPercent = num(tax);
    const taxableAmount = totals.totalAmount - discountAmt;
    const taxAmt = (taxableAmount * taxPercent) / 100;
    const grandTotal = taxableAmount + taxAmt;
    const fmt = (value, dec = 2) => num(value).toFixed(dec);

    const addItem = () => {
        navigation.navigate('SalesOrderItemList', {
            editMode: false,
            editIndex: null,
            editLineId: null,
            oldRow: null,

            // IMPORTANT: send current rows also
            workingRows: rows,

            party,
            partyData: party,
            selectedParty: party,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const editRow = row => {
        navigation.navigate('SalesOrderItemList', {
            editMode: true,
            editIndex: rows.findIndex(x => x.LineId === row.LineId),
            editLineId: row.LineId,
            oldRow: row,

            // IMPORTANT: send full current order rows
            workingRows: rows,

            party,
            partyData: party,
            selectedParty: party,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const removeRow = row => {
        Alert.alert('Delete Row', 'Are you sure you want to delete this shade?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setRows(prev =>
                        reSrNo(prev.filter(x => String(x.LineId) !== String(row.LineId))),
                    );
                },
            },
        ]);
    };

    const validateBeforeSave = () => {
        if (!party?.ParCode) {
            Alert.alert('Required', 'Please select party.');
            return false;
        }

        if (rows.length === 0) {
            Alert.alert('Required', 'Please add at least one item.');
            return false;
        }

        for (const row of rows) {
            if (!row.ItmCode || !row.DsnCode || !row.ShdCode) {
                Alert.alert('Invalid Row', 'Item/design/shade missing.');
                return false;
            }

            if (num(row.Qty) <= 0) {
                Alert.alert('Invalid Qty', `${row.ItmName} - ${row.ShdName}`);
                return false;
            }

            if (num(row.Rate) <= 0) {
                Alert.alert('Invalid Rate', `${row.ItmName} - ${row.ShdName}`);
                return false;
            }
        }

        return true;
    };

    useEffect(() => {
        if ((mode === 'EDIT' || mode === 'VIEW') && Number(uid) > 0) {
            loadOrderFromBackend();
        }

    }, [mode, uid]);

    const convertD1ToOrderItems = d1Rows => {
        return (d1Rows || []).map((row, index) => ({
            LineId: `DB_${row.UId}_${row.SrNo || index + 1}`,

            SrNo: Number(row.SrNo || index + 1),
            UId: row.UId,
            StrCode: row.StrCode,

            ItmCode: String(row.ItmCode || ''),
            ItmName: row.ItmName || '',
            MItmCode: row.MItmCode || row.ItmCode || '',

            DsnCode: String(row.DsnCode || ''),
            DsnName: row.DsnName || '',

            ShdCode: String(row.ShdCode || ''),
            ShdName: row.ShdName || '',

            Qty: num(row.Qty),
            Pcs: num(row.QtyPcs),
            Rate: num(row.UnitRate),
            Amount: num(row.Amount),

            UOM: row.UOM || '',
            Denier: row.Denier || '',
            HsnCode: row.HsnCode || '',
            HSNName: row.HSNName || '',

            Remark:
                row.Remark1 ||
                row.Remark ||
                '',

            Raw: row,
        }));
    };

    const loadOrderFromBackend = async () => {
        try {
            if (!uid) return;

            setLoadingOrder(true);

            const res = await axios.get(`${API}/api/mobappshow`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob',
                },
                params: {
                    uid,
                    prpcode,
                    strcode,
                    yearno,
                    mode,
                },
            });

            console.log('mobappshow res =>', res?.data);

            const data =
                res?.data?.response ||
                res?.data?.data ||
                res?.data ||
                {};

            const main = Array.isArray(data?.main)
                ? data.main[0] || {}
                : data?.main || {};

            const d1 = Array.isArray(data?.d1)
                ? data.d1
                : [];

            if (!main?.UId) {
                Alert.alert('Error', 'Sales order not found');
                return;
            }

            // keep full backend raw data for edit save
            setRawMain(main);
            setRawTax(Array.isArray(data?.tax) ? data.tax : []);
            setRawExp(Array.isArray(data?.exp) ? data.exp[0] || null : data?.exp || null);

            setRawExtra({
                taxacc: data?.taxacc || [],
                crlimit: data?.crlimit || [],
                prpdetail: data?.prpdetail || [],
                lockdata: data?.lockdata || null,
                modulerights: data?.modulerights || [],
                defshdcode: data?.defshdcode || '',
            });

            const convertedRows = convertD1ToOrderItems(d1);
            setRows(reSrNo(convertedRows));

            setDiscount(String(num(main.DisAmt || main.TDisAmt || main.NDisAmt || 0)));
            setTax(String(num(main.TaxPercent || main.TaxPer || 0)));
            setRemark(main.Remark || '');
            setSoDate(main.SODate || '');
            setSoNo(main.SONo || '');

            const loadedParty = {
                ParCode: main.ParCode || '',
                ParName: main.ParName || '',
                SExe: main.SExe || '',
                SExeName: main.SExeName || '',
                City: main.city || main.DCity || main.Station || '',
                Address: main.address || main.DAdd || '',
            };

            navigation.setParams({
                party: loadedParty,
                partyData: loadedParty,
                selectedParty: loadedParty,
            });
        } catch (error) {
            console.log('LOAD SO ERROR =>', error?.response?.data || error);

            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to load sales order',
            );
        } finally {
            setLoadingOrder(false);
        }
    };

    const buildMainPayload = () => {
        const base = uid > 0 && rawMain ? { ...rawMain } : {};
        const yno = yearno ? yearno.slice(-2) : '';
        return {
            ...base,

            UId: uid || base.UId || 0,
            Mode: mode,

            PrpCode: prpcode || base.PrpCode || '',
            StrCode: strcode || base.StrCode || '012',
            YearNo: yno || base.YearNo || '',

            ParCode: party?.ParCode || base.ParCode || '',
            ParName: party?.ParName || base.ParName || '',

            SExe: party?.SExe || base.SExe || '',
            SExeName: party?.SExeName || base.SExeName || '',

            GrsAmt: fmt(totals.totalAmount),
            DisAmt: fmt(discountAmt),
            NDisAmt: fmt(discountAmt),
            TDisAmt: fmt(discountAmt),

            TaxAmt: fmt(taxAmt),
            NTaxAmt: fmt(taxAmt),
            TTaxAmt: fmt(taxAmt),
            GSTAmt: fmt(taxAmt),

            NetAmt: fmt(grandTotal),
            D1NetAmt: base.D1NetAmt || '.00',

            Remark: remark || '',

            DAdd: party?.Address || base.DAdd || '',
            DCity: party?.City || base.DCity || '',
            Station: party?.City || base.Station || '',

            Status: base.Status || 'P',
            EntType: base.EntType || 'G2',
            TaxStru: base.TaxStru || '123',

            SONo: uid > 0 ? base.SONo : '',
            SODate: uid > 0 ? base.SODate : '',
            DueDay: base.DueDay || '',
            DueDate: base.DueDate || '',
        };
    };

    const buildD1Payload = () => {
        return reSrNo(rows).map((row, index) => {
            const raw = row.Raw || {};

            return {
                ...raw,

                UId: uid || raw.UId || 0,
                SrNo: index + 1,
                StrCode: row.StrCode || raw.StrCode || strcode || '012',

                ItmCode: row.ItmCode || '',
                MItmCode: row.MItmCode || raw.MItmCode || row.ItmCode || '',
                ItmName: row.ItmName || raw.ItmName || '',

                DsnCode: row.DsnCode || '',
                DsnName: row.DsnName || raw.DsnName || '',

                ShdCode: row.ShdCode || '',
                ShdName: row.ShdName || raw.ShdName || '',

                Denier: row.Denier || '',
                UOM: row.UOM || raw.UOM || '',

                Qty: fmt(row.Qty, 3),
                QtyPcs: String(num(row.Pcs)),
                UnitRate: fmt(row.Rate, 5),
                Amount: fmt(row.Amount),

                Remark1: row.Remark || raw.Remark1 || '',
                Remark2: raw.Remark2 || '',
                Remark3: raw.Remark3 || '',
                Remark4: raw.Remark4 || '',
                Remark5: raw.Remark5 || '',

                PkgQty: raw.PkgQty || '1.000',
                PkgRate: raw.PkgRate || '.00000',
                AmtCalc: raw.AmtCalc || 'U',

                MerCode: raw.MerCode || '0',
                GrdCode: raw.GrdCode || '0',

                DisPer: raw.DisPer || '.00',
                DisAmt: raw.DisAmt || '.00',

                CGSTPer: raw.CGSTPer || '.00',
                CGSTAmt: raw.CGSTAmt || '.00',
                SGSTPer: raw.SGSTPer || '.00',
                SGSTAmt: raw.SGSTAmt || '.00',
                IGSTPer: raw.IGSTPer || '.00',
                IGSTAmt: raw.IGSTAmt || '.00',

                D1NetAmt: raw.D1NetAmt || '.00',
                HsnCode: row.HsnCode || raw.HsnCode || '',
                HSNName: row.HSNName || raw.HSNName || '',
            };
        });
    };

    const buildTaxPayload = () => {
        if (uid > 0 && Array.isArray(rawTax)) {
            return rawTax.map(t => ({ ...t }));
        }

        return [];
    };

    const buildExpPayload = () => {
        if (uid > 0 && rawExp) {
            return { ...rawExp };
        }

        return {};
    };
    const saveOrder = async () => {
        if (!validateBeforeSave()) return;

        try {
            setSaving(true);
            const payload = {
                Mode: mode,
                UId: uid || 0,
                main: buildMainPayload(),
                d1: buildD1Payload(),
                tax: buildTaxPayload(),
                exp: buildExpPayload(),
                extra: rawExtra,
            };

            // const payload = {
            //     Mode: mode,
            //     UId: uid,

            //     PrpCode: prpcode,
            //     StrCode: strcode,
            //     YearNo: yearno,

            //     ParCode: party.ParCode,
            //     ParName: party.ParName,

            //     GrossAmount: totals.totalAmount,
            //     DiscountAmount: discountAmt,
            //     TaxPercent: taxPercent,

            //     TaxAmount: taxAmt,
            //     NetAmount: grandTotal,
            //     Remark: remark,

            //     Rows: reSrNo(rows),
            // };

            console.log("save payload", payload);

            const res = await axios.post(`${API}/api/mobappsave`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-platform': 'mob',
                },
            });

            console.log("Save response..", res);

            if (res.data?.status === true) {
                if (typeof clearOrder === 'function') {
                    clearOrder();
                }

                navigation.navigate('SalesOrderSaveSuccess', {
                    orderNo: res.data?.order_no || res.data?.OrderNo,
                    dateTime: res.data?.date_time,
                });
            } else {
                Alert.alert('Save Failed', res.data?.message || 'Unable to save order');
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

    const renderRow = ({ item, index }) => {
        return (
            <View style={styles.itemCard}>
                <View style={styles.singleRowTop}>
                    <View style={styles.itemNo}>
                        <Text style={styles.itemNoText}>{index + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                            {item.ItmCode} - {item.ItmName}
                        </Text>

                        <Text style={styles.designText}>
                            Design : {item.DsnCode} - {item.DsnName || '-'}
                        </Text>

                        <Text style={styles.designText}>
                            Shade : {item.ShdCode} - {item.ShdName || '-'}
                        </Text>

                        {!!item.Remark && (
                            <Text style={styles.remarkText}>
                                Remark : {item.Remark}
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => {
                            Alert.alert('Row Action', 'Choose action', [
                                {
                                    text: 'Edit',
                                    onPress: () => editRow(item),
                                },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => removeRow(item),
                                },
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                },
                            ]);
                        }}>
                        <Icon name="more-vert" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                <View style={styles.singleRowBottom}>
                    <View style={styles.singleCell}>
                        <Text style={styles.cellLabel}>Qty</Text>
                        <Text style={styles.cellValue}>{item.Qty}</Text>
                    </View>

                    <View style={styles.singleCell}>
                        <Text style={styles.cellLabel}>Pcs</Text>
                        <Text style={styles.cellValue}>{item.Pcs}</Text>
                    </View>

                    <View style={styles.singleCell}>
                        <Text style={styles.cellLabel}>Rate</Text>
                        <Text style={styles.cellValue}>₹ {money(item.Rate)}</Text>
                    </View>

                    <View style={styles.singleCell}>
                        <Text style={styles.cellLabel}>Amount</Text>
                        <Text style={styles.amountValue}>₹ {money(item.Amount)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    {mode === 'EDIT' || uid > 0
                        ? 'Modify Sales Order'
                        : 'New Sales Order'}
                </Text>

                <View style={{ width: 22 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.orderInfoCard}>
                    <View>
                        <Text style={styles.orderNo}>
                            SO No : {headerData?.SONo || soNo || 'New'}
                        </Text>
                        <Text style={styles.orderDate}>
                            SO Date : {headerData?.SODate || soDate || '-'}
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
                        <Text style={styles.partySub}>
                            {party?.SExeName || '-'}
                        </Text>
                    </View>

                    {mode !== 'EDIT' && uid <= 0 && (
                        <TouchableOpacity
                            style={styles.changeBtn}
                            onPress={() => navigation.navigate('SalesOrderPartyList')}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.modeCard}>
                    <Text style={styles.modeText}>
                        Mode:{' '}
                        {mode === 'EDIT' || uid > 0
                            ? 'Modify Saved Order'
                            : 'New Order'}
                    </Text>
                    <Text style={styles.modeText}>UId: {uid || 0}</Text>
                </View>

                <View style={styles.totalCard}>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>{totals.itemCount}</Text>
                        <Text style={styles.totalLabel}>Rows</Text>
                    </View>

                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>{totals.totalQty}</Text>
                        <Text style={styles.totalLabel}>Qty</Text>
                    </View>

                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>{totals.totalPcs}</Text>
                        <Text style={styles.totalLabel}>Pcs</Text>
                    </View>

                    <View style={styles.totalBox}>
                        <Text style={styles.totalValue}>₹ {money(totals.totalAmount)}</Text>
                        <Text style={styles.totalLabel}>Amount</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Items / Design / Shade Rows</Text>

                {rows.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Icon name="inventory-2" size={44} color="#98A2B3" />
                        <Text style={styles.emptyTitle}>No items added</Text>
                        <Text style={styles.emptySub}>
                            Tap Add Item to start creating sales order.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={rows}
                        keyExtractor={(item, index) =>
                            `${item.LineId}_${index}`
                        }
                        renderItem={renderRow}
                        scrollEnabled={false}
                    />
                )}

                <View style={styles.calculationCard}>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Gross Amount</Text>
                        <Text style={styles.staticAmount}>₹ {money(totals.totalAmount)}</Text>
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Discount ₹</Text>
                        <TextInput
                            value={discount}
                            onChangeText={setDiscount}
                            keyboardType="numeric"
                            style={styles.smallInput}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Tax %</Text>
                        <TextInput
                            value={tax}
                            onChangeText={setTax}
                            keyboardType="numeric"
                            style={styles.smallInput}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Tax Amount</Text>
                        <Text style={styles.staticAmount}>₹ {money(taxAmt)}</Text>
                    </View>

                    <View style={styles.grandRow}>
                        <Text style={styles.grandLabel}>Net Amount</Text>
                        <Text style={styles.grandAmount}>₹ {money(grandTotal)}</Text>
                    </View>

                    <TextInput
                        value={remark}
                        onChangeText={setRemark}
                        placeholder="Remark Optional"
                        placeholderTextColor="#98A2B3"
                        multiline
                        style={styles.remarkInput}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                    <Text style={styles.addBtnText}>＋ Add Item</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    // onPress={saveOrder}
                    // disabled={saving}
                    disabled={true}
                >
                    <Text style={styles.saveBtnText}>
                        {saving
                            ? 'Saving...'
                            : mode === 'EDIT' || uid > 0
                                ? 'Update Order'
                                : 'Save Order'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default OrderSummaryScreen;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F7FB' },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
    container: { flex: 1, padding: 14 },
    partyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
    partyName: { fontSize: 16, color: '#000', fontWeight: '900' },
    partySub: { fontSize: 12, color: '#000', marginTop: 4 },
    changeBtn: {
        backgroundColor: '#E7F6F8',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    changeText: { color: '#13879A', fontWeight: '900' },
    modeCard: {
        backgroundColor: '#fff',
        marginTop: 10,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modeText: {
        color: '#475467',
        fontSize: 12,
        fontWeight: '800',
    },
    totalCard: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
    totalBox: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#EDF0F5',
    },
    totalValue: { fontSize: 13, color: '#13879A', fontWeight: '900' },
    totalLabel: { fontSize: 10, color: '#000', marginTop: 4 },
    sectionTitle: {
        marginTop: 18,
        marginBottom: 8,
        color: '#000',
        fontWeight: '900',
        fontSize: 15,
    },
    emptyBox: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        marginTop: 8,
    },
    emptySub: { fontSize: 12, color: '#000', marginTop: 6 },
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
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
    itemName: { color: '#000', fontWeight: '900', fontSize: 13 },
    designText: {
        color: '#000',
        fontSize: 12,
        marginTop: 3,
        fontWeight: '700',
    },
    calculationCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        marginTop: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: { flex: 1, color: '#000', fontWeight: '800' },
    smallInput: {
        width: 130,
        height: 42,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        borderRadius: 9,
        paddingHorizontal: 10,
        textAlign: 'right',
        color: '#000',
        backgroundColor: '#fff',
    },
    staticAmount: {
        color: '#000',
        fontWeight: '900',
    },
    grandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EDF0F5',
        paddingTop: 12,
        marginTop: 6,
    },
    grandLabel: {
        flex: 1,
        color: '#000',
        fontWeight: '900',
        fontSize: 15,
    },
    grandAmount: {
        color: '#16A34A',
        fontWeight: '900',
        fontSize: 16,
    },
    remarkInput: {
        marginTop: 14,
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        borderRadius: 10,
        padding: 10,
        color: '#000',
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
        borderTopColor: '#E4E7EF',
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
    singleRowTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    singleRowBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EDF0F5',
        paddingTop: 12,
    },
    singleCell: {
        flex: 1,
        alignItems: 'center',
    },
    cellLabel: {
        color: '#000',
        fontSize: 10,
        fontWeight: '800',
    },
    cellValue: {
        color: '#000',
        fontSize: 13,
        fontWeight: '900',
        marginTop: 4,
    },
    amountValue: {
        color: '#16A34A',
        fontSize: 13,
        fontWeight: '900',
        marginTop: 4,
    },
    menuBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    remarkText: {
        color: '#000',
        fontSize: 11,
        marginTop: 5,
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
});