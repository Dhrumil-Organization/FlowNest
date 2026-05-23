import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
    Modal
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../../common/API/dynamicAPI';
import { useSalesOrder } from './SalesOrderContext';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    `${row.ItmCode}_${row.GrdCode}_${row.ShdCode}`;

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
                    Denier: item.Denier || '',
                    HsnCode: item.HsnCode || '',

                    GrdCode: item.GrdCode,
                    GrdName: item.GrdName || '',

                    ShdCode: shade.ShdCode,
                    ShdName: shade.ShdName,

                    Qty: num(shade.Qty),
                    Pcs: num(shade.Pcs),
                    Rate: num(shade.Rate),
                    Amount: num(shade.Amount),
                    Remark: shade.Remark || '',
                });
            });
        } else if (item.ItmCode && item.GrdCode && item.ShdCode) {
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

const SkeletonBox = ({ width = "100%", height = 16, radius = 8, style }) => {
    return (
        <View
            style={[
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor: "#E4E7EF",
                },
                style,
            ]}
        />
    );
};

const OrderSummarySkeleton = () => {
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <SkeletonBox width={24} height={20} />
                <SkeletonBox width={160} height={18} style={{ marginLeft: 50 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.orderInfoCard}>
                    <View>
                        <SkeletonBox width={150} height={18} />
                        <SkeletonBox width={120} height={14} style={{ marginTop: 10 }} />
                    </View>
                    <SkeletonBox width={70} height={28} radius={20} />
                </View>

                <View style={styles.partyCard}>
                    <View style={{ flex: 1 }}>
                        <SkeletonBox width="75%" height={18} />
                        <SkeletonBox width="55%" height={14} style={{ marginTop: 10 }} />
                        <SkeletonBox width="40%" height={14} style={{ marginTop: 10 }} />
                    </View>
                </View>

                <View style={styles.modeCard}>
                    <SkeletonBox width={130} height={14} />
                    <SkeletonBox width={80} height={14} />
                </View>

                <View style={styles.totalCard}>
                    {[1, 2, 3, 4].map(i => (
                        <View key={i} style={styles.totalBox}>
                            <SkeletonBox width={45} height={16} />
                            <SkeletonBox width={35} height={10} style={{ marginTop: 8 }} />
                        </View>
                    ))}
                </View>

                <SkeletonBox width={190} height={18} style={{ marginTop: 22, marginBottom: 12 }} />

                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.itemCard}>
                        <View style={styles.singleRowTop}>
                            <SkeletonBox width={28} height={28} radius={14} style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <SkeletonBox width="85%" height={16} />
                                <SkeletonBox width="65%" height={13} style={{ marginTop: 8 }} />
                                <SkeletonBox width="55%" height={13} style={{ marginTop: 8 }} />
                            </View>
                        </View>

                        <View style={styles.singleRowBottom}>
                            {[1, 2, 3, 4].map(j => (
                                <View key={j} style={styles.singleCell}>
                                    <SkeletonBox width={34} height={10} />
                                    <SkeletonBox width={50} height={14} style={{ marginTop: 8 }} />
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                <View style={styles.calculationCard}>
                    {[1, 2, 3, 4].map(i => (
                        <View key={i} style={styles.inputRow}>
                            <SkeletonBox width={120} height={16} />
                            <SkeletonBox width={130} height={42} radius={9} />
                        </View>
                    ))}
                    <SkeletonBox width="100%" height={80} radius={10} style={{ marginTop: 14 }} />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
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
        skipReload = false,
        party: routeParty,
        partyData,
        selectedParty,
        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
        soNo: routeSoNo = '',
        soDate: routeSoDate = '',
    } = route?.params || {};

    const initialMode = routeMode || contextMode || 'ADD';
    const initialUid = routeUid || contextUid || 0;

    const [screenMode, setScreenMode] = useState(initialMode);
    const [screenUid, setScreenUid] = useState(initialUid);

    const mode = screenMode;
    const uid = screenUid;

    const [isViewMode, setIsViewMode] = useState(mode === "VIEW");
    const [autoLocked, setAutoLocked] = useState(0);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
    const hasLoadedOrderRef = useRef(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [detailVisible, setDetailVisible] = useState(false);
    const [addressListVisible, setAddressListVisible] = useState(false);
    const [AddressList, setAdedressList] = useState([]);

    // const party =
    //     routeParty ||
    //     partyData ||
    //     selectedParty ||
    //     contextParty ||
    //     headerData?.Party ||
    //     headerData?.party ||
    //     null;
    const initialParty =
        routeParty ||
        partyData ||
        selectedParty ||
        contextParty ||
        headerData?.Party ||
        headerData?.party ||
        null;

    const [currentParty, setCurrentParty] = useState(initialParty);

    useEffect(() => {
        if (route?.params?.selectedTempParty) {
            setCurrentParty(route.params.selectedTempParty);

            if (Array.isArray(route?.params?.preservedRows)) {
                setRows(reSrNo(route.params.preservedRows));
            }

            navigation.setParams({
                selectedTempParty: undefined,
                preservedRows: undefined,
            });
        }
    }, [route?.params?.selectedTempParty]);

    const [rows, setRows] = useState(() => reSrNo(normalizeRows(contextItems)));

    const [discount, setDiscount] = useState(
        String(headerData?.DiscountAmount || '0'),
    );
    const [ddays, setDdays] = useState(
        String(headerData?.DDays || '0'),
    );
    // const [ddate, setDdate] = useState(
    //     String(headerData?.DDays || '0'),
    // );
    const [ddate, setDdate] = useState(
        String(headerData?.DDate || ''),
    );
    const [DueDate, setDueDate] = useState(
        String(headerData?.DueDate || ''),
    );

    const [tax, setTax] = useState(String(headerData?.TaxPercent || '0'));
    const [remark, setRemark] = useState(headerData?.Remark || '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [soDate, setSoDate] = useState(routeSoDate || headerData?.SODate || '');
    const [soNo, setSoNo] = useState(routeSoNo || headerData?.SONo || '');
    const [rawMain, setRawMain] = useState(null);
    const [rawTax, setRawTax] = useState([]);
    const [rawExp, setRawExp] = useState(null);
    const [rawExtra, setRawExtra] = useState({});
    const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

    console.log("soNo", soNo);

    console.log("autoLocked", autoLocked);

    useEffect(() => {
        if (skipReload) {
            hasLoadedOrderRef.current = true;
            return;
        }

        if (hasLoadedOrderRef.current) {
            return;
        }

        if ((mode === 'EDIT' || mode === 'VIEW') && Number(uid) > 0) {
            hasLoadedOrderRef.current = true;
            loadOrderFromBackend();
        }
    }, [mode, uid, skipReload]);

    useEffect(() => {
        const p = route?.params || {};

        // =========================================
        // TEMP PARTY REPLACEMENT
        // DO NOT CHANGE MODE TO ADD
        // =========================================

        if (p.replaceTempPartyDone === true) {

            setScreenMode(
                p.screenMode || p.mode || 'EDIT'
            );

            setScreenUid(
                Number(
                    p.uid ||
                    screenUid ||
                    uid ||
                    0
                )
            );

            navigation.setParams({
                replaceTempPartyDone: undefined,
            });

            return;
        }

        // =========================================
        // NORMAL FLOW
        // =========================================

        const nextUid = Number(
            p.uid ||
            p.completedRow?.UId ||
            p.completedRows?.[0]?.UId ||
            screenUid ||
            0
        );

        const nextMode =
            nextUid > 0 ||
                p.mode === 'EDIT' ||
                screenMode === 'EDIT'
                ? 'EDIT'
                : p.mode || screenMode || 'ADD';

        if (nextMode !== screenMode) {
            setScreenMode(nextMode);
        }

        if (nextUid !== Number(screenUid || 0)) {
            setScreenUid(nextUid);
        }

    }, [route?.params]);

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
                replaceItemOnlyDone: undefined,
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
        const stableUid = Number(uid || route?.params?.uid || rawMain?.UId || 0);
        const stableMode = stableUid > 0 || mode === 'EDIT' ? 'EDIT' : 'ADD';

        navigation.navigate('SalesOrderItemList', {
            mode: stableMode,
            uid: stableUid,
            soNo,
            soDate,
            editMode: false,
            editIndex: null,
            editLineId: null,
            oldRow: null,
            workingRows: rows,

            party: currentParty,
            partyData: currentParty,
            selectedParty: currentParty,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const editRow = row => {
        const stableUid = Number(uid || row?.UId || route?.params?.uid || rawMain?.UId || 0);
        const stableMode = stableUid > 0 || mode === 'EDIT' ? 'EDIT' : 'ADD';

        navigation.navigate('SalesOrderItemList', {
            mode: stableMode,
            uid: stableUid,
            soNo,
            soDate,
            editMode: true,
            editIndex: rows.findIndex(x => x.LineId === row.LineId),
            editLineId: row.LineId,
            oldRow: row,
            workingRows: rows,

            party: currentParty,
            partyData: currentParty,
            selectedParty: currentParty,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };


    const handleEditItem = row => {
        const stableUid = Number(uid || row?.UId || route?.params?.uid || rawMain?.UId || 0);
        const stableMode = stableUid > 0 || mode === 'EDIT' ? 'EDIT' : 'ADD';
        // const isCustomItem = row?.ItmCode == '-1';
        navigation.navigate('SalesOrderItemList', {
            mode: stableMode,
            uid: stableUid,
            soNo,
            soDate,
            editMode: true,
            editIndex: rows.findIndex(x => x.LineId === row.LineId),
            editLineId: row.LineId,
            oldRow: row,
            workingRows: rows,
            isCustomItemEdit: true,
            party: currentParty,
            partyData: currentParty,
            selectedParty: currentParty,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const handleEditgrade = row => {
        const stableUid = Number(
            uid || row?.UId || route?.params?.uid || rawMain?.UId || 0
        );

        const stableMode =
            stableUid > 0 || mode === 'EDIT'
                ? 'EDIT'
                : 'ADD';

        // const isCustomItem = row?.ItmCode == '-1';

        navigation.navigate('SalesOrderGradeList', {
            mode: stableMode,
            uid: stableUid,
            soNo,
            soDate,

            editMode: true,

            editIndex: rows.findIndex(
                x => x.LineId === row.LineId
            ),

            editLineId: row.LineId,

            oldRow: row,

            // =========================
            // IMPORTANT
            // =========================
            selectedItem: {
                ItmCode: row.ItmCode,
                ItmName: row.ItmName,
                MItmCode: row.MItmCode || row.ItmCode,
                UOM: row.UOM || '',
                Denier: row.Denier || '',
                HsnCode: row.HsnCode || '',
                Raw: row,
            },

            workingRows: rows,

            isCustomGradeEdit: true,

            party: currentParty,
            partyData: currentParty,
            selectedParty: currentParty,

            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const handleEditShade = row => {
        const stableUid = Number(
            uid || row?.UId || route?.params?.uid || rawMain?.UId || 0
        );

        const stableMode =
            stableUid > 0 || mode === 'EDIT'
                ? 'EDIT'
                : 'ADD';

        // const isCustomItem = row?.ItmCode == '-1';

        navigation.navigate('SalesOrderShadeList', {
            mode: stableMode,
            uid: stableUid,
            soNo,
            soDate,

            editMode: true,

            editIndex: rows.findIndex(
                x => x.LineId === row.LineId
            ),

            editLineId: row.LineId,

            oldRow: row,

            // =================================
            // IMPORTANT
            // =================================
            selectedItem: {
                ItmCode: row.ItmCode,
                ItmName: row.ItmName,
                MItmCode: row.MItmCode || row.ItmCode,
                UOM: row.UOM || '',
                Denier: row.Denier || '',
                HsnCode: row.HsnCode || '',
                Raw: row,
            },

            selectedGrade: {
                GrdCode: row.GrdCode,
                GrdName: row.GrdName,
                Raw: row,
            },

            workingRows: rows,

            isCustomShadeEdit: true,

            party: currentParty,
            partyData: currentParty,
            selectedParty: currentParty,

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
        if (!currentParty?.ParCode) {
            Alert.alert('Required', 'Please select party.');
            return false;
        }

        if (!ddays || ddays == '0') {
            Alert.alert('Required', 'Delivery Days cannot be blank.');
            return false;
        }

        if (rows.length === 0) {
            Alert.alert('Required', 'Please add at least one item.');
            return false;
        }


        for (const row of rows) {
            if (!row.ItmCode || !row.GrdCode || !row.ShdCode) {
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

    const convertD1ToOrderItems = d1Rows => {
        return (d1Rows || []).map((row, index) => ({
            LineId: `DB_${row.UId}_${row.SrNo || index + 1}`,

            SrNo: Number(row.SrNo || index + 1),
            UId: row.UId,
            StrCode: row.StrCode,

            ItmCode: String(row.ItmCode || ''),
            ItmName: row.ItmName || '',
            MItmCode: row.MItmCode || row.ItmCode || '',

            GrdCode: String(row.GrdCode || ''),
            GrdName: row.GrdName || '',

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
            const yno = yearno ? yearno.slice(-2) : '';

            // const res = await axios.get(`${API}/api/mobappshow`, {
            //     headers: {
            //         Authorization: `Bearer ${token}`,
            //         'Content-Type': 'application/json',
            //         Accept: 'application/json',
            //         'x-platform': 'mob',
            //     },
            //     params: {
            //         uid,
            //         prpcode,
            //         strcode,
            //         yearno,
            //         mode,
            //     },
            // });
            // console.log('mobappshow params =>', params);
            // console.log('mobappshow res =>', res);

            const params = {
                uid,
                prpcode,
                strcode,
                yearno: yno,
                mode,
            };

            console.log('mobappshow params =>', params);

            const res = await axios.get(`${API}/api/mobappshow`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob',
                },
                params,
            });

            console.log('mobappshow res =>', res);

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
            setAutoLocked(
                Number(main?.IsAuth));
            const isLocked =
                Number(main?.IsAuth || 0) !== 0;

            setIsViewMode(mode === "VIEW" || isLocked);

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
            setDdays(main.DDays)
            setTax(String(num(main.TaxPercent || main.TaxPer || 0)));
            setRemark(main.Remark || '');
            setSoDate(main.SODate || '');
            setSoNo(main.SONo || '');
            setDueDate(main.DueDate || '')

            const loadedParty = {
                ParCode: main.ParCode || '',
                ParName: main.ParName || '',
                SExe: main.SExe || '',
                SExeName: main.SExeName || '',
                City: main.city || main.DCity || main.Station || '',
                Address: main.address || main.DAdd || '',
                BAccCode: main.BAccCode || '',
                BAccName: main.BAccName || '',
                DueDay: main.DueDay || '',
                DueDate: main.DueDate || '',
                Dcity: main.City || main.DCity || '',
                DState: main.State || main.DState || '',
                DCnty: main.Cnty || main.DCnty || '',
                DZip: main.Zip || main.DZip || ''
            };
            setCurrentParty(loadedParty);
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

    const loaddeliveryaddress = async () => {
        try {
            setLoadingOrder(true);

            const yno = yearno ? yearno.slice(-2) : '';

            const params = {
                uid,
                prpcode,
                strcode,
                yearno: yno,
                parcode: currentParty.ParCode,
                page: '',
                limit: '',
                search: '',
                txntype: 'sales_order'
            };

            console.log('getaddress params =>', params);

            const res = await axios.get(`${API}/api/getaddress`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob',
                },
                params,
            });

            console.log('getaddress res =>', res?.data);

            const data = res?.data?.response?.data || [];

            console.log('ADDRESS LIST =>', data);

            setAdedressList(data);

        } catch (error) {

            console.log(
                'LOAD ADDRESS ERROR =>',
                error?.response?.data || error
            );

            Alert.alert(
                'Error',
                error?.response?.data?.message ||
                'Unable to load delivery address',
            );

        } finally {
            setLoadingOrder(false);
        }
    };

    let newsoparty = [];

    const buildMainPayload = () => {
        const base =
            uid > 0 && rawMain
                ? { ...rawMain }
                : {};

        const yno =
            yearno
                ? yearno.slice(-2)
                : '';

        const isNewParty =
            currentParty?.ParCode === '-1';

        newsoparty = [];

        if (isNewParty) {
            newsoparty.push({
                ParCode: currentParty?.ParCode || '-1',
                ParName: currentParty?.ParName || '',
                Address: currentParty?.Address || '',
                City: currentParty?.City || '',
                State: currentParty?.State || '',
                Cnty: currentParty?.Cnty || 'INDIA',
                Zip: currentParty?.Zip || '',
                Tel1: currentParty?.Tel1 || '',
                GSTIN: currentParty?.GSTIN || '',
                SExe: currentParty?.SExe || '',
                SExeName: currentParty?.SExeName || '',
                PrintName: currentParty?.PrintName || '',
                Remark: currentParty?.Remark || '',
                // BAccCode: currentParty?.brkAcc || '',
                // BAccName: currentParty?.brkname || '',
                // DueDay: currentParty?.crday || ''
            });
        }

        return {
            ...base,

            UId: uid || base.UId || 0,
            Mode: mode,

            PrpCode: prpcode || base.PrpCode || '',
            StrCode: strcode || base.StrCode || '002',
            YearNo: yno || base.YearNo || '',

            ParCode: currentParty?.ParCode || base.ParCode || '',
            ParName: currentParty?.ParName || base.ParName || '',

            SExe: currentParty?.SExe || base.SExe || '',
            // SExeName: currentParty?.SExeName || base.SExeName || '',

            BAccCode: currentParty?.BAccCode || base?.BAccCode || '',
            BAccName: currentParty?.BAccName || base?.BAccName || '',
            DueDay: currentParty?.DueDay || base?.DueDay || '',
            DueDate: DueDate || base.DueDate || '',

            GrsAmt: fmt(totals.totalAmount),
            DisAmt: fmt(discountAmt),
            NDisAmt: fmt(discountAmt),
            TDisAmt: fmt(discountAmt),

            TaxAmt: fmt(taxAmt),
            NTaxAmt: fmt(taxAmt),
            TTaxAmt: fmt(taxAmt),
            GSTAmt: fmt(taxAmt),

            NetAmt: fmt(grandTotal),
            D1NetAmt: fmt(totals.totalAmount) || '.00',

            Remark: remark || '',
            DDays: ddays || '',

            DAdd: currentParty?.Address || base.DAdd || '',
            DCity: currentParty?.City || base.DCity || '',
            DZip: currentParty?.City || base.DZip || '',
            DState: currentParty?.State || base.DState || '',
            DCnty: currentParty?.DCnty || base.DCnty || '',
            Station: currentParty?.City || base.Station || '',

            Status: base.Status || 'P',
            EntType: base.EntType || '',
            TaxStru: base.TaxStru || '',

            SONo: uid > 0 ? base.SONo : '',
            SODate: uid > 0 ? base.SODate : '',

            QtyKgs: currentParty?.QtyKgs || ''
            // DueDay: base.DueDay || '',
            // DueDate: base.DueDate || '',
        };
    };

    let newsoitem = [];

    const buildD1Payload = () => {

        newsoitem = [];

        const uniqueKeys = new Set();

        return reSrNo(rows).map((row, index) => {
            const raw = row.Raw || {};

            const isNewItem = row.ItmCode === '-1';

            // UNIQUE NEW ITEMS
            if (isNewItem) {

                // const key = `${row.ItmCode}_${row.ItmName}`;
                const key = `${row.LineId || index + 1}_${row.ItmCode}_${row.ItmName}`;

                if (!uniqueKeys.has(key)) {

                    uniqueKeys.add(key);

                    newsoitem.push({
                        SrNo: index + 1,
                        ItmCode: row.ItmCode || '-1',
                        ItmName: row.ItmName || '',
                        MItmCode: row.MItmCode || '-1',
                        UOM: row.UOM || '',
                        Denier: row.Denier || '',
                        HsnCode: row.HsnCode || '',
                        Remark: row.Remark || '',
                    });
                }
            }

            return {
                ...raw,

                UId: uid || raw.UId || 0,
                SrNo: index + 1,
                StrCode:
                    row.StrCode ||
                    raw.StrCode ||
                    strcode ||
                    '002',

                ItmCode: row.ItmCode || '',

                MItmCode:
                    row.MItmCode ||
                    raw.MItmCode ||
                    row.ItmCode ||
                    '',

                ItmName:
                    row.ItmName ||
                    raw.ItmName ||
                    '',

                GrdCode: row.GrdCode || '',
                GrdName: row.GrdName || raw.GrdName || '',

                ShdCode: row.ShdCode || '',
                ShdName: row.ShdName || raw.ShdName || '',

                Denier:
                    row.Denier ||
                    raw.Denier ||
                    '',

                UOM:
                    row.UOM ||
                    raw.UOM ||
                    '',

                Qty: fmt(row.Qty, 3),
                QtyPcs: String(num(row.Pcs)),
                UnitRate: fmt(row.Rate, 5),
                Amount: fmt(row.Amount),

                Remark1:
                    row.Remark ||
                    raw.Remark1 ||
                    '',

                Remark2: raw.Remark2 || '',
                Remark3: raw.Remark3 || '',
                Remark4: raw.Remark4 || '',
                Remark5: raw.Remark5 || '',

                PkgQty: raw.PkgQty || '1.000',
                PkgRate: raw.PkgRate || '.00000',
                AmtCalc: raw.AmtCalc || 'U',

                MerCode: raw.MerCode || '0',
                MerName: raw.MerName || '0',

                DisPer: raw.DisPer || '.00',
                DisAmt: raw.DisAmt || '.00',

                CGSTPer: raw.CGSTPer || '.00',
                CGSTAmt: raw.CGSTAmt || '.00',

                SGSTPer: raw.SGSTPer || '.00',
                SGSTAmt: raw.SGSTAmt || '.00',

                IGSTPer: raw.IGSTPer || '.00',
                IGSTAmt: raw.IGSTAmt || '.00',

                D1NetAmt:
                    fmt(row.Amount) || '.00',

                HsnCode:
                    row.HsnCode ||
                    raw.HsnCode ||
                    '',

                HSNName:
                    row.HSNName ||
                    raw.HSNName ||
                    '',
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

        const d1Response = buildD1Payload();
        const mainResponse = buildMainPayload();

        // const uniqueData = Array.from(
        //     new Map(newsoitem.map(item => [item.ItmName, item])).values()
        // );

        try {
            setSaving(true);
            const payload = {
                Mode: mode,
                UId: uid || 0,
                main: buildMainPayload(),
                d1: buildD1Payload(),
                tax: buildTaxPayload(),
                exp: buildExpPayload(),
                newsoitem: newsoitem,
                newsoparty: newsoparty,
                extra: rawExtra,
            };

            console.log("save payload", payload);

            // return payload;

            const res = await axios.post(`${API}/api/mobappsave`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-platform': 'mob',
                },
            });

            console.log("Save response..", res);

            if (res.data?.success === true) {
                if (typeof clearOrder === 'function') {
                    clearOrder();
                }
                console.log("SONO---", res?.data?.response?.sono);
                console.log("SONO.....", soNo);

                navigation.replace("SalesOrderSaveSuccess", {
                    orderNo: res?.data?.response?.sono || soNo || '-',

                    uid: res?.data?.response?.uid || uid,
                    prpcode: res?.data?.response?.PrpCode || prpcode,
                    yearno: res?.data?.response?.YearNo || yearno,
                    strcode: res?.data?.response?.StrCode || strcode,

                    party: currentParty,
                    partyData: currentParty,
                    selectedParty: currentParty,

                    token,
                    dateTime: new Date().toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                    }),
                });
            } else {
                Alert.alert('Save Failed', res.data?.message || 'Unable to save order');
            }
        }
        catch (error) {
            console.log('SAVE ORDER ERROR:', error?.res?.data || error.message);
            Alert.alert(
                'Error',
                error?.res?.data?.message || 'Something went wrong while saving',
            );
        } finally {
            setSaving(false);
        }
    };

    // const saveOrder = async () => {
    //     if (!validateBeforeSave()) return;
    //     try {
    //         setSaving(true);
    //         const payload = {
    //             Mode: mode,
    //             UId: uid || 0,
    //             main: buildMainPayload(),
    //             d1: buildD1Payload(),
    //             tax: buildTaxPayload(),
    //             exp: buildExpPayload(),
    //             extra: rawExtra,
    //         };
    //         console.log(
    //             'SAVE PAYLOAD =>',
    //             JSON.stringify(payload, null, 2),
    //         );
    //         return payload;
    //     } catch (error) {
    //         console.log(
    //             'SAVE ORDER ERROR:',
    //             error?.res?.data || error.message,
    //         );

    //         Alert.alert(
    //             'Error',
    //             error?.res?.data?.message ||
    //             'Something went wrong while saving',
    //         );
    //     } finally {
    //         setSaving(false);
    //     }
    // };

    const deleteOrder = async () => {
        const yno = yearno ? yearno.slice(-2) : '';
        try {
            setDeleting(true);
            const payload = {
                Mode: mode,
                uid: uid || 0,
                prpcode: prpcode,
                yearno: yno,
                strcode: '002'
            };
            console.log("save payload", payload);

            const res = await axios.post(`${API}/api/mobappdeleteso`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-platform': 'mob',
                },
            });

            console.log("Save response..", res);

            if (res.data?.success === true) {
                if (typeof clearOrder === 'function') {
                    clearOrder();
                }

                setDeleteModalVisible(false);
                setDeleteSuccessVisible(true);

                setTimeout(() => {
                    setDeleteSuccessVisible(false);

                    navigation.reset({
                        index: 0,
                        routes: [
                            {
                                name: "SalesOrderBrowse",
                                params: {
                                    refreshAfterDelete: true,
                                    refreshKey: Date.now(),

                                    prpcode,
                                    yearno,
                                    strcode,
                                },
                            },
                        ],
                    });
                }, 1200);
            } else {
                Alert.alert('Delete Failed', res.data?.message || 'Unable to delete order');
            }
        } catch (error) {
            console.log('SAVE ORDER ERROR:', error?.res?.data || error.message);
            Alert.alert(
                'Error',
                error?.res?.data?.message || 'Something went wrong while saving',
            );
        } finally {
            setDeleting(false);
        }
    };

    const printSalesOrderPdf = async (format = 'ROne') => {
        try {
            setPdfLoading(true);
            const yno = yearno ? yearno.slice(-2) : '';
            const payload = {
                prpcode,
                yearno: yno,
                strcode,
                uid,
                printTypes: ['sales_order'],
                printFormat: format,
            };

            console.log("payload:", payload);
            const res = await axios.post(
                `${API}/api/saleschallanmultiprintnew`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'x-platform': 'mob',
                    },
                }
            );

            console.log("res", res)
            console.log('PDF RESPONSE =>', res?.data);

            if (res?.data?.success === true) {
                const pdfUrl = res?.data?.results?.sales_order;

                if (!pdfUrl) {
                    Alert.alert('PDF Error', 'PDF URL not found.');
                    return;
                }

                navigation.navigate('PdfViewerScreen', {
                    pdfUrl,
                    title: 'Sales Order Print',
                });
            } else {
                Alert.alert(
                    'PDF Failed',
                    res?.data?.message || 'PDF generation failed.'
                );
            }
        } catch (error) {
            console.log('PDF ERROR =>', error?.response?.data || error.message);

            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to generate PDF.'
            );
        } finally {
            setPdfLoading(false);
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
                        <View style={styles.rowBetween}>
                            <Text style={styles.itemName}>
                                {item.ItmCode} - {item.ItmName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleEditItem(item, index)}
                                style={styles.editBtn}
                                disabled={Number(autoLocked) == 1 || isViewMode}
                            >
                                <Icon
                                    name="mode-edit-outline"
                                    size={16}
                                    color="#0B7A3D"
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.designText}>
                                Grade : {item.GrdCode} - {item.GrdName || '-'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleEditgrade(item, index)}
                                style={styles.editBtn}
                                disabled={Number(autoLocked) == 1 || isViewMode}
                            >
                                <Icon
                                    name="mode-edit-outline"
                                    size={16}
                                    color="#0B7A3D"
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={styles.designText}>
                                Shade : {item.ShdCode} - {item.ShdName || '-'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleEditShade(item, index)}
                                style={styles.editBtn}
                                disabled={Number(autoLocked) == 1 || isViewMode}
                            >
                                <Icon
                                    name="mode-edit-outline"
                                    size={16}
                                    color="#0B7A3D"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* <View style={styles.rowBetween}>
                            <Text style={styles.designText}>
                                Denier : {item.Denier||item.denier} 
                            </Text>                           
                        </View> */}

                        {/* {!!item.Remark && ( */}
                        <Text style={styles.remarkText}>
                            Remark : {item.Remark}
                        </Text>
                        {/* )} */}
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
                        }}
                        disabled={isViewMode}
                    >
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

    // useEffect(() => {
    //     const days = Number(ddays || 0);
    //     let baseDate = new Date();
    //     if (soDate) {
    //         const parts = soDate.split('-');

    //         baseDate = new Date(
    //             parts[2],
    //             parts[1] - 1,
    //             parts[0],
    //         );
    //     }
    //     baseDate.setDate(baseDate.getDate() + days);
    //     const day = String(baseDate.getDate()).padStart(2, '0');
    //     const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    //     const year = baseDate.getFullYear();
    //     setDdate(`${day}-${month}-${year}`);
    // }, [ddays, soDate]);

    useEffect(() => {

        // INVALID VALUE
        if (
            ddays === '' ||
            ddays === null ||
            ddays === undefined
        ) {
            return;
        }

        const days = Number(ddays);

        if (isNaN(days)) {
            return;
        }

        let baseDate = new Date();

        // SO DATE AVAILABLE
        if (soDate) {

            const parts = soDate.split('-');

            if (parts.length === 3) {

                baseDate = new Date(
                    Number(parts[2]),
                    Number(parts[1]) - 1,
                    Number(parts[0]),
                );
            }
        }

        baseDate.setDate(baseDate.getDate() + days);

        const day = String(baseDate.getDate()).padStart(2, '0');
        const month = String(baseDate.getMonth() + 1).padStart(2, '0');
        const year = baseDate.getFullYear();

        const finalDate = `${day}-${month}-${year}`;

        // IMPORTANT
        // ONLY UPDATE IF DIFFERENT
        if (finalDate !== ddate) {
            setDdate(finalDate);
        }

    }, [ddays, soDate]);


    useEffect(() => {
        const dueDays = Number(currentParty?.DueDay || 0);
        if (isNaN(dueDays)) {
            return;
        }
        let baseDate;
        if (soDate) {
            const parts = soDate.split('-');
            if (parts.length === 3) {
                baseDate = new Date(
                    Number(parts[2]),
                    Number(parts[1]) - 1,
                    Number(parts[0]),
                );
            }
        }
        if (!baseDate || isNaN(baseDate.getTime())) {
            baseDate = new Date();
        }
        baseDate.setDate(
            baseDate.getDate() + dueDays
        );
        const day = String(
            baseDate.getDate()
        ).padStart(2, '0');
        const month = String(
            baseDate.getMonth() + 1
        ).padStart(2, '0');
        const year = baseDate.getFullYear();
        const finalDueDate =
            `${day}-${month}-${year}`;
        if (finalDueDate !== DueDate) {
            setDueDate(finalDueDate);
        }
    }, [currentParty?.DueDay, soDate]);

    if (loadingOrder) {
        return <OrderSummarySkeleton />;
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    {Number(autoLocked) == 1 ? 'Authorised Sales Order'
                        : mode === 'EDIT' || uid > 0
                            ? 'Modify Sales Order'
                            : 'New Sales Order'}
                </Text>

                <View style={{ width: 22 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.orderInfoCard}>
                    <View>
                        <Text style={styles.orderNo}>
                            SO No : {headerData?.SONo || soNo || '-'}
                        </Text>
                        <Text style={styles.orderDate}>
                            SO Date : {headerData?.SODate || soDate || '-'}
                        </Text>
                    </View>
                    {/* 
                    <View style={styles.modeBadge}>
                        <Text style={styles.modeText}>{Number(autoLocked) == 1 ? 'VIEW' : initialMode}</Text>
                    </View> */}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>

                        <TouchableOpacity
                            style={styles.infoBtn}
                            onPress={() => {
                                setDetailVisible(true);
                                loaddeliveryaddress();
                            }}
                        >
                            <Icon
                                name="info-outline"
                                size={20}
                                color="#13879A"
                            />
                        </TouchableOpacity>

                        <View style={styles.modeBadge}>
                            <Text style={styles.modeText}>
                                {Number(autoLocked) == 1 ? 'VIEW' : initialMode}
                            </Text>
                        </View>

                    </View>

                </View>
                <View style={styles.partyCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.partyName}>{currentParty?.ParName || '-'}</Text>
                        <Text style={styles.partySub}>
                            {currentParty?.ParCode || '-'} | {currentParty?.Address || '-'}
                        </Text>
                        <Text style={styles.partySub}>
                            {currentParty?.SExeName || '-'}
                        </Text>
                    </View>

                    {(((mode !== 'EDIT' && uid <= 0) || (currentParty?.ParCode == '-1' && Number(autoLocked) == 1))) && (
                        <TouchableOpacity
                            style={styles.changeBtn}
                            onPress={() => navigation.navigate('PartyListScreen', {
                                replaceTempPartyOnly: String(currentParty?.ParCode) === '-1',

                                mode,
                                uid,
                                soNo,
                                soDate,
                                screenMode,

                                workingRows: rows,

                                party: currentParty,
                                partyData: currentParty,
                                selectedParty: currentParty,

                                prpcode,
                                strcode,
                                yearno,
                                token,
                            })}
                        >
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.partyCard1}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Delivery Days</Text>
                            <TextInput
                                value={ddays}
                                onChangeText={setDdays}
                                keyboardType="numeric"
                                style={styles.smallInput1}
                                editable={!isViewMode || screenMode == 'ADD'}
                            />
                        </View>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Delivery Date</Text>
                            {/* <TextInput
                                value={ddate}
                                onChangeText={setDdate}
                                keyboardType="numeric"
                                style={styles.smallInput1}
                                editable={!isViewMode}
                            /> */}
                            <TouchableOpacity
                                style={styles.smallInput1}
                                onPress={() => setShowDeliveryDatePicker(true)}
                                disabled={isViewMode}
                            >
                                <Text
                                    style={{
                                        color: '#000',
                                        marginTop: 9,
                                    }}
                                >
                                    {ddate || 'Select Date'}
                                </Text>
                            </TouchableOpacity>

                            {showDeliveryDatePicker && (
                                <DateTimePicker
                                    value={new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowDeliveryDatePicker(false);
                                        if (selectedDate) {
                                            const day = String(selectedDate.getDate()).padStart(2, '0');
                                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                            const year = selectedDate.getFullYear();
                                            setDdate(`${day}-${month}-${year}`);
                                        }
                                    }}
                                />
                            )}
                        </View>
                    </View>
                </View>

                {/* <View style={styles.modeCard}>
                    <Text style={styles.modeText}>
                        Mode:{' '}
                        {mode === 'EDIT' || uid > 0
                            ? 'Modify Saved Order'
                            : 'New Order'}
                    </Text>
                    <Text style={styles.modeText}>UId: {uid || 0}</Text>
                </View> */}

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

                <Text style={styles.sectionTitle}>Items / Grade / Shade Rows</Text>

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

                    {/* <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Discount ₹</Text>
                        <TextInput
                            value={discount}
                            onChangeText={setDiscount}
                            keyboardType="numeric"
                            style={styles.smallInput}
                            editable={!isViewMode}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Tax %</Text>
                        <TextInput
                            value={tax}
                            onChangeText={setTax}
                            keyboardType="numeric"
                            style={styles.smallInput}
                            editable={!isViewMode}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Tax Amount</Text>
                        <Text style={styles.staticAmount}>₹ {money(taxAmt)}</Text>
                    </View>

                    <View style={styles.grandRow}>
                        <Text style={styles.grandLabel}>Net Amount</Text>
                        <Text style={styles.grandAmount}>₹ {money(grandTotal)}</Text>
                    </View> */}

                    <TextInput
                        value={remark}
                        onChangeText={setRemark}
                        placeholder="Remark Optional"
                        placeholderTextColor="#98A2B3"
                        multiline
                        style={styles.remarkInput}
                        editable={!isViewMode}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={isViewMode}>
                    <Icon name="add-shopping-cart" size={20} color="#13879A" />
                    {/* <Text style={styles.addBtnText}>Add Item</Text> */}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={saveOrder}
                    disabled={saving || isViewMode}
                // disabled={true}
                >
                    <Icon
                        name={mode === 'EDIT' || uid > 0 ? 'edit' : 'save'}
                        size={16}
                        color="#fff"
                    />
                </TouchableOpacity>
                {!Number(autoLocked) && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, saving && { opacity: 0.6 }]}
                        onPress={() => setDeleteModalVisible(true)}
                        disabled={saving || isViewMode || screenMode == 'ADD'}
                    >
                        <Icon
                            name="delete"
                            size={16}
                            color="#fff"
                        />
                    </TouchableOpacity>
                )}
                {screenMode != 'ADD' && (
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={() => printSalesOrderPdf('ROne')}
                        disabled={pdfLoading}
                    >
                        <Icon
                            name="print"
                            size={16}
                            color="#fff"
                        />
                    </TouchableOpacity>
                )}
            </View>
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmModal}>
                        <View style={styles.deleteIconCircle}>
                            <Icon name="delete-outline" size={36} color="#DC2626" />
                        </View>

                        <Text style={styles.modalTitle}>Delete Sales Order?</Text>

                        <Text style={styles.modalMessage}>
                            Are you sure you want to delete SO No {soNo || '-'}?
                            This action cannot be undone.
                        </Text>

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.noBtn}
                                onPress={() => setDeleteModalVisible(false)}
                                disabled={deleting}
                            >
                                <Text style={styles.noBtnText}>No, Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.yesDeleteBtn}
                                onPress={deleteOrder}
                                disabled={deleting}
                            >
                                <Text style={styles.yesDeleteText}>
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={deleteSuccessVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIconCircle}>
                            <Icon name="check" size={40} color="#16A34A" />
                        </View>

                        <Text style={styles.successTitle}>Deleted Successfully</Text>

                        <Text style={styles.successMessage}>
                            Sales order has been deleted.
                        </Text>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={detailVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDetailVisible(false)}
            >
                <View style={styles.detailOverlay}>

                    <View style={styles.detailModal}>

                        {/* <View style={styles.dragBar} /> */}

                        {/* HEADER */}
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>
                                Sales Order Details
                            </Text>

                            <TouchableOpacity
                                onPress={() => setDetailVisible(false)}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color="#000"
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.detailRow}>
                                <Icon
                                    name="person"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Sales Executive
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.SExeName || '-'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Icon
                                    name="person"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Broker
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.BAccName || '-'}
                                </Text>
                            </View>

                            {/* DELIVERY DAYS */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="calendar-today"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Due Days
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.DueDay || '-'}
                                </Text>
                            </View>

                            {/* DELIVERY DATE */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="event"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Due Date
                                </Text>

                                <Text style={styles.detailValue}>
                                    {DueDate || '-'}
                                </Text>
                            </View>

                            {/* ADDRESS */}
                            {/* <View style={styles.detailRowTop}>
                                <Icon
                                    name="location-on"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Address
                                </Text>

                                <Text style={styles.detailValueAddress}>
                                    {currentParty?.Address || '-'}
                                </Text>
                            </View> */}

                            <TouchableOpacity
                                style={styles.detailRowTop}
                                activeOpacity={0.8}
                                onPress={() => setAddressListVisible(true)}
                            >
                                <Icon
                                    name="location-on"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Address
                                </Text>

                                <View style={{ width: '42%' }}>
                                    <Text
                                        numberOfLines={10}
                                        style={styles.detailValueAddress}
                                    >
                                        {currentParty?.Address || '-'}
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#13879A',
                                            fontSize: 12,
                                            marginTop: 4,
                                            fontWeight: '700',
                                        }}
                                    >
                                        Tap to change
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* CITY */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="location-city"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    City
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.City || '-'}
                                </Text>
                            </View>

                            {/* STATE */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="map"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    State
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.DState || '-'}
                                </Text>
                            </View>

                            {/* COUNTRY */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="public"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Country
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.DCnty || '-'}
                                </Text>
                            </View>

                            {/* ZIP CODE */}
                            <View style={styles.detailRow}>
                                <Icon
                                    name="markunread-mailbox"
                                    size={20}
                                    color="#13879A"
                                />

                                <Text style={styles.detailLabel}>
                                    Zip Code
                                </Text>

                                <Text style={styles.detailValue}>
                                    {currentParty?.DZip || '-'}
                                </Text>
                            </View>
                        </ScrollView>

                        {/* CLOSE BUTTON */}
                        {/* <TouchableOpacity
                            style={styles.closeDetailBtn}
                            onPress={() => setDetailVisible(false)}
                        >
                            <Text style={styles.closeDetailText}>
                                CLOSE
                            </Text>
                        </TouchableOpacity> */}

                    </View>
                </View>
            </Modal>

            <Modal
                visible={addressListVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAddressListVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        justifyContent: 'flex-end',
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#fff',
                            borderTopLeftRadius: 25,
                            borderTopRightRadius: 25,
                            padding: 18,
                            maxHeight: '60%',
                        }}
                    >

                        <View style={styles.dragBar} />

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 18,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '800',
                                    color: '#101828',
                                }}
                            >
                                Select Address
                            </Text>

                            <TouchableOpacity
                                onPress={() => setAddressListVisible(false)}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color="#000"
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >

                            {AddressList && AddressList.length > 0 ? (

                                AddressList.map((item, index) => (

                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            paddingVertical: 16,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#EDF2F7',
                                        }}
                                        onPress={() => {

                                            console.log('Selected Address:', item);

                                            setCurrentParty(prev => ({
                                                ...prev,

                                                Address: item?.DAdd || '',
                                                DCity: item?.DCity || '',
                                                DState: item?.DState || '',
                                                DCnty: item?.DCnty || '',
                                                DZip: item?.DZip || '',

                                                QtyKgs: item?.SrNo || '',
                                            }));

                                            setAddressListVisible(false);
                                        }}
                                    >

                                        {/* ADDRESS */}
                                        <Text
                                            style={{
                                                color: '#101828',
                                                fontSize: 14,
                                                fontWeight: '800',
                                                lineHeight: 22,
                                            }}
                                        >
                                            {item?.DAdd || '-'}
                                        </Text>

                                        {/* CITY + STATE */}
                                        <Text
                                            style={{
                                                color: '#667085',
                                                fontSize: 13,
                                                marginTop: 6,
                                            }}
                                        >
                                            {item?.DCity || '-'} , {item?.DState || '-'}
                                        </Text>

                                        {/* COUNTRY + ZIP */}
                                        <Text
                                            style={{
                                                color: '#98A2B3',
                                                fontSize: 12,
                                                marginTop: 2,
                                            }}
                                        >
                                            {item?.DCnty || '-'} - {item?.DZip || '-'}
                                        </Text>

                                    </TouchableOpacity>

                                ))

                            ) : (

                                <View
                                    style={{
                                        paddingVertical: 40,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#98A2B3',
                                            fontSize: 14,
                                            fontWeight: '600',
                                        }}
                                    >
                                        No Address Found
                                    </Text>
                                </View>

                            )}

                        </ScrollView>

                    </View>
                </View>
            </Modal>

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
    partyCard1: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E4E7EF',
        marginTop: 12,
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
    smallInput1: {
        width: 130,
        height: 38,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        borderRadius: 9,
        paddingHorizontal: 10,
        textAlign: 'left',
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
    deleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#ec8787',
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
        color: '#000',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 22,
    },

    confirmModal: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 22,
        alignItems: 'center',
    },

    deleteIconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'center',
    },

    modalMessage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },

    modalBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        width: '100%',
    },

    noBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    noBtnText: {
        color: '#374151',
        fontWeight: '900',
    },

    yesDeleteBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#DC2626',
        justifyContent: 'center',
        alignItems: 'center',
    },

    yesDeleteText: {
        color: '#fff',
        fontWeight: '900',
    },

    successModal: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 26,
        alignItems: 'center',
    },

    successIconCircle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },

    successTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#166534',
        textAlign: 'center',
    },

    successMessage: {
        fontSize: 14,
        color: '#475467',
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },

    editBtn: {
        height: 24,
        width: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EAF7F0',
    },

    infoBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: '#CDECEF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    detailOverlay: {
        flex: 1,
        backgroundColor: '#fff',
    },

    detailModal: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingHorizontal: 18,
    },

    dragBar: {
        width: 60,
        height: 5,
        borderRadius: 10,
        backgroundColor: '#D0D5DD',
        alignSelf: 'center',
        marginBottom: 18,
    },

    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },

    detailTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#101828',
    },

    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7',
    },

    detailRowTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7',
    },

    detailLabel: {
        flex: 1,
        marginLeft: 14,
        color: '#344054',
        fontWeight: '700',
        fontSize: 14,
    },

    detailValue: {
        width: '42%',
        color: '#101828',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'left',
    },

    detailValueAddress: {
        // width: '42%',
        color: '#101828',
        fontWeight: '700',
        fontSize: 14,
        lineHeight: 22,
    },

    closeDetailBtn: {
        marginTop: 20,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },

    closeDetailText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
    },
});