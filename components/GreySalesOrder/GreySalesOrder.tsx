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
    Linking,
    LayoutAnimation,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import HeaderBar from '../HeaderBar/HeaderBar';
import { encode as btoa } from 'base-64';
import { urlSafeEncode } from './urlSafeEncode';
import { encodeData } from './encodingUtils';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';
import { API } from '../../common/API/dynamicAPI';

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
    // UId: string;
    // prptype: string;
    // prptypename: string;
    // // prpcode: string;
    // date: string;
    // parcode: string;
    // parname: string;
    // limit1: string;
    // limit2: string;
    // limit3: string;
    // crday1: string;
    // crday2: string;
    // crday3: string;
    // // IsAuth: string;
    // status: string;
    // ausrname: string;
    // adate: string;
    // // remark: string;
    // // yearno: string;
    // revertdate: string;
    // // sexename: string;
    // BrkAccName: string;
    // crdays: string;
    // // 
    // ARemark: string;
    // authorisedby: string;
    // authoriseddate: string;
    // AuthStatus: string;
    // costdate: string;
    // costdsncode: string;
    // costdsnname: string;
    // costuid: string;
    // deliverydate: string;
    // dsncode: string;
    // dsnname: string;
    // grdcode: string;
    // grdname: string;
    // // greystrcode: string;
    // // IsAuth: string | number;
    // itmcode: string;
    // itmname: string;
    // nvoudate: string;
    // orderdesign: string;
    // orderqty: string;
    // partyname: string;
    // pickrate: string;
    // picks: string;
    // prpcode: string;
    // qty: string;
    // rate: string;
    // ratetype: string;
    // remark: string;
    // sampleno: string;
    // sellingrate: string;
    // sexename: string;
    // shdcode: string;
    // shdname: string;
    // shkperc: string;
    // strcode: string;
    // // UId: string;
    // voudate: string;
    // vouno: string;
    // yearno: string;
    // 
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

