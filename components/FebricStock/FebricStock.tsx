import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
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
    const [salessumdata, setsalessumdata] = useState([]);
    const [salesdata, setsalesdata] = useState<Party[]>([]);
    const [salesdataTotal, setsalesdataTotal] = useState<number | null>(null);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(false);
    const [txntype, settxntype] = useState('mob_febric_stock')
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [filteredData, setFilteredData] = useState<Party[]>([]);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [PrpCodeList, setPrpCodeList] = useState([]);
    const [getpayload, setPayload] = useState<CardPayload[]>([]);
    const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(null);
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
    const [isListReady, setIsListReady] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [selectedPrpCode, setSelectedPrpCode] = useState<any>(null);
    const [numColumns, setNumColumns] = useState(1);
    const { width: screenWidth } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [getModalTableData, setModalTableData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('grey');
    const [greyStockData, setGreyStockData] = useState([]);
    const [finishStockData, setFinishStockData] = useState([]);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [isShadeVisible, setIsShadeVisible] = useState(false);

    useEffect(() => {
        if (selectedPrpCode) {
            console.log("selectedProperty", selectedPrpCode);
        }
    }, [selectedPrpCode]);


    const fetchPrpCode = async () => {
        await axios
            .get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prptype: 'S',
                        txntype: txntype,
                        fetch: 'prp'
                    }
                })
            )
            .then(response => {
                console.log('Hook Property Get: ', response);
                setPrpCodeList(response.data.response.data);
                console.log("setPrpCodeList", setPrpCodeList);
            })
            .catch(error => {
                console.log('Hook Property Get Error: ', error);
            });
    };


    useEffect(() => {
        if (isDrawerVisible && PrpCodeList.length === 0) {
            fetchPrpCode();
        }
    }, [isDrawerVisible]);

    useEffect(() => {
        if (selectedPrpCode) {
            console.log("🏷 Selected Property:", selectedPrpCode);
        }
    }, [selectedPrpCode]);


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
        const filtered = salessumdata.filter((item: any) =>
            String(item?.MDSNNAME || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.TOTQTY || '').toLowerCase().includes(lowercasedQuery) ||
            String(item?.SHDNAME || '').toLowerCase().includes(lowercasedQuery)
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
        const payload = {
            prpcode: selectedPrpCode.PrpCode,
            // txntype: txntype,
            prptype: "S"
        };
        setPayload(payload as any);
        console.log("Payload", payload);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.get(`${API}/api/appgreyinstockdata`, {
                params: payload,   // ✅ IMPORTANT
                headers: headers
            });
            const responseData = response?.data?.response?.data || [];
            console.log("🔵 response", payload, responseData);
            if (response.data.success === true) {
                if (responseData.length > 0) {
                    const prData = responseData
                        .filter(item => item.dptcode == 'PR')

                    const nonPrData = responseData
                        .filter(item => item.dptcode !== 'PR')

                    const prSummary = getItemWiseSummary(prData);
                    const nonPrSummary = getItemWiseSummary(nonPrData);
                    console.log("🟢 PR Summary", prData);
                    console.log("🟡 NON PR Summary", nonPrData);

                    const item82197 = responseData.filter(
                        item => item.ITMCODE == '82197' && item.dptcode == 'PR'
                    );

                    const item83191 = responseData.filter(
                        item => item.ITMCODE == '83191' && item.dptcode == 'PR'
                    );

                    console.log("🎯 ITMCODE 82197 (PR)", item82197);
                    console.log("🎯 ITMCODE 83191 (PR)", item83191);


                    setGreyStockData(prSummary);
                    setFinishStockData(nonPrSummary);
                    setsalesdata(responseData);
                    setsalessumdata(responseData);
                    setsalesdataTotal(responseData.length);
                }
            }
            else {
                Alert.alert(`${response.data.message}`);
                setGreyStockData([]);
                setFinishStockData([]);
                setsalesdata([]);
                setsalessumdata([]);
            }
        } catch (error) {
            console.log("❌ API Error:", error);
            Alert.alert('Server Error');
            setsalesdata([]);
            setsalessumdata([]);
        } finally {
            setIsLoading(false);
            closeDrawer();
        }
    };

    // const getItemWiseSummary = (data) => {
    //     const summary = data.reduce((acc, item) => {
    //         const key = item.ITMCODE;
    //         if (!acc[key]) {
    //             acc[key] = {
    //                 ITMCODE: item.ITMCODE,
    //                 ITMNAME: item.ITMNAME,
    //                 TOTQTY: 0
    //             };
    //         }
    //         acc[key].TOTQTY += Number(item.TOTQTY || 0);
    //         return acc;
    //     }, {});
    //     return Object.values(summary);
    // };

    const getItemWiseSummary = (data) => {
        const summary = data.reduce((acc, item) => {
            const key = item.ITMCODE;

            if (!acc[key]) {
                acc[key] = {
                    ITMCODE: item.ITMCODE,
                    ITMNAME: item.ITMNAME,
                    TOTQTY: 0
                };
            }
            const qty = parseFloat(item.TOTQTY) || 0;
            acc[key].TOTQTY += qty;
            return acc;
        }, {});
        return Object.values(summary);
    };

    const getDesignWiseSummary = (data) => {
        const summary = data.reduce((acc, item) => {
            const key = item.MDSNCODE;
            if (!acc[key]) {
                acc[key] = {
                    MDSNCODE: item.MDSNCODE,
                    MDSNNAME: item.MDSNNAME,
                    TOTQTY: 0
                };
            }
            acc[key].TOTQTY += Number(item.TOTQTY || 0);
            return acc;
        }, {});
        return Object.values(summary);
    };

    const detailData = useMemo(() => {
        const itemData = salesdata.filter(
            data => data.ITMCODE == selectedItem?.ITMCODE
        );
        return getDesignWiseSummary(itemData);
    }, [selectedItem, salesdata]);

    const getShadeWiseSummary = (data) => {
        const summary = data.reduce((acc, item) => {
            const key = item.SHDCODE || item.SHDNAME;

            if (!acc[key]) {
                acc[key] = {
                    SHDCODE: item.SHDCODE,
                    SHDNAME: item.SHDNAME,
                    TOTQTY: 0
                };
            }

            acc[key].TOTQTY += Number(item.TOTQTY || 0);

            return acc;
        }, {});

        return Object.values(summary);
    };

    const shadeData = useMemo(() => {
        const designData = salesdata.filter(
            data =>
                data.ITMCODE == selectedItem?.ITMCODE &&
                data.MDSNCODE == selectedDesign?.MDSNCODE
        );

        return getShadeWiseSummary(designData);
    }, [selectedDesign, selectedItem, salesdata]);

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
        { key: 'prpcode', label: 'Property', width: 160, align: 'center' },
        { key: 'pono', label: 'PO Number', width: 120, align: 'center' },
        { key: 'podate', label: 'PO Date', width: 120, align: 'center' },
        { key: 'itmname', label: 'Item Name', width: 160, align: 'left' },
        { key: 'netamt', label: 'Total Qty', width: 120, align: 'right' },
        { key: 'bqty', label: 'Balance Qty', width: 120, align: 'right' },
        { key: 'unitrate', label: 'Unit Rate', width: 120, align: 'right' },
        { key: 'amount', label: 'Amount', width: 120, align: 'right' },
    ];

    // const displayData = activeTab === 'grey'
    //     ? greyStockData
    //     : finishStockData;

    const addAllCard = (data) => {
        if (!data || data.length === 0) return [];

        const total = data.reduce((sum, item) => {
            return sum + Number(item.TOTQTY || 0);
        }, 0);

        const allItem = {
            ITMCODE: 'ALL',
            ITMNAME: 'ALL',
            TOTQTY: total
        };

        return [allItem, ...data]; // 🔥 ALL + original items
    };

    const displayData = useMemo(() => {
        if (activeTab === 'grey') {
            return addAllCard(greyStockData);
        } else {
            return addAllCard(finishStockData);
        }
    }, [activeTab, greyStockData, finishStockData]);

    const totalQty = useMemo(() => {
        const data = activeTab === 'grey'
            ? greyStockData
            : finishStockData;

        return data.reduce(
            (sum, item) => sum + parseFloat(item.TOTQTY || 0),
            0
        ).toFixed(3);
    }, [activeTab, greyStockData, finishStockData]);

    return (
        <>
            <HeaderBar
                userName={username}
                placeholder="Search stock..."
                onSearch={setSearchQueryPOT}
            />
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
                PrpCodeList={PrpCodeList}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                selectedPrpCode={selectedPrpCode}
                onPropertyCodeSelect={setSelectedPrpCode}
            />

            <View style={{ flexDirection: 'row', margin: 12 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: activeTab === 'grey' ? '#444' : '#ccc',
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                    }}
                    onPress={() => setActiveTab('grey')}
                >
                    <Text style={{ textAlign: 'center', color: '#fff' }}>
                        Grey Stock
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: activeTab === 'finish' ? '#444' : '#ccc',
                        borderTopRightRadius: 8,
                        borderBottomRightRadius: 8,
                    }}
                    onPress={() => setActiveTab('finish')}
                >
                    <Text style={{ textAlign: 'center', color: '#fff' }}>
                        Finish Stock
                    </Text>
                </TouchableOpacity>

            </View>

            <View style={{ flex: 1 }}>
                <FlatList
                    data={displayData}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={{ padding: 10, paddingBottom: 70 }}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    renderItem={({ item }: any) => (
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedItem(item);
                                setIsDetailVisible(true);
                            }}
                            style={{
                                backgroundColor: '#fff',
                                marginBottom: 10,
                                borderRadius: 12,
                                padding: 15,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3
                            }}
                        >
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: '#333',
                                    fontSize: 14,
                                    fontWeight: '600',
                                    flex: 1
                                }}
                            >
                                {item.ITMNAME}
                            </Text>
                            <View
                                style={{
                                    backgroundColor: theme.BRAND_GRADIENT_END,
                                    width: 80,
                                    height: 28,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 6
                                }}
                            >
                                <Text style={{
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 'bold'
                                }}>
                                    {Number(item.TOTQTY || 0).toFixed(3)}
                                </Text>
                            </View>

                        </TouchableOpacity>
                    )}
                />
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 55,
                    backgroundColor: theme.BRAND_GRADIENT_END,
                    justifyContent: 'center',
                    paddingHorizontal: 15,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    elevation: 10
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                            Total
                        </Text>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                            {Number(totalQty || 0).toFixed(3)}
                        </Text>
                    </View>
                </View>

            </View>

            <Modal visible={isDetailVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                    <View style={{
                        backgroundColor: theme.BRAND_GRADIENT_END,
                        paddingHorizontal: 15,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 'bold',
                            flex: 1
                        }}>
                            Item Name :- {selectedItem?.ITMNAME}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setIsDetailVisible(false)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 20,
                                padding: 6
                            }}
                        >
                            <Icon name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={detailData}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}

                        renderItem={({ item }: any) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedDesign(item);
                                    setIsShadeVisible(true);
                                }}
                                style={{
                                    backgroundColor: '#fff',
                                    marginBottom: 10,
                                    borderRadius: 12,
                                    padding: 15,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3
                                }}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: '#333',
                                        fontSize: 14,
                                        fontWeight: '600',
                                        flex: 1
                                    }}
                                >
                                    {item.MDSNNAME}
                                </Text>
                                <View
                                    style={{
                                        backgroundColor: theme.BRAND_GRADIENT_END,
                                        width: 80,
                                        height: 28,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 6
                                    }}
                                >
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 'bold'
                                    }}>
                                        {Number(item.TOTQTY || 0).toFixed(3)}
                                    </Text>
                                </View>

                            </TouchableOpacity>
                        )}
                    />
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 55,
                        backgroundColor: theme.BRAND_GRADIENT_END,
                        justifyContent: 'center',
                        paddingHorizontal: 15,
                        borderTopLeftRadius: 10,
                        borderTopRightRadius: 10,
                        elevation: 10
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                Total
                            </Text>

                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {
                                    (detailData as any[]).reduce(
                                        (sum, i) => sum + Number(i.TOTQTY || 0),
                                        0
                                    ).toFixed(3)
                                }
                            </Text>
                        </View>
                    </View>

                </View>
            </Modal>

            <Modal visible={isShadeVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>

                    {/* 🔵 HEADER */}
                    <View style={{
                        backgroundColor: theme.BRAND_GRADIENT_END,
                        paddingHorizontal: 15,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 'bold',
                            flex: 1
                        }}>
                            Design Name :- {selectedDesign?.MDSNNAME}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setIsShadeVisible(false)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 20,
                                padding: 6
                            }}
                        >
                            <Icon name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* 🔵 SHADE LIST (CARD STYLE) */}
                    <FlatList
                        data={shadeData}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}

                        renderItem={({ item }: any) => (
                            <View
                                style={{
                                    backgroundColor: '#fff',
                                    marginBottom: 10,
                                    borderRadius: 12,
                                    padding: 15,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3
                                }}
                            >

                                {/* 🔵 SHADE NAME */}
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: '#333',
                                        fontSize: 14,
                                        fontWeight: '600',
                                        flex: 1
                                    }}
                                >
                                    {item.SHDNAME}
                                </Text>

                                {/* 🔵 QTY BADGE */}
                                <View
                                    style={{
                                        backgroundColor: theme.BRAND_GRADIENT_END,
                                        width: 80,
                                        height: 28,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 6
                                    }}
                                >
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 'bold'
                                    }}>
                                        {Number(item.TOTQTY || 0).toFixed(3)}
                                    </Text>
                                </View>

                            </View>
                        )}
                    />

                    {/* 🔴 STICKY FOOTER */}
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 55,
                        backgroundColor: theme.BRAND_GRADIENT_END,
                        justifyContent: 'center',
                        paddingHorizontal: 15,
                        borderTopLeftRadius: 10,
                        borderTopRightRadius: 10,
                        elevation: 10
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                Total
                            </Text>

                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {
                                    (shadeData as any[]).reduce(
                                        (sum, i) => sum + Number(i.TOTQTY || 0),
                                        0
                                    ).toFixed(3)
                                }
                            </Text>
                        </View>
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
