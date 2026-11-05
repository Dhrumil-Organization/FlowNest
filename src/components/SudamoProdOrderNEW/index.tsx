import { API } from '@/common/API/dynamicAPI';
import { crlimtreq_styles } from '@/common/Style';
import AppAlert from '@/common/utils/appAlert';
import FullScreenLoader from '@/components/FullScreenLoader';
import theme from '@/components/theme';
import { isWeb } from '@/src/platform/runtime';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    TextInput as RNTextInput,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
import HeaderBar from '../../components/HeaderNew';
import PartyHistoryModal from './PartyHistoryModal/PartyHistoryModal';
import ProductionCostingPreviewModal from './ProductionCostingPreviewModal';
import ProductionOrderAuthorizationReviewModal from './ProductionOrderAuthorizationReviewModal';
import ProductionOrderEditModal from './ProductionOrderEditModal';
import {
    canChangePO,
    deleteProductionOrder,
    isAuthorisedPO,
    matchesPOSearch,
    PO_SEARCH_FIELDS,
    POSearchField
} from './productionOrderActions';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
}

interface Props {
    token: string;
    // navigation: any;
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
    // uid: string;
    prptype: string;
    prptypename: string;
    // prpcode: string;
    date: string;
    parcode: string;
    parname: string;
    limit1: string;
    limit2: string;
    limit3: string;
    crday1: string;
    crday2: string;
    crday3: string;
    // isauth: string;
    status: string;
    ausrname: string;
    adate: string;
    // remark: string;
    // yearno: string;
    revertdate: string;
    // sexename: string;
    BrkAccName: string;
    crdays: string;
    // 
    aremark: string;
    authorisedby: string;
    authoriseddate: string;
    authstatus: string;
    costdate: string;
    costdsncode: string;
    costdsnname: string;
    costuid: string;
    deliverydate: string;
    dsncode: string;
    dsnname: string;
    grdcode: string;
    grdname: string;
    greystrcode: string;
    isauth: string | number;
    itmcode: string;
    itmname: string;
    nvoudate: string;
    orderdesign: string;
    orderqty: string;
    partyname: string;
    pickrate: string;
    picks: string;
    prpcode: string;
    qty: string;
    rate: string;
    ratetype: string;
    remark: string;
    sampleno: string;
    sellingrate: string;
    sexename: string;
    shdcode: string;
    shdname: string;
    shkperc: string;
    strcode: string;
    uid: string;
    voudate: string;
    vouno: string;
    yearno: string;
}

