import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// import RNFS from 'react-native-fs';
// import { Buffer } from 'buffer';
// import Pdf from 'react-native-pdf';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
// import { encode as btoa } from  'base-64';
// import { urlSafeEncode } from './urlSafeEncode';
// import { encodeData } from './encodingUtils';
import { API } from '@/common/API/dynamicAPI';
// import CriteriaForm from './CriteriaForm';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { fetchAllStoredata } from '../../common/API/Functions';
// import { useNavigation } from '@react-navigation/native';
// import { navigate } from '../../android/app/src/navigation/NavigationService';
import { useRouter } from 'expo-router';
// NEW ERP UI (global AppHeader shows the title, so the old HeaderBar band is gone)
import { S, T } from '@/src/theme';
import {
    ActionBtn,
    AuthBadge,
    Btn,
    BusyOverlay,
    CONTENT_MAX,
    Chip,
    EmptyState,
    Field,
    IconBtn,
    Kpi,
    KpiGrid,
    Metric,
    ModalCard,
    SearchBox,
    Segment,
    cellWidth,
    useSotLayout,
} from './ui';
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
    actionType: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
    UId: string;
    PrpCode: string;
    GrpCode: string;
    PONo: string;
    NPODate: string;
    PODate: string;
    ParCode: string;
    ParName: string;
    DueDay: string;
    DueDate: string;
    BAccCode: string;
    BAccName: string;
    EntType: string;
    EntryType: string;
    NetAmt: string;
    Remark: string;
    Status: string;
    StrCode: string;
    IsAuth: string;
    AuthCode: string;
    AUsrCode: string;
    ALastDate: string;
    ALastTime: string;
    AuthStatus: string;
    AuthorisedBy: string;
    ARemark: string;
    yearno: string;
    yarnstrcode: string;
    greystrcode: string;
    AuthorisedDate: string;
    PTYPE: string;
    CountOfItem: string;
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
    CurrentStock: string;
    LastParty: string;
    LastRate: string;
    LastShade: string;
}

