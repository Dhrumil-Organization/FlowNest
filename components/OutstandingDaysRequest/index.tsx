import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    TextInput as RNTextInput,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

import { API } from '@/common/API/dynamicAPI';
import { crlimtreq_styles } from '@/common/Style';
import FullScreenLoader from '@/components/FullScreenLoader';
import Header from '@/components/Header';
import PartyHistoryModal from '@/components/OutstandingDaysRequest/PartyHistoryModal'; // 👈 path adjust
import { theme } from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';


interface Props {
    token: string;
    username?: string;
    duration?: number;
}

interface CardData {
    uid: string;
    prptypename: string;
    date: string;
    parname: string;
    limit1: string;
    limit2: string;
    remark: string;
    prpcode: string;
    prptype: string;
    yearno: string;
    parcode: string;
    outstanding: string;
    overdue: string;
    sexename: string;
    BrkAccName: string;
    crdays: string;
    crday1: string;
    crday2: string;
    isProcessed?: boolean;
    actionType?: 'accept' | 'reject';
}

interface AllHistoryData {
    uid: string;
    prptypename: string;
    date: string;
    parname: string;
    limit1: string;
    limit2: string;
    limit3: string;
    isauth: string;
    adate: string;
    ausrname: string;
    revertdate: string;
    status: string;
    remark: string;
    BrkAccName: string;
    sexename: string;
}

