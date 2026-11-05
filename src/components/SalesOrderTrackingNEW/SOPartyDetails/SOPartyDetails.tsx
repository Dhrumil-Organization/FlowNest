import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API } from '../../../common/API/dynamicAPI';
import {
    BusyOverlay,
    CONTENT_MAX,
    EmptyState,
    IconBtn,
    Kpi,
    KpiGrid,
    Metric,
    PanelHeader,
    ProgressBar,
    SearchBox,
    SectionHead,
    SortChip,
    StatusPill,
    cellWidth,
    statusTone,
    useSotLayout,
} from '../sotUi';
import SOPartyDetailsPart1 from '../SOPartyDetailsPart1/SOPartyDetailsPart1';


interface PartyDetail {
    Dsnname: string;
    chalamt: string;
    chalqty: string;
    noofchallan: string;
    parcode: string;
    partyname: string;
    pending: string;
    pendingamt: string;
    shdname: string;
    sodate: string;
    sono: string;
    srno: string;
    status: string;
    totamt: string;
    totmtr: string;
    uid: string;
    UnitRate: string;
    allocationdate?: string;
    duedate?: string;
    BQty?: string;
}

interface PartySummary {
    chalamt: string;
    chalqty: string;
    noofchallan: string;
    pending: string;
    pendingamt: string;
    totamt: string;
    totmtr: string;
    linebar: string;
}

interface SOPartyDetailsProps {

    token: string;

    username: string;
    party: any;
    selectedSalesExes: any[];
    setSOParty_party: any;
    setSOParty_selectedSalesExes: any;
    setSOParty: any;
}

// Helper: format YYYYMMDD to DD-MMM-YYYY
const formatAllocationDate = (dateStr: string): string => {
    if (!dateStr || dateStr === '0' || dateStr.length !== 8) return '';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const dateObj = new Date(`${year}-${month}-${day}`);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString('en-IN', options).replace(/-/g, '-'); // e.g., "12-Aug-2026"
};

