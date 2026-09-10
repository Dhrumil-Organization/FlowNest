import AppAlert from '@/common/utils/appAlert';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Modal, ActivityIndicator, Linking, LayoutAnimation, ScrollView, UIManager, Platform, useWindowDimensions, StyleSheet
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '@/components/FullScreenLoader';
import { crlimtreq_styles } from '@/common/Style';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import HeaderBar from '@/components/Header';
import theme from '@/components/theme';
import { API } from '../../common/API/dynamicAPI';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'Active' | 'InActive' | 'list' | 'pending' | 'verifyreject';
    itemNameArray: string;
}

interface Props {
    token: string;
    // navigation: any;
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
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'Active' | 'InActive' | 'list' | 'pending' | 'verifyreject';
    UId: string,
    SrNo: string,
    StrCode: string,
    PrpCode: string,
    ItmCode: string,
    ItmName: string,
    MerCode: string,
    MerName: string,
    GrdCode: string,
    GrdName: string,
    ShdCode: string,
    ShdName: string,
    Qty: string,
    UnitRate: string,
    Amount: string,
    DisPer: string,
    DisAmt: string,
    Denier: string,
    AmtCalc: string,
    LotNo: string,
    DsnCode: string,
    DsnName: string,
    StrName: string,
    ActiveBy: string,
    ActiveDate: string,
    ActiveRemark: string,
    SODate: string,
    NSODate: string,
    d1: [D1datakeys];
}

interface D1datakeys {
    UId: string;
    SrNo: string;
    StrCode: string;
    PrpCode: string;
    ItmCode: string;
    ItmName: string;
    MerCode: string;
    MerName: string;
    GrdCode: string;
    GrdName: string;
    ShdCode: string;
    ShdName: string;
    Qty: string;
    UnitRate: string;
    Amount: string;
    DisPer: string;
    DisAmt: string;
    Denier: string;
    AmtCalc: string;
    LotNo: string;
    DsnCode: string;
    DsnName: string;
    yarnstrcode: string;
    greystrcode: string;
    SOUId: string;
    SOSrNo: string;
    SOQty: string;
}

const styles = StyleSheet.create({
    card: {
        marginVertical: 10,
        backgroundColor: theme.SURFACE,
        borderRadius: 12,
        padding: 16,
        shadowColor: theme.SHADOW,
        elevation: 3,
        marginHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    cardActions: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
    textBtn: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2, // Android shadow
    },

    btnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },

    infoBadge: {
        marginLeft: 6,
        backgroundColor: "#fff",
        color: "#2196F3",
        fontSize: 10,
        fontWeight: "bold",
        paddingHorizontal: 5,
        borderRadius: 10,
        overflow: "hidden",
    },
    infoIconContainer: {
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },

    infoCount: {
        position: "absolute",
        top: -4,
        right: -6,
        backgroundColor: "#FF3B30",
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 10,
        overflow: "hidden",
    },
    keyValuePair: {
        alignSelf: "flex-end"
    },
    keyValuePair1: {
        alignSelf: "flex-end",
        marginRight: 30
    },
    editableValueBlack: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        height: 25,
        paddingHorizontal: 8,
        paddingVertical: 2,
        fontSize: 15,
        minWidth: 120
    },

    cardSubHeader: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 10
    },
    cardHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginHorizontal: -15,
        marginBottom: 10,
    },
    cardHeaderText: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 14,
        fontWeight: '600',
        marginRight: 70,
    },

    cardSubHeaderText: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 12,
        marginTop: 2,
    },
    cardHeaderContainer: {
        flexDirection: 'row',   // ⭐ important
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginLeft: -15,     // ⭐ add this
        marginRight: -15,
        marginBottom: 10,
    },

    cardHeader1: {
        alignSelf: 'flex-start',
    },
    leftSection: {
        flexDirection: 'row',   // ⭐ column se row kar diya
    },
    dateContainer: {
        position: 'absolute',
        right: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#BDBDBD',
        borderRadius: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 1,
    },
    actionBtn: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 10,
        marginHorizontal: 6,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        alignItems: "center",
        justifyContent: "center",
        width: 50,
        height: 50,
    },
    cardSubHeader1: {
        borderColor: '#0b0c0c',
        borderWidth: 0,
        padding: 10,
        borderRadius: 0,
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: '100%',
    },
    cardSubHeaderText1: {
        color: theme.BRAND_GRADIENT_END,
        fontSize: 14,
        fontWeight: '600',
        textAlign: "center"
    },
    key: {
        fontWeight: 'bold',
        marginRight: 5,
        color: '#555',
        marginLeft: 10
    },
    keyValuePair2: {
        alignSelf: "flex-end",
        flexDirection: 'row',
        marginRight: 15
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginVertical: 6
    },
    label: {
        fontWeight: "600",
        color: "#555",
        width: 80
    },
    value: {
        fontWeight: "500",
        color: "#000",
        textAlign: "right",
        flex: 1,
        flexWrap: "wrap",
    },
    textBtn1: {
        alignSelf: "center",
        width: 150,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
    }
});