const SudamoProdOrder: React.FC<Props> = ({ token, isConnected = true, username }) => {
    const [searchQuerySPO, setSearchQuerySPO] = useState('');
    const [searchhistoryQuerySPO, setSearchhistoryQuerySPO] = useState('');
    const [searchverifyQuerySPO, setSearchverifyQuerySPO] = useState('');
    const [responsemessageSPO, setresponsemessageSPO] = useState('');
    const [getParnameSPO, setParnameSPO] = useState('');
    const filterKeySPO = 'all';
    const [isLoadingSPO, setIsLoadingSPO] = useState(false);
    const [historyLoadingSPO, setIsHistoryLoadingSPO] = useState(false);
    const [allhistoryLoadingSPO, setIsAllHistoryLoading] = useState(false);
    const [prodorderLoadingSPO, setIsPrdoOrderLoadingSPO] = useState(false);
    const [getSuccessSPO, setSuccessSPO] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [historyDataSPO, setHistoryDataSPO] = useState<CardData[]>([]);
    const [allhistoryDataSPO, setAllHistoryDataSPO] = useState<CardData[]>([]);
    const [allverifyDataSPO, setAllVerifyDataSPO] = useState<AllHistoryData[]>([]);
    const [partyListSPO, setPartyListSPO] = useState<CardData[]>([]);
    const [editableValuesSPO, setEditableValuesSPO] = useState<{ [uid: string]: { limit2?: string; crday2?: string; rate?: string; qty?: string; shkperc?: string; aremark?: string } }>({});
    const [showOverlaySPO, setShowOverlaySPO] = useState(false);
    const [selectedActionSPO, setSelectedActionSPO] = useState<'accept' | 'reject' | 'list' | 'pending' | 'verifyreject' | null>(null);
    const [selectedItemSPO, setSelectedItemSPO] = useState<CardData | AllHistoryData | null>(null);
    const [showTopButtonSPO, setShowTopButtonSPO] = useState(false);
    const [showPartyHistoryModalSPO, setShowPartyHistoryModalSPO] = useState(false);
    const flatListRefSPO = useRef<FlatList>(null);
    const flatHistoryListRefSPO = useRef<FlatList>(null);
    const flatVerifyListRefSPO = useRef<FlatList>(null);
    const [activeTabSPO, setActiveTabSPO] = useState<'party' | 'history' | 'verify'>('party');
    const [activeTab1SPO, setActiveTab1SPO] = useState<'requests' | 'history' | 'verify'>('requests');
    const [showWebViewModal, setShowWebViewModal] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState('');
    const [costingPreviewMdId, setCostingPreviewMdId] = useState('');
    const [costingPreviewId, setCostingPreviewId] = useState('');
    const [costingPreviewGreigeQty, setCostingPreviewGreigeQty] = useState<number | null>(null);
    const [showCostingPreview, setShowCostingPreview] = useState(false);
    const [showAuthorizationReview, setShowAuthorizationReview] = useState(false);
    const [authorizationReviewItem, setAuthorizationReviewItem] = useState<any | null>(null);
    // Modify / Delete / Search
    const [searchFieldSPO, setSearchFieldSPO] = useState<POSearchField>('all');
    const [editItemSPO, setEditItemSPO] = useState<any | null>(null);
    const [deleteItemSPO, setDeleteItemSPO] = useState<any | null>(null);
    const [deletingSPO, setDeletingSPO] = useState(false);
    const [deleteErrorSPO, setDeleteErrorSPO] = useState('');
    // const [historyDataSPO, setHistoryDataSPO] = useState<AllHistoryData[]>([]);
    // const [isHistoryLoading, setIsHistoryLoadingSPO] = useState(false);

    const { width } = useWindowDimensions();

    const costingQuantityRequest = useRef<any>(null);
    useEffect(() => () => {
        costingQuantityRequest.current?.cancel('Screen closed.');
        costingQuantityRequest.current = null;
    }, []);

    const openProductionCosting = async (item: any) => {
        costingQuantityRequest.current?.cancel('Costing selection changed.');
        costingQuantityRequest.current = null;
        if (!isConnected || item?.isProcessed) return;
        const source = String(item?.design_costing_source || '').trim().toUpperCase();
        const mdId = String(item?.md_id || '').trim();
        if (source === 'NEW') {
            const costingId = String(item?.design_costing_id || '').trim();
            if (!mdId) {
                AppAlert.alert('Costing unavailable', 'New design costing reference is missing.');
                return;
            }
            if (!costingId) {
                AppAlert.alert('Costing unavailable', 'No saved costing is available for this design.');
                return;
            }
            setCostingPreviewMdId(mdId);
            setCostingPreviewId(costingId);
            let greigeValue = item?.required_greige_qty;
            if (greigeValue === undefined || greigeValue === null || String(greigeValue).trim() === '') {
                const request = axios.CancelToken.source();
                costingQuantityRequest.current = request;
                try {
                    const response = await axios.get(`${API}/api/prodorderwebnew/show`, {
                        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                        params: { uid: item.uid, prpcode: item.prpcode, yearno: item.yearno,
                            strcode: item.greystrcode || item.strcode, action: 'view', txntype: 'production_order_sudo' },
                        cancelToken: request.token
                    });
                    if (costingQuantityRequest.current !== request) return;
                    const main = response?.data?.data?.main?.[0];
                    if (!response?.data?.success || !main || String(main.uid ?? main.UId) !== String(item.uid)) {
                        throw new Error('The saved Production Order quantity could not be verified.');
                    }
                    greigeValue = main.totqty;
                } catch (error: any) {
                    if (costingQuantityRequest.current !== request || axios.isCancel(error)) return;
                    AppAlert.alert('Costing unavailable', error?.response?.data?.message || error?.message || 'The saved Production Order could not be loaded.');
                    return;
                } finally {
                    if (costingQuantityRequest.current === request) costingQuantityRequest.current = null;
                }
            }
            const greigeQty = greigeValue === null || greigeValue === undefined || String(greigeValue).trim() === '' ? NaN : Number(greigeValue);
            if (!Number.isFinite(greigeQty) || greigeQty < 0) {
                AppAlert.alert('Costing unavailable', 'The saved Production Order has no valid greige quantity.');
                return;
            }
            setCostingPreviewGreigeQty(greigeQty);
            setShowCostingPreview(true);
            return;
        }
        const url = `https://ind.tms-webapp.com/app-weavingtemplete/${item.prpcode}/${item.yearno}/${item.costuid}/production_order_sudo`;
        setWebViewUrl(url);
        setShowWebViewModal(true);
    };

    const openAuthorizationReview = (item: any) => {
        if (!isConnected || item?.isProcessed) return;
        setAuthorizationReviewItem(item);
        setShowAuthorizationReview(true);
    };

    const getProductionModeLabel = (item: any) => {
        const sourceMode = String(item?.source_mode || '').toLowerCase();
        if (sourceMode === 'self') return 'STOCK & SELL';
        if (sourceMode === 'sales') return 'SO BASED';
        if (String(item?.prodtype ?? '') !== '') {
            return Number(item?.prodtype) === 0 ? 'STOCK & SELL' : 'SO BASED';
        }
        return 'PRODUCTION ORDER';
    };

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

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

        // Financial year starts in April
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2); // Return last two digits of the year
    };

    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingSPO(true);
        try {
            const payload = { txntype: 'production_order_sudo', referrer: 'dashboard', prptype: 'S', yearno: getCurrentFinancialYear(), atype: 'B' };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/prodorderbrowsesudo`,
                `${API}/api/prodorderbrowsesudo`,
                getRequestConfig({ params: { ...payload } })
            );
            console.log('🔵 payload & response', payload, response);
            // if (response.data.success && response.data.data.length > 0) {
            //     console.log('✅ Data:', response.data.data);
            //     setData(response.data.data);
            //     setAllHistoryDataSPO([])
            //     setAllVerifyDataSPO([])
            // }
            if (response.data.success && response.data.data.data.length > 0) {
                console.log('✅ Data:', response.data.data);
                // setData(response.data.data.data);
                // setAllHistoryDataSPO([])
                // setAllVerifyDataSPO([])

                // const mainData = response.data.data.data || [];
                // const d1Data = response.data.data.d1 || [];

                // setData(mainData);
                // setPartyData(d1Data);

                const mainData = response.data.data.data || [];
                const d1Data = response.data.data.d1 || [];

                console.log("mainData", mainData);
                console.log("d1Data", d1Data);
                // uid wise map bana lo
                const d1Map = {};

                d1Data.forEach(item => {
                    if (!d1Map[item.uid]) {
                        d1Map[item.uid] = [];
                    }
                    d1Map[item.uid].push(item);
                });

                // main data me d1 attach kar do
                const finalData = mainData.map(item => ({
                    ...item,
                    partyList: d1Map[item.uid] || []
                }));


                console.log("finalData", finalData);
                setData(finalData);

                setAllHistoryDataSPO([]);
                setAllVerifyDataSPO([]);

            }
            else {
                setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingSPO(false);
        }
    };

    const fetchHistoryData = async (parcode: string, prptype: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsHistoryLoadingSPO(true);
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
                setHistoryDataSPO(response.data.data);
                setAllVerifyDataSPO([]);
                setData([]);
            }
            else {
                setHistoryDataSPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoadingSPO(false);
        }
    };

    const fetchAllHistoryData = async () => {
        // setActiveTabSPO('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingSPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'production_order_sudo',
                referrer: 'dashboard',
                prptype: 'S',
                yearno: getCurrentFinancialYear(),
                atype: 'H',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/prodorderbrowsesudo`,
                `${API}/api/prodorderbrowsesudo`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history payload', allhistoryPayload);
            // if (response.data.success && response.data.data.length > 0) {
            //     console.log('✅All History Data:', response.data.data);
            //     setAllHistoryDataSPO(response.data.data);
            //     setData([]);
            //     setAllVerifyDataSPO([]);

            // } 
            if (response.data.success && response.data.data.data.length > 0) {
                console.log('✅ Data:', response.data.data);

                const mainData = response.data.data.data || [];
                const d1Data = response.data.data.d1 || [];

                console.log("mainData", mainData);
                console.log("d1Data", d1Data);
                // uid wise map bana lo
                const d1Map = {};

                d1Data.forEach(item => {
                    if (!d1Map[item.uid]) {
                        d1Map[item.uid] = [];
                    }
                    d1Map[item.uid].push(item);
                });

                // main data me d1 attach kar do
                const finalData = mainData.map(item => ({
                    ...item,
                    partyList: d1Map[item.uid] || []
                }));


                console.log("finalData", finalData);
                setAllHistoryDataSPO(finalData);

                setData([]);
                setAllVerifyDataSPO([]);
            }
            else {
                setAllHistoryDataSPO([]);
                // setPartyListSPO([]);
                // setHistoryDataSPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingSPO(false);
        }
    };

    const fetchAllVerifyData = async () => {
        // setActiveTabSPO('allhistory');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoadingSPO(true);
        try {
            const allhistoryPayload = {
                txntype: 'production_order_sudo',
                referrer: 'dashboard',
                prptype: 'S',
                yearno: getCurrentFinancialYear(),
                atype: 'A',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/prodorderbrowsesudo`,
                `${API}/api/prodorderbrowsesudo`,
                getRequestConfig({
                    params: {
                        ...allhistoryPayload
                    }
                })
            );
            console.log('🔵all history payload', allhistoryPayload);
            // if (response.data.success && response.data.data.length > 0) {
            //     console.log('✅All History Data:', response.data.data);

            //     setAllVerifyDataSPO(response.data.data);
            //     setData([]);
            //     setAllHistoryDataSPO([]);

            // } 
            if (response.data.success && response.data.data.data.length > 0) {
                console.log('✅ Data:', response.data.data);
                const mainData = response.data.data.data || [];
                const d1Data = response.data.data.d1 || [];

                console.log("mainData", mainData);
                console.log("d1Data", d1Data);
                // uid wise map bana lo
                const d1Map = {};

                d1Data.forEach(item => {
                    if (!d1Map[item.uid]) {
                        d1Map[item.uid] = [];
                    }
                    d1Map[item.uid].push(item);
                });
                const finalData = mainData.map(item => ({
                    ...item,
                    partyList: d1Map[item.uid] || []
                }));
                console.log("finalData", finalData);
                setAllVerifyDataSPO(finalData);
                setData([]);
                setAllHistoryDataSPO([]);
            }
            else {
                setAllVerifyDataSPO([]);
                // setPartyListSPO([]);
                // setHistoryDataSPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoadingSPO(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        if (activeTab1SPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1SPO === 'requests') {
            fetchData();
        } else if (activeTab1SPO === 'verify') {
            fetchAllVerifyData();
        }
    }, [activeTab1SPO, token]);

    // const callhisttoryfunction = () => {
    //     setShowPartyHistoryModalSPO(true);
    //     setActiveTabSPO('allhistory');
    //     fetchAllHistoryData();
    // };

    const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
        setActiveTabSPO('party');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsPrdoOrderLoadingSPO(true);
        try {
            const historyPayload = {
                prpcodes: [prpcode],
                prptype: prptype,
                yearno: yearno,
                strcode: '',
                parcodes: [parcode],
                txntype: 'production_order_sudo',
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
                setPartyListSPO(response.data.response.data);
                fetchHistoryData(parcode, prptype);
            } else {
                setPartyListSPO([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsPrdoOrderLoadingSPO(false);
        }
    };

    // useEffect(() => {
    //     fetchData();
    //     return () => cancelToken?.cancel();
    // }, []);

    // Search by All / Design / Production order (see productionOrderActions.ts)
    const filteredDataSPO = useMemo(
        () => data.filter((item) => matchesPOSearch(item, searchQuerySPO, searchFieldSPO)),
        [data, searchQuerySPO, searchFieldSPO]
    );

    const filteredhistoryDataSPO = useMemo(
        () => allhistoryDataSPO.filter((item) => matchesPOSearch(item, searchhistoryQuerySPO, searchFieldSPO)),
        [allhistoryDataSPO, searchhistoryQuerySPO, searchFieldSPO]
    );

    const filteredverifyDataSPO = useMemo(
        () => allverifyDataSPO.filter((item) => matchesPOSearch(item, searchverifyQuerySPO, searchFieldSPO)),
        [allverifyDataSPO, searchverifyQuerySPO, searchFieldSPO]
    );

    const activeSearchQuery =
        activeTab1SPO === 'history' ? searchhistoryQuerySPO : activeTab1SPO === 'verify' ? searchverifyQuerySPO : searchQuerySPO;
    const setActiveSearchQuery = (value: string) => {
        if (activeTab1SPO === 'history') setSearchhistoryQuerySPO(value);
        else if (activeTab1SPO === 'verify') setSearchverifyQuerySPO(value);
        else setSearchQuerySPO(value);
    };
    const activeResultCount =
        activeTab1SPO === 'history' ? filteredhistoryDataSPO.length : activeTab1SPO === 'verify' ? filteredverifyDataSPO.length : filteredDataSPO.length;
    const activeTotalCount =
        activeTab1SPO === 'history' ? allhistoryDataSPO.length : activeTab1SPO === 'verify' ? allverifyDataSPO.length : data.length;

    // ---- Modify / Delete (blocked once authorised) ---------------------------
    const replaceEverywhere = (updated: any) => {
        const swap = (list: any[]) => list.map((row) => (row.uid === updated.uid ? { ...row, ...updated } : row));
        setData((prev) => swap(prev));
        setAllHistoryDataSPO((prev) => swap(prev));
        setAllVerifyDataSPO((prev) => swap(prev));
        // Drop stale inline edits so the card shows the saved values.
        setEditableValuesSPO((prev) => {
            const next = { ...prev };
            delete next[updated.uid];
            return next;
        });
    };

    const removeEverywhere = (uid: string) => {
        setData((prev) => prev.filter((row) => row.uid !== uid));
        setAllHistoryDataSPO((prev) => prev.filter((row) => row.uid !== uid));
        setAllVerifyDataSPO((prev) => prev.filter((row) => row.uid !== uid));
    };

    const openModify = (item: any) => {
        if (!isConnected) return;
        if (!canChangePO(item)) {
            AppAlert.alert('Locked', 'This Production Order is already authorised and can no longer be modified.');
            return;
        }
        setEditItemSPO(item);
    };

    const openDelete = (item: any) => {
        if (!isConnected) return;
        if (!canChangePO(item)) {
            AppAlert.alert('Locked', 'This Production Order is already authorised and can no longer be deleted.');
            return;
        }
        setDeleteErrorSPO('');
        setDeleteItemSPO(item);
    };

    const confirmDelete = async () => {
        if (!deleteItemSPO) return;
        setDeletingSPO(true);
        setDeleteErrorSPO('');
        try {
            const res = await deleteProductionOrder(deleteItemSPO, token);
            removeEverywhere(deleteItemSPO.uid);
            setDeleteItemSPO(null);
            AppAlert.alert('Deleted', res?.message || `Production Order ${deleteItemSPO.vouno} deleted.`);
        } catch (e: any) {
            setDeleteErrorSPO(e?.response?.data?.message || e?.message || 'Production Order could not be deleted.');
        } finally {
            setDeletingSPO(false);
        }
    };

    const renderManageActions = (item: any) => {
        if (isAuthorisedPO(item)) {
            return (
                <View style={{
                    marginTop: 9, minHeight: 36, borderRadius: 9, backgroundColor: '#F3F4F6',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                    <Icon name="lock" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700' }}>Authorised · modify & delete locked</Text>
                </View>
            );
        }
        const disabled = !isConnected || !canChangePO(item);
        return (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}>
                <TouchableOpacity
                    onPress={() => openModify(item)}
                    disabled={disabled}
                    style={{
                        flex: 1, minHeight: 40, borderRadius: 9, borderWidth: 1,
                        borderColor: disabled ? '#D1D5DB' : '#C9732E', backgroundColor: '#FFFFFF',
                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                    }}
                >
                    <Icon name="edit" size={18} color={disabled ? '#9CA3AF' : '#C9732E'} />
                    <Text style={{ color: disabled ? '#9CA3AF' : '#A85A1F', fontSize: 12.5, fontWeight: '800' }}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => openDelete(item)}
                    disabled={disabled}
                    style={{
                        flex: 1, minHeight: 40, borderRadius: 9, borderWidth: 1,
                        borderColor: disabled ? '#D1D5DB' : '#F0B7B7', backgroundColor: '#FFFFFF',
                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                    }}
                >
                    <Icon name="delete-outline" size={18} color={disabled ? '#9CA3AF' : '#E53935'} />
                    <Text style={{ color: disabled ? '#9CA3AF' : '#C62828', fontSize: 12.5, fontWeight: '800' }}>Delete</Text>
                </TouchableOpacity>
            </View>
        );
    };


    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };
    const handleEdit = (uid: string, field: 'limit2' | 'crday2' | 'rate' | 'qty' | 'shkperc' | 'aremark', formattedValue: string) => {
        const rawValue = formattedValue.replace(/[₹,]/g, '');
        const rawValuecrday = formattedValue.replace(/[₹,]/g, '');
        const displayValue = formatToIndianCurrency(rawValue || '0');
        const displayValuecrday = (formattedValue);
        const displayValuearemark = (formattedValue);
        setEditableValuesSPO(prev => ({
            ...prev,
            [uid]: {
                ...prev[uid],
                [field]: field === 'limit2' ? displayValue : displayValuecrday,
                [field]: field === 'aremark' ? displayValuearemark : displayValuearemark,
                [`${field}Raw`]: field === 'limit2' ? rawValue : rawValuecrday,
            },
        }));
    };

    const handleIconPress = (item: CardData, action: 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject') => {
        if (action === 'list') {
            setSelectedItemSPO(item);
            setSelectedActionSPO(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            setShowPartyHistoryModalSPO(true);
            setParnameSPO(item.parname);
            return;
        } else if (action === 'pending') {
            setSelectedItemSPO(item);
            setSelectedActionSPO(action);
            setShowOverlaySPO(true);
            return;
        } else if (action === 'verifyreject') {
            setSelectedItemSPO(item);
            setSelectedActionSPO(action);
            setShowOverlaySPO(true);
            return;
        }
        else {
            setSelectedItemSPO(item);
            setSelectedActionSPO(action);
            setShowOverlaySPO(true);
            return;
        }
    };

    const getToken = () => {
        return token;
    };

    const handleValidation = (updatedItem: any) => {
        if (selectedActionSPO === 'accept') {

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
        if (selectedActionSPO === 'pending' || selectedActionSPO === 'verifyreject') {

            if (
                updatedItem.aremark === '' || updatedItem.aremark === null || updatedItem.aremark === undefined || !updatedItem.aremark
            ) {
                AppAlert.alert(
                    'Validation Error',
                    'Auth Remark cannot be empty for Vouchar No.: ' + updatedItem.vouno
                )
                setShowOverlaySPO(false);
                return false;
            }
        }
        return true;

    };

    const scrollToTop = () => {
        flatListRefSPO.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const scrollHistoryToTop = () => {
        flatHistoryListRefSPO.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const scrollVerifyToTop = () => {
        flatVerifyListRefSPO.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleConfirmAction = async () => {
        if (!selectedItemSPO) return;
        const updatedItemAccept = {
            ...selectedItemSPO,
            // limit2: editableValuesSPO[selectedItemSPO.uid]?.limit2 || formatToIndianCurrency(selectedItemSPO.limit2 || '0'),
            // limit3: editableValuesSPO[selectedItemSPO.uid]?.limit2 || formatToIndianCurrency(selectedItemSPO.limit2 || '0'),
            rate: editableValuesSPO[selectedItemSPO.uid]?.rate || (selectedItemSPO.rate || '0'),
            qty: editableValuesSPO[selectedItemSPO.uid]?.qty || (selectedItemSPO.qty || '0'),
            shkperc: editableValuesSPO[selectedItemSPO.uid]?.shkperc || (selectedItemSPO.shkperc || '0'),
            aremark: editableValuesSPO[selectedItemSPO.uid]?.aremark || (selectedItemSPO.aremark || ''),
            // crday2: editableValuesSPO[selectedItemSPO.uid]?.crday2 || (selectedItemSPO.crday2 || '0'),
            // crday3: editableValuesSPO[selectedItemSPO.uid]?.crday2 || (selectedItemSPO.crday2 || '0'),
            isauth: 1,
            prptype: 'S',
            referrer: 'dashboard',
            txntype: 'production_order_sudo',
            action: 'edit'
        };
        const updatedItemVerifyPending = {
            ...selectedItemSPO,
            aremark: editableValuesSPO[selectedItemSPO.uid]?.aremark || (selectedItemSPO.aremark || ''),
            isauth: 0,
            prptype: 'S',
            referrer: 'dashboard',
            txntype: 'production_order_sudo',
            action: 'edit'
        };
        const updatedItemReject = {
            ...selectedItemSPO,
            // limit2: formatToIndianCurrency(selectedItemSPO.limit2 || '0'),
            // limit3: editableValuesSPO[selectedItemSPO.uid]?.limit2 || (selectedItemSPO.limit2 || '0'),
            rate: editableValuesSPO[selectedItemSPO.uid]?.rate || (selectedItemSPO.rate || '0'),
            qty: editableValuesSPO[selectedItemSPO.uid]?.qty || (selectedItemSPO.qty || '0'),
            shkperc: editableValuesSPO[selectedItemSPO.uid]?.shkperc || (selectedItemSPO.shkperc || '0'),
            aremark: editableValuesSPO[selectedItemSPO.uid]?.aremark || (selectedItemSPO.aremark || ''),
            // crday2: formatToIndianCurrency(selectedItemSPO.crday2 || '0'),
            // crday3: editableValuesSPO[selectedItemSPO.uid]?.crday2 || (selectedItemSPO.crday2 || '0'),
            isauth: 2,
            prptype: 'S',
            referrer: 'dashboard',
            txntype: 'production_order_sudo',
            action: 'edit'
        };
        const updatedItemVerifyReject = {
            ...selectedItemSPO,
            aremark: editableValuesSPO[selectedItemSPO.uid]?.aremark || (selectedItemSPO.aremark || ''),
            isauth: 2,
            prptype: 'S',
            referrer: 'dashboard',
            txntype: 'production_order_sudo',
            action: 'edit'
        };
        const payload = selectedActionSPO === 'accept' ? updatedItemAccept : selectedActionSPO === 'pending' ? updatedItemVerifyPending : selectedActionSPO === 'reject' ? updatedItemReject : selectedActionSPO === 'verifyreject' ? updatedItemVerifyReject : 'null';

        console.log('✅ payload', payload);

        if (handleValidation(payload)) {
            setSuccessSPO(true);
            setresponsemessageSPO('Loading...');

            console.log(`${selectedActionSPO} confirmed for:`, payload);
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
                // const response = await axios.get(`https://apig.tms-webapp.com/api/prodorderauthsudo`, getRequestConfig({ params: payload }));
                const response = await axios.get(`${API}/api/prodorderauthsudo`, getRequestConfig({ params: payload }));
                if (response.data.success) {
                    setresponsemessageSPO(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccessSPO(false);
                        setShowOverlaySPO(false);
                    }, 2000);
                    // setProcessedCards(prev => new Set(prev).add(selectedItemSPO.uid));
                    setData(prevData => {
                        const newData = prevData.filter(item => item.uid !== selectedItemSPO.uid);
                        newData.push({ ...selectedItemSPO, isProcessed: true, actionType: selectedActionSPO });
                        return newData;
                    });
                    // if (selectedActionSPO === 'pending' || selectedActionSPO === 'verifyreject') {
                    setAllVerifyDataSPO(prevData => {
                        const newData = prevData.filter(item => item.uid !== selectedItemSPO.uid);
                        newData.push({ ...selectedItemSPO, isProcessed: true, actionType: selectedActionSPO });
                        return newData;
                    });
                    // }
                    setTimeout(() => {
                        flatListRefSPO.current?.scrollToEnd({ animated: true });
                    }, 300);
                    setTimeout(() => {
                        flatVerifyListRefSPO.current?.scrollToEnd({ animated: true });
                    }, 300);
                } else {
                    setresponsemessageSPO(response.data.message || 'Success');
                    setTimeout(() => {
                        setSuccessSPO(false);
                    }, 2000);
                }
            } catch (error) {
                setresponsemessageSPO('Server Error');
                setTimeout(() => {
                    setSuccessSPO(false);
                }, 2000);
            }

        }
    };



    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => {
        const disabled = !isConnected || item.isProcessed;
        const fieldValue = (field: 'rate' | 'qty' | 'shkperc' | 'aremark', fallback: any = '') =>
            editableValuesSPO[item.uid]?.[field] !== undefined
                ? String(editableValuesSPO[item.uid]?.[field] ?? '')
                : String(fallback ?? '');
        const display = (value: any, fallback = '—') => {
            const v = String(value ?? '').trim();
            return v !== '' ? v : fallback;
        };

        return (
            <View style={crlimtreq_styles.gridCardWrapper}>
                <View style={[
                    crlimtreq_styles.card,
                    !isConnected && crlimtreq_styles.disabledCard,
                    item.actionType === 'accept'
                        ? crlimtreq_styles.acceptedCard
                        : item.actionType === 'reject'
                            ? crlimtreq_styles.rejectedCard
                            : crlimtreq_styles.card
                ]}>
                    {item.isProcessed && (
                        <View style={crlimtreq_styles.stampContainerPOS}>
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
                        <Text style={crlimtreq_styles.dateText}>{item.voudate}</Text>
                    </View>
                    <View style={[crlimtreq_styles.cardHeaderContainer, { alignItems: 'center' }]}>
                        <View style={crlimtreq_styles.cardHeader}>
                            <Text style={crlimtreq_styles.cardHeaderText}>{item.vouno}</Text>
                        </View>
                    </View>

                    <View style={[crlimtreq_styles.cardContent, { paddingTop: 10 }]}>
                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Item Name:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.itmname)}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Type:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.ratetype)}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Design:</Text>
                                <Text style={crlimtreq_styles.valueBold}>{display(item.dsnname || item.orderdesign)}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Shade:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.shdname)}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Rate:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValueBlack}
                                    value={fieldValue('rate', item.rate)}
                                    onChangeText={(text) => handleEdit(item.uid, 'rate', text)}
                                    keyboardType="decimal-pad"
                                    editable={!disabled}
                                />
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Production Qty:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValueBlack}
                                    value={fieldValue('qty', item.qty)}
                                    onChangeText={(text) => handleEdit(item.uid, 'qty', text)}
                                    keyboardType="decimal-pad"
                                    editable={!disabled}
                                />
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>SExe:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.sexename)}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Pick Rate:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.pickrate, '0.00')}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Shrink Per%:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValueBlack}
                                    value={fieldValue('shkperc', item.shkperc)}
                                    onChangeText={(text) => handleEdit(item.uid, 'shkperc', text)}
                                    keyboardType="decimal-pad"
                                    editable={!disabled}
                                />
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Remark:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.remark)}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                                <RNTextInput
                                    style={crlimtreq_styles.editableValueBlack}
                                    value={fieldValue('aremark', item.aremark)}
                                    onChangeText={(text) => handleEdit(item.uid, 'aremark', text)}
                                    placeholder="Optional remark"
                                    editable={!disabled}
                                />
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Auth. Date:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.authoriseddate)}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Job Qty:</Text>
                                <Text style={crlimtreq_styles.Authvalue}>{display(item.jobqty, '0.00')}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Self Prod. Qty:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.selfprodqty, '0.00')}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Auth. by:</Text>
                                <Text style={crlimtreq_styles.valueBold}>{display(item.authorisedby)}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Status:</Text>
                                <Text style={crlimtreq_styles.value}>{display(item.authstatus, 'Pending')}</Text>
                            </View>
                        </View>

                        <View style={crlimtreq_styles.twoColumnRow}>
                            <View style={crlimtreq_styles.keyValuePair}>
                                <Text style={crlimtreq_styles.key}>Expected Date:</Text>
                                <Text style={crlimtreq_styles.valueBold}>{display(item.expdate || item.deliverydate)}</Text>
                            </View>
                            <View style={crlimtreq_styles.keyValuePair} />
                        </View>

                        {item.partyList?.length > 0 && (
                            <View style={[crlimtreq_styles.partyContainer, { marginTop: 8 }]}>
                                <View style={crlimtreq_styles.partyHeader}>
                                    <Text style={[crlimtreq_styles.headerText, { flex: 1 }]}>Job Work Party</Text>
                                    <Text style={[crlimtreq_styles.headerText, { width: 90, textAlign: 'right' }]}>Qty</Text>
                                </View>
                                <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled showsVerticalScrollIndicator>
                                    {item.partyList.map((party: any, index: number) => (
                                        <View key={index} style={crlimtreq_styles.partyRow}>
                                            <Text style={crlimtreq_styles.partyName1} numberOfLines={2}>{party.Partyname}</Text>
                                            <Text style={crlimtreq_styles.partyQty}>{party.qty}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => openAuthorizationReview(item)}
                            disabled={disabled}
                            style={{
                                marginTop: 12,
                                minHeight: 42,
                                borderRadius: 9,
                                borderWidth: 1,
                                borderColor: disabled ? '#D1D5DB' : '#17324A',
                                backgroundColor: '#FFFFFF',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 7
                            }}
                        >
                            <Icon name="fact-check" size={19} color={disabled ? '#9CA3AF' : '#17324A'} />
                            <Text style={{ color: disabled ? '#9CA3AF' : '#17324A', fontSize: 12.5, fontWeight: '800' }}>
                                Review costing
                            </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 9, marginBottom: 4 }}>
                            <TouchableOpacity
                                onPress={() => handleIconPress(item, 'accept')}
                                disabled={disabled}
                                style={{
                                    flex: 1, minHeight: 42, borderRadius: 9,
                                    backgroundColor: disabled ? '#D1D5DB' : '#2EAD5B',
                                    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                                }}
                            >
                                <Icon name="check-circle" size={19} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>Authorize</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleIconPress(item, 'reject')}
                                disabled={disabled}
                                style={{
                                    flex: 1, minHeight: 42, borderRadius: 9,
                                    backgroundColor: '#FFFFFF', borderWidth: 1,
                                    borderColor: disabled ? '#D1D5DB' : '#F0B7B7',
                                    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                                }}
                            >
                                <Icon name="cancel" size={19} color={disabled ? '#9CA3AF' : '#E53935'} />
                                <Text style={{ color: disabled ? '#9CA3AF' : '#C62828', fontSize: 12.5, fontWeight: '800' }}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                        {renderManageActions(item)}
                    </View>
                </View>
            </View>
        );
    };

    const renderAllCardHistory = ({ item }: { item: AllHistoryData }) => (
        <View style={crlimtreq_styles.gridCardWrapper}>
            <View style={[
                crlimtreq_styles.card,
                item.isauth === '1' ? crlimtreq_styles.acceptedCard : item.isauth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
            ]}>
                {item.isauth && (
                    <View style={crlimtreq_styles.stampContainerPOS}>
                        <View style={[
                            crlimtreq_styles.stamp,
                            item.isauth === '1' ? crlimtreq_styles.stampAccepted : item.isauth === '2' ? crlimtreq_styles.stampRejected : crlimtreq_styles.stampPendingall
                        ]}>
                            <Text style={crlimtreq_styles.stampText}>
                                {item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' ? 'REJECTED' : 'PENDING'}
                            </Text>
                        </View>
                    </View>
                )}
                <View style={crlimtreq_styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.voudate}</Text>
                </View>
                <View style={crlimtreq_styles.cardHeaderContainer}>
                    <View style={crlimtreq_styles.cardHeader}>
                        <Text style={crlimtreq_styles.cardHeaderText}>{item.vouno}</Text>
                    </View>
                </View>
                {/* <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.parname}</Text>
            </View> */}
                <View style={crlimtreq_styles.cardContent}>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Item Name:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.itmname || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Type:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.ratetype || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Design:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.dsnname || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Shade:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.shdname || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Rate:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.rate || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Production Qty:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.qty || ''}
                            </Text>
                        </View>
                    </View>
                    {/* <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Production Qty:</Text>
                        <Text style={crlimtreq_styles.Authvalue}>
                            {item.qty || ''}
                        </Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Order Qty.:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.orderqty || ''}
                        </Text>
                    </View>
                </View> */}

                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>SExe:</Text>
                            <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Pick Rate:</Text>
                            <Text style={crlimtreq_styles.value}>{item.pickrate}</Text>
                        </View>
                    </View>

                    {/* <View style={crlimtreq_styles.fullWidthRow}>
                    <Text style={crlimtreq_styles.key}>SExe:</Text>
                    <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
                </View> */}
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Shrink Per%:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.shkperc || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Remark:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.remark || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.aremark || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. Date:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.authoriseddate || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Job Qty:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.jobqty || 'N/A'}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Self Prod. Qty:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.selfprodqty || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. by:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.authorisedby || 'N/A'}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Status:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.authstatus || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Expected Date:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.expdate || 'N/A'}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            {/* <Text style={crlimtreq_styles.key}>Status:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.authstatus || ''}
                        </Text> */}
                        </View>
                    </View>


                    {item.partyList?.length > 0 && (
                        <View style={crlimtreq_styles.partyContainer}>

                            <View style={crlimtreq_styles.partyHeader}>
                                <Text style={[crlimtreq_styles.headerText, { flex: 1 }]}>
                                    Job Work Party
                                </Text>

                                <Text style={[crlimtreq_styles.headerText, { width: 90, textAlign: 'right' }]}>
                                    Qty
                                </Text>
                            </View>

                            <ScrollView
                                style={{ maxHeight: 150 }}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {item.partyList.map((party, index) => (
                                    <View
                                        key={index}
                                        style={crlimtreq_styles.partyRow}
                                    >
                                        <Text
                                            style={crlimtreq_styles.partyName1}
                                            numberOfLines={2}
                                        >
                                            {party.Partyname}
                                        </Text>

                                        <Text style={crlimtreq_styles.partyQty}>
                                            {party.qty}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>

                        </View>
                    )}

                    {renderManageActions(item)}

                    <View style={crlimtreq_styles.cardActions}>
                        {/* <TouchableOpacity
                    onPress={() => {
                        if (isConnected && !item.isProcessed) {
                            // const encodedData = encodeData(item.prpcode, item.yearno, item.costuid, 'production_order_sudo', token);
                            const url = `https://ind.tms-webapp.com/app-weavingtemplete/${item.prpcode}/${item.yearno}/${item.costuid}/production_order_sudo`; // URL-encode
                            console.log("🔵 Encoded URL:", url); // Example: "https://ind.tms-webapp.com/YWJjLzIwMjUvMTIzL3Byb2R1Y3Rpb25fb3JkZXJfc3Vkby90b2tlbjEyMw=="
                            Linking.openURL(url);

                        }
                    }}
                    disabled={!isConnected || item.isProcessed}
                >
                    <Icon name="file-present" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#2196F3"} />
                </TouchableOpacity> */}
                        <TouchableOpacity
                            onPress={() => openProductionCosting(item)}
                            disabled={!isConnected || item.isProcessed}
                        >
                            <Icon name="file-present" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#2196F3"} />
                        </TouchableOpacity>



                    </View>

                </View>
            </View>
        </View>
    );

    const renderAllCardVerify = ({ item }: { item: AllHistoryData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' | 'pending' } }) => (
        <View style={crlimtreq_styles.gridCardWrapper}>
            <View style={[
                crlimtreq_styles.card,
                item.isauth === '1' ? crlimtreq_styles.acceptedCard : item.isauth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card,
                // item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
            ]}>
                {item.isProcessed ? (
                    <>
                        <View style={crlimtreq_styles.stampContainerPOS}>
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
                        <View style={crlimtreq_styles.stampContainerPOS}>
                            <View style={[
                                crlimtreq_styles.stamp,
                                item.isauth === '1' ? crlimtreq_styles.stampAccepted : item.isauth === '2' ? crlimtreq_styles.stampRejected : item.isauth === '0' || item.isauth === 0 ? crlimtreq_styles.stampPendingall : '',
                            ]}>
                                <Text style={crlimtreq_styles.stampText}>
                                    {item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' || item.isauth === 2 ? 'REJECTED' : item.isauth === '0' || item.isauth === 0 ? 'PENDING' : ''}
                                </Text>
                            </View>
                        </View>
                    </>
                )}
                <View style={crlimtreq_styles.dateContainer}>
                    <Text style={crlimtreq_styles.dateText}>{item.voudate}</Text>
                </View>
                <View style={crlimtreq_styles.cardHeaderContainer}>
                    <View style={crlimtreq_styles.cardHeader}>
                        <Text style={crlimtreq_styles.cardHeaderText}>{item.vouno}</Text>
                    </View>
                </View>
                {/* <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.parname}</Text>
            </View> */}
                <View style={crlimtreq_styles.cardContent}>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Item Name:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.itmname || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Type:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.ratetype || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Design:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.dsnname || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Shade:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.shdname || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Rate:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.rate || ''}
                            </Text>
                            {/* <RNTextInput
                            style={crlimtreq_styles.editableValueBlack}
                            value={
                                editableValuesSPO[item.uid]?.rate !== undefined
                                    ? formatToIndianCurrency(item.rate || '0')
                                    : formatToIndianCurrency(item.rate || '0')
                            }
                            onChangeText={(text) => handleEdit(item.uid, 'rate', text)}
                            keyboardType="numeric"
                        /> */}
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Production Qty:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.qty || ''}
                            </Text>
                            {/* <RNTextInput
                            style={crlimtreq_styles.editableValueBlack}
                            value={
                                editableValuesSPO[item.uid]?.qty !== undefined
                                    ? editableValuesSPO[item.uid].qty
                                    : formatToIndianCurrency(item.qty || '0')
                            }
                            onChangeText={(text) => handleEdit(item.uid, 'qty', text)}
                            keyboardType="numeric"
                        /> */}
                        </View>
                        {/* <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Party:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.partyname || ''}
                        </Text>
                    </View> */}
                    </View>

                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>SExe:</Text>
                            <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Pick Rate:</Text>
                            <Text style={crlimtreq_styles.value}>{item.pickrate}</Text>
                        </View>
                    </View>

                    {/* <View style={crlimtreq_styles.fullWidthRow}>
                    <Text style={crlimtreq_styles.key}>SExe:</Text>
                    <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
                </View> */}

                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Shrink Per%:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.shkperc || ''}
                            </Text>
                            {/* <RNTextInput
                            style={crlimtreq_styles.editableValueBlack}
                            value={
                                editableValuesSPO[item.uid]?.shkperc !== undefined
                                    ? editableValuesSPO[item.uid].shkperc
                                    : formatToIndianCurrency(item.shkperc || '0')
                            }
                            onChangeText={(text) => handleEdit(item.uid, 'shkperc', text)}
                            keyboardType="numeric"
                        /> */}
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Remark:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.remark || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth Remark:</Text>
                            <RNTextInput
                                style={crlimtreq_styles.editableValueBlack}
                                value={editableValuesSPO[item.uid]?.aremark || ''}
                                onChangeText={(text) => handleEdit(item.uid, 'aremark', text)}
                            // keyboardType="numeric"
                            />
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. Date:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.authoriseddate || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Job Qty:</Text>
                            <Text style={crlimtreq_styles.Authvalue}>
                                {item.jobqty || 'N/A'}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Self Prod. Qty:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.selfprodqty || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Auth. by:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.authorisedby || ''}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Status:</Text>
                            <Text style={crlimtreq_styles.value}>
                                {item.authstatus || ''}
                            </Text>
                        </View>
                    </View>
                    <View style={crlimtreq_styles.twoColumnRow}>
                        <View style={crlimtreq_styles.keyValuePair}>
                            <Text style={crlimtreq_styles.key}>Expected Date:</Text>
                            <Text style={crlimtreq_styles.valueBold}>
                                {item.expdate || 'N/A'}
                            </Text>
                        </View>
                        <View style={crlimtreq_styles.keyValuePair}>
                            {/* <Text style={crlimtreq_styles.key}>Status:</Text>
                        <Text style={crlimtreq_styles.value}>
                            {item.authstatus || ''}
                        </Text> */}
                        </View>
                    </View>

                    {item.partyList?.length > 0 && (
                        <View style={crlimtreq_styles.partyContainer}>

                            <View style={crlimtreq_styles.partyHeader}>
                                <Text style={[crlimtreq_styles.headerText, { flex: 1 }]}>
                                    Job Work Party
                                </Text>

                                <Text style={[crlimtreq_styles.headerText, { width: 90, textAlign: 'right' }]}>
                                    Qty
                                </Text>
                            </View>

                            <ScrollView
                                style={{ maxHeight: 150 }}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {item.partyList.map((party, index) => (
                                    <View
                                        key={index}
                                        style={crlimtreq_styles.partyRow}
                                    >
                                        <Text
                                            style={crlimtreq_styles.partyName1}
                                            numberOfLines={2}
                                        >
                                            {party.Partyname}
                                        </Text>

                                        <Text style={crlimtreq_styles.partyQty}>
                                            {party.qty}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {renderManageActions(item)}
                </View>
                <View style={crlimtreq_styles.cardActions}>
                    <TouchableOpacity onPress={() => handleIconPress(item, 'pending')} disabled={!isConnected || item.isProcessed}>
                        <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleIconPress(item, 'verifyreject')} disabled={!isConnected || item.isProcessed}>
                        <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );



    const TabBar = ({ activeTabSPO, setActiveTabSPO }) => (
        <View style={crlimtreq_styles.tabContainer1}>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabSPO === 'requests' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabSPO('requests')}
            >
                <Text style={crlimtreq_styles.tabText1}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabSPO === 'history' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabSPO('history')}
            >
                <Text style={crlimtreq_styles.tabText1}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTabSPO === 'verify' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTabSPO('verify')}
            >
                <Text style={crlimtreq_styles.tabText1}>Verify</Text>
            </TouchableOpacity>
        </View>
    );


    return (
        <>
            {activeTab1SPO === 'requests' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQuerySPO}
                    placeholder="Search production order..."
                />
            ) : activeTab1SPO === 'history' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchhistoryQuerySPO}
                    placeholder="Search production history..."
                />
            ) : activeTab1SPO === 'verify' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchverifyQuerySPO}
                    placeholder="Search production verify..."
                />
            ) : null}
            <View style={[crlimtreq_styles.container, { flex: 1, backgroundColor: '#F5F5F5', marginBottom: -50 }]}>
                {isLoadingSPO && <FullScreenLoader message={'Loading...'} />}
                <TabBar activeTabSPO={activeTab1SPO} setActiveTabSPO={setActiveTab1SPO} />

                {/* Search: by design / production order */}
                <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4, gap: 8 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
                        borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 10, paddingHorizontal: 10, minHeight: 42
                    }}>
                        <Icon name="search" size={20} color="#6B7280" />
                        <RNTextInput
                            value={activeSearchQuery}
                            onChangeText={setActiveSearchQuery}
                            placeholder={PO_SEARCH_FIELDS.find((f) => f.key === searchFieldSPO)?.placeholder}
                            placeholderTextColor="#9CA3AF"
                            autoCorrect={false}
                            autoCapitalize="none"
                            style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, color: '#111827' }}
                        />
                        {!!activeSearchQuery && (
                            <TouchableOpacity onPress={() => setActiveSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="close" size={18} color="#6B7280" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={{ fontSize: 11.5, color: '#6B7280', fontWeight: '700', marginRight: 2 }}>Search in:</Text>
                        {PO_SEARCH_FIELDS.map((f) => {
                            const active = searchFieldSPO === f.key;
                            return (
                                <TouchableOpacity
                                    key={f.key}
                                    onPress={() => setSearchFieldSPO(f.key)}
                                    style={{
                                        paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, borderWidth: 1,
                                        borderColor: active ? '#17324A' : '#D1D5DB',
                                        backgroundColor: active ? '#17324A' : '#FFFFFF'
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : '#374151' }}>{f.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        {!!activeSearchQuery.trim() && (
                            <Text style={{ fontSize: 11.5, color: '#6B7280', marginLeft: 'auto' }}>
                                {activeResultCount} of {activeTotalCount}
                            </Text>
                        )}
                    </View>
                </View>
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
                {activeTab1SPO === 'requests' ? (
                    <FlatList
                        key={`req-${numColumns}`}
                        ref={flatListRefSPO}
                        data={filteredDataSPO}
                        numColumns={numColumns}
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                        renderItem={({ item }) => renderCard({ item })}
                        keyExtractor={(item) => item.uid}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonSPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !isLoadingSPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1SPO === 'history' ? (
                    <FlatList
                        key={`hist-${numColumns}`}
                        ref={flatHistoryListRefSPO}
                        data={filteredhistoryDataSPO}
                        numColumns={numColumns}
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                        renderItem={({ item }) => (
                            <>
                                {renderAllCardHistory({ item })}
                            </>
                        )}
                        keyExtractor={(item) => item.uid}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonSPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingSPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No history data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1SPO === 'verify' ? (
                    <FlatList
                        key={`ver-${numColumns}`}
                        ref={flatVerifyListRefSPO}
                        data={filteredverifyDataSPO}
                        numColumns={numColumns}
                        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                        renderItem={({ item }) => renderAllCardVerify({ item })}
                        keyExtractor={(item) => item.uid}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButtonSPO(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !allhistoryLoadingSPO ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No verify data found!</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : null}
                {activeTab1SPO === 'requests' ? (
                    <>
                        {showTopButtonSPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}
                    </>

                ) : activeTab1SPO === 'history' ? (
                    <>
                        {showTopButtonSPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollHistoryToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}</>
                ) : activeTab1SPO === 'verify' ? (
                    <>
                        {showTopButtonSPO && (
                            <TouchableOpacity
                                style={crlimtreq_styles.topButton}
                                onPress={scrollVerifyToTop}
                            >
                                <Icon name="arrow-upward" size={24} color="black" />
                            </TouchableOpacity>
                        )}</>
                ) : null}


                <PartyHistoryModal
                    visible={showPartyHistoryModalSPO}
                    onClose={() => {
                        setShowPartyHistoryModalSPO(false);
                        setAllHistoryDataSPO([]);
                    }}
                    partyListSPO={partyListSPO}
                    historyDataSPO={historyDataSPO}
                    // allhistoryDataSPO={allhistoryDataSPO}
                    prodorderLoadingSPO={prodorderLoadingSPO}
                    historyLoadingSPO={historyLoadingSPO}
                    // allhistoryLoadingSPO={allhistoryLoadingSPO}
                    // showAllHistoryOnly={!!allhistoryDataSPO.length}
                    activeTabSPO={activeTabSPO}
                    setActiveTabSPO={setActiveTabSPO}
                    // setParnameSPO={setParnameSPO}
                    getParnameSPO={getParnameSPO}
                />
                {getSuccessSPO === true ? (
                    <Modal
                        visible={showOverlaySPO}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowOverlaySPO(false)}
                    >
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedActionSPO === 'accept' ? 'Confirm Accept' : selectedActionSPO === 'pending' ? 'Confirm Pending' : selectedActionSPO === 'reject' ? 'Confirm Reject' : selectedActionSPO === 'verifyreject' ? 'Confirm Reject' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Vouchar No.: {selectedItemSPO?.vouno}
                                </Text>
                                {responsemessageSPO === 'Loading...' ? (
                                    <>
                                        <Text style={crlimtreq_styles.loadingText}>
                                            <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} /> {responsemessageSPO}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={crlimtreq_styles.responseText}>
                                            {responsemessageSPO}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <Modal
                        visible={showOverlaySPO}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowOverlaySPO(false)}
                    >
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedActionSPO === 'accept' ? 'Confirm Accept' : selectedActionSPO === 'pending' ? 'Confirm Pending' : selectedActionSPO === 'reject' ? 'Confirm Reject' : selectedActionSPO === 'verifyreject' ? 'Confirm Reject' : ''}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Vouchar No.: {selectedItemSPO?.vouno}
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
                                        onPress={() => setShowOverlaySPO(false)}
                                    >
                                        <Icon name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
            <Modal
                visible={showWebViewModal}
                animationType="slide"
                onRequestClose={() => setShowWebViewModal(false)}
            >
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={{ padding: 10, backgroundColor: '#f0f0f0', alignItems: 'flex-end', marginTop: 35 }}
                        onPress={() => setShowWebViewModal(false)}
                    >
                        <Icon name="close" size={24} color="black" />
                    </TouchableOpacity>
                    {isWeb() ? (
                        React.createElement('iframe', {
                            title: 'Production Order Preview',
                            src: webViewUrl,
                            style: {
                                flex: 1,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: '#ffffff',
                            },
                            allow: 'fullscreen',
                        })
                    ) : (
                        <WebView
                            source={{ uri: webViewUrl }}
                            style={{ flex: 1 }}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#0000ff" />
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>


            <ProductionOrderAuthorizationReviewModal
                visible={showAuthorizationReview}
                item={authorizationReviewItem}
                token={token}
                onClose={() => {
                    setShowAuthorizationReview(false);
                    setAuthorizationReviewItem(null);
                }}
                onApprove={() => {
                    const current = authorizationReviewItem;
                    setShowAuthorizationReview(false);
                    setAuthorizationReviewItem(null);
                    if (current) handleIconPress(current, 'accept');
                }}
                onReject={() => {
                    const current = authorizationReviewItem;
                    setShowAuthorizationReview(false);
                    setAuthorizationReviewItem(null);
                    if (current) handleIconPress(current, 'reject');
                }}
                onViewCosting={(costingItem) => {
                    // Keep the authorization review open underneath. When the
                    // costing viewer closes, the approver returns to this PO.
                    openProductionCosting(costingItem);
                }}
            />

            <ProductionOrderEditModal
                visible={!!editItemSPO}
                item={editItemSPO}
                token={token}
                onClose={() => setEditItemSPO(null)}
                onSaved={(updated) => {
                    replaceEverywhere(updated);
                    setEditItemSPO(null);
                    AppAlert.alert('Updated', `Production Order ${updated.vouno} updated.`);
                }}
            />

            <Modal
                visible={!!deleteItemSPO}
                transparent
                animationType="fade"
                onRequestClose={() => !deletingSPO && setDeleteItemSPO(null)}
            >
                <View style={crlimtreq_styles.overlayContainer}>
                    <View style={[crlimtreq_styles.overlay, { maxWidth: 420, width: '90%' }]}>
                        <Icon name="delete-forever" size={34} color="#E53935" style={{ alignSelf: 'center' }} />
                        <Text style={crlimtreq_styles.overlayTitle}>Delete production order?</Text>
                        <Text style={crlimtreq_styles.overlayPartyName}>
                            Voucher No.: {deleteItemSPO?.vouno}
                            {deleteItemSPO?.dsnname ? `  ·  Design: ${deleteItemSPO.dsnname}` : ''}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
                            This cannot be undone.
                        </Text>
                        {!!deleteErrorSPO && (
                            <Text style={{ fontSize: 12.5, color: '#B42318', textAlign: 'center', marginTop: 8 }}>{deleteErrorSPO}</Text>
                        )}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity
                                onPress={() => setDeleteItemSPO(null)}
                                disabled={deletingSPO}
                                style={{ flex: 1, minHeight: 40, borderRadius: 9, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ fontWeight: '800', color: '#374151' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={confirmDelete}
                                disabled={deletingSPO}
                                style={{ flex: 1, minHeight: 40, borderRadius: 9, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: deletingSPO ? 0.7 : 1 }}
                            >
                                {deletingSPO && <ActivityIndicator size="small" color="#FFFFFF" />}
                                <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{deletingSPO ? 'Deleting…' : 'Delete'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ProductionCostingPreviewModal
                visible={showCostingPreview}
                mdId={costingPreviewMdId}
                costingId={costingPreviewId}
                greigeQty={costingPreviewGreigeQty}
                onClose={() => {
                    setShowCostingPreview(false);
                    setCostingPreviewMdId('');
                    setCostingPreviewId('');
                    setCostingPreviewGreigeQty(null);
                }}
            />
</>
    );
};
export default SudamoProdOrder;