const GreySalesOrder: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
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
    // const [historyDataYPO, setHistoryDataYPO] = useState<AllHistoryData[]>([]);
    // const [isHistoryLoading, setIsHistoryLoadingYPO] = useState(false);

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
        setIsLoadingYPO(true);
        try {
            const payload = { txntype: 'sales_order', referrer: 'dashboard', prptype: 'S', yearno: '26', atype: 'B', strtype: 'G' };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/sosortbrowse`,
                `${API}/api/sosortbrowse`,
                getRequestConfig({ params: { ...payload } })
            );
            console.log('🔵 payload & response', payload, response);
            // if (response.data.success && response.data.response.data.length > 0) {
            //     console.log('✅ Data:', response.data.response.data);
            //     setData(response.data.response.data);
            //     setAllHistoryDataYPO([])
            //     setAllVerifyDataYPO([])
            // } else {
            //     setData([]);
            // }
            if (response.data.success && response.data.response.data.length > 0) {
                // Update each item to add itemNameArray
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
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    };

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
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingYPO(false);
        }
    };

    const fetchAllHistoryData = async () => {
        // setActiveTabYPO('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: 'S',
                yearno: '26',
                atype: 'H',
                strtype: 'G'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/sosortbrowse`,
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
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingYPO(false);
        }
    };

    const fetchAllVerifyData = async () => {
        // setActiveTabYPO('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingYPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'sales_order',
                referrer: 'dashboard',
                prptype: 'S',
                yearno: '26',
                atype: 'A',
                strtype: 'G'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/sosortbrowse`,
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
    };

    useEffect(() => {
        if (activeTab1YPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'verify') {
            fetchAllVerifyData();
        }
    }, [activeTab1YPO]);

    // const callhisttoryfunction = () => {
    //     setShowPartyHistoryModalYPO(true);
    //     setActiveTabYPO('allhistory');
    //     fetchAllHistoryData();
    // };

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
                Alert.alert('Error', 'Server error');
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
        if (selectedActionYPO === 'accept') {

            // const numericNewLimit2: any = parseFloat(updatedItem.limit2.replace(/,/g, ''));
            // const numericLimit1: any = parseFloat(updatedItem.limit1.replace(/,/g, ''));

            // if (
            //     parseFloat(numericNewLimit2).toFixed(2) ===
            //     parseFloat(numericLimit1).toFixed(2)
            // ) {
            //     Alert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be equal to Old Limit for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (updatedItem.limit2 === '0' || parseFloat(updatedItem.limit2) === 0) {
            //     Alert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (parseFloat(updatedItem.limit2) < 0) {
            //     Alert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // } else if (!updatedItem.limit2 || updatedItem.limit2.trim() === '') {
            //     Alert.alert(
            //         'Validation Error',
            //         'Requested Limit cannot be empty or invalid for Party Name: ' + updatedItem.parname
            //     )
            //     return false;
            // }
        }
        if (selectedActionYPO === 'pending' || selectedActionYPO === 'verifyreject') {

            if (
                updatedItem.ARemark === '' || updatedItem.ARemark === null || updatedItem.ARemark === undefined || !updatedItem.ARemark
            ) {
                Alert.alert(
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
                // const response = await axios.get(
                //     `${GetApiLink()}/api/prodorderauthsudo`,
                //     getRequestConfig({ params: payload })
                //   );
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
                // const response = await axios.get(`https://apig.tms-webapp.com/api/authpo`, getRequestConfig({ params: payload }));
                const response = await axios.get(`${API}/api/authso`, getRequestConfig({ params: payload }));
                if (response.data.success) {
                    setresponsemessageYPO(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccessYPO(false);
                        setShowOverlayYPO(false);
                    }, 2000);
                    // setProcessedCards(prev => new Set(prev).add(selectedItemYPO.UId));
                    setData(prevData => {
                        const newData = prevData.filter(item => item.UId !== selectedItemYPO.UId);
                        newData.push({ ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO });
                        return newData;
                    });
                    // if (selectedActionYPO === 'pending' || selectedActionYPO === 'verifyreject') {
                    setAllVerifyDataYPO(prevData => {
                        const newData = prevData.filter(item => item.UId !== selectedItemYPO.UId);
                        newData.push({ ...selectedItemYPO, isProcessed: true, actionType: selectedActionYPO });
                        return newData;
                    });
                    // }
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



    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => (
        <View style={[
            crlimtreq_styles.card, !isConnected && crlimtreq_styles.disabledCard,
            item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.isProcessed && (
                <View style={[
                    crlimtreq_styles.stampContainerYOS,
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
                <Text style={crlimtreq_styles.dateText}>{item.PODate}</Text>
            </View>
            <View style={crlimtreq_styles.cardHeaderContainer}>
                <View style={crlimtreq_styles.cardHeader}>
                    <Text style={crlimtreq_styles.cardHeaderText}>{item.PONo}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.ParName}</Text>
            </View>
            <View style={crlimtreq_styles.cardContent}>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Broker:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.BAccName || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Net Amt.:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.NetAmt || ''}:
                        </Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                        <RNTextInput
                            style={crlimtreq_styles.editableValueBlack}
                            value={editableValuesYPO[item.UId]?.ARemark || ''}
                            onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                        // keyboardType="numeric"
                        />
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Status:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.AuthStatus || ''}
                        </Text>
                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity onPress={() => handleIconPress(item, 'accept')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'reject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleInfoPress(item.d1, item)} disabled={!isConnected}>
                    <View style={crlimtreq_styles.infoIconContainer}>
                        <Icon name="info" size={40} color={!isConnected ? "#ccc" : "#2196F3"} />
                        {item.d1 && <Text style={crlimtreq_styles.infoCount}>{item.d1.length}</Text>}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
        <View style={[
            crlimtreq_styles.card,
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
            <View style={crlimtreq_styles.dateContainer}>
                <Text style={crlimtreq_styles.dateText}>{item.PODate}</Text>
            </View>
            <View style={crlimtreq_styles.cardHeaderContainer}>
                <View style={crlimtreq_styles.cardHeader}>
                    <Text style={crlimtreq_styles.cardHeaderText}>{item.PONo}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.ParName}</Text>
            </View>
            <View style={crlimtreq_styles.cardContent}>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Broker:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.BAccName || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Net Amt.:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.NetAmt || ''}:
                        </Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Authorised By:</Text>
                        <Text style={crlimtreq_styles.Authvalue}>
                            {item.AuthorisedBy || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Authorised Date:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.AuthorisedDate || ''}
                        </Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                        <Text style={crlimtreq_styles.Authvalue}>
                            {item.ARemark || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Status:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.AuthStatus || ''}
                        </Text>
                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardActions}>
                {/* <TouchableOpacity onPress={() => handleIconPress(item, 'accept')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'reject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity> */}
                <TouchableOpacity onPress={() => handleInfoPress(item.d1, item)} disabled={!isConnected}>
                    <View style={crlimtreq_styles.infoIconContainer}>
                        <Icon name="info" size={40} color={!isConnected ? "#ccc" : "#2196F3"} />
                        {item.d1 && <Text style={crlimtreq_styles.infoCount}>{item.d1.length}</Text>}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAllCardVerify = ({ item }: { item: AllHistoryData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' | 'pending' } }) => (
        <View style={[
            crlimtreq_styles.card,
            item.IsAuth === '1' ? crlimtreq_styles.acceptedCard : item.IsAuth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card,
            // item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.isProcessed ? (
                <>
                    <View style={crlimtreq_styles.stampContainerYOS}>
                        <View style={[
                            crlimtreq_styles.stamp,
                            item.actionType === 'accept' ? crlimtreq_styles.stampAccepted : item.actionType === 'pending' ? crlimtreq_styles.stampPendingall : item.actionType === 'reject' ? crlimtreq_styles.stampRejected : item.actionType === 'verifyreject' ? crlimtreq_styles.stampRejected : '',
                        ]}>
                            <Text style={crlimtreq_styles.stampText}>
                                {item.actionType === 'accept' ? 'APPROVED' : item.actionType === 'reject' ? 'REJECTED' : item.actionType === 'pending' ? 'PENDING' : item.actionType === 'verifyreject' ? 'REJECTED' : ''}
                            </Text>
                        </View>
                    </View>
                </>

            ) : (
                <>
                    <View style={crlimtreq_styles.stampContainerYOS}>
                        <View style={[
                            crlimtreq_styles.stamp,
                            item.IsAuth === '1' ? crlimtreq_styles.stampAccepted : item.IsAuth === '2' ? crlimtreq_styles.stampRejected : item.IsAuth === '0' || item.IsAuth === 0 ? crlimtreq_styles.stampPendingall : '',
                        ]}>
                            <Text style={crlimtreq_styles.stampText}>
                                {item.IsAuth === '1' ? 'AUTHORISED' : item.IsAuth === '2' || item.IsAuth === 2 ? 'REJECTED' : item.IsAuth === '0' || item.IsAuth === 0 ? 'PENDING' : ''}
                            </Text>
                        </View>
                    </View>
                </>
            )}
            <View style={crlimtreq_styles.dateContainer}>
                <Text style={crlimtreq_styles.dateText}>{item.PODate}</Text>
            </View>
            <View style={crlimtreq_styles.cardHeaderContainer}>
                <View style={crlimtreq_styles.cardHeader}>
                    <Text style={crlimtreq_styles.cardHeaderText}>{item.PONo}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.ParName}</Text>
            </View>
            <View style={crlimtreq_styles.cardContent}>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Broker:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.BAccName || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Net Amt.:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.NetAmt || ''}:
                        </Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Authorised By:</Text>
                        <Text style={crlimtreq_styles.Authvalue}>
                            {item.AuthorisedBy || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Authorised Date:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.AuthorisedDate || ''}
                        </Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                        <RNTextInput
                            style={crlimtreq_styles.editableValueBlack}
                            value={editableValuesYPO[item.UId]?.ARemark || ''}
                            onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                        // keyboardType="numeric"
                        />
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Status:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.AuthStatus || ''}
                        </Text>
                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity onPress={() => handleIconPress(item, 'pending')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'verifyreject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleInfoPress(item.d1, item)} disabled={!isConnected}>
                    <View style={crlimtreq_styles.infoIconContainer}>
                        <Icon name="info" size={40} color={!isConnected ? "#ccc" : "#2196F3"} />
                        {item.d1 && <Text style={crlimtreq_styles.infoCount}>{item.d1.length}</Text>}
                    </View>
                </TouchableOpacity>
            </View>
            {/* <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity onPress={() => handleIconPress(item, 'pending')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'verifyreject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
            </View> */}
        </View>
    );


    // eslint-disable-next-line react/no-unstable-nested-components
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
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQueryYPO}
                    placeholder="Search grey sales order..."
                />
            ) : activeTab1YPO === 'history' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQueryYPO}
                    placeholder="Search grey sales history..."
                />
            ) : activeTab1YPO === 'verify' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchverifyQueryYPO}
                    placeholder="Search grey sales verify..."
                />
            ) : null}
            <View style={crlimtreq_styles.container}>
                {isLoadingYPO && <FullScreenLoader message={activeTab1YPO === 'history' ? "Loading History..." : activeTab1YPO === 'verify' ? "Loading Verify..." : "Loading Request..."} />}
                <TabBar activeTabYPO={activeTab1YPO} setActiveTabYPO={setActiveTab1YPO} />
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
                                    Vouchar No.: {selectedItemYPO?.vouno}
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
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowCarouselModal(false);
                    }}
                >
                    <View style={crlimtreq_styles.carouselModalOverlay}>
                        <View style={crlimtreq_styles.carouselModalContainer}>
                            {/* Close Button */}
                            <TouchableOpacity
                                style={crlimtreq_styles.modalCloseButton}
                                onPress={() => {
                                    setShowCarouselModal(false);
                                    setSelectedD1Data([]); // Clear the data when closing
                                }}
                            >
                                <Icon name="close" size={24} color={theme.BRAND_GRADIENT_END} />
                            </TouchableOpacity>

                            {/* Carousel Cards */}

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
                                            { marginHorizontal: 10 } // Add spacing between cards
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                                            style={crlimtreq_styles.headerContainer}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}>

                                            <View style={crlimtreq_styles.carouselCardContent}>
                                                <Text style={crlimtreq_styles.carouselCardTitle}>
                                                    {/* {d1Item.ItmName} */}
                                                    {getD1Party}
                                                </Text>
                                                <View style={{ marginVertical: 10 }}>
                                                    <Text style={crlimtreq_styles.carouselCardKey}>
                                                        Design Name: <Text style={crlimtreq_styles.carouselCardText}>{d1Item.DsnName}</Text>
                                                    </Text>
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
                                                    {/* <Text style={crlimtreq_styles.carouselCardKey}>
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
                                                    </Text> */}
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
        </>
    );
};
export default GreySalesOrder;
