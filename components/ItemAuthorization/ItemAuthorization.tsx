import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Alert, TextInput as RNTextInput, Modal, ActivityIndicator, LayoutAnimation, ScrollView, ToastAndroid, Share, StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import HeaderBar from '../HeaderBar/HeaderBar';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';
import { API } from '../../common/API/dynamicAPI';
import CriteriaForm from './CriteriaForm';
import { fetchAllStoredata } from '../../common/API/Functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
    itemNameArray: string;
}

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}
interface AllHistoryData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
    ItmCode: string,
    ItmName: string,
    MItmCode: string,
    MItmName: string,
    IgName: string,
    IsAuth: string,
    ALastDate: string,
    ALastTime: string,
    aremark: string,
    AUsrCode: string,
    AuthStatus: string
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
    CurrentStock: string;
    LastParty: string;
    LastRate: string;
    LastShade: string;
}

const newStyles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        margin: 10,
        borderRadius: 14,
        padding: 14,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    acceptedCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50',
    },
    rejectedCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#F44336',
    },
    stampContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    stampText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    approvedText: {
        color: '#4CAF50',
    },
    rejectedText: {
        color: '#F44336',
    },
    content: {
        marginTop: 5,
        gap: 6,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 13,
        color: '#666',
    },
    value: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        maxWidth: '60%',
        textAlign: 'right',
    },
    statusValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    remarkBox: {
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
        marginTop: 4,
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
    },
    iconBtn: {
        padding: 6,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -8,
        backgroundColor: '#F44336',
        borderRadius: 10,
        paddingHorizontal: 5,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    inlineInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        fontSize: 13,
        color: '#333',
        minWidth: '55%',
        textAlign: 'left',
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: '#fff'
    },
    acceptBtn: {
        backgroundColor: '#4CAF50',
    },
    rejectBtn: {
        backgroundColor: '#F44336',
    },
    infoBtn: {
        backgroundColor: '#2196F3',
    },
    disabledBtn: {
        backgroundColor: '#ccc',
        elevation: 0,
    },
    infoIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoCount: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#fff',
        color: '#000',
        borderRadius: 10,
        paddingHorizontal: 5,
        fontSize: 10,
        fontWeight: 'bold',
    },
    circleBtn: {
        width: 35,
        height: 35,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    actions1: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30, // spacing between buttons
        marginTop: 10,
    },
    editableValueBlack: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        height: 30,
        paddingHorizontal: 8,
        paddingVertical: 2,
        fontSize: 15,
        minWidth: 135
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginVertical: 6
    },
    textBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        minWidth: 60,
    },
    btnText: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',  // light grey line
        marginTop: 10,
        marginBottom: 8,
    },
});

