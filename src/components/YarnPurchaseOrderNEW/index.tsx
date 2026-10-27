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
// NEW ERP theme (presentation only — every API call / handler below is unchanged)
import {
    Btn,
    BusyOverlay,
    CONTENT_MAX,
    EmptyState,
    Field,
    IconBtn,
    Kpi,
    KpiGrid,
    Metric,
    SearchBox,
    SectionHead,
    Segment,
    Sheet,
    cellWidth,
    useSotLayout,
} from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
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

    // NEW ERP UI: responsive layout (1 col phone, 2 tablet, 3 desktop)
    const { isPhone, isDesktop, cols, gutter } = useSotLayout();

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

    /*
    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');

        try {
            const payload = {
                txntype: 'purchase_order_detail',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                strcode: typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != '' ? FormState.values.StrCode : '',
                atype: 'B',
                strtype: 'Y'
            };
            console.log("fetchData request tab api payload :", payload)
            console.log("fetchData request tab api url :", `${API}/api/purchaseorderbrowse`)
            const response = await axios.get(
                `${API}/api/purchaseorderbrowse`,
                getRequestConfig({ params: { ...payload } })
            );
            console.log('🔵 fetchData request tab api response', response);
            if (response.data.success == false) {
                AppAlert.alert(response.data.message)
            }
            if (response.data.success && response.data.response.data.length > 0) {
                const updatedData = response.data.response.data.map(item => {
                    const itemNames = item.d1.map(d => d.ItmName).join(', ');
                    return {
                        ...item,
                        itemNameArray: itemNames
                    };
                });
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
    */

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
                strcode: FormState.values.StrCode || '',
                atype: 'B',
                //strtype: 'Y',
                strtype: strtypeFromApi
            };
            console.log("payload", payload);

            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'x-platform': 'mob'
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
                // AppAlert.alert('Error', 'Server error');
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
                // AppAlert.alert('Error', 'Server error');
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
                strcode: FormState.values.StrCode || '',
                atype: 'H',
                //strtype: 'Y',
                strtype: strtypeFromApi
            };


            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: { Authorization: `Bearer ${token}`, 'x-platform': 'mob' },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });
            console.log("payloadAllHistory", payload, response);
            setAllHistoryDataYPO(response?.data?.response?.data || []);
            setData([]);
            setAllVerifyDataYPO([]);

        } catch (error) {
            if (!axios.isCancel(error)) {
                // AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }

    }, [FormState.values.StrCode, token]);

    /*
    const fetchAllVerifyData = async () => {

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
                atype: 'A',
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
    */
    const fetchAllVerifyData = useCallback(async () => {

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
                strcode: FormState.values.StrCode || '',
                atype: 'A',
                //strtype: 'Y'
                strtype: strtypeFromApi
            };

            console.log("payload", payload);
            const response = await axios.get(`${API}/api/purchaseorderbrowse`, {
                headers: { Authorization: `Bearer ${token}`, 'x-platform': 'mob' },
                params: payload,
                cancelToken: cancelTokenRef.current.token
            });

            setAllVerifyDataYPO(response?.data?.response?.data || []);
            setData([]);
            setAllHistoryDataYPO([]);

        } catch (error) {
            if (!axios.isCancel(error)) {
                // AppAlert.alert('Error', 'Server error');
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
                // AppAlert.alert('Error', 'Server error');
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

    // ---------------------------------------------------------------------------
    // NEW ERP UI render helpers (presentation only — every button below calls the
    // original handler with the original arguments).
    // ---------------------------------------------------------------------------
    const noStoreSelected =
        typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '';

    const renderItemLines = (item: any) => (
        <View style={styles.itemContainer}>
            {item.d1?.map((d1Item, index) => (
                <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                        <View style={styles.itemIcon}>
                            <Icon name="texture" size={16} color={T.copper} />
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                            {d1Item.ItmName}
                        </Text>
                        <IconBtn
                            icon="bar-chart"
                            tone="soft"
                            color={T.copper}
                            label={`Rate chart for ${d1Item.ItmName}`}
                            onPress={() => {
                                console.log("NAV TEST", navigation);

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
                        <Metric label="Grade" value={showVal(d1Item.GrdName)} style={styles.itemBox} />
                        <Metric label="Shade" value={showVal(d1Item.ShdName)} style={styles.itemBox} />
                        <Metric label="Qty" value={showVal(d1Item.Qty)} style={styles.itemBox} />
                        <Metric label="Rate" value={showMoney(d1Item.UnitRate)} style={styles.itemBox} />
                        <Metric label="Amount" value={showMoney(d1Item.Amount)} color={T.pd} style={styles.itemBox} />
                        <Metric label="Last Date" value={showVal(d1Item.LatestRateDate)} color={T.pd} style={styles.itemBox} />
                        <Metric label="Last Rate" value={showMoney(d1Item.LatestUnitRate)} style={styles.itemBox} />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderPOCard = (item: any, type: 'history' | 'request' | 'verify') => {
        const isApproved = item.IsAuth === '1';
        const isRejected = item.IsAuth === '2';
        const isHistory = type === 'history';
        const disabledAction = !isConnected || item.isProcessed;
        const expanded = !!expandedHistoryCards[item.UId];
        const lineCount = item.d1?.length || 0;

        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View
                    style={[
                        styles.card,
                        !isHistory && !isConnected && styles.disabledCard,
                        isHistory
                            ? (isApproved ? styles.acceptedCard : isRejected ? styles.rejectedCard : null)
                            : (item.actionType === 'accept' ? styles.acceptedCard : item.actionType === 'reject' ? styles.rejectedCard : null),
                    ]}
                >
                    {/* HEADER: property eyebrow, PO no + date, status */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.eyebrow} numberOfLines={1}>{item.PrpCode}</Text>
                            <Text style={styles.poNo} numberOfLines={1}>{item.PONo}</Text>
                            <View style={styles.dateRow}>
                                <Icon name="event" size={12} color={T.muted} />
                                <Text style={styles.date}>{item.PODate}</Text>
                            </View>
                        </View>
                        <View style={styles.tagCol}>
                            {(isApproved || isRejected) && (
                                <StatusTag
                                    label={isApproved ? 'Approved' : 'Rejected'}
                                    color={isApproved ? T.green : T.red}
                                    icon={isApproved ? 'check' : 'close'}
                                />
                            )}
                            {!isHistory && item.isProcessed && (
                                <StatusTag
                                    solid
                                    // original stamp: accept → APPROVED, everything else → REJECTED;
                                    // a verify "pending" action (IsAuth 0) is now shown as PENDING.
                                    label={item.actionType === 'accept' ? 'APPROVED' : item.actionType === 'pending' ? 'PENDING' : 'REJECTED'}
                                    color={item.actionType === 'accept' ? T.green : item.actionType === 'pending' ? T.amber : T.red}
                                />
                            )}
                        </View>
                    </View>

                    {/* PARTY */}
                    <View style={styles.partyRow}>
                        <Icon name="storefront" size={15} color={T.copper} />
                        <Text style={styles.party} numberOfLines={2}>{item.ParName}</Text>
                    </View>

                    {/* DETAILS */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricRow}>
                            <Metric label="Broker" value={item.BAccName || '-'} />
                            <Metric label="Net Amount" value={item.NetAmt ? showMoney(item.NetAmt) : '-'} color={T.pd} align="right" />
                        </View>
                        <View style={styles.metricRow}>
                            {API === "https://apiy.tms-webapp.com" && (
                                <Metric label="Store" value={item.StoreName || '-'} />
                            )}
                            <Metric
                                label="Auth By"
                                value={item.AuthorisedBy || '-'}
                                align={API === "https://apiy.tms-webapp.com" ? 'right' : 'left'}
                            />
                        </View>
                    </View>

                    {!isHistory && (
                        <Field
                            label="Auth Remark"
                            placeholder="Add a remark…"
                            value={editableValuesYPO[item.UId]?.ARemark || ''}
                            onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                        />
                    )}

                    {/* ACTIONS */}
                    {type === 'request' && (
                        <View style={styles.actionRow}>
                            <Btn
                                label="Approve"
                                icon="check-circle"
                                compact
                                onPress={() => handleIconPress(item, 'accept')}
                                // disabled={!isConnected || item.IsAuth !== '0'}
                                disabled={disabledAction}
                                style={[styles.actionBtn, { backgroundColor: T.green }]}
                            />
                            <Btn
                                label="Reject"
                                icon="cancel"
                                kind="danger"
                                compact
                                onPress={() => handleIconPress(item, 'reject')}
                                // disabled={!isConnected || item.IsAuth !== '0'}
                                disabled={disabledAction}
                                style={styles.actionBtn}
                            />
                            <Btn
                                label="PDF"
                                icon="file-present"
                                kind="ghost"
                                compact
                                loading={getLocationLoading === item.UId}
                                onPress={() => {
                                    if (isConnected && item.IsAuth === '0') {
                                        handleCallURL(item);
                                    }
                                }}
                                disabled={!isConnected || item.IsAuth !== '0' || getLocationLoading === item.UId}
                                style={styles.pdfBtn}
                            />
                        </View>
                    )}

                    {type === 'verify' && (
                        <View style={styles.actionRow}>
                            <Btn
                                label="Verify"
                                icon="check-circle"
                                compact
                                onPress={() => handleIconPress(item, 'pending')}
                                disabled={disabledAction}
                                style={[styles.actionBtn, { backgroundColor: T.green }]}
                            />
                            <Btn
                                label="Reject"
                                icon="cancel"
                                kind="danger"
                                compact
                                onPress={() => handleIconPress(item, 'verifyreject')}
                                disabled={disabledAction}
                                style={styles.actionBtn}
                            />
                        </View>
                    )}

                    {isHistory && String(item.isauthedit) === '1' && (
                        <View style={styles.actionRow}>
                            <Btn
                                label="Mark Pending"
                                icon="check-circle"
                                kind="ghost"
                                compact
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
                                style={[styles.actionBtn, { borderColor: `${T.red}55` }]}
                            />
                        </View>
                    )}

                    {/* EXPAND ITEMS */}
                    <TouchableOpacity
                        style={styles.expandHeader}
                        onPress={() => toggleExpandHistory(item.UId)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                    >
                        <Icon name="inventory-2" size={15} color={T.nav} />
                        <Text style={styles.expandText}>
                            Items ({lineCount})
                        </Text>
                        <Icon
                            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={22}
                            color={T.nav}
                        />
                    </TouchableOpacity>

                    {expanded && renderItemLines(item)}
                </View>
            </View>
        );
    };

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => renderPOCard(item, 'history');

    const renderCommonCard = ({ item, type }: { item: any, type: 'history' | 'request' | 'verify' }) => renderPOCard(item, type);

    const TabBar = ({ activeTabYPO, setActiveTabYPO }) => (
        <Segment
            value={activeTabYPO}
            onChange={setActiveTabYPO}
            options={[
                { value: 'requests', label: 'Request', icon: 'pending-actions' },
                { value: 'history', label: 'History', icon: 'history' },
                { value: 'verify', label: 'Verify', icon: 'fact-check' },
            ]}
        />
    );


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

    // ----- NEW ERP UI: per-tab wiring (same state, same setters as before) -----
    const tabSearch =
        activeTab1YPO === 'requests' ? searchQueryYPO
            : activeTab1YPO === 'history' ? searchhistoryQueryYPO
                : searchverifyQueryYPO;
    const setTabSearch =
        activeTab1YPO === 'requests' ? setSearchQueryYPO
            : activeTab1YPO === 'history' ? setSearchhistoryQueryYPO
                : setSearchverifyQueryYPO;
    const tabPlaceholder =
        activeTab1YPO === 'requests' ? 'Search purchase order...'
            : activeTab1YPO === 'history' ? 'Search purchase history...'
                : 'Search purchase verify...';
    const tabRows: any[] =
        activeTab1YPO === 'requests' ? filteredDataSPO
            : activeTab1YPO === 'history' ? filteredhistoryDataSPO
                : filteredverifyDataSPO;
    const tabTitle =
        activeTab1YPO === 'requests' ? 'Pending requests'
            : activeTab1YPO === 'history' ? 'Authorisation history'
                : 'Awaiting verification';
    const tabEmpty =
        activeTab1YPO === 'requests' ? 'No request data found!'
            : activeTab1YPO === 'history' ? 'No history data found!'
                : 'No verify data found!';
    const emptyBlocked = activeTab1YPO === 'requests' ? isLoadingYPO : allhistoryLoadingYPO;

    const summary = useMemo(() => {
        let net = 0;
        let lines = 0;
        let approved = 0;
        let rejected = 0;
        (tabRows || []).forEach((r: any) => {
            net += num0(r?.NetAmt);
            lines += Array.isArray(r?.d1) ? r.d1.length : 0;
            const ok = r?.IsAuth === '1' || r?.actionType === 'accept';
            const no = r?.IsAuth === '2' || r?.actionType === 'reject' || r?.actionType === 'verifyreject';
            if (ok) approved += 1;
            else if (no) rejected += 1;
        });
        return { count: (tabRows || []).length, net, lines, approved, rejected };
    }, [tabRows]);

    const listHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi label="Orders" icon="receipt-long" accent={T.blue} value={String(summary.count)} sub={`${summary.lines} item line${summary.lines === 1 ? '' : 's'}`} />
                <Kpi label="Net Amount" icon="account-balance-wallet" accent={T.pd} valueColor={T.pd} value={`₹ ${fmtINR(summary.net)}`} sub="Total of listed POs" />
                <Kpi label="Approved" icon="check-circle" accent={T.green} valueColor={T.green} value={String(summary.approved)} sub="In this list" />
                <Kpi label="Rejected" icon="cancel" accent={T.red} valueColor={T.red} value={String(summary.rejected)} sub="In this list" />
            </KpiGrid>
            <SectionHead
                title={tabTitle}
                meta={`${summary.count} purchase order${summary.count === 1 ? '' : 's'}${tabSearch ? ` · matching “${tabSearch}”` : ''}`}
            />
        </View>
    );

    const listEmpty = !emptyBlocked ? (
        <View style={styles.emptyCard}>
            <EmptyState
                icon={tabSearch ? 'search-off' : 'inbox'}
                title={tabEmpty}
                text={tabSearch ? 'Try another PO no., party or broker name.' : 'Purchase orders will appear here when there is something to review.'}
                action={
                    noStoreSelected ? (
                        <View style={styles.noStore}>
                            <Icon name="store" size={14} color={T.red} />
                            <Text style={styles.noStoreText}>No store Selected</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    ) : null;

    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    const confirmTitle =
        selectedActionYPO === 'accept' ? 'Confirm Accept' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'reject' ? 'Confirm Reject' : selectedActionYPO === 'verifyreject' ? 'Confirm Reject' : '';
    const confirmIsReject = selectedActionYPO === 'reject' || selectedActionYPO === 'verifyreject';

    return (
        <View style={styles.root}>
            {/* ───────────── Toolbar: search + tabs ───────────── */}
            <View style={styles.toolbar}>
                <View style={[styles.toolbarInner, { paddingHorizontal: gutter }, !isDesktop && { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <SearchBox
                        value={tabSearch}
                        onChangeText={setTabSearch}
                        placeholder={tabPlaceholder}
                        style={isDesktop ? { flex: 1 } : null}
                    />
                    <View style={isDesktop ? { width: 420 } : null}>
                        <TabBar activeTabYPO={activeTab1YPO} setActiveTabYPO={setActiveTab1YPO} />
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
                        style={styles.container}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'request' })}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        keyboardShouldPersistTaps="handled"
                        extraData={[expandedHistoryCards, editableValuesYPO, getLocationLoading, cols]}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListHeaderComponent={listHeader}
                        ListEmptyComponent={listEmpty}
                    />
                ) : activeTab1YPO === 'history' ? (
                    <FlatList
                        key={`hist-${cols}`}
                        ref={flatHistoryListRefYPO}
                        data={filteredhistoryDataSPO}
                        numColumns={cols}
                        style={styles.container}
                        renderItem={({ item }) => (
                            <>
                                {renderAllCardHistory({ item })}
                            </>
                        )}
                        // renderItem={({ item }) => renderCommonCard({ item, type: 'history' })}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        keyboardShouldPersistTaps="handled"
                        extraData={[expandedHistoryCards, cols]}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListHeaderComponent={listHeader}
                        ListEmptyComponent={listEmpty}
                    />
                ) : activeTab1YPO === 'verify' ? (
                    <FlatList
                        key={`ver-${cols}`}
                        ref={flatVerifyListRefYPO}
                        data={filteredverifyDataSPO}
                        numColumns={cols}
                        style={styles.container}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'verify' })}
                        keyExtractor={(item) => item.UId}
                        contentContainerStyle={listContentStyle}
                        keyboardShouldPersistTaps="handled"
                        extraData={[expandedHistoryCards, editableValuesYPO, cols]}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListHeaderComponent={listHeader}
                        ListEmptyComponent={listEmpty}
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

                {/* ───────────── Confirm accept / reject / pending ───────────── */}
                <Sheet
                    open={showOverlayYPO}
                    onClose={() => setShowOverlayYPO(false)}
                    eyebrow="PURCHASE ORDER"
                    title={confirmTitle}
                    wideMax={440}
                    footer={
                        getSuccessYPO === true ? null : (
                            <>
                                <Btn label="Cancel" icon="close" kind="ghost" onPress={() => setShowOverlayYPO(false)} style={{ flex: 1 }} />
                                <Btn
                                    label={confirmIsReject ? 'Reject' : selectedActionYPO === 'pending' ? 'Confirm' : 'Approve'}
                                    icon="check"
                                    kind={confirmIsReject ? 'danger' : 'primary'}
                                    onPress={handleConfirmAction}
                                    style={[{ flex: 2 }, !confirmIsReject && { backgroundColor: T.green }]}
                                />
                            </>
                        )
                    }
                >
                    {getSuccessYPO === true ? (
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmLabel}>Vouchar No.</Text>
                            <Text style={styles.confirmValue}>{selectedItemYPO?.vouno || '-'}</Text>
                            {responsemessageYPO === 'Loading...' ? (
                                <View style={styles.responseRow}>
                                    <ActivityIndicator size="small" color={T.copper} />
                                    <Text style={styles.responseText}>{responsemessageYPO}</Text>
                                </View>
                            ) : (
                                <View style={styles.responseRow}>
                                    <Icon name="info-outline" size={18} color={T.nav} />
                                    <Text style={styles.responseText}>{responsemessageYPO}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmLabel}>Party Name</Text>
                            <Text style={styles.confirmValue}>{selectedItemYPO?.ParName}</Text>
                            {!!selectedItemYPO?.PONo && (
                                <Text style={styles.confirmMeta}>PO {selectedItemYPO?.PONo} · {selectedItemYPO?.PODate}</Text>
                            )}
                        </View>
                    )}
                </Sheet>

                {/* ───────────── Item details carousel ───────────── */}
                <Sheet
                    open={showCarouselModal}
                    onClose={() => {
                        setShowCarouselModal(false);
                        setSelectedD1Data([]); // Clear the data when closing
                    }}
                    eyebrow="ITEM DETAILS"
                    title={getD1Party || 'Items'}
                    wideMax={760}
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
                                <Text style={styles.eyebrow} numberOfLines={1}>{getD1Party}</Text>
                                <Text style={styles.itemTitle} numberOfLines={2}>{d1Item.ItmName}</Text>
                                <View style={styles.itemGrid}>
                                    <Metric label="Grade" value={showVal(d1Item.GrdName)} style={styles.itemBox} />
                                    <Metric label="Shade" value={showVal(d1Item.ShdName)} style={styles.itemBox} />
                                    <Metric label="Qty" value={showVal(d1Item.Qty)} style={styles.itemBox} />
                                    <Metric label="Rate" value={showVal(d1Item.UnitRate)} style={styles.itemBox} />
                                    <Metric label="Amount" value={showVal(d1Item.Amount)} color={T.pd} style={styles.itemBox} />
                                    <Metric label="Disc. %" value={showVal(d1Item.DisPer)} style={styles.itemBox} />

                                    {activeTab1YPO === 'requests' && (
                                        <>
                                            <Metric label="Current Stock" value={showVal(d1Item.CurrentStock)} style={styles.itemBox} />
                                            <Metric label="Last Party" value={showVal(d1Item.LastParty)} style={styles.itemBox} />
                                            <Metric label="Last Rate" value={showVal(d1Item.LastRate)} style={styles.itemBox} />
                                            <Metric label="Last Shade" value={showVal(d1Item.LastShade)} style={styles.itemBox} />
                                        </>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Sheet>
            </View>

            {/* <ChartScreen
                visible={chartVisible}
                data={chartData}
                loading={chartLoading}
                token={token}
                onClose={() => setChartVisible(false)}
            /> */}

            {/* ───────────── Chart modal ───────────── */}
            <Sheet
                open={chartVisible}
                onClose={() => setChartVisible(false)}
                eyebrow="RATE & QTY"
                title="Chart"
                wideMax={760}
            >
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
                                    <View key={index} style={styles.chartCol}>
                                        {/* RATE BAR */}
                                        <View style={[styles.chartBar, { height: rate / 2, backgroundColor: T.green, marginBottom: 4 }]} />
                                        {/* QTY BAR */}
                                        <View style={[styles.chartBar, { height: qty / 2, backgroundColor: T.blue }]} />
                                        {/* LABEL */}
                                        <Text style={styles.chartLabel}>{label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {!chartLoading && (!chartData || chartData.labels?.length === 0) && (
                    <EmptyState icon="bar-chart" title="No chart data available" />
                )}
            </Sheet>

            {/* ───────────── Mail sent log ───────────── */}
            <Sheet
                open={mailLogModal}
                onClose={() => setMailLogModal(false)}
                eyebrow="MAIL LOG"
                title={`${mailLogData.length} Sent Log(s) found`}
                wideMax={560}
                footer={<Btn label="Close" kind="ghost" onPress={() => setMailLogModal(false)} style={{ flex: 1 }} />}
            >
                {mailLogData.map((item: any, logIndex) => (
                    <View key={logIndex} style={styles.logCard}>
                        <View style={styles.logHeaderBox}>
                            <Icon name="mail-outline" size={15} color={T.copper} />
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
                            <View key={index} style={styles.rowBox}>
                                <Text style={styles.label}>{row.label}</Text>
                                <Text
                                    style={[
                                        styles.value,
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
                ))}
            </Sheet>

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

            <BusyOverlay visible={isLoadingYPO} text="Loading..." />
        </View>
    );
};

// ---------------------------------------------------------------------------
// NEW ERP UI: display helpers + styles (presentation only)
// ---------------------------------------------------------------------------
const num0 = (v: any) => {
    const x = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(x) ? x : 0;
};
const fmtINR = (v: any) => num0(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const showVal = (v: any) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v));
// const showMoney = (v: any) => {
//     if (v === undefined || v === null || String(v).trim() === '') return '-';
//     const x = parseFloat(String(v).replace(/,/g, ''));
//     return Number.isFinite(x) ? `₹ ${x.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : String(v);
// };

const showMoney = (v: any, isAmount = false) => {
    if (v === undefined || v === null || String(v).trim() === '') return '-';

    if (isAmount) {
        const x = parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(x)
            ? `₹ ${x.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`
            : String(v);
    }

    return `₹ ${v}`;
};

function StatusTag({ label, color, icon, solid }: { label: string; color: string; icon?: string; solid?: boolean }) {
    return (
        <View style={[styles.tag, solid ? { backgroundColor: color, borderColor: color } : { backgroundColor: `${color}14`, borderColor: `${color}40` }]}>
            {icon ? <Icon name={icon as any} size={12} color={solid ? '#fff' : color} /> : <View style={[styles.tagDot, { backgroundColor: solid ? '#fff' : color }]} />}
            <Text style={[styles.tagText, { color: solid ? '#fff' : color }]} numberOfLines={1}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    // ----- shell -----
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
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
    noStore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: `${T.red}40`,
        backgroundColor: `${T.red}10`,
    },
    noStoreText: { fontSize: 12, fontWeight: '800', color: T.red },

    // ----- toolbar -----
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 10,
        paddingBottom: 10,
    },
    toolbarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },

    // ----- PO card -----
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 12,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    disabledCard: { opacity: 0.6 },
    acceptedCard: { borderLeftWidth: 4, borderLeftColor: T.green },
    rejectedCard: { borderLeftWidth: 4, borderLeftColor: T.red },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2, textTransform: 'uppercase' },
    poNo: { fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    date: { fontSize: 11.5, fontWeight: '600', color: T.muted },
    tagCol: { alignItems: 'flex-end', gap: 5 },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    tagDot: { width: 6, height: 6, borderRadius: 3 },
    tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
    partyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    party: { flex: 1, fontSize: 14, fontWeight: '800', color: T.ink, lineHeight: 19 },
    metricBox: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    metricRow: { flexDirection: 'row', gap: 10 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    actionBtn: { flexGrow: 1, flexBasis: 96 },
    pdfBtn: { flexGrow: 0, minWidth: 84 },
    expandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: T.alt,
    },
    expandText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: T.nav, letterSpacing: 0.3 },

    // ----- item lines -----
    itemContainer: { gap: 8 },
    itemCard: {
        backgroundColor: T.sub,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 11,
        gap: 10,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    itemIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    itemTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.ink, lineHeight: 18 },
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
    itemBox: { flexGrow: 1, flexBasis: '28%', minWidth: 84 },

    // ----- scroll to top -----
    topButton: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.nav,
        ...S.card,
        elevation: 4,
    },

    // ----- confirm sheet -----
    confirmBox: {
        backgroundColor: T.sub,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 14,
        gap: 4,
    },
    confirmLabel: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
    confirmValue: { fontSize: 15, fontWeight: '800', color: T.ink },
    confirmMeta: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
    responseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    responseText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.nav },

    // ----- carousel -----
    carouselRow: { gap: 10, paddingVertical: 2 },
    carouselCard: {
        width: 280,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 10,
    },

    // ----- chart -----
    chartCol: { marginHorizontal: 8, alignItems: 'center' },
    chartBar: { width: 20, borderRadius: 4 },
    chartLabel: { fontSize: 10, fontWeight: '700', color: T.muted, marginTop: 6 },

    // ----- mail log -----
    logCard: {
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        padding: 12,
        gap: 6,
    },
    logHeaderBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 8,
        marginBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    logHeader: { flex: 1, fontSize: 14, fontWeight: '800', color: T.nav },
    rowBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    label: { width: 84, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase', paddingTop: 1 },
    value: { flex: 1, fontSize: 13, fontWeight: '600', color: T.ink },
});
export default YarnPurchaseOrder;
