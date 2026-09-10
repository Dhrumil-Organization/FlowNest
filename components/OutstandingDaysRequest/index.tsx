import AppAlert from '@/common/utils/appAlert';
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
import PartyHistoryModal from '@/components/OutstandingDaysRequest/PartyHistoryModal';
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
        if (width < 600) return 1;
        if (width < 1000) return 2;
        return 3;
    };

    const numColumns = getColumns();

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API}/api/osdaysreqbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { txntype: 'outstandingdaysrequest', referrer: 'dashboard' }
            });
            setData(res.data.success ? res.data.data : []);
            setAllHistoryData([]);
        } catch {
            AppAlert.alert("Error", "Server error");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch All History
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
                acccode: parcode,
                txntype: 'outstandingdaysrequesthistory',
                referrer: 'dashboard',
                action: 'partyhistory',
                prptype: prptype
            };
            const response = await axios.get(
                `${API}/api/osdaysreqbrowse`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.data.length > 0) {
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

    useEffect(() => {
        if (activeTab1 === 'history') {
            fetchAllHistoryData();
        }
    }, [activeTab1]);

    useEffect(() => {
        if (!selectedItem) {
            setLimitInWords('');
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
                `${API}/api/get_criterion`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.response.data.length > 0) {
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

    // Search Logic
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

    // Edit Value Logic
    const handleEdit = (uid: string, field: string, value: string) => {
        if (field === 'limit2') {
            if (value === '') {
                setEditableValues(prev => ({
                    ...prev,
                    [uid]: { ...prev[uid], [field]: value }
                }));
                return;
            }
            const numericValue = parseInt(value, 10);
            if (isNaN(numericValue) || numericValue < 0) {
                AppAlert.alert('Invalid Input', 'Please enter a valid positive integer.');
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

    // Icon Press Logic
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

    // Validation Logic
    const handleValidation = (updatedItem: any) => {
        if (selectedAction === 'accept') {
            const numericNewLimit2 = parseInt(updatedItem.limit2, 10);
            const numericLimit1 = parseFloat(updatedItem.limit1.replace(/,/g, ''));
            if (isNaN(numericNewLimit2)) {
                AppAlert.alert('Validation Error', 'Requested OS Days cannot be empty or invalid for Party Name: ' + updatedItem.parname);
                return false;
            } else if (numericNewLimit2 === 0) {
                AppAlert.alert('Validation Error', 'Requested OS Days cannot be 0 for Party Name: ' + updatedItem.parname);
                return false;
            } else if (numericNewLimit2 < 0) {
                AppAlert.alert('Validation Error', 'Requested OS Days cannot be negative for Party Name: ' + updatedItem.parname);
                return false;
            }
        }
        return true;
    };

    // Confirm Action Logic
    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        const currentLimit2 = editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2;
        if (currentLimit2 === '' || currentLimit2 === undefined) {
            AppAlert.alert('Validation Error', 'Requested OS Days cannot be empty.');
            return;
        }

        const updatedItemAccept = {
            ...selectedItem,
            limit2: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            limit3: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            isauth: 1,
            referrer: 'dashboard',
            txntype: 'outstandingdaysrequest',
            action: 'edit'
        };
        const updatedItemReject = {
            ...selectedItem,
            limit2: parseInt(selectedItem.limit2, 10).toString(),
            limit3: parseInt(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2, 10).toString(),
            isauth: 2,
            referrer: 'dashboard',
            txntype: 'outstandingdaysrequest',
            action: 'edit'
        };
        const payload = selectedAction === 'accept' ? updatedItemAccept : updatedItemReject;

        if (handleValidation(payload)) {
            setSuccess(true);
            setresponsemessage('Loading...');
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            try {
                const response = await axios.post(`${API}/api/osdaysreqedit`, payload, { headers });
                if (response.data.success) {
                    setresponsemessage(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccess(false);
                        setShowOverlay(false);
                    }, 2000);
                    setData(prevData => {
                        const newData = prevData.filter(item => item.uid !== selectedItem.uid);
                        newData.push({ ...selectedItem, isProcessed: true, actionType: selectedAction });
                        return newData;
                    });
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                } else {
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

    // Number to Words Logic
    const numberToWordsIndian = (num: number) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convertLessThanOneThousand = (n: number) => {
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

        num = parseFloat(num as any);
        if (isNaN(num)) return '';

        let res = '';
        if (num >= 10000000) {
            res += convertLessThanOneThousand(Math.floor(num / 10000000)) + ' Crore ';
            num %= 10000000;
        }
        if (num >= 100000) {
            res += convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh ';
            num %= 100000;
        }
        if (num >= 1000) {
            res += convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
            num %= 1000;
        }
        if (num > 0) {
            res += convertLessThanOneThousand(num);
        }
        return res.trim();
    };

    // Fetch Bills Data
    const fetchBillsData = async (parcode: string, prptype: string, uid: string, prpcode: string) => {
        setInfoLoading(true);
        setBillsLoading(true);
        try {
            const payload = {
                uid: uid,
                prpcode: prpcode,
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
                AppAlert.alert('Error', response.data.message || 'Failed to fetch bills');
                closeBillsModal();
            }
        } catch (error) {
            AppAlert.alert('Error', 'Server error');
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

    const handleInfoIconClick = (item: CardData) => {
        setSelectedItem(item);
        setSelectedAction('info');
        setBillsData([]);
        setMainParData(null);
        setShowBillsAccordion(true);
        fetchBillsData(item.parcode, item.prptype, item.uid, item.prpcode);
    };

    // Render Bills Accordion with Bills Count and Formatting for osdays/diffdays
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
                                            const shouldSkipFormatting = key.toLowerCase() === 'osdays' || key.toLowerCase() === 'diffdays';
                                            let displayValue: string;

                                            if (shouldSkipFormatting) {
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

    // Styles for Bills Accordion
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
            backgroundColor: '#F44336',
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

    // Format to Indian Currency
    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9]/g, '')
            : String(value).replace(/[^0-9]/g, '');
        const num = parseInt(numericValue, 10) || 0;
        return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    // Render Card Logic
    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {
        const editedLimit2 = editableValues[item.uid]?.limit2 || item.limit2;
        const rawValue = editedLimit2 ? editedLimit2.replace(/[₹,]/g, '') : item.limit2;
        const numericValue = parseInt(rawValue, 10);
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
                        <View style={[crlimtreq_styles.stampContainer]}>
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
                                        if (text === '') {
                                            handleEdit(item.uid, 'limit2', text);
                                            return;
                                        }
                                        if (!/^\d*$/.test(text)) {
                                            AppAlert.alert('Invalid Input', 'Please enter a valid integer (no decimals allowed).');
                                            return;
                                        }
                                        handleEdit(item.uid, 'limit2', text);
                                    }}
                                    keyboardType="numeric"
                                    autoFocus={false}
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

    // Render All Card History Logic
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

    // TabBar Component
    const TabBar = ({ activeTab, setActiveTab }: any) => (
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

            <TabBar activeTab={activeTab1} setActiveTab={setActiveTab1} />

            {activeTab1 === 'requests' ? (
                <FlatList
                    ref={flatListRef}
                    data={filteredData}
                    renderItem={renderCard}
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
            ) : activeTab1 === 'history' ? (
                <>
                    {showTopButton && (
                        <TouchableOpacity
                            style={crlimtreq_styles.topButton}
                            onPress={scrollHistoryToTop}
                        >
                            <Icon name="arrow-upward" size={24} color="black" />
                        </TouchableOpacity>
                    )}
                </>
            ) : null}

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

            {renderBillsAccordion()}

            <PartyHistoryModal
                visible={showPartyHistoryModal}
                onClose={() => {
                    setShowPartyHistoryModal(false);
                    setAllHistoryData([]);
                }}
                partyList={partyList}
                historyData={historyData}
                partyLoading={partyLoading}
                historyLoading={historyLoading}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                getParname={getParname}
            />
        </View>
    );
};

export default OutstandingDaysRequest;