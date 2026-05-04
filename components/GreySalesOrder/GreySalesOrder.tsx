import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    ScrollView,
    UIManager, Platform,
    useWindowDimensions,
    StyleSheet,
    Dimensions
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

    const styles = StyleSheet.create({
        modalContainer: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center'
        },

        modalContent: {
            width: '100%', // ✅ simple responsive
            maxHeight: '90%',
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16
        },

        modalTitle: {
            fontSize: 18, // ✅ fixed
            fontWeight: '700',
            marginBottom: 14,
            color: '#1e88e5',
            textAlign: 'center'
        },

        logCard: {
            backgroundColor: '#f4f8f4',
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
        },

        logHeaderBox: {
            backgroundColor: '#6d756d',
            paddingVertical: 6,
            borderRadius: 6,
            marginBottom: 10
        },

        logHeader: {
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 15,
            color: '#fff'
        },

        rowBox: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6
        },

        label: {
            fontSize: 12,
            color: '#555',
            fontWeight: '600',
            flex: 1
        },

        value: {
            fontSize: 12,
            color: '#0a0a0a',
            flex: 1.2,
            textAlign: 'left'
        },

        closeBtn: {
            backgroundColor: '#1e88e5',
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 10
        },

        closeText: {
            color: '#fff',
            fontSize: 15,
            fontWeight: '600'
        }
    });

    useEffect(() => {
        const getType = async () => {
            const type = await AsyncStorage.getItem('user_prptype');
            setPrptype(type);
        };
        getType();
    }, []);

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

    let cancelToken: any;

    if (Platform.OS === "android") {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }

    const { width } = useWindowDimensions();

    const numColumns = width > 600 ? 3 : 2;

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
                // Alert.alert('Error', 'Server error');
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
                // Alert.alert('Error', 'Server error');
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
                // Alert.alert('Error', 'Server error');
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
                // Alert.alert('Error', 'Server error');
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
                // Alert.alert('Error', 'Server error');
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
            Alert.alert('Error', 'Mail API failed');
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
                Alert.alert('Info', 'No Data Found');
            }

        } catch (error) {
            console.log('❌ Mail Error:', error);
            Alert.alert('Error', 'Mail API failed');
        } finally {
            setIsLoadingYPO(false);
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
                <Text style={crlimtreq_styles.dateText}>{item.SODate}</Text>
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
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>StoreName:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.StoreName || 'N/A'}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>

                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Entered By:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.username || 'N/A'}</Text>
                </View>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Delivery Date:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.dduedate || 'N/A'}</Text>
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
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>StoreName:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.StoreName || 'N/A'}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>

                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Entered By:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.username || 'N/A'}</Text>
                </View>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Delivery Date:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.dduedate || 'N/A'}</Text>
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

                {prptype === 'R' && item.mailsent === '1' && (
                    <TouchableOpacity
                        onPress={() => handleInfoClick(item)}
                        disabled={!isConnected}
                    >
                        <View style={crlimtreq_styles.infoIconContainer}>
                            <Icon
                                name="email"
                                size={34}
                                color={!isConnected ? "#ccc" : theme.BRAND_GRADIENT_END}
                            />
                        </View>
                    </TouchableOpacity>
                )}

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
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>StoreName:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.StoreName || 'N/A'}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>

                    </View>
                </View>

            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Entered By:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.username || 'N/A'}</Text>
                </View>
                <View style={crlimtreq_styles.subHeaderRow}>
                    <Text style={crlimtreq_styles.subHeaderLabel}>Delivery Date:</Text>
                    <Text style={crlimtreq_styles.subHeaderValue}>{item.dduedate || 'N/A'}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity onPress={() => handleIconPress(item, 'pending')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={32} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'verifyreject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={32} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleInfoPress(item.d1, item)} disabled={!isConnected}>
                    <View style={crlimtreq_styles.infoIconContainer}>
                        <Icon name="info" size={32} color={!isConnected ? "#ccc" : "#2196F3"} />
                        {item.d1 && <Text style={crlimtreq_styles.infoCount}>{item.d1.length}</Text>}
                    </View>
                </TouchableOpacity>
                {prptype === 'R' && item.mailsent === '1' && (
                    <TouchableOpacity
                        onPress={() => handleInfoClick(item)}
                        disabled={!isConnected}
                    >
                        <View style={crlimtreq_styles.infoIconContainer}>
                            <Icon
                                name="email"
                                size={32}
                                color={!isConnected ? "#ccc" : theme.BRAND_GRADIENT_END}
                            />
                        </View>
                    </TouchableOpacity>
                )}
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
                {/* <TouchableOpacity style={crlimtreq_styles.listIconContainer}>
                    <Icon name="list" size={24} color="white" onPress={handleCriteriaFormOpen} />
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


            </View>

            <Modal visible={mailLogModal} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>

                        <Text style={styles.modalTitle}>
                            {mailLogData.length} Sent Log(s) found
                        </Text>

                        <FlatList
                            data={mailLogData}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 10 }}
                            renderItem={({ item }) => (
                                <View style={styles.logCard}>

                                    <View style={styles.logHeaderBox}>
                                        <Text style={styles.logHeader}>
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
                                                        color: row.value === 'Yes' ? '#4CAF50' : '#F44336'
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

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setMailLogModal(false)}
                        >
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </>
    );
};
export default GreySalesOrder;