// export default function CreditLimit() {
const OutstandingDaysRequest: React.FC<Props> = ({ token, username }) => {
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);

    const [data, setData] = useState<CardData[]>([]);
    const [allhistoryData, setAllHistoryData] = useState<AllHistoryData[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [partyList, setPartyList] = useState<any[]>([]);
    const [getParname, setParname] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [billsSearchQuery, setBillsSearchQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [billsLoading, setBillsLoading] = useState(false);

    const [editableValues, setEditableValues] = useState<any>({});
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'list' | 'info' | null>(null);

    const [showOverlay, setShowOverlay] = useState(false);
    const [showPartyHistoryModal, setShowPartyHistoryModal] = useState(false);
    const [showBillsAccordion, setShowBillsAccordion] = useState(false);
    const [billsData, setBillsData] = useState<any[]>([]);
    const [mainParData, setMainParData] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'party' | 'history'>('party');
    const [activeTab1, setActiveTab1] = useState<'requests' | 'history'>('requests');

    const [responsemessage, setresponsemessage] = useState('');
    const [getSuccess, setSuccess] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);
    const [isInfoLoading, setInfoLoading] = useState(false);
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
            const res = await axios.get(`${API}/api/osdaysreqbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { txntype: 'outstandingdaysrequest', referrer: 'dashboard' }
            });
            console.log("res", res);

            setData(res.data.success ? res.data.data : []);
            setAllHistoryData([]);

        } catch {
            Alert.alert("Error", "Server error");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 FETCH ALL HISTORY
    const fetchAllHistoryData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API}/api/osdaysreqbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    txntype: 'outstandingdaysrequesthistory',
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
                txntype: 'outstandingdaysrequesthistory',
                referrer: 'dashboard',
                action: 'partyhistory',
                prptype: prptype
            };
            const response = await axios.get(
                `${API}/api/osdaysreqbrowse`,
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
                Alert.alert('Error', 'Server error');
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
    //             Alert.alert('Error', 'Server error');
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
                txntype: 'outstandingdaysrequest',
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
                Alert.alert('Error', 'Server error');
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
        if (field === 'limit2') {
            // Allow empty value temporarily
            if (value === '') {
                setEditableValues(prev => ({
                    ...prev,
                    [uid]: { ...prev[uid], [field]: value }
                }));
                return;
            }
            // Parse as integer to remove leading zeros or decimals
            const numericValue = parseInt(value, 10);
            if (isNaN(numericValue) || numericValue < 0) {
                Alert.alert('Invalid Input', 'Please enter a valid positive integer.');
                return;
            }
            setEditableValues(prev => ({
                ...prev,
                [uid]: { ...prev[uid], [field]: numericValue.toString() }
            }));
        } else {
            setEditableValues(prev => ({
                ...prev,
                [uid]: { ...prev[uid], [field]: value }
            }));
        }
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
            const numericNewLimit2 = parseInt(updatedItem.limit2, 10);
            const numericLimit1 = parseFloat(updatedItem.limit1.replace(/,/g, ''));

            if (isNaN(numericNewLimit2)) {
                Alert.alert(
                    'Validation Error',
                    'Requested OS Days cannot be empty or invalid for Party Name: ' + updatedItem.parname
                );
                return false;
            } else if (numericNewLimit2 === 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested OS Days cannot be 0 for Party Name: ' + updatedItem.parname
                );
                return false;
            } else if (numericNewLimit2 < 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested OS Days cannot be negative for Party Name: ' + updatedItem.parname
                );
                return false;
            }
        }
        return true;
    };

    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        const currentLimit2 = editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2;
        if (currentLimit2 === '' || currentLimit2 === undefined) {
            Alert.alert('Validation Error', 'Requested OS Days cannot be empty.');
            return;
        }

        const updatedItemAccept = {
            ...selectedItem,
            limit2: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            limit3: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            // crday2: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            // crday3: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            isauth: 1,
            referrer: 'dashboard',
            txntype: 'outstandingdaysrequest',
            action: 'edit'
        };
        const updatedItemReject = {
            ...selectedItem,
            limit2: parseInt(selectedItem.limit2, 10).toString(),
            limit3: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            // crday2: formatToIndianCurrency(selectedItem.crday2 || '0'),
            // crday3: editableValues[selectedItem.uid]?.crday2 || (selectedItem.crday2 || '0'),
            isauth: 2,
            referrer: 'dashboard',
            txntype: 'outstandingdaysrequest',
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

                const response = await axios.post(`${API}/api/osdaysreqedit`, payload, { headers });
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


    // Fetch Bills Data for Accordion
    const fetchBillsData = async (parcode: string, prptype: string, uid: string, prpcode: string) => {
        setInfoLoading(true);   // for icon spinner
        setBillsLoading(true);  // for modal loader
        try {
            const payload = {
                uid: uid,                     // ✅ passed directly
                prpcode: prpcode,             // ✅ passed directly
                acccode: parcode,
                txntype: 'outstandingdaysrequestbills',
                referrer: 'dashboard',
                action: 'partybills',
                prptype: prptype,
            };

            const response = await axios.get(
                `${API}/api/osdaysreqbills`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: payload,
                }
            );

            if (response.data.success) {
                const data = response.data.data;
                setMainParData(data.mainpardata);
                setBillsData(data.osbills || []);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to fetch bills');
                closeBillsModal();
            }
        } catch (error) {
            Alert.alert('Error', 'Server error');
            closeBillsModal();
        } finally {
            setInfoLoading(false);
            setBillsLoading(false);
        }
    };

    const closeBillsModal = () => {
        setShowBillsAccordion(false);
        setBillsData([]);
        setMainParData(null);
        setBillsSearchQuery('');
    };

    // Handle Info Icon Click
    // const handleInfoIconClick = (item: CardData) => {
    //     setSelectedItem(item);
    //     setSelectedAction('info');
    //     fetchBillsData(item.parcode, item.prptype);
    // };
    const handleInfoIconClick = (item: CardData) => {
        setSelectedItem(item);
        setSelectedAction('info');
        // Clear old data
        setBillsData([]);
        setMainParData(null);
        setShowBillsAccordion(true);
        // Pass required fields directly
        fetchBillsData(item.parcode, item.prptype, item.uid, item.prpcode);
    };

    // Render Bills Accordion
    // Update the renderBillsAccordion function
    // const renderBillsAccordion = () => {
    //     if (!showBillsAccordion || !billsData.length) return null;

    //     const filteredBillsData = billsSearchQuery
    //         ? billsData.filter((bill) =>
    //             Object.values(bill).some((value) =>
    //                 String(value).toLowerCase().includes(billsSearchQuery.toLowerCase())
    //             )
    //         )
    //         : billsData;

    //     const numAccordionColumns = width < 600 ? 1 : width < 1000 ? 2 : 3;

    //     // Helper to format keys into readable labels
    //     const formatLabel = (key: string) =>
    //         key
    //             .split(/(?=[A-Z])|_/)
    //             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    //             .join(' ');

    //     // Helper to detect if value is numeric (for right-alignment)
    //     const isNumeric = (val: any) => !isNaN(parseFloat(val)) && isFinite(val);

    //     return (
    //         <Modal
    //             visible={showBillsAccordion}
    //             animationType="slide"
    //             transparent={false}
    //             onRequestClose={closeBillsModal}
    //         >
    //             <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    //                 <Header
    //                     userName={username}
    //                     onSearch={setBillsSearchQuery}
    //                     placeholder="Search bills..."
    //                 />

    //                 {billsLoading ? (
    //                     <FullScreenLoader message="Loading bills..." />
    //                 ) : (
    //                     <>
    //                         {/* Main Party Header */}
    //                         {mainParData && (
    //                             <View style={styles.billsHeaderContainer}>
    //                                 <Text style={styles.billsHeaderTitle}>{mainParData.mainparname}</Text>
    //                                 <Text style={styles.billsHeaderSub}>
    //                                     Party Code: {mainParData.mainparcode}
    //                                 </Text>
    //                             </View>
    //                         )}

    //                         {/* Bills List */}
    //                         <FlatList
    //                             data={filteredBillsData}
    //                             keyExtractor={(item, index) => `${item.billno || index}-${index}`}
    //                             numColumns={numAccordionColumns}
    //                             key={numAccordionColumns}
    //                             contentContainerStyle={{ padding: 8 }}
    //                             renderItem={({ item }) => (
    //                                 <View style={styles.billCard}>
    //                                     {Object.entries(item).map(([key, value]) => (
    //                                         <View key={key} style={styles.billRow}>
    //                                             <Text style={styles.billLabel}>{formatLabel(key)}</Text>
    //                                             <Text
    //                                                 style={[
    //                                                     styles.billValue,
    //                                                     isNumeric(value) && styles.billValueNumeric,
    //                                                 ]}
    //                                             >
    //                                                 {isNumeric(value)
    //                                                     ? formatToIndianCurrency(String(value))
    //                                                     : value}
    //                                             </Text>
    //                                         </View>
    //                                     ))}
    //                                 </View>
    //                             )}
    //                             ListEmptyComponent={
    //                                 <View style={styles.emptyContainer}>
    //                                     <Text style={styles.emptyText}>No bills found</Text>
    //                                 </View>
    //                             }
    //                         />
    //                     </>
    //                 )}

    //                 {/* Close button – now RED */}

    //                 <TouchableOpacity
    //                     style={styles.closeButton}
    //                     onPress={closeBillsModal}
    //                 >
    //                     <Icon name="close" size={28} color="white" />
    //                 </TouchableOpacity>
    //             </View>
    //         </Modal>
    //     );
    // };

    // Add these styles to your StyleSheet (or crlimtreq_styles)
    // Update the renderBillsAccordion function
    // Update the renderBillsAccordion function
    const renderBillsAccordion = () => {
        if (!showBillsAccordion) return null;

        const filteredBillsData = billsSearchQuery
            ? billsData.filter((bill) =>
                Object.values(bill).some((value) =>
                    String(value).toLowerCase().includes(billsSearchQuery.toLowerCase())
                )
            )
            : billsData;

        const numAccordionColumns = width < 600 ? 1 : width < 1000 ? 2 : 3;

        const formatLabel = (key: string) =>
            key
                .split(/(?=[A-Z])|_/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

        const isNumeric = (val: any) => !isNaN(parseFloat(val)) && isFinite(val);

        return (
            <Modal
                visible={showBillsAccordion}
                animationType="slide"
                transparent={false}
                onRequestClose={closeBillsModal}
            >
                <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                    <Header
                        userName={username}
                        onSearch={setBillsSearchQuery}
                        placeholder="Search bills..."
                    />

                    {billsLoading ? (
                        <FullScreenLoader message="Loading bills..." />
                    ) : (
                        <>
                            {mainParData && (
                                <View style={styles.billsHeaderContainer}>
                                    <Text style={styles.billsHeaderTitle}>{mainParData.mainparname}</Text>
                                    <Text style={styles.billsHeaderSub}>
                                        Party Code: {mainParData.mainparcode} | Bills: {filteredBillsData.length}
                                    </Text>
                                </View>
                            )}

                            <FlatList
                                data={filteredBillsData}
                                keyExtractor={(item, index) => `${item.billno || index}-${index}`}
                                numColumns={numAccordionColumns}
                                key={numAccordionColumns}
                                contentContainerStyle={{ padding: 8 }}
                                renderItem={({ item }) => (
                                    <View style={styles.billCard}>
                                        {Object.entries(item).map(([key, value]) => {
                                            // Skip formatting for osdays and diffdays
                                            const shouldSkipFormatting = key.toLowerCase() === 'osdays' || key.toLowerCase() === 'diffdays';

                                            let displayValue: string;
                                            if (shouldSkipFormatting) {
                                                // Parse as float, convert to integer, and display as string
                                                const numericValue = parseFloat(String(value));
                                                displayValue = !isNaN(numericValue) ? Math.floor(numericValue).toString() : String(value);
                                            } else {
                                                displayValue = isNumeric(value) ? formatToIndianCurrency(String(value)) : String(value);
                                            }

                                            return (
                                                <View key={key} style={styles.billRow}>
                                                    <Text style={styles.billLabel}>{formatLabel(key)}</Text>
                                                    <Text
                                                        style={[
                                                            styles.billValue,
                                                            isNumeric(value) && styles.billValueNumeric,
                                                        ]}
                                                    >
                                                        {displayValue}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No bills found</Text>
                                    </View>
                                }
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={closeBillsModal}
                    >
                        <Icon name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    };

    // Add these styles to your StyleSheet (or crlimtreq_styles)
    const styles = {
        billsHeaderContainer: {
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
        },
        billsHeaderTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: '#1a1a1a',
        },
        billsHeaderSub: {
            fontSize: 14,
            color: '#6c757d',
            marginTop: 2,
        },
        billCard: {
            flex: 1,
            margin: 6,
            backgroundColor: '#ffffff',
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            borderWidth: 1,
            borderColor: '#f0f0f0',
        },
        billRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: '#f5f5f5',
        },
        billLabel: {
            fontSize: 13,
            color: '#495057',
            fontWeight: '500',
            flex: 0.45,
        },
        billValue: {
            fontSize: 13,
            color: '#212529',
            flex: 0.55,
            textAlign: 'left',
        },
        billValueNumeric: {
            textAlign: 'right',
            fontWeight: '500',
            color: '#0d6efd',
        },
        closeButton: {
            position: 'absolute',
            bottom: 24,
            right: 24,
            backgroundColor: '#F44336', // RED as requested
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
        },
        emptyContainer: {
            padding: 30,
            alignItems: 'center',
        },
        emptyText: {
            fontSize: 16,
            color: '#6c757d',
        },
    };

    // Add these styles to your StyleSheet (or crlimtreq_styles)


    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9]/g, '') // Remove all non-numeric characters
            : String(value).replace(/[^0-9]/g, '');
        const num = parseInt(numericValue, 10) || 0;
        return num.toLocaleString('en-IN', { maximumFractionDigits: 0 }); // Ensure no decimals
    };
    // 🔥 CARD UI (DITTO)
    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {

        const editedLimit2 = editableValues[item.uid]?.limit2 || item.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : item.limit2;
        console.log('rawValue:', rawValue);
        const numericValue = parseInt(rawValue, 10);
        console.log('numericValue:', numericValue);
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
                                <Text style={crlimtreq_styles.key}>OS Days:</Text>
                                <Text style={crlimtreq_styles.valuegreen}>
                                    {/* {formatToIndianCurrency(item.limit1 || '0')} */}
                                    {parseInt(item.limit1 || '0', 10)}
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
                                <Text style={crlimtreq_styles.key}>Requested OS Days:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValue}
                                    value={editableValues[item.uid]?.limit2 !== undefined
                                        ? editableValues[item.uid].limit2
                                        : parseInt(item.limit2, 10).toString()
                                    }
                                    onChangeText={(text) => {
                                        // Allow empty input temporarily
                                        if (text === '') {
                                            handleEdit(item.uid, 'limit2', text);
                                            return;
                                        }
                                        // Only allow integers (no decimals)
                                        if (!/^\d*$/.test(text)) {
                                            Alert.alert('Invalid Input', 'Please enter a valid integer (no decimals allowed).');
                                            return;
                                        }
                                        handleEdit(item.uid, 'limit2', text);
                                    }}
                                    keyboardType="numeric"
                                    autoFocus={false} // Prevent auto-focus to avoid keyboard issues
                                />
                            </View>
                        </View>
                        {/* <View style={crlimtreq_styles.fullWidthRow}>
                          
                            <Text style={crlimtreq_styles.valueWord}>{itemLimitInWords}</Text>
                        </View> */}
                        {/* <View style={crlimtreq_styles.twoColumnRow}>
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
                        </View> */}
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
                        {/* New Info Icon */}
                        <TouchableOpacity
                            onPress={() => handleInfoIconClick(item)}
                            disabled={item.isProcessed || isInfoLoading}
                        >
                            {isInfoLoading ? (
                                <ActivityIndicator size={40} color="#FF9800" />
                            ) : (
                                <Icon name="info" size={40} color={item.isProcessed ? "#ccc" : "#FF9800"} />
                            )}
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
                            <Text style={crlimtreq_styles.key}>OS. Days:</Text>
                            <Text style={crlimtreq_styles.valuegreen}>{parseInt(item.limit1, 10)}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Requested OS. Days:</Text>
                            <Text style={crlimtreq_styles.editableValue1}>{parseInt(item.limit2, 10)}</Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. OS. Day:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{parseInt(item.limit3, 10)}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Revert Date:</Text>
                            <Text style={crlimtreq_styles.value}>{item.revertdate || 'N/A'}</Text>
                        </View>
                        {/* <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. Days:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>{item.crday3}</Text>
                        </View> */}
                    </View>
                    {/* <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Old Cr. Days:</Text>
                            <Text style={crlimtreq_styles.valuegreen}>{item.crday1}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Req. Cr. Days:</Text>
                            <Text style={crlimtreq_styles.editableValue1}>{item.crday2}</Text>
                        </View>
                    </View> */}
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
                        {/* <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Revert Date:</Text>
                            <Text style={crlimtreq_styles.value}>{item.revertdate || 'N/A'}</Text>
                        </View> */}
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
        <View style={{ flex: 1 }}>

            {/* HEADER */}
            {/* <Header
                userName={username}
                onSearch={activeTab1 === 'requests' ? setSearchQuery : setSearchhistoryQuery}
            /> */}
            {activeTab1 === 'requests' ? (
                <Header
                    userName={username}
                    onSearch={setSearchQuery}
                    placeholder="Search request..."
                />
            ) : activeTab1 === 'history' ? (
                <Header
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

            {/* Bills Accordion Modal */}
            {renderBillsAccordion()}

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

export default OutstandingDaysRequest;