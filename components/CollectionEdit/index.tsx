import AppAlert from '@/common/utils/appAlert';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@/common/utils/compatibleStorage';
import HeaderBarwithBack from '@/components/Header';
import ChequeForm from './ChequeForm';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { SuccessModal } from '@/Shared/SuccessModal';
import { API } from '../../common/API/dynamicAPI';

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
const CollectionEdit: React.FC<Props> = ({
    token,
    username
}) => {
    // ========== STATE MANAGEMENT ==========
    const router = useRouter();
    const params = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [getSaveLoading, setSaveLoading] = useState(false);
    const [getLocationLoading, setLocationLoading] = useState(false);
    const [allhistoryLoading, setIsAllHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [getPartyLoading, setPartyLoading] = useState(false);
    const [getBankLoading, setBankLoading] = useState(false);
    const [getAdjLoading, setAdjLoading] = useState(false);
    const [getPaymentLoading, setPaymentLoading] = useState(false);
    const [getBranchLoading, setBranchLoading] = useState(false);
    const [getSuccess, setSuccess] = useState(false);
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
    });
    const [getResponse, setResponse] = useState<any>();
    const [cardData, setCardData] = useState<string | null>(null);
    const [getCardDataMode, setCardDataMode] = useState<string | null>(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successModalPayload, setSuccessModalPayload] = useState<any>(null);

    const route = useRoute<any>();
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

    const getRequestConfigBank = (props: any) => {
        let params = props.params ? props.params : null;
        return {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json',
                'x-platform': 'mob',
            },
            params
        };
    };

    const getToken = () => token;

    // ========== INITIALIZE APP ==========
    useEffect(() => {
        // 1) try route.params (fastest)
        const paramsCard = JSON.parse(params?.cachedCard as string);
        const paramsMode = params?.mode;

        console.log('ddd Route params:', paramsCard, paramsMode);

        if (paramsCard) {
            console.log('⚡ Hydrating from route params (cachedCard)', paramsCard);
            // set cardData and mode
            setCardData(paramsCard);
            setCardDataMode(paramsMode ?? 'edit');

            // hydrate form & response for instant UI
            const main0 = {
                UId: paramsCard.UId,
                PrpCode: paramsCard.PrpCode ?? paramsCard.Prpcode ?? '',
                AccName: paramsCard.AccName ?? paramsCard.accname ?? '',
                ChqDate: paramsCard.ChqDate ?? paramsCard.ChqDate ?? '',
                EDate: paramsCard.EDate ?? paramsCard.EDate ?? '',
                PayType: paramsCard.PayType ?? '',
                AttachImage: paramsCard.AttachImage ?? '',
                // other lightweight fields...
            };
            setResponse(prev => ({ ...prev, ...main0, d1: paramsCard.d1 ?? [] }));
            setForm(prev => ({ ...prev, ...main0, d1: paramsCard.d1 ?? [] }));

            // Do background refresh to get full data (non-blocking)
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ShowChequeDataEdit(paramsCard, { background: true });
            return;
        }

        // 2) fallback: try AsyncStorage cached payload (if route params not provided)
        // (async () => {
        //     try {
        //         const cachedStr = await AsyncStorage.getItem('collection_edit_cached');
        //         if (cachedStr) {
        //             const cached = JSON.parse(cachedStr);
        //             // Use TTL: if cached is recent (<2 min) hydrate immediately
        //             const TTL_MS = 2 * 60 * 1000;
        //             if (cached.__cachedAt && (Date.now() - cached.__cachedAt) < TTL_MS) {
        //                 console.log('⚡ Hydrating from AsyncStorage cache', cached);
        //                 setCardData(cached);
        //                 setCardDataMode('edit');
        //                 setResponse(prev => ({ ...prev, ...cached, d1: cached.d1 ?? [] }));
        //                 setForm(prev => ({ ...prev, ...cached, d1: cached.d1 ?? [] }));
        //                 // background refresh
        //                 // eslint-disable-next-line @typescript-eslint/no-floating-promises
        //                 ShowChequeDataEdit(cached, { background: true });
        //             } else {
        //                 // stale -> still run background fetch but don't block UI
        //                 // eslint-disable-next-line @typescript-eslint/no-floating-promises
        //                 ShowChequeDataEdit(cached, { background: true });
        //             }
        //         }
        //     } catch (err) {
        //         console.debug('no cached card in storage');
        //     }
        // })();
    }, [route?.params]);

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
                // `https://apig.tms-webapp.com/api/mobaccountbasic`,
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
                const res = await axios.get(
                    // `https://apig.tms-webapp.com/api/getmobbanklist`,
                    `${API}/api/getmobbanklist`,
                    getRequestConfigBank({
                        params: { ...payload },
                        cancelToken: cancelTokenRef.current?.token,
                    })
                );

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
                    })
                );

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

    // ========== SHOW CHEQUE DATA FUNCTIONS ==========
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
                let d1 = response.data.data.d1 ?? [];
                let main = response.data.data.main ?? [];

                // Add default object if d1 is empty
                const defaultD1Object = {
                    UId: null,
                    SrNo: null,
                    SUId: null,
                    SetAmt: null,
                    TType: null,
                    SSrNo: null,
                    BillNo: null,
                    BillDate: null,
                    nBillDate: null,
                    NetAmt: null
                };

                if (!Array.isArray(d1) || d1.length === 0) {
                    d1 = [defaultD1Object];
                }

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
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setInitialLoading(false);
            setInitialModalVisible(false);
            setPartyLoading(false);
        }
    };

    const ShowChequeDataEdit = async (cardDataParam?: any, options: { background?: boolean } = {}) => {
        const { background = false } = options;

        if (!background) {
            setInitialLoading(true);
            setPartyLoading(true);
        }

        if (cancelTokenRef.current) {
            try { cancelTokenRef.current.cancel('new-edit-request'); } catch { }
        }
        cancelTokenRef.current = axios.CancelToken.source();

        const card = cardDataParam ?? cardData;
        if (!card) {
            if (!background) {
                setInitialLoading(false);
                setPartyLoading(false);
            }
            return;
        }

        const uid = card.UId ?? card.uid ?? 0;

        try {
            // Check per-UId cache first
            const cacheKey = `collection_cache_${uid}`;
            try {
                const rawCache = await AsyncStorage.getItem(cacheKey);
                if (rawCache) {
                    const parsed = JSON.parse(rawCache);
                    const TTL_MS = 2 * 60 * 1000; // 2 minutes
                    if (parsed.__fetchedAt && (Date.now() - parsed.__fetchedAt) < TTL_MS) {
                        console.log(`🔒 Using per-UId cache for ${uid}`);
                        const main = parsed.main || parsed;
                        const d1 = parsed.d1 || [];
                        setResponse(prev => ({ ...prev, ...main, d1 }));
                        setForm(prev => ({ ...prev, ...main, d1 }));

                        if (background) {
                            if ((Date.now() - parsed.__fetchedAt) < TTL_MS) {
                                if (!background) { setInitialLoading(false); setPartyLoading(false); }
                                return;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('cache read failed', e);
            }

            // Network call
            const payload = {
                uid: uid,
                prpcode: card.PrpCode ?? card.Prpcode ?? form.PrpCode ?? '',
                EDate: isoToDDMMYYYY(card.EDate ?? card.EDate ?? form.EDate ?? ""),
                txntype: "mob_collection",
                action: "view",
            };

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('🔵 show edit cheque payload (network)', payload);
            const response = await axios.post(
                // `https://apig.tms-webapp.com/api/collection_crud`,
                `${API}/api/collection_crud`,
                payload,
                { headers, cancelToken: cancelTokenRef.current?.token }
            );

            console.log('🔵 show edit cheque response (network)', response);
            if (response?.data?.success === true) {
                const main = response.data.data.main?.[0] ?? {};
                const d1 = response.data.data.d1 ?? [];

                setResponse(prev => ({ ...prev, ...main, d1 }));
                setForm(prev => ({
                    ...prev,
                    ...main,
                    ChqDate: ddMMYYYYToISO(main.ChqDate),
                    EDate: ddMMYYYYToISO(main.EDate),
                    UId: main.UId,
                    PayType: main.PayType,
                    d1
                }));

                // Store per-UId cache
                try {
                    await AsyncStorage.setItem(
                        `collection_cache_${uid}`,
                        JSON.stringify({ main, d1, __fetchedAt: Date.now() })
                    );
                } catch (e) {
                    console.warn('cache write failed', e);
                }

                // Update selected payment mapping
                const paycode = main.PayType;
                if (getPaymentData && getPaymentData.length) {
                    const matched = getPaymentData.find((p: any) => String(p.paycode) === String(paycode));
                    setSelectedPayment?.(matched ?? null);
                    setSelectedpayment?.(matched ?? null);
                }
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('ShowChequeDataEdit error', error);
                if (!background) AppAlert.alert('Error', 'Server error');
            }
        } finally {
            if (!background) {
                setInitialLoading(false);
                setInitialModalVisible(false);
                setPartyLoading(false);
            }
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
    // ========== SHOW ADJUSTMENT DATA ==========
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
                AppAlert.alert('Error', 'Server error');
            }
        }
    };

    // ========== FETCH PAYMENT DATA ==========
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
                getRequestConfigBank({ params: payload })
            );

            console.log('🔵 payment data response', response);
            if (response.data.success && response.data.response.data.length > 0) {
                setPaymentData(response.data.response.data);
            } else {
                setPaymentData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setPaymentLoading(false);
        }
    };

    // ========== USE EFFECTS ==========
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
        fetchPaymentData();
    }, [token]);

    useEffect(() => {
        if (!token) return;
        if (getCardDataMode == 'edit') {
            ShowChequeDataEdit(cardData);
        } else if (getCardDataMode == 'add') {
            ShowChequeData(cardData);
        }
    }, [getCardDataMode, token]);

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
        if (!token) return;
        if (getCardDataMode === 'edit' && form?.PrpCode && form.YearNo && (form?.PrpOf || form?.PrpCode)) {
            console.log('Edit mode detected -> fetching edit caches for', form.PrpCode, form.PrpOf, form.YearNo);
            fetchPartyDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
            fetchBankDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
        }
    }, [getCardDataMode, form.PrpCode, form.PrpOf, form.YearNo, token]);


    const fetchPartyDataEdit = async (getprpcode: string, getprptype: string, getyearno: string, forceRefresh: boolean | 'background' = false) => {
        const prpcode = getprpcode ?? '';
        const yearno = getyearno ?? '';
        const prptypeRaw = getprptype ?? getprpcode ?? '';
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
                // `https://apig.tms-webapp.com/api/mobaccountbasic`,
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

    const fetchBankDataEdit = async (getprpcode: string, getprptype: string, getyearno: string, forceRefresh: boolean | 'background' = false) => {
        const prpcode = getprpcode ?? '';
        const yearno = getyearno ?? '';
        const prptype = normalizePrptype(getprptype ?? getprpcode ?? '');
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
    useEffect(() => {
        if (!token) return;
        ShowAdjustmentData();
    }, [form.AccCode, selectedParty, token]);

    useEffect(() => {
        if (!getPaymentData || getPaymentData.length === 0) return;
        const paycodeFromForm = form?.PayType ?? form?.PayCode ?? null;
        if (!paycodeFromForm) {
            setSelectedPayment(null);
            return;
        }
        const matched = getPaymentData.find((p: any) => String(p.paycode) === String(paycodeFromForm));
        setSelectedPayment(matched ?? null);
        setSelectedpayment?.(matched ?? null);
    }, [getPaymentData, form?.PayType, form?.PayCode]);

    // ========== SAVE FUNCTIONS ==========
    const origSavePart2 = async (payload) => {
        if (getCardDataMode == 'edit') {

            try {
                setSaveLoading(true);
                // replace with your actual endpoint & headers
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
                    AppAlert.alert(
                        "Validation Error",
                        "The total of adjustment amounts cannot exceed the cheque amount. Please reduce the adjustment amounts and try again.",
                        [{ text: "OK" }]
                    );
                    return;
                }

                // === END: Validation ===

                console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                delete payload.d2;

                // === START: compute AdjType based on form.d1 ===
                // const d1 = (form && form.d1) ?? payload.d1 ?? null;

                const isValueEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

                const isAllObjectValuesEmpty = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return true;
                    // consider only own enumerable props
                    const keys = Object.keys(obj);
                    if (keys.length === 0) return true;
                    return keys.every(k => isValueEmpty(obj[k]));
                };

                let adjType = 'ADJ';
                if (!d1 || (Array.isArray(d1) && d1.length === 0)) {
                    // no d1 or empty array -> ACC
                    adjType = 'ACC';
                } else if (Array.isArray(d1) && d1.length === 1 && isAllObjectValuesEmpty(d1[0])) {
                    // single object and all keys empty -> ACC
                    adjType = 'ACC';
                }
                // === END: compute AdjType ===
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

                const uid = payload.UId;
                const cacheKey = `collection_cache_${uid}`;
                // Example axios call (uncomment if you want it now)
                console.log('[ChequeForm] final edit payload', params);
                // const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', params, { headers });
                const res = await axios.post(`${API}/api/collection_crud`, params, { headers });
                console.log('[ChequeForm] part1 res', res);
                if (!res.data.success) {
                    setSaveLoading(false);

                    AsyncStorage.removeItem(cacheKey);
                    return Promise.reject(res.data.message);
                }
                setSaveLoading(false);

                return res.data;

                return Promise.resolve({ success: true });
            } catch (err) {
                setSaveLoading(false);
                return Promise.reject(err);
            }

        } else {
            try {
                setSaveLoading(false);
                // replace with your actual endpoint & headers
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
                    AppAlert.alert(
                        "Validation Error",
                        "The total of adjustment amounts cannot exceed the cheque amount. Please reduce the adjustment amounts and try again.",
                        [{ text: "OK" }]
                    );
                    return;
                }
                console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                delete payload.d2;
                // === START: compute AdjType based on form.d1 ===


                const isValueEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

                const isAllObjectValuesEmpty = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return true;
                    // consider only own enumerable props
                    const keys = Object.keys(obj);
                    if (keys.length === 0) return true;
                    return keys.every(k => isValueEmpty(obj[k]));
                };

                let adjType = 'ADJ';
                if (!d1 || (Array.isArray(d1) && d1.length === 0)) {
                    // no d1 or empty array -> ACC
                    adjType = 'ACC';
                } else if (Array.isArray(d1) && d1.length === 1 && isAllObjectValuesEmpty(d1[0])) {
                    // single object and all keys empty -> ACC
                    adjType = 'ACC';
                }
                // === END: compute AdjType ===
                // const params = {
                //     ...getResponse,
                //     ...payload,
                //     UId: payload.UId,
                //     ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                //     EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                //     ParAdd: payload.ParAdd || form.ParAdd,
                //     txntype: "mob_collection",
                //     action: "add",
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
                    action: "add",
                    AdjType: adjType,
                    TDSAmt: payload?.TDSAmt || form?.TDSAmt || "",
                    DisAmt: payload?.DisAmt || form?.DisAmt || "",
                    d1delete: []
                };
                // Example axios call (uncomment if you want it now)
                console.log('[ChequeForm] final payload', params);
                // const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', params, { headers });
                const res = await axios.post(`${API}/api/collection_crud`, params, { headers });
                console.log('[ChequeForm] part1 res', res);
                if (!res.data.success) {
                    setSaveLoading(false);
                    return Promise.reject(res.data.message);
                }
                setSaveLoading(false);

                return res.data;

                return Promise.resolve({ success: true });
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

    // ========== MODAL ACTIONS ==========
    const closeSuccessModal = () => setSuccessModalVisible(false);
    const viewDataAndClose = () => {
        setSuccessModalVisible(false);
        // navigation.navigate('Collection');
        router.replace('/Collection');
    };

    // ========== RENDER ==========
    return (
        <>
            <HeaderBarwithBack
                userName={username}
                header={'Edit Cheque Entry'}
                subHeader={'Manage your cheque records'}
                breadcrumb={"Edit Collection"}
                SearchBar={false}
            />
            <ChequeForm
                token={token}
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

export default CollectionEdit;
