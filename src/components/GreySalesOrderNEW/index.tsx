import { API } from '@/common/API/dynamicAPI';
import { fetchAllStoredata } from '@/common/API/Functions';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import {
    Avatar,
    Btn,
    BusyOverlay,
    cellWidth,
    CONTENT_MAX,
    EmptyState,
    Field,
    IconBtn,
    Kpi,
    KpiGrid,
    SearchBox,
    SectionHead,
    Segment,
    Sheet,
    useSotLayout,
} from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import { AuthPill, fmtNum, InfoCell } from './ui';


interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
    itemNameArray: string;
}

interface Props {
    token: string;
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
}

const GreySalesOrder: React.FC<Props> = ({ token, isConnected, username }) => {
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
    const [openAccordion, setOpenAccordion] = useState({})
    const [criteriaFormOpen, setCriteriaFormOpen] = useState(false)
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {
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


    const handleCriteriaFormOpen = () => setCriteriaFormOpen(true)
    const handleCriteriaFormClose = () => setCriteriaFormOpen(false)

    // const { width } = Dimensions.get('window');


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
            const allstoredata = await fetchAllStoredata(token, '', yno, 'sales_order')
            setAllStoreData(allstoredata)
        };
        loadProperty();
    }, [token]);

    let cancelToken: any;

    if (Platform.OS === "android") {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }

    const { isPhone, cols, gutter } = useSotLayout();

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-platform': 'mob'
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const fetchData = useCallback(async () => {
        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        // if (!FormState.values.StrCode) return;

        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel();
        }
        cancelTokenRef.current = axios.CancelToken.source();

        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();
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
            // const payload = { 
            //     txntype: 'sales_order', 
            //     referrer: 'dashboard', 
            //     prptype: 'S', 
            //     yearno: '26', 
            //     atype: 'B', 
            //     strtype: 'G' 
            // };

            const payload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                strcode: FormState.values.StrCode || '',
                atype: 'B',
                strtype: strtypeFromApi
            };
            console.log("payload", payload);
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/sosortbrowse`,
                `${API}/api/sosortbrowse`,
                getRequestConfig({ params: { ...payload } })
            );
            console.log("response", response);
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
                // AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);

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
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/crlimitreqbrowse`,
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
                // AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    }, [FormState.values.StrCode]);

    const fetchAllHistoryData = useCallback(async () => {

        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
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
            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                strcode: FormState.values.StrCode || '',
                atype: 'H',
                strtype: strtypeFromApi
            };
            const response = await axios.get(
                `${API}/api/sosortbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history payload', allhistoryPayload);
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
        } catch (error) {
            if (!axios.isCancel(error)) {
                // AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);

    const fetchAllVerifyData = useCallback(async () => {
        // if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') return;
        // setActiveTabYPO('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
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
            // const allhistoryPayload = {
            //     txntype: 'sales_order',
            //     referrer: 'dashboard',
            //     prptype: 'S',
            //     yearno: '26',
            //     atype: 'A',
            //     strtype: 'G'
            // };

            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: userPtype,
                yearno: yno,
                strcode: FormState.values.StrCode || '',
                atype: 'A',
                strtype: strtypeFromApi
            };
            console.log("fetchAllVerifyData AOI payload", allhistoryPayload)
            console.log("fetchAllVerifyData AOI URL", `${API}/api/sosortbrowse`)
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/sosortbrowse`,
                `${API}/api/sosortbrowse`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log("fetchAllVerifyData AOI response", response.data)

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
                // AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    }, [FormState.values.StrCode, token]);

    useEffect(() => {
        // if (!didInitialFetch.current) {
        //     didInitialFetch.current = true;
        //     return;
        // }

        if (!token) return;
        if (activeTab1YPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'verify') {
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

    // useEffect(() => {
    //     fetchData();
    //     return () => cancelToken?.cancel();
    // }, []);

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
                SODate: selectedItemYPO?.SODate,
                SONo: selectedItemYPO?.SONo,
                sodate_1: selectedItemYPO?.NSODate,
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
                sodate: selectedItem?.SODate || '',
                auth: authArray,
                txntype: 'sales_order_auth',
                mailtxntype: 'sales_order_detail'
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
        //   delete d1 key form selectedItemYPO and use selectedItemYPO 
        const removed1 = { ...selectedItemYPO }; // Create a copy of selectedItemYPO
        delete removed1['d1']; // Remove the 'd1' key from the copy 

        // const updatedItem = { ...selectedItemYPO };
        const updatedItemAccept = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 1,
            // prptype: 'S',
            referrer: 'dashboard',
            txntype: 'sales_order',
            action: 'edit'
        };
        const updatedItemVerifyPending = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 0,
            // prptype: 'S',
            referrer: 'dashboard',
            txntype: 'sales_order',
            action: 'edit'
        };
        const updatedItemReject = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 2,
            // prptype: 'S',
            referrer: 'dashboard',
            txntype: 'sales_order',
            action: 'edit'
        };
        const updatedItemVerifyReject = {
            ...removed1,
            ARemark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            aremark: editableValuesYPO[removed1.UId]?.ARemark || (removed1.ARemark || ''),
            IsAuth: 2,
            // prptype: 'S',
            referrer: 'dashboard',
            txntype: 'sales_order',
            action: 'edit'
        };
        const payload = selectedActionYPO === 'accept' ? updatedItemAccept : selectedActionYPO === 'pending' ? updatedItemVerifyPending : selectedActionYPO === 'reject' ? updatedItemReject : selectedActionYPO === 'verifyreject' ? updatedItemVerifyReject : 'null';
        const prptype = await AsyncStorage.getItem('user_prptype');

        console.log('✅ payload', payload);

        if (handleValidation(payload)) {
            setSuccessYPO(true);
            setresponsemessageYPO('Loading...');

            console.log(`${selectedActionYPO} confirmed for:`, payload);
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
                    return requestconfig;
                };
                const response = await axios.get(`${API}/api/authso`, getRequestConfig({ params: payload }));

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
                txntype: 'sales_order_auth',
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
            [key]: !(prev[key] ?? true)
        }))
    }

    // ---------------------------------------------------------------------
    // NEW ERP UI (presentation only — every handler below is the original
    // one, called with the original arguments).
    // ---------------------------------------------------------------------
    const actionLabel = (a: any) =>
        a === 'accept' ? 'APPROVED' : a === 'reject' ? 'REJECTED' : a === 'pending' ? 'PENDING' : a === 'verifyreject' ? 'REJECTED' : '';
    const isAuthLabel = (v: any) =>
        v === '1' ? 'AUTHORISED' : v === '2' || v === 2 ? 'REJECTED' : v === '0' || v === 0 ? 'PENDING' : '';

    const cardTone = (label: string) =>
        label === 'APPROVED' || label === 'AUTHORISED'
            ? styles.cardAccepted
            : label === 'REJECTED'
                ? styles.cardRejected
                : null;

    const renderCardShell = (
        item: any,
        opts: {
            date: string;
            stamp: string;
            tone: any;
            remarkEditable: boolean;
            showAuthBy: boolean;
            actions: React.ReactNode;
        },
    ) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <View style={[styles.card, !isConnected && styles.cardDisabled, opts.tone]}>
                <View style={styles.cardHead}>
                    <View style={styles.cardIcon}>
                        <Icon name="receipt-long" size={18} color={T.copper} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.eyebrowRow}>
                            {!!item.PrpCode && <Text style={styles.eyebrow} numberOfLines={1}>{item.PrpCode}</Text>}
                            {!!opts.date && (
                                <View style={styles.datePill}>
                                    <Icon name="event" size={11} color={T.muted} />
                                    <Text style={styles.datePillText}>{opts.date}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.PONo}</Text>
                        <Text style={styles.cardParty} numberOfLines={2}>{item.ParName}</Text>
                    </View>
                    {opts.stamp ? <AuthPill label={opts.stamp} /> : null}
                </View>

                <View style={styles.metricBox}>
                    <View style={styles.metricRow}>
                        <InfoCell label="Broker" value={item.BAccName || ''} />
                        <InfoCell label="Net Amt." value={item.NetAmt ? `₹ ${fmtNum(item.NetAmt)}` : ''} color={T.pd} />
                    </View>
                    {opts.showAuthBy && (
                        <View style={styles.metricRow}>
                            <InfoCell label="Authorised By" value={item.AuthorisedBy || ''} color={T.green} />
                            <InfoCell label="Authorised Date" value={item.AuthorisedDate || ''} />
                        </View>
                    )}
                    <View style={styles.metricRow}>
                        <InfoCell label="Status" value={item.AuthStatus || ''} />
                        <InfoCell label="Store Name" value={item.StoreName || 'N/A'} />
                    </View>
                </View>

                {opts.remarkEditable ? (
                    <Field
                        label="Auth Remark"
                        placeholder="Add authorisation remark…"
                        value={editableValuesYPO[item.UId]?.ARemark || ''}
                        onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                    />
                ) : (
                    <View style={styles.remarkRead}>
                        <Text style={styles.remarkLabel}>AUTH REMARK</Text>
                        <Text style={[styles.remarkText, !item.ARemark && { color: T.muted }]}>{item.ARemark || '—'}</Text>
                    </View>
                )}

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Icon name="person-outline" size={13} color={T.muted} />
                        <Text style={styles.metaLabel}>Entered by</Text>
                        <Text style={styles.metaValue} numberOfLines={1}>{item.username || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Icon name="local-shipping" size={13} color={T.muted} />
                        <Text style={styles.metaLabel}>Delivery</Text>
                        <Text style={styles.metaValue} numberOfLines={1}>{item.dduedate || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>{opts.actions}</View>
            </View>
        </View>
    );

    const itemsBtn = (item: any) => (
        <Btn
            label={isPhone ? 'Items' : 'View items'}
            icon="info-outline"
            kind="ghost"
            compact
            onPress={() => handleInfoPress(item.d1, item)}
            disabled={!isConnected}
            badge={item.d1 ? item.d1.length || undefined : undefined}
            style={styles.actionBtn}
        />
    );

    const mailBtn = (item: any) =>
        prptype === 'R' && item.mailsent === '1' ? (
            <IconBtn icon="email" label="Mail sent log" tone="soft" color={T.copper} onPress={() => handleInfoClick(item)} disabled={!isConnected} />
        ) : null;

    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {
        const stamp = item.isProcessed ? (item.actionType === 'accept' ? 'APPROVED' : 'REJECTED') : '';
        return renderCardShell(item, {
            date: item.SODate,
            stamp,
            tone: item.actionType === 'accept' ? styles.cardAccepted : item.actionType === 'reject' ? styles.cardRejected : null,
            remarkEditable: true,
            showAuthBy: false,
            actions: (
                <>
                    <Btn
                        label="Approve"
                        icon="check-circle"
                        compact
                        onPress={() => handleIconPress(item, 'accept')}
                        disabled={!isConnected || item.isProcessed}
                        style={[styles.actionBtn, styles.approveBtn]}
                    />
                    <Btn
                        label="Reject"
                        icon="cancel"
                        kind="danger"
                        compact
                        onPress={() => handleIconPress(item, 'reject')}
                        disabled={!isConnected || item.isProcessed}
                        style={styles.actionBtn}
                    />
                    {itemsBtn(item)}
                </>
            ),
        });
    };

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => {
        const stamp = item.IsAuth ? (item.IsAuth === '1' ? 'AUTHORISED' : item.IsAuth === '2' ? 'REJECTED' : 'PENDING') : '';
        return renderCardShell(item, {
            date: item.PODate,
            stamp,
            tone: item.IsAuth === '1' ? styles.cardAccepted : item.IsAuth === '2' ? styles.cardRejected : null,
            remarkEditable: false,
            showAuthBy: true,
            actions: (
                <>
                    {String(item.isauthedit) === '1' && (
                        <Btn
                            label="Pending"
                            icon="check-circle"
                            compact
                            onPress={() => handleIconPress(item, 'pending')}
                            disabled={!isConnected || item.isProcessed}
                            style={[styles.actionBtn, styles.approveBtn]}
                        />
                    )}
                    {itemsBtn(item)}
                    {mailBtn(item)}
                </>
            ),
        });
    };

    const renderAllCardVerify = ({ item }: { item: AllHistoryData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' | 'pending' } }) => {
        const stamp = item.isProcessed ? actionLabel(item.actionType) : isAuthLabel(item.IsAuth);
        return renderCardShell(item, {
            date: item.PODate,
            stamp,
            tone: item.IsAuth === '1' ? styles.cardAccepted : item.IsAuth === '2' ? styles.cardRejected : null,
            remarkEditable: true,
            showAuthBy: true,
            actions: (
                <>
                    <Btn
                        label="Pending"
                        icon="check-circle"
                        compact
                        onPress={() => handleIconPress(item, 'pending')}
                        disabled={!isConnected || item.isProcessed}
                        style={[styles.actionBtn, styles.approveBtn]}
                    />
                    <Btn
                        label="Reject"
                        icon="cancel"
                        kind="danger"
                        compact
                        onPress={() => handleIconPress(item, 'verifyreject')}
                        disabled={!isConnected || item.isProcessed}
                        style={styles.actionBtn}
                    />
                    {itemsBtn(item)}
                    {mailBtn(item)}
                </>
            ),
        });
    };

    const tabMeta = {
        requests: { title: 'Pending approval', search: searchQueryYPO, setSearch: setSearchQueryYPO, placeholder: 'Search sales order...', empty: 'No request data found!', data: filteredDataSPO as any[], loading: isLoadingYPO, ref: flatListRefYPO, toTop: scrollToTop, render: renderCard, key: 'req' },
        history: { title: 'Authorisation history', search: searchhistoryQueryYPO, setSearch: setSearchhistoryQueryYPO, placeholder: 'Search grey sales history...', empty: 'No history data found!', data: filteredhistoryDataSPO as any[], loading: allhistoryLoadingYPO, ref: flatHistoryListRefYPO, toTop: scrollHistoryToTop, render: renderAllCardHistory, key: 'hist' },
        verify: { title: 'Verify orders', search: searchverifyQueryYPO, setSearch: setSearchverifyQueryYPO, placeholder: 'Search grey sales verify...', empty: 'No verify data found!', data: filteredverifyDataSPO as any[], loading: allhistoryLoadingYPO, ref: flatVerifyListRefYPO, toTop: scrollVerifyToTop, render: renderAllCardVerify, key: 'ver' },
    }[activeTab1YPO];

    const listRows = tabMeta.data || [];
    const totalNet = listRows.reduce((a, r) => a + (parseFloat(String(r?.NetAmt ?? '').replace(/,/g, '')) || 0), 0);
    const totalLines = listRows.reduce((a, r) => a + (Array.isArray(r?.d1) ? r.d1.length : 0), 0);
    const countAuth = (v: string) => listRows.filter((r) => String(r?.IsAuth) === v).length;
    const processedCount = listRows.filter((r) => r?.isProcessed).length;

    const listHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi label="Orders" value={String(listRows.length)} icon="receipt-long" accent={T.nav} />
                <Kpi label="Net Value" value={`₹ ${fmtNum(totalNet) || '0'}`} icon="currency-rupee" accent={T.pd} valueColor={T.pd} />
                <Kpi label="Line Items" value={String(totalLines)} icon="layers" accent={T.blue} />
                {activeTab1YPO === 'requests' ? (
                    <Kpi label="Processed" value={String(processedCount)} icon="task-alt" accent={T.green} />
                ) : (
                    <Kpi
                        label={activeTab1YPO === 'history' ? 'Authorised' : 'Pending'}
                        value={String(activeTab1YPO === 'history' ? countAuth('1') : countAuth('0'))}
                        icon={activeTab1YPO === 'history' ? 'verified' : 'hourglass-empty'}
                        accent={activeTab1YPO === 'history' ? T.green : T.copper}
                        valueColor={activeTab1YPO === 'history' ? T.green : T.copper}
                    />
                )}
            </KpiGrid>
            <SectionHead
                title={tabMeta.title}
                meta={`${listRows.length} order${listRows.length === 1 ? '' : 's'}${tabMeta.search ? ` matching “${tabMeta.search}”` : ''}`}
            />
        </View>
    );

    const confirmTitle =
        selectedActionYPO === 'accept' ? 'Confirm Accept' : selectedActionYPO === 'pending' ? 'Confirm Pending' : selectedActionYPO === 'reject' ? 'Confirm Reject' : selectedActionYPO === 'verifyreject' ? 'Confirm Reject' : '';
    const isRejectAction = selectedActionYPO === 'reject' || selectedActionYPO === 'verifyreject';

    return (
        <View style={styles.root}>
            {/* ───────────── Toolbar: tabs + search ───────────── */}
            <View style={styles.toolbar}>
                <View style={[styles.toolbarInner, { paddingHorizontal: gutter }, !isPhone && styles.toolbarWide]}>
                    <View style={!isPhone ? styles.segWide : null}>
                        <Segment
                            value={activeTab1YPO}
                            onChange={(v) => setActiveTab1YPO(v)}
                            options={[
                                { value: 'requests', label: 'Request', icon: 'pending-actions' },
                                { value: 'history', label: 'History', icon: 'history' },
                                { value: 'verify', label: 'Verify', icon: 'fact-check' },
                            ]}
                        />
                    </View>
                    <SearchBox
                        value={tabMeta.search}
                        onChangeText={tabMeta.setSearch}
                        placeholder={tabMeta.placeholder}
                        style={!isPhone ? { flex: 1 } : null}
                    />
                </View>
            </View>

            <View style={styles.body}>
                <FlatList
                    key={`${tabMeta.key}-${cols}`}
                    ref={tabMeta.ref}
                    data={tabMeta.data}
                    numColumns={cols}
                    style={styles.list}
                    renderItem={({ item }) => tabMeta.render({ item })}
                    keyExtractor={(item) => item.UId}
                    contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
                    ListHeaderComponent={listHeader}
                    scrollEventThrottle={16}
                    onScroll={({ nativeEvent }) => {
                        setShowTopButtonYPO(nativeEvent.contentOffset.y > 100);
                    }}
                    ListEmptyComponent={
                        !tabMeta.loading ? (
                            <View style={styles.emptyCard}>
                                <EmptyState
                                    icon="inbox"
                                    title={tabMeta.empty}
                                    text={!FormState.values.StrCode ? 'No store Selected' : undefined}
                                />
                            </View>
                        ) : null
                    }
                />

                {showTopButtonYPO && (
                    <TouchableOpacity style={styles.topButton} onPress={tabMeta.toTop} accessibilityLabel="Scroll to top">
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
            </View>

            {/* ───────────── Confirm / result dialog ───────────── */}
            <Modal
                visible={showOverlayYPO}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowOverlayYPO(false)}
            >
                <View style={styles.dialogWrap}>
                    <View style={styles.dialog}>
                        <View style={[styles.dialogIcon, { backgroundColor: isRejectAction ? `${T.red}14` : `${T.green}14` }]}>
                            <Icon name={isRejectAction ? 'cancel' : 'check-circle'} size={26} color={isRejectAction ? T.red : T.green} />
                        </View>
                        <Text style={styles.dialogEyebrow}>SALES ORDER</Text>
                        <Text style={styles.dialogTitle}>{confirmTitle}</Text>
                        {getSuccessYPO === true ? (
                            <>
                                <Text style={styles.dialogParty}>Vouchar No.: {selectedItemYPO?.vouno}</Text>
                                {responsemessageYPO === 'Loading...' ? (
                                    <View style={styles.dialogStatus}>
                                        <ActivityIndicator size="small" color={T.copper} />
                                        <Text style={styles.dialogStatusText}>{responsemessageYPO}</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.dialogStatus, { backgroundColor: `${T.green}10`, borderColor: `${T.green}30` }]}>
                                        <Text style={[styles.dialogStatusText, { color: T.ink }]}>{responsemessageYPO}</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={styles.dialogParty}>Party Name: {selectedItemYPO?.ParName}</Text>
                                <View style={styles.dialogBtns}>
                                    <Btn
                                        label="Cancel"
                                        icon="close"
                                        kind="ghost"
                                        onPress={() => setShowOverlayYPO(false)}
                                        style={{ flex: 1 }}
                                    />
                                    <Btn
                                        label="Confirm"
                                        icon="check"
                                        kind={isRejectAction ? 'danger' : 'primary'}
                                        onPress={handleConfirmAction}
                                        style={[{ flex: 1 }, !isRejectAction && { backgroundColor: T.green }]}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ───────────── Order items (d1) ───────────── */}
            <Sheet
                open={showCarouselModal}
                onClose={() => {
                    setShowCarouselModal(false)
                    setSelectedD1Data([])
                }}
                eyebrow="ORDER ITEMS"
                title={getD1Party || 'Sales order items'}
                side
                wideMax={760}
            >
                {groupedData.length === 0 ? (
                    <EmptyState icon="layers" title="No items" text="This sales order has no item lines." />
                ) : null}
                {groupedData.map((item) => {
                    const isOpen = openAccordion[item.key] ?? true
                    const qtySum = item.items.reduce((a, r) => a + (parseFloat(String(r.Qty ?? '').replace(/,/g, '')) || 0), 0);
                    const amtSum = item.items.reduce((a, r) => a + (parseFloat(String(r.Amount ?? '').replace(/,/g, '')) || 0), 0);
                    return (
                        <View key={item.key} style={styles.accCard}>
                            <TouchableOpacity
                                style={styles.accHead}
                                onPress={() => toggleAccordion(item.key)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardIcon}>
                                    <Icon name="texture" size={18} color={T.copper} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.accTitle} numberOfLines={2}>{item.designName}</Text>
                                    <Text style={styles.accSub} numberOfLines={1}>{item.itemName}</Text>
                                </View>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{item.items.length}</Text>
                                </View>
                                <Icon name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={T.muted} />
                            </TouchableOpacity>

                            {isOpen && (
                                <View style={styles.table}>
                                    <View style={[styles.tr, styles.thead]}>
                                        <Text style={[styles.th, styles.cShade]}>Shade</Text>
                                        <Text style={[styles.th, styles.cNum]}>Qty</Text>
                                        <Text style={[styles.th, styles.cNum]}>Rate</Text>
                                        <Text style={[styles.th, styles.cAmt]}>Amount</Text>
                                        <Text style={[styles.th, styles.cDisc]}>Disc %</Text>
                                    </View>
                                    {item.items.map((row, index) => (
                                        <View key={index.toString()} style={[styles.tr, index % 2 === 1 && { backgroundColor: T.sub }]}>
                                            <Text style={[styles.td, styles.cShade]} numberOfLines={2}>{row.ShdName}</Text>
                                            <Text style={[styles.td, styles.cNum]} numberOfLines={1}>{row.Qty}</Text>
                                            <Text style={[styles.td, styles.cNum]} numberOfLines={1}>{row.UnitRate}</Text>
                                            <Text style={[styles.td, styles.cAmt]} numberOfLines={1}>{row.Amount}</Text>
                                            <Text style={[styles.td, styles.cDisc]} numberOfLines={1}>{row.DisPer}</Text>
                                        </View>
                                    ))}
                                    <View style={[styles.tr, styles.tfoot]}>
                                        <Text style={[styles.tdTot, styles.cShade]}>Total</Text>
                                        <Text style={[styles.tdTot, styles.cNum]} numberOfLines={1}>{fmtNum(qtySum)}</Text>
                                        <Text style={[styles.tdTot, styles.cNum]} />
                                        <Text style={[styles.tdTot, styles.cAmt, { color: T.pd }]} numberOfLines={1}>{fmtNum(amtSum)}</Text>
                                        <Text style={[styles.tdTot, styles.cDisc]} />
                                    </View>
                                </View>
                            )}
                        </View>
                    )
                })}
            </Sheet>

            {/* <CriteriaForm
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
            /> */}

            {/* ───────────── Mail sent log ───────────── */}
            <Sheet
                open={mailLogModal}
                onClose={() => setMailLogModal(false)}
                eyebrow="MAIL LOG"
                title={`${mailLogData.length} Sent Log(s) found`}
                footer={<Btn label="Close" kind="ghost" onPress={() => setMailLogModal(false)} style={{ flex: 1 }} />}
            >
                {mailLogData.map((item, index) => (
                    <View key={index.toString()} style={styles.logCard}>
                        <View style={styles.logHead}>
                            <Avatar name={item.usrname} size={34} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.logUser} numberOfLines={1}>{item.usrname}</Text>
                                <Text style={styles.logDate} numberOfLines={1}>{item.sentdt}</Text>
                            </View>
                            <AuthPill label={item.mailsent === 'Yes' ? 'YES' : 'NO'} icon={item.mailsent === 'Yes' ? 'mark-email-read' : 'error-outline'} />
                        </View>
                        {[
                            { label: 'Sent Date', value: item.sentdt },
                            { label: 'From', value: item.from },
                            { label: 'To', value: item.to },
                            { label: 'Subject', value: item.subject },
                            { label: 'Remarks', value: item.remarks },
                            { label: 'Sent', value: item.mailsent }
                        ].map((row, i) => (
                            <View key={i} style={styles.logRow}>
                                <Text style={styles.logLabel}>{row.label}</Text>
                                <Text
                                    style={[
                                        styles.logValue,
                                        row.label === 'Sent' && {
                                            color: row.value === 'Yes' ? T.green : T.red,
                                            fontWeight: '800',
                                        }
                                    ]}
                                    numberOfLines={2}
                                >
                                    {row.value}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </Sheet>

            <BusyOverlay visible={isLoadingYPO} text="Loading..." />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    body: { flex: 1 },

    // toolbar
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 10,
        paddingBottom: 10,
    },
    toolbarInner: { gap: 8, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    toolbarWide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    segWide: { width: 380 },

    // list
    list: { flex: 1, backgroundColor: T.bg },
    listContent: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 4 },
    gridCell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // card
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardDisabled: { opacity: 0.6 },
    cardAccepted: { borderColor: `${T.green}66`, backgroundColor: `${T.green}06` },
    cardRejected: { borderColor: `${T.red}55`, backgroundColor: `${T.red}05` },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.hair,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    datePillText: { fontSize: 10.5, fontWeight: '700', color: T.muted },
    cardTitle: { fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 3 },
    cardParty: { fontSize: 12.5, fontWeight: '700', color: T.nav, marginTop: 2, lineHeight: 17 },
    metricBox: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    metricRow: { flexDirection: 'row', gap: 10 },
    remarkRead: {
        borderLeftWidth: 3,
        borderLeftColor: `${T.copper}66`,
        paddingLeft: 9,
        paddingVertical: 2,
    },
    remarkLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
    remarkText: { fontSize: 12.5, fontWeight: '600', color: T.ink, marginTop: 2 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
    metaLabel: { fontSize: 11, fontWeight: '600', color: T.muted },
    metaValue: { fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 10,
    },
    actionBtn: { flexGrow: 1, flexBasis: 0, minWidth: 92 },
    approveBtn: { backgroundColor: T.green },

    topButton: {
        position: 'absolute',
        right: 18,
        bottom: 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.nav,
        alignItems: 'center',
        justifyContent: 'center',
        ...S.card,
    },

    // confirm dialog
    dialogWrap: {
        flex: 1,
        backgroundColor: 'rgba(13,27,42,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialog: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: T.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        gap: 6,
        ...S.card,
    },
    dialogIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    dialogEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    dialogTitle: { fontSize: 18, fontWeight: '900', color: T.ink, textAlign: 'center' },
    dialogParty: { fontSize: 13, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 2 },
    dialogStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        alignSelf: 'stretch',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.hair,
    },
    dialogStatusText: { fontSize: 13.5, fontWeight: '700', color: T.muted, textAlign: 'center', flexShrink: 1 },
    dialogBtns: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 16 },

    // items sheet
    accCard: {
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
    },
    accHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    accTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
    accSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
    countBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 7,
        backgroundColor: `${T.copper}16`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: { fontSize: 11.5, fontWeight: '900', color: T.copper },
    table: { borderTopWidth: 1, borderTopColor: T.hair },
    tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
    thead: { backgroundColor: T.nav, paddingVertical: 7 },
    th: { fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
    td: { fontSize: 12, fontWeight: '600', color: T.ink },
    tfoot: { backgroundColor: `${T.copper}12` },
    tdTot: { fontSize: 12, fontWeight: '900', color: T.nav },
    cShade: { flex: 1.5, minWidth: 0 },
    cNum: { flex: 1, textAlign: 'right' },
    cAmt: { flex: 1.3, textAlign: 'right' },
    cDisc: { flex: 0.8, textAlign: 'right' },

    // mail log sheet
    logCard: {
        backgroundColor: T.sub,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 12,
        gap: 6,
    },
    logHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    logUser: { fontSize: 14, fontWeight: '800', color: T.ink },
    logDate: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
    logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    logLabel: { width: 78, fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3, paddingTop: 1 },
    logValue: { flex: 1, fontSize: 12.5, fontWeight: '600', color: T.ink },
});

export default GreySalesOrder;
