import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// import { encode as base64_encode } from 'react-native-base64';
import { crlimtreq_styles } from '@/common/Style';
import FullScreenLoader from '@/components/FullScreenLoader';
// import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
// import HeaderBar from '../HeaderBar/HeaderBar';
import HeaderBar from '@/components/Header';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { API } from '../../common/API/dynamicAPI';
import { fetchCurrentYearData, fetchPropertyData, generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/Functions';
import CollectionCard from './CollectionCard';
import CustomDrawer from './CustomDrawer';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list';
}
interface PropertyData {
    PrpCode: string;
    LngName: string;
    ShtName: string;
    PrpOf: string;
    PrpOfFull: string;
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
    username: string;
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

const CollectionList: React.FC<Props> = ({ token, username }) => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const filterKey = 'all';
    const [isLoading, setIsLoading] = useState(false);
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
    const [getYearData, setYearData] = useState<YearData>();
    const [getBankData, setBankData] = useState<BankData[]>([]);
    const [getBranchData, setBranchData] = useState<BranchData[]>([]);
    const [getPartyData, setPartyData] = useState<PartyData[]>([]);
    const [partyList, setPartyList] = useState<CardData[]>([]);
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
    const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
    const [selectedParty, setSelectedParty] = useState<PartyData | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankData | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
    const [selected, setSelected] = useState<Party | null>();
    const [selectedbank, setSelectedbank] = useState<BankData | null>();
    const [selectedbranch, setSelectedbranch] = useState<BranchData | null>();
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    const [form, setForm] = useState({
        EDate: "",
        PrpCode: "",
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
    const currentDate = new Date();
    const currentYear12 = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear12);
    const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYearMain());
    const [selectedExe, setSelectedExe] = useState(null);
    const [exeData, setExeData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [itemData, setItemData] = useState([]);
    const [page, setpage] = useState(0);
    const [selectedDesigns, setSelectedDesigns] = useState([])
    const [selectedItems, setSelectedItems] = useState([])
    const [selectedItemStatus, setSelectedItemStatus] = useState('All');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [hasDailyCollectionReport, setHasDailyCollectionReport] = useState<boolean>(false);

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
    const [getpayload, setPayload] = useState([])


    // useEffect(() => {
    //     if (rightsMenuApps && rightsMenuApps.length > 0) {
    //         const hasReport = rightsMenuApps.some(
    //             (item) => item?.title === "Daily Collection Report"
    //         );
    //         setHasDailyCollectionReport(hasReport);
    //         console.log("🔵 Has Daily Collection Report:", hasReport);
    //     }
    // }, [rightsMenuApps]);

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
        if (!token) return;
        const loadProperty = async () => {
            const getdata = await fetchPropertyData(token);
            const getyeardata = await fetchCurrentYearData(token);
            setPropertyData(getdata);
            setYearData(getyeardata as YearData);
            console.log("prp & year", getdata, getyeardata);
        };

        loadProperty();
    }, [token]);

    let currentYear = getYearData?.data;

    console.log("🔵 Got Property at collection", getPropertyData, "🔵 Got Year at collection", currentYear);
    console.log("🔵 Got Selected Property", selectedProperty);
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
                AppAlert.alert('Error', 'Server error');
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
                AppAlert.alert('Error', 'Server error');
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

    const fetchBankData = async (gotSelectedPrp: PropertyData) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setBankLoading(true);
        setBranchLoading(true);

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = { prpcode: gotSelectedPrp?.PrpCode, yearno: currentYear?.toString(), txntype: 'receipt' };
            console.log('🔵 payload bank', payload);
            // const response = await axios.get(`https://apig.tms-webapp.com/api/getbanklist`, getRequestConfigBank({
            const response = await axios.get(`${API}/api/getbanklist`, getRequestConfigBank({
                params: {
                    ...payload
                }
            }));
            // const responsebranch = await axios.get(`https://apig.tms-webapp.com/api/getbranchlist`, getRequestConfigBank({
            const responsebranch = await axios.get(`${API}/api/getbranchlist`, getRequestConfigBank({
                params: {
                    ...payload
                }
            }));
            console.log('🔵 payload bank', payload);
            console.log('🔵 bank account response', response);
            if (response.data.success && response.data.response.data.length > 0) {
                const bankgot = response.data.response.data;
                setBankLoading(false);
                // Add a unique `uid` to each object

                setBankData(bankgot);
            } else {
                setBankLoading(false);
                setBankData([]);
            }
            if (responsebranch.data.success && responsebranch.data.response.data.length > 0) {
                const branchgot = responsebranch.data.response.data;
                setBranchLoading(false);
                // Add a unique `uid` to each object

                setBranchData(branchgot);
            } else {
                setBranchLoading(false);
                setBranchData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                setBankLoading(false);
                setBranchLoading(false);
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            // setIsLoading(false);
        }
    };



    useEffect(() => {
        if (selectedProperty !== null) {
            // clear any previously selected party when property changes
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedbranch(null);

            let gotSelectedPrp = selectedProperty;
            // fetchPartyData(gotSelectedPrp);
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
    }, [selectedProperty]);



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
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be equal to Old Limit for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (updatedItem.CrLimit === '0' || parseFloat(updatedItem.CrLimit) === 0) {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be 0 for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (parseFloat(updatedItem.CrLimit) < 0) {
                AppAlert.alert(
                    'Validation Error',
                    'Requested Limit cannot be negative for Party Name: ' + updatedItem.parname
                )
                return false;
            } else if (!updatedItem.CrLimit || updatedItem.CrLimit.trim() === '') {
                AppAlert.alert(
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
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: form.PrpCode,
            action: 'browse',
            isauth: "1",
            txntype: "mob_collection",
        });
        const payload = {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: form.PrpCode,
            action: 'browse',
            txntype: "mob_collection",
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
            console.log('🔵 payload browse', params);
            console.log('🔵 browse response', response);
            if (response.data.success && Array.isArray(response.data.data.main) && response.data.data.main.length > 0) {
                // main list and d1 array from server
                const mainList = response.data.data.main as any[];
                const d1List = Array.isArray(response.data.data.d1) ? response.data.data.d1 as any[] : [];

                // Attach all matching d1 rows to each main card by UId
                const mainWithD1 = mainList.map(m => {
                    const uidKey = String(m.UId ?? m.uid ?? '');
                    const matches = d1List.filter(d => String(d.UId ?? d.uid ?? '') === uidKey);
                    return { ...m, d1: matches };
                });

                setIsLoading(false);
                setIsDrawerVisible(false);
                setPOTData(mainWithD1 as any);
            } else {
                setIsLoading(false);
                setPOTData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                setIsLoading(false);
                AppAlert.alert('Error', 'Server error');
                setPOTData([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (item: any) => {
        if (!item) return;
        // confirm already done in CollectionCard; still double-check if needed
        const uid = String(item.UId ?? item.uid ?? item.UId ?? '');
        if (!uid) {
            AppAlert.alert('Delete', 'Item has no uid, cannot delete.');
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
                AppAlert.alert('Deleted', 'Record deleted successfully.');
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
                AppAlert.alert('Delete failed', String(resp?.data?.message ?? 'Server error'));
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error('delete error', err);
                AppAlert.alert('Error', 'Delete failed — server error.');
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
            console.log('Authorise response', res);

            if (res?.data?.success) {
                AppAlert.alert('Success', 'Collection authorised successfully.');
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
                AppAlert.alert('Error', msg);
            }
        } catch (err) {
            console.error('authorise api error', err);
            AppAlert.alert('Error', 'Server error when authorising.');
        } finally {
            setIsLoading(false);
        }
    };



    useEffect(() => {
        if (!token) return;
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
    }, [token]);


    const handleAdd = async () => {
        // if (onEdit) { onEdit(item); return; }
        try {
            // await AsyncStorage.setItem('collection_edit', JSON.stringify(item));
            await AsyncStorage.setItem('collection_mode', 'add');
            // navigate if desired
            // @ts-ignore
            // navigation.navigate('CollectionAdd' as never);
            router.replace('/CollectionAdd')
        } catch (e) { console.error(e); AppAlert.alert('Error', 'Could not open editor.'); }
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);


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
                    placeholder="Search data..."
                />
                <View style={crlimtreq_styles.container_list}>
                    {isLoading ? <FullScreenLoader message="Loading..." /> : (<><View style={crlimtreq_styles.container}>
                        {/* Top-right List Icon */}
                        <TouchableOpacity style={crlimtreq_styles.listIconContainer} onPress={openDrawer}>
                            <Icon name="list" size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={crlimtreq_styles.listIconContaineradd} onPress={() => handleAdd()}>
                            {/* <Icon name="list" size={24} color="white" /> */}
                            <Icon name="add" size={24} color="white" />
                            <Text style={crlimtreq_styles.listIconText}>Add Cheque</Text>
                        </TouchableOpacity>

                        {/* Main Content: Replace Text with ProdOrderTrackingTable */}
                        <CollectionCard gePOTData={gePOTData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} onDelete={(item) => handleDelete(item)} onAuthorize={handleAuthorizeFromList}
                            fromDate={fromDate} toDate={toDate} hasDailyCollectionReport={hasDailyCollectionReport} />
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
                    onExeChange={setSelectedExe}
                    selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
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
                    getPropertyData={getPropertyData}
                    setSelectedProperty={setSelectedProperty}
                    selectedProperty={selectedProperty}
                    setForm={setForm}
                    yearOptions={yearOptions}
                // selectedItemStatus={selectedItemStatus}
                // onItemStatusChange={handleItemStatusChange}
                />
                {/* <ChequeForm
                token={token}
                isConnected={isConnected}
                username={username}
                getPropertyData={getPropertyData}
                getPartyData={getPartyData}
                setSelectedProperty={setSelectedProperty}
                selectedProperty={selectedProperty}
                setSelectedParty={setSelectedParty}
                selectedParty={selectedParty}
                selected={selected}
                setSelected={setSelected}
                getBankData={getBankData}
                getBranchData={getBranchData}
                // setBankData={setBankData}
                setSelectedBank={setSelectedBank}
                selectedBank={selectedBank}
                selectedBranch={selectedBranch}
                setSelectedbank={setSelectedbank}
                setSelectedbranch={setSelectedbranch}
                selectedbank={selectedbank}
                selectedbranch={selectedbranch}
                getPartyLoading={getPartyLoading}
                getBankLoading={getBankLoading}
                getBranchLoading={getBranchLoading}
                form={form}
                setForm={setForm}
                ShowChequeData={ShowChequeData}
                initialLoading={initialLoading}
                // setInitialLoading,
                initialModalVisible={initialModalVisible}
                setInitialModalVisible={setInitialModalVisible}
                onSavePart1={async (payload) => {
                    // Example: call your API to save part1
                    try {
                        // replace with your actual endpoint & headers
                        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
                        console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                        const params = { ...getResponse, ...payload, ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""), EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""), txntype: "mob_collection", action: "add", d1delete: [] };
                        // Example axios call (uncomment if you want it now)
                        console.log('[ChequeForm] part1 payload', params);
                        const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', params, { headers });
                        console.log('[ChequeForm] part1 res', res);
                        if (!res.data.success) {
                            return Promise.reject(res.data.message);
                        }

                        // return res.data;

                        return Promise.resolve({ success: true });
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }}
                onSavePart2={async (payload) => {
                    try {
                        // const res = await axios.post('https://apig.tms-webapp.com/api/save_cheque_part2', payload, { headers: {...} });
                        console.log('[ChequeForm] part2 payload', payload);
                        return Promise.resolve({ success: true });
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }}
            /> */}
            </GestureHandlerRootView>
        </>
    );
};
export default CollectionList;