const ItemAuthorization: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
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
    const [editableValuesYPO, setEditableValuesYPO] = useState<{ [UId: string]: { limit2?: string; crday2?: string; rate?: string; qty?: string; shkperc?: string; aremark?: string } }>({});
    const [showOverlayYPO, setShowOverlayYPO] = useState(false);
    const [selectedActionYPO, setSelectedActionYPO] = useState<'accept' | 'reject' | 'list' | 'pending' | 'verifyreject' | null>(null);
    const [selectedItemYPO, setSelectedItemYPO] = useState<CardData | AllHistoryData | null>(null);
    const [showTopButtonYPO, setShowTopButtonYPO] = useState(false);
    const [showPartyHistoryModalYPO, setShowPartyHistoryModalYPO] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const flatListRefYPO = useRef<FlatList>(null);
    const flatHistoryListRefYPO = useRef<FlatList>(null);
    const flatVerifyListRefYPO = useRef<FlatList>(null);
    const [activeTabYPO, setActiveTabYPO] = useState<'party' | 'history' | 'verify'>('party');
    const [activeTab1YPO, setActiveTab1YPO] = useState<'requests' | 'history' | 'verify'>('requests');
    const [showCarouselModal, setShowCarouselModal] = useState(false);
    const [selectedD1Data, setSelectedD1Data] = useState<D1datakeys[]>([]);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [getLocationLoading, setLocationLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [criteriaFormOpen, setCriteriaFormOpen] = useState(false)
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {
            PrpCode: '',
            YearNo: '',
            StrCode: ''
        }
    })
    const didFetchStore = useRef(false);
    const cancelTokenRef = useRef(null);
    const didInitialFetch = useRef(false);
    const handleCriteriaFormOpen = () => setCriteriaFormOpen(true)
    const handleCriteriaFormClose = () => setCriteriaFormOpen(false)

    useEffect(() => {
        if (didFetchStore.current) return;
        didFetchStore.current = true;
        const loadProperty = async () => {
            let yno = await AsyncStorage.getItem('yno');
            const allstoredata = await fetchAllStoredata(token, '', yno, 'sales_order')
            setAllStoreData(allstoredata)
        };
        loadProperty();
    }, []);

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

        // Financial year starts in April
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2); // Return last two digits of the year
    };

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

    const fetchData = useCallback(async () => {
        if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel();
        }
        cancelTokenRef.current = axios.CancelToken.source();
        setIsLoadingYPO(true);
        let strtypeFromApi = '';
        getAllStoreData && getAllStoreData.filter((el, ind) => {
            if (el.StrCode == FormState.values.StrCode) {
                strtypeFromApi = el.StrType;
            }
        })
        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');
        try {
            const payload = {
                // txntype: 'poy_yarn_item_master',
                txntype: 'app_item_master_auth',
                referrer: 'dashboard',
                // prptype: userPtype,
                prptype: 'R',
                // yearno: yno,
                yearno: getCurrentFinancialYear(),
                strcode: FormState.values.StrCode || '',
                atype: 'B',
                //strtype: 'Y',
                // strtype: strtypeFromApi
            };
            const response = await axios.get(`${API}/api/itembrowse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("response hereeeee", response)
            if (response.data.success && response.data.response.data.length > 0) {
                const updatedData = response.data.response.data.map(item => ({
                    ...item,
                    // itemNameArray: []
                }));
                setData(updatedData);
                setAllHistoryDataYPO([]);
                setAllVerifyDataYPO([]);
            }
            else {
                setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);




    const fetchAllHistoryData = useCallback(async () => {
        if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel();
        }
        cancelTokenRef.current = axios.CancelToken.source();
        setIsLoadingYPO(true);
        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');
        let strtypeFromApi = '';
        getAllStoreData && getAllStoreData.filter((el, ind) => {
            if (el.StrCode == FormState.values.StrCode) {
                strtypeFromApi = el.StrType;
            }
        })
        try {
            const payload = {
                txntype: 'app_item_master_auth',
                referrer: 'dashboard',
                // prptype: userPtype,
                prptype: 'R',
                // yearno: yno,
                 yearno: getCurrentFinancialYear(),
                strcode: FormState.values.StrCode || '',
                atype: 'h',
                //strtype: 'Y',
                // strtype: strtypeFromApi
            };
            const response = await axios.get(`${API}/api/itembrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("payload", payload)
            console.log("response", response)
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅All History Data:', response.data.response.data);
                setAllHistoryDataYPO(response.data.response.data);
                setData([]);
                setAllVerifyDataYPO([]);

            } else {
                setAllHistoryDataYPO([]);
                // setPartyListYPO([]);
                // setHistoryDataYPO([]);
            }
        }
        catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);


    const fetchAllVerifyData = useCallback(async () => {
        if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel();
        }
        cancelTokenRef.current = axios.CancelToken.source();
        setIsLoadingYPO(true);
        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');
        let strtypeFromApi = '';
        getAllStoreData && getAllStoreData.filter((el, ind) => {
            if (el.StrCode == FormState.values.StrCode) {
                strtypeFromApi = el.StrType;
            }
        })
        try {
            const payload = {
                txntype: 'app_item_master_auth',
                referrer: 'dashboard',
                // prptype: userPtype,
                prptype: 'R',
                // yearno: yno,
                 yearno: getCurrentFinancialYear(),
                strcode: FormState.values.StrCode || '',
                atype: 'A',
            };
            const response = await axios.get(`${API}/api/itembrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("verify data", payload)
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅All History Data:', response.data.response.data);

                setAllVerifyDataYPO(response.data.response.data);
                setData([]);
                setAllHistoryDataYPO([]);

            } else {
                setAllVerifyDataYPO([]);
                // setPartyListYPO([]);
                // setHistoryDataYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);


    const fetchHistoryData = useCallback(async (parcode: string, prptype: string) => {
        if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsHistoryLoadingYPO(true);
        try {
            const historyPayload = {
                text: parcode,
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
            if (response.data.success && response.data.data.length > 0) {
                setHistoryDataYPO(response.data.data);
                setAllVerifyDataYPO([]);
                setData([]);
            } else {
                setHistoryDataYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    }, [FormState.values.StrCode]);
    useEffect(() => {
        if (!didInitialFetch.current) {
            didInitialFetch.current = true;
            return;
        }
        if (activeTab1YPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'verify') {
            fetchAllVerifyData();
        }
    }, [activeTab1YPO]);

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
                txntype: 'purchase_order_detail',
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
            if (response.data.success && response.data.response.data.length > 0) {
                setPartyListYPO(response.data.response.data);
                fetchHistoryData(parcode, prptype);
            } else {
                setPartyListYPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsPrdoOrderLoadingYPO(false);
        }
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


    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };

    const handleEdit = (UId: string, field: 'limit2' | 'crday2' | 'rate' | 'qty' | 'shkperc' | 'aremark', formattedValue: string) => {
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
                [field]: field === 'aremark' ? displayValuearemark : displayValuearemark,
                [`${field}Raw`]: field === 'limit2' ? rawValue : rawValuecrday,
            },
        }));
    };

    const handleIconPress = (item: CardData, action: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject') => {
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
        else {
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
        const remark = updatedItem?.aremark?.toString().trim();
        if (selectedActionYPO === 'accept') {

        }
        if (selectedActionYPO === 'pending' || selectedActionYPO === 'verifyreject') {
            if (!remark) {
                Alert.alert(
                    'Validation Error',
                    'Auth Remark cannot be empty for Item.: ' + updatedItem.ItmCode
                )
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
        const updatedItemAccept = {
            ...removed1,
            remark: editableValuesYPO[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
            prptype: "R",
            isauth: 1,
            referrer: 'dashboard',
            itmcode: removed1.ItmCode,
            strcode: removed1.strCode,
            yearno: getCurrentFinancialYear(),
            action: 'edit',
            txntype: 'app_item_master_auth',
            atype: "B"
        };
        const updatedItemVerifyPending = {
            ...removed1,
            remark: editableValuesYPO[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
            prptype: "R",
            isauth: 0,
            referrer: 'dashboard',
            itmcode: removed1.ItmCode,
            strcode: removed1.strCode,
            yearno: getCurrentFinancialYear(),
            action: 'edit',
            txntype: 'app_item_master_auth',
            atype: 'A',
        };
        const updatedItemReject = {
            ...removed1,
            remark: editableValuesYPO[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
            prptype: "R",
            isauth: 2,
            referrer: 'dashboard',
            itmcode: removed1.ItmCode,
            strcode: removed1.strCode,
            yearno: getCurrentFinancialYear(),
            action: 'edit',
            txntype: 'app_item_master_auth',
            atype: "B"

        };
        const updatedItemVerifyReject = {
            ...removed1,
            remark: editableValuesYPO[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
            prptype: "R",
            isauth: 2,
            referrer: 'dashboard',
            itmcode: removed1.ItmCode,
            strcode: removed1.strCode,
            yearno: getCurrentFinancialYear(),
            action: 'edit',
            txntype: 'app_item_master_auth',
            atype: 'A',
        };
        const payload = selectedActionYPO === 'accept' ? updatedItemAccept : selectedActionYPO === 'pending' ? updatedItemVerifyPending : selectedActionYPO === 'reject' ? updatedItemReject : selectedActionYPO === 'verifyreject' ? updatedItemVerifyReject : 'null';

        if (handleValidation(payload)) {
            setSuccessYPO(true);
            setresponsemessageYPO('Loading...');
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("Payload", payload);
            try {
                const response = await axios.post(
                    `${API}/api/authitem`,
                    payload, // ✅ body data
                    {
                        headers: {
                            Authorization: `Bearer ${getToken()}`,
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            Accept: 'application/json'
                        }
                    }
                );
                console.log("auth item response", response)
                if (response?.data?.success) {

                    setresponsemessageYPO(response.data.message || 'Success');
                    const apiData = response?.data?.response?.data || [];

                    setData(apiData);
                    setAllVerifyDataYPO(apiData);
                    setTimeout(() => {
                        setSuccessYPO(false);
                        setShowOverlayYPO(false);
                    }, 2000);

                } else {
                    setresponsemessageYPO(response.data.message || 'Failed');

                    setTimeout(() => {
                        setSuccessYPO(false);
                    }, 2000);
                }

            } catch (error) {
                setresponsemessageYPO('Server Error');
                setTimeout(() => {
                    setSuccessYPO(false);
                }, 2000);
            }

        }
    };

    const shareLocalFile = async (localFileUri: string) => {
        try {
            const urlToShare = localFileUri.startsWith('file://') ? localFileUri : `file://${localFileUri}`;
            await Share.share({ url: urlToShare } as any);
        } catch (err) {
            console.warn('shareLocalFile error', err);
            Alert.alert('Share failed', err?.message || String(err));
        }
    };

    // PdfViewerModal inside component (updated handleDownload)
    const PdfViewerModal = ({ visible, pdfUrl, pdfPublicUrl, onClose }: {
        visible: boolean;
        pdfUrl: string;
        pdfPublicUrl?: string | null;
        onClose: () => void;
    }) => {
        const [webViewKey, setWebViewKey] = useState(0);
        const [saving, setSaving] = useState(false);

        const handleDownload = async () => {
            try {
                if (!pdfUrl) { Alert.alert('No file', 'No PDF available to download'); return; }
                if (Platform.OS === 'ios') {
                    await shareLocalFile(pdfUrl);
                    return;
                }
                const localPath = pdfUrl.startsWith('file://') ? pdfUrl.replace('file://', '') : pdfUrl;
                const fileName = localPath.split('/').pop() || `document_${Date.now()}.pdf`;
                const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

                try {
                    await RNFS.copyFile(localPath, destPath);
                    if (ToastAndroid) {
                        ToastAndroid.show(`Saved to Downloads: ${fileName}`, ToastAndroid.LONG);
                    } else {
                        Alert.alert('Saved', `Saved to Downloads:\n${destPath}`);
                    }
                } catch (copyErr: any) {
                    console.error('copyFile failed', copyErr);
                    Alert.alert(
                        'Save failed',
                        'Could not save to Downloads. Allow "All files access" or grant storage permission in Settings, or share the file instead.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => openManageAllFilesPermission() },
                            { text: 'Share', onPress: () => shareLocalFile(pdfUrl) }
                        ]
                    );
                }
            } catch (err) {
                console.error('handleDownload error', err);
                Alert.alert('Error', `Could not save PDF: ${err?.message || err}`);
            }
        };

        const handleClose = () => {
            setWebViewKey(prev => prev + 1);
            onClose();
        };

        return (
            <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="fullScreen">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={crlimtreq_styles.pdfHeader}>
                        <TouchableOpacity onPress={handleDownload} style={crlimtreq_styles.pdfHeaderButton} disabled={saving || !pdfUrl}>
                            <Icon name="download" size={24} color={saving ? "#999" : "#000"} />
                            <Text style={crlimtreq_styles.pdfHeaderButtonText}>{saving ? 'Saving...' : 'Download'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClose} style={crlimtreq_styles.pdfHeaderButton}>
                            <Icon name="close" size={24} color="#000" />
                            <Text style={crlimtreq_styles.pdfHeaderButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                        {
                            pdfUrl ?
                                (
                                    <Pdf
                                        source={{ uri: pdfUrl }}
                                        style={{ flex: 1 }}
                                        onError={(e) => {
                                            console.error('react-native-pdf error', e);
                                            Alert.alert('Error', 'Failed to render PDF');
                                        }}
                                    />
                                )
                                :
                                (
                                    <View style={crlimtreq_styles.pdfLoading}> <Text>No PDF</Text> </View>
                                )
                        }
                    </View>
                </View>
            </Modal>
        );
    };


    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => (
        <View style={[
            crlimtreq_styles.card, !isConnected && crlimtreq_styles.disabledCard,
            item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card]}>
            {/* {
                item.isProcessed &&
                (
                    <View style={[crlimtreq_styles.stampContainerYOS,]}>
                        <View style={[crlimtreq_styles.stamp, item.actionType === 'accept' ? crlimtreq_styles.stampAccepted : crlimtreq_styles.stampRejected]}>
                            <Text style={crlimtreq_styles.stampText}>
                                {item.actionType === 'accept' ? 'APPROVED' : 'REJECTED'}
                            </Text>
                        </View>
                    </View>
                )
            } */}
            <View style={newStyles.content}>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Code</Text>
                    <Text style={newStyles.value}>{item.MItmCode || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Name</Text>
                    <Text style={newStyles.value}>{item.MItmName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Code</Text>
                    <Text style={newStyles.value}>{item.ItmCode || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Name</Text>
                    <Text style={newStyles.value}>{item.ItmName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Sub Group</Text>
                    <Text style={newStyles.value}>{item.IsgName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Group</Text>
                    <Text style={newStyles.value}>{item.IgName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Status</Text>
                    <Text style={newStyles.statusValue}>{item.AuthStatus || '-'}</Text>
                </View>

                <View style={newStyles.rowBetween}>
                    <Text style={newStyles.label}>Remark:</Text>
                    <RNTextInput
                        style={newStyles.editableValueBlack}
                        value={editableValuesYPO[item.ItmCode]?.aremark || ''}
                        onChangeText={(text) => handleEdit(item.ItmCode, 'aremark', text)}
                        placeholder="Enter remark..."
                    />
                </View>
            </View>
            {/* <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity
                    onPress={() => handleIconPress(item, 'accept')}
                    disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle"
                        size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleIconPress(item, 'reject')}
                    disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel"
                        size={40}
                        color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleInfoPress(item.d1, item)}
                    disabled={!isConnected}>
                    <View style={crlimtreq_styles.infoIconContainer}>
                        <Icon name="info" size={40} color={!isConnected ? "#ccc" : "#2196F3"} />
                        {item.d1 && <Text style={crlimtreq_styles.infoCount}>{item.d1.length}</Text>}
                    </View>
                </TouchableOpacity>
            </View> */}
            <View style={newStyles.divider} />
            <View style={newStyles.actions1}>

                {/* ACCEPT */}
                <TouchableOpacity
                    style={[
                        newStyles.textBtn,
                        (!isConnected || item.isProcessed) && newStyles.disabledBtn,
                        newStyles.acceptBtn
                    ]}
                    onPress={() => handleIconPress(item, 'accept')}
                    disabled={!isConnected || item.isProcessed}
                >
                    <Text style={newStyles.btnText}>ACCEPT</Text>
                </TouchableOpacity>

                {/* REJECT */}
                <TouchableOpacity
                    style={[
                        newStyles.textBtn,
                        (!isConnected || item.isProcessed) && newStyles.disabledBtn,
                        newStyles.rejectBtn
                    ]}
                    onPress={() => handleIconPress(item, 'reject')}
                    disabled={!isConnected || item.isProcessed}
                >
                    <Text style={newStyles.btnText}>REJECT</Text>
                </TouchableOpacity>

            </View>
        </View>
    );

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
        <View style={[
            crlimtreq_styles.card,
            item.IsAuth === '1' ? crlimtreq_styles.acceptedCard : item.IsAuth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {/* {
                item.IsAuth && (
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
                )} */}
            <View style={newStyles.content}>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Code</Text>
                    <Text style={newStyles.value}>{item.MItmCode || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Name</Text>
                    <Text style={newStyles.value}>{item.MItmName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Code</Text>
                    <Text style={newStyles.value}>{item.ItmCode || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Name</Text>
                    <Text style={newStyles.value}>{item.ItmName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Sub Group</Text>
                    <Text style={newStyles.value}>{item.IsgName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Group</Text>
                    <Text style={newStyles.value}>{item.IgName || '-'}</Text>
                </View>

                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Status</Text>
                    <Text style={newStyles.statusValue}>{item.AuthStatus || '-'}</Text>
                </View>

                <View style={newStyles.rowBetween}>
                    <Text style={newStyles.label}>Remark:</Text>
                    <Text style={newStyles.statusValue}>{item.aremark || '-'}</Text>
                </View>
            </View>
        </View>
    );

    const renderAllCardVerify = ({ item }: { item: AllHistoryData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' | 'pending' } }) => (
        <View style={[
            crlimtreq_styles.card,
            item.IsAuth === '1' ? crlimtreq_styles.acceptedCard : item.IsAuth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card,
        ]}>
            <View style={newStyles.content}>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Code</Text>
                    <Text style={newStyles.value}>{item.MItmCode || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Main Item Name</Text>
                    <Text style={newStyles.value}>{item.MItmName || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Code</Text>
                    <Text style={newStyles.value}>{item.ItmCode || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Name</Text>
                    <Text style={newStyles.value}>{item.ItmName || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Sub Group</Text>
                    <Text style={newStyles.value}>{item.IsgName || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Item Group</Text>
                    <Text style={newStyles.value}>{item.IgName || '-'}</Text>
                </View>
                <View style={newStyles.row}>
                    <Text style={newStyles.label}>Status</Text>
                    <Text style={newStyles.statusValue}>{item.AuthStatus || '-'}</Text>
                </View>
                <View style={newStyles.rowBetween}>
                    <Text style={newStyles.label}>Remark:</Text>
                    <RNTextInput
                        style={newStyles.editableValueBlack}
                        value={editableValuesYPO[item.ItmCode]?.aremark || ''}
                        onChangeText={(text) => handleEdit(item.ItmCode, 'aremark', text)}
                        placeholder="Enter remark..."
                    />
                </View>
            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity
                    style={[
                        newStyles.textBtn,
                        (!isConnected || item.isProcessed) && newStyles.disabledBtn,
                        newStyles.acceptBtn
                    ]}
                    onPress={() => handleIconPress(item, 'pending')}
                    disabled={!isConnected || item.isProcessed}>
                    <Text style={newStyles.btnText}>PENDING....</Text>
                    {/* <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} /> */}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        newStyles.textBtn,
                        (!isConnected || item.isProcessed) && newStyles.disabledBtn,
                        newStyles.rejectBtn
                    ]}
                    onPress={() => handleIconPress(item, 'verifyreject')}
                    disabled={!isConnected || item.isProcessed}>
                    {/* <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} /> */}
                    <Text style={newStyles.btnText}>REJECT---</Text>
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
                style={[crlimtreq_styles.tab1, activeTabYPO === 'history' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabYPO('history')}
            >
                <Text style={crlimtreq_styles.tabText1}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabYPO === 'verify' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabYPO('verify')}
            >
                <Text style={crlimtreq_styles.tabText1}>Verify</Text>
            </TouchableOpacity>
        </View>
    );


    return (
        <>
            {activeTab1YPO === 'requests' ? (
                <>
                    <HeaderBar
                        userName={username}
                        onSearch={setSearchQueryYPO}
                        placeholder="Search Item Authorization ..."
                    />
                </>
            ) : activeTab1YPO === 'history' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQueryYPO}
                    placeholder="Search Item history..."
                />
            ) : activeTab1YPO === 'verify' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchverifyQueryYPO}
                    placeholder="Search item verify..."
                />
            ) : null}
            <View style={crlimtreq_styles.container}>
                {isLoadingYPO && <FullScreenLoader message={activeTab1YPO === 'history' ? "Loading History..." : activeTab1YPO === 'verify' ? "Loading Verify..." : "Loading Request..."} />}
                <TabBar activeTabYPO={activeTab1YPO} setActiveTabYPO={setActiveTab1YPO} />
                <TouchableOpacity style={crlimtreq_styles.listIconContainer}>
                    <Icon name="list" size={24} color="white" onPress={handleCriteriaFormOpen} />
                </TouchableOpacity>
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
                                    {
                                        typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '' ?
                                            (
                                                <Text style={crlimtreq_styles.emptyTextRed}>No store Selected</Text>
                                            )
                                            :
                                            null
                                    }
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1YPO === 'history' ? (
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
                                    {
                                        typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '' ?
                                            (
                                                <Text style={crlimtreq_styles.emptyTextRed}>No store Selected</Text>
                                            )
                                            :
                                            null
                                    }
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1YPO === 'verify' ? (
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
                                    <Text style={crlimtreq_styles.emptyText}>No verify data found!</Text>
                                    {
                                        typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '' ?
                                            (
                                                <Text style={crlimtreq_styles.emptyTextRed}>No store Selected</Text>
                                            )
                                            :
                                            null
                                    }
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

                ) : activeTab1YPO === 'history' ? (
                    <>
                        {showTopButtonYPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollHistoryToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}</>
                ) : activeTab1YPO === 'verify' ? (
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
                                    {selectedActionYPO === 'accept' ? 'Confirm Accept' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'reject' ? 'Confirm Reject' : selectedActionYPO === 'verifyreject' ? 'Confirm Reject' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Item Name.: {selectedItemYPO?.ItmName}
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
                                    {selectedActionYPO === 'accept' ? 'Confirm Accept' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'reject' ? 'Confirm Reject' : selectedActionYPO === 'verifyreject' ? 'Confirm Reject' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Item Name: {selectedItemYPO?.ItmName}
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
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowCarouselModal(false);
                    }}
                >
                    <View style={crlimtreq_styles.carouselModalOverlay}>
                        <View style={crlimtreq_styles.carouselModalContainer}>
                            <TouchableOpacity
                                style={crlimtreq_styles.modalCloseButton}
                                onPress={() => {
                                    setShowCarouselModal(false);
                                    setSelectedD1Data([]);
                                }}
                            >
                                <Icon name="close" size={24} color={theme.BRAND_GRADIENT_END} />
                            </TouchableOpacity>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                snapToInterval={300} // Increased for better spacing
                                snapToAlignment="center"
                                decelerationRate="fast"
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={crlimtreq_styles.carouselCardContainer}
                            >
                                {selectedD1Data.map((d1Item, index) => (
                                    <View
                                        key={`${d1Item.SrNo || index}`}
                                        style={[
                                            crlimtreq_styles.carouselCard,
                                            { marginHorizontal: 10 }
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                                            style={crlimtreq_styles.headerContainer}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}>

                                            <View style={crlimtreq_styles.carouselCardContent}>
                                                <Text style={crlimtreq_styles.carouselCardTitle}>
                                                    {getD1Party}
                                                </Text>
                                                <View style={{ marginVertical: 10 }}>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Item Name: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.ItmName}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Grade: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.GrdName}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Shade: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.ShdName}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Qty: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.Qty}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Rate: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.UnitRate}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Amount: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.Amount}</Text>
                                                    </Text>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Disc. %: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.DisPer}</Text>
                                                    </Text>
                                                    {activeTab1YPO === 'requests' && (
                                                        <>
                                                            <Text style={crlimtreq_styles.carouselCardKey}>
                                                                Current Stock: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.CurrentStock}</Text>
                                                            </Text>
                                                            <Text style={crlimtreq_styles.carouselCardKey}>
                                                                Last Party: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.LastParty}</Text>
                                                            </Text>
                                                            <Text style={crlimtreq_styles.carouselCardKey}>
                                                                Last Rate: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.LastRate}</Text>
                                                            </Text>
                                                            <Text style={crlimtreq_styles.carouselCardKey}>
                                                                Last Shade: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.LastShade}</Text>
                                                            </Text>
                                                        </>
                                                    )}

                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
            <PdfViewerModal
                visible={showPdfModal}
                pdfUrl={pdfUrl}
                pdfPublicUrl={pdfPublicUrl}
                onClose={() => {
                    setShowPdfModal(false);
                    setPdfUrl('');
                    setPdfPublicUrl(null);
                }}
            />
            <CriteriaForm
                isVisible={criteriaFormOpen}
                onClose={handleCriteriaFormClose}
                isLoading={isLoadingYPO}
                FormState={FormState}
                setFormState={setFormState}
                getAllStoreData={getAllStoreData}
                setAllStoreData={setAllStoreData}
                token={token}
                fetchData={fetchData}
                fetchAllHistoryData={fetchAllHistoryData}
                fetchAllVerifyData={fetchAllVerifyData}
                activeTab1YPO={activeTab1YPO}
            />
        </>
    );
};
export default ItemAuthorization;
