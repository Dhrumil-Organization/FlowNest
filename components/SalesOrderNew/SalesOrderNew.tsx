import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TextInput,
    TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
    ScrollView, Modal
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { fetchPropertyData } from '../../common/API/Functions';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API } from "../../common/API/dynamicAPI";
import { useSalesOrder } from './SalesOrderContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://erp.sharpskillit.com/api';

const money = value => {
    return Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const todayYmd = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const SalesOrderNew = ({ token, navigation }) => {
    const { startNewOrder, loadExistingOrder } = useSalesOrder();
    const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [yearOptions, setYearOptions] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [propertyData, setPropertyData] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [propertySearch, setPropertySearch] = useState("");
    const [search, setSearch] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);
    const [opening, setOpening] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState({
        prpcode: '',
        yearno: '',
        strcode: '',
        fromdate: todayYmd(),
        todate: todayYmd(),
        show_authorized: false,
    });
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-platform': 'mob'
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    useEffect(() => {
        const load = async () => {
            const data = await fetchPropertyData(token);
            setPropertyData(data || []);
            console.log("data ::", data)
            if (data?.length) {
                setSelectedProperty(data[0]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const y = new Date().getFullYear();
        const arr = [];
        for (let i = 0; i < 5; i++) {
            arr.push(`${y - i}-${y - i + 1}`);
        }
        setYearOptions(arr);
        setSelectedYear(arr[0]);
    }, []);

    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const getFinancialYearDates = (financialYear) => {
        if (!financialYear) return;
        const years = financialYear.split("-");
        const startYear = parseInt(years[0]);
        const endYear = parseInt(years[1]);
        const fyStartDate = new Date(startYear, 3, 1);
        const fyEndDate = new Date(endYear, 2, 31);
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentFinancialYear = today.getMonth() >= 3
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;

        if (financialYear === currentFinancialYear) {
            setFromDate(fyStartDate);
            setToDate(today);
        } else {
            setFromDate(fyStartDate);
            setToDate(fyEndDate);
        }
    };

    useEffect(() => {
        if (selectedYear) {
            getFinancialYearDates(selectedYear);
        }
    }, [selectedYear]);

    const updateFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const loadOrders = async (text = '', isFilter = false, customFilters = null) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const activeFilters = customFilters || filters;

        try {
            if (isFilter) {
                setFilterLoading(true);
            } else {
                setLoading(true);
            }

            const yearno = selectedYear ? selectedYear.slice(-2) : '';

            const payload = {
                search: text,
                prpcode: activeFilters.prpcode,
                prptype: userPtype,
                yearno: yearno,
                strcode: '012',
                fromdate: activeFilters.fromdate,
                todate: activeFilters.todate,
                isauth: activeFilters.show_authorized ? 1 : 0,
                strtype: 'g',
                txntype: 'sales_order',
                referrer: 'dashboard',
                atype: 'B',
            };

            const res = await axios.get(
                `${API}/api/sosortbrowse`,
                getRequestConfig({ params: { ...payload } }),
            );

            if (res.data.success === true) {
                setOrders(res.data.response.data || []);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.log('ERROR ::', error?.response?.data || error.message);
            setOrders([]);
        } finally {
            setLoading(false);
            setFilterLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadOrders('');
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            loadOrders(search);
        }, 500);

        return () => clearTimeout(delay);
    }, [search]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrders(search);
    }, [search, filters]);

    // const applyFilter = () => {
    //     loadOrders(search);
    // };

    const applyFilter = () => {
        const updatedFilters = {
            ...filters,
            prpcode: selectedProperty?.PrpCode || '',
            yearno: selectedYear || '',
            fromdate: fromDate
                ? `${fromDate.getFullYear()}${String(fromDate.getMonth() + 1).padStart(2, '0')}${String(fromDate.getDate()).padStart(2, '0')}`
                : '',
            todate: toDate
                ? `${toDate.getFullYear()}${String(toDate.getMonth() + 1).padStart(2, '0')}${String(toDate.getDate()).padStart(2, '0')}`
                : '',
        };

        setFilters(updatedFilters);
        loadOrders(search, true, updatedFilters);
    };

    const resetFilter = () => {
        const reset = {
            prpcode: '',
            yearno: '',
            strcode: '',
            fromdate: todayYmd(),
            todate: todayYmd(),
            show_authorized: false,
        };

        setFilters(reset);

        setTimeout(() => {
            loadOrders(search);
        }, 100);
    };

    const addNewSalesOrder = () => {
        const params = {
            mode: 'ADD',
            uid: 0,
            prpcode: filters.prpcode || selectedProperty?.PrpCode || '',
            strcode: filters.strcode || '012',
            yearno: filters.yearno || selectedYear?.slice(-2) || '',
            token: token,
        };

        startNewOrder(params);

        // console.log("params", params);
        navigation.navigate('PartyListScreen', params);
    };

    const openExistingOrder = order => {
        const params = {
            mode: 'EDIT',
            uid: order.UId,
            prpcode: order.PrpCode,
            strcode: order.StrCode || filters.strcode || '012',
            yearno: selectedYear?.slice(-2),
            token: token,
        };

        console.log('OPEN SO PARAMS:', params);

        loadExistingOrder(params);

        navigation.navigate('OrderSummaryScreen', params);
    };

    const getSODate = item => {
        return (
            item.SODateDisplay ||
            item.SODtDisplay ||
            item.OrderDateDisplay ||
            item.SODate ||
            item.SODt ||
            item.OrderDate ||
            '-'
        );
    };

    const getSONo = item => {
        return item.SONo || item.SO_No || item.OrderNo || item.PONo || '-';
    };

    const filteredOrders = orders.filter(item => {

        const searchText = search.toLowerCase();

        return (
            String(getSONo(item)).toLowerCase().includes(searchText) ||
            String(item?.ParName || '').toLowerCase().includes(searchText) ||
            String(item?.ParCode || '').toLowerCase().includes(searchText) ||
            String(getSODate(item)).toLowerCase().includes(searchText)
        );

    });

    const renderSkeleton = () => {

        return [1, 2, 3, 4].map((item) => (

            <View key={item} style={styles.skeletonCard}>

                <View style={styles.skeletonHeader}>
                    <View style={styles.skeletonCircle} />

                    <View style={{ flex: 1 }}>
                        <View style={styles.skeletonLineLarge} />
                        <View style={styles.skeletonLineSmall} />
                    </View>
                </View>

                <View style={styles.skeletonMiddle} />

                <View style={styles.skeletonFooter} />

            </View>

        ));

    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={styles.proCard}
                onPress={() => openExistingOrder(item)}
            >
                <View style={styles.proCardHeader}>
                    <View style={styles.soIconBox}>
                        <Icon name="receipt-long" size={22} color="#13879A" />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.soNo}>{getSONo(item)}</Text>
                        <Text style={styles.soDate}>SO Date : {getSODate(item)}</Text>
                    </View>

                    <View
                        style={[
                            styles.proStatusBadge,
                            item.StatusName === 'Approved' && styles.proApprovedBadge,
                        ]}
                    >
                        <Text
                            style={[
                                styles.proStatusText,
                                item.StatusName === 'Approved' && styles.proApprovedText,
                            ]}
                        >
                            {item.StatusName || 'Pending'}
                        </Text>
                    </View>
                </View>

                <View style={styles.partyBlock}>
                    <View style={styles.partyMetaRow}>
                        <Icon name="badge" size={14} color="#667085" />
                        <Text style={styles.partyMetaText}>{item.ParCode || '-'}</Text>
                    </View>

                    <Text style={styles.partyTitle} numberOfLines={1}>
                        {item.ParName || '-'}
                    </Text>
                </View>

                <View style={styles.proDivider} />

                <View style={styles.proFooter}>
                    <View style={styles.proAmountBox}>
                        <Text style={styles.proMiniLabel}>Net Amount</Text>
                        <Text style={styles.proAmount}>₹ {item.NetAmt}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Sales Order Browse</Text>

                <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
                    {/* <Text style={styles.filterIcon}>⚙</Text> */}
                    <Icon name="tune" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                <View style={styles.searchBox}>
                    <Text style={styles.searchIcon}>⌕</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search order no, party name or code"
                        placeholderTextColor="#000"
                        style={styles.searchInput}
                    />
                </View>

                {showFilter && (
                    <View style={styles.filterCard}>
                        {/* PROPERTY */}
                        <View style={styles.filterRow}>
                            <View style={styles.filterCol}>
                                <Text style={styles.filterLabel}>Property</Text>

                                <TouchableOpacity
                                    style={styles.bigInput}
                                    onPress={() => setPropertyPickerVisible(true)}
                                >
                                    <Text style={styles.inputText}>
                                        {selectedProperty?.LngName || "Select Property"}
                                    </Text>

                                    <Icon
                                        name="keyboard-arrow-down"
                                        size={20}
                                        color="#000"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* YEAR */}
                        <View style={styles.filterRow}>
                            <View style={styles.filterCol}>
                                <Text style={styles.filterLabel}>Year</Text>

                                <TouchableOpacity
                                    style={styles.bigInput}
                                    onPress={() => setYearPickerVisible(true)}
                                >
                                    <Text style={styles.inputText}>
                                        {selectedYear || "Select Year"}
                                    </Text>

                                    <Icon
                                        name="keyboard-arrow-down"
                                        size={20}
                                        color="#000"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.filterRow}>
                            {/* <View style={styles.filterCol}>
                                <Text style={styles.filterLabel}>Store</Text>
                                <TextInput
                                    value={filters.strcode}
                                    onChangeText={v => updateFilter('strcode', v)}
                                    placeholder="StrCode"
                                    placeholderTextColor="#98A2B3"
                                    style={styles.filterInput}
                                />
                            </View> */}

                            <View style={styles.filterCol}>
                                <Text style={styles.filterLabel}>From Date</Text>
                                <TouchableOpacity
                                    style={styles.dateBox}
                                    onPress={() => setShowFromPicker(true)}
                                >
                                    <Icon
                                        name="calendar-today"
                                        size={16}
                                        color="#666"
                                    />

                                    <Text style={styles.inputText}>
                                        {formatDate(fromDate) || "From Date"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterCol}>
                                <Text style={styles.filterLabel}>To Date</Text>
                                <TouchableOpacity
                                    style={styles.dateBox}
                                    onPress={() => setShowToPicker(true)}
                                >
                                    <Icon
                                        name="calendar-today"
                                        size={16}
                                        color="#666"
                                    />

                                    <Text style={styles.inputText}>
                                        {formatDate(toDate) || "To Date"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.filterRow}>

                            <TouchableOpacity
                                style={styles.checkBoxRow}
                                onPress={() =>
                                    updateFilter('show_authorized', !filters.show_authorized)
                                }>
                                <View
                                    style={[
                                        styles.checkBox,
                                        filters.show_authorized && styles.checkBoxActive,
                                    ]}>
                                    {filters.show_authorized && (
                                        <Text style={styles.checkMark}>✓</Text>
                                    )}
                                </View>
                                <Text style={styles.checkText}>Show Authorized Data</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterBtnRow}>
                            <TouchableOpacity style={styles.resetBtn} onPress={resetFilter}>
                                <Text style={styles.resetText}>Reset</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                                <Text style={styles.applyText}>Apply Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {(loading && orders.length === 0) || filterLoading ? (
                    <View>
                        {renderSkeleton()}
                    </View>
                ) : (
                    <FlatList
                        data={filteredOrders}
                        keyExtractor={(item, index) => `${item.UId}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        contentContainerStyle={{ paddingBottom: 90 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyTitle}>No sales order found</Text>
                                <Text style={styles.emptySub}>
                                    Search order no or create a new sales order.
                                </Text>
                            </View>
                        }
                    />
                )}

                <Modal visible={propertyPickerVisible} animationType="slide">
                    <View style={{ flex: 1, backgroundColor: "#fff" }}>

                        {/* HEADER */}
                        <View style={styles.pickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    setPropertyPickerVisible(false);
                                    setPropertySearch("");
                                }}
                            >
                                <Icon
                                    name="arrow-back-ios"
                                    size={20}
                                    color="#000"
                                />
                            </TouchableOpacity>
                            <Text style={styles.pickerTitle}>
                                Select Property
                            </Text>
                            <View style={{ width: 20 }} />
                        </View>

                        {/* SEARCH */}
                        <View style={styles.pickerSearch}>
                            <Icon
                                name="search"
                                size={18}
                                color="#000"
                            />
                            <TextInput
                                placeholder="Search property..."
                                placeholderTextColor="#000"
                                value={propertySearch}
                                onChangeText={setPropertySearch}
                                style={{ flex: 1 }}
                            />
                        </View>

                        {/* LIST */}
                        <FlatList
                            data={propertyData.filter(p =>
                                p.LngName.toLowerCase().includes(
                                    propertySearch.toLowerCase()
                                )
                            )}
                            keyExtractor={(item) => item.PrpCode}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setSelectedProperty(item);
                                        setPropertyPickerVisible(false);
                                        setPropertySearch("");
                                    }}
                                >
                                    <Text style={{ color: "#000" }}>
                                        {item.LngName}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Modal>

                <Modal visible={yearPickerVisible} animationType="slide">

                    <View style={{ flex: 1, backgroundColor: "#fff" }}>

                        <View style={styles.pickerHeader}>

                            <TouchableOpacity
                                onPress={() => setYearPickerVisible(false)}
                            >
                                <Icon
                                    name="arrow-back-ios"
                                    size={20}
                                    color="#000"
                                />
                            </TouchableOpacity>

                            <Text style={styles.pickerTitle}>
                                Select Year
                            </Text>

                            <View style={{ width: 20 }} />

                        </View>

                        <FlatList
                            data={yearOptions}

                            keyExtractor={(item, index) => index.toString()}

                            renderItem={({ item }) => (

                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {

                                        setSelectedYear(item);

                                        setYearPickerVisible(false);

                                    }}
                                >
                                    <Text style={{ color: "#000" }}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>

                            )}
                        />

                    </View>

                </Modal>
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.fab}
                    onPress={addNewSalesOrder}
                >
                    <Icon name="add" size={30} color="#fff" />
                </TouchableOpacity>
                {opening && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.overlayText}>Loading order...</Text>
                    </View>
                )}
            </View>
            {/* FROM DATE PICKER */}
            {showFromPicker && (
                <DateTimePicker
                    value={fromDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {

                        setShowFromPicker(false);

                        if (event.type === "set" && selectedDate) {

                            setFromDate(selectedDate);

                        }
                    }}
                />
            )}

            {/* TO DATE PICKER */}
            {showToPicker && (
                <DateTimePicker
                    value={toDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {

                        setShowToPicker(false);

                        if (event.type === "set" && selectedDate) {

                            setToDate(selectedDate);

                        }
                    }}
                />
            )}
        </SafeAreaView>
    );
};

export default SalesOrderNew;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f7fb' },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    // header: {
    //     height: 100,
    //     backgroundColor: '#13879A',
    //     flexDirection: 'row',
    //     alignItems: 'flex-end',
    //     paddingHorizontal: 14,
    //     paddingBottom: 16,
    // },
    back: { color: '#fff', fontSize: 34, width: 35 },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
    filterIcon: {
        color: '#fff',
        fontSize: 22,
        width: 35,
        textAlign: 'right',
    },
    container: { flex: 1, padding: 14 },
    searchBox: {
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    searchIcon: { fontSize: 18, color: '#667085', marginRight: 8 },
    searchInput: { flex: 1, color: '#101828', fontSize: 14 },
    filterCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    filterCol: {
        flex: 1,
    },
    filterLabel: {
        color: '#000',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 5,
    },
    filterInput: {
        height: 42,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        borderRadius: 9,
        paddingHorizontal: 10,
        color: '#101828',
        backgroundColor: '#fff',
        fontSize: 13,
    },
    checkBoxRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 20,
    },
    checkBox: {
        width: 22,
        height: 22,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    checkBoxActive: {
        backgroundColor: '#13879A',
    },
    checkMark: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
    },
    checkText: {
        flex: 1,
        color: '#101828',
        fontWeight: '700',
        fontSize: 12,
    },
    filterBtnRow: {
        flexDirection: 'row',
        gap: 10,
    },
    resetBtn: {
        flex: 1,
        height: 42,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetText: {
        color: '#13879A',
        fontWeight: '900',
    },
    applyBtn: {
        flex: 1,
        height: 42,
        borderRadius: 9,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyText: {
        color: '#fff',
        fontWeight: '900',
    },
    addNewBtn: {
        height: 48,
        backgroundColor: '#13879A',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    addNewText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    orderNo: { fontSize: 15, color: '#06285f', fontWeight: '900' },
    partyName: { fontSize: 14, color: '#101828', fontWeight: '800', marginTop: 4 },
    statusBadge: {
        marginLeft: 'auto',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: { color: '#c2410c', fontSize: 11, fontWeight: '800' },
    approvedBadge: {
        backgroundColor: '#ecfdf3',
    },
    approvedText: {
        color: '#027a48',
    },
    infoRow: { flexDirection: 'row', marginTop: 8 },
    infoLabel: { flex: 1, color: '#667085', fontSize: 12 },
    infoValue: { color: '#344054', fontSize: 12, fontWeight: '700' },
    bottomRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginTop: 12,
        padding: 10,
    },
    smallBox: { flex: 1, alignItems: 'center' },
    amountBox: { flex: 1.5, alignItems: 'center' },
    smallValue: { color: '#06285f', fontSize: 15, fontWeight: '900' },
    amount: { color: '#16a34a', fontSize: 15, fontWeight: '900' },
    smallLabel: { color: '#667085', fontSize: 11, marginTop: 3 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 8, color: '#667085' },
    emptyBox: {
        marginTop: 60,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e4e7ef',
    },
    emptyTitle: { fontSize: 16, color: '#101828', fontWeight: '900' },
    emptySub: { fontSize: 12, color: '#667085', marginTop: 6, textAlign: 'center' },
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: { color: '#fff', marginTop: 10, fontWeight: '800' },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    pickerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000"
    },

    pickerSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 10
    },

    pickerItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    bigInput: {
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 12,
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
    },

    inputText: {
        flex: 1,
        color: "#000"
    },
    dateBox: {
        height: 42,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        borderRadius: 9,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    proCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E6ECF2',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    proCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    soIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E7F6F8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    soNo: {
        color: '#101828',
        fontSize: 15,
        fontWeight: '900',
    },
    soDate: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 3,
    },
    proStatusBadge: {
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    proStatusText: {
        color: '#C2410C',
        fontSize: 11,
        fontWeight: '900',
    },
    proApprovedBadge: {
        backgroundColor: '#ECFDF3',
    },
    proApprovedText: {
        color: '#027A48',
    },
    partyBlock: {
        marginTop: 12,
    },
    partyTitle: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '800',
    },
    partyMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    partyMetaText: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 5,
    },
    proDivider: {
        height: 1,
        backgroundColor: '#EEF2F6',
        marginVertical: 12,
    },
    proFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    proMiniBox: {
        width: 70,
    },
    proMiniLabel: {
        color: '#667085',
        fontSize: 11,
        fontWeight: '700',
    },
    proMiniValue: {
        color: '#13879A',
        fontSize: 16,
        fontWeight: '900',
        marginTop: 3,
    },
    proAmountBox: {
        flex: 1,
        alignItems: 'flex-end',
    },
    proAmount: {
        color: '#16A34A',
        fontSize: 17,
        fontWeight: '900',
        marginTop: 3,
    },
    fab: {
        position: 'absolute',
        right: 22,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E6ECF2',
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
        marginRight: 12,
    },
    skeletonLineLarge: {
        height: 14,
        width: '70%',
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        marginBottom: 8,
    },
    skeletonLineSmall: {
        height: 11,
        width: '45%',
        borderRadius: 8,
        backgroundColor: '#EEF2F6',
    },
    skeletonMiddle: {
        height: 18,
        width: '85%',
        borderRadius: 8,
        backgroundColor: '#EEF2F6',
        marginTop: 18,
    },
    skeletonFooter: {
        height: 34,
        width: '100%',
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        marginTop: 16,
    },
});