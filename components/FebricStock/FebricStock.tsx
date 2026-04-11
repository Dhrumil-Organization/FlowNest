import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal } from 'react-native';
import { useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import CustomDrawer from './CustomDrawer';
import { CardPayload } from './Modal';
interface Party {
    parcode: string;
    partyname: string;
    noof: string;
    totmtr: string;
    pendingmtr: string;
    amount: string;
    pendingamt: string;
}

const PurchaseOrderTracking: React.FC<{ token: string, navigation: any; username: string }> = ({ token, navigation, username }) => {
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
    const { width: screenWidth } = useWindowDimensions();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('grey');
    const [greyStockData, setGreyStockData] = useState([]);
    const [finishStockData, setFinishStockData] = useState([]);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [isShadeVisible, setIsShadeVisible] = useState(false);
    const [isSubDesignDetailVisible, setIsSubDesignDetailVisible] = useState(false);
    const [selectedSubDesign, setSelectedSubDesign] = useState<any>(null);

    const fetchPrpCode = async () => {
        await axios
            .get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: {
                            prptype: 'S',
                            txntype: txntype,
                            fetch: 'prp'
                        }
                    }
                )

            ).then(response => {

                setPrpCodeList(response.data.response.data);

            }).catch(error => {});
    };

    useEffect(() => { isDrawerVisible && PrpCodeList.length === 0 && fetchPrpCode() }, [isDrawerVisible]);

    useEffect(

        () => {

            if (lastViewedParcode && !hasAutoScrolled && isListReady && flatListRef.current && (searchQueryPOT.trim() ? filteredData.length > 0 : renderedData.length > 0)) {

                const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
                const index = dataToUse.findIndex(item => item.parcode === lastViewedParcode);

                if (index !== -1) {

                    setTimeout(

                        () => {

                            flatListRef.current?.scrollToIndex({ index, animated: true });
                            setHasAutoScrolled(true);

                        }, 300
                    );
                }
            }

        }, [lastViewedParcode, filteredData, renderedData, searchQueryPOT, hasAutoScrolled, isListReady]
    );

    useEffect(

        () => {

            if (!searchQueryPOT.trim()) {

                setFilteredData(salessumdata.slice(0, itemsPerPage));
                setPage(1);

                return;
            }

            const lowercasedQuery = searchQueryPOT.toLowerCase();
            const filtered = salessumdata.filter((item: any) =>
                String(item?.MDSNNAME || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.TOTQTY || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.SHDNAME || '').toLowerCase().includes(lowercasedQuery)
            );

            setFilteredData(filtered);
            setPage(1);

        }, [searchQueryPOT, salessumdata]
    );

    useEffect(

        () => {

            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            setFromDate(firstDayOfMonth);
            setToDate(today);

        }, []
    );

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

    const handleConfirmAction = async () => {

        setIsLoading(true);

        console.log("selectedPrpCode :", selectedPrpCode)
        let pcodes = [];
        let pcodesCntr = 0;
        selectedPrpCode && selectedPrpCode.filter((el, ind) => {
            pcodes[pcodesCntr] = el.PrpCode
        });

        const payload = {
            prpcodes: pcodes,
            prptype: "S",
            txntype: "mob_fabric_stock"
        };

        setPayload(payload as any);

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        console.log("appgreyinstockdata API payload :", payload )
        console.log("appgreyinstockdata API URL :", `${API}/api/appgreyinstockdata` )

        try {
            const response = await axios.get(`${API}/api/appgreyinstockdata`, {
                params: payload,
                headers: headers
            });

            const responseData = response?.data?.response?.data || [];
            console.log("appgreyinstockdata API responseData", responseData)

            if (response.data.success === true) {

                if (responseData.length > 0) {

                    const prData = responseData.filter(item => item.dptcode == 'PR')
                    const nonPrData = responseData.filter(item => item.dptcode !== 'PR');

                    //console.log("nonPrData", nonPrData);

                    const prSummary = getItemWiseSummary(prData, true, true);
                    const nonPrSummary = getItemWiseSummary(nonPrData, false, false);

                    //console.log("getItemWiseSummary", getItemWiseSummary);

                    setGreyStockData(prSummary);
                    //console.log("prSummary :", prSummary)
                    //console.log("nonPrSummary :", nonPrSummary)
                    setFinishStockData(nonPrSummary);
                    setsalesdata(responseData);
                    setsalessumdata(responseData);
                    setsalesdataTotal(responseData.length);
                }

            } else {

                Alert.alert(`${response.data.message}`);
                setGreyStockData([]);
                setFinishStockData([]);
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

    // const getItemWiseSummary = (data) => {

    //     const summary = data.reduce((acc, item) => {

    //         const key = item.ITMCODE;

    //         if (!acc[key]) {

    //             acc[key] = { ITMCODE: item.ITMCODE, ITMNAME: item.ITMNAME, TOTQTY: 0 };
    //         }

    //         const qty = parseFloat(item.TOTQTY) || 0;
    //         acc[key].TOTQTY += qty;

    //         return acc;

    //     }, {});

    //     return Object.values(summary);
    // };

    const getItemWiseSummary = (data = [], filter1 = true, filter2 = true, order = 'asc') => {

        if (!data || data.length === 0) return [];

        // 🔽 FILTER (2 conditions)
        const filtered = data.filter(item =>
            (filter1 ? item.dptcode == 'PR' : item.dptcode != 'PR') //&& (filter2 ? item.TOTQTY > 0 : true) 
        );

        // 🔽 GROUP + SUM
        const summary = filtered.reduce((acc, item) => {
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

        let result = Object.values(summary);

        // 🔽 NAME se sorting
        result.sort((a, b) =>
            order === 'asc'
                ? (a.ITMNAME || '').localeCompare(b.ITMNAME || '')
                : (b.ITMNAME || '').localeCompare(a.ITMNAME || '')
        );

        //console.log("===== ITEM WISE TOTAL QTY =====");
        // result.forEach(item => {
        //     console.log(`ITMCODE: ${item.ITMCODE} | TOTAL QTY: ${item.TOTQTY}`);
        // });

        return result;
    };

    const getDesignWiseSummary = (data) => {

        const summary = data.reduce((acc, item) => {

            const key = item.MDSNCODE;

            if (!acc[key]) {

                acc[key] = { MDSNCODE: item.MDSNCODE, MDSNNAME: item.MDSNNAME, TOTQTY: 0 };
            }

            acc[key].TOTQTY += Number(item.TOTQTY || 0);

            return acc;

        }, {});

        return Object.values(summary);
    };

    const getShadeWiseSummary = (mainItm = {}, data = [], flag = 'yes', order = 'asc') => {

        let filtered = [];

        if (!data || data.length === 0) return [];

        if (mainItm && mainItm.SDSNCODE == 'ALL' && mainItm.SDSNNAME == 'ALL [ SUB DESIGNS ]') {

            filtered = data.filter(item => (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR'));

        } else {
            filtered = data.filter(item =>
                item.SDSNCODE == mainItm?.SDSNCODE &&
                (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR')
            );
        }

        const grouped = filtered.reduce((acc, item) => {
            const key = item.SHDNAME || 'UNKNOWN';

            if (!acc[key]) {
                acc[key] = {
                    SHDCODE: item.SHDCODE,
                    SHDNAME: key,
                    TOTQTY: 0
                };
            }

            acc[key].TOTQTY += Number(item.TOTQTY || 0);

            return acc;
        }, {});

        const result = Object.values(grouped);

        result.sort((a, b) => order === 'asc'
                ? (a.SHDNAME || '').localeCompare(b.SHDNAME || '')
                : (b.SHDNAME || '').localeCompare(a.SHDNAME || '')
        );

        const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

        const allItem = {
            SHDCODE: 'ALL',
            SHDNAME: 'ALL [ SHADES ]',
            TOTQTY: total
        };

        return [allItem, ...result];
    };

    const shadeData = useMemo(() => {

        if (activeTab === 'grey') {

            return getShadeWiseSummary(selectedSubDesign, salesdata, 'yes');

        } else {

            return getShadeWiseSummary(selectedSubDesign, salesdata, 'no');
        }

    }, [selectedDesign, selectedSubDesign, salesdata]);

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

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

    useEffect(

        () => {

            getGridConfig();

        }, [screenWidth]
    );

    const addAllCard = (data) => {

        if (!data || data.length === 0) return [];

        const total = data.reduce((sum, item) => {

            return sum + Number(item.TOTQTY || 0);

        }, 0);

        const allItem = { ITMCODE: 'ALL', ITMNAME: 'ALL [ ITEMS ]', TOTQTY: total };


        return [allItem, ...data];
    };

    const displayData = useMemo(

        () => {

            if (activeTab === 'grey') {

                return addAllCard(greyStockData);

            } else {

                return addAllCard(finishStockData);
            }

        }, [activeTab, greyStockData, finishStockData]
    );

    const totalQty = useMemo(

        () => {

            const data = activeTab === 'grey' ? greyStockData : finishStockData;

            return data.reduce((sum, item) => sum + parseFloat(item.TOTQTY || 0), 0).toFixed(3);

        }, [activeTab, greyStockData, finishStockData]
    );

    const detailData = useMemo(() => {

        const itemData = salesdata.filter(data => data.ITMCODE == selectedItem?.ITMCODE);

        return getDesignWiseSummary(itemData);

    }, [selectedItem, salesdata]);

    // const getAllDesignData = (mainItm = {}, data = [], flag = 'yes') => {

    //     if (!data || data.length === 0) return [];

    //     let filtered = [];

    //     if (mainItm && mainItm.ITMCODE == 'ALL' && mainItm.ITMNAME == 'ALL [ ITEMS ]') {

    //         filtered = data.filter(item => (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR'));

    //     } else {
    //         filtered = data.filter(item =>
    //             item.ITMCODE == mainItm?.ITMCODE &&
    //             (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR')
    //         );
    //     }

    //     const grouped = filtered.reduce((acc, item) => {
    //         const key = item.MDSNNAME || 'UNKNOWN';

    //         if (!acc[key]) {
    //             acc[key] = {
    //                 MDSNCODE: item.MDSNCODE,
    //                 MDSNNAME: key,
    //                 TOTQTY: 0
    //             };
    //         }

    //         acc[key].TOTQTY += Number(item.TOTQTY || 0);

    //         return acc;
    //     }, {});

    //     const result = Object.values(grouped);



    //     const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

    //     const allItem = {
    //         MDSNCODE: 'ALL',
    //         MDSNNAME: 'ALL [ DESIGNS ]',
    //         TOTQTY: total
    //     };

    //     return [allItem, ...result];
    // };

    const getAllDesignData = (mainItm = {}, data = [], flag = 'yes', order = 'asc') => {

        if (!data || data.length === 0) return [];

        let filtered = [];

        // 🔽 FILTER
        if (mainItm && mainItm.ITMCODE == 'ALL' && mainItm.ITMNAME == 'ALL [ ITEMS ]') {

            filtered = data.filter(item =>
                flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR'
            );

        } else {
            filtered = data.filter(item =>
                item.ITMCODE == mainItm?.ITMCODE &&
                (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR')
            );
        }

        // 🔽 GROUP + SUM
        const grouped = filtered.reduce((acc, item) => {
            const key = item.MDSNNAME || 'UNKNOWN';

            if (!acc[key]) {
                acc[key] = {
                    MDSNCODE: item.MDSNCODE,
                    MDSNNAME: key,
                    TOTQTY: 0
                };
            }

            acc[key].TOTQTY += Number(item.TOTQTY || 0);

            return acc;
        }, {});

        let result = Object.values(grouped);

        // 🔽 NAME se sorting
        result.sort((a, b) =>
            order === 'asc'
                ? (a.MDSNNAME || '').localeCompare(b.MDSNNAME || '')
                : (b.MDSNNAME || '').localeCompare(a.MDSNNAME || '')
        );

        // 🔽 TOTAL
        const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

        const allItem = {
            MDSNCODE: 'ALL',
            MDSNNAME: 'ALL [ DESIGNS ]',
            TOTQTY: total
        };

        return [allItem, ...result];
    };

    const designDataLevel1 = useMemo(

        () => {

            if (activeTab === 'grey') {

                return getAllDesignData(selectedItem, salesdata, 'yes')

            } else {

                return getAllDesignData(selectedItem, salesdata, 'no')
            }

        }, [selectedItem, salesdata, finishStockData]
    )

    // const getAllSubDesignData = (mainItm = {}, data = [], flag = 'yes') => {

    //     let filtered = [];
    //     if (!data || data.length === 0) return [];

    //     if (mainItm && mainItm.MDSNCODE == 'ALL' && mainItm.MDSNNAME == 'ALL [ DESIGNS ]') {

    //         filtered = data.filter(item => (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR'));

    //     } else {
    //         filtered = data.filter(item =>
    //             item.MDSNCODE == mainItm?.MDSNCODE &&
    //             (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR')
    //         );
    //     }

    //     const grouped = filtered.reduce((acc, item) => {
    //         const key = item.SDSNNAME || 'UNKNOWN';

    //         if (!acc[key]) {
    //             acc[key] = {
    //                 SDSNCODE: item.SDSNCODE,
    //                 SDSNNAME: key,
    //                 TOTQTY: 0
    //             };
    //         }

    //         acc[key].TOTQTY += Number(item.TOTQTY || 0);

    //         return acc;
    //     }, {});

    //     const result = Object.values(grouped);

    //     result.sort((a, b) =>
    //         order === 'asc'
    //             ? (a.SDSNNAME || '').localeCompare(b.SDSNNAME || '')
    //             : (b.SDSNNAME || '').localeCompare(a.SDSNNAME || '')
    //     );

    //     const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

    //     const allItem = {
    //         SDSNCODE: 'ALL',
    //         SDSNNAME: 'ALL [ SUB DESIGNS ]',
    //         TOTQTY: total
    //     };

    //     return [allItem, ...result];
    // };

    const getAllSubDesignData = (mainItm = {}, data = [], flag = 'yes', order = 'asc') => {

        let filtered = [];
        if (!data || data.length === 0) return [];

        // 🔽 FILTER
        if (mainItm && mainItm.MDSNCODE == 'ALL' && mainItm.MDSNNAME == 'ALL [ DESIGNS ]') {

            filtered = data.filter(item =>
                flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR'
            );

        } else {
            filtered = data.filter(item =>
                item.MDSNCODE == mainItm?.MDSNCODE &&
                (flag === 'yes' ? item.dptcode == 'PR' : item.dptcode != 'PR')
            );
        }

        // 🔽 GROUP
        const grouped = filtered.reduce((acc, item) => {
            const key = item.SDSNNAME || 'UNKNOWN';

            if (!acc[key]) {
                acc[key] = {
                    SDSNCODE: item.SDSNCODE,
                    SDSNNAME: key,
                    TOTQTY: 0
                };
            }

            acc[key].TOTQTY += Number(item.TOTQTY || 0);

            return acc;
        }, {});

        let result = Object.values(grouped);

        // 🔽 SORT (ab error nahi aayega)
        result.sort((a, b) =>
            order === 'asc'
                ? (a.SDSNNAME || '').localeCompare(b.SDSNNAME || '')
                : (b.SDSNNAME || '').localeCompare(a.SDSNNAME || '')
        );

        const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

        const allItem = {
            SDSNCODE: 'ALL',
            SDSNNAME: 'ALL [ SUB DESIGNS ]',
            TOTQTY: total
        };

        return [allItem, ...result];
    };

    const subDesignDataLevel2 = useMemo(

        () => {

            if (activeTab === 'grey') {

                return getAllSubDesignData(selectedDesign, salesdata, 'yes')

            } else {

                return getAllSubDesignData(selectedDesign, salesdata, 'no')

            }

        }, [selectedDesign, salesdata, finishStockData]
    )

    return (
        <>
            <HeaderBar userName={username} placeholder="Search stock..." onSearch={setSearchQueryPOT} />
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
                onPropertyCodeSelect={setSelectedPrpCode} />

            <View style={{ flexDirection: 'row', margin: 12 }}>
                <TouchableOpacity
                    style={{
                        flex: 1, padding: 12, backgroundColor: activeTab === 'grey' ? '#444' : '#ccc',
                        borderTopLeftRadius: 8, borderBottomLeftRadius: 8,
                    }}
                    onPress={() => setActiveTab('grey')}>
                    <Text style={{ textAlign: 'center', color: '#fff' }}> Grey Stock </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1, padding: 12, backgroundColor: activeTab === 'finish' ? '#444' : '#ccc',
                        borderTopRightRadius: 8, borderBottomRightRadius: 8,
                    }}
                    onPress={() => setActiveTab('finish')}>
                    <Text style={{ textAlign: 'center', color: '#FFF' }}>Finish Stock</Text>
                </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
                <FlatList
                    data={displayData}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={{ padding: 10, paddingBottom: 70 }}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    renderItem={
                        //({ item }: any) => (
                        ({ item, index }: any) => (
                            <TouchableOpacity
                                onPress={() => { setSelectedItem(item); setIsDetailVisible(true) }}
                                style={{
                                    backgroundColor: index === 0 ? '#CCE9EF' : '#FFF', marginBottom: 10, borderRadius: 12, padding: 15,
                                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000',
                                    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
                                }}>
                                <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}>
                                    {item.ITMNAME}
                                </Text>
                                {/* <View style={{
                                    backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center',
                                    alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Number(item.TOTQTY || 0).toFixed(3)}</Text>
                                </View> */}
                                <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                    {Number(item.TOTQTY || 0).toFixed(3)}
                                </Text>
                            </TouchableOpacity>
                        )
                    }
                />
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, backgroundColor: theme.BRAND_GRADIENT_END,
                    justifyContent: 'center', paddingHorizontal: 15, borderTopLeftRadius: 10, borderTopRightRadius: 10, elevation: 10
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}> Total </Text>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}> {Number(totalQty || 0).toFixed(3)} </Text>
                    </View>
                </View>
            </View>
            <Modal visible={isDetailVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                    <View style={{
                        backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> Item:    {selectedItem?.ITMNAME} </Text>
                        <TouchableOpacity
                            onPress={() => setIsDetailVisible(false)}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }} >
                            <Icon name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        //data={detailData}
                        data={designDataLevel1}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={
                            //({ item }: any) => (
                            ({ item, index }: any) => (
                                <TouchableOpacity
                                    onPress={
                                        () => {
                                            setSelectedDesign(item);
                                            //setIsShadeVisible(true);
                                            setIsSubDesignDetailVisible(true)
                                        }
                                    }
                                    style={{
                                        backgroundColor: index === 0 ? '#CCE9EF' : '#FFF', marginBottom: 10, borderRadius: 12, padding: 15, flexDirection: 'row',
                                        justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1,
                                        shadowRadius: 4, elevation: 3
                                    }}>
                                    <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}> {item.MDSNNAME} </Text>
                                    {/* <View
                                        style={{
                                            backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center',
                                            alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10
                                        }} >
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Number(item.TOTQTY || 0).toFixed(3)}</Text>
                                    </View> */}
                                    <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                        {Number(item.TOTQTY || 0).toFixed(3)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                    />
                    <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, backgroundColor: theme.BRAND_GRADIENT_END,
                        justifyContent: 'center', paddingHorizontal: 15, borderTopLeftRadius: 10, borderTopRightRadius: 10, elevation: 10
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}> Total</Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {
                                    designDataLevel1 && designDataLevel1.length > 0 ? (designDataLevel1[0].TOTQTY).toFixed(3) : 0
                                    //(designDataLevel1 as any[]).reduce((sum, i) => sum + Number(i.TOTQTY || 0), 0).toFixed(3)
                                }
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/*sub design*/}
            <Modal visible={isSubDesignDetailVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                    <View style={{
                        backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> M. design:    {selectedDesign?.MDSNNAME} </Text>
                        <TouchableOpacity onPress={() => setIsSubDesignDetailVisible(false)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }}>
                            <Icon name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={subDesignDataLevel2}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={

                            //({ item }: any) => (
                            ({ item, index }: any) => (
                                <TouchableOpacity
                                    onPress={
                                        () => {
                                            setSelectedSubDesign(item);
                                            setIsShadeVisible(true);
                                        }
                                    }
                                    style={{
                                        backgroundColor: index === 0 ? '#CCE9EF' : '#FFF', marginBottom: 10, borderRadius: 12, padding: 15,
                                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000',
                                        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
                                    }}>
                                    <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}> {item.SDSNNAME} </Text>
                                    {/* <View
                                        style={{ backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10 }} >
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}> {Number(item.TOTQTY || 0).toFixed(3)} </Text>
                                    </View> */}
                                    <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                        {Number(item.TOTQTY || 0).toFixed(3)}
                                    </Text>
                                </TouchableOpacity>
                            )
                        }
                    />
                    <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, backgroundColor: theme.BRAND_GRADIENT_END,
                        justifyContent: 'center', paddingHorizontal: 15, borderTopLeftRadius: 10, borderTopRightRadius: 10, elevation: 10
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}> Total </Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {
                                    subDesignDataLevel2 && subDesignDataLevel2.length > 0 ? (subDesignDataLevel2[0].TOTQTY).toFixed(3) : 0
                                }
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/** shade */}
            <Modal visible={isShadeVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                    <View style={{
                        backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> S. design:   {selectedSubDesign?.SDSNNAME} </Text>
                        <TouchableOpacity onPress={() => setIsShadeVisible(false)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }}>
                            <Icon name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={shadeData}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={
                            //({ item }: any) => (
                            ({ item, index }: any) => (
                                <View
                                    style={{
                                        backgroundColor: index === 0 ? '#CCE9EF' : '#FFF', marginBottom: 10, borderRadius: 12, padding: 15,
                                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000',
                                        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
                                    }} >
                                    <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}> {item.SHDNAME} </Text>
                                    {/* <View
                                        style={{ backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10 }} >
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}> {Number(item.TOTQTY || 0).toFixed(3)} </Text>
                                    </View> */}
                                    <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                        {Number(item.TOTQTY || 0).toFixed(3)}
                                    </Text>
                                </View>
                            )
                        }
                    />
                    <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, backgroundColor: theme.BRAND_GRADIENT_END,
                        justifyContent: 'center', paddingHorizontal: 15, borderTopLeftRadius: 10, borderTopRightRadius: 10, elevation: 10
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}> Total </Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {
                                    shadeData && shadeData.length > 0 ? (shadeData[0].TOTQTY).toFixed(3) : 0
                                }
                                {/* {
                                    (shadeData as any[]).reduce((sum, i) => sum + Number(i.TOTQTY || 0), 0).toFixed(3)
                                } */}
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
        position: 'absolute', top: 85, right: 20, zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 3, padding: 4
    },
});

export default React.memo(PurchaseOrderTracking);
