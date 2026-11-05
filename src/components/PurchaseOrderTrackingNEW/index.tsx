import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API } from '@/common/API/dynamicAPI';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import {
    Avatar,
    Btn,
    BusyOverlay,
    cellWidth,
    CONTENT_MAX,
    EmptyState,
    Kpi,
    KpiGrid,
    Metric,
    PanelHeader,
    pct,
    ProgressBar,
    SearchBox,
    SectionHead,
    Toolbar,
    useSotLayout,
} from '@/src/components/erpUi';
import CustomDrawer from './CustomDrawer';
// already imported
// import data from './data.json';
// import AsyncStorage from '@/common/utils/compatibleStorage';
// import { crlimtreq_styles } from '../../common/Styles/Style';
import { generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/Functions';
import { CardPayload, DesignData, ExeData, ItemData, ItemStatus, POTData } from './Modal';
// import { get } from 'lodash';

// ---------------------------------------------------------------------------
// NEW ERP UI presentation helpers (no business logic)
// ---------------------------------------------------------------------------

/** Keys the legacy card never listed (shown elsewhere or intentionally hidden). */
const CARD_HIDDEN_KEYS = ['prpname', 'strname', 'party', 'pono', 'prpcode', 'parcode'];

/** Same label rule the legacy card used, with friendlier names for known keys. */
const legacyLabel = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').trim() == 'bqty'
        ? 'Balance Qty'
        : key.replace(/([A-Z])/g, ' $1').trim() == 'recordcount'
            ? 'Number of Records'
            : key.replace(/([A-Z])/g, ' $1').trim();

const NICE_LABELS: Record<string, string> = {
    qty: 'Total Qty',
    bqty: 'Balance Qty',
    pqty: 'Received Qty',
    unitrate: 'Unit Rate',
    amount: 'Amount',
    recordcount: 'Number of Records',
    itmname: 'Item Name',
    itmcode: 'Item Code',
    podate: 'PO Date',
};
const cardLabel = (key: string) => NICE_LABELS[key] || legacyLabel(key);

const AMOUNT_KEYS = ['amount', 'unitrate', 'netamt', 'pendingamt'];
const QTY_KEYS = ['qty', 'bqty', 'pqty', 'recordcount', 'totmtr', 'pendingmtr'];

const isNumeric = (v: any) => typeof v === 'number' || /^\s*-?\d*\.?\d+\s*$/.test(String(v ?? ''));
const toNum = (v: any) => {
    const x = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(x) ? x : 0;
};
const fmtQty = (v: any) =>
    isNumeric(v) ? toNum(v).toLocaleString('en-IN', { maximumFractionDigits: 3 }) : String(v ?? '—') || '—';
const fmtAmt = (v: any) =>
    isNumeric(v) ? `₹ ${toNum(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : String(v ?? '—') || '—';
const fmtCell = (key: string, v: any) => {
    if (AMOUNT_KEYS.includes(key)) return fmtAmt(v);
    if (QTY_KEYS.includes(key)) return fmtQty(v);
    if (v === null || v === undefined || v === '') return '—';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
};
/** Compact KPI quantity (whole units). */
const fmtQtyKpi = (v: number) => Math.round(v).toLocaleString('en-IN');
const hasKey = (rows: any[], key: string) => rows.some((r) => r && r[key] !== undefined && r[key] !== null && r[key] !== '');
const sumKey = (rows: any[], key: string) => rows.reduce((a, r) => a + toNum(r?.[key]), 0);

interface Party {
    parcode: string;
    partyname: string;
    noof: string;
    totmtr: string;
    pendingmtr: string;
    amount: string;
    pendingamt: string;
}

interface Summary {
    noof: string;
    totmtr: string;
    amount: string;
    pendingmtr: string;
    pendingamt: string;
}

const formatValue = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
    return num.toFixed(2);
};

const formatNumber = (value: string) => {
    return parseFloat(value).toLocaleString('en-IN');
};

const PurchaseOrderTracking: React.FC<{ token: string, username: string }> = ({ token, username }) => {
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [renderedData, setRenderedData] = useState<Party[]>([]);
    const [getPartyData, setPartyData] = useState([]);
    const [salessumdata, setsalessumdata] = useState([]);
    const [salesdata, setsalesdata] = useState<Party[]>([]);
    const [salesdataTotal, setsalesdataTotal] = useState<number | null>(null);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(false);
    const [txntype, settxntype] = useState('purchase_order_track')
    const [getTrackingLoader, setTrackingLoader] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [filteredData, setFilteredData] = useState<Party[]>([]);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear);
    const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYearMain());
    const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
    const [exeData, setExeData] = useState<ExeData[]>([]);
    const [propertydata, setpropertydata] = useState<ExeData[]>([]);
    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [selectedParty, setSelectedParty] = useState([]);
    const [selectedItemStatus, setSelectedItemStatus] = useState<ItemStatus>('All');
    const [gePOTData, setPOTData] = useState<POTData[]>([]);
    const [getpayload, setPayload] = useState<CardPayload[]>([]);
    const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(null);
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
    const [isListReady, setIsListReady] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [numColumns, setNumColumns] = useState(1);
    const { width: screenWidth } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [getModalTableData, setModalTableData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    // 
    const [containerWidth, setContainerWidth] = useState(0);
    const effectiveWidth = containerWidth || screenWidth;   // fallback



    console.log("slecetdparty", selectedParty);

    useEffect(() => {
        if (selectedProperty) {
            console.log("selectedProperty", selectedProperty);
        }
    }, [selectedProperty]);

    const fetchPropertyData = async () => {
        try {
            const payload = {
                fetch: 'prptype',
                txntype: txntype
            };
            console.log("🔵 Property API calling...");
            console.log("📦 Payload:", payload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    params: payload
                }
            );
            console.log("🟢 Full API response:", response);
            console.log("🟢 API data:", response?.data);
            if (response.data.success && response.data.response.data.length > 0) {
                const propertyList = response?.data.response.data || [];
                console.log("✅ Property List:", propertyList);
                setpropertydata(propertyList);
            } else {
                console.log("❌ API success false:", response?.data);
            }
        } catch (error) {
            console.log("❌ fetchPropertyData error:", error);
        }
    };

    useEffect(() => {
        if (isDrawerVisible && propertydata.length === 0) {
            fetchPropertyData();
        }
    }, [isDrawerVisible]);


    const fetchParty = async (prptype, prpcode) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        const yearValue = selectedYear.split('-')[1].substring(2);
        // setIsLoading(true);
        try {
            const payload = {
                prpcode: prpcode,
                prptype: prptype,
                yearno: yearValue,
                strcode: "002",
                // txntype: txntype,
                txntype: "purchase_order_detail",
                partytype: "p",
                type: "P",
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
            const response = await axios.get(`${API}/api/mobaccountbasic`,
                getRequestConfig({
                    params: payload
                })
            );
            console.log("payload", payload)
            console.log("response", response)
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data Party:', response.data.response.data);
                setPartyData(response.data.response.data);
            } else {
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
        }
    };

    useEffect(() => {
        if (selectedProperty) {
            console.log("🏷 Selected Property:", selectedProperty);
            fetchParty(
                selectedProperty?.PrpOf,
                selectedProperty?.PrpCode
            );
        }
    }, [selectedProperty]);


    useEffect(() => {
        if (
            lastViewedParcode &&
            !hasAutoScrolled &&
            isListReady &&
            flatListRef.current &&
            (searchQueryPOT.trim() ? filteredData.length > 0 : renderedData.length > 0)
        ) {
            const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
            const index = dataToUse.findIndex(item => item.parcode === lastViewedParcode);
            if (index !== -1) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                    setHasAutoScrolled(true);
                }, 300);
            }
        }
    }, [lastViewedParcode, filteredData, renderedData, searchQueryPOT, hasAutoScrolled, isListReady]);

    useEffect(() => {

        if (!searchQueryPOT.trim()) {
            setFilteredData(salessumdata.slice(0, itemsPerPage));
            setPage(1);
            return;
        }

        const lowercasedQuery = searchQueryPOT.toLowerCase();

        const filtered = salessumdata.filter((item) =>
            String(item?.party || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.parcode || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.itmcode || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.itmname || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.unitrate || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.qty || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.bqty || '').toLowerCase().includes(lowercasedQuery)
        );

        setFilteredData(filtered);
        setPage(1);

    }, [searchQueryPOT, salessumdata]);


    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
        setToDate(today);
    }, []);

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

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = async () => {
        setIsLoading(true);
        const yearValue = selectedYear.split('-')[1].substring(2);
        const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
        const partyCodes = selectedParty.map((item: any) => item.acccode);
        const payload = {
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate),
            yearno: yearValue,
            sexes: selectedExe?.Code ? selectedExe?.Code : '0',
            type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
            dsncodes: dsnCodes,
            parties: partyCodes,
            prptype: selectedProperty.PrpOf,
            txntype: txntype,
            fetch: "partywisesummary",
        };
        setPayload(payload as any);
        console.log("Payload", payload)
        // Check cache first
        // const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
        // if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
        //     setsalesdata(cachedData.response.data.salesdata);
        //     setsalesdataTotal(cachedData.response.data.salesdata.length);
        //     setsalessumdata(cachedData.response.data.salessumdata);
        //     setIsLoading(false);
        //     closeDrawer();
        //     return;
        // }

        // If not in cache, proceed with API call
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.post(`${API}/api/purchaseordertracking`, payload, { headers });
            const responseData = response?.data?.response?.data || [];

            console.log("🔵 response", payload, responseData);

            if (response.data.success === true) {

                if (responseData.length > 0) {
                    setsalesdata(responseData);
                    setsalesdataTotal(responseData.length);
                    setsalessumdata(responseData);
                } else {
                    // IMPORTANT: clear old data
                    setsalesdata([]);
                    setsalesdataTotal(0);
                    setsalessumdata([]);
                }

            } else {
                AppAlert.alert(`${response.data.message}`);
                setsalesdata([]);
                setsalessumdata([]);
            }
        } catch (error) {
            AppAlert.alert('Server Error');
            setsalesdata([]);
            setsalessumdata([]);
        } finally {
            setIsLoading(false);
            closeDrawer();
        }
    };

    const handleConfirmActionCard = async (item, getpayload) => {
        setIsLoading(true);

        const payload12 = {
            fromdate: getpayload.fromdate,
            todate: getpayload.todate,
            yearno: getpayload.yearno,
            sexes: getpayload.sexes,
            type: getpayload.type,
            dsncodes: getpayload.dsncodes,
            parties: [item.parcode],
            prptype: getpayload.prptype,
            txntype: getpayload.txntype,
            // fetch: "partywisesummary",
        };
        // setPayload(payload as any);
        console.log("Card Payload", payload12)
        // Check cache first
        // const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
        // if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
        //     setsalesdata(cachedData.response.data.salesdata);
        //     setsalesdataTotal(cachedData.response.data.salesdata.length);
        //     setsalessumdata(cachedData.response.data.salessumdata);
        //     setIsLoading(false);
        //     closeDrawer();
        //     return;
        // }

        // If not in cache, proceed with API call
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response12 = await axios.post(`${API}/api/purchaseordertracking`, payload12, { headers });
            const responseData12 = response12?.data?.response?.data || [];


            console.log("🔵 response", payload12, responseData12);

            if (response12.data.success === true) {

                if (responseData12.length > 0) {
                    setSelectedItem(item);
                    setModalVisible(true);
                    setModalTableData(responseData12);
                    // setsalesdata(responseData12);
                    // setsalesdataTotal(responseData12.length);
                    // setsalessumdata(responseData12);
                } else {
                    // IMPORTANT: clear old data
                    // setsalesdata([]);
                    // setsalesdataTotal(0);
                    // setsalessumdata([]);
                }

            } else {
                AppAlert.alert(`${response12.data.message}`);
                // setsalesdata([]);
                // setsalessumdata([]);
            }
        } catch (error) {
            AppAlert.alert('Server Error');
            // setsalesdata([]);
            // setsalessumdata([]);
        } finally {
            // setIsLoading(false);
            // closeDrawer();
        }
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const renderFooter = () => {
        if (!loading) return null;
        return <ActivityIndicator style={styles.loadingIndicator} size="small" color={T.copper} />;
    };

    const CARD_COLORS = [
        ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
        ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
        ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
        ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
    ];

    const getGridConfig = () => {
        const SCROLL_PADDING = 12;   // ScrollView horizontal padding (left + right = 24)
        const CARD_MARGIN_H = 6;    // har card ka marginHorizontal

        let numColumns = 1;

        // 🎯 4 → 3 → 2 → 1 breakpoints
        if (effectiveWidth >= 1400) numColumns = 4;
        else if (effectiveWidth >= 1000) numColumns = 3;
        else if (effectiveWidth >= 640) numColumns = 2;
        else numColumns = 1;

        const availableWidth = effectiveWidth - (SCROLL_PADDING * 2);
        const cardWidth = (availableWidth / numColumns) - (CARD_MARGIN_H * 2);

        return {
            numColumns,
            cardWidth,
            scrollPadding: SCROLL_PADDING,
            cardMarginH: CARD_MARGIN_H,
        };
    };

    const gridConfig = useMemo(() => getGridConfig(), [effectiveWidth]);

    const fixedLabels = {
        prpcode: "Property",
        pono: "PO Number",
        podate: "PO Date",
        itmname: "Item Name",
        netamt: "Total Qty",
        bqty: "Balance Qty",
        unitrate: "Unit Rate",
        amount: "Amount",
    };


    const groupDataByParty = (data) => {
        const grouped = {};
        data.forEach((item) => {
            if (!grouped[item.party]) {
                grouped[item.party] = [];
            }
            grouped[item.party].push(item);
        });
        return Object.entries(grouped).map(([party, items]) => ({ party, items }));
    };


    const tableColumns = [
        { key: 'prpcode', label: 'Property', width: 100, align: 'center' },
        { key: 'pono', label: 'PO Number', width: 120, align: 'center' },
        { key: 'podate', label: 'PO Date', width: 120, align: 'center' },
        { key: 'itmname', label: 'Item Name', width: 160, align: 'left' },
        { key: 'qty', label: 'Total Qty', width: 120, align: 'right' },
        { key: 'bqty', label: 'Balance Qty', width: 120, align: 'right' },
        { key: 'pqty', label: 'Received Qty', width: 120, align: 'right' },
        { key: 'unitrate', label: 'Unit Rate', width: 120, align: 'right' },
        { key: 'amount', label: 'Amount', width: 120, align: 'right' },
    ];


    // =======================================================================
    // NEW ERP UI (presentation only — every handler below is the original one,
    // called with the original arguments).
    // =======================================================================
    const { isPhone, cols, gutter, width: winWidth } = useSotLayout();
    // UI-only busy flag for the card tap (the request itself is unchanged).
    const [cardBusy, setCardBusy] = useState(false);

    const onPartyCardPress = (item: any) => {
        setCardBusy(true);
        Promise.resolve(handleConfirmActionCard(item, getpayload)).finally(() => setCardBusy(false));
    };

    const listData: any[] = searchQueryPOT.trim() ? filteredData : salessumdata;
    const hasLoadedOnce = !Array.isArray(getpayload) && Object.keys(getpayload || {}).length > 0;
    const activeFilterCount = (selectedProperty ? 1 : 0) + (selectedParty?.length ? 1 : 0);

    const filterChips: { icon: string; text: string }[] = [
        { icon: 'apartment', text: selectedProperty?.PrpOfFull || selectedProperty?.PrpOf || 'Property group: not set' },
        { icon: 'calendar-today', text: `FY ${selectedYear}` },
        { icon: 'date-range', text: `${formatDate(fromDate)} → ${formatDate(toDate)}` },
        ...(selectedParty?.length
            ? [{ icon: 'person', text: `${selectedParty.length} part${selectedParty.length === 1 ? 'y' : 'ies'}` }]
            : []),
    ];

    // KPI totals over the loaded party summary rows (only for keys the API returned).
    const sumRows: any[] = salessumdata as any[];
    const kQty = hasKey(sumRows, 'qty');
    const kBqty = hasKey(sumRows, 'bqty');
    const kAmt = hasKey(sumRows, 'amount');
    const kRec = hasKey(sumRows, 'recordcount');
    const totQty = sumKey(sumRows, 'qty');
    const totBqty = sumKey(sumRows, 'bqty');

    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    const renderPartyCard = ({ item }: { item: any }) => {
        const showProgress = isNumeric(item?.qty) && isNumeric(item?.bqty) && toNum(item?.qty) > 0;
        const receivedPct = showProgress ? 100 - pct(item.bqty, item.qty) : 0;
        const showRec = kRec && item?.recordcount !== undefined;
        // recordcount is shown as the header badge, so it is not repeated in the grid.
        const entries = Object.entries(item || {}).filter(
            ([key]) => !CARD_HIDDEN_KEYS.includes(key) && !(showRec && key === 'recordcount'),
        );
        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <TouchableOpacity
                    style={styles.partyCard}
                    activeOpacity={0.85}
                    onPress={() => onPartyCardPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open purchase orders for ${item?.party}`}
                >
                    <View style={styles.partyHeader}>
                        <Avatar name={item?.party} size={40} />
                        <View style={styles.partyInfo}>
                            <Text style={styles.partyName} numberOfLines={2}>{item?.party || '—'}</Text>
                            <View style={styles.partyMetaRow}>
                                {!!item?.parcode && <Text style={styles.partyCode}>#{item.parcode}</Text>}
                                {showRec ? (
                                    <View style={styles.partyOrdersContainer}>
                                        <Icon name="receipt-long" size={11} color={T.blue} />
                                        <Text style={styles.partyOrdersText}>{fmtQty(item.recordcount)} records</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                        <Icon name="chevron-right" size={22} color={T.muted} />
                    </View>

                    {showProgress ? (
                        <View style={styles.progressRow}>
                            <View style={{ flex: 1 }}>
                                <ProgressBar value={receivedPct} color={T.green} />
                            </View>
                            <Text style={styles.progressText}>{Math.round(receivedPct)}% received</Text>
                        </View>
                    ) : null}

                    {entries.length ? (
                        <View style={styles.partyValues}>
                            {entries.map(([key, value]) => (
                                <Metric
                                    key={key}
                                    label={cardLabel(key)}
                                    value={fmtCell(key, value)}
                                    color={key === 'bqty' ? T.copper : key === 'amount' ? T.pd : undefined}
                                    style={styles.valueCell}
                                />
                            ))}
                        </View>
                    ) : null}

                    <View style={styles.cardCta}>
                        <Text style={styles.cardCtaText}>View PO details</Text>
                        <Icon name="arrow-forward" size={14} color={T.copper} />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    // ----- PO details (modal) -----
    const modalRows: any[] = getModalTableData.filter((item) =>
        Object.keys(fixedLabels).some((key) =>
            String(item[key]).toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    const modalGroups = groupDataByParty(modalRows);
    const showTable = winWidth >= 1180;
    const poCols = isPhone ? 1 : 2;

    const renderTableHeader = () => (
        <View style={[md.tr, md.thead]}>
            {tableColumns.map((col) => (
                <Text
                    key={col.key}
                    style={[
                        md.th,
                        col.key === 'itmname' ? md.flexCol : { width: col.width },
                        { textAlign: col.align as any },
                    ]}
                    numberOfLines={1}
                >
                    {col.label}
                </Text>
            ))}
        </View>
    );

    const renderTableGroup = ({ item: group }: { item: any }) => (
        <View>
            {/* Party sub-header */}
            <View style={md.groupRow}>
                <Icon name="storefront" size={14} color={T.copper} />
                <Text style={md.groupText} numberOfLines={1}>{group.party}</Text>
                <Text style={md.groupMeta}>{group.items.length} line{group.items.length === 1 ? '' : 's'}</Text>
            </View>
            {group.items.map((row: any, rowIndex: number) => (
                <View key={rowIndex} style={[md.tr, rowIndex % 2 === 1 && { backgroundColor: T.sub }]}>
                    {tableColumns
                        .filter((col) => col.key !== 'party') // Remove 'party' column from rows
                        .map((col) => (
                            <Text
                                key={col.key}
                                style={[
                                    md.td,
                                    col.key === 'itmname' ? md.flexCol : { width: col.width },
                                    { textAlign: col.align as any },
                                    col.key === 'bqty' && { color: T.copper, fontWeight: '800' },
                                    col.key === 'pqty' && { color: T.green },
                                    col.key === 'amount' && { fontWeight: '800' },
                                    col.key === 'pono' && { color: T.nav, fontWeight: '800' },
                                ]}
                                numberOfLines={col.key === 'itmname' ? 2 : 1}
                            >
                                {fmtCell(col.key, row[col.key])}
                            </Text>
                        ))}
                </View>
            ))}
        </View>
    );

    const renderTableTotals = () =>
        modalRows.length ? (
            <View style={[md.tr, md.totals]}>
                {tableColumns.map((col) => {
                    const sumable = ['qty', 'bqty', 'pqty', 'amount'].includes(col.key);
                    return (
                        <Text
                            key={col.key}
                            style={[
                                md.td,
                                md.totalText,
                                col.key === 'itmname' ? md.flexCol : { width: col.width },
                                { textAlign: col.align as any },
                            ]}
                            numberOfLines={1}
                        >
                            {col.key === 'prpcode'
                                ? 'TOTAL'
                                : sumable
                                    ? fmtCell(col.key, String(sumKey(modalRows, col.key)))
                                    : ''}
                        </Text>
                    );
                })}
            </View>
        ) : null;

    const renderPoCard = (row: any, i: number) => {
        const show = isNumeric(row?.qty) && toNum(row?.qty) > 0 && isNumeric(row?.bqty);
        const recvPct = show ? 100 - pct(row.bqty, row.qty) : 0;
        return (
            <View key={i} style={[cellWidth(poCols), styles.gridCell]}>
                <View style={md.poCard}>
                    <View style={md.poHead}>
                        <View style={md.poIcon}>
                            <Icon name="receipt-long" size={17} color={T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={md.poNo} numberOfLines={1}>{row?.pono || '—'}</Text>
                            <Text style={md.poDate} numberOfLines={1}>PO date · {row?.podate || '—'}</Text>
                        </View>
                        {!!row?.prpcode && (
                            <View style={md.prpChip}>
                                <Text style={md.prpChipText} numberOfLines={1}>{row.prpcode}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ gap: 2 }}>
                        <Text style={md.itemLabel}>Item Name</Text>
                        <Text style={md.itemName} numberOfLines={2}>{row?.itmname || '—'}</Text>
                    </View>
                    {show ? (
                        <View style={styles.progressRow}>
                            <View style={{ flex: 1 }}>
                                <ProgressBar value={recvPct} color={T.green} />
                            </View>
                            <Text style={styles.progressText}>{Math.round(recvPct)}% received</Text>
                        </View>
                    ) : null}
                    <View style={md.poMetrics}>
                        <View style={md.poMetricRow}>
                            <Metric label="Total Qty" value={fmtCell('qty', row?.qty)} />
                            <Metric label="Received Qty" value={fmtCell('pqty', row?.pqty)} color={T.green} />
                            <Metric label="Balance Qty" value={fmtCell('bqty', row?.bqty)} color={T.copper} align="right" />
                        </View>
                        <View style={md.poMetricRow}>
                            <Metric label="Unit Rate" value={fmtCell('unitrate', row?.unitrate)} />
                            <Metric label="Amount" value={fmtCell('amount', row?.amount)} color={T.pd} align="right" />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderCardGroup = ({ item: group }: { item: any }) => (
        <View style={md.cardGroup}>
            <View style={md.cardGroupHead}>
                <SectionHead
                    title={group.party}
                    meta={`${group.items.length} PO line${group.items.length === 1 ? '' : 's'}`}
                />
            </View>
            <View style={md.cardGrid}>{group.items.map((row: any, i: number) => renderPoCard(row, i))}</View>
        </View>
    );

    const modalKpis = (
        <KpiGrid isPhone={isPhone}>
            <Kpi
                label="Total Qty"
                icon="inventory-2"
                accent={T.nav}
                value={fmtQtyKpi(sumKey(modalRows, 'qty'))}
                sub={`${modalRows.length} PO line${modalRows.length === 1 ? '' : 's'}`}
            />
            <Kpi
                label="Received Qty"
                icon="move-to-inbox"
                accent={T.green}
                valueColor={T.green}
                value={fmtQtyKpi(sumKey(modalRows, 'pqty'))}
            />
            <Kpi
                label="Balance Qty"
                icon="pending-actions"
                accent={T.copper}
                valueColor={T.copper}
                value={fmtQtyKpi(sumKey(modalRows, 'bqty'))}
                sub={
                    sumKey(modalRows, 'qty') > 0
                        ? `${Math.round(pct(sumKey(modalRows, 'bqty'), sumKey(modalRows, 'qty')))}% of total`
                        : undefined
                }
            />
            <Kpi
                label="Amount"
                icon="account-balance-wallet"
                accent={T.pd}
                valueColor={T.pd}
                value={`₹ ${formatValue(String(sumKey(modalRows, 'amount')))}`}
            />
        </KpiGrid>
    );

    return (
        <>
            <View style={styles.root}>
                {/* ───────────── Toolbar: search + filters ───────────── */}
                <Toolbar
                    search={searchQueryPOT}
                    onSearch={setSearchQueryPOT}
                    placeholder={isPhone ? 'Search purchase order...' : 'Search party, code, item, rate or qty...'}
                    onFilters={openDrawer}
                    filterCount={activeFilterCount}
                    chips={filterChips}
                    onChipPress={openDrawer}
                />

                <CustomDrawer
                    isVisible={isDrawerVisible}
                    onClose={closeDrawer}
                    fromDate={fromDate}
                    toDate={toDate}
                    selectedYear={selectedYear}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    onYearChange={setSelectedYear}
                    onLoadPress={handleConfirmAction}
                    exeData={exeData}
                    onExeChange={setSelectedExe}
                    selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
                    designData={designData}
                    propertydata={propertydata}
                    getPartyData={getPartyData}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    onDesignSelect={setSelectedDesigns}
                    onItemSelectItem={setSelectedItems}
                    onItemSelectParty={setSelectedParty}
                    setpropertydata={setpropertydata}
                    selectedDesigns={selectedDesigns}
                    setSelectedDesigns={setSelectedDesigns}
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                    itemData={itemData}
                    selectedItemStatus={selectedItemStatus}
                    onItemStatusChange={setSelectedItemStatus}
                    setSelectedParty={setSelectedParty}
                    selectedParty={selectedParty}
                    selectedProperty={selectedProperty}
                    onPropertySelect={setSelectedProperty}
                    yearOptions={yearOptions}
                />

                <View
                    style={styles.container}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (Math.abs(w - containerWidth) > 1) setContainerWidth(w);
                    }}
                >
                    {salessumdata.length > 0 ? (
                        <FlatList
                            key={`pot-party-${cols}`}
                            style={styles.container}
                            data={listData}
                            numColumns={cols}
                            renderItem={renderPartyCard}
                            keyExtractor={(item: any, index) => `${item?.parcode ?? 'p'}-${index}`}
                            contentContainerStyle={listContentStyle}
                            keyboardShouldPersistTaps="handled"
                            ListFooterComponent={renderFooter}
                            ListHeaderComponent={
                                <View style={styles.listHeader}>
                                    <KpiGrid isPhone={isPhone}>
                                        <Kpi
                                            label="Parties"
                                            icon="groups"
                                            accent={T.blue}
                                            value={String(salesdataTotal ?? salessumdata.length)}
                                            sub={kRec ? `${fmtQty(String(sumKey(sumRows, 'recordcount')))} records` : `FY ${selectedYear}`}
                                        />
                                        {kQty ? (
                                            <Kpi
                                                label="Total Qty"
                                                icon="inventory-2"
                                                accent={T.nav}
                                                value={fmtQtyKpi(totQty)}
                                            />
                                        ) : null}
                                        {kBqty ? (
                                            <Kpi
                                                label="Balance Qty"
                                                icon="pending-actions"
                                                accent={T.copper}
                                                valueColor={T.copper}
                                                value={fmtQtyKpi(totBqty)}
                                                sub={kQty && totQty > 0 ? `${Math.round(pct(totBqty, totQty))}% of total` : undefined}
                                            />
                                        ) : null}
                                        {kAmt ? (
                                            <Kpi
                                                label="Amount"
                                                icon="account-balance-wallet"
                                                accent={T.pd}
                                                valueColor={T.pd}
                                                value={`₹ ${formatValue(String(sumKey(sumRows, 'amount')))}`}
                                            />
                                        ) : null}
                                    </KpiGrid>
                                    <SectionHead
                                        title="Parties"
                                        meta={`${listData.length} shown · ${salesdataTotal ?? salessumdata.length} total · tap a party for PO details`}
                                    />
                                </View>
                            }
                            ListEmptyComponent={
                                <EmptyState
                                    icon="search-off"
                                    title="No matching parties"
                                    text="Try another party name, code, item, rate or quantity."
                                />
                            }
                        />
                    ) : (
                        <ScrollView style={styles.container} contentContainerStyle={listContentStyle}>
                            <View style={styles.emptyCard}>
                                <EmptyState
                                    icon={hasLoadedOnce ? 'inbox' : 'local-shipping'}
                                    title={hasLoadedOnce ? 'No data found!' : 'Track your purchase orders'}
                                    text={
                                        hasLoadedOnce
                                            ? 'Nothing matched these filters. Change the filters and load again.'
                                            : 'Choose the property group, date range and parties, then tap Load to see party-wise purchase order summary.'
                                    }
                                    action={<Btn label="Open filters" icon="tune" onPress={openDrawer} />}
                                />
                            </View>
                        </ScrollView>
                    )}
                </View>

                {/* ───────────── Purchase order details ───────────── */}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <SafeAreaView edges={['top', 'bottom']} style={md.root}>
                        <PanelHeader
                            onBack={() => setModalVisible(false)}
                            backLabel="Close"
                            crumbs={['Purchase Order Tracking', (selectedItem as any)?.party || '']}
                            title="Purchase Order Details"
                            subtitle={`${modalRows.length} PO line${modalRows.length === 1 ? '' : 's'} · ${modalGroups.length} part${modalGroups.length === 1 ? 'y' : 'ies'}`}
                        />
                        <View style={[md.searchBar, { paddingHorizontal: gutter }]}>
                            <View style={md.searchInner}>
                                <SearchBox
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Search..."
                                />
                            </View>
                        </View>

                        {showTable ? (
                            <FlatList
                                style={md.flex}
                                data={modalGroups}
                                renderItem={renderTableGroup}
                                keyExtractor={(item, index) => index.toString()}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={[md.content, { paddingHorizontal: gutter }]}
                                ListHeaderComponent={
                                    <View style={{ gap: 12 }}>
                                        {modalKpis}
                                        <View style={md.tableTop}>{renderTableHeader()}</View>
                                    </View>
                                }
                                ListFooterComponent={<View style={md.tableBottom}>{renderTableTotals()}</View>}
                                ListEmptyComponent={
                                    <View style={md.tableEmpty}>
                                        <EmptyState icon="search-off" title="No purchase orders match" text="Try another PO number, date or item." />
                                    </View>
                                }
                            />
                        ) : (
                            <FlatList
                                key={`pot-po-${poCols}`}
                                style={md.flex}
                                data={modalGroups}
                                renderItem={renderCardGroup}
                                keyExtractor={(item, index) => index.toString()}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={[md.content, { paddingHorizontal: gutter - 5 }]}
                                ListHeaderComponent={<View style={{ paddingHorizontal: 5 }}>{modalKpis}</View>}
                                ListEmptyComponent={
                                    <EmptyState icon="search-off" title="No purchase orders match" text="Try another PO number, date or item." />
                                }
                            />
                        )}
                    </SafeAreaView>
                </Modal>

                <BusyOverlay visible={cardBusy} text="Loading purchase orders…" />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    // ----- shell -----
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
    listContent: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
    gridCell: { padding: 5 },
    loadingIndicator: { marginVertical: 16 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // ----- party card -----
    partyCard: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 12,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    partyHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    partyInfo: { flex: 1, minWidth: 0 },
    partyName: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    partyMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    partyCode: { fontSize: 11, fontWeight: '700', color: T.muted },
    partyOrdersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: `${T.blue}12`,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    partyOrdersText: { fontSize: 10.5, fontWeight: '800', color: T.blue },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressText: { fontSize: 10.5, fontWeight: '800', color: T.green, minWidth: 34, textAlign: 'right' },
    partyValues: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 10,
        columnGap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    valueCell: { flexGrow: 1, flexBasis: '40%', minWidth: 110 },
    cardCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 'auto',
    },
    cardCtaText: { fontSize: 11.5, fontWeight: '800', color: T.copper },
});

const md = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    searchBar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 8,
    },
    searchInner: { width: '100%', maxWidth: CONTENT_MAX - 32, alignSelf: 'center' },
    content: {
        paddingTop: 12,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },

    // ----- table (wide screens) -----
    tableTop: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: T.border,
    },
    tableBottom: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: T.border,
        backgroundColor: T.surface,
        minHeight: 12,
    },
    tableEmpty: {
        backgroundColor: T.surface,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: T.border,
    },
    tr: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 40,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
        backgroundColor: T.surface,
    },
    thead: { backgroundColor: T.nav, borderBottomWidth: 0, minHeight: 38 },
    th: {
        color: '#fff',
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        paddingHorizontal: 6,
    },
    td: { color: T.ink, fontSize: 12.5, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 8 },
    flexCol: { flex: 1, minWidth: 160 },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        minHeight: 36,
        backgroundColor: T.alt,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderLeftColor: T.border,
        borderRightColor: T.border,
    },
    groupText: { flex: 1, fontSize: 12.5, fontWeight: '900', color: T.nav, letterSpacing: 0.3 },
    groupMeta: { fontSize: 11, fontWeight: '700', color: T.muted },
    totals: { backgroundColor: `${T.copper}12`, borderBottomWidth: 0 },
    totalText: { fontWeight: '900', color: T.pd },

    // ----- cards (phone / tablet) -----
    cardGroup: { marginBottom: 6 },
    cardGroupHead: { paddingHorizontal: 5, paddingTop: 12, paddingBottom: 4 },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    poCard: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    poHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    poIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    poNo: { fontSize: 14, fontWeight: '800', color: T.ink },
    poDate: { fontSize: 11, fontWeight: '700', color: T.muted, marginTop: 2 },
    prpChip: {
        backgroundColor: `${T.blue}12`,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        maxWidth: 120,
    },
    prpChipText: { fontSize: 10.5, fontWeight: '800', color: T.blue },
    itemLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
    itemName: { fontSize: 13, fontWeight: '700', color: T.ink, lineHeight: 18 },
    poMetrics: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    poMetricRow: { flexDirection: 'row', gap: 10 },
});



export default React.memo(PurchaseOrderTracking);
