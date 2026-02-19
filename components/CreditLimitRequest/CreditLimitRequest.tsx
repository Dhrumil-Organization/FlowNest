import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
    TextInput as RNTextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import { API } from '../../common/API/dynamicAPI';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list';
}

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

interface PartyData {
    ParCode: string;
    ParName: string;
    Address: string;
    Mhname: string;
    Shname: string;
}

interface AllHistoryData {
    uid: string;
    prptype: string;
    prptypename: string;
    prpcode: string;
    date: string;
    parcode: string;
    parname: string;
    limit1: string;
    limit2: string;
    limit3: string;
    crday1: string;
    crday2: string;
    crday3: string;
    isauth: string;
    status: string;
    ausrname: string;
    adate: string;
    remark: string;
    yearno: string;
    revertdate: string;
    sexename: string;
    BrkAccName: string;
    crdays: string;
}

const CreditLimitRequest: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const filterKey = 'all';
    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [allhistoryLoading, setIsAllHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [getSuccess, setSuccess] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [historyData, setHistoryData] = useState<CardData[]>([]);
    const [allhistoryData, setAllHistoryData] = useState<CardData[]>([]);
    const [partyList, setPartyList] = useState<CardData[]>([]);
    const [editableValues, setEditableValues] = useState<{ [uid: string]: { limit2?: string; crday2?: string } }>({});
    const [showOverlay, setShowOverlay] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'list' | null>(null);
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [showTopButton, setShowTopButton] = useState(false);
    const [showPartyHistoryModal, setShowPartyHistoryModal] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);
    const [activeTab, setActiveTab] = useState<'party' | 'history'>('party');
    const [activeTab1, setActiveTab1] = useState<'requests' | 'history'>('requests');
    const [limitInWords, setLimitInWords] = useState('');
    // const [historyData, setHistoryData] = useState<AllHistoryData[]>([]);
    // const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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

    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payload = { txntype: 'creditlimitrequest', referrer: 'dashboard' };
            const response = await axios.get(
                `${API}/api/crlimitreqbrowse`,
                getRequestConfig({ params: { txntype: 'creditlimitrequest', referrer: 'dashboard' } })
            );
            console.log('🔵 payload', payload);
            if (response.data.success && response.data.data.length > 0) {
                console.log('✅ Data:', response.data.data);
                setData(response.data.data);
                setAllHistoryData([])
            } else {
                setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
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
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const fetchAllHistoryData = async () => {
        // setActiveTab('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const allhistoryPayload = {
                txntype: 'creditlimithistory',
                referrer: 'dashboard',
                action: 'allpartyhistory',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/crlimitreqbrowse`,
                `${API}/api/crlimitreqbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history payload', allhistoryPayload);
            if (response.data.success && response.data.data.length > 0) {
                console.log('✅All History Data:', response.data.data);
                setAllHistoryData(response.data.data);
                setData([]);

            } else {
                setAllHistoryData([]);
                // setPartyList([]);
                // setHistoryData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab1 === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1 === 'requests') {
            fetchData();
        }
    }, [activeTab1]);

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


    console.log('editableValues', editableValues, 'limitInWords', limitInWords);

    // useEffect(() => {
    //     if (!selectedItem) return;

    //     const editedLimit2 = editableValues[selectedItem.uid]?.limit2;
    //     const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : selectedItem.limit2;
    //     const numericValue = parseFloat(rawValue);

    //     if (!isNaN(numericValue)) {
    //         setLimitInWords(numberToWordsIndian(numericValue) + '');
    //     } else {
    //         setLimitInWords('');
    //     }
    // }, [editableValues, selectedItem]);


    // const callhisttoryfunction = () => {
    //     setShowPartyHistoryModal(true);
    //     setActiveTab('allhistory');
    //     fetchAllHistoryData();
    // };

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
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsPartyLoading(false);
        }
    };

    // useEffect(() => {
    //     fetchData();
    //     return () => cancelToken?.cancel();
    // }, []);

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter((item) =>
            filterKey === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
                : String(item[filterKey]).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery, filterKey]);

    const filteredhistoryData = useMemo(() => {
        if (!searchhistoryQuery) return allhistoryData;
        return allhistoryData.filter((item) =>
            filterKey === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchhistoryQuery.toLowerCase()))
                : String(item[filterKey]).toLowerCase().includes(searchhistoryQuery.toLowerCase())
        );
    }, [allhistoryData, searchhistoryQuery, filterKey]);


    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };
    const handleEdit = (uid: string, field: 'limit2' | 'crday2', formattedValue: string) => {
        const rawValue = formattedValue.replace(/[₹,]/g, '');
        const rawValuecrday = formattedValue.replace(/[₹,]/g, '');
        const displayValue = formatToIndianCurrency(rawValue || '0');
        const displayValuecrday = (formattedValue);
        setEditableValues(prev => ({
            ...prev,
            [uid]: {
                ...prev[uid],
                [field]: field === 'limit2' ? displayValue : displayValuecrday,
                [`${field}Raw`]: field === 'limit2' ? rawValue : rawValuecrday,
            },
        }));
    };

    const handleIconPress = (item: CardData, action: 'accept' | 'reject' | 'list') => {
        if (action === 'list') {
            setSelectedItem(item);
            setSelectedAction(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            setShowPartyHistoryModal(true);
            setParname(item.parname);
            return;
        } else {
            setSelectedItem(item);
            setSelectedAction(action);
            setShowOverlay(true);
            return;
        }
    };

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
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be equal to Old Limit for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (updatedItem.limit2 === '0' || parseFloat(updatedItem.limit2) === 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (parseFloat(updatedItem.limit2) < 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (!updatedItem.limit2 || updatedItem.limit2.trim() === '') {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be empty or invalid for Party Name: ' + updatedItem.parname
                )
                return false;
            }
        }

        return true;

    };

    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const scrollHistoryToTop = () => {
        flatHistoryListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
                if (response.success) {
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


    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {

        const editedLimit2 = editableValues[item.uid]?.limit2 || item.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : item.limit2;
        const numericValue = parseFloat(rawValue);
        const itemLimitInWords = !isNaN(numericValue) ? numberToWordsIndian(numericValue) : '';

        return (
            <View style={[
                crlimtreq_styles.card, !isConnected && crlimtreq_styles.disabledCard,
                item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
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
                    <TouchableOpacity onPress={() => handleIconPress(item, 'accept')} disabled={!isConnected || item.isProcessed}>
                        <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleIconPress(item, 'reject')} disabled={!isConnected || item.isProcessed}>
                        <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleIconPress(item, 'list')} disabled={!isConnected || item.isProcessed}>
                        <Icon name="list" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#2196F3"} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
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
    );


    // eslint-disable-next-line react/no-unstable-nested-components
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
        <>
            {activeTab1 === 'requests' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQuery}
                    placeholder="Search request..."
                />
            ) : activeTab1 === 'history' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQuery}
                    placeholder="Search history..."
                />
            ) : null}
            <View style={crlimtreq_styles.container}>
                {isLoading && <FullScreenLoader message={activeTab1 === 'history' ? "Loading History..." : "Loading Request..."} />}
                <TabBar activeTab={activeTab1} setActiveTab={setActiveTab1} />
                {/* <TouchableOpacity
                    style={crlimtreq_styles.closeButton}
                    onPress={() => navigation.goBack()}
                    disabled={!isConnected}
                >
                    <Text style={crlimtreq_styles.closeButtonText}>Home</Text>
                </TouchableOpacity> */}
                {/* <TouchableOpacity
                    style={crlimtreq_styles.historyButton}
                    onPress={callhisttoryfunction}
                >
                    <Icon name="history" size={24} color="white" />
                </TouchableOpacity> */}
                {activeTab1 === 'requests' ? (
                    <FlatList
                        ref={flatListRef}
                        data={filteredData}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.uid}
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
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButton(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoading ? (
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
            </View>
        </>
    );
};
export default CreditLimitRequest;
