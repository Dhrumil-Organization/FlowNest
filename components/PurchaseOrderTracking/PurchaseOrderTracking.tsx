import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, ActivityIndicator, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import CustomDrawer from './CustomDrawer';
import LinearGradient from 'react-native-linear-gradient';
import data from './data.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crlimtreq_styles } from '../../common/Styles/Style';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import { get } from 'lodash';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

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

const PurchaseOrderTracking: React.FC<{ token: string, navigation: any; username: string }> = ({ token, navigation, username }) => {
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
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
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
                strcode: "0",
                txntype: txntype,
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
                Alert.alert('Error', `Server error: ${error}`);
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
                Alert.alert(`${response.data.message}`);
                setsalesdata([]);
                setsalessumdata([]);
            }
        } catch (error) {
            Alert.alert('Server Error');
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
                Alert.alert(`${response12.data.message}`);
                // setsalesdata([]);
                // setsalessumdata([]);
            }
        } catch (error) {
            Alert.alert('Server Error');
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
        return <ActivityIndicator style={styles.loadingIndicator} size="large" color={theme.BRAND_GRADIENT_END} />;
    };

    const CARD_COLORS = [
        ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
        ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
        ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
        ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
    ];

    const getGridConfig = () => {
        const padding = 12;
        if (screenWidth < 600) {
            return { numColumns: 1, cardWidth: screenWidth - (padding * 2) };
        } else if (screenWidth < 900) {
            return { numColumns: 2, cardWidth: (screenWidth - (padding * 3)) / 2 };
        } else if (screenWidth < 1200) {
            return { numColumns: 3, cardWidth: (screenWidth - (padding * 4)) / 3 };
        } else if (screenWidth < 1500) {
            return { numColumns: 4, cardWidth: (screenWidth - (padding * 5)) / 4 };
        } else {
            return { numColumns: 5, cardWidth: (screenWidth - (padding * 6)) / 5 };
        }
    };

    useEffect(() => {
        getGridConfig();
    }, [screenWidth]);
    const gridConfig = getGridConfig();

    const { cardWidth } = getGridConfig();


    const fixedLabels = {
        party: "Account Name",
        netamt: "Total",
        bqty: "Balance Qty",
        pono: "PO Number",
        podate: "PO Date",
        itmname: "Item Name",
        qty: "Quantity",
        unitrate: "Unit Rate",
        amount: "Amount",
    };

    const tableColumns = [
        { key: 'party', label: 'Account Name', width: 160, align: 'left' },
        { key: 'netamt', label: 'Total', width: 120, align: 'right' },
        { key: 'bqty', label: 'Balance Qty', width: 120, align: 'right' },
        { key: 'pono', label: 'PO Number', width: 120, align: 'center' },
        { key: 'podate', label: 'PO Date', width: 120, align: 'center' },
        { key: 'itmname', label: 'Item Name', width: 160, align: 'left' },
        { key: 'qty', label: 'Quantity', width: 120, align: 'right' },
        { key: 'unitrate', label: 'Unit Rate', width: 120, align: 'right' },
        { key: 'amount', label: 'Amount', width: 120, align: 'right' },
    ];



    return (
        <>
            <HeaderBar userName={username} placeholder="Search purchase order..." onSearch={setSearchQueryPOT} />
            <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                <Icon name="list" size={24} color="white" />
            </TouchableOpacity>
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
            />



            <ScrollView
                contentContainerStyle={{ paddingTop: 20, paddingBottom: 20, paddingHorizontal: 12 }}
                showsVerticalScrollIndicator={true}
            >
                {Array.from({ length: Math.ceil((searchQueryPOT.trim() ? filteredData : salessumdata).length / gridConfig.numColumns) }).map((_, rowIndex) => {
                    const rowItems = (searchQueryPOT.trim() ? filteredData : salessumdata).slice(
                        rowIndex * gridConfig.numColumns,
                        (rowIndex + 1) * gridConfig.numColumns
                    );
                    return (
                        <View key={rowIndex} style={{ flexDirection: 'row', marginBottom: 12 }}>
                            {rowItems.map((item, index) => {
                                const colors = CARD_COLORS[(rowIndex * gridConfig.numColumns + index) % CARD_COLORS.length];
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            width: gridConfig.cardWidth,
                                            height: 180,
                                            marginHorizontal: 6,
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            elevation: 4,
                                        }}
                                        onPress={() => {
                                            console.log("Clicked Item Data:", item, getpayload);
                                            handleConfirmActionCard(item, getpayload);
                                        }}
                                    >
                                        <LinearGradient
                                            colors={colors}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={{
                                                padding: 16,
                                                height: '100%',
                                            }}
                                        >
                                            {/* Header */}
                                            <View style={{ alignItems: 'center', marginBottom: 10 }}>
                                                <Text style={{
                                                    color: "#fff",
                                                    fontSize: 16,
                                                    fontWeight: "700",
                                                }}>
                                                    {item.prpname}
                                                </Text>
                                                {/* <Text style={{
                                                    color: "rgba(255,255,255,0.8)",
                                                    fontSize: 12,
                                                    fontWeight: "500",
                                                }}>
                                                    {item.strname}
                                                </Text> */}
                                            </View>

                                            {/* Party and PO Number */}
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                marginBottom: 12,
                                            }}>
                                                <Text style={{
                                                    color: "rgba(255,255,255,0.9)",
                                                    fontSize: 12,
                                                    fontWeight: "600",
                                                }}>
                                                    {item.party}
                                                </Text>
                                                {/* <Text style={{
                                                    color: "rgba(255,255,255,0.9)",
                                                    fontSize: 12,
                                                    fontWeight: "600",
                                                }}>
                                                    PO: {item.pono}
                                                </Text> */}
                                            </View>

                                            {/* All Key-Value Pairs (Right-Aligned) */}
                                            {Object.entries(item).map(([key, value]) => {
                                                if (['prpname', 'strname', 'party', 'pono'].includes(key)) return null;
                                                return (
                                                    <View key={key} style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 6,
                                                    }}>
                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.7)",
                                                            fontSize: 11,
                                                        }}>
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </Text>
                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "600",
                                                            textAlign: 'right',
                                                        }}>
                                                            {value}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={modalStyles.modalContainer}>
                    {/* Header */}
                    <View style={modalStyles.modalHeader}>
                        <Text style={modalStyles.modalTitle}>Purchase Order Details</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Icon name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <TextInput
                        placeholder="Search..."
                        style={modalStyles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    {/* Table Container */}
                    <View style={modalStyles.tableWrapper}>
                        <ScrollView
                            horizontal={true}
                            showsHorizontalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            <View style={{ minWidth: 1200 }}>
                                {/* Table Header (First Row) */}
                                <View style={[modalStyles.tableRow, { backgroundColor: theme.BRAND_GRADIENT_END }]}>
                                    {tableColumns.map(col => (
                                        <Text key={col.key} style={[modalStyles.tableHeaderText, { width: col.width, textAlign: col.align }]}>
                                            {col.label}
                                        </Text>
                                    ))}
                                </View>

                                {/* Table Body (Scrollable) */}
                                <FlatList
                                    data={getModalTableData.filter((item) =>
                                        Object.keys(fixedLabels).some((key) =>
                                            String(item[key]).toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                    )}
                                    renderItem={({ item }) => (
                                        <View style={modalStyles.tableRow}>
                                            {tableColumns.map(col => (
                                                <Text key={col.key} style={[modalStyles.tableCell, { width: col.width, textAlign: col.align }]}>
                                                    {item[col.key]}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                    keyExtractor={(item, index) => index.toString()}
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={10}
                                    windowSize={5}
                                    removeClippedSubviews={true}
                                    showsVerticalScrollIndicator={true}
                                    style={{ maxHeight: 400 }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>












        </>
    );
};

const styles = StyleSheet.create({
    listIconContainer: {
        position: 'absolute',
        top: 85,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 3,
        padding: 4,
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: isTablet ? 20 : 10,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    summaryBox: {
        flex: 1,
        marginHorizontal: 5,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: isTablet ? 14 : 12,
        color: '#555',
        alignSelf: 'flex-end',
    },
    summaryValue: {
        fontSize: isTablet ? 14 : 12,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    sectionTitle: {
        fontSize: isTablet ? 18 : 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    partyCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    partyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    partyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    partyAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    partyInfo: {
        flex: 1,
    },
    partyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    partyOrdersContainer: {
        marginTop: 4,
    },
    partyOrdersText: {
        fontSize: 12,
        color: '#666',
    },
    chevronIcon: {
        marginLeft: 'auto',
    },
    partyValues: {
        marginTop: 8,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    valueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    recentlyViewedCard: {
        borderWidth: 2,
        borderColor: theme.BRAND_GRADIENT_END,
    },
    recentlyViewedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: theme.BRAND_GRADIENT_END,
        padding: 4,
        borderRadius: 4,
    },
    recentlyViewedText: {
        color: 'white',
        fontSize: 10,
    },
    loadingIndicator: {
        padding: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    cardSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10
    },
    cardHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: '#E3F2FD', // Light blue (optional: change to light purple)
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginHorizontal: -15,
        marginBottom: 10,
    },
    cardHeaderText: {
        textAlign: 'center',
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    cardSubHeaderText: {
        textAlign: 'center',
        color: theme.BRAND_GRADIENT_END, // Purple theme
        fontSize: 14,
        fontWeight: '600',
    },
    cardContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginVertical: 8,
        padding: 15,
        borderRadius: 12,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,

        elevation: 4
    },
    twoColumnRow: {
        flexDirection: 'column',
        // justifyContent: 'space-between',
        marginBottom: 10,
        justifyContent: 'flex-end'
    }
});

const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.BRAND_GRADIENT_END,
      padding: 15,
    },
    modalTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    searchInput: {
      backgroundColor: '#fff',
      padding: 10,
      borderRadius: 5,
      margin: 10,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    tableWrapper: {
      flex: 1,
      margin: 10,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      padding: 10,
      backgroundColor: '#fff',
    },
    tableHeaderText: {
      color: '#fff',
      fontWeight: 'bold',
      padding: 5,
      textAlign: 'center',
      fontSize: 12,
    },
    tableCell: {
      color: '#333',
      padding: 5,
      textAlign: 'center',
      fontSize: 12,
    },
  });
  


export default React.memo(PurchaseOrderTracking);
