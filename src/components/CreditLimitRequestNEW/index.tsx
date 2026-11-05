import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

// import { API } from '@/common/API/dynamicAPI';
// NEW ERP UI: local re-skinned copy of the shared legacy modal
// (was '@/components/CreditLimitRequest/PartyHistoryModal').
import PartyHistoryModal from './PartyHistoryModal';
import { T, S } from '@/src/theme';
import {
    Avatar,
    Btn,
    BusyOverlay,
    CONTENT_MAX,
    EmptyState,
    Field,
    Kpi,
    KpiGrid,
    SearchBox,
    SectionHead,
    Segment,
    cellWidth,
    useSotLayout,
} from '@/src/components/erpUi';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { Cell, HistoryCard, InfoLine, Pill, Tag } from './ui';

interface Props {
    token: string;
    username?: string;
    duration?: number;
}

// export default function CreditLimit() {
const CreditLimitRequestNEW: React.FC<Props> = ({ token, username, API }) => {
    // const { token, username } = useAuth();
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);

    const [data, setData] = useState<any[]>([]);
    const [allhistoryData, setAllHistoryData] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [partyList, setPartyList] = useState<any[]>([]);
    const [getParname, setParname] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);

    const [editableValues, setEditableValues] = useState<any>({});
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedAction, setSelectedAction] = useState<any>(null);

    const [showOverlay, setShowOverlay] = useState(false);
    const [showPartyHistoryModal, setShowPartyHistoryModal] = useState(false);

    const [activeTab, setActiveTab] = useState<'party' | 'history'>('party');
    const [activeTab1, setActiveTab1] = useState<'requests' | 'history'>('requests');

    const [responsemessage, setresponsemessage] = useState('');
    const [getSuccess, setSuccess] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);
    const [limitInWords, setLimitInWords] = useState('');
    const { width } = useWindowDimensions();
    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const getColumns = () => {
        if (width < 600) return 1;     // mobile
        if (width < 1000) return 2;    // tablet
        return 3;                      // large / web
    };

    const numColumns = getColumns();

    // 🔥 LOAD TOKEN
    // useEffect(() => {
    //     const load = async () => {
    //         const t = await AsyncStorage.getItem('access_token');
    //         const u = await AsyncStorage.getItem('user_details');

    //         setToken(t || '');
    //         setUsername(u || 'User');
    //     };
    //     load();
    // }, []);

    // 🔥 FETCH REQUEST
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API}/api/crlimitreqbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { txntype: 'creditlimitrequest', referrer: 'dashboard' }
            });
            console.log("res", res);

            setData(res.data.success ? res.data.data : []);
            setAllHistoryData([]);

        } catch {
            AppAlert.alert("Error", "Server error");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 FETCH ALL HISTORY
    const fetchAllHistoryData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API}/api/crlimitreqbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    txntype: 'creditlimithistory',
                    action: 'allpartyhistory',
                    referrer: 'dashboard',
                }
            });

            setAllHistoryData(res.data.success ? res.data.data : []);
            setData([]);

        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistoryData = async (parcode: string, prptype: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsHistoryLoading(true);
        try {
            const historyPayload = {
                // text: parcode,
                acccode: parcode,
                txntype: 'creditlimithistory',
                referrer: 'dashboard',
                action: 'partyhistory',
                prptype: prptype
            };
            const response = await axios.get(
                `${API}/api/crlimitreqbrowse`,
                getRequestConfig({
                    params: {
                        ...historyPayload
                    }
                })
            );
            console.log('🔵 history payload', historyPayload);
            if (response.data.success && response.data.data.length > 0) {
                console.log('✅History Data:', response.data.data);
                setHistoryData(response.data.data);
            } else {
                setHistoryData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoading(false);
        }
    };

    // const fetchAllHistoryData = async () => {
    //     // setActiveTab('allhistory');
    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setIsLoading(true);
    //     try {
    //         const allhistoryPayload = {
    //             txntype: 'creditlimithistory',
    //             referrer: 'dashboard',
    //             action: 'allpartyhistory',
    //         };
    //         const response = await axios.get(
    //             // `https://apig.tms-webapp.com/api/crlimitreqbrowse`,
    //             `${API}/api/crlimitreqbrowse`,
    //             getRequestConfig({
    //                 params: {
    //                     ...allhistoryPayload
    //                 }
    //             })
    //         );
    //         console.log('🔵all history payload', allhistoryPayload);
    //         if (response.data.success && response.data.data.length > 0) {
    //             console.log('✅All History Data:', response.data.data);
    //             setAllHistoryData(response.data.data);
    //             setData([]);

    //         } else {
    //             setAllHistoryData([]);
    //             // setPartyList([]);
    //             // setHistoryData([]);
    //         }
    //     } catch (error) {
    //         if (!axios.isCancel(error)) {
    //             AppAlert.alert('Error', 'Server error');
    //         }
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    useEffect(() => {
        if (activeTab1 === 'history') {
            fetchAllHistoryData();
        }
        // else if (activeTab1 === 'requests') {
        //     fetchData();
        // }
    }, [activeTab1]);

    useEffect(() => {
        if (!selectedItem) {
            setLimitInWords(''); // Reset if no item is selected
            return;
        }

        const currentItem = data.find(item => item.uid === selectedItem.uid);
        if (!currentItem) {
            setLimitInWords('');
            return;
        }

        const editedLimit2 = editableValues[currentItem.uid]?.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : currentItem.limit2;
        const numericValue = parseFloat(rawValue);

        if (!isNaN(numericValue)) {
            setLimitInWords(numberToWordsIndian(numericValue) + '');
            console.log('Limit in words:', numberToWordsIndian(numericValue)); // Debug log
        } else {
            setLimitInWords('');
        }
    }, [editableValues, selectedItem?.uid, data]);

    useEffect(() => {
        if (!token) return;

        if (activeTab1 === 'requests') fetchData();
        else fetchAllHistoryData();

    }, [activeTab1, token]);

    const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
        setActiveTab('party');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsPartyLoading(true);
        try {
            const historyPayload = {
                prpcodes: [prpcode],
                prptype: prptype,
                yearno: yearno,
                strcode: '',
                parcodes: [parcode],
                txntype: 'creditlimitrequest',
                fetch: 'dr'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        ...historyPayload
                    }
                })
            );
            console.log('🔵 Party payload', historyPayload);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ PartyList Data:', response);
                console.log('✅ PartyList Data1:', response.data.response.data);
                setPartyList(response.data.response.data);
                fetchHistoryData(parcode, prptype);
            } else {
                setPartyList([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsPartyLoading(false);
        }
    };

    // 🔥 SEARCH
    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter(i =>
            Object.values(i).some(v =>
                String(v).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [data, searchQuery]);

    const filteredhistoryData = useMemo(() => {
        if (!searchhistoryQuery) return allhistoryData;
        return allhistoryData.filter(i =>
            Object.values(i).some(v =>
                String(v).toLowerCase().includes(searchhistoryQuery.toLowerCase())
            )
        );
    }, [allhistoryData, searchhistoryQuery]);

    // 🔥 EDIT VALUE
    const handleEdit = (uid: string, field: string, value: string) => {
        setEditableValues(prev => ({
            ...prev,
            [uid]: { ...prev[uid], [field]: value }
        }));
    };

    // 🔥 ICON CLICK
    const handleIconPress = (item: any, action: any) => {
        if (action === 'list') {
            setSelectedItem(item);
            setSelectedAction(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            setShowPartyHistoryModal(true);
            setParname(item.parname);
            return;
        }

        setSelectedItem(item);
        setSelectedAction(action);
        setShowOverlay(true);
    };


    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const scrollHistoryToTop = () => {
        flatHistoryListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    // 🔥 CONFIRM ACTION
    // const handleConfirmAction = async () => {
    //     if (!selectedItem) return;

    //     const payload = {
    //         ...selectedItem,
    //         limit2: editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2,
    //         crday2: editableValues[selectedItem.uid]?.crday2 || selectedItem.crday2,
    //         isauth: selectedAction === 'accept' ? 1 : 2,
    //         action: 'edit'
    //     };


    //     try {
    //         setSuccess(true);
    //         setresponsemessage('Loading...');

    //         const res = await axios.post(`${API}/api/crlimitreqedit`, payload, {
    //             headers: { Authorization: `Bearer ${token}` }
    //         });
    //         console.log("cr limit auth", payload, res);

    //         setresponsemessage(res.data.message || 'Success');

    //         setTimeout(() => {
    //             setShowOverlay(false);
    //             setSuccess(false);
    //             fetchData();
    //         }, 1500);

    //     } catch {
    //         setresponsemessage('Server Error');
    //     }
    // };

    const getToken = () => {
        return token;
    };

    const handleValidation = (updatedItem: any) => {
        if (selectedAction === 'accept') {

            const numericNewLimit2: any = parseFloat(updatedItem.limit2.replace(/,/g, ''));
            const numericLimit1: any = parseFloat(updatedItem.limit1.replace(/,/g, ''));

            if (
                parseFloat(numericNewLimit2).toFixed(2) ===
                parseFloat(numericLimit1).toFixed(2)
            ) {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be equal to Old Limit for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (updatedItem.limit2 === '0' || parseFloat(updatedItem.limit2) === 0) {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (parseFloat(updatedItem.limit2) < 0) {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (!updatedItem.limit2 || updatedItem.limit2.trim() === '') {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be empty or invalid for Party Name: ' + updatedItem.parname
                )
                return false;
            }
        }

        return true;

    };

    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        const updatedItemAccept = {
            ...selectedItem,
            limit2: editableValues[selectedItem.uid]?.limit2 || formatToIndianCurrency(selectedItem.limit2 || '0'),
            limit3: editableValues[selectedItem.uid]?.limit2 || formatToIndianCurrency(selectedItem.limit2 || '0'),
            crday2: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            crday3: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            isauth: 1,
            referrer: 'dashboard',
            txntype: 'creditlimitrequest',
            action: 'edit'
        };
        const updatedItemReject = {
            ...selectedItem,
            limit2: formatToIndianCurrency(selectedItem.limit2 || '0'),
            limit3: editableValues[selectedItem.uid]?.limit2 || (selectedItem.limit2 || '0'),
            crday2: formatToIndianCurrency(selectedItem.crday2 || '0'),
            crday3: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            isauth: 2,
            referrer: 'dashboard',
            txntype: 'creditlimitrequest',
            action: 'edit'
        };
        const payload = selectedAction === 'accept' ? updatedItemAccept : updatedItemReject;

        if (handleValidation(payload)) {
            setSuccess(true);
            setresponsemessage('Loading...');

            console.log(`${selectedAction} confirmed for:`, payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("API CALL START", API);
            try {

                const response = await axios.post(`${API}/api/crlimitreqedit`, payload, { headers });
                // const response = {
                //     "data": {
                //         "main": [
                //             {
                //                 "uid": "300000303",
                //                 "prptype": "K",
                //                 "prpcode": "DK",
                //                 "crlimitreqdt": "02-02-2026",
                //                 "parcode": "24246",
                //                 "subparcode": "24246",
                //                 "limit1": "4335000.00",
                //                 "limit2": "5135000.00",
                //                 "limit3": "5135000.00",
                //                 "isauth": "1",
                //                 "ausrcode": "1",
                //                 "alastdate": "20260210",
                //                 "alasttime": "14.36",
                //                 "aremark": "os-4150912",
                //                 "usrcode": "",
                //                 "lastdate": "20260202",
                //                 "lasttime": "10.37",
                //                 "uusrcode": "",
                //                 "ulastdate": "20260210",
                //                 "ulasttime": "14.36",
                //                 "yearno": "26",
                //                 "setdate": "0",
                //                 "crday1": "60",
                //                 "crday2": "60",
                //                 "crday3": "60",
                //                 "parname": "DHRUV CREATIONS",
                //                 "subparname": "DHRUV CREATIONS",
                //                 "ausrname": "admin"
                //             }
                //         ]
                //     },
                //     "success": true,
                //     "message": ""
                // }
                console.log('🔵 response', response);
                if (response.data.success) {
                    console.log('✅ aaa 113 response.data.response.data');
                    setresponsemessage(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccess(false);
                        setShowOverlay(false);
                    }, 2000);
                    // setProcessedCards(prev => new Set(prev).add(selectedItem.uid));
                    setData(prevData => {
                        const newData = prevData.filter(item => item.uid !== selectedItem.uid);
                        newData.push({ ...selectedItem, isProcessed: true, actionType: selectedAction });
                        return newData;
                    });
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                } else {
                    console.log('✅ aaa 114 response.data.response.data');
                    setresponsemessage(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccess(false);
                    }, 2000);
                }
            } catch (error) {
                setresponsemessage('Server Error');
                setTimeout(() => {
                    setSuccess(false);
                }, 2000);
            }

        }
    };

    const numberToWordsIndian = num => {
        const ones = [
            '',
            'One',
            'Two',
            'Three',
            'Four',
            'Five',
            'Six',
            'Seven',
            'Eight',
            'Nine'
        ];
        const teens = [
            'Ten',
            'Eleven',
            'Twelve',
            'Thirteen',
            'Fourteen',
            'Fifteen',
            'Sixteen',
            'Seventeen',
            'Eighteen',
            'Nineteen'
        ];
        const tens = [
            '',
            'Ten',
            'Twenty',
            'Thirty',
            'Forty',
            'Fifty',
            'Sixty',
            'Seventy',
            'Eighty',
            'Ninety'
        ];

        const convertLessThanOneThousand = n => {
            if (n === 0) return '';
            let res = '';
            if (n >= 100) {
                res += ones[Math.floor(n / 100)] + ' Hundred ';
                n %= 100;
            }
            if (n >= 20) {
                res += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            } else if (n >= 10) {
                res += teens[n - 10] + ' ';
                n = 0;
            }
            if (n > 0) {
                res += ones[n] + ' ';
            }
            return res.trim();
        };

        if (num === 0) return 'Zero';
        if (num === null || num === undefined || isNaN(num)) return '';

        num = parseFloat(num);
        if (isNaN(num)) return '';

        let res = '';
        if (num >= 10000000) {
            res +=
                convertLessThanOneThousand(Math.floor(num / 10000000)) + ' Crore ';
            num %= 10000000;
        }
        if (num >= 100000) {
            res += convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh ';
            num %= 100000;
        }
        if (num >= 1000) {
            res +=
                convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
            num %= 1000;
        }
        if (num > 0) {
            res += convertLessThanOneThousand(num);
        }
        return res.trim();
    };
    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };
    // =====================================================================
    // NEW ERP UI (presentation only — every handler below is the original
    // one, called with the original arguments).
    // =====================================================================
    const { isPhone, cols, gutter } = useSotLayout();

    const toNum = (v: any) => {
        const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    };
    const rupee = (v: any) => `₹ ${formatToIndianCurrency(v || '0')}`;
    // compact ₹ for KPI tiles on phones (full value shown underneath)
    const rupeeShort = (v: number) => {
        if (!isPhone) return rupee(v);
        const a = Math.abs(v);
        if (a >= 10000000) return `₹ ${(v / 10000000).toFixed(2)} Cr`;
        if (a >= 100000) return `₹ ${(v / 100000).toFixed(2)} L`;
        return rupee(v);
    };
    const rupeeSub = (v: number) => (isPhone && Math.abs(v) >= 100000 ? rupee(v) : undefined);

    const reqSummary = useMemo(() => {
        let outstanding = 0, overdue = 0, requested = 0, processed = 0;
        filteredData.forEach((i: any) => {
            outstanding += toNum(i.outstanding);
            overdue += toNum(i.overdue);
            requested += toNum(i.limit2);
            if (i.isProcessed) processed += 1;
        });
        return { outstanding, overdue, requested, processed, pending: filteredData.length - processed };
    }, [filteredData]);

    const histSummary = useMemo(() => {
        let ok = 0, bad = 0, pend = 0;
        filteredhistoryData.forEach((i: any) => {
            if (i.isauth === '1') ok += 1;
            else if (i.isauth === '2') bad += 1;
            else pend += 1;
        });
        return { ok, bad, pend };
    }, [filteredhistoryData]);

    // 🔥 CARD UI
    const renderCard = ({ item }: { item: any & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {

        const editedLimit2 = editableValues[item.uid]?.limit2 || item.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : item.limit2;
        const numericValue = parseFloat(rawValue);
        const itemLimitInWords = !isNaN(numericValue) ? numberToWordsIndian(numericValue) : '';
        const overdueAmt = toNum(item.overdue);

        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View
                    accessibilityLabel="Credit limit request"
                    style={[
                        styles.card,
                        item.actionType === 'accept'
                            ? styles.cardAccepted
                            : item.actionType === 'reject'
                                ? styles.cardRejected
                                : null
                    ]}
                >
                    {/* header: party + division + date + status */}
                    <View style={styles.cardHead}>
                        <Avatar name={item.parname} size={40} />
                        <View style={styles.cardHeadInfo}>
                            <Text style={styles.partyName} numberOfLines={2}>{item.parname}</Text>
                            <View style={styles.metaRow}>
                                <Tag icon="business" text={item.prptypename} tone="blue" />
                                <Tag icon="event" text={item.date} />
                            </View>
                        </View>
                        {item.isProcessed ? (
                            item.actionType === 'accept'
                                ? <Pill text="APPROVED" tone="green" icon="check-circle" />
                                : <Pill text="REJECTED" tone="red" icon="cancel" />
                        ) : (
                            <Pill text="PENDING" tone="copper" />
                        )}
                    </View>

                    {/* current position */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricRow}>
                            <Cell label="Outstanding" value={rupee(item.outstanding)} color={T.pd} />
                            <Cell label="Overdue" value={rupee(item.overdue)} color={overdueAmt > 0 ? T.red : T.ink} />
                        </View>
                        <View style={styles.metricRow}>
                            <Cell label="Old Limit" value={rupee(item.limit1)} color={T.green} />
                            <Cell label="Cr. Days" value={item.crday1} color={T.green} />
                        </View>
                    </View>

                    {/* requested (editable) */}
                    <View style={styles.reqBox}>
                        <Text style={styles.eyebrow}>REQUESTED</Text>
                        <View style={styles.reqRow}>
                            <Field
                                label="Req. Limit (₹)"
                                style={styles.reqLimitField}
                                value={
                                    editableValues[item.uid]?.limit2 !== undefined
                                        ? editableValues[item.uid].limit2
                                        : formatToIndianCurrency(item.limit2 || '0')
                                }
                                onChangeText={(text: string) => handleEdit(item.uid, 'limit2', text)}
                                keyboardType="numeric"
                                inputStyle={styles.reqInput}
                            />
                            <Field
                                label="Req. Cr. Days"
                                style={styles.reqDaysField}
                                value={editableValues[item.uid]?.crday2 !== undefined ? editableValues[item.uid].crday2 : item.crday2}
                                onChangeText={(text: string) => handleEdit(item.uid, 'crday2', text)}
                                keyboardType="numeric"
                                placeholder={String(item.crday2)}
                                inputStyle={styles.reqInput}
                            />
                        </View>
                        {itemLimitInWords ? (
                            <Text style={styles.words} numberOfLines={2}>{itemLimitInWords}</Text>
                        ) : null}
                    </View>

                    {/* remark / broker / sales exe */}
                    <View style={styles.lines}>
                        <InfoLine icon="notes" label="Remark" value={item.remark} lines={3} />
                        <InfoLine icon="handshake" label="Broker" value={item.BrkAccName} bold />
                        <InfoLine icon="badge" label="SExe" value={item.sexename} bold />
                    </View>

                    {/* actions */}
                    <View style={styles.actions}>
                        <Btn
                            label="Approve"
                            icon="check-circle"
                            compact
                            onPress={() => handleIconPress(item, 'accept')}
                            disabled={item.isProcessed}
                            style={[styles.actionBtn, { backgroundColor: T.green }]}
                        />
                        <Btn
                            label="Reject"
                            icon="cancel"
                            kind="danger"
                            compact
                            onPress={() => handleIconPress(item, 'reject')}
                            disabled={item.isProcessed}
                            style={styles.actionBtn}
                        />
                        <Btn
                            label="History"
                            icon="history"
                            kind="ghost"
                            compact
                            onPress={() => handleIconPress(item, 'list')}
                            disabled={item.isProcessed}
                            style={styles.actionBtn}
                        />
                    </View>
                </View>
            </View>
        );
    };

    const renderAllCardHistory = ({ item }: { item: any }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <HistoryCard item={item} showParty />
        </View>
    );

    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    const requestsHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi
                    label="Pending"
                    icon="pending-actions"
                    accent={T.copper}
                    valueColor={T.copper}
                    value={String(reqSummary.pending)}
                    sub={`${reqSummary.processed} actioned of ${filteredData.length}`}
                />
                <Kpi
                    label="Outstanding"
                    icon="account-balance-wallet"
                    accent={T.pd}
                    valueColor={T.pd}
                    value={rupeeShort(reqSummary.outstanding)}
                    sub={rupeeSub(reqSummary.outstanding)}
                />
                <Kpi
                    label="Overdue"
                    icon="warning-amber"
                    accent={T.red}
                    valueColor={reqSummary.overdue > 0 ? T.red : T.ink}
                    value={rupeeShort(reqSummary.overdue)}
                    sub={rupeeSub(reqSummary.overdue)}
                />
                <Kpi
                    label="Req. Limit"
                    icon="trending-up"
                    accent={T.blue}
                    value={rupeeShort(reqSummary.requested)}
                    sub={rupeeSub(reqSummary.requested)}
                />
            </KpiGrid>
            <SectionHead
                title="Credit limit requests"
                meta={`${filteredData.length} shown${searchQuery ? ` · ${data.length} total` : ''}`}
            />
        </View>
    );

    const historyHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi label="Total" icon="history" accent={T.nav} value={String(filteredhistoryData.length)} />
                <Kpi label="Authorised" icon="verified" accent={T.green} valueColor={T.green} value={String(histSummary.ok)} />
                <Kpi label="Rejected" icon="block" accent={T.red} valueColor={T.red} value={String(histSummary.bad)} />
                <Kpi label="Pending" icon="schedule" accent={T.copper} valueColor={T.copper} value={String(histSummary.pend)} />
            </KpiGrid>
            <SectionHead
                title="Credit limit history"
                meta={`${filteredhistoryData.length} shown${searchhistoryQuery ? ` · ${allhistoryData.length} total` : ''}`}
            />
        </View>
    );

    const pendingLimit = selectedItem
        ? (editableValues[selectedItem.uid]?.limit2 || formatToIndianCurrency(selectedItem.limit2 || '0'))
        : '';
    const pendingDays = selectedItem
        ? (editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'))
        : '';
    const isAccept = selectedAction === 'accept';

    return (
        <View style={styles.root}>

            {/* ───────────── Toolbar: Request/History switch + search ───────────── */}
            <View style={styles.toolbar}>
                <View style={[styles.toolbarInner, { paddingHorizontal: gutter }, isPhone && styles.toolbarPhone]}>
                    <View style={isPhone ? null : styles.segWrap}>
                        <Segment
                            value={activeTab1}
                            onChange={(v) => setActiveTab1(v)}
                            options={[
                                { value: 'requests', label: 'Request', icon: 'assignment' },
                                { value: 'history', label: 'History', icon: 'history' },
                            ]}
                        />
                    </View>
                    {activeTab1 === 'requests' ? (
                        <SearchBox
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search request..."
                            style={isPhone ? null : { flex: 1 }}
                        />
                    ) : activeTab1 === 'history' ? (
                        <SearchBox
                            value={searchhistoryQuery}
                            onChangeText={setSearchhistoryQuery}
                            placeholder="Search history..."
                            style={isPhone ? null : { flex: 1 }}
                        />
                    ) : null}
                </View>
            </View>

            {/* LIST */}
            {activeTab1 === 'requests' ? (
                <FlatList
                    ref={flatListRef}
                    style={styles.list}
                    data={filteredData}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.uid}
                    numColumns={cols}
                    key={`clr-req-${cols}`} // 🔥 VERY IMPORTANT (re-render fix)
                    contentContainerStyle={listContentStyle}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={data.length > 0 ? requestsHeader : null}
                    onScroll={({ nativeEvent }) => {
                        setShowTopButton(nativeEvent.contentOffset.y > 100);
                    }}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyCard}>
                                <EmptyState
                                    icon={searchQuery ? 'search-off' : 'inbox'}
                                    title="No request data found!"
                                    text={searchQuery ? 'No request matches your search. Try another party, broker or sales executive.' : 'There are no credit limit requests waiting for approval.'}
                                />
                            </View>
                        ) : null
                    }
                />
            ) : activeTab1 === 'history' ? (
                <FlatList
                    ref={flatHistoryListRef}
                    style={styles.list}
                    data={filteredhistoryData}
                    renderItem={renderAllCardHistory}
                    keyExtractor={(item) => item.uid}
                    numColumns={cols}
                    key={`clr-hist-${cols}`}
                    contentContainerStyle={listContentStyle}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={allhistoryData.length > 0 ? historyHeader : null}
                    onScroll={({ nativeEvent }) => {
                        setShowTopButton(nativeEvent.contentOffset.y > 100);
                    }}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyCard}>
                                <EmptyState
                                    icon={searchhistoryQuery ? 'search-off' : 'history'}
                                    title="No history data found!"
                                    text={searchhistoryQuery ? 'Nothing in the history matches your search.' : 'Approved and rejected credit limit requests will appear here.'}
                                />
                            </View>
                        ) : null
                    }
                />
            ) : null}

            {activeTab1 === 'requests' ? (
                <>
                    {showTopButton && (
                        <TouchableOpacity
                            style={styles.topButton}
                            onPress={scrollToTop}
                            accessibilityRole="button"
                            accessibilityLabel="Scroll to top"
                        >
                            <Icon name="arrow-upward" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}
                </>

            ) : activeTab1 === 'history' ? (<>
                {showTopButton && (
                    <TouchableOpacity
                        style={styles.topButton}
                        onPress={scrollHistoryToTop}
                        accessibilityRole="button"
                        accessibilityLabel="Scroll to top"
                    >
                        <Icon name="arrow-upward" size={22} color="#fff" />
                    </TouchableOpacity>
                )}</>) : null}

            {/* ───────────── Confirm / result dialog ───────────── */}
            {getSuccess === true ? (
                <Modal
                    visible={showOverlay}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowOverlay(false)}
                >
                    <View style={styles.overlayContainer}>
                        <View style={styles.dialog}>
                            <View style={styles.dialogHead}>
                                <View style={[styles.dialogIcon, { backgroundColor: `${isAccept ? T.green : T.red}16` }]}>
                                    <Icon name={isAccept ? 'check-circle' : 'cancel'} size={24} color={isAccept ? T.green : T.red} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.eyebrow}>CREDIT LIMIT REQUEST</Text>
                                    <Text style={styles.dialogTitle}>
                                        {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.dialogParty} numberOfLines={2}>
                                Party: {selectedItem?.parname}
                            </Text>
                            {responsemessage === 'Loading...' ? (
                                <View style={styles.dialogStatus}>
                                    <ActivityIndicator size="small" color={T.copper} />
                                    <Text style={styles.loadingText}>{responsemessage}</Text>
                                </View>
                            ) : (
                                <View style={[styles.dialogStatus, styles.dialogResult]}>
                                    <Icon
                                        name={responsemessage === 'Server Error' ? 'error-outline' : 'info-outline'}
                                        size={18}
                                        color={responsemessage === 'Server Error' ? T.red : T.nav}
                                    />
                                    <Text style={[styles.responseText, responsemessage === 'Server Error' && { color: T.red }]}>
                                        {responsemessage}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            ) : (
                <Modal
                    visible={showOverlay}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowOverlay(false)}
                >
                    <View style={styles.overlayContainer}>
                        <View style={styles.dialog}>
                            <View style={styles.dialogHead}>
                                <View style={[styles.dialogIcon, { backgroundColor: `${isAccept ? T.green : T.red}16` }]}>
                                    <Icon name={isAccept ? 'check-circle' : 'cancel'} size={24} color={isAccept ? T.green : T.red} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.eyebrow}>CREDIT LIMIT REQUEST</Text>
                                    <Text style={styles.dialogTitle}>
                                        {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.dialogParty} numberOfLines={2}>
                                Party: {selectedItem?.parname}
                            </Text>
                            {selectedItem ? (
                                <View style={styles.dialogBox}>
                                    <Cell label="Old Limit" value={rupee(selectedItem.limit1)} color={T.green} />
                                    <Cell label="Req. Limit" value={`₹ ${pendingLimit}`} color={T.copper} />
                                    <Cell label="Req. Cr. Days" value={pendingDays} color={T.copper} />
                                </View>
                            ) : null}
                            <View style={styles.dialogButtons}>
                                <Btn
                                    label="Cancel"
                                    kind="ghost"
                                    onPress={() => setShowOverlay(false)}
                                    style={styles.dialogBtn}
                                />
                                <Btn
                                    label={isAccept ? 'Confirm accept' : 'Confirm reject'}
                                    icon={isAccept ? 'check' : 'close'}
                                    kind={isAccept ? 'primary' : 'danger'}
                                    onPress={handleConfirmAction}
                                    style={[styles.dialogBtn, isAccept && { backgroundColor: T.green }]}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* PARTY HISTORY */}
            <PartyHistoryModal
                visible={showPartyHistoryModal}
                onClose={() => {
                    setShowPartyHistoryModal(false);
                    setAllHistoryData([]);
                }}
                partyList={partyList}
                historyData={historyData}
                // allhistoryData={allhistoryData}
                partyLoading={partyLoading}
                historyLoading={historyLoading}
                // allhistoryLoading={allhistoryLoading}
                // showAllHistoryOnly={!!allhistoryData.length}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                // setParname={setParname}
                getParname={getParname}
            />

            <BusyOverlay visible={isLoading} text="Loading..." />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    list: { flex: 1, backgroundColor: T.bg },
    listContent: {
        paddingTop: 10,
        paddingBottom: 96,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
    gridCell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // toolbar
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 10,
    },
    toolbarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    toolbarPhone: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
    segWrap: { width: 280 },

    // request card
    card: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardAccepted: { borderColor: `${T.green}66`, backgroundColor: '#FBFDFB' },
    cardRejected: { borderColor: `${T.red}66`, backgroundColor: '#FFFBFA' },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardHeadInfo: { flex: 1, minWidth: 0 },
    partyName: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
    metricBox: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    metricRow: { flexDirection: 'row', gap: 10 },
    reqBox: {
        gap: 8,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: `${T.copper}40`,
        backgroundColor: `${T.copper}08`,
    },
    reqRow: { flexDirection: 'row', gap: 8 },
    reqLimitField: { flex: 1.6, minWidth: 0 },
    reqDaysField: { flex: 1, minWidth: 0 },
    reqInput: { fontWeight: '800', color: T.pd },
    words: { fontSize: 11.5, fontWeight: '700', fontStyle: 'italic', color: T.copper, lineHeight: 16 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    lines: { gap: 6 },
    actions: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 11,
        marginTop: 'auto',
    },
    actionBtn: { flex: 1, paddingHorizontal: 8 },

    topButton: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: T.nav,
        alignItems: 'center',
        justifyContent: 'center',
        ...S.sheet,
    },

    // dialog
    overlayContainer: {
        flex: 1,
        backgroundColor: 'rgba(13,27,42,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    dialog: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: T.surface,
        borderRadius: 16,
        padding: 18,
        gap: 12,
        ...S.sheet,
    },
    dialogHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dialogIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dialogTitle: { fontSize: 17, fontWeight: '900', color: T.nav, marginTop: 2 },
    dialogParty: { fontSize: 13.5, fontWeight: '700', color: T.ink },
    dialogBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    dialogButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
    dialogBtn: { flex: 1 },
    dialogStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.hair,
    },
    dialogResult: {},
    loadingText: { fontSize: 13.5, fontWeight: '800', color: T.nav },
    responseText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: T.nav },
});

export default CreditLimitRequestNEW;
