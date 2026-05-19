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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
// import { encode as base64_encode } from 'react-native-base64';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
// import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
// import HeaderBar from '../HeaderBar/HeaderBar';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import theme from '../../android/app/src/theme';
import ChequeForm from './ChequeForm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPropertyData, fetchCurrentYearData, getPrptypeFolder, getPrptypeSummary, getPrptypeIndex, writePrptypeCache, addPrptypeToIndex, loadAllPrptypeCaches, normalizePrptype } from '../../common/API/Functions';
import { SuccessModal } from '../Shared/SuccessModal';
import { API } from '../../common/API/dynamicAPI';

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
    // 
    // {
    //     "UId": null,
    //     "SrNo": null,
    //     "SUId": null,
    //     "SetAmt": null,
    //     "TType": null,
    //     "SSrNo": null,
    //     "BillNo": null,
    //     "BillDate": null,
    //     "nBillDate": null,
    //     "NetAmt": null
    // }

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

const CollectionEdit: React.FC<Props> = ({ token, username }) => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const [getParname, setParname] = useState('');
    const filterKey = 'all';
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
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);
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
    });
    const [getResponse, setResponse] = useState();
    const [cardData, setCardData] = useState<string | null>(null);
    const [getCardDataMode, setCardDataMode] = useState<string | null>(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successModalPayload, setSuccessModalPayload] = useState<any>(null);
    const prptypeCacheRef = useRef<Record<string, any>>({});
    const [prptypeCacheReady, setPrptypeCacheReady] = useState(false);

    // const [historyData, setHistoryData] = useState<AllHistoryData[]>([]);
    // const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    let cancelToken: any;


    useEffect(() => {
        let cancelled = false;
        const preload = async () => {
            try {
                console.log('⚡ Preloading master-sync caches into memory...');
                const all = await loadAllPrptypeCaches(); // returns normalized keys now
                prptypeCacheRef.current = {};
                for (const rawKey of Object.keys(all)) {
                    const key = normalizePrptype(rawKey);
                    if (all[rawKey]) prptypeCacheRef.current[key] = all[rawKey];
                }

                // print summary of prptypes that actually have data
                const keysWithData: string[] = [];
                for (const prptype of Object.keys(prptypeCacheRef.current)) {
                    const folder = prptypeCacheRef.current[prptype];
                    const accountCount = Array.isArray(folder?.account) ? folder.account.length : 0;
                    const banksCount = Array.isArray(folder?.banks) ? folder.banks.length : 0;
                    const branchesCount = Array.isArray(folder?.branches) ? folder.branches.length : 0;
                    if (accountCount > 0 || banksCount > 0 || branchesCount > 0) {
                        keysWithData.push(prptype);
                        console.log(`🔎 cache [${prptype}] — account:${accountCount}, banks:${banksCount}, branches:${branchesCount}`);
                    }
                }

                if (keysWithData.length === 0) {
                    console.log('⚪ No prptypes with data found in cache.');
                } else {
                    console.log(`✅ Cache contains ${keysWithData.length} prptype(s) with data:`, keysWithData);
                }

                if (!cancelled) {
                    setPrptypeCacheReady(true);
                    console.log('⚡ Cache preloaded:', Object.keys(prptypeCacheRef.current).length, 'prptypes total');
                }
            } catch (err) {
                console.warn('Preload caches failed:', err);
                setPrptypeCacheReady(true); // avoid blocking UI even on failure
            }
        };
        preload();
        return () => { cancelled = true; };
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

    // useEffect(() => {
    //     const initializeApp = async () => {
    //         try {
    //             const card_data_str = await AsyncStorage.getItem('collection_edit');
    //             const card_mode = await AsyncStorage.getItem('collection_mode');

    //             const parsed = card_data_str ? JSON.parse(card_data_str) : null;

    //             setCardData(parsed);               // parsed JS object (or null)
    //             setCardDataMode(card_mode);
    //         } catch (error) {
    //             console.error("Initialization error:", error);
    //         }
    //     };

    //     initializeApp();
    // }, []);
    useEffect(() => {
        // 1) try route.params (fastest)
        const paramsCard = route?.params?.cachedCard;
        const paramsMode = route?.params?.mode;

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


    console.log('cardData', cardData, getCardDataMode);


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

    const ddMMYYYYToISO = (ddMMYYYY?: string) => {
        if (!ddMMYYYY) return '';
        const [dd, mm, yyyy] = ddMMYYYY.split('-');
        return `${yyyy}-${mm}-${dd}`;
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
                // prpcode: formParam?.PrpCode ?? form.PrpCode ?? "",
                prpcode: "",
                EDate: isoToDDMMYYYY(formParam?.EDate ?? form.EDate ?? ""),
                txntype: "mob_collection",
                action: "view",
            };

            console.log('🔵 show cheque payload', payload);
            // const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, payload, { headers });
            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });
            console.log('🔵 show cheque response', response);

            if (response.data.success == true) {
                let d1 = response.data.data.d1 ?? [];
                let main = response.data.data.main ?? [];

                // --- DEFAULT OBJECT ---
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
                // === INSERT DEFAULT OBJECT ONLY IF d1 IS EMPTY ===
                if (!Array.isArray(d1) || d1.length === 0) {
                    d1 = [defaultD1Object];
                }

                setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
                setForm(prev => ({ ...prev, ...main[0], UId: main[0].UId, EDate: new Date().toISOString().split('T')[0], d1: d1 }));
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
    // const ShowChequeDataEdit = async (cardData?: any) => {
    //     setInitialLoading(true);
    //     console.log('🔵 show cheque calling (API)...', cardData, cardData.UId);

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setPartyLoading(true);
    //     const headers = {
    //         Authorization: `Bearer ${getToken()}`,
    //         'Content-Type': 'application/json',
    //         'X-Requested-with': 'XMLHttpRequest',
    //     };
    //     try {
    //         const payload = {
    //             uid: cardData?.UId ?? cardData.UId ?? 0,
    //             prpcode: cardData?.PrpCode ?? cardData.PrpCode ?? "",
    //             EDate: isoToDDMMYYYY(cardData?.EDate ?? cardData.EDate ?? ""),
    //             txntype: "mob_collection",
    //             action: "view",
    //         };

    //         console.log('🔵 show edit cheque payload', payload);
    //         const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, payload, { headers });
    //         console.log('🔵 show edit cheque response', response);
    //         if (response.data.success == true) {
    //             let d1 = [];
    //             let main = [];
    //             main = response.data.data.main;
    //             d1 = response.data.data.d1;
    //             setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
    //             setForm(prev => ({ ...prev, ...main[0], ChqDate: ddMMYYYYToISO(main[0].ChqDate), EDate: ddMMYYYYToISO(main[0].EDate), UId: main[0].UId, PayType: main[0].PayType, d1: d1 }));
    //             const paycode = main[0].PayType;
    //             if (getPaymentData && getPaymentData.length) {
    //                 const matched = getPaymentData.find((p: any) => String(p.paycode) === String(paycode));
    //                 setSelectedPayment?.(matched ?? null);
    //                 setSelectedpayment?.(matched ?? null);
    //             }
    //         }

    //         // handle response as you already intended
    //         // e.g. setPartyData or set other state depending on response
    //         // Example:
    //         // if (response.data.success) { ... }

    //     } catch (error) {
    //         if (!axios.isCancel(error)) {
    //             Alert.alert('Error', 'Server error');
    //         }
    //     } finally {
    //         setInitialLoading(false);
    //         setInitialModalVisible(false);
    //         setPartyLoading(false);
    //     }
    // };

    const ShowChequeDataEdit = async (cardDataParam?: any, options: { background?: boolean } = {}) => {
        const { background = false } = options;
        // if not background -> show loaders as before
        if (!background) {
            setInitialLoading(true);
            setPartyLoading(true);
        } else {
            // for background we avoid toggling the main loader to keep UI responsive
            console.log('🔵 ShowChequeDataEdit running in background refresh');
        }

        // cancel any previous
        if (cancelTokenRef.current) {
            try { cancelTokenRef.current.cancel('new-edit-request'); } catch { }
        }
        cancelTokenRef.current = axios.CancelToken.source();

        const card = cardDataParam ?? cardData;
        if (!card) {
            if (!background) {
                setInitialLoading(false); setPartyLoading(false);
            }
            return;
        }

        const uid = card.UId ?? card.uid ?? 0;

        try {
            const payload = {
                uid: uid,
                prpcode: card.PrpCode ?? card.Prpcode ?? form.PrpCode ?? '',
                EDate: isoToDDMMYYYY(card.EDate ?? card.EDate ?? form.EDate ?? ""),
                txntype: "mob_collection",
                action: "view",
            };

            // Check per-UId cache first (AsyncStorage)
            const cacheKey = `collection_cache_${uid}`;
            try {
                const rawCache = await AsyncStorage.getItem(cacheKey);
                if (rawCache) {
                    const parsed = JSON.parse(rawCache);
                    const TTL_MS = 2 * 60 * 1000; // 2 minutes
                    if (parsed.__fetchedAt && (Date.now() - parsed.__fetchedAt) < TTL_MS) {
                        console.log(`🔒 Using per-UId cache for ${uid}`);
                        // hydrate UI immediately from cached API response
                        const main = parsed.main || parsed;
                        const d1 = parsed.d1 || [];
                        setResponse(prev => ({ ...prev, ...main, d1 }));
                        setForm(prev => ({ ...prev, ...main, d1 }));
                        // If not background, still proceed to ensure latest; but if background we can skip network if cached is fresh.
                        if (background) {
                            if (!background) {/* noop */ }
                            // skip network if fresh
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

            // Network call (will update state when done)
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log('🔵 show edit cheque payload (network)', payload);
            // const response = await axios.post(`https://apig.tms-webapp.com/api/collection_crud`, payload, {
            const response = await axios.post(`${API}/api/collection_crud`, payload, {
                headers,
                cancelToken: cancelTokenRef.current?.token,
            });

            console.log('🔵 show edit cheque response (network)', response);

            if (response?.data?.success === true) {
                const main = response.data.data.main?.[0] ?? {};
                const d1 = response.data.data.d1 ?? [];
                // update UI
                setResponse(prev => ({ ...prev, ...main, d1 }));
                setForm(prev => ({ ...prev, ...main, ChqDate: ddMMYYYYToISO(main.ChqDate), EDate: ddMMYYYYToISO(main.EDate), UId: main.UId, PayType: main.PayType, d1 }));
                // store per-UId cache for quick next open
                try {
                    await AsyncStorage.setItem(`collection_cache_${uid}`, JSON.stringify({ main, d1, __fetchedAt: Date.now() }));
                } catch (e) {
                    console.warn('cache write failed', e);
                }

                // update selected payment mapping (as you had)
                const paycode = main.PayType;
                if (getPaymentData && getPaymentData.length) {
                    const matched = getPaymentData.find((p: any) => String(p.paycode) === String(paycode));
                    setSelectedPayment?.(matched ?? null);
                    setSelectedpayment?.(matched ?? null);
                }
            } else {
                console.warn('ShowChequeDataEdit response not success', response?.data);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('ShowChequeDataEdit error', error);
                if (!background) Alert.alert('Error', 'Server error');
            } else {
                console.log('ShowChequeDataEdit cancelled');
            }
        } finally {
            if (!background) {
                setInitialLoading(false);
                setInitialModalVisible(false);
                setPartyLoading(false);
            } else {
                console.log('🔵 background refresh finished');
            }
        }
    };


    useEffect(() => {
        if (!getPaymentData || getPaymentData.length === 0) return;

        const paycodeFromForm = form?.PayType ?? form?.PayCode ?? null;
        if (!paycodeFromForm) {
            setSelectedPayment(null);
            return;
        }

        const matched = getPaymentData.find((p: any) => String(p.paycode) === String(paycodeFromForm));
        setSelectedPayment(matched ?? null);
        // if you have a second setter selectedpayment, set it too:
        setSelectedpayment?.(matched ?? null);
    }, [getPaymentData, form?.PayType, form?.PayCode]);


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
        // setInitialLoading(true);
        // console.log('🔵 show cheque calling (API)...', formParam);
        setAdjLoading(true);

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setPartyLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
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
            // const response = await axios.post(`https://apig.tms-webapp.com/api/adjustment`, payload, { headers });
            console.log('🔵 show adj response', response);
            if (response.data.success == true) {
                setAdjLoading(false);
                const adjData = response.data.response.data;
                setAdjData(adjData);

                // setResponse(prev => ({ ...prev, ...main[0], d1: d1 }));
            } else {
                setAdjLoading(false);
            }

            // handle response as you already intended
            // e.g. setPartyData or set other state depending on response
            // Example:
            // if (response.data.success) { ... }

        } catch (error) {
            setAdjLoading(false);
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setAdjLoading(false);
            // setInitialLoading(false);
            // setInitialModalVisible(false);
            // setPartyLoading(false);
        }
    };
    useEffect(() => {
        if (getCardDataMode == 'edit') {
            ShowChequeDataEdit(cardData);

        } else if (getCardDataMode == 'add') {
            ShowChequeData(cardData);

        }
    }, [getCardDataMode]);


    // inside component, near other refs
    const cancelTokenRef = useRef<axios.CancelTokenSource | null>(null);

    // helper to cancel existing
    const ensureCancelToken = () => {
        if (cancelTokenRef.current) {
            try { cancelTokenRef.current.cancel('new-request'); } catch { }
        }
        cancelTokenRef.current = axios.CancelToken.source();
    };


    // const fetchPartyData = async (gotSelectedPrp: PropertyData) => {
    //     console.log('🔵 fetchPartyData', gotSelectedPrp);
    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setPartyLoading(true);
    //     const headers = {
    //         Authorization: `Bearer ${getToken()}`,
    //         'Content-Type': 'application/json',
    //         'X-Requested-with': 'XMLHttpRequest',
    //     };
    //     try {
    //         const payload = {
    //             prpcode: gotSelectedPrp?.PrpCode,
    //             prptype: gotSelectedPrp?.PrpOf,
    //             yearno: currentYear?.toString(),
    //             strcode: "0",
    //             txntype: "sales_order",
    //             partytype: "p",
    //             type: "s",
    //             page: 1,
    //             limit: 20,
    //             search: "",
    //             isceo: 0,
    //             partype: 0,
    //             grntype: "",
    //             fetch: "",
    //             acccode: "",
    //             billdate: "",
    //             strtype: "",
    //             isfaint: ""
    //         };
    //         console.log('🔵 payload party', payload);
    //         // const response = await axios.post(`https://apig.tms-webapp.com/api/get_mobile_user_details`, payload, { headers });
    //         const response = await axios.get(`https://apig.tms-webapp.com/api/accountbasic`, getRequestConfigBank({
    //             params: {
    //                 ...payload
    //             }
    //         }));
    //         console.log('🔵 payload party', payload);
    //         console.log('🔵 party account response', response);
    //         if (response.data.success && response.data.response.data.length > 0) {
    //             const partygot = response.data.response.data;
    //             setPartyLoading(false);
    //             // Add a unique `uid` to each object

    //             setPartyData(partygot);
    //         } else {
    //             setPartyLoading(false);
    //             setPartyData([]);
    //         }
    //     } catch (error) {
    //         if (!axios.isCancel(error)) {
    //             setPartyLoading(false);
    //             Alert.alert('Error', 'Server error');
    //         }
    //     } finally {
    //         // setIsLoading(false);
    //     }
    // };

    const fetchPartyData = async (gotSelectedPrp: PropertyData, forceRefresh: boolean | 'background' = false) => {
        const prpcode = gotSelectedPrp?.PrpCode ?? '';
        const yearno = currentYear?.toString?.() ?? '';
        const prptypeRaw = gotSelectedPrp?.PrpOf ?? gotSelectedPrp?.PrpCode ?? '';
        const prptype = normalizePrptype(prptypeRaw);
        console.log(`fetchPartyData called for prptype="${prptype}" (PrpCode=${gotSelectedPrp?.PrpCode})`);

        const cachedFolder = prptypeCacheRef.current[prptype] ?? (prptypeCacheReady ? null : await getPrptypeFolder(prptype));

        if (cachedFolder && Array.isArray(cachedFolder.account) && cachedFolder.account.length > 0 && forceRefresh !== true) {
            console.log(`🔒 [cache-hit] Using cache for prptype="${prptype}" — items=${cachedFolder.account.length}. Skipping network.`);
            setPartyData(cachedFolder.account);
            if (forceRefresh !== 'background') return;
            console.log('⏳ cache used but background refresh requested — will fetch network after returning UI.');
        }
        else {
            console.log(`⚠️ [cache-miss] No usable cache for prptype="${prptype}" — going to call network.`);
        }


        // 2) if we reach here -> cache missing OR forceRefresh requested -> call network
        ensureCancelToken();
        setPartyLoading(true);

        try {
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
                user_id: 1
            };

            console.log(`🌐 [network] accountbasic called for prptype="${prptype}" payload:`, payload);

            // const response = await axios.get(`https://apig.tms-webapp.com/api/mobaccountbasic`, getRequestConfigBank({
            const response = await axios.get(`${API}/api/mobaccountbasic`, getRequestConfigBank({
                params: { ...payload },
                cancelToken: cancelTokenRef.current?.token,
            }));

            if (response.data?.success && Array.isArray(response.data.response?.data)) {
                const partygot = response.data.response.data;
                setPartyData(partygot);

                // update memory + storage
                const merged = {
                    ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                    prptype,
                    prpcode,
                    yearno,
                    account: partygot,
                    lastUpdated: new Date().toISOString()
                };
                prptypeCacheRef.current[prptype] = merged;
                await writePrptypeCache(prptype, merged);
                await addPrptypeToIndex(prptype);
                console.log(`✅ cached account for prptype="${prptype}" (${partygot.length})`);
            } else {
                // no network data — if nothing cached before, clear UI
                if (!cachedFolder || !Array.isArray(cachedFolder.account) || cachedFolder.account.length === 0) {
                    setPartyData([]);
                }
                console.log(`⚪ accountbasic returned no data for prptype="${prptype}"`);
            }
        } catch (err: any) {
            if (!axios.isCancel(err)) {
                console.error('fetchPartyData network error:', err);
                if (!cachedFolder) setPartyData([]);
            } else {
                console.warn('fetchPartyData cancelled');
            }
        } finally {
            setPartyLoading(false);
        }
    };
    // replace your existing fetchPartyDataEdit with this
    const fetchPartyDataEdit = async (getprpcode: string, getprptype: string, getyearno: string, forceRefresh: boolean | 'background' = false) => {
        try {
            const prpcode = getprpcode ?? '';
            const yearno = getyearno ?? '';
            const prptypeRaw = getprptype ?? getprpcode ?? '';
            const prptype = normalizePrptype(prptypeRaw);
            console.log(`fetchPartyDataEdit called for prptype="${prptype}" prpcode="${prpcode}" yearno="${yearno}"`);

            // wait for preload to finish if not ready
            if (!prptypeCacheReady) {
                console.log('⏳ waiting for prptype cache preload to finish before edit-fetch...');
                // simple wait loop (small)
                const start = Date.now();
                while (!prptypeCacheReady && Date.now() - start < 3000) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(res => setTimeout(res, 100));
                }
            }

            const cachedFolder = prptypeCacheRef.current[prptype] ?? (prptypeCacheReady ? null : await getPrptypeFolder(prptype));

            // cache hit
            if (cachedFolder && Array.isArray(cachedFolder.account) && cachedFolder.account.length > 0 && forceRefresh !== true) {
                console.log(`🔒 [cache-hit edit] Using cache for prptype="${prptype}" — items=${cachedFolder.account.length}`);
                setPartyData(cachedFolder.account);
                if (forceRefresh !== 'background') return;
                console.log('⏳ background refresh requested after returning UI');
            } else {
                console.log(`⚠️ [cache-miss edit] No usable cache for prptype="${prptype}" — will call network`);
            }

            // network fetch (same as fetchPartyData but with provided params)
            ensureCancelToken();
            setPartyLoading(true);

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
                user_id: 1
            };

            console.log(`🌐 [network edit] mobaccountbasic for prptype="${prptype}" payload:`, payload);

            // const response = await axios.get(`https://apig.tms-webapp.com/api/mobaccountbasic`, getRequestConfigBank({
            const response = await axios.get(`${API}/api/mobaccountbasic`, getRequestConfigBank({
                params: { ...payload },
                cancelToken: cancelTokenRef.current?.token,
            }));

            if (response.data?.success && Array.isArray(response.data.response?.data)) {
                const partygot = response.data.response.data;
                setPartyData(partygot);

                const merged = {
                    ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                    prptype,
                    prpcode,
                    yearno,
                    account: partygot,
                    lastUpdated: new Date().toISOString()
                };
                prptypeCacheRef.current[prptype] = merged;
                await writePrptypeCache(prptype, merged);
                await addPrptypeToIndex(prptype);
                console.log(`✅ cached account (edit) for prptype="${prptype}" (${partygot.length})`);
            } else {
                if (!cachedFolder || !Array.isArray(cachedFolder.account) || cachedFolder.account.length === 0) {
                    setPartyData([]);
                }
                console.log(`⚪ mobaccountbasic returned no data for prptype="${prptype}"`);
            }
        } catch (err: any) {
            if (!axios.isCancel(err)) {
                console.error('fetchPartyDataEdit network error:', err);
                // fall back to empty list if nothing cached
            } else {
                console.warn('fetchPartyDataEdit cancelled');
            }
        } finally {
            setPartyLoading(false);
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

    // const fetchBankData = async (gotSelectedPrp: PropertyData) => {
    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setBankLoading(true);
    //     setBranchLoading(true);

    //     const headers = {
    //         Authorization: `Bearer ${getToken()}`,
    //         'Content-Type': 'application/json',
    //         'X-Requested-with': 'XMLHttpRequest',
    //     };
    //     try {
    //         const payload = { prpcode: gotSelectedPrp?.PrpCode, prptype: gotSelectedPrp?.PrpOf, yearno: currentYear?.toString(), txntype: 'receipt' };
    //         console.log('🔵 payload bank', payload);
    //         const response = await axios.get(`https://apig.tms-webapp.com/api/getbanklist`, getRequestConfigBank({
    //             params: {
    //                 ...payload
    //             }
    //         }));
    //         const responsebranch = await axios.get(`https://apig.tms-webapp.com/api/getbranchlist`, getRequestConfigBank({
    //             params: {
    //                 ...payload
    //             }
    //         }));
    //         console.log('🔵 payload bank', payload);
    //         console.log('🔵 bank account response', response);
    //         if (response.data.success && response.data.response.data.length > 0) {
    //             const bankgot = response.data.response.data;
    //             setBankLoading(false);
    //             // Add a unique `uid` to each object

    //             setBankData(bankgot);
    //         } else {
    //             setBankLoading(false);
    //             setBankData([]);
    //         }
    //         if (responsebranch.data.success && responsebranch.data.response.data.length > 0) {
    //             const branchgot = responsebranch.data.response.data;
    //             setBranchLoading(false);
    //             setBranchData([]);
    //             // Add a unique `uid` to each object

    //             setBranchData(branchgot);
    //         } else {
    //             setBranchLoading(false);
    //             setBankData([]);
    //             setBranchData([]);
    //         }
    //     } catch (error) {
    //         if (!axios.isCancel(error)) {
    //             setBankLoading(false);
    //             setBranchLoading(false);
    //             Alert.alert('Error', 'Server error');
    //         }
    //     } finally {
    //         // setIsLoading(false);
    //     }
    // };
    const fetchBankData = async (gotSelectedPrp: PropertyData, forceRefresh: boolean | 'background' = false) => {
        const prpcode = gotSelectedPrp?.PrpCode ?? '';
        const yearno = currentYear?.toString?.() ?? '';
        const prptype = normalizePrptype(gotSelectedPrp?.PrpOf ?? gotSelectedPrp?.PrpCode);

        // in-memory cache (fast)
        // const cachedFolder = prptypeCacheRef.current[prptype] ?? (prptypeCacheReady ? null : await getPrptypeFolder(prptype));
        // let usedBanks = cachedFolder && Array.isArray(cachedFolder.banks) ? cachedFolder.banks : null;
        // let usedBranches = cachedFolder && Array.isArray(cachedFolder.branches) ? cachedFolder.branches : null;

        // if (usedBanks && usedBranches && forceRefresh !== true) {
        //     console.log(`🔒 [cache-hit] banks+branches for prptype="${prptype}" — using cached (no network).`);
        //     setBankData(usedBanks);
        //     setBranchData(usedBranches);
        //     return;
        // }

        const cachedFolder = prptypeCacheRef.current[prptype] ?? (prptypeCacheReady ? null : await getPrptypeFolder(prptype));
        let usedBanks = cachedFolder && Array.isArray(cachedFolder.banks) ? cachedFolder.banks : null;
        let usedBranches = cachedFolder && Array.isArray(cachedFolder.branches) ? cachedFolder.branches : null;

        if (cachedFolder && Array.isArray(cachedFolder.account) && cachedFolder.account.length > 0 && forceRefresh !== true) {
            console.log(`🔒 [cache-hit] Using cache for prptype="${prptype}" — items=${cachedFolder.account.length}. Skipping network.`);
            // setPartyData(cachedFolder.account);
            setBankData(usedBanks);
            setBranchData(usedBranches);
            if (forceRefresh !== 'background') return;
            console.log('⏳ cache used but background refresh requested — will fetch network after returning UI.');
        }
        else {
            console.log(`⚠️ [cache-miss] No usable cache for prptype="${prptype}" — going to call network.`);
        }

        // else we need network (either missing or forced)
        ensureCancelToken();
        setBankLoading(true);
        setBranchLoading(true);

        const payload = { prpcode, prptype, yearno, txntype: 'receipt', user_id: 1 };

        // Banks
        if (!usedBanks || forceRefresh === true || forceRefresh === 'background') {
            console.log(`🌐 [network] getbanklist called for prptype="${prptype}" payload:`, payload);
            try {
                // const res = await axios.get(`https://apig.tms-webapp.com/api/getmobbanklist`, getRequestConfigBank({
                const res = await axios.get(`${API}/api/getmobbanklist`, getRequestConfigBank({
                    params: { ...payload },
                    cancelToken: cancelTokenRef.current?.token,
                }));
                if (res.data?.success && Array.isArray(res.data.response?.data)) {
                    usedBanks = res.data.response.data;
                    setBankData(usedBanks);

                    // update memory + storage
                    const merged = {
                        ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                        prptype, prpcode, yearno, banks: usedBanks, lastUpdated: new Date().toISOString()
                    };
                    prptypeCacheRef.current[prptype] = merged;
                    await writePrptypeCache(prptype, merged);
                    await addPrptypeToIndex(prptype);
                    console.log(`✅ cached banks for prptype="${prptype}" (${usedBanks.length})`);
                } else {
                    if (!usedBanks) setBankData([]);
                    console.log(`⚪ getbanklist returned no data for prptype="${prptype}"`);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('getbanklist error:', err);
                    if (!usedBanks) setBankData([]);
                } else {
                    console.warn('getbanklist cancelled');
                }
            } finally {
                setBankLoading(false);
            }
        } else {
            setBankLoading(false);
        }

        // Branches
        if (!usedBranches || forceRefresh === true || forceRefresh === 'background') {
            console.log(`🌐 [network] getbranchlist called for prptype="${prptype}" payload:`, payload);
            try {
                // const resB = await axios.get(`https://apig.tms-webapp.com/api/getmobbranchlist`, getRequestConfigBank({
                const resB = await axios.get(`${API}/api/getmobbranchlist`, getRequestConfigBank({
                    params: { ...payload },
                    cancelToken: cancelTokenRef.current?.token,
                }));
                if (resB.data?.success && Array.isArray(resB.data.response?.data)) {
                    usedBranches = resB.data.response.data;
                    setBranchData(usedBranches);

                    const merged = {
                        ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                        prptype, prpcode, yearno, branches: usedBranches, lastUpdated: new Date().toISOString()
                    };
                    prptypeCacheRef.current[prptype] = merged;
                    await writePrptypeCache(prptype, merged);
                    await addPrptypeToIndex(prptype);
                    console.log(`✅ cached branches for prptype="${prptype}" (${usedBranches.length})`);
                } else {
                    if (!usedBranches) setBranchData([]);
                    console.log(`⚪ getbranchlist returned no data for prptype="${prptype}"`);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('getbranchlist error:', err);
                    if (!usedBranches) setBranchData([]);
                } else {
                    console.warn('getbranchlist cancelled');
                }
            } finally {
                setBranchLoading(false);
            }
        } else {
            setBranchLoading(false);
        }
    };
    const fetchBankDataEdit = async (getprpcode: string, getprptype: string, getyearno: string, forceRefresh: boolean | 'background' = false) => {
        try {
            const prpcode = getprpcode ?? '';
            const yearno = getyearno ?? '';
            const prptype = normalizePrptype(getprptype ?? getprpcode ?? '');
            console.log(`fetchBankDataEdit called for prptype="${prptype}" prpcode="${prpcode}"`);

            // wait for preload if needed
            if (!prptypeCacheReady) {
                const start = Date.now();
                while (!prptypeCacheReady && Date.now() - start < 3000) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(res => setTimeout(res, 100));
                }
            }

            const cachedFolder = prptypeCacheRef.current[prptype] ?? (prptypeCacheReady ? null : await getPrptypeFolder(prptype));
            let usedBanks = cachedFolder && Array.isArray(cachedFolder.banks) ? cachedFolder.banks : null;
            let usedBranches = cachedFolder && Array.isArray(cachedFolder.branches) ? cachedFolder.branches : null;

            // If we have account cache and banks/branches exist, use them
            if (cachedFolder && Array.isArray(cachedFolder.account) && cachedFolder.account.length > 0 && forceRefresh !== true) {
                console.log(`🔒 [cache-hit edit] Using cache for prptype="${prptype}" — account:${cachedFolder.account.length}, banks:${usedBanks?.length ?? 0}`);
                setBankData(usedBanks ?? []);
                setBranchData(usedBranches ?? []);
                if (forceRefresh !== 'background') return;
                console.log('⏳ background refresh requested after returning UI');
            } else {
                console.log(`⚠️ [cache-miss edit] No usable cache for prptype="${prptype}" — will call network`);
            }

            ensureCancelToken();
            setBankLoading(true);
            setBranchLoading(true);

            const payload = { prpcode, prptype, yearno, txntype: 'receipt', user_id: 1 };

            // getmobbanklist
            try {
                // const res = await axios.get(`https://apig.tms-webapp.com/api/getmobbanklist`, getRequestConfigBank({
                const res = await axios.get(`${API}/api/getmobbanklist`, getRequestConfigBank({
                    params: { ...payload },
                    cancelToken: cancelTokenRef.current?.token,
                }));
                if (res.data?.success && Array.isArray(res.data.response?.data)) {
                    usedBanks = res.data.response.data;
                    setBankData(usedBanks);

                    const merged = {
                        ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                        prptype, prpcode, yearno, banks: usedBanks, lastUpdated: new Date().toISOString()
                    };
                    prptypeCacheRef.current[prptype] = merged;
                    await writePrptypeCache(prptype, merged);
                    await addPrptypeToIndex(prptype);
                    console.log(`✅ cached banks (edit) for prptype="${prptype}" (${usedBanks.length})`);
                } else {
                    if (!usedBanks) setBankData([]);
                    console.log(`⚪ getmobbanklist returned no data for prptype="${prptype}"`);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('getmobbanklist error:', err);
                    if (!usedBanks) setBankData([]);
                } else {
                    console.warn('getmobbanklist cancelled');
                }
            } finally {
                setBankLoading(false);
            }

            // getmobbranchlist
            try {
                // const resB = await axios.get(`https://apig.tms-webapp.com/api/getmobbranchlist`, getRequestConfigBank({
                const resB = await axios.get(`${API}/api/getmobbranchlist`, getRequestConfigBank({
                    params: { ...payload },
                    cancelToken: cancelTokenRef.current?.token,
                }));
                if (resB.data?.success && Array.isArray(resB.data.response?.data)) {
                    usedBranches = resB.data.response.data;
                    setBranchData(usedBranches);

                    const merged = {
                        ...(prptypeCacheRef.current[prptype] || { prptype, prpcode, yearno }),
                        prptype, prpcode, yearno, branches: usedBranches, lastUpdated: new Date().toISOString()
                    };
                    prptypeCacheRef.current[prptype] = merged;
                    await writePrptypeCache(prptype, merged);
                    await addPrptypeToIndex(prptype);
                    console.log(`✅ cached branches (edit) for prptype="${prptype}" (${usedBranches.length})`);
                } else {
                    if (!usedBranches) setBranchData([]);
                    console.log(`⚪ getmobbranchlist returned no data for prptype="${prptype}"`);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('getmobbranchlist error:', err);
                    if (!usedBranches) setBranchData([]);
                } else {
                    console.warn('getmobbranchlist cancelled');
                }
            } finally {
                setBranchLoading(false);
            }
        } catch (err) {
            console.error('fetchBankDataEdit error:', err);
            setBankLoading(false);
            setBranchLoading(false);
        }
    };



    const fetchPaymentData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setPaymentLoading(true);

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const payload = { fetch: 'paymenttype', txntype: 'mob_collection' };
            console.log('🔵 payload payment', payload);
            // const response = await axios.get(`https://apig.tms-webapp.com/api/get_criterion`, getRequestConfigBank({
            const response = await axios.get(`${API}/api/get_criterion`, getRequestConfigBank({
                params: {
                    ...payload
                }
            }));

            console.log('🔵 payload payment', payload);
            console.log('🔵 payment data response', response);
            if (response.data.success && response.data.response.data.length > 0) {
                const bankgot = response.data.response.data;
                setPaymentLoading(false);
                // Add a unique `uid` to each object

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
            // setSelectedpayment(null);
            setSelectedbranch(null);

            let gotSelectedPrp = selectedProperty;
            console.log('gotSelectedPrp', gotSelectedPrp);
            fetchPartyData(gotSelectedPrp);
            fetchBankData(gotSelectedPrp);
            // fetchPaymentData(gotSelectedPrp);
        } else {
            // if (getCardDataMode == 'edit') {
            //     // if property was cleared, also clear party
            //     setSelectedParty(null);
            //     setSelectedBank(null);
            //     setPartyData([]);
            //     setBankData([]);

            //     setBranchData([]);
            //     setSelected(null);
            //     setSelectedbank(null);
            //     setSelectedpayment(null);
            //     setSelectedbranch(null);
            //     let gotSelectedPrp = selectedProperty;
            //     console.log('gotSelectedPrpedit', form.PrpCode, form.PrpOf, form.YearNo);
            //     fetchPartyDataEdit(form.PrpCode, form.PrpOf, form.YearNo);
            //     fetchBankDataEdit(form.PrpCode, form.PrpOf, form.YearNo);
            // } else {
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);

            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            // setSelectedpayment(null);
            setSelectedbranch(null);
            // }
        }
    }, [selectedProperty]);

    useEffect(() => {
        // only run edit-fetch when mode=edit and we have prp code/prptype
        if (getCardDataMode === 'edit' && form?.PrpCode && form.YearNo && (form?.PrpOf || form?.PrpCode)) {
            console.log('Edit mode detected -> fetching edit caches for', form.PrpCode, form.PrpOf, form.YearNo);
            fetchPartyDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
            // fetchBankDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
        }
    }, [getCardDataMode, form.PrpCode, form.PrpOf, form.YearNo]);
    useEffect(() => {
        // only run edit-fetch when mode=edit and we have prp code/prptype
        if (getCardDataMode === 'edit' && form?.PrpCode && form.YearNo && (form?.PrpOf || form?.PrpCode)) {
            console.log('Edit mode detected -> fetching edit caches for', form.PrpCode, form.PrpOf, form.YearNo);
            // fetchPartyDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
            fetchBankDataEdit(form.PrpCode, form.PrpOf ?? form.PrpCode, form.YearNo ?? form.YearNo);
        }
    }, [getCardDataMode, form.PrpCode, form.PrpOf, form.YearNo]);

    useEffect(() => {
        // ShowAdjustmentData();
        // if (getAdjData && getAdjData.length === 0) {
        ShowAdjustmentData();
        // }
    }, [form.AccCode, selectedParty])




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


    // keep your existing functions but rename them to origSavePart1/origSavePart2 (or reference existing)
    // const origSavePart1 = async (payload) => {
    //     // Example: call your API to save part1
    //     try {
    //         // replace with your actual endpoint & headers
    //         const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    //         console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
    //         const params = { ...getResponse, ...payload, ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""), EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""), txntype: "mob_collection", action: "add", d1delete: [] };
    //         // Example axios call (uncomment if you want it now)
    //         console.log('[ChequeForm] part1 payload', params);
    //         const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', params, { headers });
    //         console.log('[ChequeForm] part1 res', res);
    //         if (!res.data.success) {
    //             return Promise.reject(res.data.message);
    //         }

    //         // return res.data;

    //         return Promise.resolve({ success: true });
    //     } catch (err) {
    //         return Promise.reject(err);
    //     }
    // }


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
                const params = {
                    ...getResponse,
                    ...payload,
                    UId: payload.UId,
                    ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                    EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                    txntype: "mob_collection",
                    action: "edit",
                    AdjType: adjType,
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
                console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
                delete payload.d2;
                // === START: compute AdjType based on form.d1 ===
                const d1 = (form && form.d1) ?? payload.d1 ?? null;

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
                const params = {
                    ...getResponse,
                    ...payload,
                    UId: payload.UId,
                    ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""),
                    EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""),
                    txntype: "mob_collection",
                    action: "add",
                    AdjType: adjType,
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


    // onSavePart1={async (payload) => {
    //     // Example: call your API to save part1
    //     try {
    //         // replace with your actual endpoint & headers
    //         const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    //         console.log('[ChequeForm] part1 payload', payload, 'addResponse', getResponse);
    //         const params = { ...getResponse, ...payload, ChqDate: isoToDDMMYYYY(payload.ChqDate ?? payload.ChqDate ?? ""), EDate: isoToDDMMYYYY(payload.EDate ?? payload.EDate ?? ""), txntype: "mob_collection", action: "add", d1delete: [] };
    //         // Example axios call (uncomment if you want it now)
    //         console.log('[ChequeForm] part1 payload', params);
    //         const res = await axios.post('https://apig.tms-webapp.com/api/collection_crud', params, { headers });
    //         console.log('[ChequeForm] part1 res', res);
    //         if (!res.data.success) {
    //             return Promise.reject(res.data.message);
    //         }

    //         // return res.data;

    //         return Promise.resolve({ success: true });
    //     } catch (err) {
    //         return Promise.reject(err);
    //     }
    // }}
    // onSavePart2={async (payload) => {
    //     try {
    //         // const res = await axios.post('https://apig.tms-webapp.com/api/save_cheque_part2', payload, { headers: {...} });
    //         console.log('[ChequeForm] part2 payload', payload);
    //         return Promise.resolve({ success: true });
    //     } catch (err) {
    //         return Promise.reject(err);
    //     }
    // }}

    // wrapper which shows modal on success
    const handleSavePart1 = useCallback(async (payload) => {
        // try {
        //     const result = await origSavePart1(payload);
        //     if (result && result.success) {
        //         setSuccessModalPayload(result.data ?? payload ?? null);
        //         setSuccessModalVisible(true);
        //         return { success: true };
        //     }
        //     return result;
        // } catch (err) {
        //     // bubble up so ChequeForm can show errors as before
        //     return Promise.reject(err);
        // }
    }, []);

    const handleSavePart2 = useCallback(async (payload) => {
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
    }, [origSavePart2]);

    // modal actions
    const closeSuccessModal = () => setSuccessModalVisible(false);
    const viewDataAndClose = () => {
        setSuccessModalVisible(false);
        // navigate to collection - change the route name if needed
        navigation.navigate('Collection');
    };



    return (
        <>

            <HeaderBarwithBack
                userName={username}
                // onSearch={setSearchQuery}
                header={'Edit Cheque Entry'}
                subHeader={'Manage your cheque records'}
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
                // setBankData={setBankData}
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
                // setInitialLoading,
                initialModalVisible={initialModalVisible}
                setInitialModalVisible={setInitialModalVisible}
                onSavePart1={handleSavePart1}
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
