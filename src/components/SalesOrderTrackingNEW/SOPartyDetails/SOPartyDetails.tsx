import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import FullScreenLoader from '@/components/FullScreenLoader';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API } from '../../../common/API/dynamicAPI';
import HeaderBarwithBack from '../../../components/HeaderNew';
import SOPartyDetailsPart1 from '../SOPartyDetailsPart1/SOPartyDetailsPart1';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

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

    if (!getDetailData) {
        return (
            <>
                <HeaderBarwithBack
                    userName={username}
                    header={getPartyName || ""}
                    subHeader={'Manage your Sales Orders'}
                    backNavigateScreen={'Sales Order Tracking'}
                />
                <View style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </View>
            </>
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

    const SummaryCard = ({ title, value1, label1, value2, label2, backgroundColor }: {
        title: string,
        value1: string,
        label1: string,
        value2: string,
        label2: string,
        backgroundColor: string
    }) => (
        <View style={[styles.summaryBox, { backgroundColor }]}>
            <Text style={styles.summaryTitle}>{title}</Text>
            <View style={styles.valueRow}>
                <Text style={styles.valueText}>{label1}: {value1}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.valueRow}>
                <Text style={styles.valueText}>{label2}: {value2}</Text>
            </View>
        </View>
    );

    const renderOrderCard = (item: PartyDetail, isToday: boolean = false) => {
        const orderTotal = parseFloat(item.totmtr);
        const orderDelivered = parseFloat(item.chalqty);
        const orderPercentage = Math.min(
            orderTotal > 0 ? (orderDelivered / orderTotal) * 100 : 0,
            100
        );
        const hasAllocation = item.allocationdate && item.allocationdate !== '0' && item.allocationdate !== '';

        return (
            <TouchableOpacity
                style={[
                    styles.orderCard,
                    hasAllocation && styles.orderCardWithAllocation,
                    isToday && styles.orderCardToday
                ]}
                onPress={() => handleCardPress(item)}
            >
                <View style={styles.orderHeadermain}>
                    <Text style={styles.orderId}>{item.partyname}</Text>
                    {item.status === 'PENDING' || item.status === 'PARTIAL' ? (
                        <TouchableOpacity
                            onPress={() => handleCardPressCurrent(item)}
                            style={styles.orderButtonContainer}
                        >
                            <Text style={[styles.orderStatus, { color: '#FF0000' }]}>
                                Closed Order
                            </Text>
                            <Icon name="close" size={20} color="#FF0000" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>SO-{item.sono}</Text>
                    <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                    <TouchableOpacity
                        onPress={() => printSalesOrderPdf(item, 'A4')}
                        style={styles.orderButtonContainer}
                    >
                        {printAPILoading ? (
                            <ActivityIndicator size={20} color="#0000ff" />
                        ) : (
                            <Icon name="print" size={20} color="blue" />
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.orderDate}>Sodate: {item.sodate} | Duedate: {item.duedate}</Text>
                <Text style={styles.designShadeText}>
                    {item.Dsnname} | Shade: {item.shdname}
                </Text>

                <View style={styles.orderStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>TOTAL</Text>
                        <Text style={styles.statValue}>{formatValue(item.totmtr)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>DELIVERED</Text>
                        <Text style={styles.statValue}>{formatValue(item.chalqty)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>CHALLANS</Text>
                        <Text style={styles.statValue}>{item.noofchallan}</Text>
                    </View>
                </View>

                {item.status !== 'PENDING' && (
                    <View style={styles.orderProgressContainer}>
                        <View style={[
                            styles.progressBarSmall,
                            {
                                width: `${orderPercentage}%`,
                                backgroundColor: getStatusColor(item.status)
                            }
                        ]} />
                    </View>
                )}

                <Text style={styles.orderQty}>
                    Bal Qty: {item.BQty}
                </Text>
                <Text style={styles.orderQty}>
                    Unit Rate: {item.UnitRate}
                </Text>
                <Text style={styles.orderQty}>
                    Qty: {item.chalqty}/{item.totmtr}
                </Text>
                {hasAllocation && (
                    <View style={styles.allocationBadge}>
                        <Text style={styles.allocationBadgeText}>
                            {item.allocationdate === todayStr ? 'Today' : `Allocated at: ${formatAllocationDate(item.allocationdate || '')}`}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>

            {/* <HeaderBarwithBack
                userName={username}
                header={party && party?.partyname || party || ""}
                subHeader={'Manage your Sales Orders'}
                breadcrumb={getPartyName}
                SearchBar={false}
            /> */}
            <LinearGradient
                // colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                colors={[theme.BRAND_DARK, theme.BRAND_DARK]}
                style={styles.container1}>
                <View style={styles.breadcrumbChip}>
                    <View style={styles.breadcrumbRow}>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => {
                            setSOParty(false)
                            setSOParty_party('')
                            setSOParty_selectedSalesExes([])
                        }
                        }>
                            <Icon name="arrow-back" size={18} color="#fff" />
                            <Text style={styles.breadcrumbBackText}>Back</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.replace('/(tabs)')}>
                                    <Icon name="home" size={18} color="#fff" />
                                </TouchableOpacity> */}
                            <Text style={styles.breadcrumbSeparator}>›</Text>
                            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                                {getPartyName}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient >
            {apiloading && <FullScreenLoader />
            }

            <View style={styles.searchContainer}>
                {apiloading ? <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} /> : <TextInput
                    style={styles.searchInput}
                    placeholder="Search Sales Orders..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />}
            </View>

            <ScrollView style={styles.container}>
                <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setIsAccordionOpen(!isAccordionOpen)}
                >
                    <Text style={styles.accordionTitle}>Summary</Text>
                    <Icon
                        name={isAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color="#333"
                    />
                </TouchableOpacity>

                {isAccordionOpen && (
                    <>
                        <View style={styles.summaryContainer}>
                            <SummaryCard
                                title="Total"
                                value1={formatValue(summary.totamt)}
                                label1="Amount"
                                value2={summary.totmtr}
                                label2="Meter"
                                backgroundColor="#E3F2FD"
                            />

                            <SummaryCard
                                title="Delivered"
                                value1={formatValue(summary.chalamt)}
                                label1="Amount"
                                value2={summary.chalqty}
                                label2="Meter"
                                backgroundColor="#E8F5E8"
                            />

                            <SummaryCard
                                title="Pending"
                                value1={formatValue(summary.pendingamt)}
                                label1="Amount"
                                value2={summary.pending}
                                label2="Meter"
                                backgroundColor="#FFF3E0"
                            />

                            <SummaryCard
                                title="Orders"
                                value1={summary.noofchallan}
                                label1="Count"
                                value2={`${deliveryPercentage}%`}
                                label2="Delivery"
                                backgroundColor="#F3E5F5"
                            />
                        </View>

                        <View style={styles.deliveryContainer}>
                            <View style={styles.deliveryHeader}>
                                <Text style={styles.deliveryTitle}>Overall Delivery</Text>
                                <Text style={styles.deliveryPercentage}>{deliveryPercentage}%</Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressFill, { width: `${deliveryPercentage}%` }]} />
                            </View>
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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text>
                    <TouchableOpacity onPress={toggleSortOrder} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={16} color="#333" />
                        <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>Sort by Date</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.deliveryContainer123}>
                    {todayOrders.length > 0 && (
                        <View style={styles.todaySection}>
                            <Text style={styles.todaySectionTitle}>📌 Today's Allocations</Text>
                            {todayOrders.map((item, idx) => (
                                <View key={`today-${item.sono}-${item.srno}-${idx}`}>
                                    {renderOrderCard(item, true)}
                                </View>
                            ))}
                        </View>
                    )}

                    {restOrders.length > 0 && (
                        <>
                            {todayOrders.length > 0 && (
                                <Text style={styles.sectionTitle}>Other Orders</Text>
                            )}
                            <FlatList
                                data={renderedRestOrders}
                                renderItem={({ item }) => renderOrderCard(item, false)}
                                keyExtractor={(item, index) => `${item.sono}_${item.srno}_${index}`}
                                onEndReached={loadMoreRestOrders}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={restLoading ? (
                                    <View style={styles.loadingIndicator}>
                                        <Text>Loading more...</Text>
                                    </View>
                                ) : null}
                                scrollEnabled={false}
                            />
                        </>
                    )}
                </View>
            </ScrollView>

            {getChallanView && (
                <View style={styles.detailOverlay78910}>
                    <View style={styles.detailContainer78910}>
                        <SOPartyDetailsPart1 username={username} party={getChallanPartyName} setChallanView={setChallanView} setChallanPartyName={setChallanPartyName} />
                    </View>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
    },
    container1: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? 0 : 0,
        // borderBottomLeftRadius: 16,
        // borderBottomRightRadius: 16,
        elevation: 6,
    },
    searchContainer: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#000',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 5,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 5,
    },
    accordionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryBox: {
        width: isTablet ? '24%' : '48%',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        height: 110,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    valueRow: {
        marginBottom: 6,
    },
    valueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 6,
    },
    deliveryContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    deliveryContainer123: {
        marginBottom: 20,
    },
    deliveryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    deliveryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    deliveryPercentage: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    amountText: {
        fontSize: 12,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    orderCardWithAllocation: {
        borderColor: 'rgb(178, 219, 252)',
        borderWidth: 2,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    orderCardToday: {
        borderColor: 'rgb(178, 219, 252)',
        borderWidth: 2,
        backgroundColor: '#F5F9FF',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    orderHeadermain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        paddingBottom: 4,
        borderColor: theme.BORDER,
        borderBottomWidth: 2,
    },
    orderButtonContainer: {
        display: 'flex',
        flexDirection: 'row'
    },
    orderId: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    orderStatus: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    designShadeText: {
        fontSize: 11,
        color: '#666',
        marginBottom: 8,
    },
    orderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
    orderProgressContainer: {
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarSmall: {
        height: '100%',
        borderRadius: 3,
    },
    orderQty: {
        fontSize: 12,
        color: '#666',
        alignSelf: 'flex-end',
    },
    loadingIndicator: {
        padding: 20,
        alignItems: 'center',
    },
    allocationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    allocationBadgeText: {
        color: '#1565C0',
        fontSize: 10,
        fontWeight: 'bold',
    },
    todaySection: {
        marginBottom: 16,
        backgroundColor: ' #F5F9FF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#64B5F6',
        shadowColor: '#64B5F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    todaySectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
        paddingLeft: 4,
    },
    breadcrumbChip: {
        marginTop: 12,
        borderRadius: 999,
        paddingHorizontal: 14,
        borderBlockColor: 'rgba(255,255,255,0.15)',
        borderTopWidth: 1,
        paddingVertical: 6,
        width: '100%',
    },
    breadcrumbRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    breadcrumbSeparator: {
        color: '#fff',
        marginHorizontal: 6,
    },
    breadcrumbBackText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.9,
    },
    breadcrumbCurrent: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
        textAlign: 'right',
    },
    detailOverlay78910: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 500, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
      },
    
      // Detail Container
      detailContainer: {
        backgroundColor: '#fff',
        // padding: 20,
        paddingTop: 45,
        borderRadius: 10,
        width: '100%',
        height: '100%',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      detailContainer78910: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '100%',
        height: '100%',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
});

export default SOPartyDetails;