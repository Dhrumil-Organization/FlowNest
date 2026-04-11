import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import ChequeForm from './ChequeForm';
import {
    fetchPropertyData,
    fetchCurrentYearData,
    getPrptypeFolder,
    getPrptypeIndex,
    writePrptypeCache,
    addPrptypeToIndex,
    loadAllPrptypeCaches,
    normalizePrptype,
    readPrptypeCache,
    saveLargeData
} from '../../common/API/Functions';
import { SuccessModal } from '../Shared/SuccessModal';
import { API } from '../../common/API/dynamicAPI';
import { generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/Functions';

// ========== INTERFACES ==========
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

interface PaymentData {
    paycode: string;
    paytype: string;
}

interface YearData {
    data: number;
}

interface BankData {
    BankName: string;
}

interface AdjData {
    UROWID: string;
    BILLFROM: string;
    TTYPE: string;
    PARCODE: string;
    ACCNAME: string;
    VOUNO: string;
    NVOUDATE: string;
    BILLNO: string;
    NBILLDATE: string;
    BILLQTY: string;
    NETAMT: string;
    BALAMT: string;
    BALAMT1: string;
    ZUID: string;
    ZSRNO: string;
    CONTRANAME: string;
    DueDay: string;
    NVOUDATE1: string;
    ORDERNO: string;
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

interface Party {
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
}

// ========== HELPER FUNCTIONS ==========
const loadDataInBatches = async (
    data: T[],
    setState: React.Dispatch<React.SetStateAction<T[]>>,
    dataType: string,
    batchSize: number = 200
): Promise<void> => {
    if (!data || data.length === 0) {
        console.log(`⚪ No ${dataType} data to load`);
        return;
    }
    console.log(`📥 Loading ${data.length} ${dataType} in batches...`);
    setState([]); // Clear existing data
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        setState(prev => [...prev, ...batch]);
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
    }
    console.log(`✅ Loaded all ${dataType}`);
};

const isoToDDMMYYYY = (iso?: string): string => {
    if (!iso) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const [yyyy, mm, dd] = iso.split('-');
        return `${dd}-${mm}-${yyyy}`;
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

const ddMMYYYYToISO = (ddMMYYYY?: string): string => {
    if (!ddMMYYYY) return '';
    const [dd, mm, yyyy] = ddMMYYYY.split('-');
    return `${yyyy}-${mm}-${dd}`;
};

// ========== MAIN COMPONENT ==========
const Collection: React.FC<Props> = ({
    token,
    isConnected,
    username,
    navigation
}) => {
    // ========== STATE MANAGEMENT (ALL YOUR EXISTING STATES) ==========
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [getLocationLoading, setLocationLoading] = useState(false);
    const [allhistoryLoading, setIsAllHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [getPartyLoading, setPartyLoading] = useState(false);
    const [getBankLoading, setBankLoading] = useState(false);
    const [getAdjLoading, setAdjLoading] = useState(false);
    const [getPaymentLoading, setPaymentLoading] = useState(false);
    const [getBranchLoading, setBranchLoading] = useState(false);
    const [getSuccess, setSuccess] = useState(false);
    const [getSaveLoading, setSaveLoading] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [historyData, setHistoryData] = useState<CardData[]>([]);
    const [getPropertyData, setPropertyData] = useState<PropertyData[]>([]);
    const [getYearData, setYearData] = useState<YearData>();
    const [getBankData, setBankData] = useState<BankData[]>([]);
    const [getAdjData, setAdjData] = useState<AdjData[]>([]);
    const [getPaymentData, setPaymentData] = useState<PaymentData[]>([]);
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
    const [activeTab, setActiveTab] = useState<'party'>('party');
    const [activeTab1, setActiveTab1] = useState<'account requests'>('account requests');
    const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
    const [selectedParty, setSelectedParty] = useState<PartyData | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankData | null>(null);
    const [selectedAdj, setSelectedAdj] = useState<AdjData | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
    const [selected, setSelected] = useState<Party | null>();
    const [selectedbank, setSelectedbank] = useState<BankData | null>();
    const [selectedadj, setSelectedadj] = useState<AdjData | null>();
    const [selectedpayment, setSelectedpayment] = useState<PaymentData | null>();
    const [selectedbranch, setSelectedbranch] = useState<BranchData | null>();
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    const [form, setForm] = useState({
        EDate: new Date().toISOString().split('T')[0],
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
        PayType: "",
        ParAdd: "",
        TDSAmt: "",
        DisAmt: "",
    });
    const [getResponse, setResponse] = useState<any>();
    const [cardData, setCardData] = useState<string | null>(null);
    const [getCardDataMode, setCardDataMode] = useState<string | null>(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successModalPayload, setSuccessModalPayload] = useState<any>(null);
    const currentDate = new Date();
    const currentYear12 = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear12);

    // ========== CACHE MANAGEMENT ==========
    const prptypeCacheRef = useRef<Record<string, any>>({});
    const [prptypeCacheReady, setPrptypeCacheReady] = useState(false);
    const cancelTokenRef = useRef<axios.CancelTokenSource | null>(null);

    let currentYear = getYearData?.data;
    // ========== PRELOAD CACHES ==========
    useEffect(() => {
        let cancelled = false;
        const preload = async () => {
            try {
                console.log('⚡ Preloading master-sync caches...');
                const { prptypes } = await getPrptypeIndex();
                console.log(`📋 Found ${prptypes.length} prptypes in index`);

                for (const prptype of prptypes) {
                    if (cancelled) break;
                    try {
                        const cache = await readPrptypeCache(prptype, (type, loaded, total) => {
                            console.log(`Loading ${prptype} ${type}: ${loaded}/${total}`);
                        });
                        if (cache) {
                            prptypeCacheRef.current[prptype] = cache;
                            const a = Array.isArray(cache.account) ? cache.account.length : 0;
                            const b = Array.isArray(cache.banks) ? cache.banks.length : 0;
                            const c = Array.isArray(cache.branches) ? cache.branches.length : 0;
                            if (a + b + c > 0) {
                                console.log(`🔎 ${prptype} — accounts:${a}, banks:${b}, branches:${c}`);
                            }
                        }
                    } catch (err) {
                        console.warn(`Failed to load cache for ${prptype}:`, err);
                    }
                }
                if (!cancelled) {
                    setPrptypeCacheReady(true);
                    console.log('✅ Cache preloaded with', Object.keys(prptypeCacheRef.current).length, 'prptypes');
                }
            } catch (err) {
                console.warn('Preload failed:', err);
                setPrptypeCacheReady(true);
            }
        };
        preload();
        return () => { cancelled = true; };
    }, []);

    // ========== HELPER FUNCTIONS ==========
    const ensureCancelToken = () => {
        if (cancelTokenRef.current) {
            try { cancelTokenRef.current.cancel('new-request'); } catch { }
        }
        cancelTokenRef.current = axios.CancelToken.source();
    };

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelTokenRef.current?.token,
    });

    const getToken = () => token;

    // ========== UPDATED FETCH FUNCTIONS WITH CACHE + BATCH LOADING ==========
    const fetchPartyData = async (gotSelectedPrp: PropertyData, forceRefresh: boolean | 'background' = false) => {
        const prpcode = gotSelectedPrp?.PrpCode ?? '';
        const yearno = getYearData?.data?.toString() ?? '';
        const prptypeRaw = gotSelectedPrp?.PrpOf ?? gotSelectedPrp?.PrpCode ?? '';
        const prptype = normalizePrptype(prptypeRaw);

        console.log(`🔍 Loading accounts for prptype="${prptype}"...`);

        // 1. Try cache first
        const cachedData = await readPrptypeCache(prptype, { loadAccounts: true });
        if (cachedData?.account?.length) {
            console.log(`✅ Found ${cachedData.account.length} accounts in cache`);
            await loadDataInBatches(cachedData.account, setPartyData, 'accounts');
            return;
        }

        // 2. Fetch from API if cache fails
        console.log('⚠️ No cache found, fetching from API...');
        const payload = {
            prpcode,
            prptype,
            yearno,
            strcode: "0",
            txntype: "sales_order",
            partytype: "p",
            type: "s",
            page: 1,
            limit: 20,
            search: "",
            isceo: 0,
            partype: 0,
            grntype: "",
            fetch: "",
            acccode: "",
            billdate: "",
            strtype: "",
            isfaint: "",
            user_id: 1,
        };

        try {
            const response = await axios.get(
                `${API}/api/mobaccountbasic`,
                getRequestConfig({ params: payload })
            );

            if (response.data?.success && Array.isArray(response.data.response?.data)) {
                const accounts = response.data.response.data;
                console.log(`🌐 Fetched ${accounts.length} accounts from API`);

                // Save to cache for next time
                const cacheData = {
                    prptype,
                    prpcode,
                    yearno,
                    account: accounts,
                    banks: [],
                    branches: [],
                    lastUpdated: new Date().toISOString(),
                };
                await saveLargeData(prptype, cacheData);

                // Load to UI
                await loadDataInBatches(accounts, setPartyData, 'accounts');
            } else {
                console.warn('⚪ No account data received');
                setPartyData([]);
            }
        } catch (error) {
            console.error('❌ Failed to load accounts:', error);
            setPartyData([]);
        } finally {
            setPartyLoading(false);
        }
    };

    const fetchBankData = async (gotSelectedPrp: PropertyData, forceRefresh: boolean | 'background' = false) => {
        const prpcode = gotSelectedPrp?.PrpCode ?? '';
        const yearno = getYearData?.data?.toString() ?? '';
        const prptype = normalizePrptype(gotSelectedPrp?.PrpOf ?? gotSelectedPrp?.PrpCode);

        console.log(`🔍 Loading banks/branches for prptype="${prptype}"...`);

        // 1. Try cache first
        const cachedData = await readPrptypeCache(prptype, {
            loadAccounts: false,
            loadBanks: true,
            loadBranches: true,
        });

        let banksLoaded = !!cachedData?.banks?.length;
        let branchesLoaded = !!cachedData?.branches?.length;

        if (banksLoaded) {
            console.log(`✅ Found ${cachedData.banks.length} banks in cache`);
            setBankData(cachedData.banks);
        }

        if (branchesLoaded) {
            console.log(`✅ Found ${cachedData.branches.length} branches in cache`);
            setBranchData(cachedData.branches);
        }

        if (banksLoaded && branchesLoaded) {
            console.log('✅ Both banks & branches loaded from cache');
            return;
        }

        // 2. Fetch missing data from API
        const payload = { prpcode, prptype, yearno, txntype: 'receipt', user_id: 1 };

        if (!banksLoaded) {
            console.log('🌐 Fetching banks from API...');
            try {
                // const res = await axios.get(`https://apig.tms-webapp.com/api/getmobbanklist`, getRequestConfigBank({
                const res = await axios.get(`${API}/api/getmobbanklist`, getRequestConfigBank({
                    params: { ...payload },
                    cancelToken: cancelTokenRef.current?.token,
                }));

                if (res.data?.success && Array.isArray(res.data.response?.data)) {
                    const banks = res.data.response.data;
                    console.log(`🌐 Fetched ${banks.length} banks from API`);
                    setBankData(banks);

                    // Update cache
                    const currentCache = await readPrptypeCache(prptype) || {};
                    await saveLargeData(prptype, { ...currentCache, banks });
                }
            } catch (error) {
                console.error('❌ Failed to load banks:', error);
                if (!cachedData?.banks?.length) setBankData([]);
            }
        }

        if (!branchesLoaded) {
            console.log('🌐 Fetching branches from API...');
            try {
                const res = await axios.get(
                    // `https://apig.tms-webapp.com/api/getmobbranchlist`,
                    `${API}/api/getmobbranchlist`,
                    getRequestConfigBank({
                        params: { ...payload },
                        cancelToken: cancelTokenRef.current?.token,
                    }));

                if (res.data?.success && Array.isArray(res.data.response?.data)) {
                    const branches = res.data.response.data;
                    console.log(`🌐 Fetched ${branches.length} branches from API`);
                    setBranchData(branches);

                    // Update cache
                    const currentCache = await readPrptypeCache(prptype) || {};
                    await saveLargeData(prptype, { ...currentCache, branches });
                }
            } catch (error) {
                console.error('❌ Failed to load branches:', error);
                if (!cachedData?.branches?.length) setBranchData([]);
            }
        }
    };

    // ========== YOUR EXISTING FUNCTIONS (ALL UNCHANGED) ==========
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const card_data_str = await AsyncStorage.getItem('collection_edit');
                const card_mode = await AsyncStorage.getItem('collection_mode');
                const parsed = card_data_str ? JSON.parse(card_data_str) : null;
                setCardData(parsed);
                setCardDataMode(card_mode);
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initializeApp();
    }, []);

    useEffect(() => {
        const loadProperty = async () => {
            const getdata = await fetchPropertyData(token);
            const getyeardata = await fetchCurrentYearData(token);
            setPropertyData(getdata);
            setYearData(getyeardata as YearData);
            console.log("prp & year", getdata, getyeardata);
        };
        loadProperty();
        fetchPaymentData();
    }, [token]);

    const ShowChequeData = async (formParam?: any) => {
        setInitialLoading(true);
        console.log('🔵 show cheque calling (API)...', formParam);
        if (cancelTokenRef.current?.cancel) cancelTokenRef.current.cancel();
        cancelTokenRef.current = axios.CancelToken.source();
        setPartyLoading(true);
        const headers = {
            Authorization: `Bearer ${token}`,
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
            const response = await axios.post(
                // `https://apig.tms-webapp.com/api/collection_crud`,
                `${API}/api/collection_crud`,
                payload,
                { headers, cancelToken: cancelTokenRef.current?.token }
            );
            console.log('🔵 show cheque response', response);
            if (response.data.success == true) {
                let d1 = [];
                let main = [];
                main = response.data.data.main;
                d1 = response.data.data.d1;
                setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
                setForm(prev => ({
                    ...prev,
                    ...main[0],
                    UId: main[0].UId,
                    EDate: new Date().toISOString().split('T')[0],
                    d1: d1
                }));
            }
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

    const ShowChequeDataEdit = async (cardData?: any) => {
        setInitialLoading(true);
        console.log('🔵 show cheque calling (API)...', cardData, cardData.UId);
        if (cancelTokenRef.current?.cancel) cancelTokenRef.current.cancel();
        cancelTokenRef.current = axios.CancelToken.source();
        setPartyLoading(true);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = {
                uid: cardData?.UId ?? cardData.UId ?? 0,
                prpcode: cardData?.PrpCode ?? cardData.PrpCode ?? "",
                EDate: isoToDDMMYYYY(cardData?.EDate ?? cardData.EDate ?? ""),
                txntype: "mob_collection",
                action: "view",
            };
            console.log('🔵 show edit cheque payload', payload);
            const response = await axios.post(
                // `https://apig.tms-webapp.com/api/collection_crud`,
                `${API}/api/collection_crud`,
                payload,
                { headers, cancelToken: cancelTokenRef.current?.token }
            );
            console.log('🔵 show edit cheque response', response);
            if (response.data.success == true) {
                let d1 = [];
                let main = [];
                main = response.data.data.main;
                d1 = response.data.data.d1;
                setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
                setForm(prev => ({
                    ...prev,
                    ...main[0],
                    ChqDate: ddMMYYYYToISO(main[0].ChqDate),
                    EDate: ddMMYYYYToISO(main[0].EDate),
                    UId: main[0].UId,
                    d1: d1
                }));
            }
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

    const getRequestConfigAdj = (props: any) => {
        let params = props.params ? props.params : null;

        let requestconfig = {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json'
            },
            params
        };
        console.log('🔵 show adj payload', requestconfig);
        return requestconfig;
    };

    const ShowAdjustmentData = async () => {
        setAdjLoading(true);
        if (cancelTokenRef.current?.cancel) cancelTokenRef.current.cancel();
        cancelTokenRef.current = axios.CancelToken.source();
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = {
                prpcode: form.PrpCode ?? "",
                yearno: getYearData?.data?.toString() ?? '',
                parcode: form.AccCode ?? "",
                page: 1,
                limit: 20,
                search: "",
                edate: isoToDDMMYYYY(form.EDate ?? ""),
                selecteduid: [],
                uid: form.UId ?? 0,
                type: "R",
                ttype: [
                    "1", "2", "3", "4", "5", "6", "13", "22", "30", "87",
                    "43", "73", "89", "90", "76", "77", "68"
                ]
            };
            // const response = await axios.post(`https://apig.tms-webapp.com/api/adjustment`, getRequestConfigAdj({
            const response = await axios.post(`${API}/api/adjustment`, getRequestConfigAdj({
                params: {
                    prpcode: form.PrpCode ?? "",
                    yearno: currentYear?.toString?.() ?? '',
                    parcode: form.AccCode ?? "",
                    page: 1,
                    limit: 20,
                    search: "",
                    edate: isoToDDMMYYYY(form.EDate ?? ""),
                    selecteduid: [],
                    uid: form.UId ?? 0,
                    // uid: 630002175,
                    type: "R",
                    ttype: [
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "13",
                        "22",
                        "30",
                        "87",
                        "43",
                        "73",
                        "89",
                        "90",
                        "76",
                        "77",
                        "68"
                    ]
                }
            }),
                { headers });
            console.log('🔵 show adj response', response);
            if (response.data.success == true) {
                setAdjLoading(false);
                const adjData = response.data.response.data;
                setAdjData(adjData);
            } else {
                setAdjData([]);
                setAdjLoading(false);
            }
        } catch (error) {
            setAdjLoading(false);
            setAdjData([]);
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        }
    };

    const getRequestConfigBank = props => {
        let params = props.params ? props.params : null;

        let requestconfig = {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json',
                'x-platform': 'mob',
            },
            params
        };
        return requestconfig;
    };

    const fetchPaymentData = async () => {
        if (cancelTokenRef.current?.cancel) cancelTokenRef.current.cancel();
        cancelTokenRef.current = axios.CancelToken.source();
        setPaymentLoading(true);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = { fetch: 'paymenttype', txntype: 'mob_collection' };
            console.log('🔵 payload payment', payload);
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfigBank({
                    params: {
                        ...payload
                    }
                }));

            console.log('🔵 payload payment', payload);
            console.log('🔵 payment data response', response);
            if (response.data.success && response.data.response.data.length > 0) {
                const bankgot = response.data.response.data;
                setPaymentLoading(false);
                setPaymentData(bankgot);
            } else {
                setPaymentLoading(false);
                setPaymentData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                setPaymentLoading(false);
                Alert.alert('Error', 'Server error');
            }
        }
    };

    // ========== USE EFFECTS ==========
    useEffect(() => {
        if (getCardDataMode == 'edit') {
            ShowChequeDataEdit(cardData);
        } else if (getCardDataMode == 'add') {
            ShowChequeData(cardData);
        }
    }, [getCardDataMode]);

    useEffect(() => {
        if (selectedProperty !== null) {
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedpayment(null);
            setSelectedbranch(null);
            let gotSelectedPrp = selectedProperty;
            console.log('gotSelectedPrp', gotSelectedPrp);
            fetchPartyData(gotSelectedPrp, false);
            fetchBankData(gotSelectedPrp, false);
        } else {
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedpayment(null);
            setSelectedbranch(null);
        }
    }, [selectedProperty]);

    useEffect(() => {
        ShowAdjustmentData();
    }, [form.AccCode, selectedParty]);

    // ========== SAVE FUNCTIONS ==========
    const origSavePart2 = async (payload: any) => {
        if (getCardDataMode == 'edit') {
            try {
                setSaveLoading(true);
                const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
                const d1 = (form && form.d1) ?? payload.d1 ?? [];
                const amount = parseFloat(form.Amount) || 0;

                const setAmtSum = d1.reduce((sum, item) => {
                    const setAmt = parseFloat(item.SetAmt) || 0;
                    return sum + setAmt;
                }, 0);

                console.log('setAmtSum', setAmtSum, amount);

                if (setAmtSum > amount) {
                    setSaveLoading(false);
                    Alert.alert(
                        "Validation Error",
                        "The total of adjustment amounts cannot exceed the cheque amount. Please reduce the adjustment amounts and try again.",
                        [{ text: "OK" }]
                    );
                    return;
                }

                console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                delete payload.d2;

                const isValueEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
                const isAllObjectValuesEmpty = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return true;
                    const keys = Object.keys(obj);
                    if (keys.length === 0) return true;
                    return keys.every(k => isValueEmpty(obj[k]));
                };

                let adjType = 'ADJ';
                if (!d1 || (Array.isArray(d1) && d1.length === 0)) {
                    adjType = 'ACC';
                } else if (Array.isArray(d1) && d1.length === 1 && isAllObjectValuesEmpty(d1[0])) {
                    adjType = 'ACC';
                }

                // const params = {
                //     ...getResponse,
                //     ...payload,
                //     UId: payload.UId,
                //     ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                //     EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                //     ParAdd: payload.ParAdd || form.ParAdd,
                //     txntype: "mob_collection",
                //     action: "edit",
                //     AdjType: adjType,
                //     d1delete: []
                // };
                const params = {
                    ...getResponse,
                    ...payload,
                    UId: payload.UId,
                    // ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                    ChqDate: (payload.PayType === 'NEFT' || payload.PayType === 'RTGS' || form.PayType === 'NEFT' || form.PayType === 'RTGS')
                        ? (payload.ChqDate ? isoToDDMMYYYY(payload.ChqDate) : isoToDDMMYYYY(payload.EDate))
                        : isoToDDMMYYYY(payload.ChqDate ?? ""),
                    EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                    PayType: payload.PayType || form.PayType,
                    ParAdd: payload.ParAdd || form.ParAdd,
                    txntype: "mob_collection",
                    action: "edit",
                    AdjType: adjType,
                    TDSAmt: payload?.TDSAmt || form?.TDSAmt || "",
                    DisAmt: payload?.DisAmt || form?.DisAmt || "",
                    d1delete: []
                };

                console.log('[ChequeForm] final edit payload', params);
                const res = await axios.post(
                    // 'https://apig.tms-webapp.com/api/collection_crud',
                    `${API}/api/collection_crud`,
                    params,
                    { headers }
                );
                console.log('[ChequeForm] part1 res', res);
                if (!res.data.success) {
                    setSaveLoading(false);
                    return Promise.reject(res.data.message);
                }
                setSaveLoading(false);
                return res.data;
            } catch (err) {
                setSaveLoading(false);
                return Promise.reject(err);
            }
        } else {
            try {
                setSaveLoading(true);
                const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

                // === START: Validation for SetAmt sum <= Amount ===
                const d1 = (form && form.d1) ?? payload.d1 ?? [];
                const amount = parseFloat(form.Amount) || 0;

                // Calculate sum of all SetAmt in d1
                const setAmtSum = d1.reduce((sum, item) => {
                    const setAmt = parseFloat(item.SetAmt) || 0;
                    return sum + setAmt;
                }, 0);

                console.log('setAmtSum', setAmtSum, amount);

                // Check if sum > Amount
                if (setAmtSum > amount) {
                    setSaveLoading(false);
                    Alert.alert(
                        "Validation Error",
                        "The total of adjustment amounts cannot exceed the cheque amount. Please reduce the adjustment amounts and try again.",
                        [{ text: "OK" }]
                    );
                    return;
                }
                console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                delete payload.d2;

                // const d1 = (form && form.d1) ?? payload.d1 ?? null;
                const isValueEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
                const isAllObjectValuesEmpty = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return true;
                    const keys = Object.keys(obj);
                    if (keys.length === 0) return true;
                    return keys.every(k => isValueEmpty(obj[k]));
                };

                let adjType = 'ADJ';
                if (!d1 || (Array.isArray(d1) && d1.length === 0)) {
                    adjType = 'ACC';
                } else if (Array.isArray(d1) && d1.length === 1 && isAllObjectValuesEmpty(d1[0])) {
                    adjType = 'ACC';
                }

                const params = {
                    ...getResponse,
                    ...payload,
                    UId: payload.UId,
                    // ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                    ChqDate: (payload.PayType === 'NEFT' || payload.PayType === 'RTGS' || form.PayType === 'NEFT' || form.PayType === 'RTGS')
                        ? (payload.ChqDate ? isoToDDMMYYYY(payload.ChqDate) : isoToDDMMYYYY(payload.EDate))
                        : isoToDDMMYYYY(payload.ChqDate ?? ""),
                    EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                    PayType: payload.PayType || form.PayType,
                    ParAdd: payload.ParAdd || form.ParAdd,
                    txntype: "mob_collection",
                    action: "add",
                    AdjType: adjType,
                    TDSAmt: payload?.TDSAmt || form?.TDSAmt || "",
                    DisAmt: payload?.DisAmt || form?.DisAmt || "",
                    d1delete: []
                };

                console.log('[ChequeForm] final payload', params);
                const res = await axios.post(
                    // 'https://apig.tms-webapp.com/api/collection_crud',
                    `${API}/api/collection_crud`,
                    params,
                    { headers }
                );
                console.log('[ChequeForm] part1 res', res);
                if (!res.data.success) {
                    setSaveLoading(false);
                    return Promise.reject(res.data.message);
                }
                setSaveLoading(false);
                return res.data;
            } catch (err) {
                setSaveLoading(false);
                return Promise.reject(err);
            }
        }
    };

    const handleSavePart2 = async (payload: any) => {
        try {
            const result = await origSavePart2(payload);
            if (result && result.success) {
                setSuccessModalPayload(result.data ?? payload ?? null);
                setSuccessModalVisible(true);
                return { success: true };
            }
            return result;
        } catch (err) {
            return Promise.reject(err);
        }
    };

    const closeSuccessModal = () => setSuccessModalVisible(false);
    const viewDataAndClose = () => {
        setSuccessModalVisible(false);
        navigation.navigate('Collection');
    };

    // ========== RENDER ==========
    return (
        <>
            <HeaderBarwithBack
                userName={username}
                header={'Cheque Entry'}
                subHeader={'Manage your cheque records'}
            />
            <ChequeForm
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
                getAdjData={getAdjData}
                getPaymentData={getPaymentData}
                getBranchData={getBranchData}
                setSelectedBank={setSelectedBank}
                setSelectedAdj={setSelectedAdj}
                selectedBank={selectedBank}
                selectedAdj={selectedAdj}
                setSelectedPayment={setSelectedPayment}
                selectedPayment={selectedPayment}
                selectedBranch={selectedBranch}
                setSelectedbank={setSelectedbank}
                setSelectedadj={setSelectedadj}
                setSelectedpayment={setSelectedpayment}
                setSelectedbranch={setSelectedbranch}
                selectedbank={selectedbank}
                selectedadj={selectedadj}
                selectedpayment={selectedpayment}
                selectedbranch={selectedbranch}
                getPartyLoading={getPartyLoading}
                getBankLoading={getBankLoading}
                getAdjLoading={getAdjLoading}
                getPaymentLoading={getPaymentLoading}
                getBranchLoading={getBranchLoading}
                form={form}
                setForm={setForm}
                ShowChequeData={ShowChequeData}
                ShowAdjustmentData={ShowAdjustmentData}
                initialLoading={initialLoading}
                initialModalVisible={initialModalVisible}
                onSavePart1={''}
                onSavePart2={handleSavePart2}
                getSaveLoading={getSaveLoading}
                yearOptions={yearOptions}
            />
            <SuccessModal
                visible={successModalVisible}
                title="Cheque Saved"
                message="The cheque data has been saved successfully."
                onClose={closeSuccessModal}
                onView={viewDataAndClose}
            />
        </>
    );
};

export default Collection;