const SalesOrderInACtive: React.FC<Props> = ({ token, isConnected = true, username }) => {
    const [searchQueryYPO, setSearchQueryYPO] = useState('');
    const [searchhistoryQueryYPO, setSearchhistoryQueryYPO] = useState('');
    const [searchverifyQueryYPO, setSearchverifyQueryYPO] = useState('');
    const [responsemessageYPO, setresponsemessageYPO] = useState('');
    const [getD1Party, setD1Party] = useState('');
    const [getParnameYPO, setParnameYPO] = useState('');
    const filterKeyYPO = 'all';
    const [isLoadingYPO, setIsLoadingYPO] = useState(false);
    const [historyLoadingYPO, setIsHistoryLoadingYPO] = useState(false);
    const [allhistoryLoadingYPO, setIsAllHistoryLoading] = useState(false);
    const [prodorderLoadingYPO, setIsPrdoOrderLoadingYPO] = useState(false);
    const [getSuccessYPO, setSuccessYPO] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [historyDataYPO, setHistoryDataYPO] = useState<CardData[]>([]);
    const [allhistoryDataYPO, setAllHistoryDataYPO] = useState<CardData[]>([]);
    const [allverifyDataYPO, setAllVerifyDataYPO] = useState<AllHistoryData[]>([]);
    const [partyListYPO, setPartyListYPO] = useState<CardData[]>([]);
    const [editableValuesYPO, setEditableValuesYPO] = useState<{ [UId: string]: { limit2?: string; crday2?: string; rate?: string; qty?: string; shkperc?: string; Remark?: string } }>({});
    const [showOverlayYPO, setShowOverlayYPO] = useState(false);
    const [selectedActionYPO, setSelectedActionYPO] = useState<'Active' | 'InActive' | 'list' | 'pending' | 'verifyreject' | null>(null);
    const [selectedItemYPO, setSelectedItemYPO] = useState<CardData | AllHistoryData | null>(null);
    const [showTopButtonYPO, setShowTopButtonYPO] = useState(false);
    const [showPartyHistoryModalYPO, setShowPartyHistoryModalYPO] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const flatListRefYPO = useRef<FlatList>(null);
    const flatHistoryListRefYPO = useRef<FlatList>(null);
    const flatVerifyListRefYPO = useRef<FlatList>(null);
    const [activeTabYPO, setActiveTabYPO] = useState<'party' | 'Activehistory' | 'Closehistory'>('party');
    const [activeTab1YPO, setActiveTab1YPO] = useState<'requests' | 'Activehistory' | 'Closehistory'>('requests');
    const [showCarouselModal, setShowCarouselModal] = useState(false);
    const [selectedD1Data, setSelectedD1Data] = useState<D1datakeys[]>([]);
    const [openAccordion, setOpenAccordion] = useState({})
    let cancelToken: any;

    if (Platform.OS === "android") {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
    const { width } = useWindowDimensions();
    const numColumns = width > 600 ? 3 : 2;

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

        // Financial year starts in April
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2); // Return last two digits of the year
    };
    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    // request Data
    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        try {
            const payload = {
                txntype: 'sales_order', referrer: 'dashboard', prptype: 'R', yearno: getCurrentFinancialYear(), atype: 'B', strtype: ['Y', 'G'], strcodes: ['001', '002', '005'], status: 'I'
            };
            const response = await axios.get(
                `${API}/api/sosortbrowse`,
                getRequestConfig({ params: { ...payload } })
            );
            console.log('🔵 payload & response', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                const updatedData = response.data.response.data.map(item => {
                    const itemNames = item.d1.map(d => d.ItmName).join(', ');
                    return {
                        ...item,
                        itemNameArray: itemNames
                    };
                });
                console.log('✅ Updated Data:', updatedData);
                setData(updatedData);
                setAllHistoryDataYPO([]);
                setAllVerifyDataYPO([]);
            } else {
                setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    };
    // Request Data Over

    const fetchHistoryData = async (parcode: string, prptype: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsHistoryLoadingYPO(true);
        try {
            const historyPayload = {
                text: parcode,
                txntype: 'creditlimithistory',
                referrer: 'dashboard',
                action: 'partyhistory',
                prptype: prptype,
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
                setHistoryDataYPO(response.data.data);
                setAllVerifyDataYPO([]);
                setData([]);
            } else {
                setHistoryDataYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    };

    // History Tab
    const fetchAllHistoryData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: 'R',
                yearno: getCurrentFinancialYear(),
                atype: 'H',
                strtype: ['Y', 'G'],
                strcodes: ['001', '002', '005'],
                status: 'P'
            };
            const response = await axios.get(
                `${API}/api/sosortbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history payload', allhistoryPayload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅All History Data:', response.data.response.data);
                setAllHistoryDataYPO(response.data.response.data);
                setData([]);
                setAllVerifyDataYPO([]);

            } else {
                setAllHistoryDataYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    };
    // History data api over

    // close history tab
    const fetchAllVerifyData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: 'R',
                yearno: getCurrentFinancialYear(),
                atype: 'H',
                strtype: ['Y', 'G'],
                strcodes: ['001', '002', '005'],
                status: 'C'
            };
            console.log("allhistoryPayload", allhistoryPayload)
            const response = await axios.get(
                `${API}/api/sosortbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history response', response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅All History Data:', response.data.response.data);
                setAllVerifyDataYPO(response.data.response.data);
                setData([]);
                setAllHistoryDataYPO([]);

            } else {
                setAllVerifyDataYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    };
    // close history tab over

    useEffect(() => {
        if(!token) return;
        if (activeTab1YPO === 'Activehistory') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'Closehistory') {
            fetchAllVerifyData();
        }
    }, [activeTab1YPO, token]);

    const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
        setActiveTabYPO('party');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsPrdoOrderLoadingYPO(true);
        try {
            const historyPayload = {
                prpcodes: [prpcode],
                prptype: prptype,
                yearno: yearno,
                strcode: '',
                parcodes: [parcode],
                txntype: 'sales_order',
                fetch: 'dr'
            };
            const response = await axios.get(
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
                setPartyListYPO(response.data.response.data);
                fetchHistoryData(parcode, prptype);
            } else {
                setPartyListYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsPrdoOrderLoadingYPO(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';

        // NSODate: 20260319
        if (/^\d{8}$/.test(dateStr)) {
            return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
        }

        // SODate already dd/MM/yyyy
        return dateStr;
    };

    const filteredDataSPO = useMemo(() => {
        if (!searchQueryYPO) return data;
        return data.filter((item) =>
            filterKeyYPO === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchQueryYPO.toLowerCase()))
                : String(item[filterKeyYPO]).toLowerCase().includes(searchQueryYPO.toLowerCase())
        );
    }, [data, searchQueryYPO, filterKeyYPO]);

    const filteredhistoryDataSPO = useMemo(() => {
        if (!searchhistoryQueryYPO) return allhistoryDataYPO;
        return allhistoryDataYPO.filter((item) =>
            filterKeyYPO === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchhistoryQueryYPO.toLowerCase()))
                : String(item[filterKeyYPO]).toLowerCase().includes(searchhistoryQueryYPO.toLowerCase())
        );
    }, [allhistoryDataYPO, searchhistoryQueryYPO, filterKeyYPO]);

    const filteredverifyDataSPO = useMemo(() => {
        if (!searchverifyQueryYPO) return allverifyDataYPO;
        
        return allverifyDataYPO.filter((item) =>
            filterKeyYPO === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchverifyQueryYPO.toLowerCase()))
                : String(item[filterKeyYPO]).toLowerCase().includes(searchverifyQueryYPO.toLowerCase())
        );
    }, [allverifyDataYPO, searchverifyQueryYPO, filterKeyYPO]);

    // const filteredverifyDataSPO = useMemo(() => {
    //     if (!searchverifyQueryYPO) return allverifyDataYPO;
    //     const search = searchverifyQueryYPO.trim();
    //     // 🔥 STRONG DATE CHECK
    //     const parts = search.split('/');
    //     const isFullDate = parts.length === 3 && parts[2].length === 4;
    //     console.log("🔍 Search:", search);
    //     console.log("📅 Is Full Date:", isFullDate);
    //     const normalizeDate = (date: string) => {
    //         if (!date) return '';
    //         const parts = date.split('/');
    //         if (parts.length !== 3) return date.trim();
    //         const dd = parts[0].padStart(2, '0');
    //         const mm = parts[1].padStart(2, '0');
    //         const yyyy = parts[2];
    //         return `${dd}/${mm}/${yyyy}`;
    //     };
    //     return allverifyDataYPO.filter((item) => {
    //         let soDateMatch = false;
    //         let nsoDateMatch = false;
    //         const searchDate = normalizeDate(search);
    //         // ✅ SODate
    //         if (item.SODate) {
    //             const soDate = normalizeDate(item.SODate.trim());
    //             soDateMatch = isFullDate
    //                 ? soDate === searchDate
    //                 : soDate.includes(search);
    //         }
    //         // ✅ NSODate
    //         if (item.NSODate) {
    //             const n = item.NSODate;
    //             const formatted = `${n.substring(6, 8)}/${n.substring(4, 6)}/${n.substring(0, 4)}`;
    //             const nsoDate = normalizeDate(formatted);

    //             nsoDateMatch = isFullDate
    //                 ? nsoDate === searchDate
    //                 : nsoDate.includes(search);
    //         }

    //         // 🔥 FINAL LOGIC (IMPORTANT)
    //         if (isFullDate) {
    //             return soDateMatch || nsoDateMatch;  // ONLY DATE
    //         }

    //         // ✅ normal search
    //         const otherMatch = Object.entries(item).some(([key, val]) => {
    //             if (key === 'SODate' || key === 'NSODate') return false;
    //             return String(val).toLowerCase().includes(search.toLowerCase());
    //         });

    //         return soDateMatch || nsoDateMatch || otherMatch;

    //     });

    // }, [allverifyDataYPO, searchverifyQueryYPO]);

    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };

    const handleEdit = (UId: string, field: 'Remark', formattedValue: string) => {
        const rawValue = formattedValue.replace(/[₹,]/g, '');
        const rawValuecrday = formattedValue.replace(/[₹,]/g, '');
        const displayValue = formatToIndianCurrency(rawValue || '0');
        const displayValuecrday = (formattedValue);
        const displayValuearemark = (formattedValue);
        setEditableValuesYPO(prev => ({
            ...prev,
            [UId]: {
                ...prev[UId],
                [field]: field === 'limit2' ? displayValue : displayValuecrday,
                [field]: field === 'Remark' ? displayValuearemark : displayValuearemark,
                [`${field}Raw`]: field === 'limit2' ? rawValue : rawValuecrday,
            },
        }));
    };

    const handleIconPress = (item: CardData, action: 'Active' | 'InActive' | 'list' | 'pending' | 'verifyreject') => {
        if (action === 'list') {
            setSelectedItemYPO(item);
            setSelectedActionYPO(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            setShowPartyHistoryModalYPO(true);
            setParnameYPO(item.parname);
            return;
        } else if (action === 'pending') {
            setSelectedItemYPO(item);
            setSelectedActionYPO(action);
            setShowOverlayYPO(true);
            return;
        } else if (action === 'verifyreject') {
            setSelectedItemYPO(item);
            setSelectedActionYPO(action);
            setShowOverlayYPO(true);
            return;
        }
        else if (action === 'InActive') {
            const remark = editableValuesYPO[item.UId]?.Remark || item.Remark || '';
            if (!remark.trim()) {
                AppAlert.alert(
                    'Validation Error',
                    'Remark cannot be empty for Voucher No.: ' + (item.SONo || '')
                );
                return;
            }
            setSelectedItemYPO(item);
            setSelectedActionYPO(action);
            setShowOverlayYPO(true);
            return;
        }
        else {
            const remark = editableValuesYPO[item.UId]?.Remark || item.Remark || '';
            if (!remark.trim()) {
                AppAlert.alert(
                    'Validation Error',
                    'Remark cannot be empty for Voucher No.: ' + (item.SONo || '')
                );
                return;
            }
            setSelectedItemYPO(item);
            setSelectedActionYPO(action);
            setShowOverlayYPO(true);
            return;
        }
    };

    const handleInfoPress = (d1Data: D1datakeys[], item: CardData) => {
        setSelectedD1Data(Array.isArray(d1Data) ? d1Data : []);
        setD1Party(item.ParName);
        setShowCarouselModal(true);
    };

    const getToken = () => {
        return token;
    };

    const handleValidation = (updatedItem: any) => {
        if (selectedActionYPO?.toLowerCase() === 'inactive') {
            const remark = updatedItem?.Remark?.trim();
            if (!remark) {
                AppAlert.alert(
                    'Validation Error',
                    'Remark cannot be empty for Voucher No.: ' + (updatedItem?.ParName || '')
                );
                setShowOverlayYPO(false);
                return false;
            }
        }
        return true;
    };

    const scrollToTop = () => {
        flatListRefYPO.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const scrollHistoryToTop = () => {
        flatHistoryListRefYPO.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const scrollVerifyToTop = () => {
        flatVerifyListRefYPO.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleConfirmAction = async () => {
        if (!selectedItemYPO) return;
        const removed1 = { ...selectedItemYPO };
        delete removed1['d1'];
        const remark = editableValuesYPO[removed1.UId]?.Remark || removed1.Remark || '';
        const updatedItemAccept = {
            ...removed1,
            Remark: remark,
            Remark: remark,
            IsAuth: 1,
            referrer: 'dashboard',
            txntype: 'sales_order',
            action: 'edit'
        };
        const updatedItemReject = {
            PrpCode: selectedItemYPO.PrpCode,
            StrCode: selectedItemYPO.StrCode,
            YearNo: selectedItemYPO.yearno,
            UId: selectedItemYPO.UId,
            DueDay: selectedItemYPO.DueDay,
            Remark: remark,
            referrer: 'dashboard'
        };
        let payload = null;
        if (selectedActionYPO === 'Active') {
            payload = updatedItemAccept;
        }
        else if (selectedActionYPO === 'InActive') {
            payload = updatedItemReject;
        }
        console.log("Payload:", payload);
        if (!handleValidation(payload)) return;
        setSuccessYPO(true);
        setresponsemessageYPO('Loading...');
        try {
            if (selectedActionYPO === 'Active') {
                const getRequestConfig = (props) => {
                    let params = props.params ? props.params : null;

                    return {
                        headers: {
                            Authorization: `Bearer ${getToken()}`,
                            'Content-Type': 'application/javascript',
                            Accept: 'application/json'
                        },
                        params
                    };
                };
                const response = await axios.get(`${API}/api/activeso`, getRequestConfig({ params: payload }));
                console.log("response", response)
                if (response.data.success) {
                    setresponsemessageYPO(response.data.message || 'Success');

                    setTimeout(() => {
                        setSuccessYPO(false);
                        setShowOverlayYPO(false);
                    }, 2000);

                    // ✅ REMOVE from request tab (push hata diya)
                    setData(prevData =>
                        prevData.filter(item => item.UId !== selectedItemYPO.UId)
                    );
                    setAllVerifyDataYPO(prevData => [
                        { ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO },
                        ...prevData
                    ]);

                    setTimeout(() => {
                        flatListRefYPO.current?.scrollToEnd({ animated: true });
                        flatVerifyListRefYPO.current?.scrollToEnd({ animated: true });
                    }, 300);
                } else {
                    setresponsemessageYPO(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccessYPO(false);
                    }, 2000);
                }
            }
            else if (selectedActionYPO === 'InActive') {
                console.log(`${selectedActionYPO} confirmed for:`, payload);
                const getRequestConfig = () => {
                    return {
                        headers: {
                            Authorization: `Bearer ${getToken()}`,
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        }
                    };
                };
                const response = await axios.post(
                    `${API}/api/closesalesorder`,
                    payload,
                    getRequestConfig()
                );
                console.log("API Full Response:", response);
                console.log("API Response Data:", response.data);
                console.log("API Success:", response.data.success);
                console.log("API Message:", response.data.message);
                if (response.data.success) {
                    setresponsemessageYPO(response.data.message || 'Success');

                    setTimeout(() => {
                        setSuccessYPO(false);
                        setShowOverlayYPO(false);
                    }, 2000);
                    setData(prevData =>
                        prevData.filter(item => item.UId !== selectedItemYPO.UId)
                    );
                    setAllVerifyDataYPO(prevData => [
                        { ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO },
                        ...prevData
                    ]);
                } else {
                    setresponsemessageYPO(response.data.message || 'Failed');
                    setTimeout(() => {
                        setSuccessYPO(false);
                    }, 2000);
                }
            }
        } catch (error) {
            setresponsemessageYPO('Server Error');
            setTimeout(() => {
                setSuccessYPO(false);
            }, 2000);
        }
    };

    const displayValue = (val) => {
        return val === null || val === undefined || val === '' || val === 0 ? '-' : val;
    };

    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'Active' | 'InActive' } }) => (
        <View style={[
            styles.card, !isConnected && crlimtreq_styles.disabledCard,
            item.actionType === 'Active' ? crlimtreq_styles.acceptedCard : item.actionType === 'InActive' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.isProcessed && (
                <View style={[
                    crlimtreq_styles.stampContainerYOS,
                ]}>
                    <View style={[
                        crlimtreq_styles.stamp,
                        item.actionType === 'Active' ? crlimtreq_styles.stampAccepted : crlimtreq_styles.stampRejected
                    ]}>
                        <Text style={crlimtreq_styles.stampText}>
                            {item.actionType === 'Active' ? 'APPROVED' : 'REJECTED'}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.cardHeaderContainer}>
                <View style={styles.leftSection}>
                    <Text style={styles.cardHeaderText}>{item.SONo}</Text>
                    <Text style={styles.cardSubHeaderText}>{item.StrName}</Text>
                </View>
                <View style={styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.SODate}</Text>
                </View>

            </View>
            <View style={styles.cardSubHeader1}>
                <Text style={styles.cardSubHeaderText1}>{item.PrpName}</Text>
            </View>
            {/* Party */}
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Party:</Text>
                <Text style={styles.value} numberOfLines={2}>{item.ParName || ''}</Text>
            </View>

            {/* Broker */}
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Broker:</Text>
                <Text style={styles.value}>{item.BAccName || ''}</Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Sales Exe.</Text>
                <Text style={styles.value}>{item.SlExeName || ''}</Text>
            </View>
            {/* Net Amount */}
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Net Amt:</Text>
                <Text style={crlimtreq_styles.value}>
                    ₹ {item.NetAmt || ''}
                </Text>
            </View>

            {/* Remark */}

            {/* Status */}
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{item.Status || ''}</Text>
            </View>


            <View style={styles.rowBetween}>
                <Text style={styles.label}>Remark:</Text>
                <RNTextInput
                    style={styles.editableValueBlack}
                    value={editableValuesYPO[item.UId]?.Remark || ''}
                    onChangeText={(text) => handleEdit(item.UId, 'Remark', text)}
                />
            </View>
            <View style={crlimtreq_styles.cardActions}>

                {/* Active Order */}
                <TouchableOpacity
                    style={[
                        styles.textBtn,
                        { backgroundColor: (!isConnected || item.isProcessed) ? "#ccc" : "#4CAF50" }
                    ]}
                    onPress={() => handleIconPress(item, 'Active')}
                    disabled={!isConnected || item.isProcessed}
                    activeOpacity={0.7}
                >
                    <Text style={styles.btnText}>ACTIVE</Text>
                </TouchableOpacity>

                {/* Close Order */}
                <TouchableOpacity
                    style={[
                        styles.textBtn,
                        { backgroundColor: (!isConnected || item.isProcessed) ? "#ccc" : "#F44336" }
                    ]}
                    onPress={() => handleIconPress(item, 'InActive')}
                    disabled={!isConnected || item.isProcessed}
                    activeOpacity={0.7}
                >
                    <Text style={styles.btnText}>CLOSE</Text>
                </TouchableOpacity>

                {/* Info */}
                <TouchableOpacity
                    style={[
                        styles.textBtn,
                        { backgroundColor: (!isConnected) ? "#ccc" : "#2196F3" }
                    ]}
                    onPress={() => handleInfoPress(item.d1, item)}
                    disabled={!isConnected}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.btnText}>INFO</Text>
                        {item.d1 && (
                            <Text style={styles.infoBadge}>
                                {item.d1.length}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

            </View>
        </View >
    );

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
        <View style={[
            styles.card,
            item.IsAuth === '1' ? crlimtreq_styles.acceptedCard : item.IsAuth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.IsAuth && (
                <View style={crlimtreq_styles.stampContainerYOS}>
                    <View style={[
                        crlimtreq_styles.stamp,
                        item.IsAuth === '1' ? crlimtreq_styles.stampAccepted : item.IsAuth === '2' ? crlimtreq_styles.stampRejected : crlimtreq_styles.stampPendingall
                    ]}>
                        <Text style={crlimtreq_styles.stampText}>
                            {item.IsAuth === '1' ? 'AUTHORISED' : item.IsAuth === '2' ? 'REJECTED' : 'PENDING'}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.cardHeaderContainer}>
                <View style={styles.leftSection}>
                    <Text style={styles.cardHeaderText}>{item.SONo}</Text>
                    <Text style={styles.cardSubHeaderText}>{item.StrName}</Text>
                </View>
                <View style={styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.SODate}</Text>
                </View>
            </View>
            <View style={styles.cardSubHeader1}>
                <Text style={styles.cardSubHeaderText1}>{item.PrpName}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Party:</Text>
                <Text style={styles.value}>{item.ParName || ''}</Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Broker:</Text>
                <Text style={styles.value}>{item.BAccName || ''}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Sales Exe. :</Text>
                <Text style={styles.value}>{item.SlExeName || ''}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Net Amt:</Text>
                <Text style={styles.value}>
                    ₹ {item.NetAmt || ''}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Active By:</Text>
                <Text style={styles.value}>
                    {displayValue(item.ActiveBy || '-')}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Active Date:</Text>
                <Text style={styles.value}>
                    {displayValue(item.ActiveDate || '')}
                </Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>
                    {item.Status || ''}
                </Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Remark:</Text>
                <Text style={styles.value}>
                    {item.ActiveRemark || ''}
                </Text>
            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity
                    style={[
                        styles.textBtn1,
                        { backgroundColor: (!isConnected) ? "#ccc" : "#2196F3" }
                    ]}
                    onPress={() => handleInfoPress(item.d1, item)}
                    disabled={!isConnected}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.btnText}>INFO</Text>
                        {item.d1 &&
                            <Text style={styles.infoBadge}>
                                {item.d1.length}
                            </Text>}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAllCardVerify = ({ item }: { item: AllHistoryData & { isProcessed?: boolean; actionType?: 'Active' | 'InActive' } }) => (
        <View style={[
            styles.card,
            item.IsAuth === '1' ? crlimtreq_styles.acceptedCard : item.IsAuth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.IsAuth && (
                <View style={crlimtreq_styles.stampContainerYOS}>
                    <View style={[
                        crlimtreq_styles.stamp,
                        item.IsAuth === '1' ? crlimtreq_styles.stampAccepted : item.IsAuth === '2' ? crlimtreq_styles.stampRejected : crlimtreq_styles.stampPendingall
                    ]}>
                        <Text style={crlimtreq_styles.stampText}>
                            {item.IsAuth === '1' ? 'AUTHORISED' : item.IsAuth === '2' ? 'REJECTED' : 'PENDING'}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.cardHeaderContainer}>
                <View style={styles.leftSection}>
                    <Text style={styles.cardHeaderText}>{item.SONo}</Text>
                    <Text style={styles.cardSubHeaderText}>{item.StrName}</Text>
                </View>

                <View style={styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.SODate}</Text>
                </View>

            </View>

            <View style={styles.cardSubHeader1}>
                <Text style={styles.cardSubHeaderText1}>{item.PrpName}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Party:</Text>
                <Text style={styles.value}>{item.ParName || ''}</Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Broker:</Text>
                <Text style={styles.value}>{item.BAccName || ''}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Sales Exe. :</Text>
                <Text style={styles.value}>{item.SlExeName || ''}</Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Net Amt:</Text>
                <Text style={styles.value}>
                    ₹ {item.NetAmt || ''}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Closed By:</Text>
                <Text style={styles.value}>
                    {displayValue(item.CloseBy || '-')}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.label}>Close Date:</Text>
                <Text style={styles.value}>
                    {displayValue(item.CloseDate || '')}
                </Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>
                    {item.Status || ''}
                </Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.label}>Remark:</Text>
                <Text style={styles.value}>
                    {item.CloseRemark || ''}
                </Text>
            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity
                    style={[
                        styles.textBtn1,
                        { backgroundColor: (!isConnected) ? "#ccc" : "#2196F3" }
                    ]}
                    onPress={() => handleInfoPress(item.d1, item)}
                    disabled={!isConnected}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.btnText}>INFO</Text>
                        {item.d1 &&
                            <Text style={styles.infoBadge}>
                                {item.d1.length}
                            </Text>}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const TabBar = ({ activeTabYPO, setActiveTabYPO }) => (
        <View style={crlimtreq_styles.tabContainer1}>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabYPO === 'requests' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabYPO('requests')}
            >
                <Text style={crlimtreq_styles.tabText1}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabYPO === 'Activehistory' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabYPO('Activehistory')}
            >
                <Text style={crlimtreq_styles.tabText1}>Active History</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabYPO === 'Closehistory' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabYPO('Closehistory')}
            >
                <Text style={crlimtreq_styles.tabText1}>Close History</Text>
            </TouchableOpacity>
        </View>
    );

    const groupedData = Object.entries(
        selectedD1Data.reduce((acc, item) => {
            const key = `${item.DsnName}_${item.ItmName}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {})
    ).map(([key, items]) => {
        const [designName, itemName] = key.split('_');
        return { key, designName, itemName, items };
    });

    const toggleAccordion = (key) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setOpenAccordion(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }
    return (
        <>
            {activeTab1YPO === 'requests' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQueryYPO}
                    placeholder="Search sales order..."
                />
            ) : activeTab1YPO === 'Activehistory' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQueryYPO}
                    placeholder="Search sales history..."
                />
            ) : activeTab1YPO === 'Closehistory' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchverifyQueryYPO}
                    placeholder="Search sales Closehistory..."
                />
            ) : null}
            <View style={crlimtreq_styles.container}>
                {isLoadingYPO && <FullScreenLoader message={'Loading...'} />}
                <TabBar activeTabYPO={activeTab1YPO} setActiveTabYPO={setActiveTab1YPO} />
                {activeTab1YPO === 'requests' ? (
                    <FlatList
                        ref={flatListRefYPO}
                        data={filteredDataSPO}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !isLoadingYPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1YPO === 'Activehistory' ? (
                    <FlatList
                        ref={flatHistoryListRefYPO}
                        data={filteredhistoryDataSPO}
                        renderItem={renderAllCardHistory}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingYPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No history data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1YPO === 'Closehistory' ? (
                    <FlatList
                        ref={flatVerifyListRefYPO}
                        data={filteredverifyDataSPO}
                        renderItem={renderAllCardVerify}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingYPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No Closehistory data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : null}
                {activeTab1YPO === 'requests' ? (
                    <>
                        {showTopButtonYPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}
                    </>

                ) : activeTab1YPO === 'Activehistory' ? (
                    <>
                        {showTopButtonYPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollHistoryToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}</>
                ) : activeTab1YPO === 'Closehistory' ? (
                    <>
                        {showTopButtonYPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollVerifyToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}</>
                ) : null}


                <PartyHistoryModal
                    visible={showPartyHistoryModalYPO}
                    onClose={() => {
                        setShowPartyHistoryModalYPO(false);
                        setAllHistoryDataYPO([]);
                    }}
                    partyListYPO={partyListYPO}
                    historyDataYPO={historyDataYPO}
                    prodorderLoadingYPO={prodorderLoadingYPO}
                    historyLoadingYPO={historyLoadingYPO}
                    activeTabYPO={activeTabYPO}
                    setActiveTabYPO={setActiveTabYPO}
                    getParnameYPO={getParnameYPO}
                />
                {getSuccessYPO === true ? (
                    <Modal
                        visible={showOverlayYPO}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowOverlayYPO(false)}
                    >
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedActionYPO === 'Active' ? 'Confirm Active' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'InActive' ? 'Confirm Close' : selectedActionYPO === 'verifyreject' ? 'Confirm Close' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Vouchar No.: {selectedItemYPO?.SONo}
                                </Text>
                                {responsemessageYPO === 'Loading...' ? (
                                    <>
                                        <Text style={crlimtreq_styles.loadingText}>
                                            <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} /> {responsemessageYPO}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={crlimtreq_styles.responseText}>
                                            {responsemessageYPO}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <Modal
                        visible={showOverlayYPO}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowOverlayYPO(false)}
                    >
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedActionYPO === 'Active' ? 'Confirm Active' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'InActive' ? 'Confirm Close' : selectedActionYPO === 'verifyreject' ? 'Confirm Close' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Party Name: {selectedItemYPO?.ParName}
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
                                        onPress={() => setShowOverlayYPO(false)}
                                    >
                                        <Icon name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}

                <Modal
                    visible={showCarouselModal}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={() => setShowCarouselModal(false)}
                >
                    <View style={crlimtreq_styles.carouselModalOverlay}>

                        <TouchableOpacity
                            style={crlimtreq_styles.modalCloseButton}
                            onPress={() => {
                                setShowCarouselModal(false)
                                setSelectedD1Data([])
                            }}
                        >
                            <Icon name="close" size={24} color={theme.BRAND_GRADIENT_START} />
                        </TouchableOpacity>


                        <FlatList
                            data={groupedData}
                            keyExtractor={(item) => item.key}
                            showsVerticalScrollIndicator
                            initialNumToRender={8}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={true}
                            contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 10 }}
                            renderItem={({ item }) => {

                                const isOpen = openAccordion[item.key] ?? true

                                return (

                                    <View style={crlimtreq_styles.accordionCard}>

                                        <TouchableOpacity
                                            style={crlimtreq_styles.accordionHeader}
                                            onPress={() => toggleAccordion(item.key)}
                                            activeOpacity={0.8}
                                        >

                                            <View style={{ flex: 1 }}>
                                                <Text style={crlimtreq_styles.accordionTitle}>
                                                    {item.designName}
                                                </Text>
                                                <Text style={crlimtreq_styles.accordionSubTitle}>
                                                    {item.itemName}
                                                </Text>
                                            </View>

                                            <View style={crlimtreq_styles.countBadge}>
                                                <Text style={crlimtreq_styles.countText}>
                                                    {item.items.length}
                                                </Text>
                                            </View>
                                            <Icon
                                                name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                                size={26}
                                                color="#444"
                                            />
                                        </TouchableOpacity>

                                        {isOpen && (
                                            <View style={crlimtreq_styles.accordionBody}>
                                                <FlatList
                                                    data={item.items}
                                                    key={numColumns}
                                                    numColumns={numColumns}
                                                    scrollEnabled={false}
                                                    columnWrapperStyle={{ justifyContent: "space-between" }}
                                                    keyExtractor={(row, index) => index.toString()}
                                                    renderItem={({ item: row }) => (
                                                        <View style={crlimtreq_styles.gridCard}>
                                                            <View style={crlimtreq_styles.gridRow}>
                                                                <Text style={crlimtreq_styles.gridLabel}>Shade</Text>
                                                                <Text style={crlimtreq_styles.gridValue}>{row.ShdName}</Text>
                                                            </View>

                                                            <View style={crlimtreq_styles.gridRow}>
                                                                <Text style={crlimtreq_styles.gridLabel}>Qty</Text>
                                                                <Text style={crlimtreq_styles.gridValue}>{row.Qty}</Text>
                                                            </View>

                                                            <View style={crlimtreq_styles.gridRow}>
                                                                <Text style={crlimtreq_styles.gridLabel}>Rate</Text>
                                                                <Text style={crlimtreq_styles.gridValue}>{row.UnitRate}</Text>
                                                            </View>

                                                            <View style={crlimtreq_styles.gridRow}>
                                                                <Text style={crlimtreq_styles.gridLabel}>Amount</Text>
                                                                <Text style={crlimtreq_styles.gridValue}>{row.Amount}</Text>
                                                            </View>

                                                            <View style={crlimtreq_styles.gridRow}>
                                                                <Text style={crlimtreq_styles.gridLabel}>Disc %</Text>
                                                                <Text style={crlimtreq_styles.gridValue}>{row.DisPer}</Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                />
                                            </View>
                                        )}
                                    </View>
                                )
                            }}
                        />
                    </View>
                </Modal>
            </View>
        </>
    );
};
export default SalesOrderInACtive;
