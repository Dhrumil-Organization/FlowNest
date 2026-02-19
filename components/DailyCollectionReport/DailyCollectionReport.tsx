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
    ScrollView,
    StyleSheet,
    Dimensions, useWindowDimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios, { toFormData } from 'axios';
// import { encode as base64_encode } from 'react-native-base64';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
// import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
// import HeaderBar from '../HeaderBar/HeaderBar';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import ChequeForm from './ChequeForm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fetchPropertyData, fetchCurrentYearData, fetchPropertyGroupDataDCR, fetchPropertyDataDCR } from '../../common/API/Functions';
import CustomDrawer from './CustomDrawer';
import CollectionCard from './CollectionCard';
import Footer from '../Footer/Footer';
import { API } from '../../common/API/dynamicAPI';

console.log("Daily Collection Report API:", API);

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list';
}
interface PropertyData {
    PrpCode: string;
    LngName: string;
    PrpName: string;
    ShtName: string;
    PrpOf: string;
    PrpOfFull: string;
    PanNo: string;
    GSTNO: string;
}
interface SexeData {
    Code: string;
    SalesExecutive: string;
}
interface PropertyGroupData {
    PrpOf: string;
    PrpOfFull: string;
    PrpCode: string;
}
interface YearData {
    data: number;
}
interface BankData {
    BankName: string;
}
interface BranchData {
    BankBr: string;
}

interface PartyData {
    ordno: string;
    acccode: string;
    accname: string;
    address: string;
    gstin: string;
    email: string;
}

export interface Party {
    accname?: string;
    accode?: string;
    address?: string;
    email?: string;
    gstin?: string;
    ordno?: string;
    [k: string]: any;
}

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
    setIsLoggedIn: (value: boolean) => void;
    rightsMenuApps: Array<string>;
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
    CrLimit: string;
    limit3: string;
    crday1: string;
    CrDay: string;
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

