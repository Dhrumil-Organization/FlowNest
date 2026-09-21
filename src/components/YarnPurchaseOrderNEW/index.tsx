import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    Modal,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
// import RNFS from 'react-native-fs';
// import { Buffer } from 'buffer';
// import Pdf from 'react-native-pdf';
import { crlimtreq_styles } from '@/common/Style';
import FullScreenLoader from '@/components/FullScreenLoader';
import HeaderBar from '../../components/HeaderNew';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
// import { encode as btoa } from  'base-64';
// import { urlSafeEncode } from './urlSafeEncode';
// import { encodeData } from './encodingUtils';
import { API } from '@/common/API/dynamicAPI';
import theme from '@/components/theme';
import { LinearGradient } from 'expo-linear-gradient';
// import CriteriaForm from './CriteriaForm';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { fetchAllStoredata } from '../../common/API/Functions';
// import { useNavigation } from '@react-navigation/native';
// import { navigate } from '../../android/app/src/navigation/NavigationService';
import { useRouter } from 'expo-router';
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

    // 1 col on phone, 2 on tablet, 3 on wide web
    const { width } = useWindowDimensions();

    const getColumns = () => {
        if (width < 600) return 1;      // mobile
        if (width < 1000) return 2;     // tablet
        return 3;                       // web / large
    };

    const numColumns = getColumns();

    // Explicit item width so the last row doesn't stretch weirdly
    const GRID_PAD = 10;
    const GRID_GAP = 10;
    const gridItemWidth =
        numColumns > 1
            ? (width - GRID_PAD * 2 - GRID_GAP * (numColumns - 1)) / numColumns
            : width;

    const styles = StyleSheet.create({

        card: {
            backgroundColor: '#fff',
            marginVertical: 8,
            borderRadius: 12,
            padding: 14,
            elevation: 3,
            marginHorizontal: 0,   // change from 12 → 0 (spacing handled by grid)
            marginBottom: 12,
        },

        acceptedCard: {
            borderLeftWidth: 4,
            borderLeftColor: '#4CAF50'
        },

        rejectedCard: {
            borderLeftWidth: 4,
            borderLeftColor: '#F44336'
        },

        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },

        poNo: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#333'
        },

        date: {
            fontSize: 12,
            color: '#777'
        },

        statusChip: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20
        },

        party: {
            marginTop: 6,
            fontSize: 14,
            fontWeight: '600',
            color: '#444'
        },

        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 6
        },

        label: {
            color: '#000',
            fontSize: 12
        },

        value: {
            color: '#222',
            fontWeight: '500'
        },

        actionRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 10
        },

        iconBtn: {
            marginLeft: 8,
            padding: 8,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center'
        },

        // chatIconBtn: {
        //     position: 'absolute',
        //     top: 8,
        //     right: 8,
        //     backgroundColor: '#4A90E2',
        //     padding: 6,
        //     borderRadius: 20,
        //     elevation: 3, // android shadow
        //     shadowColor: '#000',
        //     shadowOpacity: 0.2,
        //     shadowOffset: { width: 0, height: 2 },
        //     shadowRadius: 3,
        //     zIndex: 10
        // },

        chatIconBottom: {
            marginTop: 10,
            alignSelf: 'flex-end',  // right side niche
            backgroundColor: '#2196F3',
            padding: 8,
            borderRadius: 20
        },

        expandHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderColor: '#eee'
        },

        expandText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#333'
        },

        itemContainer: {
            marginTop: 8
        },

        itemCard: {
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            elevation: 3,
        },

        itemHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },

        itemTitle: {
            fontSize: 15,
            color: '#222',
            flex: 1,
            paddingRight: 10,
            fontWeight: 'bold',
            marginBottom: 6,
        },

        chartBtn: {
            backgroundColor: '#2196F3',
            padding: 8,
            borderRadius: 8,
            elevation: 2,
        },

        itemGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },

        itemBox: {
            width: '48%',
            marginBottom: 10,
        },

        itemLabel: {
            fontSize: 11,
            color: '#888',
        },

        itemValue: {
            fontSize: 13,
            fontWeight: '500',
            color: '#333',
        },

        // itemTitle: {
        //     fontWeight: 'bold',
        //     fontSize: 14,
        //     marginBottom: 6,
        //     color: '#222'
        // },

        itemRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 4
        },

        itemLabel: {
            fontSize: 12,
            color: '#888'
        },

        itemValue: {
            fontSize: 13,
            fontWeight: '500',
            color: '#333'
        },
        stampContainer: {
            position: 'absolute',
            right: 35,      // right side se distance
            top: 115,
            // top: '80%',
            left: '80%',
            marginLeft: -50,
            marginTop: 20,
            zIndex: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stampContainerPOS: {
            position: 'absolute',
            right: 20,
            top: 120,
            zIndex: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },

        stampContainerYOS: {
            position: 'absolute',
            right: 20,
            top: 120,
            zIndex: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },

        stamp: {
            width: 100,
            height: 60,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            transform: [{ rotate: '0deg' }],
        },

        stampAccepted: {
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            borderColor: 'rgba(46, 125, 50, 0.9)',
        },

        stampRejected: {
            backgroundColor: 'rgba(244, 67, 54, 0.7)',
            borderColor: 'rgba(198, 40, 40, 0.9)',
        },

        stampText: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 12,
            textAlign: 'center',
        },
        prpCodeContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            backgroundColor: '#F5F7FA',
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E0E0E0',
        },

        prpCodeText: {
            fontSize: 16,
            fontWeight: '700',
            color: '#000',
            textAlign: 'center',
            letterSpacing: 1,
        },
    });



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
        if (selectedActionYPO === 'pending' || selectedActionYPO === 'verifyreject') {

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

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => {

        const isApproved = item.IsAuth === '1';
        const isRejected = item.IsAuth === '2';

        return (
            <View style={crlimtreq_styles.gridCardWrapper}>
                <View style={[
                    crlimtreq_styles.card,
                    isApproved ? styles.acceptedCard :
                        isRejected ? styles.rejectedCard : null
                ]}>
                    <View style={styles.headerRow}>
                        <View style={styles.prpCodeContainer}>
                            <Text style={styles.prpCodeText}>
                                {item.PrpCode}
                            </Text>
                        </View>
                    </View>

                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.poNo}>{item.PONo}</Text>
                            <Text style={styles.date}>{item.PODate}</Text>
                        </View>

                        {(isApproved || isRejected) && (
                            <View style={[
                                styles.statusChip,
                                { backgroundColor: isApproved ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                                <Text style={{
                                    color: isApproved ? '#2E7D32' : '#C62828',
                                    fontWeight: '600'
                                }}>
                                    {isApproved ? 'Approved' : 'Rejected'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* PARTY */}
                    <Text style={styles.party}>{item.ParName}</Text>

                    {/* DETAILS */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Broker</Text>
                        <Text style={styles.value}>{item.BAccName || '-'}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Net Amount</Text>
                        <Text style={styles.value}>{item.NetAmt || '-'}</Text>
                    </View>

                    {API === "https://apiy.tms-webapp.com" && (
                        < View style={styles.row}>
                            <Text style={styles.label}>Store</Text>
                            <Text style={styles.value}>{item.StoreName || '-'}</Text>
                        </View>
                    )}

                    <View style={styles.row}>
                        <Text style={styles.label}>Auth By</Text>
                        <Text style={styles.value}>{item.AuthorisedBy || '-'}</Text>
                    </View>

                    {/* ACTION ROW */}
                    {(isApproved || isRejected) && (
                        <View style={styles.actionRow}>

                            <View style={[
                                styles.iconBtn,
                                { backgroundColor: isApproved ? '#4CAF50' : '#F44336' }
                            ]}>
                                <Icon
                                    name={isApproved ? 'check' : 'close'}
                                    size={20}
                                    color="#fff"
                                />
                            </View>
                        </View>
                    )}

                    {/* 🔽 EXPAND BUTTON */}
                    <TouchableOpacity
                        style={styles.expandHeader}
                        onPress={() => toggleExpandHistory(item.UId)}
                    >
                        <Text style={styles.expandText}>
                            Items ({item.d1?.length || 0})
                        </Text>

                        <Icon
                            name={expandedHistoryCards[item.UId] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={24}
                            color="#333"
                        />
                    </TouchableOpacity>

                    {/* 🔽 EXPANDED ITEMS */}
                    {expandedHistoryCards[item.UId] && (
                        <View style={styles.itemContainer}>
                            {item.d1?.map((d1Item, index) => (


                                <View key={index} style={styles.itemCard}>

                                    {/* TOP ROW (TITLE + ICON) */}
                                    <View style={styles.itemHeader}>
                                        <Text style={styles.itemTitle}>
                                            {d1Item.ItmName}
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.chartBtn}
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
                                        >
                                            <Icon name="bar-chart" size={18} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* DETAILS GRID */}
                                    < View style={styles.itemGrid} >

                                        <View style={styles.itemBox}>
                                            <Text style={styles.itemLabel}>Grade</Text>
                                            <Text style={styles.itemValue}>{d1Item.GrdName}</Text>
                                        </View>

                                        <View style={styles.itemBox}>
                                            <Text style={styles.itemLabel}>Shade</Text>
                                            <Text style={styles.itemValue}>{d1Item.ShdName}</Text>
                                        </View>

                                        <View style={styles.itemBox}>
                                            <Text style={styles.itemLabel}>Qty</Text>
                                            <Text style={styles.itemValue}>{d1Item.Qty}</Text>
                                        </View>

                                        <View style={styles.itemBox}>
                                            <Text style={styles.itemLabel}>Rate</Text>
                                            <Text style={styles.itemValue}>{d1Item.UnitRate}</Text>
                                        </View>

                                        <View style={styles.itemBox}>
                                            <Text style={styles.itemLabel}>Amount</Text>
                                            <Text style={styles.itemValue}>{d1Item.Amount}</Text>
                                        </View>

                                    </View>

                                </View>
                            ))
                            }
                        </View >
                    )}

                </View >
            </View>
        );
    };

    const renderCommonCard = ({ item, type }: { item: any, type: 'history' | 'request' | 'verify' }) => {

        const isApproved = item.IsAuth === '1';
        const isRejected = item.IsAuth === '2';

        return (
            <View style={crlimtreq_styles.gridCardWrapper}>
                <View style={[
                    crlimtreq_styles.card, !isConnected && crlimtreq_styles.disabledCard,
                    item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card]}>

                    {item.isProcessed && (
                        <View style={styles.stampContainerYOS}>
                            <View
                                style={[
                                    styles.stamp,
                                    item.actionType === 'accept'
                                        ? styles.stampAccepted
                                        : styles.stampRejected,
                                ]}
                            >
                                <Text style={styles.stampText}>
                                    {item.actionType === 'accept' ? 'APPROVED' : 'REJECTED'}
                                </Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.headerRow}>
                        <View style={styles.prpCodeContainer}>
                            <Text style={styles.prpCodeText}>
                                {item.PrpCode}
                            </Text>
                        </View>
                    </View>
                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.poNo}>{item.PONo}</Text>
                            <Text style={styles.date}>{item.PODate}</Text>
                        </View>

                        {(isApproved || isRejected) && (
                            <View style={[
                                styles.statusChip,
                                { backgroundColor: isApproved ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                                <Text style={{
                                    color: isApproved ? '#2E7D32' : '#C62828',
                                    fontWeight: '600'
                                }}>
                                    {isApproved ? 'Approved' : 'Rejected'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* PARTY */}
                    <Text style={styles.party}>{item.ParName}</Text>

                    {/* DETAILS */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Broker</Text>
                        <Text style={styles.value}>{item.BAccName || '-'}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Net Amount</Text>
                        <Text style={styles.value}>{item.NetAmt || '-'}</Text>
                    </View>
                    {API === "https://apiy.tms-webapp.com" && (
                        < View style={styles.row}>
                            <Text style={styles.label}>Store</Text>
                            <Text style={styles.value}>{item.StoreName || '-'}</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>Auth By</Text>
                        <Text style={styles.value}>{item.AuthorisedBy || '-'}</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={styles.label}>Auth Remark:</Text>
                            <RNTextInput
                                style={crlimtreq_styles.editableValueBlack}
                                value={editableValuesYPO[item.UId]?.ARemark || ''}
                                onChangeText={(text) => handleEdit(item.UId, 'ARemark', text)}
                            />
                        </View>
                    </View>

                    {/* 🔥 VERIFY TAB KE LIYE BUTTON */}
                    {
                        type === 'verify' && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={() => handleIconPress(item, 'pending')} disabled={!isConnected || item.isProcessed}>
                                    <Icon name="check-circle" size={30} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => handleIconPress(item, 'verifyreject')} disabled={!isConnected || item.isProcessed}>
                                    <Icon name="cancel" size={30} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                                </TouchableOpacity>
                            </View>
                        )
                    }

                    {
                        type === 'request' && (
                            <View style={styles.actionRow}>

                                {/* ✅ ACCEPT */}
                                <TouchableOpacity
                                    onPress={() => handleIconPress(item, 'accept')}
                                    // disabled={!isConnected || item.IsAuth !== '0'}
                                    disabled={!isConnected || item.isProcessed}
                                >
                                    <Icon
                                        name="check-circle"
                                        size={35}
                                        color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"}
                                    />
                                </TouchableOpacity>

                                {/* ❌ REJECT */}
                                <TouchableOpacity
                                    onPress={() => handleIconPress(item, 'reject')}
                                    // disabled={!isConnected || item.IsAuth !== '0'}
                                    disabled={!isConnected || item.isProcessed}
                                >
                                    <Icon
                                        name="cancel"
                                        size={35}
                                        color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"}
                                    />
                                </TouchableOpacity>

                                {/* 📄 FILE */}
                                <TouchableOpacity
                                    onPress={() => {
                                        if (isConnected && item.IsAuth === '0') {
                                            handleCallURL(item);
                                        }
                                    }}
                                    disabled={!isConnected || item.IsAuth !== '0' || getLocationLoading === item.UId}
                                >
                                    {
                                        getLocationLoading === item.UId ? (
                                            <ActivityIndicator size={35} color="#2196F3" />
                                        ) : (
                                            <Icon
                                                name="file-present"
                                                size={35}
                                                color={!isConnected || item.IsAuth !== '0' ? "#ccc" : "#2196F3"}
                                            />
                                        )
                                    }
                                </TouchableOpacity>

                            </View>
                        )
                    }

                    {/* 🔽 EXPAND */}
                    <TouchableOpacity
                        style={styles.expandHeader}
                        onPress={() => toggleExpandHistory(item.UId)}
                    >
                        <Text style={styles.expandText}>
                            Items ({item.d1?.length || 0})
                        </Text>

                        <Icon
                            name={expandedHistoryCards[item.UId] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={24}
                            color="#333"
                        />
                    </TouchableOpacity>

                    {/* 🔽 ITEMS */}
                    {
                        expandedHistoryCards[item.UId] && (
                            <View style={styles.itemContainer}>
                                {item.d1?.map((d1Item, index) => (

                                    <View key={index} style={styles.itemCard}>

                                        <View style={styles.itemHeader}>
                                            <Text style={styles.itemTitle}>
                                                {d1Item.ItmName}
                                            </Text>

                                            {/* 🔥 CHART BUTTON (ALL TABS ME SAME) */}
                                            <TouchableOpacity
                                                style={styles.chartBtn}
                                                // onPress={() => navigation.navigate('ChartScreen', {
                                                //     item,
                                                //     d1Item,
                                                //     token
                                                // })}
                                                onPress={() =>
                                                    // console.log('Chart clicked', d1Item);
                                                    // handleChartClick(item, d1Item);
                                                    router.push({
                                                        pathname: '/ChartScreen',
                                                        params: {
                                                            item: JSON.stringify(item),
                                                            d1Item: JSON.stringify(d1Item),
                                                            token: token

                                                        }
                                                    })
                                                }
                                            >
                                                <Icon name="bar-chart" size={18} color="#fff" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.itemGrid}>

                                            <View style={styles.itemBox}>
                                                <Text style={styles.itemLabel}>Grade</Text>
                                                <Text style={styles.itemValue}>{d1Item.GrdName}</Text>
                                            </View>

                                            <View style={styles.itemBox}>
                                                <Text style={styles.itemLabel}>Shade</Text>
                                                <Text style={styles.itemValue}>{d1Item.ShdName}</Text>
                                            </View>

                                            <View style={styles.itemBox}>
                                                <Text style={styles.itemLabel}>Qty</Text>
                                                <Text style={styles.itemValue}>{d1Item.Qty}</Text>
                                            </View>

                                            <View style={styles.itemBox}>
                                                <Text style={styles.itemLabel}>Rate</Text>
                                                <Text style={styles.itemValue}>{d1Item.UnitRate}</Text>
                                            </View>

                                            <View style={styles.itemBox}>
                                                <Text style={styles.itemLabel}>Amount</Text>
                                                <Text style={styles.itemValue}>{d1Item.Amount}</Text>
                                            </View>

                                        </View>

                                    </View>
                                ))}
                            </View>
                        )
                    }
                </View >
            </View>
        );
    };

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

    return (
        <>
            {activeTab1YPO === 'requests' ? (
                <>
                    <HeaderBar
                        userName={username}
                        onSearch={setSearchQueryYPO}
                        placeholder="Search purchase order..."
                    />
                </>

            ) : activeTab1YPO === 'history' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQueryYPO}
                    placeholder="Search purchase history..."
                />
            ) : activeTab1YPO === 'verify' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchverifyQueryYPO}
                    placeholder="Search purchase verify..."
                />
            ) : null}
            <View style={[crlimtreq_styles.container, { backgroundColor: '#F5F5F5', marginBottom: -50 }]}>
                {isLoadingYPO && <FullScreenLoader message={"Loading..."} />}
                <TabBar activeTabYPO={activeTab1YPO} setActiveTabYPO={setActiveTab1YPO} />
                {activeTab1YPO === 'requests' ? (
                    <FlatList
                        key={`req-${numColumns}`}
                        ref={flatListRefYPO}
                        data={filteredDataSPO}
                        numColumns={numColumns}
                        // columnWrapperStyle={
                        //     numColumns > 1 ? { gap: GRID_GAP, paddingHorizontal: GRID_PAD } : undefined
                        // }
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}   // 👈 kills black space
                        // renderItem={renderCard}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'request' })}
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
                        key={`hist-${numColumns}`}
                        ref={flatHistoryListRefYPO}
                        data={filteredhistoryDataSPO}
                        numColumns={numColumns}
                        // columnWrapperStyle={
                        //     numColumns > 1 ? { gap: GRID_GAP, paddingHorizontal: GRID_PAD } : undefined
                        // }
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                        renderItem={({ item }) => (
                            <>
                                {renderAllCardHistory({ item })}
                            </>
                        )}
                        // renderItem={({ item }) => renderCommonCard({ item, type: 'history' })}
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
                        key={`ver-${numColumns}`}
                        ref={flatVerifyListRefYPO}
                        data={filteredverifyDataSPO}
                        numColumns={numColumns}
                        // columnWrapperStyle={
                        //     numColumns > 1 ? { gap: GRID_GAP, paddingHorizontal: GRID_PAD } : undefined
                        // }
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                        renderItem={({ item }) => renderCommonCard({ item, type: 'verify' })}
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

            {/* <ChartScreen
                visible={chartVisible}
                data={chartData}
                loading={chartLoading}
                token={token}
                onClose={() => setChartVisible(false)}
            /> */}

            {/* ✅ CHART MODAL (YAHAN) */}
            <Modal
                visible={chartVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setChartVisible(false)}
            >
                <View style={{ flex: 1, padding: 12 }}>

                    {chartLoading && (
                        <ActivityIndicator size="large" color="#2196F3" />
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
                                            style={{
                                                marginHorizontal: 8,
                                                alignItems: 'center'
                                            }}
                                        >

                                            {/* RATE BAR */}
                                            <View style={{
                                                height: rate / 2, // scale adjust karo
                                                width: 20,
                                                backgroundColor: '#4CAF50',
                                                marginBottom: 4,
                                                borderRadius: 4
                                            }} />

                                            {/* QTY BAR */}
                                            <View style={{
                                                height: qty / 2,
                                                width: 20,
                                                backgroundColor: '#2196F3',
                                                borderRadius: 4
                                            }} />

                                            {/* LABEL */}
                                            <Text style={{ fontSize: 10, marginTop: 6 }}>
                                                {label}
                                            </Text>

                                        </View>
                                    );
                                })}

                            </View>
                        </ScrollView>
                    )}

                    {!chartLoading && (!chartData || chartData.labels?.length === 0) && (
                        <Text style={{ textAlign: 'center', marginTop: 20 }}>
                            No chart data available
                        </Text>
                    )}

                </View>
            </Modal>

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
        </>
    );
};
export default YarnPurchaseOrder;