const YarnPurchaseOrder: React.FC<Props> = ({ token, navigation, isConnected, username, ...rest }) => {
    const router = useRouter();
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
    const [editableValuesYPO, setEditableValuesYPO] = useState<{ [UId: string]: { limit2?: string; crday2?: string; rate?: string; qty?: string; shkperc?: string; ARemark?: string } }>({});
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
            PrpType: '',
            PrpCode: '',
            YearNo: '',
            StrCode: ''
        }
    })

    const [mailLogData, setMailLogData] = useState([]);
    const [mailLogModal, setMailLogModal] = useState(false);
    const [prptype, setPrptype] = useState('');

    const didFetchStore = useRef(false);
    const cancelTokenRef = useRef(null);
    const didInitialFetch = useRef(false);

    const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
    const [expandedRequestCards, setExpandedRequestCards] = useState({});
    const [expandedHistoryCards, setExpandedHistoryCards] = useState({});
    const [expandedVerifyCards, setExpandedVerifyCards] = useState({});
    const [subCardData, setSubCardData] = useState<{ [key: string]: D1datakeys[] }>({});
    const [loadingSubCard, setLoadingSubCard] = useState<{ [key: string]: boolean }>({});

    const [chartVisible, setChartVisible] = useState(false);
    const [chartData, setChartData] = useState<any>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartPayload, setChartPayload] = useState(null);
    const [ChartHelp, setChartHelpOpen] = useState(false);
    // 

    // NEW ERP UI: 1 col on phone, 2 on tablet, 3 on desktop (resize-aware)
    const { isPhone, cols, gutter } = useSotLayout();



    useEffect(() => {
        const getType = async () => {
            const type = await AsyncStorage.getItem('user_prptype');
            setPrptype(type);
        };
        getType();
    }, []);

    useEffect(() => {
        if (!token) return;
        if (didFetchStore.current) return;
        didFetchStore.current = true;

        const loadProperty = async () => {
            let yno = await AsyncStorage.getItem('yno');
            const allstoredata = await fetchAllStoredata(token, '', yno, 'purchase_order_detail')
            setAllStoreData(allstoredata)
        };
        loadProperty();
    }, [token]);



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

    

    // console.log("TESTING 1234123123123")

    const fetchData = useCallback(async () => {
        // console.log("TESTING")
        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;

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
                txntype: 'purchase_order_detail',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                // strcode: FormState.values.StrCode || '',
                atype: 'B',
                strtype: 'G',
                // strtype: strtypeFromApi
            };
            console.log("payload", payload);

            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    // 'x-platform':     'mob'
                },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("response", response)
            if (response.data.success && response.data.response.data.length > 0) {
                const updatedData = response.data.response.data.map(item => ({
                    ...item,
                    itemNameArray: item.d1.map(d => d.ItmName).join(', ')
                }));

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

    }, [FormState.values.StrCode, token]);

    /*
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
                prptype: prptype
            };
            // const historyPayload = {
            //     text: parcode,
            //     txntype: 'creditlimithistory',
            //     referrer: 'dashboard',
            //     action: 'partyhistory',
            //     prptype: prptype
            // };
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
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    };
    */
    const fetchHistoryData = useCallback(async (parcode: string, prptype: string) => {

        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;

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
            // const historyPayload = {
            //     text: parcode,
            //     txntype: 'creditlimithistory',
            //     referrer: 'dashboard',
            //     action: 'partyhistory',
            //     prptype: prptype
            // };
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
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    }, [FormState.values.StrCode]);

    /*
    const fetchAllHistoryData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);

        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');

        try {
            const allhistoryPayload = {
                txntype: 'purchase_order_detail',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                strcode: typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != '' ? FormState.values.StrCode : '',
                atype: 'H',
                strtype: 'Y'
            };
            const response = await axios.get(
                `${API}/api/purchaseorderbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            if (response.data.success && response.data.response.data.length > 0) {
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
    */
    const fetchAllHistoryData = useCallback(async () => {

        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;

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
                txntype: 'purchase_order_detail',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                // strcode: FormState.values.StrCode || '',
                atype: 'H',
                //strtype: 'Y',
                strtype: 'G'
            };


            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("payloadAllHistory", payload, response);
            setAllHistoryDataYPO(response?.data?.response?.data || []);
            setData([]);
            setAllVerifyDataYPO([]);

        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }

    }, [FormState.values.StrCode, token]);

    const fetchAllVerifyData = useCallback(async () => {
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
                txntype: 'purchase_order_detail',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                // strcode: FormState.values.StrCode || '',
                atype: 'A',
                //strtype: 'Y'
                strtype: 'G'
            };

            console.log("payload", payload);
            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: { Authorization: `Bearer ${token}` },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });

            setAllVerifyDataYPO(response?.data?.response?.data || []);
            setData([]);
            setAllHistoryDataYPO([]);

        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }

    }, [FormState.values.StrCode, token]);

    useEffect(() => {
        if (!token) return;
        if (activeTab1YPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'verify') {
            fetchAllVerifyData();
        }

        //}, [activeTab1YPO, fetchData, fetchAllHistoryData, fetchAllVerifyData]);
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
                AppAlert.alert('Error', 'Server error');
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
    const handleEdit = (UId: string, field: 'limit2' | 'crday2' | 'rate' | 'qty' | 'shkperc' | 'ARemark', formattedValue: string) => {
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
                [field]: field === 'ARemark' ? displayValuearemark : displayValuearemark,
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
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedD1Data(Array.isArray(d1Data) ? d1Data : []);
        setD1Party(item.ParName);
        setShowCarouselModal(true);
    };


    const getToken = () => {
        return token;
    };

    const handleValidation = (updatedItem: any) => {
        const isHistoryTab =
            String(activeTab1YPO).trim().toLowerCase() === 'history';
        if (selectedActionYPO === 'accept') {

            // const numericNewLimit2: any = parseFloat(updatedItem.limit2.replace(/,/g, ''));
            // const numericLimit1: any = parseFloat(updatedItem.limit1.replace(/,/g, ''));

            // if (
            //     parseFloat(numericNewLimit2).toFixed(2) ===
            //     parseFloat(numericLimit1).toFixed(2)
            // ) {
            //     AppAlert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be equal to Old Limit for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (updatedItem.limit2 === '0' || parseFloat(updatedItem.limit2) === 0) {
            //     AppAlert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (parseFloat(updatedItem.limit2) < 0) {
            //     AppAlert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (!updatedItem.limit2 || updatedItem.limit2.trim() === '') {
            //     AppAlert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be empty or invalid for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // }
        }
        // if (selectedActionYPO === 'pending' || selectedActionYPO === 'verifyreject') {

        //     if (
        //         updatedItem.ARemark === '' || updatedItem.ARemark === null || updatedItem.ARemark === undefined || !updatedItem.ARemark
        //     ) {
        //         AppAlert.alert(
        //             'Validation Error',
        //             'Auth Remark cannot be empty for Vouchar No.: ' + updatedItem.ParName
        //         )
        //         setShowOverlayYPO(false);
        //         return false;
        //     }
        // }
        if (
            !isHistoryTab &&
            (selectedActionYPO === 'pending' ||
                selectedActionYPO === 'verifyreject')
        ) {

            if (
                updatedItem.ARemark === '' || updatedItem.ARemark === null || updatedItem.ARemark === undefined || !updatedItem.ARemark
            ) {
                AppAlert.alert(
                    'Validation Error',
                    'Auth Remark cannot be empty for Vouchar No.: ' + updatedItem.ParName
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

    const sendmailorder = async (selectedItem) => {
        try {
            setIsLoadingYPO(true);

            const yno = await AsyncStorage.getItem('yno');

            const removed1 = { ...selectedItem };

            const today = new Date().toISOString().split('T')[0];

            const authItem = {
                UId: selectedItemYPO?.UId,
                IsAuth: selectedItemYPO?.IsAuth,
                ParName: selectedItemYPO?.ParName,
                Remark: selectedItemYPO?.Remark,
                PODate: selectedItemYPO?.PODate,
                PONo: selectedItemYPO?.PONo,
                NPODate: selectedItemYPO?.NPODate,
                mailsent: selectedItemYPO?.mailsent,
                strcode: selectedItemYPO?.StrCode,
                CreatedDate: today,
                ARemark: editableValuesYPO[selectedItemYPO.UId]?.ARemark || selectedItemYPO.ARemark || ''
            };

            const authArray = [authItem];
            // delete removed1.d1; // 

            const payload = {
                prpcode: selectedItem?.PrpCode || '',
                yearno: yno,
                strcode: selectedItem?.StrCode || '',
                sodate: selectedItem?.PODate || '',
                auth: authArray,
                txntype: 'purchase_order_auth',
                mailtxntype: 'purchase_order_detail'
            };

            console.log('📤 MAIL PAYLOAD:', payload);

            const response = await axios.post(
                `${API}/api/send_mail_order`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('📥 MAIL RESPONSE:', response);

        } catch (error) {
            console.log('❌ Mail Error:', error);
            AppAlert.alert('Error', 'Mail API failed');
        } finally {
            setIsLoadingYPO(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!selectedItemYPO) return;
        const removed1 = { ...selectedItemYPO };
        delete removed1['d1'];

        const updatedItemAccept = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 1,
            referrer: 'dashboard',
            txntype: 'purchase_order_detail',
            action: 'edit'
        };
        const updatedItemVerifyPending = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 0,
            referrer: 'dashboard',
            txntype: 'purchase_order_detail',
            action: 'edit'
        };
        const updatedItemReject = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 2,
            referrer: 'dashboard',
            txntype: 'purchase_order_detail',
            action: 'edit'
        };
        const updatedItemVerifyReject = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 2,
            referrer: 'dashboard',
            txntype: 'purchase_order_detail',
            action: 'edit'
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
            try {
                const getRequestConfig = (props: any) => {
                    let params = props.params ? props.params : null;
                    let requestconfig = {
                        headers: {
                            Authorization: `Bearer ${getToken()}`,
                            'Content-Type': 'application/javascript',
                            Accept: 'application/json'
                        },
                        params
                    };

                    console.log('params', params);

                    return requestconfig;
                };

                const response = await axios.get(`${API}/api/authpo`, getRequestConfig({ params: payload }));

                console.log("response", response);

                if (response.data.success) {
                    setresponsemessageYPO(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccessYPO(false);
                        setShowOverlayYPO(false);

                        if (selectedActionYPO === 'accept' && prptype === 'R') {
                            console.log('✅ Calling Mail API after success message...');
                            sendmailorder(selectedItemYPO);
                        }

                    }, 2000);

                    setData(prevData => {
                        const newData = prevData.filter(item => item.UId !== selectedItemYPO.UId);
                        newData.push({ ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO });
                        return newData;
                    });

                    setAllVerifyDataYPO(prevData => {
                        const newData = prevData.filter(item => item.UId !== selectedItemYPO.UId);
                        newData.push({ ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO });
                        return newData;
                    });

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
            } catch (error) {
                setresponsemessageYPO('Server Error');
                setTimeout(() => {
                    setSuccessYPO(false);
                }, 2000);
            }

        }
    };


    const handleInfoClick = async (selectedItem) => {
        try {
            setIsLoadingYPO(true);

            const yno = await AsyncStorage.getItem('yno');

            const payload = {
                prpcode: selectedItem?.PrpCode || '',
                uid: selectedItem?.UId || '',
                yearno: yno,
                strcode: selectedItem?.StrCode || '',
                txntype: 'purchase_order_auth',
            };

            console.log("payload", payload);

            const response = await axios.get(
                `${API}/api/mailordersentlog`,
                {
                    params: payload,
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("response", response);

            if (response?.data?.success && response.data.data?.length > 0) {
                setMailLogData(response.data.data);
                setMailLogModal(true);
            } else {
                AppAlert.alert('Info', 'No Data Found');
            }

        } catch (error) {
            console.log('❌ Mail Error:', error);
            AppAlert.alert('Error', 'Mail API failed');
        } finally {
            setIsLoadingYPO(false);
        }
    };


    const handleCallURL = async (item: CardData) => {
        setSelectedItem(item);
        setLocationLoading(item.UId);
        setPdfLoading(true);
        try {
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const apiResp = await axios.post(
                `${API}/api/saleschallanmultiprintnew`,
                {
                    prpcode: item.PrpCode,
                    yearno: item.yearno,
                    strcode: item.StrCode,
                    printTypes: ['purchase_order_detail'],
                    uid: item.UId,
                    txntype: "purchase_order_detail",
                    printFormat: 'A4',
                },
                { headers }
            );
            const pdfUrl = apiResp?.data?.results?.purchase_order_detail;
            router.push({
                pathname: '/(tabs)/pdf-view',
                params: { pdfUrl, title: 'Purchase Order' },
            });
            // if (!pdfUrlFromApi) {
            //     AppAlert.alert('Error', 'PDF URL not found in server response');
            //     return;
            // }
            // const pdfResp = await axios.get(pdfUrlFromApi, { responseType: 'arraybuffer' });
            // if (!pdfResp || !pdfResp.data) {
            //     AppAlert.alert('Error', 'Failed to download PDF bytes');
            //     return;
            // }
            // const buffer = Buffer.from(new Uint8Array(pdfResp.data));
            // const base64PDF = buffer.toString('base64');
            // const fileName = `yarn_purchase_order_${Date.now()}.pdf`;
            // const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
            // await RNFS.writeFile(localPath, base64PDF, 'base64');
            // setPdfUrl(`file://${localPath}`);
            // setPdfPublicUrl(pdfUrlFromApi);
            // setShowPdfModal(true);
        } catch (err: any) {
            console.error('handleCallURL error:', err);
            AppAlert.alert('Error', err?.message || 'Failed to fetch/preview PDF');
        } finally {
            setLocationLoading(false);
            setPdfLoading(false);
        }
    };

    // ---------------------------------------------------------------------
    // NEW ERP UI render helpers (presentation only — every handler below is
    // the original one, called with the original arguments).
    // ---------------------------------------------------------------------
    const isRayonsApi = API === "https://apiy.tms-webapp.com";
    const dash = (v: any) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v));
    const money = (v: any) => (v === undefined || v === null || String(v).trim() === '' ? '-' : `₹ ${v}`);

    const renderDetailRow = (label: string, value: any, color?: string) => (
        <View style={styles.detailRow} key={label}>
            <Text style={styles.detailLabel} numberOfLines={1}>{label}</Text>
            <Text style={[styles.detailValue, color ? { color } : null]} numberOfLines={2}>{value}</Text>
        </View>
    );

    const renderPoHead = (item: any, isApproved: boolean, isRejected: boolean) => (
        <View style={styles.cardHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.prpChip}>
                    <Icon name="apartment" size={11} color={T.copper} />
                    <Text style={styles.prpCodeText} numberOfLines={1}>{item.PrpCode}</Text>
                </View>
                <Text style={styles.poNo} numberOfLines={1}>{item.PONo}</Text>
                <View style={styles.dateRow}>
                    <Icon name="event" size={12} color={T.muted} />
                    <Text style={styles.date}>{item.PODate}</Text>
                </View>
            </View>
            {(isApproved || isRejected) && <AuthBadge kind={isApproved ? 'approved' : 'rejected'} />}
        </View>
    );

    const renderPartyLine = (item: any) => (
        <View style={styles.partyRow}>
            <View style={styles.partyIcon}>
                <Icon name="storefront" size={15} color={T.nav} />
            </View>
            <Text style={styles.party} numberOfLines={2}>{item.ParName}</Text>
        </View>
    );

    // Items (d1) accordion — same toggle (toggleExpandHistory) and same
    // ChartScreen route push as before, for every tab.
    const renderItemsBlock = (item: any, logNav: boolean) => (
        <>
            <TouchableOpacity
                style={styles.expandHeader}
                onPress={() => toggleExpandHistory(item.UId)}
                accessibilityRole="button"
                accessibilityLabel={`Items (${item.d1?.length || 0})`}
            >
                <Icon name="inventory-2" size={16} color={T.copper} />
                <Text style={styles.expandText}>
                    Items ({item.d1?.length || 0})
                </Text>
                <Icon
                    name={expandedHistoryCards[item.UId] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={22}
                    color={T.nav}
                />
            </TouchableOpacity>

            {expandedHistoryCards[item.UId] && (
                <View style={styles.itemContainer}>
                    {item.d1?.map((d1Item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemTitle} numberOfLines={2}>
                                    {d1Item.ItmName}
                                </Text>
                                <IconBtn
                                    icon="bar-chart"
                                    label={`Open chart for ${d1Item.ItmName}`}
                                    tone="soft"
                                    color={T.copper}
                                    onPress={() => {
                                        if (logNav) console.log("NAV TEST", navigation);

                                        router.push({
                                            pathname: '/ChartScreen',
                                            params: {
                                                item: JSON.stringify(item),
                                                d1Item: JSON.stringify(d1Item),
                                                token: token

                                            }
                                        });
                                    }}
                                />
                            </View>
                            <View style={styles.itemGrid}>
                                <Metric label="Grade" value={dash(d1Item.GrdName)} style={styles.itemBox} />
                                <Metric label="Shade" value={dash(d1Item.ShdName)} style={styles.itemBox} />
                                <Metric label="Qty" value={dash(d1Item.Qty)} style={styles.itemBox} />
                                <Metric label="Rate" value={dash(d1Item.UnitRate)} style={styles.itemBox} />
                                <Metric label="Amount" value={dash(d1Item.Amount)} color={T.pd} style={styles.itemBox} />
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </>
    );

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => {

        const isApproved = item.IsAuth === '1';
        const isRejected = item.IsAuth === '2';

        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View style={[
                    styles.card,
                    isApproved ? styles.acceptedCard :
                        isRejected ? styles.rejectedCard : null
                ]}>
                    {renderPoHead(item, isApproved, isRejected)}
                    {renderPartyLine(item)}

                    <View style={styles.detailBox}>
                        {renderDetailRow('Broker', item.BAccName || '-')}
                        {renderDetailRow('Net Amount', money(item.NetAmt), T.pd)}
                        {isRayonsApi && renderDetailRow('Store', item.StoreName || '-')}
                        {renderDetailRow('Auth By', item.AuthorisedBy || '-')}
                    </View>

                    {String(item.isauthedit) === '1' && (
                        <View style={styles.actionRow}>
                            <ActionBtn
                                label="Mark Pending"
                                icon="check-circle"
                                tone="red"
                                outline
                                onPress={() =>
                                    handleIconPress(
                                        {
                                            ...item,
                                            itemNameArray:
                                                item.d1?.map(x => x.ItmName).join(', ') || '',
                                        } as unknown as CardData,
                                        'pending'
                                    )
                                }
                                disabled={!isConnected || item.isProcessed}
                            />
                        </View>
                    )}

                    {renderItemsBlock(item, true)}
                </View>
            </View>
        );
    };

    const renderCommonCard = ({ item, type }: { item: any, type: 'history' | 'request' | 'verify' }) => {

        const isApproved = item.IsAuth === '1';
        const isRejected = item.IsAuth === '2';
        const actionsOff = !isConnected || item.isProcessed;

        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View style={[
                    styles.card, !isConnected && styles.disabledCard,
                    item.actionType === 'accept' ? styles.acceptedCard : item.actionType === 'reject' ? styles.rejectedCard : null]}>

                    {/* Display fix: a verify "pending" action (IsAuth 0) is shown as PENDING (amber), not REJECTED. */}
                    {item.isProcessed && (
                        <View style={[styles.stamp, item.actionType === 'accept' ? styles.stampAccepted : item.actionType === 'pending' ? styles.stampPending : styles.stampRejected]}>
                            <Icon
                                name={item.actionType === 'accept' ? 'verified' : item.actionType === 'pending' ? 'schedule' : 'block'}
                                size={14}
                                color={item.actionType === 'accept' ? T.green : item.actionType === 'pending' ? T.amber : T.red}
                            />
                            <Text style={[styles.stampText, { color: item.actionType === 'accept' ? T.green : item.actionType === 'pending' ? T.amber : T.red }]}>
                                {item.actionType === 'accept' ? 'APPROVED' : item.actionType === 'pending' ? 'PENDING' : 'REJECTED'}
                            </Text>
                        </View>
                    )}

                    {renderPoHead(item, isApproved, isRejected)}
                    {renderPartyLine(item)}

                    <View style={styles.detailBox}>
                        {renderDetailRow('Broker', item.BAccName || '-')}
                        {renderDetailRow('Net Amount', money(item.NetAmt), T.pd)}
                        {renderDetailRow('Sales Exec.', item.sexecname || '-')}
                        {isRayonsApi && renderDetailRow('Store', item.StoreName || '-')}
                        {renderDetailRow('Auth By', item.AuthorisedBy || '-')}
                    </View>

                    <Field
                        label="Auth Remark"
                        placeholder="Add authorisation remark…"
                        value={editableValuesYPO[item.UId]?.ARemark || ''}
                        onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                    />

                    {
                        type === 'verify' && (
                            <View style={styles.actionRow}>
                                <ActionBtn
                                    label="Pending"
                                    icon="check-circle"
                                    tone="green"
                                    onPress={() => handleIconPress(item, 'pending')}
                                    disabled={actionsOff}
                                />
                                <ActionBtn
                                    label="Reject"
                                    icon="cancel"
                                    tone="red"
                                    outline
                                    onPress={() => handleIconPress(item, 'verifyreject')}
                                    disabled={actionsOff}
                                />
                            </View>
                        )
                    }

                    {
                        type === 'request' && (
                            <View style={styles.actionRow}>
                                <ActionBtn
                                    label="Approve"
                                    icon="check-circle"
                                    tone="green"
                                    onPress={() => handleIconPress(item, 'accept')}
                                    // disabled={!isConnected || item.IsAuth !== '0'}
                                    disabled={actionsOff}
                                />
                                <ActionBtn
                                    label="Reject"
                                    icon="cancel"
                                    tone="red"
                                    outline
                                    onPress={() => handleIconPress(item, 'reject')}
                                    // disabled={!isConnected || item.IsAuth !== '0'}
                                    disabled={actionsOff}
                                />
                                <ActionBtn
                                    label="PDF"
                                    icon="file-present"
                                    tone="blue"
                                    outline
                                    onPress={() => {
                                        if (isConnected && item.IsAuth === '0') {
                                            handleCallURL(item);
                                        }
                                    }}
                                    loading={getLocationLoading === item.UId}
                                    disabled={!isConnected || item.IsAuth !== '0' || getLocationLoading === item.UId}
                                    style={styles.pdfBtn}
                                />
                            </View>
                        )
                    }

                    {renderItemsBlock(item, false)}
                </View>
            </View>
        );
    };

    const toggleExpandHistory = (uid: string, arr) => {
        console.log("--------arrr-----------", arr)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // setExpandedCards(prev => ({
        //     ...prev,
        //     [uid]: !prev[uid]
        // }));
        setExpandedHistoryCards(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };
    const toggleExpandVerify = (uid: string, arr) => {
        console.log("--------arrr-----------", arr)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // setExpandedCards(prev => ({
        //     ...prev,
        //     [uid]: !prev[uid]
        // }));
        setExpandedVerifyCards(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    // ---------------- NEW ERP UI: derived display values ----------------
    const activeSearch =
        activeTab1YPO === 'requests' ? searchQueryYPO : activeTab1YPO === 'history' ? searchhistoryQueryYPO : searchverifyQueryYPO;
    const onActiveSearch =
        activeTab1YPO === 'requests' ? setSearchQueryYPO : activeTab1YPO === 'history' ? setSearchhistoryQueryYPO : setSearchverifyQueryYPO;
    const searchPlaceholder =
        activeTab1YPO === 'requests' ? 'Search purchase order...' : activeTab1YPO === 'history' ? 'Search purchase history...' : 'Search purchase verify...';
    const shownRows: any[] =
        activeTab1YPO === 'requests' ? filteredDataSPO : activeTab1YPO === 'history' ? filteredhistoryDataSPO : filteredverifyDataSPO;
    const num = (v: any) => {
        const x = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
        return Number.isFinite(x) ? x : 0;
    };
    const kpiNet = shownRows.reduce((s, r) => s + num(r?.NetAmt), 0);
    const kpiItems = shownRows.reduce((s, r) => s + (Array.isArray(r?.d1) ? r.d1.length : 0), 0);
    const kpiApproved = shownRows.filter((r) => r?.IsAuth === '1').length;
    // Rejected = real rejects only (a verify "pending" action is not a reject).
    const kpiRejected = shownRows.filter((r) => r?.IsAuth === '2' || r?.actionType === 'reject' || r?.actionType === 'verifyreject').length;
    const kpiProcessed = shownRows.filter((r) => r?.isProcessed).length;
    const noStore = typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '';
    const tabLabel = activeTab1YPO === 'requests' ? 'Requests' : activeTab1YPO === 'history' ? 'History' : 'Verify';
    const confirmTitle = selectedActionYPO === 'accept' ? 'Confirm Accept' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'reject' ? 'Confirm Reject' : selectedActionYPO === 'verifyreject' ? 'Confirm Reject' : '';
    const confirmTone = selectedActionYPO === 'accept' || selectedActionYPO === 'pending' ? 'green' : 'red';
    const listContentStyle = [styles.list, { paddingHorizontal: gutter - 5 }];

    const renderListHeader = () => (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi label="Orders" value={String(shownRows.length)} icon="receipt-long" accent={T.nav} sub={tabLabel} />
                <Kpi label="Net Amount" value={`₹ ${kpiNet.toLocaleString('en-IN')}`} icon="currency-rupee" accent={T.copper} valueColor={T.pd} />
                <Kpi label="Items" value={String(kpiItems)} icon="inventory-2" accent={T.blue} sub="Yarn lines" />
                {activeTab1YPO === 'history' ? (
                    <Kpi label="Approved" value={String(kpiApproved)} icon="verified" accent={T.green} sub={`${kpiRejected} rejected`} />
                ) : (
                    <Kpi label="Processed" value={String(kpiProcessed)} icon="task-alt" accent={T.green} sub="This session" />
                )}
            </KpiGrid>
        </View>
    );

    const renderEmpty = (title: string) => (
        <EmptyState
            icon="receipt-long"
            title={title}
            text={activeSearch ? 'Nothing matches your search. Try another PO no., party or item.' : 'Purchase orders will appear here once available.'}
            action={noStore ? <Chip label="No store Selected" icon="store" tone="red" /> : null}
        />
    );

    return (
        <View style={styles.root}>
            {/* ───────────── Toolbar: search + tabs (replaces HeaderBar) ───────────── */}
            <View style={styles.toolbar}>
                <View style={[styles.toolbarInner, { paddingHorizontal: gutter }, !isPhone && styles.toolbarWide]}>
                    <SearchBox
                        value={activeSearch}
                        onChangeText={onActiveSearch}
                        placeholder={searchPlaceholder}
                        style={isPhone ? null : { flex: 1 }}
                    />
                    <View style={isPhone ? null : styles.segWide}>
                        <Segment
                            value={activeTab1YPO}
                            onChange={setActiveTab1YPO}
                            options={[
                                { value: 'requests', label: 'Request', icon: 'pending-actions' },
                                { value: 'history', label: 'History', icon: 'history' },
                                { value: 'verify', label: 'Verify', icon: 'fact-check' },
                            ]}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.container}>
                {activeTab1YPO === 'requests' ? (
                    <FlatList
                        key={`req-${cols}`}
                        ref={flatListRefYPO}
                        data={filteredDataSPO}
                        numColumns={cols}
                        style={styles.flatList}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'request' })}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        ListHeaderComponent={renderListHeader()}
                        keyboardShouldPersistTaps="handled"
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !isLoadingYPO ? renderEmpty('No request data found!') : null
                        }
                    />
                ) : activeTab1YPO === 'history' ? (
                    <FlatList
                        key={`hist-${cols}`}
                        ref={flatHistoryListRefYPO}
                        data={filteredhistoryDataSPO}
                        numColumns={cols}
                        style={styles.flatList}
                        renderItem={({ item }) => (
                            <>
                                {renderAllCardHistory({ item })}
                            </>
                        )}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        ListHeaderComponent={renderListHeader()}
                        keyboardShouldPersistTaps="handled"
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingYPO ? renderEmpty('No history data found!') : null
                        }
                    />
                ) : activeTab1YPO === 'verify' ? (
                    <FlatList
                        key={`ver-${cols}`}
                        ref={flatVerifyListRefYPO}
                        data={filteredverifyDataSPO}
                        numColumns={cols}
                        style={styles.flatList}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'verify' })}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        ListHeaderComponent={renderListHeader()}
                        keyboardShouldPersistTaps="handled"
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingYPO ? renderEmpty('No verify data found!') : null
                        }
                    />
                ) : null}

                {showTopButtonYPO && (
                    <TouchableOpacity
                        style={styles.topButton}
                        onPress={activeTab1YPO === 'requests' ? scrollToTop : activeTab1YPO === 'history' ? scrollHistoryToTop : scrollVerifyToTop}
                        accessibilityRole="button"
                        accessibilityLabel="Scroll to top"
                    >
                        <Icon name="arrow-upward" size={22} color="#fff" />
                    </TouchableOpacity>
                )}

                <PartyHistoryModal
                    visible={showPartyHistoryModalYPO}
                    onClose={() => {
                        setShowPartyHistoryModalYPO(false);
                        setAllHistoryDataYPO([]);
                    }}
                    partyListYPO={partyListYPO}
                    historyDataYPO={historyDataYPO}
                    // allhistoryDataYPO={allhistoryDataYPO}
                    prodorderLoadingYPO={prodorderLoadingYPO}
                    historyLoadingYPO={historyLoadingYPO}
                    // allhistoryLoadingYPO={allhistoryLoadingYPO}
                    // showAllHistoryOnly={!!allhistoryDataYPO.length}
                    activeTabYPO={activeTabYPO}
                    setActiveTabYPO={setActiveTabYPO}
                    // setParnameYPO={setParnameYPO}
                    getParnameYPO={getParnameYPO}
                />

                {/* ───────────── Confirm / result dialog (same two-state logic) ───────────── */}
                {getSuccessYPO === true ? (
                    <ModalCard
                        visible={showOverlayYPO}
                        onRequestClose={() => setShowOverlayYPO(false)}
                        eyebrow="PURCHASE ORDER"
                        title={confirmTitle}
                        maxWidth={440}
                    >
                        <View style={styles.dialogBody}>
                            <Text style={styles.dialogMeta}>
                                Vouchar No.: {selectedItemYPO?.vouno}
                            </Text>
                            {responsemessageYPO === 'Loading...' ? (
                                <View style={styles.dialogStatus}>
                                    <ActivityIndicator size="small" color={T.copper} />
                                    <Text style={styles.dialogStatusText}>{responsemessageYPO}</Text>
                                </View>
                            ) : (
                                <View style={[styles.dialogStatus, styles.dialogResult]}>
                                    <Icon name="info-outline" size={18} color={T.nav} />
                                    <Text style={styles.dialogStatusText}>
                                        {responsemessageYPO}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ModalCard>
                ) : (
                    <ModalCard
                        visible={showOverlayYPO}
                        onRequestClose={() => setShowOverlayYPO(false)}
                        eyebrow="PURCHASE ORDER"
                        title={confirmTitle}
                        maxWidth={440}
                        footer={
                            <>
                                <Btn label="Cancel" icon="close" kind="ghost" onPress={() => setShowOverlayYPO(false)} style={{ flex: 1 }} />
                                <ActionBtn label="Confirm" icon="check" tone={confirmTone} onPress={handleConfirmAction} style={styles.dialogConfirm} />
                            </>
                        }
                    >
                        <View style={styles.dialogBody}>
                            <Text style={styles.dialogMeta}>
                                Party Name: <Text style={styles.dialogStrong}>{selectedItemYPO?.ParName}</Text>
                            </Text>
                            {!!selectedItemYPO?.PONo && (
                                <Text style={styles.dialogSub}>
                                    PO {selectedItemYPO?.PONo}{selectedItemYPO?.NetAmt ? `  ·  ₹ ${selectedItemYPO?.NetAmt}` : ''}
                                </Text>
                            )}
                        </View>
                    </ModalCard>
                )}

                {/* ───────────── Item details (d1) carousel ───────────── */}
                <ModalCard
                    visible={showCarouselModal}
                    animationType="slide"
                    onRequestClose={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowCarouselModal(false);
                    }}
                    onClose={() => {
                        setShowCarouselModal(false);
                        setSelectedD1Data([]); // Clear the data when closing
                    }}
                    eyebrow="ITEM DETAILS"
                    title={getD1Party || 'Items'}
                    maxWidth={720}
                >
                    <ScrollView
                        horizontal
                        pagingEnabled
                        snapToInterval={300} // Increased for better spacing
                        snapToAlignment="center"
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselRow}
                    >
                        {selectedD1Data.map((d1Item, index) => (
                            <View key={`${d1Item.SrNo || index}`} style={styles.carouselCard}>
                                <Text style={styles.carouselParty} numberOfLines={1}>{getD1Party}</Text>
                                <Text style={styles.carouselTitle} numberOfLines={2}>{d1Item.ItmName}</Text>
                                <View style={styles.detailBox}>
                                    {renderDetailRow('Item Name', dash(d1Item.ItmName))}
                                    {renderDetailRow('Grade', dash(d1Item.GrdName))}
                                    {renderDetailRow('Shade', dash(d1Item.ShdName))}
                                    {renderDetailRow('Qty', dash(d1Item.Qty))}
                                    {renderDetailRow('Rate', dash(d1Item.UnitRate))}
                                    {renderDetailRow('Amount', dash(d1Item.Amount), T.pd)}
                                    {renderDetailRow('Disc. %', dash(d1Item.DisPer))}
                                    {activeTab1YPO === 'requests' && (
                                        <>
                                            {renderDetailRow('Current Stock', dash(d1Item.CurrentStock))}
                                            {renderDetailRow('Last Party', dash(d1Item.LastParty))}
                                            {renderDetailRow('Last Rate', dash(d1Item.LastRate))}
                                            {renderDetailRow('Last Shade', dash(d1Item.LastShade))}
                                        </>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </ModalCard>

                <BusyOverlay visible={isLoadingYPO} text="Loading..." />
            </View>

            {/* <ChartScreen
                visible={chartVisible}
                data={chartData}
                loading={chartLoading}
                token={token}
                onClose={() => setChartVisible(false)}
            /> */}

            {/* ✅ CHART MODAL */}
            <ModalCard
                visible={chartVisible}
                animationType="slide"
                onRequestClose={() => setChartVisible(false)}
                onClose={() => setChartVisible(false)}
                eyebrow="CHART"
                title="Rate & Qty"
                maxWidth={720}
            >
                <View style={styles.chartBody}>

                    {chartLoading && (
                        <ActivityIndicator size="large" color={T.copper} />
                    )}

                    {!chartLoading && chartData?.labels?.length > 0 && (

                        <ScrollView horizontal>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>

                                {chartData.labels.map((label, index) => {

                                    const rate = chartData.rate[index] || 0;
                                    const qty = chartData.qty[index] || 0;

                                    return (
                                        <View
                                            key={index}
                                            style={styles.chartCol}
                                        >

                                            {/* RATE BAR */}
                                            <View style={[styles.chartBar, { height: rate / 2, backgroundColor: T.green, marginBottom: 4 }]} />

                                            {/* QTY BAR */}
                                            <View style={[styles.chartBar, { height: qty / 2, backgroundColor: T.blue }]} />

                                            {/* LABEL */}
                                            <Text style={styles.chartLabel}>
                                                {label}
                                            </Text>

                                        </View>
                                    );
                                })}

                            </View>
                        </ScrollView>
                    )}

                    {!chartLoading && (!chartData || chartData.labels?.length === 0) && (
                        <EmptyState icon="bar-chart" title="No chart data available" />
                    )}

                </View>
            </ModalCard>

            {/* ───────────── Mail sent log ───────────── */}
            <ModalCard
                visible={mailLogModal}
                animationType="slide"
                eyebrow="MAIL LOG"
                title={`${mailLogData.length} Sent Log(s) found`}
                maxWidth={600}
                footer={
                    <Btn label="Close" kind="primary" onPress={() => setMailLogModal(false)} style={{ flex: 1 }} />
                }
            >
                <FlatList
                    data={mailLogData}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={false}
                    style={styles.logList}
                    contentContainerStyle={styles.logListContent}
                    renderItem={({ item }) => (
                        <View style={styles.logCard}>

                            <View style={styles.logHeaderBox}>
                                <Icon name="person" size={14} color={T.copper} />
                                <Text style={styles.logHeader} numberOfLines={1}>
                                    {item.usrname}
                                </Text>
                            </View>

                            {[
                                { label: 'Sent Date', value: item.sentdt },
                                { label: 'From', value: item.from },
                                { label: 'To', value: item.to },
                                { label: 'Subject', value: item.subject },
                                { label: 'Remarks', value: item.remarks },
                                { label: 'Sent', value: item.mailsent }
                            ].map((row, index) => (
                                <View key={index} style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{row.label}</Text>
                                    <Text
                                        style={[
                                            styles.detailValue,
                                            row.label === 'Sent' && {
                                                color: row.value === 'Yes' ? T.green : T.red
                                            }
                                        ]}
                                        numberOfLines={2} // 🔥 wrap control
                                    >
                                        {row.value}
                                    </Text>
                                </View>
                            ))}

                        </View>
                    )}
                />
            </ModalCard>

            {/* <PdfViewerModal
                visible={showPdfModal}
                pdfUrl={pdfUrl}
                pdfPublicUrl={pdfPublicUrl}
                onClose={() => {
                    setShowPdfModal(false);
                    setPdfUrl('');
                    setPdfPublicUrl(null);
                }}
            /> */}


            {/* <CriteriaForm
                isVisible={criteriaFormOpen}
                onClose={handleCriteriaFormClose}
                isLoading={isLoadingYPO}
                //getAllPropertyData={getAllPropertyData}
                //setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                //getAllYearData={getAllYearData}
                //setAllYearData={setAllYearData}
                getAllStoreData={getAllStoreData}
                setAllStoreData={setAllStoreData}
                token={token}
                fetchData={fetchData}
                //fetchHistoryData={fetchHistoryData}
                fetchAllHistoryData={fetchAllHistoryData}
                fetchAllVerifyData={fetchAllVerifyData}
                activeTab1YPO={activeTab1YPO}
            /> */}
        </View>
    );
};

// NEW ERP theme styles (tokens only — T / S from '@/src/theme').
const styles = StyleSheet.create({
    // ----- shell -----
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
    flatList: { flex: 1, backgroundColor: T.bg },
    list: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, marginBottom: 4 },
    gridCell: { padding: 5 },

    // ----- toolbar -----
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 10,
        paddingBottom: 10,
    },
    toolbarInner: {
        gap: 8,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    toolbarWide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    segWide: { width: 380 },

    // ----- PO card -----
    card: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 12,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    disabledCard: { opacity: 0.6 },
    acceptedCard: { borderLeftWidth: 4, borderLeftColor: T.green },
    rejectedCard: { borderLeftWidth: 4, borderLeftColor: T.red },
    stamp: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 9,
        borderWidth: 1,
        paddingVertical: 6,
    },
    stampAccepted: { backgroundColor: `${T.green}12`, borderColor: `${T.green}40` },
    stampRejected: { backgroundColor: `${T.red}10`, borderColor: `${T.red}40` },
    stampPending: { backgroundColor: `${T.amber}14`, borderColor: `${T.amber}55` },
    stampText: { fontSize: 11.5, fontWeight: '900', letterSpacing: 1.2 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    prpChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor: `${T.copper}14`,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginBottom: 6,
        maxWidth: '100%',
    },
    prpCodeText: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    poNo: { fontSize: 15, fontWeight: '800', color: T.ink },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    date: { fontSize: 11.5, fontWeight: '600', color: T.muted },
    partyRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    partyIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: T.alt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    party: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink, lineHeight: 19 },
    detailBox: {
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        paddingHorizontal: 11,
        paddingVertical: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    detailLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
    detailValue: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink, textAlign: 'right' },
    actionRow: { flexDirection: 'row', gap: 8 },
    pdfBtn: { flex: 0.8 },

    // ----- items accordion -----
    expandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: T.hair,
    },
    expandText: { flex: 1, fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
    itemContainer: { gap: 8 },
    itemCard: {
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 11,
        gap: 8,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.ink },
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
    itemBox: { flex: 0, width: '33.33%', paddingRight: 6 },

    // ----- scroll to top -----
    topButton: {
        position: 'absolute',
        right: 16,
        bottom: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.nav,
        alignItems: 'center',
        justifyContent: 'center',
        ...S.card,
    },

    // ----- dialogs -----
    dialogBody: { padding: 16, gap: 10 },
    dialogMeta: { fontSize: 13.5, fontWeight: '600', color: T.muted },
    dialogStrong: { color: T.ink, fontWeight: '800' },
    dialogSub: { fontSize: 12, fontWeight: '700', color: T.copper },
    dialogStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 12,
    },
    dialogResult: { backgroundColor: `${T.nav}08` },
    dialogStatusText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: T.nav },
    dialogConfirm: { height: 44 },

    // ----- carousel -----
    carouselRow: { padding: 16, gap: 12 },
    carouselCard: {
        width: 280,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 8,
    },
    carouselParty: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2, textTransform: 'uppercase' },
    carouselTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink },

    // ----- chart -----
    chartBody: { padding: 16, minHeight: 160, justifyContent: 'center' },
    chartCol: { marginHorizontal: 8, alignItems: 'center' },
    chartBar: { width: 20, borderRadius: 4 },
    chartLabel: { fontSize: 10, fontWeight: '700', color: T.muted, marginTop: 6 },

    // ----- mail log -----
    logList: { flexGrow: 0, flexShrink: 1 },
    logListContent: { padding: 16, gap: 10 },
    logCard: {
        backgroundColor: T.sub,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.hair,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    logHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    logHeader: { flex: 1, fontSize: 14, fontWeight: '800', color: T.nav },
});

export default YarnPurchaseOrder;