const DailyCollectionReport: React.FC<Props> = ({ token, navigation, isConnected, username, setIsLoggedIn, rightsMenuApps }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const filterKey = 'all';
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [getLocationLoading, setLocationLoading] = useState(false);
    const [allhistoryLoading, setIsAllHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [getPartyLoading, setPartyLoading] = useState(false);
    const [getBankLoading, setBankLoading] = useState(false);
    const [getBranchLoading, setBranchLoading] = useState(false);
    const [getSuccess, setSuccess] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [historyData, setHistoryData] = useState<CardData[]>([]);
    const [getPropertyData, setPropertyData] = useState<PropertyData[]>([]);
    const [getPropertyGroupData, setPropertyGroupData] = useState<PropertyGroupData[]>([]);
    const [getYearData, setYearData] = useState<YearData>();
    const [getBankData, setBankData] = useState<BankData[]>([]);
    const [getBranchData, setBranchData] = useState<BranchData[]>([]);
    const [getPartyData, setPartyData] = useState<PartyData[]>([]);
    const [partyList, setPartyList] = useState<CardData[]>([]);
    const [getDetailsData, setDetailsData] = useState([]);
    const [masSync, setMasSync] = useState([]);
    const [getDetailsDataSetting, setDetailsDataSetting] = useState([]);
    const [editableValues, setEditableValues] = useState<{ [uid: string]: { CrLimit?: string; CrDay?: string } }>({});
    const [showOverlay, setShowOverlay] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'list' | null>(null);
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [selectedItemURL, setSelectedItemURL] = useState<CardData | null>(null);
    const [showTopButton, setShowTopButton] = useState(false);
    const [showPartyHistoryModal, setShowPartyHistoryModal] = useState(false);
    const [getDLOcation, setDLOcation] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);
    const [activeTab, setActiveTab] = useState<'party'>('party');
    const [activeTab1, setActiveTab1] = useState<'account requests'>('account requests');
    const [selectedProperty, setSelectedProperty] = useState<PropertyData[] | null>(null);
    const [SelectedSexe, setSelectedSexe] = useState<SexeData[] | null>(null);
    const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<PropertyGroupData | null>(null);
    const [selectedParty, setSelectedParty] = useState<PartyData | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankData | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
    const [selected, setSelected] = useState<Party | null>();
    const [activeCard, setActiveCard] = useState(null);
    const [selectedbank, setSelectedbank] = useState<BankData | null>();
    const [getDetailPayload, setDetailPayload] = useState({});
    const [selectedbranch, setSelectedbranch] = useState<BranchData | null>();
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    const [getSexeLoading, setSexeLoading] = useState(false);
    const [form, setForm] = useState({
        EDate: new Date().toISOString().split('T')[0],
        ChkDate: new Date().toISOString().split('T')[0],
        fromdate: new Date().toISOString().split('T')[0],
        todate: new Date().toISOString().split('T')[0],
        AccCode: "",
        AccName: "",
        BankName: "",
        BankBr: "",
        ChqNo: "",
        ChqDate: "",
        Amount: "",
        Remark: "",
        AdjType: "",
        AttachImage: "",
    });
    const [getResponse, setResponse] = useState();
    // Drawer
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [selectedExe, setSelectedExe] = useState(null);
    const [selectedExeCRT, setSelectedExeCRT] = useState(null);
    const [exeDataCRT, setExeDataCRT] = useState([]);
    const [exeData, setExeData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [itemData, setItemData] = useState([]);
    const [page, setpage] = useState(0);
    const [selectedDesigns, setSelectedDesigns] = useState([])
    const [getSelectedSexeName, setSelectedSexeName] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [selectedItemStatus, setSelectedItemStatus] = useState('All');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [hasDailyCollectionReport, setHasDailyCollectionReport] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCardName, setSelectedCardName] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    // 
    const [sexeModalVisible, setSexeModalVisible] = useState(false);
    const [selectedSexeCard, setSelectedSexeCard] = useState(null);
    const [sexeSearchQuery, setSexeSearchQuery] = useState('');
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [lockedCardId, setLockedCardId] = useState<string | null>(null);
    const mainScrollRef = useRef(null);


    // 


    // const [gePOTData, setPOTData] = useState([
    //     {
    //         "UId": "370000035",
    //         "PrpCode": "SIP",
    //         "AccCode": "10291",
    //         "EDate": "28/11/2025",
    //         "ParCode": "",
    //         "BankName": "",
    //         "BankBr": "",
    //         "ChqNo": "258095",
    //         "ChqDate": "29/11/2025",
    //         "Remark": "knfnfsdf sdfknskfna askdndklasd aksjdnlasd as,dnasld asdknldksdas kdnadasdasldmnasld  aldfnasfB  fhASDFASIF adfhakdasldasld",
    //         "Amount": "950000.00",
    //         "AdjType": "ACC",
    //         "UsrCode": "1",
    //         "LastDate": "20251128",
    //         "LastTime": "11.20",
    //         "UUsrCode": "",
    //         "ULastDate": "0",
    //         "ULastTime": ".00",
    //         "AttachImage": "https://apig.tms-webapp.com/images/image_1751343358.png",
    //         "PayType": "",
    //         "IsAuth": "1",
    //         "ARemark": "",
    //         "AUsrCode": "",
    //         "ALastDate": "0",
    //         "ALastTime": ".00",
    //         "nEDate": "20251128",
    //         "nChqDate": "20251129",
    //         "AccName": "K.G.MARDA [KOLKATA ]",
    //         "BankNo": "0",
    //         "IFSCode": "",
    //         "ParName": "",
    //         "authorisedby": ""
    //     },
    //     {
    //         "UId": "370000036",
    //         "PrpCode": "SIP",
    //         "AccCode": "10291",
    //         "EDate": "28/11/2025",
    //         "ParCode": "",
    //         "BankName": "ICICI Bank",
    //         "BankBr": "Adarsh Nagar",
    //         "ChqNo": "258095",
    //         "ChqDate": "29/11/2025",
    //         "Remark": "Demo",
    //         "Amount": "2580000.00",
    //         "AdjType": "ACC",
    //         "UsrCode": "1",
    //         "LastDate": "20251128",
    //         "LastTime": "11.20",
    //         "UUsrCode": "",
    //         "ULastDate": "0",
    //         "ULastTime": ".00",
    //         "AttachImage": "",
    //         "PayType": "",
    //         "IsAuth": "0",
    //         "ARemark": "",
    //         "AUsrCode": "",
    //         "ALastDate": "0",
    //         "ALastTime": ".00",
    //         "nEDate": "20251128",
    //         "nChqDate": "20251129",
    //         "AccName": "K.G.MARDA [KOLKATA ]",
    //         "BankNo": "0",
    //         "IFSCode": "",
    //         "ParName": "",
    //         "authorisedby": ""
    //     },
    //     {
    //         "UId": "370000037",
    //         "PrpCode": "SIP",
    //         "AccCode": "10291",
    //         "EDate": "28/11/2025",
    //         "ParCode": "",
    //         "BankName": "",
    //         "BankBr": "",
    //         "ChqNo": "258095",
    //         "ChqDate": "29/11/2025",
    //         "Remark": "Demo",
    //         "Amount": "2580000.00",
    //         "AdjType": "ACC",
    //         "UsrCode": "1",
    //         "LastDate": "20251128",
    //         "LastTime": "11.20",
    //         "UUsrCode": "",
    //         "ULastDate": "0",
    //         "ULastTime": ".00",
    //         "AttachImage": "https://apig.tms-webapp.com/images/image_1751343358.png",
    //         "PayType": "",
    //         "IsAuth": "0",
    //         "ARemark": "",
    //         "AUsrCode": "",
    //         "ALastDate": "0",
    //         "ALastTime": ".00",
    //         "nEDate": "20251128",
    //         "nChqDate": "20251129",
    //         "AccName": "K.G.MARDA [KOLKATA ]",
    //         "BankNo": "0",
    //         "IFSCode": "",
    //         "ParName": "",
    //         "authorisedby": ""
    //     }
    // ])
    const [gePOTData, setPOTData] = useState([])
    const [getSummaryData, setSummaryData] = useState([])
    const [getpayload, setPayload] = useState([])


    useEffect(() => {
        if (rightsMenuApps && rightsMenuApps.length > 0) {
            const hasReport = rightsMenuApps.some(
                (item) => item?.title === "Daily Collection Report"
            );
            setHasDailyCollectionReport(hasReport);
            console.log("🔵 Has Daily Collection Report:", hasReport);
        }
    }, [rightsMenuApps]);

    console.log("rightsMenuApps:", rightsMenuApps, hasDailyCollectionReport);

    let cancelToken: any;

    // Set default dates
    useEffect(() => {
        const today = new Date();
        // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(today);
        setToDate(today);
    }, []);
    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const getRequestConfigProperty = () => {
        let params1 = null;

        let requestconfig = {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json'
            },
            params1
        };
        return requestconfig;
    };




    useEffect(() => {
        const loadProperty = async () => {
            const getGroupdata = await fetchPropertyGroupDataDCR(token);
            const getdata = await fetchPropertyData(token);
            const getyeardata = await fetchCurrentYearData(token);
            setPropertyGroupData(getGroupdata);
            setPropertyData(getdata);
            setYearData(getyeardata as YearData);
            console.log("prp & year", getdata, getyeardata);
        };

        loadProperty();
    }, [token]);

    let currentYear = getYearData?.data;

    console.log("🔵 Got Property at collection", getPropertyData, "🔵 Got Year at collection", currentYear);
    console.log("🔵 Got Selected Property", selectedProperty);
    console.log("🔵 Got Selected Property Group", selectedPropertyGroup);
    console.log("🔵 Got Party Collection", getPartyData);
    console.log("🔵 Got Selected Party", selectedParty);

    console.log("🔵 Got Bank Collection", getBankData);
    console.log("🔵 Got Selected Bank", selectedBank);

    console.log("🔵 Got Branch Collection", getBranchData);
    console.log("🔵 Got Selected Branch", selectedBranch);




    // Convert an ISO-like date "YYYY-MM-DD" (or a Date string) to "DD-MM-YYYY"
    const isoToDDMMYYYY = (iso?: string) => {
        if (!iso) return '';
        // If already in YYYY-MM-DD format (safe quick check)
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            const [yyyy, mm, dd] = iso.split('-');
            return `${dd}-${mm}-${yyyy}`;
        }
        // Try to parse other date strings/Date object
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso; // fallback: return original
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };


    // Collection: update ShowChequeData to accept formParam
    const ShowChequeData = async (formParam?: any) => {
        setInitialLoading(true);
        console.log('🔵 show cheque calling (API)...', formParam);

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setPartyLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = {
                uid: 0,
                prpcode: formParam?.PrpCode ?? form.PrpCode ?? "",
                EDate: isoToDDMMYYYY(formParam?.EDate ?? form.EDate ?? ""),
                txntype: "mob_collection",
                action: "view",
            };

            console.log('🔵 show cheque payload', payload);
            // const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, payload, { headers });
            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });
            console.log('🔵 show cheque response', response);
            if (response.data.success == true) {
                let d1 = [];
                let main = [];
                main = response.data.data.main;
                d1 = response.data.data.d1;
                setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
            }

            // handle response as you already intended
            // e.g. setPartyData or set other state depending on response
            // Example:
            // if (response.data.success) { ... }

        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setInitialLoading(false);
            setInitialModalVisible(false);
            setPartyLoading(false);
        }
    };




    const fetchPartyData = async (gotSelectedPrp: PropertyData) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setPartyLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = { prptype: gotSelectedPrp?.PrpOf };
            console.log('🔵 payload party', payload);
            // const response = await axios.post(`https://apig.tms-webapp.com/api/get_mobile_user_details`, payload, { headers });
            const response = await axios.post(`${API}/api/get_mobile_user_details`, payload, { headers });
            console.log('🔵 payload party', payload);
            console.log('🔵 party account response', response);
            if (response.data.success && response.data.response.party.length > 0) {
                const partygot = response.data.response.party;
                setPartyLoading(false);
                // Add a unique `uid` to each object

                setPartyData(partygot);
            } else {
                setPartyLoading(false);
                setPartyData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                setPartyLoading(false);
                Alert.alert('Error', 'Server error');
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const getRequestConfigBank = props => {
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





    useEffect(() => {
        if (selectedPropertyGroup !== null) {
            // clear any previously selected party when property changes
            setSelectedProperty(null);
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedbranch(null);

            let gotSelectedPrpGrp = selectedPropertyGroup;
            const loadProperty123 = async () => {
                const getdata = await fetchPropertyDataDCR(token, form?.PrpOf || "");
                setPropertyData(getdata);
            };

            loadProperty123();
            // fetchBankData(gotSelectedPrp);
        } else {
            // if property was cleared, also clear party
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedbranch(null);
        }
    }, [selectedPropertyGroup]);



    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };
    const getToken = () => {
        return token;
    };

    const handleValidation = (updatedItem: any) => {
        if (selectedAction === 'accept') {

            const numericNewLimit2: any = parseFloat(updatedItem.CrLimit.replace(/,/g, ''));
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
            } else if (updatedItem.CrLimit === '0' || parseFloat(updatedItem.CrLimit) === 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (parseFloat(updatedItem.CrLimit) < 0) {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (!updatedItem.CrLimit || updatedItem.CrLimit.trim() === '') {
                Alert.alert(
                    'Validation Error',
                    'Requested Limit cannot be empty or invalid for Party Name: ' + updatedItem.parname
                )
                return false;
            }
        }

        return true;

    };

    const handleLoadPress = () => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        console.log({
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode, // Convert array to comma-separated string
            action: 'collect_report',
            txntype: "mob_daily_collection_report",
            rpttype: 1,
            sexe: form?.SexeCode || {},
            fromdate: form.fromdate,
            todate: form.fromdate
        });

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode, // Convert array to comma-separated string
            action: 'collect_report',
            txntype: "mob_daily_collection_report",
            rpttype: 1,
            sexe: form?.SexeCode || [],
            fromdate: formatDate(form.fromdate), // Convert to dd-mm-yyyy
            todate: formatDate(form.todate)
        }

        fetchBrowseData(payload as any);
    };

    console.log('🔵 fromDate', form);

    const fetchBrowseData = async (payload: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const params = { ...payload };
            console.log('🔵 payload browse', payload);
            setPayload(params as any);
            // const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, params, { headers });
            const response = await axios.post(`${API}/api/collection_crud`, params, { headers });
            // const response = {
            //     data: {
            //         success: true,
            //         data: {
            //             data:
            //                 [
            //                     {
            //                         sas: 123
            //                     }
            //                 ]
            //             ,

            //             rptsettings:

            //                 [
            //                     {
            //                         sas: 123
            //                     }
            //                 ]
            //         }
            //     }
            // }
            console.log('🔵 payload browse', params);
            console.log('🔵 browse response', params, response);
            // if (response.data.success && Array.isArray(response.data.data.main) && response.data.data.main.length > 0) {
            //     // main list and d1 array from server
            //     const mainList = response.data.data.main as any[];
            //     const d1List = Array.isArray(response.data.data.d1) ? response.data.data.d1 as any[] : [];

            //     // Attach all matching d1 rows to each main card by UId
            //     const mainWithD1 = mainList.map(m => {
            //         const uidKey = String(m.UId ?? m.uid ?? '');
            //         const matches = d1List.filter(d => String(d.UId ?? d.uid ?? '') === uidKey);
            //         return { ...m, d1: matches };
            //     });

            //     setIsLoading(false);
            //     setIsDrawerVisible(false);
            //     setPOTData(mainWithD1 as any);
            // } else {
            //     setIsLoading(false);
            //     setPOTData([]);
            // }
            // if (response.data.success && response.data.data && response.data.data.data) {
            // if (response.data.success && response.data.data && response.data.data.data) {
            if (response.data.success && response.data.data && response.data.data.data) {

                // const dddd = [
                //     {
                //         "PrpCode": "MT",
                //         "PrpName": "MADHUSUDAN THREADS",
                //         "ToDaysCollection": "989472.00",
                //         "CrInBankAccCollection": ".00"
                //     },
                //     {
                //         "PrpCode": "MTS",
                //         "PrpName": "MADHUSUDAN THREADS",
                //         "ToDaysCollection": "460000.00",
                //         "CrInBankAccCollection": "200000.00"
                //     },
                //     {
                //         "PrpCode": "MRP",
                //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD.",
                //         "ToDaysCollection": "161344.00",
                //         "CrInBankAccCollection": ".00"
                //     },
                //     {
                //         "PrpCode": "AA",
                //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD1.",
                //         "ToDaysCollection": "161344.00",
                //         "CrInBankAccCollection": ".00"
                //     },
                //     {
                //         "PrpCode": "VV",
                //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD2.",
                //         "ToDaysCollection": "161344.00",
                //         "CrInBankAccCollection": ".00"
                //     },
                //     {
                //         "PrpCode": "Total",
                //         "PrpName": "Total",
                //         "ToDaysCollection": 1610816,
                //         "CrInBankAccCollection": 200000
                //     }
                // ]
                console.log('🔵 DHRUMIL main summary\'s data:', params, response);
                if (response.data.data.data.length > 0) {
                    // const tableData = Object.values(response.data.data.data).map((item: any) => ({
                    const tableData = Object.values(response.data.data.data).map((item: any) => ({
                        PrpCode: item.PrpCode,
                        PrpName: item.PrpName,
                        CrInBankAccCollection: item.CrInBankAccCollection,
                        ToDaysCollection: item.ToDaysCollection,
                    }));
                    setPOTData(tableData as any); // Set data for the table
                    setSummaryData(response.data.data.rptsettings);
                    closeDrawer();
                } else {
                    setPOTData([]);
                }
                // Extract and format data for DetailTable

            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                setIsLoading(false);
                Alert.alert('Error', 'Server error');
                setPOTData([]);
            }
        } finally {
            setIsLoading(false);
        }
    };


    // 
    const handleLoadPressSEXE = (item) => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        // console.log({
        //     prptype: form?.PrpOf || "",
        //     prpcodes: form.PrpCode, // Convert array to comma-separated string
        //     action: 'collect_report',
        //     txntype: "mob_daily_collection_report",
        //     rpttype: 1,
        //     sexe: form?.SexeCode || {},
        //     fromdate: form.fromdate,
        //     todate: form.fromdate
        // });

        console.log("getDetailPayload:", getDetailPayload, "Sexe:", item);

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {

            ...getDetailPayload,
            // sexe: [item.SExe],
            // sexe: item?.SExe
            //     ? item.SExe.split(',').map(val => Number(val.trim()))
            //     : []
            sexe: item?.SExe
                ? item.SExe.split(',').map(val => val.trim())
                : []


        }
        setSexeLoading(true);
        fetchBrowseDataSEXE(payload as any);
    };

    console.log('🔵 fromDate', form);

    const fetchBrowseDataSEXE = async (payload: any) => {
        console.log('🔵 Final Details payload', payload);
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            // const payload = {
            //     prptype: form?.PrpOf,
            //     prpcodes: [prpcode],
            //     action: 'collect_report',
            //     txntype: "mob_daily_collection_report",
            //     rpttype: 0
            // };
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const [year, month, day] = dateStr.split('-');
                return `${day}-${month}-${year}`;
            };
            // const payload = {
            //     prptype: form?.PrpOf || "",
            //     prpcodes: form.PrpCode, // Convert array to comma-separated string
            //     action: 'collect_report',
            //     txntype: "mob_daily_collection_report",
            //     rpttype: 0,
            //     sexe: form?.SexeCode || {},
            //     fromdate: formatDate(form.fromdate), // Convert to dd-mm-yyyy
            //     todate: formatDate(form.todate)
            // }
            console.log('qqq payload:', payload);
            console.log('🔵 Final Details payload', payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });
            console.log('🔵 DHRUMIL main summary\'s sexe\'s res:', payload, response);
            if (response.data.success) {
                setSexeLoading(false);
                const res_data = response.data.data.data.filter(
                    (item) => item.PrpName !== "Total"
                );
                setDetailsData(res_data);
                setDetailsDataSetting(response.data.data.rptsettings);
                setModalVisible(true);
            }
        } catch (error) {
            setSexeLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setSexeLoading(false);
            setIsLoadingSummary(false); // Set to false only once
        }
        // try {
        //     const params = { ...payload };
        //     console.log('🔵 payload browse', payload);
        //     setPayload(params as any);
        //     // const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, params, { headers });
        //     const response = await axios.post(`${API}/api/collection_crud`, params, { headers });
        //     // const response = {
        //     //     data: {
        //     //         success: true,
        //     //         data: {
        //     //             data:
        //     //                 [
        //     //                     {
        //     //                         sas: 123
        //     //                     }
        //     //                 ]
        //     //             ,

        //     //             rptsettings:

        //     //                 [
        //     //                     {
        //     //                         sas: 123
        //     //                     }
        //     //                 ]
        //     //         }
        //     //     }
        //     // }
        //     console.log('🔵 payload browse', params);
        //     console.log('🔵 browse response', params, response);
        //     // if (response.data.success && Array.isArray(response.data.data.main) && response.data.data.main.length > 0) {
        //     //     // main list and d1 array from server
        //     //     const mainList = response.data.data.main as any[];
        //     //     const d1List = Array.isArray(response.data.data.d1) ? response.data.data.d1 as any[] : [];

        //     //     // Attach all matching d1 rows to each main card by UId
        //     //     const mainWithD1 = mainList.map(m => {
        //     //         const uidKey = String(m.UId ?? m.uid ?? '');
        //     //         const matches = d1List.filter(d => String(d.UId ?? d.uid ?? '') === uidKey);
        //     //         return { ...m, d1: matches };
        //     //     });

        //     //     setIsLoading(false);
        //     //     setIsDrawerVisible(false);
        //     //     setPOTData(mainWithD1 as any);
        //     // } else {
        //     //     setIsLoading(false);
        //     //     setPOTData([]);
        //     // }
        //     // if (response.data.success && response.data.data && response.data.data.data) {
        //     // if (response.data.success && response.data.data && response.data.data.data) {
        //     if (response.data.success && response.data.data && response.data.data.data) {

        //         // const dddd = [
        //         //     {
        //         //         "PrpCode": "MT",
        //         //         "PrpName": "MADHUSUDAN THREADS",
        //         //         "ToDaysCollection": "989472.00",
        //         //         "CrInBankAccCollection": ".00"
        //         //     },
        //         //     {
        //         //         "PrpCode": "MTS",
        //         //         "PrpName": "MADHUSUDAN THREADS",
        //         //         "ToDaysCollection": "460000.00",
        //         //         "CrInBankAccCollection": "200000.00"
        //         //     },
        //         //     {
        //         //         "PrpCode": "MRP",
        //         //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD.",
        //         //         "ToDaysCollection": "161344.00",
        //         //         "CrInBankAccCollection": ".00"
        //         //     },
        //         //     {
        //         //         "PrpCode": "AA",
        //         //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD1.",
        //         //         "ToDaysCollection": "161344.00",
        //         //         "CrInBankAccCollection": ".00"
        //         //     },
        //         //     {
        //         //         "PrpCode": "VV",
        //         //         "PrpName": "SHRI MADHUSUDAN RAYONS PVT. LTD2.",
        //         //         "ToDaysCollection": "161344.00",
        //         //         "CrInBankAccCollection": ".00"
        //         //     },
        //         //     {
        //         //         "PrpCode": "Total",
        //         //         "PrpName": "Total",
        //         //         "ToDaysCollection": 1610816,
        //         //         "CrInBankAccCollection": 200000
        //         //     }
        //         // ]

        //         if (response.data.data.data.length > 0) {
        //             // const tableData = Object.values(response.data.data.data).map((item: any) => ({
        //             const tableData = Object.values(response.data.data.data).map((item: any) => ({
        //                 PrpCode: item.PrpCode,
        //                 PrpName: item.PrpName,
        //                 CrInBankAccCollection: item.CrInBankAccCollection,
        //                 ToDaysCollection: item.ToDaysCollection,
        //             }));
        //             setPOTData(tableData as any); // Set data for the table
        //             setSummaryData(response.data.data.rptsettings);
        //             closeDrawer();
        //         } else {
        //             setPOTData([]);
        //         }
        //         // Extract and format data for DetailTable

        //     }
        // } catch (error) {
        //     if (!axios.isCancel(error)) {
        //         setIsLoading(false);
        //         Alert.alert('Error', 'Server error');
        //         setPOTData([]);
        //     }
        // } finally {
        //     setIsLoading(false);
        // }
    };
    // 

    console.log('🔵 getSummaryData', getSummaryData);

    const handleDelete = async (item: any) => {
        if (!item) return;
        // confirm already done in CollectionCard; still double-check if needed
        const uid = String(item.UId ?? item.uid ?? item.UId ?? '');
        if (!uid) {
            Alert.alert('Delete', 'Item has no uid, cannot delete.');
            return;
        }

        // prepare payload: prpcode (from item or form), EDate (as DD-MM-YYYY), uid, action delete, txntype, module
        const prpcode = item.PrpCode ?? form.PrpCode ?? 'SIP';
        const rawEDate = item.EDate ?? item.nEDate ?? item.nEDate ?? item.EDate ?? '';
        const EDate = isoToDDMMYYYY(rawEDate) || isoToDDMMYYYY(form.EDate) || '';

        const payload = {
            prpcode: prpcode,
            EDate: EDate,
            uid: uid,
            action: 'delete',
            txntype: 'mob_collection',
            module: 'Collect',
        };

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        setDeletingId(uid);
        try {
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('🔴 delete payload', payload);
            // const resp = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, payload, { headers, cancelToken: cancelToken.token });
            const resp = await axios.post(`${API}/api/collection_crud`, payload, { headers, cancelToken: cancelToken.token });
            console.log('🔴 delete response', resp);

            if (resp?.data?.success) {
                Alert.alert('Deleted', 'Record deleted successfully.');
                // refresh list using existing payload state (calls fetchBrowseData)
                try {
                    // use previously saved getpayload (set by fetchBrowseData) if available, else run default load
                    const reloadPayload = (getpayload && Object.keys(getpayload).length > 0) ? getpayload : {
                        fromDate: fromDate.toISOString().split('T')[0],
                        toDate: toDate.toISOString().split('T')[0],
                        yearno: selectedYear.split('-')[1].substring(2),
                        prpcode: form.PrpCode,
                        action: 'browse',
                        txntype: "mob_collection",
                    };
                    fetchBrowseData(reloadPayload);
                } catch (err) {
                    console.warn('reload after delete failed', err);
                }
            } else {
                Alert.alert('Delete failed', String(resp?.data?.message ?? 'Server error'));
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error('delete error', err);
                Alert.alert('Error', 'Delete failed — server error.');
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleAuthorizeFromList = async (item: any, aremark?: string) => {
        // build payload per your spec
        try {
            // show a loader (you can reuse setIsLoading or create a small local)
            setIsLoading(true);

            const payload = {
                txntype: 'mob_collection',
                action: 'auth',
                EDate: isoToDDMMYYYY(item.EDate ?? item.nEDate ?? item.LastDate ?? form.EDate ?? ''),
                UId: Number(item.UId ?? item.uid ?? 0),
                PrpCode: item.PrpCode ?? item.prpcode ?? form.PrpCode ?? 'SIP',
                IsAuth: '1',
                ARemark: aremark ?? ''
            };

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('Authorise payload', payload);
            // const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', payload, { headers });
            const res = await axios.post(`${API}/api/collection_crud`, payload, { headers });

            if (res?.data?.success) {
                Alert.alert('Success', 'Collection authorised successfully.');
                // re-run browse with existing last payload if present
                // getpayload state holds the last browse payload in this component
                try {
                    // if you have getpayload set earlier as params, pass again
                    await fetchBrowseData(getpayload && Object.keys(getpayload).length ? getpayload : {
                        fromDate: new Date().toISOString().split('T')[0],
                        toDate: new Date().toISOString().split('T')[0],
                        yearno: selectedYear.split('-')[1].substring(2),
                        prpcode: form.PrpCode,
                        action: 'browse',
                        txntype: 'mob_collection',
                    });
                } catch (e) {
                    console.warn('fetchBrowseData after auth failed', e);
                }
            } else {
                const msg = res?.data?.message ?? 'Failed to authorise';
                Alert.alert('Error', msg);
            }
        } catch (err) {
            console.error('authorise api error', err);
            Alert.alert('Error', 'Server error when authorising.');
        } finally {
            setIsLoading(false);
        }
    };



    useEffect(() => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        const payload = {
            // fromDate:   ,
            // current data
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: '',
            action: 'browse',
            txntype: "mob_collection",
        }
        fetchBrowseData(payload);
    }, []);


    const handleAdd = async () => {
        // if (onEdit) { onEdit(item); return; }
        try {
            // await AsyncStorage.setItem('collection_edit', JSON.stringify(item));
            await AsyncStorage.setItem('collection_mode', 'add');
            // navigate if desired
            // @ts-ignore
            navigation.navigate('CollectionAdd' as never);
        } catch (e) { console.error(e); Alert.alert('Error', 'Could not open editor.'); }
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    interface DetailTableProps {
        data: Array<{
            PrpCode: string;
            PrpName: string;
            CrInBankAccCollection: string;
            ToDaysCollection: string;
        }>;
        searchQuery: string;
    }

    const DetailCardsView = ({ data, searchQuery }) => {
        // Filter data based on search query
        const filteredData = data.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );

        // Extract unique PrpNames for grouping
        const prpNames = [...new Set(filteredData.map((item) => item.PrpName))];

        // Calculate totals for numeric columns
        const numericColumns = ["ToDaysCollection", "CrInBankAccCollection"];
        const totals = numericColumns.reduce((acc, col) => {
            acc[col] = filteredData.reduce(
                (sum, item) => sum + parseFloat(item[col] || 0),
                0
            );
            return acc;
        }, {});

        // Format number as Indian currency
        const formatIndianNumber = (value) => {
            return parseFloat(value).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };

        // Unique colors for each card
        const CARD_COLORS = [
            ["#FF6B6B", "#FF8E8E"], // Red
            ["#4ECDC4", "#6ED5D0"], // Teal
            ["#45B7D1", "#5DCAE5"], // Blue
            ["#FFBE0B", "#FFD166"], // Yellow
            ["#A55EEA", "#B779FF"], // Purple
            ["#FD9644", "#FEBE88"], // Orange
            ["#8338EC", "#A855F7"], // Violet
            ["#3A86FF", "#5C9FFF"], // Sky Blue
            ["#FF6348", "#FF8A76"], // Coral
            ["#20BF6B", "#45E989"], // Green
        ];

        // Render card for each group
        const renderCard = (name, index) => {
            const groupData = filteredData.filter((item) => item.PrpName === name);
            const colors = CARD_COLORS[index % CARD_COLORS.length];

            return (
                <View key={name} style={{ marginBottom: 15 }}>
                    <LinearGradient
                        colors={colors}
                        style={{
                            borderRadius: 10,
                            padding: 15,
                            elevation: 3,
                            shadowColor: "#000",
                            shadowOpacity: 0.1,
                            shadowRadius: 5,
                            shadowOffset: { width: 0, height: 2 },
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14, marginBottom: 10 }}>
                            {name} ({groupData.length})
                        </Text>
                        {groupData.map((item, idx) => (
                            <View
                                key={idx}
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    marginBottom: 8,
                                    padding: 8,
                                    backgroundColor: "rgba(255,255,255,0.1)",
                                    borderRadius: 5,
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 11 }}>{item.ParName}</Text>
                                <Text style={{ color: "#fff", fontSize: 11 }}>₹{formatIndianNumber(item.ToDaysCollection)}</Text>
                            </View>
                        ))}
                    </LinearGradient>
                </View>
            );
        };

        return (
            <View style={{ flex: 1 }}>
                {/* Search and Cards */}
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 80 }}
                    showsVerticalScrollIndicator={true}
                >
                    {prpNames.map((name, index) => renderCard(name, index))}
                </ScrollView>

                {/* Fixed Footer */}
                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: theme.BRAND_GRADIENT_END,
                        padding: 15,
                        borderTopLeftRadius: 10,
                        borderTopRightRadius: 10,
                        elevation: 5,
                    }}
                >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                            Total Today's Collection:
                        </Text>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                            ₹{formatIndianNumber(totals.ToDaysCollection)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                            Total Credit in Bank:
                        </Text>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                            ₹{formatIndianNumber(totals.CrInBankAccCollection)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // const AllKeysCardsView = ({ data, searchQuery, getDetailsDataSetting }) => {
    //     // Default settings if not provided
    //     const settings = getDetailsDataSetting[0] || {};
    //     const columns = settings.rptcols?.split(',') || [];
    //     const labels = settings.rptcolslabels?.split(',') || [];
    //     const widths = settings.rptcolswidth?.split(',').map(Number) || [];
    //     const sumFields = settings.rptsumfields?.split(',').map(Number) || [];
    //     const filterDataTypes = settings.rptfilterdatatype?.split(',') || [];
    //     const groupCol = settings.rptgroupcol || "";
    //     const colSkip = settings.rptcolsskip || "";

    //     // Process skipped columns
    //     const skippedColumns = new Set();
    //     if (colSkip) {
    //         colSkip.split(',').forEach(skipPair => {
    //             const [key] = skipPair.split('#');
    //             if (key) skippedColumns.add(key);
    //         });
    //     }

    //     // Filter data based on search query
    //     const filteredData = data.filter((item) =>
    //         Object.values(item).some((val) =>
    //             String(val).toLowerCase().includes(searchQuery.toLowerCase())
    //         )
    //     );

    //     // Check if we should group data
    //     const shouldGroup = groupCol && groupCol.trim() !== "" && filteredData.some(item => item[groupCol]);

    //     // Group data if we have a valid group column
    //     const groupedData = shouldGroup
    //         ? filteredData.reduce((acc, item) => {
    //             const groupKey = item[groupCol];
    //             if (!acc[groupKey]) acc[groupKey] = [];
    //             acc[groupKey].push(item);
    //             return acc;
    //         }, {})
    //         : { "All Items": filteredData };

    //     // Get visible columns with correct logic
    //     const visibleColumns = columns.filter(col => {
    //         const colIndex = columns.indexOf(col);
    //         return !skippedColumns.has(col) &&
    //             !(shouldGroup && col === groupCol) &&
    //             widths[colIndex] > 0;
    //     });

    //     // Create label map
    //     const labelMap = {};
    //     columns.forEach((col, i) => {
    //         labelMap[col] = labels[i] || col;
    //     });

    //     // Calculate totals
    //     const calculateTotals = () => {
    //         const totals = {};
    //         columns.forEach((col, index) => {
    //             if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
    //                 totals[col] = filteredData.reduce(
    //                     (sum, item) => sum + parseFloat(item[col] || 0),
    //                     0
    //                 );
    //             }
    //         });
    //         return totals;
    //     };

    //     const totals = calculateTotals();

    //     // Professional color palette
    //     const CARD_COLORS = [
    //         ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
    //         ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
    //         ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
    //         ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"]
    //     ];

    //     // State for expanded/collapsed groups
    //     const [expandedGroups, setExpandedGroups] = useState({});

    //     const toggleGroup = (groupKey) => {
    //         setExpandedGroups(prev => ({
    //             ...prev,
    //             [groupKey]: !prev[groupKey]
    //         }));
    //     };

    //     // Format value
    //     const formatValue = (value, colName) => {
    //         if (value === undefined || value === null) return '-';
    //         const colIndex = columns.indexOf(colName);
    //         const isNumeric = filterDataTypes[colIndex] === 'N';
    //         if (isNumeric && !isNaN(parseFloat(value))) {
    //             return `₹ ${parseFloat(value).toLocaleString('en-IN', {
    //                 minimumFractionDigits: 2,
    //                 maximumFractionDigits: 2
    //             })}`;
    //         }
    //         return String(value);
    //     };

    //     // Responsive grid configuration
    //     const { width: screenWidth } = useWindowDimensions();
    //     const getGridConfig = () => {
    //         if (screenWidth <= 400) {
    //             return { numColumns: 1, cardWidth: screenWidth - 32, margin: 12, gutter: 12 };
    //         } else if (screenWidth <= 600) {
    //             return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
    //         } else if (screenWidth <= 900) {
    //             return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
    //         } else {
    //             return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
    //         }
    //     };
    //     const gridConfig = getGridConfig();

    //     // Render group header
    //     const renderGroupHeader = (groupKey, index, itemCount) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];
    //         const isExpanded = expandedGroups[groupKey] !== false;
    //         return (
    //             <TouchableOpacity
    //                 onPress={() => toggleGroup(groupKey)}
    //                 style={{
    //                     marginBottom: 8,
    //                     marginHorizontal: gridConfig.margin,
    //                     borderRadius: 10,
    //                     overflow: 'hidden',
    //                     elevation: 2,
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 0 }}
    //                     style={{
    //                         padding: 12,
    //                         flexDirection: 'row',
    //                         justifyContent: 'space-between',
    //                         alignItems: 'center'
    //                     }}
    //                 >
    //                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    //                         {shouldGroup && (
    //                             <Icon
    //                                 name={isExpanded ? "expand-less" : "expand-more"}
    //                                 size={20}
    //                                 color="#fff"
    //                                 style={{ marginRight: 8 }}
    //                             />
    //                         )}
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontWeight: "600",
    //                             fontSize: screenWidth <= 400 ? 13 : 14,
    //                         }}>
    //                             {groupKey}
    //                         </Text>
    //                     </View>
    //                     <View style={{
    //                         backgroundColor: 'rgba(255,255,255,0.2)',
    //                         paddingHorizontal: 8,
    //                         paddingVertical: 4,
    //                         borderRadius: 12
    //                     }}>
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: 11,
    //                             fontWeight: "500",
    //                         }}>
    //                             {itemCount}
    //                         </Text>
    //                     </View>
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     };

    //     // Render card for each item
    //     const renderCard = (item, index, groupKey) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];
    //         return (
    //             <View
    //                 key={`${groupKey}-${index}`}
    //                 style={{
    //                     width: gridConfig.cardWidth,
    //                     borderRadius: 8,
    //                     marginRight: gridConfig.gutter,
    //                     overflow: "hidden",
    //                     elevation: 3,
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 1 }}
    //                     style={{ padding: 12 }}
    //                 >
    //                     <View style={{ alignItems: 'flex-end' }}>
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: 14,
    //                             fontWeight: "bold",
    //                             textAlign: 'right',
    //                             marginBottom: 8,
    //                         }}>
    //                             {item.ParName || item.PrpName}
    //                         </Text>
    //                     </View>
    //                     {visibleColumns.map((col) => {
    //                         const colIndex = columns.indexOf(col);
    //                         const isNumeric = filterDataTypes[colIndex] === 'N';
    //                         return (
    //                             <View
    //                                 key={col}
    //                                 style={{
    //                                     marginBottom: 4,
    //                                     alignItems: 'flex-end',
    //                                     width: '100%',
    //                                 }}
    //                             >
    //                                 <Text style={{
    //                                     color: "rgba(255, 255, 255, 0.7)",
    //                                     fontSize: 10,
    //                                     fontWeight: "500",
    //                                     textAlign: 'right',
    //                                 }}>
    //                                     {labelMap[col]}
    //                                 </Text>
    //                                 <Text style={{
    //                                     color: "#fff",
    //                                     fontSize: 12,
    //                                     fontWeight: isNumeric ? "700" : "500",
    //                                     textAlign: 'right',
    //                                 }}>
    //                                     {item[col] !== undefined && item[col] !== null
    //                                         ? (isNumeric ? formatValue(item[col], col) : String(item[col]))
    //                                         : '-'}
    //                                 </Text>
    //                             </View>
    //                         );
    //                     })}
    //                 </LinearGradient>
    //             </View>
    //         );
    //     };

    //     // Footer with calculated totals
    //     const Footer = () => {
    //         if (Object.keys(totals).length === 0) return null;
    //         return (
    //             <View style={{
    //                 position: "absolute",
    //                 bottom: 0,
    //                 left: 0,
    //                 right: 0,
    //                 backgroundColor: theme.BRAND_GRADIENT_END,
    //                 padding: 12,
    //                 borderTopLeftRadius: 12,
    //                 borderTopRightRadius: 12,
    //                 elevation: 8,
    //             }}>
    //                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    //                     {Object.entries(totals).map(([col, value]) => (
    //                         <View key={col} style={{ marginLeft: 12, marginBottom: 4 }}>
    //                             <Text style={{
    //                                 color: "#fff",
    //                                 fontSize: 11,
    //                                 fontWeight: "500",
    //                             }}>
    //                                 {labelMap[col]}: {formatValue(value, col)}
    //                             </Text>
    //                         </View>
    //                     ))}
    //                 </View>
    //             </View>
    //         );
    //     };

    //     // Render items in horizontal carousel format
    //     const renderItemsInCarousel = (items, groupKey) => {
    //         return (
    //             <ScrollView
    //                 horizontal={true}
    //                 showsHorizontalScrollIndicator={false}
    //                 contentContainerStyle={{
    //                     paddingHorizontal: gridConfig.margin,
    //                     paddingBottom: 16,
    //                 }}
    //             >
    //                 {items.map((item, index) => renderCard(item, index, groupKey))}
    //             </ScrollView>
    //         );
    //     };

    //     return (
    //         <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    //             <ScrollView
    //                 contentContainerStyle={{
    //                     paddingBottom: 80
    //                 }}
    //                 showsVerticalScrollIndicator={false}
    //             >
    //                 {Object.keys(groupedData).length > 0 ? (
    //                     Object.entries(groupedData).map(([groupKey, items], index) => {
    //                         const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;
    //                         return (
    //                             <View key={groupKey} style={{ marginBottom: 16 }}>
    //                                 {renderGroupHeader(groupKey, index, items.length)}
    //                                 {(shouldGroup ? isExpanded : true) && (
    //                                     <View style={{ marginTop: 8 }}>
    //                                         {renderItemsInCarousel(items, groupKey)}
    //                                     </View>
    //                                 )}
    //                             </View>
    //                         );
    //                     })
    //                 ) : (
    //                     <View style={{
    //                         flex: 1,
    //                         justifyContent: "center",
    //                         alignItems: "center",
    //                         padding: 40,
    //                         marginTop: 60
    //                     }}>
    //                         <Icon name="search-off" size={48} color="#ccc" />
    //                         <Text style={{
    //                             color: "#666",
    //                             fontSize: 16,
    //                             marginTop: 12,
    //                             textAlign: 'center'
    //                         }}>
    //                             No records found
    //                         </Text>
    //                     </View>
    //                 )}
    //             </ScrollView>
    //             <Footer />
    //         </View>
    //     );
    // };

    // const AllKeysCardsView = ({ data, searchQuery, getDetailsDataSetting }) => {
    //     // Lazy loading configuration
    //     const LAZY_LOAD_CONFIG = {
    //         INITIAL_BATCH: 6,
    //         SUBSEQUENT_BATCH: 6,
    //         THRESHOLD: 0.7
    //     };

    //     // Default settings
    //     const settings = getDetailsDataSetting[0] || {};
    //     const columns = settings.rptcols?.split(',') || [];
    //     const widths = settings.rptcolswidth?.split(',').map(Number) || [];
    //     const labels = settings.rptcolslabels?.split(',') || [];
    //     const sumFields = settings.rptsumfields?.split(',').map(Number) || [];
    //     const filterDataTypes = settings.rptfilterdatatype?.split(',') || [];
    //     const groupCol = settings.rptgroupcol || "";
    //     const colSkip = settings.rptcolsskip || "";

    //     // Process skipped columns
    //     const skippedColumns = useMemo(() => {
    //         const skipped = new Set();
    //         if (colSkip) {
    //             colSkip.split(',').forEach(skipPair => {
    //                 const [key] = skipPair.split('#');
    //                 if (key) skipped.add(key);
    //             });
    //         }
    //         return skipped;
    //     }, [colSkip]);

    //     // Filter data based on search query
    //     const filteredData = useMemo(() => {
    //         if (!searchQuery || searchQuery.trim() === '') return data;
    //         const query = searchQuery.toLowerCase().trim();
    //         return data.filter((item) =>
    //             Object.values(item).some((val) =>
    //                 String(val).toLowerCase().includes(query)
    //             )
    //         );
    //     }, [data, searchQuery]);

    //     // Check if we should group data
    //     const shouldGroup = useMemo(() => {
    //         return groupCol && groupCol.trim() !== "" && filteredData.some(item => item[groupCol]);
    //     }, [groupCol, filteredData]);

    //     // Group data
    //     const groupedData = useMemo(() => {
    //         if (!shouldGroup) {
    //             return { "All Items": filteredData };
    //         }
    //         return filteredData.reduce((acc, item) => {
    //             const groupKey = item[groupCol] || 'Ungrouped';
    //             if (!acc[groupKey]) acc[groupKey] = [];
    //             acc[groupKey].push(item);
    //             return acc;
    //         }, {});
    //     }, [filteredData, groupCol, shouldGroup]);

    //     // Get visible columns
    //     const visibleColumns = useMemo(() => {
    //         return columns.filter(col => {
    //             const colIndex = columns.indexOf(col);
    //             return !skippedColumns.has(col) &&
    //                 !(shouldGroup && col === groupCol) &&
    //                 widths[colIndex] > 0;
    //         });
    //     }, [columns, skippedColumns, shouldGroup, groupCol, widths]);

    //     // Create label map
    //     const labelMap = useMemo(() => {
    //         const map = {};
    //         columns.forEach((col, i) => {
    //             map[col] = labels[i] || col;
    //         });
    //         return map;
    //     }, [columns, labels]);

    //     // Calculate totals
    //     const totals = useMemo(() => {
    //         const calculated = {};
    //         columns.forEach((col, index) => {
    //             if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
    //                 calculated[col] = filteredData.reduce(
    //                     (sum, item) => sum + (parseFloat(item[col]) || 0),
    //                     0
    //                 );
    //             }
    //         });
    //         return calculated;
    //     }, [filteredData, columns, sumFields, filterDataTypes]);

    //     // Color palette
    //     const CARD_COLORS = useMemo(() => [
    //         ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
    //         ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
    //         ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
    //         ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
    //     ], []);

    //     // States
    //     const [expandedGroups, setExpandedGroups] = useState({});
    //     const [loadedItems, setLoadedItems] = useState({});
    //     const [isLoadingMore, setIsLoadingMore] = useState({});

    //     // ========== MODAL STATES ==========
    //     const [modalVisible, setModalVisible] = useState(false);
    //     const [selectedCard, setSelectedCard] = useState(null);
    //     const [selectedCardColors, setSelectedCardColors] = useState(null);

    //     // Screen width for responsive design
    //     const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    //     // ✅ PERFECT RESPONSIVE GRID CONFIG
    //     const getGridConfig = useCallback(() => {
    //         const padding = 12; // कंटेनर padding

    //         // FIXED CARD WIDTH for all screens
    //         const MOBILE_CARD_WIDTH = screenWidth - (padding * 2);
    //         const TABLET_CARD_WIDTH = (screenWidth - (padding * 2) - 12) / 2; // 12px gap
    //         const DESKTOP_CARD_WIDTH = (screenWidth - (padding * 2) - 24) / 3; // 12px gap between 3 cards

    //         if (screenWidth < 600) {
    //             // Mobile: 1 card
    //             return {
    //                 numColumns: 1,
    //                 cardWidth: MOBILE_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 0,
    //                 labelWidth: '40%',
    //                 valueWidth: '55%',
    //             };
    //         } else if (screenWidth >= 600 && screenWidth < 900) {
    //             // Tablet: 2 cards
    //             return {
    //                 numColumns: 2,
    //                 cardWidth: TABLET_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 12,
    //                 labelWidth: '45%',
    //                 valueWidth: '50%',
    //             };
    //         } else {
    //             // Desktop: 3 cards
    //             return {
    //                 numColumns: 3,
    //                 cardWidth: DESKTOP_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 12,
    //                 labelWidth: '48%',
    //                 valueWidth: '47%',
    //             };
    //         }
    //     }, [screenWidth]);

    //     const gridConfig = getGridConfig();

    //     // Initialize lazy loading
    //     useEffect(() => {
    //         setLoadedItems({});
    //         setIsLoadingMore({});
    //         Object.keys(groupedData).forEach(groupKey => {
    //             const itemCount = groupedData[groupKey].length;
    //             setLoadedItems(prev => ({
    //                 ...prev,
    //                 [groupKey]: Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, itemCount)
    //             }));
    //         });
    //     }, [filteredData, searchQuery]);

    //     const toggleGroup = useCallback((groupKey) => {
    //         setExpandedGroups(prev => ({
    //             ...prev,
    //             [groupKey]: !prev[groupKey]
    //         }));
    //     }, []);

    //     // Auto load more when scrolling
    //     const handleScroll = useCallback((event, groupKey) => {
    //         const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    //         const isEndReached = layoutMeasurement.height + contentOffset.y >=
    //             contentSize.height * LAZY_LOAD_CONFIG.THRESHOLD;

    //         if (isEndReached) {
    //             const totalCount = groupedData[groupKey]?.length || 0;
    //             const currentLoaded = loadedItems[groupKey] || 0;

    //             if (currentLoaded < totalCount && !isLoadingMore[groupKey]) {
    //                 setIsLoadingMore(prev => ({ ...prev, [groupKey]: true }));

    //                 setTimeout(() => {
    //                     setLoadedItems(prev => ({
    //                         ...prev,
    //                         [groupKey]: Math.min(
    //                             currentLoaded + LAZY_LOAD_CONFIG.SUBSEQUENT_BATCH,
    //                             totalCount
    //                         )
    //                     }));
    //                     setIsLoadingMore(prev => ({ ...prev, [groupKey]: false }));
    //                 }, 100);
    //             }
    //         }
    //     }, [groupedData, loadedItems, isLoadingMore]);

    //     // Format value
    //     const formatValue = useCallback((value, colName) => {
    //         if (value === undefined || value === null) return '-';
    //         const colIndex = columns.indexOf(colName);
    //         const isNumeric = filterDataTypes[colIndex] === 'N';
    //         if (isNumeric && !isNaN(parseFloat(value))) {
    //             return `₹ ${parseFloat(value).toLocaleString('en-IN', {
    //                 minimumFractionDigits: 2,
    //                 maximumFractionDigits: 2
    //             })}`;
    //         }
    //         return String(value);
    //     }, [columns, filterDataTypes]);

    //     // ========== HANDLE CARD LONG PRESS ==========
    //     const handleCardLongPress = useCallback((item, colors) => {
    //         setSelectedCard(item);
    //         setSelectedCardColors(colors);
    //         setModalVisible(true);
    //     }, []);

    //     // ========== MODAL COMPONENT ==========
    //     const CardDetailModal = useCallback(() => {
    //         if (!selectedCard || !selectedCardColors) return null;

    //         return (
    //             <Modal
    //                 animationType="slide"
    //                 transparent={false}
    //                 visible={modalVisible}
    //                 onRequestClose={() => setModalVisible(false)}
    //             >
    //                 <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    //                     {/* Header with close button */}
    //                     <LinearGradient
    //                         colors={selectedCardColors}
    //                         start={{ x: 0, y: 0 }}
    //                         end={{ x: 1, y: 0 }}
    //                         style={{
    //                             flexDirection: 'row',
    //                             justifyContent: 'space-between',
    //                             alignItems: 'center',
    //                             paddingTop: screenHeight > 800 ? 50 : 40,
    //                             paddingBottom: 20,
    //                             paddingHorizontal: 20,
    //                             borderBottomLeftRadius: 20,
    //                             borderBottomRightRadius: 20,
    //                             elevation: 5,
    //                         }}
    //                     >
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: screenWidth <= 400 ? 18 : 20,
    //                             fontWeight: "bold",
    //                             flex: 1,
    //                         }}>
    //                             {selectedCard.ParName || selectedCard.PrpName || 'Details'}
    //                         </Text>
    //                         <TouchableOpacity
    //                             onPress={() => setModalVisible(false)}
    //                             style={{
    //                                 backgroundColor: 'rgba(255,255,255,0.3)',
    //                                 borderRadius: 20,
    //                                 padding: 8,
    //                             }}
    //                         >
    //                             <Icon name="close" size={24} color="#fff" />
    //                         </TouchableOpacity>
    //                     </LinearGradient>

    //                     {/* Modal Content - ALL VALUES */}
    //                     <ScrollView
    //                         style={{ flex: 1 }}
    //                         contentContainerStyle={{
    //                             padding: 20,
    //                             paddingBottom: 40,
    //                         }}
    //                         showsVerticalScrollIndicator={true}
    //                     >
    //                         {/* All fields in big format */}
    //                         {visibleColumns.map((col, idx) => {
    //                             const colIndex = columns.indexOf(col);
    //                             const isNumeric = filterDataTypes[colIndex] === 'N';
    //                             const value = selectedCard[col];
    //                             const label = labelMap[col] || col;

    //                             const displayValue = value !== undefined && value !== null
    //                                 ? (isNumeric ? formatValue(value, col) : String(value))
    //                                 : '-';

    //                             return (
    //                                 <View
    //                                     key={col}
    //                                     style={{
    //                                         backgroundColor: '#fff',
    //                                         borderRadius: 12,
    //                                         padding: 16,
    //                                         marginBottom: 12,
    //                                         elevation: 2,
    //                                         shadowColor: "#000",
    //                                         shadowOffset: { width: 0, height: 1 },
    //                                         shadowOpacity: 0.1,
    //                                         shadowRadius: 2,
    //                                     }}
    //                                 >
    //                                     <Text style={{
    //                                         color: '#666',
    //                                         fontSize: screenWidth <= 400 ? 13 : 14,
    //                                         fontWeight: '500',
    //                                         marginBottom: 6,
    //                                     }}>
    //                                         {label}
    //                                     </Text>
    //                                     <Text style={{
    //                                         color: '#333',
    //                                         fontSize: screenWidth <= 400 ? 16 : 18,
    //                                         fontWeight: isNumeric ? '700' : '500',
    //                                     }}>
    //                                         {displayValue}
    //                                     </Text>
    //                                 </View>
    //                             );
    //                         })}

    //                         {/* Extra info if available */}
    //                         {selectedCard.ParName && (
    //                             <View style={{
    //                                 backgroundColor: '#fff',
    //                                 borderRadius: 12,
    //                                 padding: 16,
    //                                 marginBottom: 12,
    //                                 elevation: 2,
    //                             }}>
    //                                 <Text style={{
    //                                     color: '#666',
    //                                     fontSize: screenWidth <= 400 ? 13 : 14,
    //                                     fontWeight: '500',
    //                                     marginBottom: 6,
    //                                 }}>
    //                                     Party Name
    //                                 </Text>
    //                                 <Text style={{
    //                                     color: '#333',
    //                                     fontSize: screenWidth <= 400 ? 16 : 18,
    //                                     fontWeight: '500',
    //                                 }}>
    //                                     {selectedCard.ParName}
    //                                 </Text>
    //                             </View>
    //                         )}
    //                     </ScrollView>
    //                 </View>
    //             </Modal>
    //         );
    //     }, [selectedCard, selectedCardColors, modalVisible, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, screenHeight]);

    //     // Render group header
    //     const renderGroupHeader = useCallback((groupKey, index, itemCount) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];
    //         const isExpanded = expandedGroups[groupKey] !== false;

    //         return (
    //             <TouchableOpacity
    //                 key={`header-${groupKey}`}
    //                 onPress={() => toggleGroup(groupKey)}
    //                 activeOpacity={0.7}
    //                 style={{
    //                     marginBottom: 8,
    //                     marginHorizontal: gridConfig.containerPadding,
    //                     borderRadius: 10,
    //                     overflow: 'hidden',
    //                     elevation: 2,
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 0 }}
    //                     style={{
    //                         padding: 12,
    //                         flexDirection: 'row',
    //                         justifyContent: 'space-between',
    //                         alignItems: 'center'
    //                     }}
    //                 >
    //                     <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
    //                         {shouldGroup && (
    //                             <Icon
    //                                 name={isExpanded ? "expand-less" : "expand-more"}
    //                                 size={20}
    //                                 color="#fff"
    //                                 style={{ marginRight: 8 }}
    //                             />
    //                         )}
    //                         <Text
    //                             numberOfLines={1}
    //                             style={{
    //                                 color: "#fff",
    //                                 fontWeight: "600",
    //                                 fontSize: screenWidth <= 400 ? 13 : 14,
    //                                 flex: 1,
    //                             }}
    //                         >
    //                             {groupKey}
    //                         </Text>
    //                     </View>
    //                     <View style={{
    //                         backgroundColor: 'rgba(255,255,255,0.2)',
    //                         paddingHorizontal: 8,
    //                         paddingVertical: 4,
    //                         borderRadius: 12,
    //                         marginLeft: 8
    //                     }}>
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: 11,
    //                             fontWeight: "500",
    //                         }}>
    //                             {itemCount}
    //                         </Text>
    //                     </View>
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     }, [CARD_COLORS, expandedGroups, shouldGroup, toggleGroup, gridConfig.containerPadding, screenWidth]);

    //     // ========== FIXED CARD HEIGHT ==========
    //     const CARD_HEIGHT = 260;

    //     // Render card with LONG PRESS support
    //     const renderCard = useCallback((item, index, groupKey) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];

    //         return (
    //             <TouchableOpacity
    //                 activeOpacity={0.9}
    //                 onLongPress={() => handleCardLongPress(item, colors)}
    //                 delayLongPress={500} // 500ms hold to open modal
    //                 style={{
    //                     width: gridConfig.cardWidth,
    //                     height: CARD_HEIGHT,
    //                     borderRadius: 8,
    //                     overflow: "hidden",
    //                     elevation: 3,
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 1 }}
    //                     style={{ flex: 1, padding: 12 }}
    //                 >
    //                     {/* Title with divider */}
    //                     <View style={{
    //                         flexDirection: 'row',
    //                         justifyContent: 'space-between',
    //                         alignItems: 'center',
    //                         paddingBottom: 8,
    //                         borderBottomWidth: 1,
    //                         borderBottomColor: 'rgba(255,255,255,0.3)',
    //                         marginBottom: 8,
    //                     }}>
    //                         <Text
    //                             numberOfLines={1}
    //                             style={{
    //                                 color: "#fff",
    //                                 fontSize: screenWidth <= 400 ? 13 : 14,
    //                                 fontWeight: "bold",
    //                                 opacity: 0.9,
    //                                 flex: 1,
    //                             }}
    //                         >
    //                             {item.ParName || item.PrpName || 'Item'}
    //                         </Text>
    //                         <Icon name="info-outline" size={16} color="rgba(255,255,255,0.8)" />
    //                     </View>

    //                     {/* Scrollable content area */}
    //                     <ScrollView
    //                         showsVerticalScrollIndicator={true}
    //                         persistentScrollbar={true}
    //                         contentContainerStyle={{ paddingBottom: 8 }}
    //                         style={{ flex: 1 }}
    //                     >
    //                         {visibleColumns.map((col) => {
    //                             const colIndex = columns.indexOf(col);
    //                             const isNumeric = filterDataTypes[colIndex] === 'N';
    //                             const value = item[col];
    //                             const label = labelMap[col] || col;

    //                             const displayValue = value !== undefined && value !== null
    //                                 ? (isNumeric ? formatValue(value, col) : String(value))
    //                                 : '-';

    //                             return (
    //                                 <View
    //                                     key={col}
    //                                     style={{
    //                                         flexDirection: 'row',
    //                                         justifyContent: 'space-between',
    //                                         alignItems: 'flex-start',
    //                                         marginBottom: 12,
    //                                         paddingVertical: 4,
    //                                         borderBottomWidth: 0.5,
    //                                         borderBottomColor: 'rgba(255,255,255,0.15)',
    //                                     }}
    //                                 >
    //                                     <Text
    //                                         style={{
    //                                             color: "rgba(255, 255, 255, 0.7)",
    //                                             fontSize: screenWidth <= 400 ? 10 : 11,
    //                                             fontWeight: "500",
    //                                             width: gridConfig.labelWidth,
    //                                             marginRight: 8,
    //                                             flexWrap: 'wrap',
    //                                         }}
    //                                     >
    //                                         {label}
    //                                     </Text>

    //                                     <Text
    //                                         style={{
    //                                             color: "#fff",
    //                                             fontSize: screenWidth <= 400 ? 11 : 12,
    //                                             fontWeight: isNumeric ? "700" : "600",
    //                                             textAlign: 'right',
    //                                             width: gridConfig.valueWidth,
    //                                             flexWrap: 'wrap',
    //                                         }}
    //                                     >
    //                                         {displayValue}
    //                                     </Text>
    //                                 </View>
    //                             );
    //                         })}

    //                         <View style={{ height: 10 }} />
    //                     </ScrollView>
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     }, [CARD_COLORS, gridConfig, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, handleCardLongPress]);

    //     // Render group content
    //     const renderGroupContent = useCallback((items, groupKey) => {
    //         const loadedCount = loadedItems[groupKey] || Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, items.length);
    //         const displayedItems = items.slice(0, loadedCount);
    //         const hasMore = loadedCount < items.length;

    //         const rows = [];

    //         for (let i = 0; i < displayedItems.length; i += gridConfig.numColumns) {
    //             const rowItems = displayedItems.slice(i, i + gridConfig.numColumns);
    //             const isLastRow = i + gridConfig.numColumns >= displayedItems.length;

    //             rows.push(
    //                 <View
    //                     key={`${groupKey}-row-${i}`}
    //                     style={{
    //                         flexDirection: 'row',
    //                         justifyContent: 'flex-start',
    //                         marginHorizontal: gridConfig.containerPadding,
    //                         marginBottom: isLastRow ? 0 : 16,
    //                     }}
    //                 >
    //                     {rowItems.map((item, index) => {
    //                         const actualIndex = i + index;
    //                         return (
    //                             <View
    //                                 key={`${groupKey}-${actualIndex}`}
    //                                 style={{
    //                                     width: gridConfig.cardWidth,
    //                                     marginRight: index < rowItems.length - 1 ? gridConfig.gap : 0,
    //                                 }}
    //                             >
    //                                 {renderCard(item, actualIndex, groupKey)}
    //                             </View>
    //                         );
    //                     })}
    //                 </View>
    //             );
    //         }

    //         // Loading indicator
    //         if (hasMore && isLoadingMore[groupKey]) {
    //             rows.push(
    //                 <View key={`${groupKey}-loading`} style={{
    //                     marginHorizontal: gridConfig.containerPadding,
    //                     marginTop: 8,
    //                     marginBottom: 16,
    //                     padding: 12,
    //                     alignItems: 'center',
    //                     backgroundColor: '#f0f0f0',
    //                     borderRadius: 8,
    //                 }}>
    //                     <ActivityIndicator size="small" color="#4A6FA5" />
    //                     <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
    //                         Loading more...
    //                     </Text>
    //                 </View>
    //             );
    //         }

    //         return rows;
    //     }, [gridConfig, renderCard, loadedItems, isLoadingMore]);

    //     // Footer
    //     const Footer = useCallback(() => {
    //         if (Object.keys(totals).length === 0) return null;

    //         return (
    //             <LinearGradient
    //                 colors={[theme?.BRAND_GRADIENT_START || '#4A6FA5', theme?.BRAND_GRADIENT_END || '#5C85D1']}
    //                 style={{
    //                     position: "absolute",
    //                     bottom: 0,
    //                     left: 0,
    //                     right: 0,
    //                     padding: screenWidth <= 400 ? 12 : 16,
    //                     borderTopLeftRadius: 16,
    //                     borderTopRightRadius: 16,
    //                     elevation: 10,
    //                     shadowColor: "#000",
    //                     shadowOffset: { width: 0, height: -3 },
    //                     shadowOpacity: 0.2,
    //                     shadowRadius: 6,
    //                     zIndex: 1000,
    //                 }}
    //             >
    //                 <Text style={{
    //                     color: "#fff",
    //                     fontSize: screenWidth <= 400 ? 13 : 14,
    //                     fontWeight: "700",
    //                     marginBottom: 10,
    //                 }}>
    //                     Summary Totals
    //                 </Text>

    //                 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    //                     <View style={{ flexDirection: 'row', paddingRight: 20 }}>
    //                         {Object.entries(totals).map(([col, value]) => (
    //                             <View key={col} style={{
    //                                 marginLeft: 16,
    //                                 backgroundColor: 'rgba(255,255,255,0.15)',
    //                                 paddingHorizontal: 12,
    //                                 paddingVertical: 6,
    //                                 borderRadius: 20,
    //                             }}>
    //                                 <Text style={{
    //                                     color: "rgba(255,255,255,0.9)",
    //                                     fontSize: screenWidth <= 400 ? 11 : 12,
    //                                     fontWeight: "600",
    //                                 }}>
    //                                     {labelMap[col]}: {formatValue(value, col)}
    //                                 </Text>
    //                             </View>
    //                         ))}
    //                     </View>
    //                 </ScrollView>
    //             </LinearGradient>
    //         );
    //     }, [totals, labelMap, formatValue, screenWidth]);

    //     // Empty state
    //     const EmptyState = useCallback(() => (
    //         <View style={{
    //             flex: 1,
    //             justifyContent: "center",
    //             alignItems: "center",
    //             padding: 40,
    //             marginTop: 60
    //         }}>
    //             <Icon name="search-off" size={48} color="#ccc" />
    //             <Text style={{
    //                 color: "#666",
    //                 fontSize: 16,
    //                 marginTop: 12,
    //                 textAlign: 'center'
    //             }}>
    //                 No records found
    //             </Text>
    //         </View>
    //     ), []);

    //     // Main render
    //     const groupEntries = Object.entries(groupedData);

    //     return (
    //         <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    //             {/* MAIN SCROLLVIEW */}
    //             <ScrollView
    //                 contentContainerStyle={{
    //                     paddingBottom: 120
    //                 }}
    //                 showsVerticalScrollIndicator={true}
    //                 scrollEventThrottle={16}
    //                 onScroll={(e) => {
    //                     const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    //                     const isEndReached = layoutMeasurement.height + contentOffset.y >=
    //                         contentSize.height * 0.8;

    //                     if (isEndReached) {
    //                         Object.keys(groupedData).forEach(groupKey => {
    //                             const totalCount = groupedData[groupKey]?.length || 0;
    //                             const currentLoaded = loadedItems[groupKey] || 0;

    //                             if (currentLoaded < totalCount && !isLoadingMore[groupKey]) {
    //                                 handleScroll(e, groupKey);
    //                             }
    //                         });
    //                     }
    //                 }}
    //             >
    //                 {groupEntries.length > 0 ? (
    //                     groupEntries.map(([groupKey, items], index) => {
    //                         const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;

    //                         return (
    //                             <View key={groupKey} style={{ marginBottom: 16 }}>
    //                                 {renderGroupHeader(groupKey, index, items.length)}
    //                                 {(shouldGroup ? isExpanded : true) && items.length > 0 && (
    //                                     <View style={{ marginTop: 8 }}>
    //                                         {renderGroupContent(items, groupKey)}
    //                                     </View>
    //                                 )}
    //                             </View>
    //                         );
    //                     })
    //                 ) : (
    //                     <EmptyState />
    //                 )}
    //             </ScrollView>

    //             {/* FIXED FOOTER */}
    //             <Footer />

    //             {/* CARD DETAIL MODAL */}
    //             <CardDetailModal />
    //         </View>
    //     );
    // };

    // const AllKeysCardsView = ({ data, searchQuery, getDetailsDataSetting }) => {
    //     // Lazy loading configuration
    //     const LAZY_LOAD_CONFIG = {
    //         INITIAL_BATCH: 6,
    //         SUBSEQUENT_BATCH: 6,
    //         THRESHOLD: 0.7
    //     };

    //     // Default settings
    //     const settings = getDetailsDataSetting[0] || {};
    //     const columns = settings.rptcols?.split(',') || [];
    //     const widths = settings.rptcolswidth?.split(',').map(Number) || [];
    //     const labels = settings.rptcolslabels?.split(',') || [];
    //     const sumFields = settings.rptsumfields?.split(',').map(Number) || [];
    //     const filterDataTypes = settings.rptfilterdatatype?.split(',') || [];
    //     const groupCol = settings.rptgroupcol || "";
    //     const colSkip = settings.rptcolsskip || "";

    //     // Process skipped columns
    //     const skippedColumns = useMemo(() => {
    //         const skipped = new Set();
    //         if (colSkip) {
    //             colSkip.split(',').forEach(skipPair => {
    //                 const [key] = skipPair.split('#');
    //                 if (key) skipped.add(key);
    //             });
    //         }
    //         return skipped;
    //     }, [colSkip]);

    //     // Filter data based on search query
    //     const filteredData = useMemo(() => {
    //         if (!searchQuery || searchQuery.trim() === '') return data;
    //         const query = searchQuery.toLowerCase().trim();
    //         return data.filter((item) =>
    //             Object.values(item).some((val) =>
    //                 String(val).toLowerCase().includes(query)
    //             )
    //         );
    //     }, [data, searchQuery]);

    //     // Check if we should group data
    //     const shouldGroup = useMemo(() => {
    //         return groupCol && groupCol.trim() !== "" && filteredData.some(item => item[groupCol]);
    //     }, [groupCol, filteredData]);

    //     // Group data
    //     const groupedData = useMemo(() => {
    //         if (!shouldGroup) {
    //             return { "All Items": filteredData };
    //         }
    //         return filteredData.reduce((acc, item) => {
    //             const groupKey = item[groupCol] || 'Ungrouped';
    //             if (!acc[groupKey]) acc[groupKey] = [];
    //             acc[groupKey].push(item);
    //             return acc;
    //         }, {});
    //     }, [filteredData, groupCol, shouldGroup]);

    //     // Get visible columns
    //     const visibleColumns = useMemo(() => {
    //         return columns.filter(col => {
    //             const colIndex = columns.indexOf(col);
    //             return !skippedColumns.has(col) &&
    //                 !(shouldGroup && col === groupCol) &&
    //                 widths[colIndex] > 0;
    //         });
    //     }, [columns, skippedColumns, shouldGroup, groupCol, widths]);

    //     // Create label map
    //     const labelMap = useMemo(() => {
    //         const map = {};
    //         columns.forEach((col, i) => {
    //             map[col] = labels[i] || col;
    //         });
    //         return map;
    //     }, [columns, labels]);

    //     // Calculate totals
    //     const totals = useMemo(() => {
    //         const calculated = {};
    //         columns.forEach((col, index) => {
    //             if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
    //                 calculated[col] = filteredData.reduce(
    //                     (sum, item) => sum + (parseFloat(item[col]) || 0),
    //                     0
    //                 );
    //             }
    //         });
    //         return calculated;
    //     }, [filteredData, columns, sumFields, filterDataTypes]);

    //     const toggleCardLock = useCallback((cardId: string) => {
    //         console.log('toggleCardLock', cardId);
    //         setLockedCardId(prevId => prevId === cardId ? null : cardId);
    //     }, []);


    //     // Color palette
    //     const CARD_COLORS = useMemo(() => [
    //         ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
    //         ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
    //         ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
    //         ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
    //     ], []);

    //     // States
    //     const [expandedGroups, setExpandedGroups] = useState({});
    //     const [loadedItems, setLoadedItems] = useState({});
    //     const [isLoadingMore, setIsLoadingMore] = useState({});

    //     // ========== MODAL STATES ==========
    //     const [modalVisible, setModalVisible] = useState(false);
    //     const [selectedCard, setSelectedCard] = useState(null);
    //     const [selectedCardColors, setSelectedCardColors] = useState(null);

    //     // Screen width for responsive design
    //     const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    //     // ✅ PERFECT RESPONSIVE GRID CONFIG
    //     const getGridConfig = useCallback(() => {
    //         const padding = 12; // कंटेनर padding

    //         // FIXED CARD WIDTH for all screens
    //         const MOBILE_CARD_WIDTH = screenWidth - (padding * 2);
    //         const TABLET_CARD_WIDTH = (screenWidth - (padding * 2) - 12) / 2; // 12px gap
    //         const DESKTOP_CARD_WIDTH = (screenWidth - (padding * 2) - 24) / 3; // 12px gap between 3 cards

    //         if (screenWidth < 600) {
    //             // Mobile: 1 card
    //             return {
    //                 numColumns: 1,
    //                 cardWidth: MOBILE_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 0,
    //                 labelWidth: '40%',
    //                 valueWidth: '55%',
    //             };
    //         } else if (screenWidth >= 600 && screenWidth < 900) {
    //             // Tablet: 2 cards
    //             return {
    //                 numColumns: 2,
    //                 cardWidth: TABLET_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 12,
    //                 labelWidth: '45%',
    //                 valueWidth: '50%',
    //             };
    //         } else {
    //             // Desktop: 3 cards
    //             return {
    //                 numColumns: 3,
    //                 cardWidth: DESKTOP_CARD_WIDTH,
    //                 containerPadding: padding,
    //                 gap: 12,
    //                 labelWidth: '48%',
    //                 valueWidth: '47%',
    //             };
    //         }
    //     }, [screenWidth]);

    //     const gridConfig = getGridConfig();

    //     // Initialize lazy loading
    //     useEffect(() => {
    //         setLoadedItems({});
    //         setIsLoadingMore({});
    //         Object.keys(groupedData).forEach(groupKey => {
    //             const itemCount = groupedData[groupKey].length;
    //             setLoadedItems(prev => ({
    //                 ...prev,
    //                 [groupKey]: Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, itemCount)
    //             }));
    //         });
    //     }, [filteredData, searchQuery]);

    //     const toggleGroup = useCallback((groupKey) => {
    //         setExpandedGroups(prev => ({
    //             ...prev,
    //             [groupKey]: !prev[groupKey]
    //         }));
    //     }, []);

    //     // Auto load more when scrolling
    //     const handleScroll = useCallback((event) => {
    //         const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    //         const isEndReached = layoutMeasurement.height + contentOffset.y >=
    //             contentSize.height * LAZY_LOAD_CONFIG.THRESHOLD;

    //         if (isEndReached) {
    //             // Find which group to load more
    //             Object.keys(groupedData).forEach(groupKey => {
    //                 const totalCount = groupedData[groupKey]?.length || 0;
    //                 const currentLoaded = loadedItems[groupKey] || 0;

    //                 if (currentLoaded < totalCount && !isLoadingMore[groupKey]) {
    //                     setIsLoadingMore(prev => ({ ...prev, [groupKey]: true }));

    //                     setTimeout(() => {
    //                         setLoadedItems(prev => ({
    //                             ...prev,
    //                             [groupKey]: Math.min(
    //                                 currentLoaded + LAZY_LOAD_CONFIG.SUBSEQUENT_BATCH,
    //                                 totalCount
    //                             )
    //                         }));
    //                         setIsLoadingMore(prev => ({ ...prev, [groupKey]: false }));
    //                     }, 100);
    //                 }
    //             });
    //         }
    //     }, [groupedData, loadedItems, isLoadingMore]);

    //     // Format value
    //     const formatValue = useCallback((value, colName) => {
    //         if (value === undefined || value === null) return '-';
    //         const colIndex = columns.indexOf(colName);
    //         const isNumeric = filterDataTypes[colIndex] === 'N';
    //         if (isNumeric && !isNaN(parseFloat(value))) {
    //             return `₹ ${parseFloat(value).toLocaleString('en-IN', {
    //                 minimumFractionDigits: 2,
    //                 maximumFractionDigits: 2
    //             })}`;
    //         }
    //         return String(value);
    //     }, [columns, filterDataTypes]);

    //     // ========== HANDLE CARD LONG PRESS ==========
    //     const handleCardLongPress = useCallback((item, colors) => {
    //         setSelectedCard(item);
    //         setSelectedCardColors(colors);
    //         setModalVisible(true);
    //     }, []);

    //     // ========== MODAL COMPONENT ==========
    //     // const CardDetailModal = useCallback(() => {
    //     //     if (!selectedCard || !selectedCardColors) return null;

    //     //     return (
    //     //         <Modal
    //     //             animationType="slide"
    //     //             transparent={false}
    //     //             visible={modalVisible}
    //     //             onRequestClose={() => setModalVisible(false)}
    //     //         >
    //     //             <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    //     //                 {/* Header with close button */}
    //     //                 <LinearGradient
    //     //                     colors={selectedCardColors}
    //     //                     start={{ x: 0, y: 0 }}
    //     //                     end={{ x: 1, y: 0 }}
    //     //                     style={{
    //     //                         flexDirection: 'row',
    //     //                         justifyContent: 'space-between',
    //     //                         alignItems: 'center',
    //     //                         paddingTop: screenHeight > 800 ? 50 : 40,
    //     //                         paddingBottom: 20,
    //     //                         paddingHorizontal: 20,
    //     //                         borderBottomLeftRadius: 20,
    //     //                         borderBottomRightRadius: 20,
    //     //                         elevation: 5,
    //     //                     }}
    //     //                 >
    //     //                     <Text style={{
    //     //                         color: "#fff",
    //     //                         fontSize: screenWidth <= 400 ? 18 : 20,
    //     //                         fontWeight: "bold",
    //     //                         flex: 1,
    //     //                     }}>
    //     //                         {selectedCard.ParName || selectedCard.PrpName || 'Details'}
    //     //                     </Text>
    //     //                     <TouchableOpacity
    //     //                         onPress={() => setModalVisible(false)}
    //     //                         style={{
    //     //                             backgroundColor: 'rgba(255,255,255,0.3)',
    //     //                             borderRadius: 20,
    //     //                             padding: 8,
    //     //                         }}
    //     //                     >
    //     //                         <Icon name="close" size={24} color="#fff" />
    //     //                     </TouchableOpacity>
    //     //                 </LinearGradient>

    //     //                 {/* Modal Content - ALL VALUES */}
    //     //                 <ScrollView
    //     //                     style={{ flex: 1 }}
    //     //                     contentContainerStyle={{
    //     //                         padding: 20,
    //     //                         paddingBottom: 40,
    //     //                     }}
    //     //                     showsVerticalScrollIndicator={true}
    //     //                 >
    //     //                     {/* All fields in big format */}
    //     //                     {visibleColumns.map((col, idx) => {
    //     //                         const colIndex = columns.indexOf(col);
    //     //                         const isNumeric = filterDataTypes[colIndex] === 'N';
    //     //                         const value = selectedCard[col];
    //     //                         const label = labelMap[col] || col;

    //     //                         const displayValue = value !== undefined && value !== null
    //     //                             ? (isNumeric ? formatValue(value, col) : String(value))
    //     //                             : '-';

    //     //                         return (
    //     //                             <View
    //     //                                 key={col}
    //     //                                 style={{
    //     //                                     backgroundColor: '#fff',
    //     //                                     borderRadius: 12,
    //     //                                     padding: 16,
    //     //                                     marginBottom: 12,
    //     //                                     elevation: 2,
    //     //                                     shadowColor: "#000",
    //     //                                     shadowOffset: { width: 0, height: 1 },
    //     //                                     shadowOpacity: 0.1,
    //     //                                     shadowRadius: 2,
    //     //                                 }}
    //     //                             >
    //     //                                 <Text style={{
    //     //                                     color: '#666',
    //     //                                     fontSize: screenWidth <= 400 ? 13 : 14,
    //     //                                     fontWeight: '500',
    //     //                                     marginBottom: 6,
    //     //                                 }}>
    //     //                                     {label}
    //     //                                 </Text>
    //     //                                 <Text style={{
    //     //                                     color: '#333',
    //     //                                     fontSize: screenWidth <= 400 ? 16 : 18,
    //     //                                     fontWeight: isNumeric ? '700' : '500',
    //     //                                 }}>
    //     //                                     {displayValue}
    //     //                                 </Text>
    //     //                             </View>
    //     //                         );
    //     //                     })}

    //     //                     {/* Extra info if available */}
    //     //                     {selectedCard.ParName && (
    //     //                         <View style={{
    //     //                             backgroundColor: '#fff',
    //     //                             borderRadius: 12,
    //     //                             padding: 16,
    //     //                             marginBottom: 12,
    //     //                             elevation: 2,
    //     //                         }}>
    //     //                             <Text style={{
    //     //                                 color: '#666',
    //     //                                 fontSize: screenWidth <= 400 ? 13 : 14,
    //     //                                 fontWeight: '500',
    //     //                                 marginBottom: 6,
    //     //                             }}>
    //     //                                 Party Name
    //     //                             </Text>
    //     //                             <Text style={{
    //     //                                 color: '#333',
    //     //                                 fontSize: screenWidth <= 400 ? 16 : 18,
    //     //                                 fontWeight: '500',
    //     //                             }}>
    //     //                                 {selectedCard.ParName}
    //     //                             </Text>
    //     //                         </View>
    //     //                     )}
    //     //                 </ScrollView>
    //     //             </View>
    //     //         </Modal>
    //     //     );
    //     // }, [selectedCard, selectedCardColors, modalVisible, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, screenHeight]);
    //     const CardDetailModal = useCallback(() => {
    //         if (!selectedCard || !selectedCardColors) return null;

    //         return (
    //             <Modal
    //                 animationType="slide"
    //                 transparent={false}
    //                 visible={modalVisible}
    //                 onRequestClose={() => setModalVisible(false)}
    //             >
    //                 <View
    //                     style={{ flex: 1, backgroundColor: '#f8f9fa' }}
    //                     pointerEvents="box-none" // <-- YEH ADD KIYA
    //                 >
    //                     {/* Header */}
    //                     <LinearGradient
    //                         colors={selectedCardColors}
    //                         start={{ x: 0, y: 0 }}
    //                         end={{ x: 1, y: 0 }}
    //                         style={{
    //                             flexDirection: 'row',
    //                             justifyContent: 'space-between',
    //                             alignItems: 'center',
    //                             paddingTop: screenHeight > 800 ? 50 : 40,
    //                             paddingBottom: 20,
    //                             paddingHorizontal: 20,
    //                             borderBottomLeftRadius: 20,
    //                             borderBottomRightRadius: 20,
    //                             elevation: 5,
    //                         }}
    //                     >
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: screenWidth <= 400 ? 18 : 20,
    //                             fontWeight: "bold",
    //                             flex: 1,
    //                         }}>
    //                             {selectedCard.ParName || selectedCard.PrpName || 'Details'}
    //                         </Text>
    //                         <TouchableOpacity
    //                             onPress={() => setModalVisible(false)}
    //                             style={{
    //                                 backgroundColor: 'rgba(255,255,255,0.3)',
    //                                 borderRadius: 20,
    //                                 padding: 8,
    //                             }}
    //                         >
    //                             <Icon name="close" size={24} color="#fff" />
    //                         </TouchableOpacity>
    //                     </LinearGradient>

    //                     {/* Modal Content (Scrollable) */}
    //                     <ScrollView
    //                         style={{ flex: 1 }}
    //                         contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    //                         showsVerticalScrollIndicator={true}
    //                         nestedScrollEnabled={true} // <-- YEH ADD KIYA
    //                         keyboardShouldPersistTaps="always" // <-- YEH ADD KIYA
    //                         scrollEventThrottle={1} // <-- Optimized
    //                     >
    //                         {visibleColumns.map((col, idx) => {
    //                             const colIndex = columns.indexOf(col);
    //                             const isNumeric = filterDataTypes[colIndex] === 'N';
    //                             const value = selectedCard[col];
    //                             const label = labelMap[col] || col;
    //                             const displayValue = value !== undefined && value !== null
    //                                 ? (isNumeric ? formatValue(value, col) : String(value))
    //                                 : '-';

    //                             return (
    //                                 <View
    //                                     key={col}
    //                                     style={{
    //                                         backgroundColor: '#fff',
    //                                         borderRadius: 12,
    //                                         padding: 16,
    //                                         marginBottom: 12,
    //                                         elevation: 2,
    //                                     }}
    //                                 >
    //                                     <Text style={{
    //                                         color: '#666',
    //                                         fontSize: screenWidth <= 400 ? 13 : 14,
    //                                         fontWeight: '500',
    //                                         marginBottom: 6,
    //                                     }}>
    //                                         {label}
    //                                     </Text>
    //                                     <Text style={{
    //                                         color: '#333',
    //                                         fontSize: screenWidth <= 400 ? 16 : 18,
    //                                         fontWeight: isNumeric ? '700' : '500',
    //                                     }}>
    //                                         {displayValue}
    //                                     </Text>
    //                                 </View>
    //                             );
    //                         })}
    //                     </ScrollView>
    //                 </View>
    //             </Modal>
    //         );
    //     }, [selectedCard, selectedCardColors, modalVisible, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, screenHeight]);


    //     // Render group header
    //     const renderGroupHeader = useCallback((groupKey, index, itemCount) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];
    //         const isExpanded = expandedGroups[groupKey] !== false;

    //         return (
    //             <TouchableOpacity
    //                 key={`header-${groupKey}`}
    //                 onPress={() => toggleGroup(groupKey)}
    //                 activeOpacity={0.7}
    //                 style={{
    //                     marginBottom: 8,
    //                     marginHorizontal: gridConfig.containerPadding,
    //                     borderRadius: 10,
    //                     overflow: 'hidden',
    //                     elevation: 2,
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 0 }}
    //                     style={{
    //                         padding: 12,
    //                         flexDirection: 'row',
    //                         justifyContent: 'space-between',
    //                         alignItems: 'center'
    //                     }}
    //                 >
    //                     <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
    //                         {shouldGroup && (
    //                             <Icon
    //                                 name={isExpanded ? "expand-less" : "expand-more"}
    //                                 size={20}
    //                                 color="#fff"
    //                                 style={{ marginRight: 8 }}
    //                             />
    //                         )}
    //                         <Text
    //                             numberOfLines={1}
    //                             style={{
    //                                 color: "#fff",
    //                                 fontWeight: "600",
    //                                 fontSize: screenWidth <= 400 ? 13 : 14,
    //                                 flex: 1,
    //                             }}
    //                         >
    //                             {groupKey}
    //                         </Text>
    //                     </View>
    //                     <View style={{
    //                         backgroundColor: 'rgba(255,255,255,0.2)',
    //                         paddingHorizontal: 8,
    //                         paddingVertical: 4,
    //                         borderRadius: 12,
    //                         marginLeft: 8
    //                     }}>
    //                         <Text style={{
    //                             color: "#fff",
    //                             fontSize: 11,
    //                             fontWeight: "500",
    //                         }}>
    //                             {itemCount}
    //                         </Text>
    //                     </View>
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     }, [CARD_COLORS, expandedGroups, shouldGroup, toggleGroup, gridConfig.containerPadding, screenWidth]);

    //     // ========== FIXED CARD HEIGHT ==========
    //     const CARD_HEIGHT = 280; // थोड़ा बढ़ाया ताकि scroll better feel हो

    //     // Render card with LONG PRESS support - FIXED SCROLLING
    //     // const renderCard = useCallback((item, index, groupKey) => {
    //     //     const colors = CARD_COLORS[index % CARD_COLORS.length];

    //     //     return (
    //     //         <TouchableOpacity
    //     //             activeOpacity={0.9}
    //     //             onLongPress={() => handleCardLongPress(item, colors)}
    //     //             delayLongPress={500}
    //     //             style={{
    //     //                 width: gridConfig.cardWidth,
    //     //                 height: CARD_HEIGHT,
    //     //                 borderRadius: 8,
    //     //                 overflow: "hidden",
    //     //                 elevation: 3,
    //     //             }}
    //     //             onStartShouldSetResponder={() => true}
    //     //         >
    //     //             <LinearGradient
    //     //                 colors={colors}
    //     //                 start={{ x: 0, y: 0 }}
    //     //                 end={{ x: 1, y: 1 }}
    //     //                 style={{ flex: 1, padding: 12 }}
    //     //             >
    //     //                 {/* Title with divider - FIXED AT TOP */}
    //     //                 <View style={{
    //     //                     flexDirection: 'row',
    //     //                     justifyContent: 'space-between',
    //     //                     alignItems: 'center',
    //     //                     paddingBottom: 8,
    //     //                     borderBottomWidth: 1,
    //     //                     borderBottomColor: 'rgba(255,255,255,0.3)',
    //     //                     marginBottom: 8,
    //     //                     height: 40, // Fixed height for title
    //     //                 }}>
    //     //                     <Text
    //     //                         numberOfLines={1}
    //     //                         style={{
    //     //                             color: "#fff",
    //     //                             fontSize: screenWidth <= 400 ? 13 : 14,
    //     //                             fontWeight: "bold",
    //     //                             opacity: 0.9,
    //     //                             flex: 1,
    //     //                         }}
    //     //                     >
    //     //                         {item.ParName || item.PrpName || 'Item'}
    //     //                     </Text>
    //     //                     <Icon name="info-outline" size={16} color="rgba(255,255,255,0.8)" />
    //     //                 </View>

    //     //                 {/* Scrollable content area - PROPERLY SCROLLABLE */}
    //     //                 <View style={{ flex: 1 }}>
    //     //                     {/* <ScrollView
    //     //                         showsVerticalScrollIndicator={true}
    //     //                         persistentScrollbar={true}
    //     //                         nestedScrollEnabled={true} // IMPORTANT: enables nested scrolling
    //     //                         scrollEnabled={true} // Ensure scroll is enabled
    //     //                         contentContainerStyle={{
    //     //                             paddingBottom: 12,
    //     //                         }}
    //     //                         style={{
    //     //                             flex: 1,
    //     //                         }}
    //     //                     > */}
    //     //                     <ScrollView
    //     //                         nestedScrollEnabled={true} // Enable nested scrolling
    //     //                         scrollEnabled={true} // Ensure scroll is enabled
    //     //                         showsVerticalScrollIndicator={true}
    //     //                         persistentScrollbar={true}
    //     //                         style={{
    //     //                             flex: 1,
    //     //                         }}
    //     //                         contentContainerStyle={{
    //     //                             paddingBottom: 12,
    //     //                         }}
    //     //                         onStartShouldSetResponder={() => true} // Capture touch
    //     //                     >
    //     //                         {visibleColumns.map((col) => {
    //     //                             const colIndex = columns.indexOf(col);
    //     //                             const isNumeric = filterDataTypes[colIndex] === 'N';
    //     //                             const value = item[col];
    //     //                             const label = labelMap[col] || col;

    //     //                             const displayValue = value !== undefined && value !== null
    //     //                                 ? (isNumeric ? formatValue(value, col) : String(value))
    //     //                                 : '-';

    //     //                             return (
    //     //                                 <View
    //     //                                     key={col}
    //     //                                     style={{
    //     //                                         flexDirection: 'row',
    //     //                                         justifyContent: 'space-between',
    //     //                                         alignItems: 'flex-start',
    //     //                                         marginBottom: 12,
    //     //                                         paddingVertical: 6,
    //     //                                         borderBottomWidth: 0.5,
    //     //                                         borderBottomColor: 'rgba(255,255,255,0.15)',
    //     //                                         minHeight: 40, // Minimum height for each row
    //     //                                     }}
    //     //                                 >
    //     //                                     <Text
    //     //                                         style={{
    //     //                                             color: "rgba(255, 255, 255, 0.7)",
    //     //                                             fontSize: screenWidth <= 400 ? 11 : 12,
    //     //                                             fontWeight: "500",
    //     //                                             width: gridConfig.labelWidth,
    //     //                                             marginRight: 8,
    //     //                                             flexWrap: 'wrap',
    //     //                                         }}
    //     //                                     >
    //     //                                         {label}
    //     //                                     </Text>

    //     //                                     <Text
    //     //                                         style={{
    //     //                                             color: "#fff",
    //     //                                             fontSize: screenWidth <= 400 ? 12 : 12,
    //     //                                             fontWeight: isNumeric ? "700" : "600",
    //     //                                             textAlign: 'right',
    //     //                                             width: gridConfig.valueWidth,
    //     //                                             flexWrap: 'wrap',
    //     //                                         }}
    //     //                                     >
    //     //                                         {displayValue}
    //     //                                     </Text>
    //     //                                 </View>
    //     //                             );
    //     //                         })}

    //     //                         {/* Extra space to show scrolling works */}
    //     //                         <View style={{ height: 20 }} />
    //     //                     </ScrollView>
    //     //                 </View>
    //     //             </LinearGradient>
    //     //         </TouchableOpacity>
    //     //     );
    //     // }, [CARD_COLORS, gridConfig, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, handleCardLongPress]);
    //     const renderCard = useCallback((item, index, groupKey) => {
    //         const colors = CARD_COLORS[index % CARD_COLORS.length];
    //         const cardId = `${groupKey}-${index}`; // Unique ID for each card
    //         const isLocked = lockedCardId === cardId;

    //         return (
    //             <TouchableOpacity
    //                 activeOpacity={0.9}
    //                 onLongPress={() => handleCardLongPress(item, colors)}
    //                 delayLongPress={500}
    //                 style={{
    //                     width: gridConfig.cardWidth,
    //                     height: CARD_HEIGHT,
    //                     borderRadius: 8,
    //                     overflow: "hidden",
    //                     elevation: 3,
    //                 }}
    //                 onStartShouldSetResponderCapture={() => true} // <-- YEH ADD KIYA
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     start={{ x: 0, y: 0 }}
    //                     end={{ x: 1, y: 1 }}
    //                     style={{ flex: 1, padding: 12 }}
    //                 // pointerEvents="box-none" // <-- YEH ADD KIYA
    //                 >
    //                     {/* Title Section (Fixed) */}
    //                     <View
    //                         style={{
    //                             flexDirection: 'row',
    //                             justifyContent: 'space-between',
    //                             alignItems: 'center',
    //                             paddingBottom: 8,
    //                             borderBottomWidth: 1,
    //                             borderBottomColor: 'rgba(255,255,255,0.3)',
    //                             marginBottom: 8,
    //                             height: 40,
    //                         }}
    //                         pointerEvents="none" // <-- YEH ADD KIYA
    //                     >
    //                         <Text
    //                             numberOfLines={1}
    //                             style={{
    //                                 color: "#fff",
    //                                 fontSize: screenWidth <= 400 ? 13 : 14,
    //                                 fontWeight: "bold",
    //                                 opacity: 0.9,
    //                                 flex: 1,
    //                             }}
    //                         >
    //                             {item.ParName || item.PrpName || 'Item'}
    //                         </Text>
    //                         {/* <Icon name="info-outline" size={16} color="rgba(255,255,255,0.8)" /> */}
    //                         {/* <Icon
    //                             name={lockedCardId === `${groupKey}-${index}` ? "lock" : "info-outline"}
    //                             size={16}
    //                             color="rgba(255,255,255,0.8)"
    //                             onPress={() => toggleCardLock(`${groupKey}-${index}`)}
    //                         /> */}
    //                         <TouchableOpacity
    //                             activeOpacity={0.7}
    //                             onPress={(e) => {
    //                                 e.stopPropagation(); // Prevent card's long press
    //                                 toggleCardLock(cardId);
    //                             }}
    //                             style={{ zIndex: 1 }}
    //                             hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
    //                         >
    //                             <Icon
    //                                 name={isLocked ? "lock" : "info-outline"}
    //                                 size={16}
    //                                 color={isLocked ? "#FFD700" : "rgba(255,255,255,0.8)"}
    //                             />
    //                         </TouchableOpacity>

    //                     </View>

    //                     {/* Scrollable Content (Only this should respond to touch) */}
    //                     <ScrollView
    //                         nestedScrollEnabled={true}
    //                         scrollEnabled={true}
    //                         showsVerticalScrollIndicator={true}
    //                         persistentScrollbar={true}
    //                         style={{ flex: 1 }}
    //                         contentContainerStyle={{ paddingBottom: 12 }}
    //                         scrollEventThrottle={1} // <-- Optimized for smoothness
    //                         onStartShouldSetResponderCapture={() => true} // <-- YEH ADD KIYA
    //                     >
    //                         {visibleColumns.map((col) => {
    //                             const colIndex = columns.indexOf(col);
    //                             const isNumeric = filterDataTypes[colIndex] === 'N';
    //                             const value = item[col];
    //                             const label = labelMap[col] || col;
    //                             const displayValue = value !== undefined && value !== null
    //                                 ? (isNumeric ? formatValue(value, col) : String(value))
    //                                 : '-';

    //                             return (
    //                                 <View
    //                                     key={col}
    //                                     style={{
    //                                         flexDirection: 'row',
    //                                         justifyContent: 'space-between',
    //                                         alignItems: 'flex-start',
    //                                         marginBottom: 12,
    //                                         paddingVertical: 6,
    //                                         borderBottomWidth: 0.5,
    //                                         borderBottomColor: 'rgba(255,255,255,0.15)',
    //                                         minHeight: 40,
    //                                     }}
    //                                 >
    //                                     <Text style={{
    //                                         color: "rgba(255, 255, 255, 0.7)",
    //                                         fontSize: screenWidth <= 400 ? 11 : 12,
    //                                         fontWeight: "500",
    //                                         width: gridConfig.labelWidth,
    //                                         marginRight: 8,
    //                                         flexWrap: 'wrap',
    //                                     }}>
    //                                         {label}
    //                                     </Text>
    //                                     <Text style={{
    //                                         color: "#fff",
    //                                         fontSize: screenWidth <= 400 ? 12 : 12,
    //                                         fontWeight: isNumeric ? "700" : "600",
    //                                         textAlign: 'right',
    //                                         width: gridConfig.valueWidth,
    //                                         flexWrap: 'wrap',
    //                                     }}>
    //                                         {displayValue}
    //                                     </Text>
    //                                 </View>
    //                             );
    //                         })}
    //                     </ScrollView>
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     }, [CARD_COLORS, gridConfig, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, handleCardLongPress]);


    //     // Render group content
    //     const renderGroupContent = useCallback((items, groupKey) => {
    //         const loadedCount = loadedItems[groupKey] || Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, items.length);
    //         const displayedItems = items.slice(0, loadedCount);
    //         const hasMore = loadedCount < items.length;

    //         const rows = [];

    //         for (let i = 0; i < displayedItems.length; i += gridConfig.numColumns) {
    //             const rowItems = displayedItems.slice(i, i + gridConfig.numColumns);
    //             const isLastRow = i + gridConfig.numColumns >= displayedItems.length;

    //             rows.push(
    //                 <View
    //                     key={`${groupKey}-row-${i}`}
    //                     style={{
    //                         flexDirection: 'row',
    //                         justifyContent: 'flex-start',
    //                         marginHorizontal: gridConfig.containerPadding,
    //                         marginBottom: isLastRow ? 0 : 16,
    //                     }}
    //                 >
    //                     {rowItems.map((item, index) => {
    //                         const actualIndex = i + index;
    //                         return (
    //                             <View
    //                                 key={`${groupKey}-${actualIndex}`}
    //                                 style={{
    //                                     width: gridConfig.cardWidth,
    //                                     marginRight: index < rowItems.length - 1 ? gridConfig.gap : 0,
    //                                 }}
    //                             >
    //                                 {renderCard(item, actualIndex, groupKey)}
    //                             </View>
    //                         );
    //                     })}
    //                 </View>
    //             );
    //         }

    //         // Loading indicator
    //         if (hasMore && isLoadingMore[groupKey]) {
    //             rows.push(
    //                 <View key={`${groupKey}-loading`} style={{
    //                     marginHorizontal: gridConfig.containerPadding,
    //                     marginTop: 8,
    //                     marginBottom: 16,
    //                     padding: 12,
    //                     alignItems: 'center',
    //                     backgroundColor: '#f0f0f0',
    //                     borderRadius: 8,
    //                 }}>
    //                     <ActivityIndicator size="small" color="#4A6FA5" />
    //                     <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
    //                         Loading more...
    //                     </Text>
    //                 </View>
    //             );
    //         }

    //         return rows;
    //     }, [gridConfig, renderCard, loadedItems, isLoadingMore]);

    //     // Footer
    //     const Footer = useCallback(() => {
    //         if (Object.keys(totals).length === 0) return null;

    //         return (
    //             <LinearGradient
    //                 colors={[theme?.BRAND_GRADIENT_START || '#4A6FA5', theme?.BRAND_GRADIENT_END || '#5C85D1']}
    //                 style={{
    //                     position: "absolute",
    //                     bottom: 0,
    //                     left: 0,
    //                     right: 0,
    //                     padding: screenWidth <= 400 ? 12 : 16,
    //                     borderTopLeftRadius: 16,
    //                     borderTopRightRadius: 16,
    //                     elevation: 10,
    //                     shadowColor: "#000",
    //                     shadowOffset: { width: 0, height: -3 },
    //                     shadowOpacity: 0.2,
    //                     shadowRadius: 6,
    //                     zIndex: 1000,
    //                 }}
    //             >
    //                 <Text style={{
    //                     color: "#fff",
    //                     fontSize: screenWidth <= 400 ? 13 : 14,
    //                     fontWeight: "700",
    //                     marginBottom: 10,
    //                 }}>
    //                     Summary Totals
    //                 </Text>

    //                 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    //                     <View style={{ flexDirection: 'row', paddingRight: 20 }}>
    //                         {Object.entries(totals).map(([col, value]) => (
    //                             <View key={col} style={{
    //                                 marginLeft: 16,
    //                                 backgroundColor: 'rgba(255,255,255,0.15)',
    //                                 paddingHorizontal: 12,
    //                                 paddingVertical: 6,
    //                                 borderRadius: 20,
    //                             }}>
    //                                 <Text style={{
    //                                     color: "rgba(255,255,255,0.9)",
    //                                     fontSize: screenWidth <= 400 ? 11 : 12,
    //                                     fontWeight: "600",
    //                                 }}>
    //                                     {labelMap[col]}: {formatValue(value, col)}
    //                                 </Text>
    //                             </View>
    //                         ))}
    //                     </View>
    //                 </ScrollView>
    //             </LinearGradient>
    //         );
    //     }, [totals, labelMap, formatValue, screenWidth]);

    //     // Empty state
    //     const EmptyState = useCallback(() => (
    //         <View style={{
    //             flex: 1,
    //             justifyContent: "center",
    //             alignItems: "center",
    //             padding: 40,
    //             marginTop: 60
    //         }}>
    //             <Icon name="search-off" size={48} color="#ccc" />
    //             <Text style={{
    //                 color: "#666",
    //                 fontSize: 16,
    //                 marginTop: 12,
    //                 textAlign: 'center'
    //             }}>
    //                 No records found
    //             </Text>
    //         </View>
    //     ), []);

    //     // Main render
    //     const groupEntries = Object.entries(groupedData);

    //     return (
    //         <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}
    //             pointerEvents={lockedCardId ? "none" : "auto"} >
    //             {/* MAIN SCROLLVIEW */}
    //             <ScrollView
    //                 contentContainerStyle={{
    //                     paddingBottom: 120
    //                 }}
    //                 showsVerticalScrollIndicator={true}
    //                 scrollEventThrottle={16}
    //                 onScroll={handleScroll}
    //                 scrollEnabled={lockedCardId === null}
    //             >
    //                 {groupEntries.length > 0 ? (
    //                     groupEntries.map(([groupKey, items], index) => {
    //                         const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;

    //                         return (
    //                             <View key={groupKey} style={{ marginBottom: 16 }}>
    //                                 {renderGroupHeader(groupKey, index, items.length)}
    //                                 {(shouldGroup ? isExpanded : true) && items.length > 0 && (
    //                                     <View style={{ marginTop: 8 }}>
    //                                         {renderGroupContent(items, groupKey)}
    //                                     </View>
    //                                 )}
    //                             </View>
    //                         );
    //                     })
    //                 ) : (
    //                     <EmptyState />
    //                 )}
    //             </ScrollView>

    //             {/* FIXED FOOTER */}
    //             <Footer />

    //             {/* CARD DETAIL MODAL */}
    //             <CardDetailModal />
    //         </View>
    //     );
    // };

    const AllKeysCardsView = ({ data, searchQuery, getDetailsDataSetting }) => {
        // Lazy loading configuration
        const LAZY_LOAD_CONFIG = {
            INITIAL_BATCH: 6,
            SUBSEQUENT_BATCH: 6,
            THRESHOLD: 0.7
        };

        // Default settings
        const settings = getDetailsDataSetting[0] || {};
        const columns = settings.rptcols?.split(',') || [];
        const widths = settings.rptcolswidth?.split(',').map(Number) || [];
        const labels = settings.rptcolslabels?.split(',') || [];
        const sumFields = settings.rptsumfields?.split(',').map(Number) || [];
        const filterDataTypes = settings.rptfilterdatatype?.split(',') || [];
        const groupCol = settings.rptgroupcol || "";
        const colSkip = settings.rptcolsskip || "";



        // Process skipped columns
        const skippedColumns = useMemo(() => {
            const skipped = new Set();
            if (colSkip) {
                colSkip.split(',').forEach(skipPair => {
                    const [key] = skipPair.split('#');
                    if (key) skipped.add(key);
                });
            }
            return skipped;
        }, [colSkip]);

        // Filter data based on search query
        const filteredData = useMemo(() => {
            if (!searchQuery || searchQuery.trim() === '') return data;
            const query = searchQuery.toLowerCase().trim();
            return data.filter((item) =>
                Object.values(item).some((val) =>
                    String(val).toLowerCase().includes(query)
                )
            );
        }, [data, searchQuery]);

        // Check if we should group data
        const shouldGroup = useMemo(() => {
            return groupCol && groupCol.trim() !== "" && filteredData.some(item => item[groupCol]);
        }, [groupCol, filteredData]);

        // Group data
        const groupedData = useMemo(() => {
            if (!shouldGroup) {
                return { "All Items": filteredData };
            }
            return filteredData.reduce((acc, item) => {
                const groupKey = item[groupCol] || 'Ungrouped';
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(item);
                return acc;
            }, {});
        }, [filteredData, groupCol, shouldGroup]);

        // Get visible columns
        const visibleColumns = useMemo(() => {
            return columns.filter(col => {
                const colIndex = columns.indexOf(col);
                return !skippedColumns.has(col) &&
                    !(shouldGroup && col === groupCol) &&
                    widths[colIndex] > 0;
            });
        }, [columns, skippedColumns, shouldGroup, groupCol, widths]);

        // Create label map
        const labelMap = useMemo(() => {
            const map = {};
            columns.forEach((col, i) => {
                map[col] = labels[i] || col;
            });
            return map;
        }, [columns, labels]);

        // Calculate totals
        const totals = useMemo(() => {
            const calculated = {};
            columns.forEach((col, index) => {
                if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
                    calculated[col] = filteredData.reduce(
                        (sum, item) => sum + (parseFloat(item[col]) || 0),
                        0
                    );
                }
            });
            return calculated;
        }, [filteredData, columns, sumFields, filterDataTypes]);

        // States
        const [expandedGroups, setExpandedGroups] = useState({});
        const [loadedItems, setLoadedItems] = useState({});
        const [isLoadingMore, setIsLoadingMore] = useState({});
        const [lockedCardId, setLockedCardId] = useState<string | null>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);

        // Modal states
        const [modalVisible, setModalVisible] = useState(false);
        const [selectedCard, setSelectedCard] = useState(null);
        const [selectedCardColors, setSelectedCardColors] = useState(null);

        // Screen width for responsive design
        const { width: screenWidth, height: screenHeight } = useWindowDimensions();
        const isCardLocked = lockedCardId !== null;

        // Toggle card lock
        const toggleCardLock = useCallback((cardId: string) => {
            setLockedCardId(prevId => prevId === cardId ? null : cardId);
        }, []);

        // Grid config
        const getGridConfig = useCallback(() => {
            const padding = 12;
            const MOBILE_CARD_WIDTH = screenWidth - (padding * 2);
            const TABLET_CARD_WIDTH = (screenWidth - (padding * 2) - 12) / 2;
            const DESKTOP_CARD_WIDTH = (screenWidth - (padding * 2) - 24) / 3;

            if (screenWidth < 600) {
                return {
                    numColumns: 1,
                    cardWidth: MOBILE_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 0,
                    labelWidth: '40%',
                    valueWidth: '55%',
                };
            } else if (screenWidth >= 600 && screenWidth < 900) {
                return {
                    numColumns: 2,
                    cardWidth: TABLET_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 12,
                    labelWidth: '45%',
                    valueWidth: '50%',
                };
            } else {
                return {
                    numColumns: 3,
                    cardWidth: DESKTOP_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 12,
                    labelWidth: '48%',
                    valueWidth: '47%',
                };
            }
        }, [screenWidth]);

        const gridConfig = getGridConfig();

        // Format value
        const formatValue = useCallback((value, colName) => {
            if (value === undefined || value === null) return '-';
            const colIndex = columns.indexOf(colName);
            const isNumeric = filterDataTypes[colIndex] === 'N';
            if (isNumeric && !isNaN(parseFloat(value))) {
                return `₹ ${parseFloat(value).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            }
            return String(value);
        }, [columns, filterDataTypes]);

        // Handle card long press (for modal)
        const handleCardLongPress = useCallback((item, colors) => {
            setSelectedCard(item);
            setSelectedCardColors(colors);
            setModalVisible(true);
            setIsModalOpen(true);
        }, []);

        // Close modal and unlock list
        const closeModal = useCallback(() => {
            setModalVisible(false);
            setIsModalOpen(false);
        }, []);

        // Initialize lazy loading
        useEffect(() => {
            setLoadedItems({});
            setIsLoadingMore({});
            Object.keys(groupedData).forEach(groupKey => {
                const itemCount = groupedData[groupKey].length;
                setLoadedItems(prev => ({
                    ...prev,
                    [groupKey]: Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, itemCount)
                }));
            });
        }, [filteredData, searchQuery]);

        const toggleGroup = useCallback((groupKey) => {
            setExpandedGroups(prev => ({
                ...prev,
                [groupKey]: !prev[groupKey]
            }));
        }, []);

        // Auto load more when scrolling
        const handleScroll = useCallback((event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isEndReached = layoutMeasurement.height + contentOffset.y >=
                contentSize.height * LAZY_LOAD_CONFIG.THRESHOLD;

            if (isEndReached) {
                Object.keys(groupedData).forEach(groupKey => {
                    const totalCount = groupedData[groupKey]?.length || 0;
                    const currentLoaded = loadedItems[groupKey] || 0;

                    if (currentLoaded < totalCount && !isLoadingMore[groupKey]) {
                        setIsLoadingMore(prev => ({ ...prev, [groupKey]: true }));

                        setTimeout(() => {
                            setLoadedItems(prev => ({
                                ...prev,
                                [groupKey]: Math.min(
                                    currentLoaded + LAZY_LOAD_CONFIG.SUBSEQUENT_BATCH,
                                    totalCount
                                )
                            }));
                            setIsLoadingMore(prev => ({ ...prev, [groupKey]: false }));
                        }, 100);
                    }
                });
            }
        }, [groupedData, loadedItems, isLoadingMore]);

        // Color palette
        const CARD_COLORS = [
            ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
            ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
            ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
            ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
        ];

        // Render group header
        const renderGroupHeader = useCallback((groupKey, index, itemCount) => {
            const colors = CARD_COLORS[index % CARD_COLORS.length];
            const isExpanded = expandedGroups[groupKey] !== false;

            return (
                <TouchableOpacity
                    key={`header-${groupKey}`}
                    onPress={() => toggleGroup(groupKey)}
                    activeOpacity={0.7}
                    style={{
                        marginBottom: 8,
                        marginHorizontal: gridConfig.containerPadding,
                        borderRadius: 10,
                        overflow: 'hidden',
                        elevation: 2,
                    }}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                            padding: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {shouldGroup && (
                                <Icon
                                    name={isExpanded ? "expand-less" : "expand-more"}
                                    size={20}
                                    color="#fff"
                                    style={{ marginRight: 8 }}
                                />
                            )}
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: screenWidth <= 400 ? 13 : 14,
                                    flex: 1,
                                }}
                            >
                                {groupKey}
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginLeft: 8
                        }}>
                            <Text style={{
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: "500",
                            }}>
                                {itemCount}
                            </Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        }, [CARD_COLORS, expandedGroups, shouldGroup, toggleGroup, gridConfig.containerPadding, screenWidth]);



        // Render card
        // Render card (UPDATED CLEAN VERSION)
        const renderCard = useCallback((item, index, groupKey) => {

            const colors = CARD_COLORS[index % CARD_COLORS.length];

            return (
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => handleCardLongPress(item, colors)}      // 👈 CLICK
                    onLongPress={() => handleCardLongPress(item, colors)}  // 👈 HOLD
                    delayLongPress={400}
                    style={{
                        width: gridConfig.cardWidth,
                        minHeight: 265,
                        maxHeight: 350,
                        borderRadius: 12,
                        overflow: "hidden",
                        elevation: 4,
                    }}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            flex: 1,
                            padding: 12,
                        }}
                    >

                        {/* TITLE */}
                        {(item.ParName || item.PrpName) && (
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: "#fff",
                                    fontSize: 15,
                                    fontWeight: "700",
                                    marginBottom: 10,
                                }}
                            >
                                {item.ParName || item.PrpName}
                            </Text>
                        )}

                        {/* CONTENT */}
                        <ScrollView
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            {visibleColumns.map((col) => {

                                const colIndex = columns.indexOf(col);
                                const isNumeric = filterDataTypes[colIndex] === 'N';
                                const value = item[col];
                                const label = labelMap[col] || col;

                                const displayValue =
                                    value !== undefined && value !== null
                                        ? (isNumeric ? formatValue(value, col) : String(value))
                                        : '-';

                                return (
                                    <View
                                        key={col}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            marginBottom: 6,   // 👈 compact spacing
                                        }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: "rgba(255,255,255,0.75)",
                                                fontSize: 11,
                                                width: '48%',
                                            }}
                                        >
                                            {label}
                                        </Text>

                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: "#fff",
                                                fontSize: 12,
                                                fontWeight: isNumeric ? "700" : "500",
                                                textAlign: 'right',
                                                width: '50%',
                                            }}
                                        >
                                            {displayValue}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                    </LinearGradient>
                </TouchableOpacity>
            );

        }, [
            visibleColumns,
            columns,
            filterDataTypes,
            labelMap,
            formatValue,
            gridConfig.cardWidth
        ]);


        // Modal Component
        const CardDetailModal = useCallback(() => {
            if (!selectedCard || !selectedCardColors) return null;

            return (
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={modalVisible}
                    onRequestClose={closeModal}
                    hardwareAccelerated
                >

                    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                        {/* Header */}
                        <LinearGradient
                            colors={selectedCardColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: screenHeight > 800 ? 50 : 40,
                                paddingBottom: 20,
                                paddingHorizontal: 20,
                                borderBottomLeftRadius: 20,
                                borderBottomRightRadius: 20,
                                elevation: 5,
                            }}
                        >
                            <Text style={{
                                color: "#fff",
                                fontSize: screenWidth <= 400 ? 18 : 20,
                                fontWeight: "bold",
                                flex: 1,
                            }}>
                                {selectedCard.ParName || selectedCard.PrpName || 'Details'}
                            </Text>
                            <TouchableOpacity
                                onPress={closeModal}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    borderRadius: 20,
                                    padding: 8,
                                }}
                            >
                                <Icon name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </LinearGradient>

                        {/* Modal Content */}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                            showsVerticalScrollIndicator
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            scrollEventThrottle={16}
                            alwaysBounceVertical={true}
                        >
                            {visibleColumns.map((col, idx) => {
                                const colIndex = columns.indexOf(col);
                                const isNumeric = filterDataTypes[colIndex] === 'N';
                                const value = selectedCard[col];
                                const label = labelMap[col] || col;
                                const displayValue = value !== undefined && value !== null
                                    ? (isNumeric ? formatValue(value, col) : String(value))
                                    : '-';

                                return (
                                    <View
                                        key={col}
                                        style={{
                                            backgroundColor: '#fff',
                                            borderRadius: 12,
                                            padding: 16,
                                            marginBottom: 12,
                                            elevation: 2,
                                        }}
                                    >
                                        <Text style={{
                                            color: '#000',
                                            fontSize: screenWidth <= 400 ? 13 : 14,
                                            fontWeight: '500',
                                            marginBottom: 6,
                                        }}>
                                            {label}
                                        </Text>
                                        <Text style={{
                                            color: '#333',
                                            fontSize: screenWidth <= 400 ? 16 : 18,
                                            fontWeight: isNumeric ? '700' : '500',
                                        }}>
                                            {displayValue}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </Modal>
            );
        }, [selectedCard, selectedCardColors, modalVisible, visibleColumns, columns, filterDataTypes, labelMap, formatValue, screenWidth, screenHeight, closeModal]);

        // Render group content
        const renderGroupContent = useCallback((items, groupKey) => {
            const loadedCount = loadedItems[groupKey] || Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, items.length);
            const displayedItems = items.slice(0, loadedCount);
            const hasMore = loadedCount < items.length;

            const rows = [];

            for (let i = 0; i < displayedItems.length; i += gridConfig.numColumns) {
                const rowItems = displayedItems.slice(i, i + gridConfig.numColumns);
                const isLastRow = i + gridConfig.numColumns >= displayedItems.length;

                rows.push(
                    <View
                        key={`${groupKey}-row-${i}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            marginHorizontal: gridConfig.containerPadding,
                            marginBottom: isLastRow ? 0 : 16,
                        }}
                    >
                        {rowItems.map((item, index) => {
                            const actualIndex = i + index;
                            return (
                                <View
                                    key={`${groupKey}-${actualIndex}`}
                                    style={{
                                        width: gridConfig.cardWidth,
                                        marginRight: index < rowItems.length - 1 ? gridConfig.gap : 0,
                                    }}
                                >
                                    {renderCard(item, actualIndex, groupKey)}
                                </View>
                            );
                        })}
                    </View>
                );
            }

            // Loading indicator
            if (hasMore && isLoadingMore[groupKey]) {
                rows.push(
                    <View key={`${groupKey}-loading`} style={{
                        marginHorizontal: gridConfig.containerPadding,
                        marginTop: 8,
                        marginBottom: 16,
                        padding: 12,
                        alignItems: 'center',
                        backgroundColor: '#f0f0f0',
                        borderRadius: 8,
                    }}>
                        <ActivityIndicator size="small" color="#4A6FA5" />
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                            Loading more...
                        </Text>
                    </View>
                );
            }

            return rows;
        }, [gridConfig, renderCard, loadedItems, isLoadingMore]);

        // Footer
        const Footer = useCallback(() => {
            if (Object.keys(totals).length === 0) return null;

            return (
                <LinearGradient
                    // colors={['#4A6FA5', '#5C85D1']}
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: screenWidth <= 400 ? 12 : 16,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        elevation: 10,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        zIndex: 1000,
                    }}
                >
                    <Text style={{
                        color: "#fff",
                        fontSize: screenWidth <= 400 ? 13 : 14,
                        fontWeight: "700",
                        marginBottom: 10,
                    }}>
                        Totals
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', paddingRight: 20 }}>
                            {Object.entries(totals).map(([col, value]) => (
                                <View key={col} style={{
                                    marginLeft: 16,
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                }}>
                                    <Text style={{
                                        color: "rgba(255,255,255,0.9)",
                                        fontSize: screenWidth <= 400 ? 11 : 12,
                                        fontWeight: "600",
                                    }}>
                                        {labelMap[col]}: {formatValue(value, col)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </LinearGradient>
            );
        }, [totals, labelMap, formatValue, screenWidth]);

        // Empty state
        const EmptyState = useCallback(() => (
            <View style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 40,
                marginTop: 60
            }}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={{
                    color: "#666",
                    fontSize: 16,
                    marginTop: 12,
                    textAlign: 'center'
                }}>
                    No records found
                </Text>
            </View>
        ), []);

        // Main render
        return (
            <View
                style={{ flex: 1, backgroundColor: '#f8f9fa' }}
                pointerEvents="box-none"
            >
                {/* MAIN SCROLLVIEW (Disabled if card is locked or modal is open) */}
                <ScrollView
                    ref={mainScrollRef}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator
                    scrollEnabled={!isCardLocked && !isModalOpen}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {Object.entries(groupedData).length > 0 ? (
                        Object.entries(groupedData).map(([groupKey, items], index) => {
                            const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;

                            return (
                                <View key={groupKey} style={{ marginBottom: 16 }}>
                                    {renderGroupHeader(groupKey, index, items.length)}
                                    {(shouldGroup ? isExpanded : true) && items.length > 0 && (
                                        <View style={{ marginTop: 8 }}>
                                            {renderGroupContent(items, groupKey)}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <EmptyState />
                    )}
                </ScrollView>
                {/* HARD OVERLAY BLOCKER */}
                {isCardLocked && (
                    <View
                        pointerEvents="auto"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'transparent',
                        }}
                    />
                )}

                {/* FIXED FOOTER */}
                <Footer />

                {/* CARD DETAIL MODAL */}
                <CardDetailModal />
            </View>
        );
    };

    // export default AllKeysCardsView;

    const DASHBOARD_COLORS = [
        ['#1A1A2E', '#2D1B69'], // Dark Purple
        ['#0F3460', '#1E5A8A'], // Deep Ocean
        ['#1B5E20', '#2E7D32'], // Forest Green
        ['#333333', '#4F4F4F'], // Charcoal
        ['#5D1049', '#8A235C'], // Dark Magenta
        ['#8B4513', '#A0522D'], // Saddle Brown
        ['#2F4F4F', '#556B2F'], // Dark Slate Gray
        ['#483D8B', '#6A5ACD'], // Slate Blue (not pure blue)
        ['#800020', '#B22222'], // Dark Red
        ['#228B22', '#32CD32'], // Dark Green
    ];


    // const DetailCardGrid = ({ data, searchQuery, onCardPress, activeSlab, isLoadingSummary, getSummaryData }) => {
    //     // Default settings if not provided
    //     const settings = getSummaryData?.[0] || {};
    //     // const settings = getSummaryData?.[0] || {
    //     //     rptcols: "PrpCode,PrpName,ParCode,ParName,ChqNo,ChqDate,nChqDate,ToDaysCollection,CrInBankAccCollection",
    //     //     rptcolslabels: "PrpCode,Property,Party Code,Party,Cheque No,Cheque Date,nChqDate,ToDay Collection,Bank Collection",
    //     //     rptcolswidth: "100,250,0,250,150,150,0,200,200",
    //     //     rptcolsskip: "PrpCode#Property Code",
    //     //     rptgroupcol: "PrpName"
    //     // };

    //     // Parse configuration
    //     const columns = settings.rptcols?.split(',') || [];
    //     const labels = settings.rptcolslabels?.split(',') || [];
    //     const widths = settings.rptcolswidth?.split(',').map(Number) || [];
    //     const groupCol = settings.rptgroupcol || "";
    //     const colSkip = settings.rptcolsskip || "";

    //     // Process skipped columns (format: "key#label,key#label")
    //     const skippedColumns = new Set();
    //     if (colSkip) {
    //         colSkip.split(',').forEach(skipPair => {
    //             const [key] = skipPair.split('#');
    //             if (key) {
    //                 skippedColumns.add(key);
    //             }
    //         });
    //     }

    //     // Filter the "Total" row from the main data
    //     const filteredData = data.filter((item) => item.PrpCode !== "Total");

    //     // Filter the main data based on search query
    //     const searchedData = filteredData.filter((item) =>
    //         Object.values(item).some((val) =>
    //             String(val).toLowerCase().includes(searchQuery.toLowerCase())
    //         )
    //     );

    //     // Check if we should group data
    //     const shouldGroup = groupCol && groupCol.trim() !== "" && searchedData.some(item => item[groupCol]);

    //     // Group data if we have a valid group column
    //     const groupedData = shouldGroup
    //         ? searchedData.reduce((acc, item) => {
    //             const groupKey = item[groupCol];
    //             if (!acc[groupKey]) {
    //                 acc[groupKey] = [];
    //             }
    //             acc[groupKey].push(item);
    //             return acc;
    //         }, {})
    //         : { "All Items": searchedData };

    //     // Get visible columns with correct logic:
    //     // 1. EXCLUDE columns in rptcolsskip (regardless of width)
    //     // 2. INCLUDE columns NOT in rptcolsskip AND width > 0
    //     const visibleColumns = columns.filter(col => {
    //         const colIndex = columns.indexOf(col);
    //         return !skippedColumns.has(col) && widths[colIndex] > 0;
    //     });

    //     // Create label map (only for visible columns)
    //     const labelMap = {};
    //     visibleColumns.forEach(col => {
    //         const colIndex = columns.indexOf(col);
    //         labelMap[col] = labels[colIndex];
    //     });

    //     // Professional color palette
    //     const DASHBOARD_COLORS = [
    //         ['#1A1A2E', '#2D1B69'], ['#0F3460', '#1E5A8A'],
    //         ['#1B5E20', '#2E7D32'], ['#333333', '#4F4F4F'],
    //         ['#5D1049', '#8A235C'], ['#8B4513', '#A0522D'],
    //         ['#2F4F4F', '#556B2F'], ['#483D8B', '#6A5ACD']
    //     ];

    //     // State for expanded/collapsed groups
    //     const [expandedGroups, setExpandedGroups] = useState({});

    //     const toggleGroup = (groupKey) => {
    //         setExpandedGroups(prev => ({
    //             ...prev,
    //             [groupKey]: !prev[groupKey]
    //         }));
    //     };

    //     // Format value based on data type
    //     const formatValue = (value, colName) => {
    //         if (['ToDaysCollection', 'CrInBankAccCollection'].includes(colName) && !isNaN(parseFloat(value))) {
    //             return `₹ ${parseFloat(value).toLocaleString('en-IN', {
    //                 minimumFractionDigits: 2,
    //                 maximumFractionDigits: 2
    //             })}`;
    //         }
    //         return value;
    //     };

    //     // Render group header
    //     const renderGroupHeader = (groupKey, index, itemCount) => {
    //         const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];
    //         const isExpanded = expandedGroups[groupKey] !== false;

    //         return (
    //             <TouchableOpacity
    //                 onPress={() => toggleGroup(groupKey)}
    //                 style={{
    //                     marginBottom: 5,
    //                     borderRadius: 10,
    //                     overflow: 'hidden',
    //                     width: '100%'
    //                 }}
    //             >
    //                 <LinearGradient
    //                     colors={colors}
    //                     style={{
    //                         padding: 15,
    //                         flexDirection: 'row',
    //                         justifyContent: 'space-between',
    //                         alignItems: 'center'
    //                     }}
    //                 >
    //                     <Text style={{
    //                         color: "#fff",
    //                         fontWeight: "bold",
    //                         fontSize: 14
    //                     }}>
    //                         {groupKey} ({itemCount})
    //                     </Text>
    //                     {shouldGroup && (
    //                         <Icon
    //                             name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
    //                             size={24}
    //                             color="#fff"
    //                         />
    //                     )}
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     };

    //     // Render card for each item
    //     const renderCard = (item, index, groupKey) => {
    //         const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];
    //         const isActive = activeSlab === item.PrpCode;

    //         return (
    //             <TouchableOpacity
    //                 style={{
    //                     flex: 1,
    //                     minHeight: 165,
    //                     borderRadius: 8,
    //                     margin: 4,
    //                     overflow: "hidden",
    //                     elevation: 3,
    //                     shadowColor: "#000",
    //                     shadowOpacity: 0.1,
    //                     shadowRadius: 4,
    //                     shadowOffset: { width: 0, height: 2 },
    //                 }}
    //                 activeOpacity={0.9}
    //                 onPress={() => onCardPress(item)}
    //                 disabled={isLoadingSummary}
    //             >
    //                 <LinearGradient
    //                     colors={isActive
    //                         ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]
    //                         : colors}
    //                     style={{
    //                         flex: 1,
    //                         padding: 12,
    //                         justifyContent: "space-between",
    //                     }}
    //                 >
    //                     {visibleColumns.map((col) => {
    //                         const isNumeric = ['ToDaysCollection', 'CrInBankAccCollection'].includes(col);

    //                         return (
    //                             <View key={col} style={{
    //                                 marginBottom: 8,
    //                                 width: '100%',
    //                             }}>
    //                                 <Text style={{
    //                                     color: "rgba(255, 255, 255, 0.8)",
    //                                     fontSize: 10,
    //                                     fontWeight: "500",
    //                                     textAlign: 'right',
    //                                     width: '100%',
    //                                     marginBottom: 2,
    //                                 }}>
    //                                     {labelMap[col]}
    //                                 </Text>
    //                                 <Text style={{
    //                                     color: "#fff",
    //                                     fontSize: 11,
    //                                     fontWeight: "600",
    //                                     textAlign: 'right',
    //                                     width: '100%',
    //                                 }}>
    //                                     {isNumeric
    //                                         ? formatValue(item[col], col)
    //                                         : item[col]}
    //                                 </Text>
    //                             </View>
    //                         );
    //                     })}
    //                 </LinearGradient>
    //             </TouchableOpacity>
    //         );
    //     };

    //     return (
    //         <View style={styles.container}>
    //             <ScrollView
    //                 contentContainerStyle={{ paddingBottom: 80 }}
    //                 showsVerticalScrollIndicator={false}
    //             >
    //                 {Object.keys(groupedData).length > 0 ? (
    //                     Object.entries(groupedData).map(([groupKey, items], index) => {
    //                         const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;
    //                         return (
    //                             <View key={groupKey} style={{
    //                                 marginBottom: 15,
    //                                 width: '100%'
    //                             }}>
    //                                 {renderGroupHeader(groupKey, index, items.length)}
    //                                 {(shouldGroup ? isExpanded : true) && (
    //                                     <View style={{
    //                                         flexDirection: 'row',
    //                                         flexWrap: 'wrap',
    //                                         justifyContent: 'space-between'
    //                                     }}>
    //                                         {items.map((item, itemIndex) =>
    //                                             renderCard(item, itemIndex, groupKey)
    //                                         )}
    //                                     </View>
    //                                 )}
    //                             </View>
    //                         );
    //                     })
    //                 ) : (
    //                     <View style={styles.emptyContainer}>
    //                         <Text style={styles.emptyText}>No data found!</Text>
    //                     </View>
    //                 )}
    //             </ScrollView>
    //         </View>
    //     );
    // };


    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                y: scrollY.current,
                animated: false,
            });
        }
    }, [activeCard, isLoadingSummary]);

    const DetailCardGrid = React.memo(({
        data,
        searchQuery,
        onCardPress,
        activeSlab,
        isLoadingSummary,
        getSummaryData
    }) => {
        // Default settings if not provided
        const settings = getSummaryData?.[0] || {};

        // Parse configuration
        const columns = settings.rptcols?.split(',') || [];
        const labels = settings.rptcolslabels?.split(',') || [];
        const widths = settings.rptcolswidth?.split(',').map(Number) || [];
        const sumFields = settings.rptsumfields?.split(',').map(Number) || [];
        const filterDataTypes = settings.rptfilterdatatype?.split(',') || [];
        const groupCol = settings.rptgroupcol || "";
        const colSkip = settings.rptcolsskip || "";

        // Process skipped columns
        const skippedColumns = new Set();
        if (colSkip) {
            colSkip.split(',').forEach(skipPair => {
                const [key] = skipPair.split('#');
                if (key) skippedColumns.add(key);
            });
        }

        // Filter the "Total" row from the main data
        const filteredData = data.filter((item) => item.PrpCode !== "Total");

        // Filter the main data based on search query
        const searchedData = filteredData.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );

        // Check if we should group data
        const shouldGroup = groupCol && groupCol.trim() !== "" && searchedData.some(item => item[groupCol]);

        // Group data if we have a valid group column
        const groupedData = shouldGroup
            ? searchedData.reduce((acc, item) => {
                const groupKey = item[groupCol];
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(item);
                return acc;
            }, {})
            : { "All Items": searchedData };

        // Get visible columns with correct logic
        const visibleColumns = columns.filter(col => {
            const colIndex = columns.indexOf(col);
            return !skippedColumns.has(col) &&
                !(shouldGroup && col === groupCol) &&
                widths[colIndex] > 0;
        });

        // Create label map
        const labelMap = {};
        columns.forEach((col, i) => {
            labelMap[col] = labels[i] || col;
        });

        // Calculate totals
        const calculateTotals = () => {
            const totals = {};
            columns.forEach((col, index) => {
                if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
                    totals[col] = searchedData.reduce(
                        (sum, item) => sum + parseFloat(item[col] || 0),
                        0
                    );
                }
            });
            return totals;
        };

        const totals = calculateTotals();

        // Professional color palette
        const DASHBOARD_COLORS = [
            ['#1A1A2E', '#2D1B69'], ['#0F3460', '#1E5A8A'],
            ['#1B5E20', '#2E7D32'], ['#333333', '#4F4F4F'],
            ['#5D1049', '#8A235C'], ['#8B4513', '#A0522D'],
            ['#2F4F4F', '#556B2F'], ['#483D8B', '#6A5ACD']
        ];

        // State for expanded/collapsed groups
        const [expandedGroups, setExpandedGroups] = useState({});

        const toggleGroup = (groupKey) => {
            setExpandedGroups(prev => ({
                ...prev,
                [groupKey]: !prev[groupKey]
            }));
        };

        // Format value
        const formatValue = (value, colName) => {
            if (value === undefined || value === null) return '-';

            const colIndex = columns.indexOf(colName);
            const isNumeric = filterDataTypes[colIndex] === 'N';

            if (isNumeric && !isNaN(parseFloat(value))) {
                return `₹ ${parseFloat(value).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            }
            return String(value);
        };

        const { width: screenWidth } = useWindowDimensions();

        // Responsive grid configuration
        const getGridConfig = () => {
            if (screenWidth <= 400) {
                return {
                    numColumns: 2,
                    cardWidth: (screenWidth - 48) / 2,
                    margin: 12,
                    gutter: 12
                };
            } else if (screenWidth <= 600) {
                return {
                    numColumns: 2,
                    cardWidth: (screenWidth - 48) / 2,
                    margin: 12,
                    gutter: 12
                };
            } else if (screenWidth <= 900) {
                return {
                    numColumns: 3,
                    cardWidth: (screenWidth - 64) / 3,
                    margin: 12,
                    gutter: 12
                };
            } else {
                return {
                    numColumns: 4,
                    cardWidth: (screenWidth - 80) / 4,
                    margin: 12,
                    gutter: 12
                };
            }
        };

        const gridConfig = getGridConfig();

        // Render group header
        const renderGroupHeader = (groupKey, index, itemCount) => {
            const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];
            const isExpanded = expandedGroups[groupKey] !== false;

            return (
                <TouchableOpacity
                    key={`header-${groupKey}`}
                    onPress={() => toggleGroup(groupKey)}
                    style={{
                        marginBottom: 8,
                        marginHorizontal: gridConfig.margin,
                        borderRadius: 10,
                        overflow: 'hidden',
                        elevation: 2,
                    }}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                            padding: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {shouldGroup && (
                                <Icon
                                    name={isExpanded ? "expand-less" : "expand-more"}
                                    size={20}
                                    color="#fff"
                                    style={{ marginRight: 8 }}
                                />
                            )}
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: screenWidth <= 400 ? 13 : 14,
                                    flex: 1,
                                }}
                                numberOfLines={1}
                            >
                                {groupKey}
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginLeft: 8,
                        }}>
                            <Text style={{
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: "500",
                            }}>
                                {itemCount}
                            </Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        };

        // Render card for each item - UPDATED with right-aligned stacked layout
        const renderCard = (item, index, groupKey) => {
            const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];
            const isActive = activeSlab === item.PrpCode;

            // Calculate card height based on number of visible columns
            const cardHeight = Math.max(140, visibleColumns.length * 45 + 50);

            return (
                <TouchableOpacity
                    key={`${groupKey}-${index}-${item.PrpCode || index}`}
                    style={{
                        width: gridConfig.cardWidth,
                        height: cardHeight,
                        borderRadius: 8,
                        marginBottom: gridConfig.gutter,
                        overflow: "hidden",
                        elevation: 3,
                    }}
                    activeOpacity={0.9}
                    onPress={() => {
                        console.log("Card Pressed:", item.PrpCode);
                        setActiveCard(item.PrpCode);
                        handleConfirmActionNew(item?.PrpCode, item);
                    }}
                    disabled={isLoadingSummary}
                >
                    <LinearGradient
                        colors={isActive
                            ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]
                            : colors}
                        style={{
                            flex: 1,
                            padding: 12,
                        }}
                    >
                        {isLoadingSummary && isActive ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 10, marginTop: 6 }}>
                                    Loading...
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Title at top - right aligned */}
                                {/* <View style={{
                                    marginBottom: 12,
                                    paddingBottom: 8,
                                    borderBottomWidth: 1,
                                    borderBottomColor: 'rgba(255,255,255,0.2)',
                                    alignItems: 'flex-end',
                                }}>
                                    <Text style={{
                                        color: "#fff",
                                        fontSize: screenWidth <= 400 ? 13 : 14,
                                        fontWeight: "bold",
                                        textAlign: 'right',
                                    }} numberOfLines={1}>
                                        {item.PrpCode || item.PrpName || 'N/A'}
                                    </Text>
                                </View> */}

                                {/* Dynamic columns - stacked vertically, both right aligned */}
                                <View style={{ flex: 1 }}>
                                    {visibleColumns.length > 0 ? (
                                        visibleColumns.map((col) => {
                                            const colIndex = columns.indexOf(col);
                                            const isNumeric = filterDataTypes[colIndex] === 'N';
                                            const value = item[col];
                                            const label = labelMap[col] || col;

                                            return (
                                                <View
                                                    key={col}
                                                    style={{
                                                        marginBottom: 8,
                                                        alignItems: 'flex-end',
                                                        width: '100%',
                                                    }}
                                                >
                                                    {/* Label - right aligned */}
                                                    <Text style={{
                                                        color: "rgba(255, 255, 255, 0.6)",
                                                        fontSize: screenWidth <= 400 ? 10 : 11,
                                                        fontWeight: "400",
                                                        textAlign: 'right',
                                                        marginBottom: 2,
                                                    }} numberOfLines={1}>
                                                        {label}
                                                    </Text>

                                                    {/* Value - right aligned, larger and bold */}
                                                    <Text style={{
                                                        color: "#fff",
                                                        fontSize: screenWidth <= 400 ? 11 : 12,
                                                        fontWeight: isNumeric ? "700" : "500",
                                                        textAlign: 'right',
                                                    }} numberOfLines={1}>
                                                        {value !== undefined && value !== null
                                                            ? (isNumeric ? formatValue(value, col) : String(value))
                                                            : '-'}
                                                    </Text>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <Text style={{
                                            color: '#fff',
                                            textAlign: 'right',
                                            fontSize: 11
                                        }}>
                                            No data to display
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            );
        };

        // Footer with calculated totals - UPDATED with right alignment
        const Footer = () => {
            if (Object.keys(totals).length === 0) return null;

            return (
                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: screenWidth <= 400 ? 10 : 12,
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: -2 },
                    }}
                >
                    <Text style={{
                        color: "#fff",
                        fontSize: screenWidth <= 400 ? 11 : 12,
                        fontWeight: "600",
                        marginBottom: 8,
                    }}>
                        Summary Totals
                    </Text>

                    {Object.entries(totals).map(([col, value]) => {
                        const colIndex = columns.indexOf(col);
                        return (
                            <View
                                key={col}
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    paddingVertical: 4,
                                }}
                            >
                                <Text style={{
                                    color: "rgba(255,255,255,0.8)",
                                    fontSize: screenWidth <= 400 ? 10 : 11,
                                    fontWeight: "500",
                                    flex: 1
                                }}>
                                    {labelMap[col]}:
                                </Text>
                                <Text style={{
                                    color: "#fff",
                                    fontSize: screenWidth <= 400 ? 10 : 11,
                                    fontWeight: "600",
                                }}>
                                    {formatValue(value, col)}
                                </Text>
                            </View>
                        );
                    })}
                </LinearGradient>
            );
        };

        // Render items in grid format
        const renderItemsInGrid = (items, groupKey) => {
            const rows = [];
            for (let i = 0; i < items.length; i += gridConfig.numColumns) {
                const rowItems = items.slice(i, i + gridConfig.numColumns);
                rows.push(
                    <View
                        key={`${groupKey}-row-${i}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            marginHorizontal: gridConfig.margin,
                            gap: gridConfig.gutter,
                        }}
                    >
                        {rowItems.map((item, index) =>
                            renderCard(item, i + index, groupKey)
                        )}
                        {/* Fill empty slots */}
                        {rowItems.length < gridConfig.numColumns &&
                            Array(gridConfig.numColumns - rowItems.length)
                                .fill(null)
                                .map((_, index) => (
                                    <View
                                        key={`empty-${index}`}
                                        style={{ width: gridConfig.cardWidth }}
                                    />
                                ))
                        }
                    </View>
                );
            }
            return rows;
        };

        return (
            <View style={[styles.container, { backgroundColor: '#f8f9fa' }]}>
                <ScrollView
                    ref={scrollRef}
                    onScroll={(e) => {
                        scrollY.current = e.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={16}
                    contentContainerStyle={{
                        paddingTop: 12,
                        paddingBottom: 100
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.keys(groupedData).length > 0 ? (
                        Object.entries(groupedData).map(([groupKey, items], index) => {
                            const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;
                            return (
                                <View key={groupKey} style={{ marginBottom: 16 }}>
                                    {renderGroupHeader(groupKey, index, items.length)}
                                    {(shouldGroup ? isExpanded : true) && (
                                        <View>
                                            {renderItemsInGrid(items, groupKey)}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <View style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            padding: 40,
                            marginTop: 60
                        }}>
                            <Icon name="search-off" size={48} color="#ccc" />
                            <Text style={{
                                color: "#666",
                                fontSize: 16,
                                marginTop: 12,
                                textAlign: 'center'
                            }}>
                                No records found
                            </Text>
                        </View>
                    )}
                </ScrollView>
                <Footer />
            </View>
        );
    });

    // const SexeDetailsModal = ({
    //     visible,
    //     onClose,
    //     title,
    //     data,
    //     searchQuery,
    //     setSearchQuery,
    //     payload, // Add payload as prop
    // }) => {
    // Filter data based on search query
    const filteredData12 = useMemo(() =>
        exeData.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(sexeSearchQuery.toLowerCase())
            )
        ),
        [exeData, sexeSearchQuery]
    );

    // Dark colors for cards
    const CARD_COLORS = [
        ["#1A1A2E", "#2D1B69"], // Dark Purple
        ["#0F3460", "#1E5A8A"], // Deep Ocean
        ["#1B5E20", "#2E7D32"], // Forest Green
        ["#333333", "#4F4F4F"], // Charcoal
        ["#5D1049", "#8A235C"], // Dark Magenta
        ["#8B4513", "#A0522D"], // Saddle Brown
        ["#2F4F4F", "#556B2F"], // Dark Slate Gray
        ["#483D8B", "#6A5ACD"], // Slate Blue
    ];

    // Responsive grid configuration
    const { width: screenWidth } = useWindowDimensions();
    const getGridConfig = () => {
        if (screenWidth <= 600) return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
        else if (screenWidth <= 900) return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
        else return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
    };
    const gridConfig = getGridConfig();
    const getGridConfig123 = () => {
        // if (screenWidth <= 500) return { numColumns: 1, cardWidth: (screenWidth - 48) / 1, margin: 12, gutter: 12 };
        if (screenWidth <= 600) return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
        else if (screenWidth <= 900) return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
        else return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
    };
    const gridConfig123 = getGridConfig123();

    // Render card for each item
    const renderCard = (item, index) => {
        const colors = getSexeLoading ? ["#C0C0C0", "#C0C0C0"] : CARD_COLORS[index % CARD_COLORS.length];
        const isAllCard = item.SalesExecutive === "ALL";

        // Calculate totals for "ALL" card
        const totalToDaysCollection = filteredData12.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.ToDaysCollection || '0'),
            0
        );
        const totalCrInBankAccCollection = filteredData12.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.CrInBankAccCollection || '0'),
            0
        );

        return (
            <TouchableOpacity
                key={item.Code || index}
                style={{
                    width: gridConfig123.cardWidth,
                    minHeight: isAllCard ? 160 : 120, // Taller card for "ALL"
                    borderRadius: 8,
                    marginBottom: gridConfig123.gutter,
                    overflow: "hidden",
                    elevation: 3,
                    backgroundColor: "#121212",
                    borderWidth: isAllCard ? 1 : 0,
                    borderColor: isAllCard ? theme.BRAND_GRADIENT_END : "transparent",
                }}
                activeOpacity={0.9}
                onPress={() => {
                    if (!getSexeLoading) {
                        setLoadingStates({ [item.Code || "ALL"]: true });
                        setSelectedSexeName(item.SalesExecutive);
                        handleLoadPressSEXE(item);
                    }
                }}
                disabled={getSexeLoading} // Disable only during global loading
            >
                <LinearGradient
                    // colors={isAllCard ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END] : colors}
                    colors={colors}
                    style={{ flex: 1, padding: 12 }}
                >
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        {/* Sales Executive Name */}
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: isAllCard ? 16 : 14,
                                fontWeight: isAllCard ? "bold" : "bold",
                                textAlign: 'right',
                                marginBottom: 4,
                            }}
                        >
                            {item.SalesExecutive}
                        </Text>

                        {/* Code (skip for "ALL") */}
                        {!isAllCard && (
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                                marginBottom: 8,
                            }}>
                                Code: {item.SExe}
                            </Text>
                        )}

                        {/* Today's Collection */}
                        <View style={{ marginBottom: 6 }}>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Today's Collection:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalToDaysCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.ToDaysCollection}
                            </Text>
                        </View>

                        {/* Credit in Bank */}
                        <View>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Credit in Bank:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalCrInBankAccCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.CrInBankAccCollection}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };


    // Render items in grid format
    const renderItemsInGrid = () => {
        // Sort to ensure "ALL" card is first
        const sortedData = [...filteredData12].sort((a, b) =>
            a.SalesExecutive === "ALL" ? -1 : b.SalesExecutive === "ALL" ? 1 : 0
        );

        const rows = [];
        for (let i = 0; i < sortedData.length; i += gridConfig123.numColumns) {
            const rowItems = sortedData.slice(i, i + gridConfig123.numColumns);
            rows.push(
                <View
                    key={`row-${i}`}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        marginHorizontal: gridConfig123.margin,
                        gap: gridConfig123.gutter,
                    }}
                >
                    {rowItems.map((item, index) => renderCard(item, i + index))}
                </View>
            );
        }
        return rows;
    };


    // return (
    //     <Modal
    //         visible={visible}
    //         animationType="slide"
    //         onRequestClose={onClose}
    //     >
    //         {/* <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)" }}> */}
    //         <View style={{ flex: 1}}>
    //             <View style={{
    //                 flex: 1,
    //                 // backgroundColor: "#121212", // Dark modal background
    //                 backgroundColor: "rgb(255, 255, 255)", // Dark modal background
    //                 margin: 10,
    //                 // borderRadius: 10,
    //                 // borderWidth: 1,
    //                 // borderColor: "#333",
    //             }}>
    //                 {/* Header */}
    //                 <View style={{
    //                     flexDirection: "row",
    //                     justifyContent: "space-between",
    //                     alignItems: "center",
    //                     padding: 12,
    //                     borderBottomWidth: 1,
    //                     borderBottomColor: "#333",
    //                     backgroundColor: theme.BRAND_GRADIENT_END,
    //                     borderTopLeftRadius: 10,
    //                     borderTopRightRadius: 10,
    //                 }}>
    //                     <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
    //                         {title}
    //                     </Text>
    //                     <TouchableOpacity onPress={onClose}>
    //                         <Icon name="close" size={24} color="#fff" />
    //                     </TouchableOpacity>
    //                 </View>

    //                 {/* Search */}
    //                 <TextInput
    //                     placeholder="Search..."
    //                     value={searchQuery}
    //                     onChangeText={setSearchQuery}
    //                     style={{
    //                         padding: 10,
    //                         borderWidth: 1,
    //                         borderColor: "rgba(0, 0, 0, 0.1)",
    //                         borderRadius: 5,
    //                         margin: 10,
    //                         fontSize: 11,
    //                         color: "#000",
    //                         backgroundColor: "#fff",
    //                     }}
    //                     placeholderTextColor="#999"
    //                 />

    //                 {/* Content */}
    //                 <ScrollView
    //                     contentContainerStyle={{ paddingBottom: 20 }}
    //                     showsVerticalScrollIndicator={false}
    //                     keyboardShouldPersistTaps="handled" // Fix search rerender focus issue
    //                 >
    //                     {filteredData.length > 0 ? (
    //                         renderItemsInGrid()
    //                     ) : (
    //                         <View style={{
    //                             flex: 1,
    //                             justifyContent: "center",
    //                             alignItems: "center",
    //                             padding: 40,
    //                             marginTop: 60
    //                         }}>
    //                             <Icon name="search-off" size={48} color="#666" />
    //                             <Text style={{
    //                                 color: "#666",
    //                                 fontSize: 16,
    //                                 marginTop: 12,
    //                                 textAlign: 'center'
    //                             }}>
    //                                 No records found
    //                             </Text>
    //                         </View>
    //                     )}
    //                 </ScrollView>
    //             </View>
    //         </View>
    //     </Modal>
    // );
    // };



    const handleConfirmActionNew = useCallback(async (prpcode, card) => {
        // setIsLoadingSummary(true);
        console.log('handleConfirmActionNew prpcode:', prpcode, 'card:', card);
        // card.PrpCode
        setIsLoadingSummary(true);
        // const payload = {
        //     prptype: form?.PrpOf,
        //     prpcodes: [prpcode],
        //     action: 'collect_report',
        //     txntype: "mob_daily_collection_report",
        //     rpttype: 0
        // };
        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode, // Convert array to comma-separated string
            action: 'collect_report',
            txntype: "mob_daily_collection_report",
            rpttype: 0,
            sexe: form?.SexeCode || {},
            fromdate: formatDate(form.fromdate), // Convert to dd-mm-yyyy
            todate: formatDate(form.todate)
        }
        await SalesExeMain(card.PrpCode, payload); // Pass payload

    }, [form]);

    console.log('🔵 form', form);

    const cachedata = AsyncStorage.getItem('master_sync_data');

    // const handleMasterSync = async () => {
    //     try {
    //         const mastersyncData = await AsyncStorage.getItem('master_sync_data');
    //         setMasSync(mastersyncData);
    //     } catch (error) {

    //     } finally {

    //     }
    // };

    useEffect(() => {
        const initializeApp123 = async () => {
            try {
                const mas = await AsyncStorage.getItem('master_sync_data_common');
                setMasSync(JSON.parse(mas as any));
            } catch (error) {
                console.error("Initialization error:", error);

            } finally {
                // setIsLoading(false);
            }
        };

        initializeApp123();
    }, []);


    const SalesExeMain = async (prpcode, payload) => {
        // setLoadingStates(true);

        // setIsLoadingSummary(true);
        console.log('🔵 SalesExeMain calling (API)...', payload);
        //  const payload = {
        //     prptype: form?.PrpOf || "",
        //     prpcodes: form.PrpCode, // Convert array to comma-separated string
        //     action: 'collect_report',
        //     txntype: "mob_daily_collection_report",
        //     rpttype: 0,
        //     sexe: form?.SexeCode || {},
        //     fromdate: formatDate(form.fromdate), // Convert to dd-mm-yyyy
        //     todate: formatDate(form.todate)
        // }
        const detailPayload = {
            ...payload,
            prpcodes: [prpcode],
            sexe: [],
            // sexe: form?.SexeCode || {},

        }
        console.log('🔵 detailPayload', detailPayload);
        setDetailPayload(detailPayload);
        // setSexeLoading(true);
        setSexeLoading(true);
        // setTimeout(async () => {
        try {
            // const payloadSexe = {
            //     prptype: form.PrpOf,
            //     prpcode: prpcode,
            //     yearno: currentYear?.toString(),
            //     user_id: "1"
            // };
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const [year, month, day] = dateStr.split('-');
                return `${day}-${month}-${year}`;
            };
            const payloadSexe = {
                prptype: form?.PrpOf || "",
                prpcodes: detailPayload.prpcodes, // Convert array to comma-separated string
                action: 'collect_report',
                txntype: "mob_daily_collection_report",
                rpttype: 2,
                sexe: form?.SexeCode || [],
                // fromdate: formatDate(form.fromdate), // Convert to dd-mm-yyyy
                fromdate: detailPayload.fromdate, // Convert to dd-mm-yyyy
                // todate: formatDate(form.todate)
                todate: detailPayload.todate
            }
            console.log('🔵 detailPayload sexe', payloadSexe);
            // const responsesexe = await axios.get(
            //     `${API}/api/collection_crud`,
            //     getRequestConfig({ params: payloadSexe })
            // );
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const responsesexe = await axios.post(`${API}/api/collection_crud`, payloadSexe, { headers });
            console.log('🔵 DHRUMIL final summary\'s sexe:', payloadSexe, responsesexe);
            if (responsesexe.data.success) {
                setSexeLoading(false);
                // setLoadingStates(false);
                setIsLoadingSummary(false);
                const apiData = responsesexe?.data?.data?.data || [];

                // Custom object (ALL)
                const customItem = {
                    PrpCode: apiData[0]?.PrpCode || "",
                    PrpName: apiData[0]?.PrpName || "",
                    SExe: "",
                    SalesExecutive: "ALL",
                    ToDaysCollection: "",
                    CrInBankAccCollection: ".00"
                };

                // Merge custom object + API response
                const finalData = [customItem, ...apiData];

                setExeData(finalData as any);
                // setExeData(responsesexe.data.data.data);
                setSexeModalVisible(true);
            }
        } catch (error) {
            setSexeLoading(false);
            // setLoadingStates(false);
            console.error("Error:", error);
            setIsLoadingSummary(true);
        } finally {
            // Reset ONLY this card's loading state
            setLoadingStates(prev => ({ ...prev, [prpcode]: false }));
            setSexeLoading(false);
        }
        // }, 1000);
    }



    const SalesExe = useCallback(async () => {
        // console.log('🔵 cachedata', JSON.parse(cachedata));
        console.log("🔵 cachedata", masSync);
        // setdashPartyLoading(true);
        // setdashSexeLoading(true);
        try {
            const matchedEntry = masSync.find(item => item.prptype === form.PrpOf);
            const prpcode = matchedEntry ? matchedEntry.prpcode : null;

            const payloadSexe = {

                prptype: form.PrpOf,
                prpcode: prpcode,
                // txntype: "mob_collection",
                yearno: currentYear?.toString(),
                user_id: "1"
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json'
            }

            console.log("🔵 dashSexe API Response", payloadSexe);

            // const responsesexe = await axios.get(
            //     `${API}/api/get_mob_salesexe`,
            //     {
            //         headers: {
            //             Authorization: `Bearer ${token}`,
            //             'Content-Type': 'application/javascript',
            //             Accept: 'application/json'
            //         },
            //         params: {
            //             payloadSexe
            //         },



            //     }

            //     // payloadSexe,
            //     // { headers }
            // );

            const responsesexe = await axios.get(
                `${API}/api/get_mob_salesexe`,
                getRequestConfig({ params: payloadSexe })
            );

            console.log('🔵 dashSexe API Response:', payloadSexe, responsesexe);


            if (responsesexe.data.success === true) {
                // setdashSexeLoading(false);
                console.log('🔵 dashSexe API Response:', payloadSexe, responsesexe);
                const mainData = responsesexe.data.response.data;
                setExeDataCRT(mainData)
                // const maindataSexe = responsesexe.data.response.data;
                // setdashSexe(maindataSexe);
            }
        } catch (error) {
            // setdashPartyLoading(false);
            // setdashSexeLoading(false);
            console.error("Token check error:", error);
        }
    }, [form, currentYear]);

    useEffect(() => {
        console.log('🔵 cachedata', form.PrpOf);
        if (form.PrpOf) {
            console.log('🔵 cachedata', form.PrpOf);
            SalesExe();
        }

    }, [form.PrpOf]);



    const onDashboardCardPress = (card) => {
        setActiveCard(card.PrpCode);
        handleConfirmActionNew(card?.PrpCode, card);
    };

    // Add this function to handle card press
    const handleSexeCardPress = (item) => {
        setSelectedSexeCard(item);
        setSexeModalVisible(true);
        console.log('Selected Sexe Card:', item);
    };


    return (
        <>
            {/* <Footer
                onLogout={() => setIsLoggedIn(false)}
                isConnected={isConnected}
                totalAmount={gePOTData.reduce((sum, item) => sum + parseFloat(item.Amount || '0'), 0)}
            /> */}

            <GestureHandlerRootView style={{ flex: 1 }}>

                {/* <HeaderBarwithBack
                userName={username}
                // onSearch={setSearchQuery}
                header={'Cheque Entry'}
                subHeader={'Manage your cheque records'}
            /> */}
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQueryPOT}
                    placeholder="Search reports..."
                />
                {/* <View style={crlimtreq_styles.container_list}> */}
                <View style={crlimtreq_styles.container_list123}>
                    {isLoading ? <FullScreenLoader message="Loading..." /> : (<><View style={crlimtreq_styles.container}>
                        {/* Top-right List Icon */}
                        <TouchableOpacity style={crlimtreq_styles.listIconContainer} onPress={openDrawer}>
                            <Icon name="list" size={24} color="white" />
                        </TouchableOpacity>

                        {/* <TouchableOpacity style={crlimtreq_styles.listIconContaineradd} onPress={() => handleAdd()}>
                            
                            <Icon name="add" size={24} color="white" />
                            <Text style={crlimtreq_styles.listIconText}>Add Cheque</Text>
                        </TouchableOpacity> */}

                        {/* DetailTable Component */}
                        {gePOTData.length > 0 ? (
                            <>
                                {/* <DetailTable
                                    data={gePOTData}
                                    searchQuery={searchQueryPOT}
                                /> */}
                                <DetailCardGrid
                                    data={gePOTData}
                                    searchQuery={searchQueryPOT}
                                    onCardPress={onDashboardCardPress}
                                    activeSlab={activeCard}
                                    isLoadingSummary={isLoadingSummary} // Add this prop.
                                    getSummaryData={getSummaryData}
                                />


                                {/* <SexeCardGrid
                                    data={exeData}
                                    searchQuery={sexeSearchQuery}
                                    onCardPress={handleSexeCardPress}
                                    activeSlab={selectedSexeCard?.Code}
                                    isLoading={isLoading}
                                /> */}

                                {/* <SexeDetailsModal
                                    visible={sexeModalVisible}
                                    onClose={() => setSexeModalVisible(false)}
                                    title={selectedSexeCard?.SalesExecutive || 'Sales Executive Details'}
                                    data={exeData}
                                    searchQuery={sexeSearchQuery}
                                    setSearchQuery={setSexeSearchQuery}
                                    payload={getpayload} // Pass the payload
                                /> */}
                                <Modal
                                    visible={sexeModalVisible}
                                    animationType="slide"
                                    onRequestClose={() => setSexeModalVisible(false)}
                                >
                                    {/* <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)" }}> */}
                                    <View style={{ flex: 1 }}>
                                        <View style={{
                                            flex: 1,
                                            // backgroundColor: "#121212", // Dark modal background
                                            backgroundColor: "rgb(255, 255, 255)", // Dark modal background
                                            margin: 10,
                                            // borderRadius: 10,
                                            // borderWidth: 1,
                                            // borderColor: "#333",
                                        }}>
                                            {/* Header */}
                                            <View style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#333",
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                borderTopLeftRadius: 10,
                                                borderTopRightRadius: 10,
                                            }}>
                                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                                    {selectedSexeCard?.SalesExecutive || 'Sales Executive Details'}
                                                </Text>
                                                <TouchableOpacity onPress={() => setSexeModalVisible(false)}>
                                                    <Icon name="close" size={24} color="#fff" />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Search */}
                                            {getSexeLoading ? (
                                                <View style={{
                                                    padding: 12,
                                                    borderWidth: 1,
                                                    borderColor: "rgba(0, 0, 0, 0.1)",
                                                    borderRadius: 5,
                                                    margin: 10,
                                                    // fontSize: 11,
                                                    // color: "#000",
                                                    backgroundColor: "#fff",
                                                    display: "flex",
                                                }}>
                                                    <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />
                                                    {/* <Text>Loading...</Text> */}
                                                </View>
                                            ) : (
                                                <TextInput
                                                    placeholder="Search..."
                                                    value={sexeSearchQuery}
                                                    onChangeText={setSexeSearchQuery}
                                                    style={{
                                                        padding: 10,
                                                        borderWidth: 1,
                                                        borderColor: "rgba(0, 0, 0, 0.1)",
                                                        borderRadius: 5,
                                                        margin: 10,
                                                        fontSize: 11,
                                                        color: "#000",
                                                        backgroundColor: "#fff",
                                                    }}
                                                    placeholderTextColor="#999"
                                                />
                                            )}



                                            {/* Content */}
                                            <ScrollView
                                                contentContainerStyle={{ paddingBottom: 20 }}
                                                showsVerticalScrollIndicator={false}
                                                keyboardShouldPersistTaps="handled" // Fix search rerender focus issue
                                            >
                                                {filteredData12.length > 0 ? (
                                                    renderItemsInGrid()
                                                ) : (
                                                    <View style={{
                                                        flex: 1,
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        padding: 40,
                                                        marginTop: 60
                                                    }}>
                                                        <Icon name="search-off" size={48} color="#666" />
                                                        <Text style={{
                                                            color: "#666",
                                                            fontSize: 16,
                                                            marginTop: 12,
                                                            textAlign: 'center'
                                                        }}>
                                                            No records found
                                                        </Text>
                                                    </View>
                                                )}
                                            </ScrollView>
                                            <View style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: screenWidth <= 400 ? 10 : 12,
                                                borderTopLeftRadius: 12,
                                                borderTopRightRadius: 12,
                                                elevation: 8,
                                                shadowColor: "#000",
                                                shadowOpacity: 0.2,
                                                shadowRadius: 6,
                                                shadowOffset: { width: 0, height: -2 },
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                zIndex: 1000,
                                            }}>
                                                <Text style={{
                                                    color: "#fff",
                                                    fontSize: screenWidth <= 400 ? 11 : 12,
                                                    fontWeight: "600",
                                                    marginBottom: 8,
                                                }}>
                                                    Totals
                                                </Text>

                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }}>
                                                    {/* ToDaysCollection Total */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Today's Collection:
                                                        </Text>
                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredData12.reduce((sum, item) => sum + parseFloat(item.ToDaysCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>
                                                    </View>

                                                    {/* CrInBankAccCollection Total */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Credit in Bank:
                                                        </Text>
                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredData12.reduce((sum, item) => sum + parseFloat(item.CrInBankAccCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                        </View>
                                    </View>
                                </Modal>


                            </>

                        ) : (
                            <>
                                <View style={crlimtreq_styles.noDataContainer}>
                                    <Text style={crlimtreq_styles.noDataText}>No data available</Text>
                                </View>
                            </>
                        )}


                        {/* Main Content: Replace Text with ProdOrderTrackingTable */}
                        {/* <CollectionCard gePOTData={gePOTData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} onDelete={(item) => handleDelete(item)} onAuthorize={handleAuthorizeFromList} setIsLoggedIn={setIsLoggedIn}
                            isConnected={isConnected} fromDate={fromDate} toDate={toDate} hasDailyCollectionReport={hasDailyCollectionReport} /> */}
                    </View></>)}
                </View>

                <CustomDrawer
                    isVisible={isDrawerVisible}
                    onClose={closeDrawer}
                    fromDate={fromDate}
                    toDate={toDate}
                    selectedYear={selectedYear}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    onYearChange={setSelectedYear}
                    onLoadPress={handleLoadPress}
                    exeData={exeData}
                    exeDataCRT={exeDataCRT}
                    onExeChange={setSelectedExeCRT}
                    selectedExe={selectedExeCRT?.SalesExecutive || 'Select Executive'}
                    designData={designData}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    // onDesignSelect={handleDesignSelect}
                    // onItemSelectItem={handleItemSelect}
                    selectedDesigns={selectedDesigns}
                    // setSelectedDesigns={setSelectedDesigns}
                    // setSelectedItems={setSelectedItems}
                    selectedItems={selectedItems}
                    itemData={itemData}
                    getPropertyGroupData={getPropertyGroupData}
                    getPropertyData={getPropertyData}
                    setSelectedProperty={setSelectedProperty}
                    setSelectedPropertyGroup={setSelectedPropertyGroup}
                    selectedProperty={selectedProperty}
                    selectedPropertyGroup={selectedPropertyGroup}
                    setForm={setForm}
                    setIsLoggedIn={setIsLoggedIn}
                    isConnected={isConnected}
                    setSelectedSexe={setSelectedSexe}
                    SelectedSexe={SelectedSexe}
                    form={form}

                // selectedItemStatus={selectedItemStatus}
                // onItemStatusChange={handleItemStatusChange}
                />
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}>
                        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10 }}>
                            {/* Header */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#eee",
                                    backgroundColor: theme.BRAND_GRADIENT_END,
                                    borderTopLeftRadius: 10,
                                    borderTopRightRadius: 10,
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                    Details - ({getSelectedSexeName})
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    setModalVisible(false);
                                    setSelectedSexeName(null);
                                }
                                }>
                                    <Icon name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Search */}
                            <TextInput
                                placeholder="Search..."
                                value={searchQueryPOT}
                                onChangeText={setSearchQueryPOT}
                                style={{
                                    padding: 5,
                                    borderWidth: 1,
                                    borderColor: "#ddd",
                                    borderRadius: 5,
                                    margin: 10,
                                    fontSize: 11,
                                    color: "#000",
                                }}
                            />

                            {/* All Keys Cards View */}
                            <AllKeysCardsView data={getDetailsData} searchQuery={searchQueryPOT} getDetailsDataSetting={getDetailsDataSetting} />
                        </View>
                    </View>
                </Modal>
            </GestureHandlerRootView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    contentContainer: {
        paddingBottom: 80,
    },
    dashboardCard: {
        flex: 1,
        minHeight: 165,
        borderRadius: 8,
        margin: 4,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    dashboardCardInner: {
        flex: 1,
        padding: 12,
        justifyContent: "space-between",
    },
    dashboardCaption: {
        fontSize: 13,
        color: "white",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 8,
    },
    cardDetails: {
        flex: 1,
        padding: 8,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 4,
    },
    detailRowContainer: {
        marginBottom: 8,
        width: '100%',
    },
    cardDetailLabel: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 10,
        fontWeight: "500",
        textAlign: 'right',
        marginBottom: 2,
    },
    cardDetailValue: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
        textAlign: 'right',
    },
    footerContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "transparent",
        elevation: 6,
        zIndex: 1000,
    },
    footerInner: {
        padding: 12,
        borderRadius: 8,
    },
    footerInnerDetails: {
        padding: 12,
        // borderRadius: 8,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
        width: '100%',
    },
    footerLabel: {
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: 11,
        fontWeight: "500",
    },
    footerValue: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        color: "#666",
        fontSize: 16,
    },
});


const modalStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    modalContent: {
        flex: 1,
        backgroundColor: "#fff",
        margin: 5,
        borderRadius: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },
    searchInput: {
        padding: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 5,
        margin: 10,
        fontSize: 11,
    },
});


export default DailyCollectionReport;
