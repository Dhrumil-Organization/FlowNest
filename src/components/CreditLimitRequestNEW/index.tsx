import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    TextInput as RNTextInput,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

// import { API } from '@/common/API/dynamicAPI';
import { crlimtreq_styles } from '@/common/Style';
import PartyHistoryModal from '@/components/CreditLimitRequest/PartyHistoryModal'; // 👈 path adjust
import FullScreenLoader from '@/components/FullScreenLoader';
import { theme } from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import HeaderNew from '../../components/HeaderNew';

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
    // 🔥 CARD UI (DITTO)
    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {

        const editedLimit2 = editableValues[item.uid]?.limit2 || item.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : item.limit2;
        const numericValue = parseFloat(rawValue);
        const itemLimitInWords = !isNaN(numericValue) ? numberToWordsIndian(numericValue) : '';

        return (
            <View style={crlimtreq_styles.gridCardWrapper}>
                <View style={[
                    crlimtreq_styles.card,
                    item.actionType === 'accept'
                        ? crlimtreq_styles.acceptedCard
                        : item.actionType === 'reject'
                            ? crlimtreq_styles.rejectedCard
                            : null
                ]}>
                    {item.isProcessed && (
                        <View style={[
                            crlimtreq_styles.stampContainer,
                        ]}>
                            <View style={[
                                crlimtreq_styles.stamp,
                                item.actionType === 'accept' ? crlimtreq_styles.stampAccepted : crlimtreq_styles.stampRejected
                            ]}>
                                <Text style={crlimtreq_styles.stampText}>
                                    {item.actionType === 'accept' ? 'APPROVED' : 'REJECTED'}
                                </Text>
                            </View>
                        </View>
                    )}
                    <View style={crlimtreq_styles.dateContainer}>
                        <Text style={crlimtreq_styles.dateText}>{item.date}</Text>
                    </View>
                    <View style={crlimtreq_styles.cardHeaderContainer}>
                        <View style={crlimtreq_styles.cardHeader}>
                            <Text style={crlimtreq_styles.cardHeaderText}>{item.prptypename}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.cardSubHeader}>
                        <Text style={crlimtreq_styles.cardSubHeaderText}>{item.parname}</Text>
                    </View>
                    <View style={crlimtreq_styles.cardContent}>
                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Outstanding:</Text>
                                <Text style={crlimtreq_styles.value}>
                                    {formatToIndianCurrency(item.outstanding || '0')}
                                </Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Old Limit:</Text>
                                <Text style={crlimtreq_styles.valuegreen}>
                                    {formatToIndianCurrency(item.limit1 || '0')}
                                </Text>
                            </View>
                        </View>
                        <View style={crlimtreq_styles.twoColumnRow}>

                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Overdue:</Text>
                                <Text style={crlimtreq_styles.value}>
                                    {formatToIndianCurrency(item.overdue || '0')}
                                </Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Req. Limit:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValue}
                                    value={
                                        editableValues[item.uid]?.limit2 !== undefined
                                            ? editableValues[item.uid].limit2
                                            : formatToIndianCurrency(item.limit2 || '0')
                                    }
                                    onChangeText={(text) => handleEdit(item.uid, 'limit2', text)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <View style={crlimtreq_styles.fullWidthRow}>
                            {/* <Text style={crlimtreq_styles.key}>Remark:</Text> */}
                            <Text style={crlimtreq_styles.valueWord}>{itemLimitInWords}</Text>
                        </View>
                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Cr. Days:</Text>
                                <Text style={crlimtreq_styles.valuegreen}>{item.crday1}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Req. Cr. Days:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValue}
                                    value={editableValues[item.uid]?.crday2 !== undefined ? editableValues[item.uid].crday2 : item.crday2}
                                    onChangeText={(text) => handleEdit(item.uid, 'crday2', text)}
                                    keyboardType="numeric"
                                    placeholder={String(item.crday2)}
                                />
                            </View>
                        </View>
                        <View style={crlimtreq_styles.fullWidthRow}>
                            <Text style={crlimtreq_styles.key}>Remark:</Text>
                            <Text style={crlimtreq_styles.value}>{item.remark}</Text>
                        </View>
                        <View style={crlimtreq_styles.fullWidthRow}>
                            <Text style={crlimtreq_styles.key}>Broker:</Text>
                            <Text style={crlimtreq_styles.valueBold}>{item.BrkAccName}</Text>
                        </View>
                        <View style={crlimtreq_styles.fullWidthRow}>
                            <Text style={crlimtreq_styles.key}>SExe:</Text>
                            <Text style={crlimtreq_styles.valueBold}>{item.sexename}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.cardActions}>
                        <TouchableOpacity onPress={() => handleIconPress(item, 'accept')} disabled={item.isProcessed}>
                            <Icon name="check-circle" size={40} color={item.isProcessed ? "#ccc" : "#4CAF50"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleIconPress(item, 'reject')} disabled={item.isProcessed}>
                            <Icon name="cancel" size={40} color={item.isProcessed ? "#ccc" : "#F44336"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleIconPress(item, 'list')} disabled={item.isProcessed}>
                            <Icon name="list" size={40} color={item.isProcessed ? "#ccc" : "#2196F3"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
        <View style={crlimtreq_styles.gridCardWrapper}>
            <View style={[
                crlimtreq_styles.card,
                item.isauth === '1' ? crlimtreq_styles.acceptedCard : item.isauth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
            ]}>
                {item.isauth && (
                    <View style={crlimtreq_styles.stampContainer}>
                        <View style={[
                            crlimtreq_styles.stamp,
                            item.isauth === '1' ? crlimtreq_styles.stampAccepted : item.isauth === '2' ? crlimtreq_styles.stampRejected : crlimtreq_styles.stampPendingall
                        ]}>
                            <Text style={crlimtreq_styles.stampText}>
                                {item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' ? 'REJECTED' : 'PENDING'}
                            </Text>
                        </View>
                    </View>
                )}
                <View style={crlimtreq_styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.date}</Text>
                </View>
                <View style={crlimtreq_styles.cardHeaderContainer}>
                    <View style={crlimtreq_styles.cardHeader}>
                        <Text style={crlimtreq_styles.cardHeaderText}>{item.prptypename}</Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.cardSubHeader}>
                    <Text style={crlimtreq_styles.cardSubHeaderText}>{item.parname}</Text>
                </View>
                <View style={crlimtreq_styles.cardContent}>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Old Limit:</Text>
                            <Text style={crlimtreq_styles.valuegreen}>{item.limit1}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Req. Limit:</Text>
                            <Text style={crlimtreq_styles.editableValue1}>{item.limit2}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. Limit:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{item.limit3}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. Days:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{item.crday3}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Old Cr. Days:</Text>
                            <Text style={crlimtreq_styles.valuegreen}>{item.crday1}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Req. Cr. Days:</Text>
                            <Text style={crlimtreq_styles.editableValue1}>{item.crday2}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>

                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Authorised Date:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{item.adate || 'N/A'}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Authorised By:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{item.ausrname || 'N/A'}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Status:</Text>
                            {item.status === 'Authorised' ? <Text style={crlimtreq_styles.valueAuthorised}>{item.status}</Text>
                                : item.status === 'Rejected' ? <Text style={crlimtreq_styles.valueRejected}>{item.status}</Text>
                                    : item.status === 'Pending' ? <Text style={crlimtreq_styles.value}>{item.status}</Text>
                                        : <Text style={crlimtreq_styles.value}>{item.status}</Text>}
                            {/* <Text style={crlimtreq_styles.value}>{item.status}</Text> */}
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Revert Date:</Text>
                            <Text style={crlimtreq_styles.value}>{item.revertdate || 'N/A'}</Text>
                        </View>
                    </View>


                    <View style={crlimtreq_styles.fullWidthRow}>
                        <Text style={crlimtreq_styles.key}>Remark:</Text>
                        <Text style={crlimtreq_styles.value}>{item.remark}</Text>
                    </View>
                    <View style={crlimtreq_styles.fullWidthRow}>
                        <Text style={crlimtreq_styles.key}>Broker:</Text>
                        <Text style={crlimtreq_styles.value}>{item.BrkAccName}</Text>
                    </View>
                    <View style={crlimtreq_styles.fullWidthRow}>
                        <Text style={crlimtreq_styles.key}>SExe:</Text>
                        <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

     
    const TabBar = ({ activeTab, setActiveTab }) => (
        <View style={crlimtreq_styles.tabContainer1}>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTab === 'requests' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTab('requests')}
            >
                <Text style={crlimtreq_styles.tabText1}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTab === 'history' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTab('history')}
            >
                <Text style={crlimtreq_styles.tabText1}>History</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

            {/* HEADER */}
            {/* <Header
                userName={username}
                onSearch={activeTab1 === 'requests' ? setSearchQuery : setSearchhistoryQuery}
            /> */}
            {activeTab1 === 'requests' ? (
                <HeaderNew
                    userName={username}
                    onSearch={setSearchQuery}
                    placeholder="Search request..."
                />
            ) : activeTab1 === 'history' ? (
                <HeaderNew
                    userName={username}
                    onSearch={setSearchhistoryQuery}
                    placeholder="Search history..."
                />
            ) : null}

            {isLoading && <FullScreenLoader message="Loading..." />}

            {/* TAB SWITCH */}
            {/* <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <TouchableOpacity onPress={() => setActiveTab1('requests')}>
                    <Text>Request</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab1('history')}>
                    <Text>History</Text>
                </TouchableOpacity>
            </View> */}
            <TabBar activeTab={activeTab1} setActiveTab={setActiveTab1} />

            {/* LIST */}
            {activeTab1 === 'requests' ? (
                <FlatList
                    ref={flatListRef}
                    data={filteredData}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.uid}
                    numColumns={numColumns}
                    key={numColumns} // 🔥 VERY IMPORTANT (re-render fix)
                    contentContainerStyle={crlimtreq_styles.list}
                    onScroll={({ nativeEvent }) => {
                        setShowTopButton(nativeEvent.contentOffset.y > 100);
                    }}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={crlimtreq_styles.emptyContainer}>
                                <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
                            </View>
                        ) : null
                    }
                />
            ) : activeTab1 === 'history' ? (
                <FlatList
                    ref={flatHistoryListRef}
                    data={filteredhistoryData}
                    renderItem={renderAllCardHistory}
                    keyExtractor={(item) => item.uid}
                    numColumns={numColumns}
                    key={numColumns}
                    contentContainerStyle={crlimtreq_styles.list}
                    onScroll={({ nativeEvent }) => {
                        setShowTopButton(nativeEvent.contentOffset.y > 100);
                    }}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={crlimtreq_styles.emptyContainer}>
                                <Text style={crlimtreq_styles.emptyText}>No history data found!</Text>
                            </View>
                        ) : null
                    }
                />
            ) : null}
            {activeTab1 === 'requests' ? (
                <>
                    {showTopButton && (
                        <TouchableOpacity
                            style={crlimtreq_styles.topButton}
                            onPress={scrollToTop}
                        >
                            <Icon name="arrow-upward" size={24} color="black" />
                        </TouchableOpacity>
                    )}
                </>

            ) : activeTab1 === 'history' ? (<>
                {showTopButton && (
                    <TouchableOpacity
                        style={crlimtreq_styles.topButton}
                        onPress={scrollHistoryToTop}
                    >
                        <Icon name="arrow-upward" size={24} color="black" />
                    </TouchableOpacity>
                )}</>) : null}

            {/* MODAL */}
            {/* <Modal visible={showOverlay} transparent>
                <View style={crlimtreq_styles.overlay}>
                    <Text>Confirm {selectedAction}</Text>

                    <TouchableOpacity onPress={handleConfirmAction}>
                        <Text>YES</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowOverlay(false)}>
                        <Text>NO</Text>
                    </TouchableOpacity>
                </View>
            </Modal> */}
            {getSuccess === true ? (
                <Modal
                    visible={showOverlay}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowOverlay(false)}
                >
                    <View style={crlimtreq_styles.overlayContainer}>
                        <View style={crlimtreq_styles.overlay}>
                            <Text style={crlimtreq_styles.overlayTitle}>
                                {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                            </Text>
                            <Text style={crlimtreq_styles.overlayPartyName}>
                                Party: {selectedItem?.parname}
                            </Text>
                            {responsemessage === 'Loading...' ? (
                                <>
                                    <Text style={crlimtreq_styles.loadingText}>
                                        <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} /> {responsemessage}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={crlimtreq_styles.responseText}>
                                        {responsemessage}
                                    </Text>
                                </>
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
                    <View style={crlimtreq_styles.overlayContainer}>
                        <View style={crlimtreq_styles.overlay}>
                            <Text style={crlimtreq_styles.overlayTitle}>
                                {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                            </Text>
                            <Text style={crlimtreq_styles.overlayPartyName}>
                                Party: {selectedItem?.parname}
                            </Text>
                            <View style={crlimtreq_styles.overlayButtons}>
                                <TouchableOpacity
                                    style={[crlimtreq_styles.overlayButton, { backgroundColor: '#4CAF50' }]}
                                    onPress={handleConfirmAction}
                                >
                                    <Icon name="check" size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[crlimtreq_styles.overlayButton, { backgroundColor: '#F44336' }]}
                                    onPress={() => setShowOverlay(false)}
                                >
                                    <Icon name="close" size={20} color="white" />
                                </TouchableOpacity>
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

        </View>
    );
}

export default CreditLimitRequestNEW;