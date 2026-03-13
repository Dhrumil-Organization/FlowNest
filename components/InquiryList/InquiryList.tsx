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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
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
import { fetchPropertyData, fetchCurrentYearData } from '../../common/API/Functions';
import CustomDrawer from './CustomDrawer';
import CollectionCard from './CollectionCard';
import Footer from '../Footer/Footer';
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

type Inquiry = {
    id: string;
    prpcode: string;
    prptype: string;
    yearno: string;
    createdAt: string;
    status: string;
    deliveryDate: string;
    party: {
        partyname: string;
        partycode: string;
        items: Array<{
            itemtitle: string;
            itemtitlecode: string;
            shades: Array<{
                shadename: string;
                shadecode: string;
                quantity: string;
                rate: string;
                deliverydate: string;
                remarks: string;
                status: string;
            }>;
        }>;
    };
};
const InquiryList: React.FC<Props> = ({ token, navigation, isConnected, username, setIsLoggedIn }) => {
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
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [selectedExe, setSelectedExe] = useState(null);
    const [exeData, setExeData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [itemData, setItemData] = useState([]);
    const [page, setpage] = useState(0);
    const [selectedDesigns, setSelectedDesigns] = useState([])
    const [selectedItems, setSelectedItems] = useState([])
    const [selectedItemStatus, setSelectedItemStatus] = useState('All');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [gePOTData, setPOTData] = useState([])
    const [getpayload, setPayload] = useState([])


    let cancelToken: any;

    // Set default dates
    useEffect(() => {
        const today = new Date();
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

    const getRequestConfigBrowserDAS = () => {
        // let params = null;

        let requestconfig = {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/javascript',
                // Accept: 'application/json'
            },
            // params
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
            setSelectedbranch(null);

            let gotSelectedPrp = selectedProperty;
            fetchPartyData(gotSelectedPrp);
            fetchBankData(gotSelectedPrp);
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

    console.log('🔵 selected form:', form, selectedProperty);


    const handleLoadPress = () => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        console.log({
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: form.PrpCode,
            action: 'browse',
            txntype: "mob_collection",
            prptype: selectedProperty?.PrpOf
        });
        const payload = {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: form.PrpCode,
            action: 'browse',
            txntype: "mob_collection",
            prptype: selectedProperty?.PrpOf
        }

        fetchBrowseData(payload as any);
    };


    useEffect(() => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        const payload = {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: form.PrpCode,
            action: 'browse',
            txntype: "mob_collection",
            prptype: selectedProperty?.PrpOf
        }
        fetchBrowseData(payload as any);
    }, []);


    // const fetchBrowseData = async (payload) => {
    //     setIsLoading(true);

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();

    //     try {
    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };

    //         const response = await axios.post(`${API}/api/inquiry_crud`, payload, { headers, cancelToken: cancelToken.token });
    //         console.log('🔵 response', response);

    //         if (response.data?.success) {
    //             const inquiries = response.data.data.inquires.map(inquiry => {
    //                 const partyData = inquiry.data[0];
    //                 const firstItem = partyData.items[0];
    //                 const firstShade = firstItem.shades[0];

    //                 const items = partyData.items.map(item => {
    //                     return {
    //                         itemtitle: item.itemtitle,
    //                         itemtitlecode: item.itemtitlecode,
    //                         shades: item.shades,
    //                     };
    //                 });

    //                 return {
    //                     id: inquiry.id,
    //                     prpcode: inquiry.prpcode,
    //                     prptype: inquiry.prptype,
    //                     yearno: inquiry.yearno,
    //                     createdAt: inquiry.createdAt,
    //                     status: firstShade.status,
    //                     deliveryDate: firstShade.deliverydate,
    //                     party: {
    //                         partyname: partyData.partyname,
    //                         partycode: partyData.partycode,
    //                         items: items,
    //                     },
    //                 };
    //             });

    //             setPOTData(inquiries);
    //             closeDrawer();
    //         } else {
    //             setPOTData([]);
    //         }
    //     } catch (err) {
    //         console.error('❌ inquiry error', err?.response || err);
    //         Alert.alert(
    //             'Server Error',
    //             err?.response?.status === 503
    //                 ? 'Apache rejected request (fixed by withCredentials)'
    //                 : 'Failed to load inquiries'
    //         );
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };
    const fetchBrowseData = async (payload) => {
        setIsLoading(true);
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/inquiry_crud`, payload, { headers, cancelToken: cancelToken.token });
            console.log('🔵 response', response);

            if (response.data?.success) {
                const inquiries = response.data.data.inquires.map(inquiry => {
                    const partyData = inquiry.data[0];
                    const items = partyData.items.map(item => {
                        return {
                            itemtitle: item.itemtitle,
                            itemtitlecode: item.itemtitlecode,
                            shades: item.shades,
                        };
                    });

                    return {
                        id: inquiry.id,
                        prpcode: inquiry.prpcode,
                        prptype: inquiry.prptype,
                        yearno: inquiry.yearno,
                        createdAt: inquiry.createdAt,
                        // Do NOT set status here; it will be determined per-shade in the UI
                        deliveryDate: inquiry.data[0].items[0].shades[0].deliverydate, // or use a common delivery date logic
                        party: {
                            partyname: partyData.partyname,
                            partycode: partyData.partycode,
                            items: items,
                            id: inquiry.id,
                            prpcode: inquiry.prpcode,
                            prptype: inquiry.prptype,
                            yearno: inquiry.yearno,
                            createdAt: inquiry.createdAt,
                        },
                    };
                });

                setPOTData(inquiries);
                closeDrawer();
            } else {
                setPOTData([]);
            }
        } catch (err) {
            console.error('❌ inquiry error', err?.response || err);
            Alert.alert(
                'Server Error',
                err?.response?.status === 503
                    ? 'Apache rejected request (fixed by withCredentials)'
                    : 'Failed to load inquiries'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateShadeFromList = async (shade: any, context: { itemtitle: string; party: Inquiry['party']; inquiry: Inquiry; status: string }) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const payload = {
                id: shade?.id || "",
                prpcode: context.inquiry.prpcode || "",
                yearno: context.inquiry.yearno || "",
                createdAt: context.inquiry.createdAt || "",
                txntype: "mob_inquires",
                action: "update_status",
                srno: shade?.srno || "",
                subsr: shade?.subsr || "",
                status: context.status, // Use the selected status
            };

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('Update payload:', payload);
            const response = await axios.post(`${API}/api/inquiry_crud`, payload, { headers, cancelToken: cancelToken.token });
            console.log('Update response:', response);

            if (response.data?.success) {
                // Update the local state with the new data
                const updatedInquiry = response.data.data.inquires[0];
                const partyData = updatedInquiry.data[0];

                const updatedCard = {
                    id: updatedInquiry.id,
                    prpcode: updatedInquiry.prpcode,
                    prptype: updatedInquiry.prptype,
                    yearno: updatedInquiry.yearno,
                    createdAt: updatedInquiry.createdAt,
                    deliveryDate: partyData.items[0].shades[0].deliverydate,
                    party: {
                        partyname: partyData.partyname,
                        partycode: partyData.partycode,
                        items: partyData.items.map(item => ({
                            itemtitle: item.itemtitle,
                            itemtitlecode: item.itemtitlecode,
                            shades: item.shades,
                        })),
                    },
                };

                setPOTData(prevData =>
                    prevData.map(card =>
                        card.id === updatedCard.id ? updatedCard : card
                    )
                );

                // Alert.alert('Success', 'Shade status updated successfully.');
            } else {
                Alert.alert('Error', response.data?.message || 'Failed to update shade status.');
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update shade status.');
            }
        }
    };


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



    // useEffect(() => {
    //     const yearValue = selectedYear.split('-')[1].substring(2);
    //     const payload = {
    //         // fromDate:   ,
    //         // current data
    //         fromDate: new Date().toISOString().split('T')[0],
    //         toDate: new Date().toISOString().split('T')[0],
    //         yearno: yearValue,
    //         prpcode: '',
    //         action: 'browse',
    //         txntype: "mob_collection",
    //     }
    //     fetchBrowseData(payload);
    // }, []);


    const handleAdd = async () => {
        // if (onEdit) { onEdit(item); return; }
        try {
            // await AsyncStorage.setItem('collection_edit', JSON.stringify(item));
            // await AsyncStorage.setItem('collection_mode', 'add');
            // navigate if desired
            // @ts-ignore
            navigation.navigate('InquiryAdd' as never);
        } catch (e) { console.error(e); Alert.alert('Error', 'Could not open editor.'); }
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
                    placeholder="Search list..."
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
                            <Text style={crlimtreq_styles.listIconText}>Add Inquiry</Text>
                        </TouchableOpacity>

                        {/* Main Content: Replace Text with ProdOrderTrackingTable */}
                        <CollectionCard gePOTData={gePOTData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} onDelete={(item) => handleDelete(item)} onAuthorize={handleAuthorizeFromList} setIsLoggedIn={setIsLoggedIn} onUpdateShade={handleUpdateShadeFromList}
                            isConnected={isConnected} token={token} />
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
                    selectedDesigns={selectedDesigns}
                    selectedItems={selectedItems}
                    itemData={itemData}
                    getPropertyData={getPropertyData}
                    setSelectedProperty={setSelectedProperty}
                    selectedProperty={selectedProperty}
                    setForm={setForm}
                    setIsLoggedIn={setIsLoggedIn}
                    isConnected={isConnected}

                />
            </GestureHandlerRootView>
        </>
    );
};
export default InquiryList;