const SOPartyDetails: React.FC<SOPartyDetailsProps> = ({ token, username, party = "", selectedSalesExes = [], setSOParty_party, setSOParty_selectedSalesExes, setSOParty }) => {
    const router = useRouter();
    const params = useLocalSearchParams();
    // const party = params.party || route?.params?.party || "";
    // const selectedSalesExes = params.selectedSalesExes || route?.params?.selectedSalesExes || [];
    const [getDetailData, setDetailData] = useState<{
        partydetails: PartyDetail[];
        party_summary: PartySummary[];
    } | null>(null);
    const [renderedOrders, setRenderedOrders] = useState<PartyDetail[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [printAPILoading, setPrintAPILoading] = useState(false);
    const [apiloading, setAPILoading] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [getChallanPayload, setChallanPayload] = useState({});
    const [getPartyName, setPartyName] = useState("");
    const [filteredOrders, setFilteredOrders] = useState<PartyDetail[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const itemsPerPage = 50;

    const [todayOrders, setTodayOrders] = useState<PartyDetail[]>([]);
    const [restOrders, setRestOrders] = useState<PartyDetail[]>([]);
    const [renderedRestOrders, setRenderedRestOrders] = useState<PartyDetail[]>([]);
    const [restPage, setRestPage] = useState(1);
    const [getChallanView, setChallanView] = useState(false);
    const [getChallanPartyName, setChallanPartyName] = useState('');
    const [restLoading, setRestLoading] = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const parties_tracking_details = await AsyncStorage.getItem('parties_tracking_details');
                const parties_tracking_details_challan_payload = await AsyncStorage.getItem('parties_tracking_details_challan_payload');
                const parties_tracking_details_party_name = await AsyncStorage.getItem('parties_tracking_details_party_name');
                if (parties_tracking_details_challan_payload) {
                    setChallanPayload(parties_tracking_details_challan_payload ? JSON.parse(parties_tracking_details_challan_payload) : {});
                }
                if (parties_tracking_details) {
                    const data = JSON.parse(parties_tracking_details);
                    setDetailData(data);
                    setFilteredOrders(data.partydetails);
                }
                if (parties_tracking_details_party_name) {
                    setPartyName(parties_tracking_details_party_name);
                }
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initializeApp();
    }, []);

    useEffect(() => {
        const today = filteredOrders.filter(order => order.allocationdate === todayStr);
        const rest = filteredOrders.filter(order => order.allocationdate !== todayStr);
        setTodayOrders(today);
        setRestOrders(rest);
        setRenderedRestOrders(rest.slice(0, itemsPerPage));
        setRestPage(1);
    }, [filteredOrders, todayStr]);

    useEffect(() => {
        const debouncedSearch = debounce(() => {
            if (!getDetailData) return;
            const query = searchQuery.toLowerCase();
            const filtered = getDetailData.partydetails.filter(
                (order) =>
                    order.sono.toLowerCase().includes(query) ||
                    order.Dsnname.toLowerCase().includes(query) ||
                    order.shdname.toLowerCase().includes(query) ||
                    order.parcode.toLowerCase().includes(query) ||
                    order.partyname.toLowerCase().includes(query) ||
                    order.sodate.toLowerCase().includes(query) ||
                    order.totmtr.toLowerCase().includes(query) ||
                    order.totamt.toLowerCase().includes(query) ||
                    order.chalqty.toLowerCase().includes(query) ||
                    order.chalamt.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query) ||
                    order.noofchallan.toLowerCase().includes(query) ||
                    order.pending.toLowerCase().includes(query) ||
                    order.pendingamt.toLowerCase().includes(query) ||
                    order.noofchallan.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query)
            );
            const sorted = [...filtered].sort((a, b) => {
                const dateA = new Date(a.sodate).getTime();
                const dateB = new Date(b.sodate).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
            setFilteredOrders(sorted);
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [searchQuery, getDetailData, sortOrder]);

    const loadMoreRestOrders = useCallback(() => {
        if (restLoading || !restOrders.length || renderedRestOrders.length >= restOrders.length) return;
        setRestLoading(true);
        setTimeout(() => {
            const nextPage = restPage + 1;
            const startIndex = restPage * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            setRenderedRestOrders(prev => [
                ...prev,
                ...restOrders.slice(startIndex, endIndex)
            ]);
            setRestPage(nextPage);
            setRestLoading(false);
        }, 500);
    }, [restPage, restLoading, restOrders, renderedRestOrders]);

    // NEW ERP UI: responsive columns (hook must run before the early return).
    const { isPhone, cols, gutter } = useSotLayout();

    if (!getDetailData) {
        return (
            <View style={styles.root}>
                <PanelHeader
                    onBack={() => {
                        setSOParty(false)
                        setSOParty_party('')
                        setSOParty_selectedSalesExes([])
                    }}
                    crumbs={['Sales Order Tracking', 'Sales Orders']}
                    title={getPartyName || 'Sales Orders'}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={T.copper} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    const summary = getDetailData.party_summary[0];
    const deliveryPercentage = Math.min(parseFloat(summary.linebar), 100);

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'CLOSED': return '#4CAF50';
            case 'PARTIAL': return '#FF9800';
            case 'PENDING': return '#F44336';
            default: return '#9E9E9E';
        }
    };

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

    const formatCurrency = (value: string) => {
        return `₹${formatNumber(value)}`;
    };

    const handleCardPress = async (order: PartyDetail) => {
        setAPILoading(true);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            let seArr: string[] = [];
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.forEach((el: any) => seArr.push(el.sexe));
            const payload = {
                ...getChallanPayload,
                fromdate: "",
                todate: "",
                uid: order.uid,
                srno: order.srno,
                sexes: seArr,
                soallocationid: order.soallocationid
            };
            const response = await axios.post(`${API}/api/salesorderpartychallantracking`, payload, { headers });
            if (response.data.success === true) {
                setAPILoading(false);
                await AsyncStorage.setItem('parties_tracking_details_challan_response', JSON.stringify(response.data));
                // router.push({
                //     pathname: '/new/SOPartyDetailsPart1',
                //     params: { party: order.partyname }
                // });
                setChallanView(true);
                setChallanPartyName(order.partyname);
            }
        } catch (error) {
            setAPILoading(false);
            console.error("Error in handleCardPress:", error);
            AppAlert.alert("Error", "Failed to process party details");
        } finally {
            setAPILoading(false);
        }
    };

    const handleCardPressCurrent = async (order: PartyDetail) => {
        AppAlert.alert(
            "Close Order",
            `Are you sure you want to close this order (SO-${order.sono})?`,
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes",
                    onPress: async () => {
                        const headers = {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'X-Requested-with': 'XMLHttpRequest',
                        };
                        const payload = {
                            ...getChallanPayload,
                            uid: order.uid,
                            srno: order.srno,
                        };
                        try {
                            setAPILoading(true);
                            const response = await axios.post(`${API}/api/sotrackcloseorder`, payload, { headers });
                            if (response.data.success === true) {
                                setFilteredOrders(prevOrders =>
                                    prevOrders.map(prevOrder =>
                                        prevOrder.uid === order.uid && prevOrder.srno === order.srno
                                            ? { ...prevOrder, status: 'CLOSED' }
                                            : prevOrder
                                    )
                                );
                                setDetailData(prevData => {
                                    if (!prevData) return null;
                                    return {
                                        ...prevData,
                                        partydetails: prevData.partydetails.map(prevOrder =>
                                            prevOrder.uid === order.uid && prevOrder.srno === order.srno
                                                ? { ...prevOrder, status: 'CLOSED' }
                                                : prevOrder
                                        )
                                    };
                                });
                                AppAlert.alert("Success", "Order closed successfully.");
                            } else {
                                AppAlert.alert("Error", response.data.message || "Failed to close order.");
                            }
                        } catch (error) {
                            console.error("Error in handleCardPressCurrent:", error);
                            AppAlert.alert("Error", "Failed to close the order");
                        } finally {
                            setAPILoading(false);
                        }
                    }
                }
            ]
        );
    };

    const printSalesOrderPdf = async (item, format = 'A4') => {
        setPrintAPILoading(true);
        try {
            const payload = {
                prpcode: item.prpcode || '',
                yearno: getChallanPayload?.yearno || '',
                strcode: item.strcode || '',
                uid: item.uid || '',
                printTypes: ['sales_order'],
                printFormat: format || 'A4',
            };
            const res = await axios.post(
                `${API}/api/saleschallanmultiprintnew`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'x-platform': 'mob',
                    },
                }
            );
            if (res?.data?.success === true) {
                setPrintAPILoading(false);
                const pdfUrl = res?.data?.results?.sales_order;
                if (!pdfUrl) {
                    AppAlert.alert('PDF Error', 'PDF URL not found.');
                    return;
                }
                router.push({
                    pathname: '/(tabs)/pdf-view',
                    params: { pdfUrl, title: 'Sales Order' },
                });
            } else {
                AppAlert.alert(
                    'PDF Failed',
                    res?.data?.message || 'PDF generation failed.'
                );
            }
        } catch (error) {
            console.log('PDF ERROR =>', error?.response?.data || error.message);
            setPrintAPILoading(false);
            AppAlert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to generate PDF.'
            );
        } finally {
            setPrintAPILoading(false);
        }
    };

    const goBack = () => {
        setSOParty(false)
        setSOParty_party('')
        setSOParty_selectedSalesExes([])
    };

    const renderOrderCard = (item: PartyDetail, isToday: boolean = false) => {
        const orderTotal = parseFloat(item.totmtr);
        const orderDelivered = parseFloat(item.chalqty);
        const orderPercentage = Math.min(
            orderTotal > 0 ? (orderDelivered / orderTotal) * 100 : 0,
            100
        );
        const hasAllocation = item.allocationdate && item.allocationdate !== '0' && item.allocationdate !== '';
        const tone = statusTone(item.status);

        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <TouchableOpacity
                    style={[
                        styles.orderCard,
                        hasAllocation && styles.orderCardWithAllocation,
                        isToday && styles.orderCardToday
                    ]}
                    activeOpacity={0.88}
                    onPress={() => handleCardPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open challans for SO-${item.sono}`}
                >
                    <View style={[styles.statusStripe, { backgroundColor: tone.fg }]} />

                    <View style={styles.orderHeader}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={styles.orderIdRow}>
                                <Text style={styles.orderId}>SO-{item.sono}</Text>
                                <StatusPill status={item.status} />
                            </View>
                            <Text style={styles.orderParty} numberOfLines={1}>{item.partyname}</Text>
                        </View>
                        <IconBtn
                            icon="print"
                            label={`Print SO-${item.sono}`}
                            onPress={() => printSalesOrderPdf(item, 'A4')}
                            loading={printAPILoading}
                            color={T.blue}
                        />
                    </View>

                    <View style={styles.designShadeRow}>
                        <Icon name="texture" size={14} color={T.copper} />
                        <Text style={styles.designShadeText} numberOfLines={2}>
                            {item.Dsnname} <Text style={{ color: T.muted }}>· Shade: </Text>{item.shdname}
                        </Text>
                    </View>

                    <View style={styles.dateRow}>
                        <View style={styles.dateItem}>
                            <Icon name="event" size={13} color={T.muted} />
                            <Text style={styles.dateText}>SO {item.sodate || '—'}</Text>
                        </View>
                        <View style={styles.dateItem}>
                            <Icon name="event-available" size={13} color={T.muted} />
                            <Text style={styles.dateText}>Due {item.duedate || '—'}</Text>
                        </View>
                        {hasAllocation ? (
                            <View style={[styles.allocationBadge, isToday && styles.allocationBadgeToday]}>
                                <Icon name="assignment-turned-in" size={12} color={isToday ? '#fff' : T.green} />
                                <Text style={[styles.allocationBadgeText, isToday && { color: '#fff' }]}>
                                    {item.allocationdate === todayStr ? 'Allocated today' : `Allocated ${formatAllocationDate(item.allocationdate || '')}`}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.orderStats}>
                        <Metric label="Total" value={String(formatValue(item.totmtr))} />
                        <Metric label="Delivered" value={String(formatValue(item.chalqty))} color={T.green} />
                        <Metric label="Challans" value={String(item.noofchallan)} align="right" />
                    </View>

                    {item.status !== 'PENDING' && (
                        <View style={styles.orderProgressRow}>
                            <View style={{ flex: 1 }}>
                                <ProgressBar value={orderPercentage} color={tone.fg} />
                            </View>
                            <Text style={[styles.orderProgressText, { color: tone.fg }]}>{Math.round(orderPercentage)}%</Text>
                        </View>
                    )}

                    <View style={styles.qtyRow}>
                        <View style={styles.qtyCell}>
                            <Text style={styles.qtyLabel}>Bal Qty</Text>
                            <Text style={[styles.qtyValue, { color: T.copper }]}>{item.BQty}</Text>
                        </View>
                        <View style={styles.qtyCell}>
                            <Text style={styles.qtyLabel}>Unit Rate</Text>
                            <Text style={styles.qtyValue}>₹ {item.UnitRate}</Text>
                        </View>
                        <View style={styles.qtyCell}>
                            <Text style={styles.qtyLabel}>Qty</Text>
                            <Text style={styles.qtyValue}>{item.chalqty}/{item.totmtr}</Text>
                        </View>
                    </View>

                    <View style={styles.orderFooter}>
                        {item.status === 'PENDING' || item.status === 'PARTIAL' ? (
                            <TouchableOpacity
                                onPress={() => handleCardPressCurrent(item)}
                                style={styles.closeOrderBtn}
                                accessibilityRole="button"
                                accessibilityLabel={`Close order SO-${item.sono}`}
                            >
                                <Icon name="block" size={15} color={T.red} />
                                <Text style={styles.closeOrderText}>Close Order</Text>
                            </TouchableOpacity>
                        ) : <View />}
                        <View style={styles.viewChallans}>
                            <Text style={styles.viewChallansText}>View challans</Text>
                            <Icon name="chevron-right" size={18} color={T.nav} />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const listHeader = (
        <View style={styles.listHeader}>
            <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setIsAccordionOpen(!isAccordionOpen)}
                accessibilityRole="button"
            >
                <Text style={styles.accordionTitle}>Summary</Text>
                <Icon
                    name={isAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20}
                    color={T.nav}
                />
            </TouchableOpacity>

            {isAccordionOpen && (
                <>
                    <KpiGrid isPhone={isPhone}>
                        <Kpi
                            label="Total"
                            icon="straighten"
                            accent={T.nav}
                            value={`₹ ${formatValue(summary.totamt)}`}
                            sub={`${summary.totmtr} meter`}
                        />
                        <Kpi
                            label="Delivered"
                            icon="local-shipping"
                            accent={T.green}
                            valueColor={T.green}
                            value={`₹ ${formatValue(summary.chalamt)}`}
                            sub={`${summary.chalqty} meter`}
                        />
                        <Kpi
                            label="Pending"
                            icon="pending-actions"
                            accent={T.copper}
                            valueColor={T.copper}
                            value={`₹ ${formatValue(summary.pendingamt)}`}
                            sub={`${summary.pending} meter`}
                        />
                        <Kpi
                            label="Orders"
                            icon="receipt-long"
                            accent={T.purple}
                            value={String(summary.noofchallan)}
                            sub={`${deliveryPercentage}% delivered`}
                        />
                    </KpiGrid>

                    <View style={styles.deliveryContainer}>
                        <View style={styles.deliveryHeader}>
                            <Text style={styles.deliveryTitle}>Overall Delivery</Text>
                            <Text style={styles.deliveryPercentage}>{deliveryPercentage}%</Text>
                        </View>
                        <ProgressBar value={deliveryPercentage} color={T.green} height={8} />
                        <View style={styles.amountContainer}>
                            <Text style={styles.amountText}>
                                {formatCurrency(summary.chalamt)} delivered
                            </Text>
                            <Text style={styles.amountText}>
                                {formatCurrency(summary.totamt)} total
                            </Text>
                        </View>
                    </View>
                </>
            )}

            <SectionHead
                title="Sales Orders"
                meta={`${filteredOrders.length} order${filteredOrders.length === 1 ? '' : 's'} · tap a card for challans`}
                right={<SortChip label="Date" order={sortOrder} onPress={toggleSortOrder} />}
            />

            {todayOrders.length > 0 && (
                <View style={styles.todaySection}>
                    <View style={styles.todayHead}>
                        <Icon name="push-pin" size={15} color={T.green} />
                        <Text style={styles.todaySectionTitle}>Today's Allocations ({todayOrders.length})</Text>
                    </View>
                    <View style={styles.todayGrid}>
                        {todayOrders.map((item, idx) => (
                            <React.Fragment key={`today-${item.sono}-${item.srno}-${idx}`}>
                                {renderOrderCard(item, true)}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            )}

            {restOrders.length > 0 && todayOrders.length > 0 && (
                <Text style={styles.otherTitle}>Other Orders</Text>
            )}
        </View>
    );

    return (
        <View style={styles.root}>
            <PanelHeader
                onBack={goBack}
                crumbs={['Sales Order Tracking', 'Sales Orders']}
                title={getPartyName || 'Sales Orders'}
                subtitle={`${filteredOrders.length} sales order${filteredOrders.length === 1 ? '' : 's'}`}
            />

            <View style={[styles.searchContainer, { paddingHorizontal: gutter }]}>
                <View style={styles.searchInner}>
                    <SearchBox
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search SO no, design, shade, status…"
                        loading={apiloading}
                    />
                </View>
            </View>

            <FlatList
                key={`sop-${cols}`}
                style={styles.container}
                data={renderedRestOrders}
                numColumns={cols}
                renderItem={({ item }) => renderOrderCard(item, false)}
                keyExtractor={(item, index) => `${item.sono}_${item.srno}_${index}`}
                onEndReached={loadMoreRestOrders}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={listHeader}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
                ListEmptyComponent={
                    todayOrders.length === 0 ? (
                        <EmptyState icon="search-off" title="No sales orders found" text="Try a different search." />
                    ) : null
                }
                ListFooterComponent={restLoading ? (
                    <View style={styles.loadingIndicator}>
                        <ActivityIndicator size="small" color={T.copper} />
                    </View>
                ) : renderedRestOrders.length < restOrders.length ? (
                    <TouchableOpacity style={styles.moreBtn} onPress={loadMoreRestOrders}>
                        <Text style={styles.moreBtnText}>Show more orders</Text>
                    </TouchableOpacity>
                ) : null}
            />

            {getChallanView && (
                <View style={styles.detailOverlay78910}>
                    <SOPartyDetailsPart1 username={username} party={getChallanPartyName} setChallanView={setChallanView} setChallanPartyName={setChallanPartyName} />
                </View>
            )}

            <BusyOverlay visible={apiloading} text="Please wait…" />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.bg },
    loadingText: { fontSize: 13, fontWeight: '700', color: T.muted },
    searchContainer: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 8,
    },
    searchInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    listContent: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 4 },
    gridCell: { padding: 5 },
    loadingIndicator: { paddingVertical: 16, alignItems: 'center' },
    moreBtn: { alignItems: 'center', paddingVertical: 14 },
    moreBtnText: { fontSize: 13, fontWeight: '800', color: T.copper },

    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
    },
    accordionTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },

    deliveryContainer: {
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 10,
    },
    deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deliveryTitle: { fontSize: 13, fontWeight: '800', color: T.ink },
    deliveryPercentage: { fontSize: 18, fontWeight: '900', color: T.green },
    amountContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
    amountText: { fontSize: 11.5, fontWeight: '700', color: T.muted },

    todaySection: {
        backgroundColor: `${T.green}0C`,
        borderWidth: 1,
        borderColor: `${T.green}33`,
        borderRadius: 14,
        padding: 6,
        paddingTop: 10,
    },
    todayHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, marginBottom: 2 },
    todaySectionTitle: { fontSize: 12, fontWeight: '900', color: T.green, letterSpacing: 0.5, textTransform: 'uppercase' },
    todayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    otherTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },

    orderCard: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        paddingLeft: 16,
        gap: 10,
        overflow: 'hidden',
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    orderCardWithAllocation: { borderColor: `${T.green}55` },
    orderCardToday: { borderColor: T.green, borderWidth: 1.5 },
    statusStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    orderHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    orderId: { fontSize: 15, fontWeight: '900', color: T.nav },
    orderParty: { fontSize: 12, fontWeight: '700', color: T.muted, marginTop: 3 },
    designShadeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    designShadeText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink, lineHeight: 17 },
    dateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 11.5, fontWeight: '600', color: T.muted },
    allocationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: `${T.green}14`,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    allocationBadgeToday: { backgroundColor: T.green },
    allocationBadgeText: { fontSize: 10.5, fontWeight: '800', color: T.green },
    orderStats: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 10,
    },
    orderProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    orderProgressText: { fontSize: 11, fontWeight: '900', minWidth: 32, textAlign: 'right' },
    qtyRow: { flexDirection: 'row', gap: 8 },
    qtyCell: { flex: 1, minWidth: 0 },
    qtyLabel: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase' },
    qtyValue: { fontSize: 12.5, fontWeight: '800', color: T.ink, marginTop: 1 },
    orderFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 9,
    },
    closeOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 32,
        paddingHorizontal: 11,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${T.red}40`,
        backgroundColor: `${T.red}0D`,
    },
    closeOrderText: { fontSize: 12, fontWeight: '800', color: T.red },
    viewChallans: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewChallansText: { fontSize: 12, fontWeight: '800', color: T.nav },

    detailOverlay78910: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: T.bg,
        zIndex: 500,
        elevation: 20,
    },
});

export default SOPartyDetails;
