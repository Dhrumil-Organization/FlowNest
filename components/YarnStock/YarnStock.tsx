import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, TextInput } from 'react-native';
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

const YarnStock: React.FC<{ token: string, navigation: any; username: string }> = ({ token, navigation, username }) => {
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
    const [selectedPrpCode, setSelectedPrpCode] = useState([]);
    const { width: screenWidth } = useWindowDimensions();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [isShadeVisible, setIsShadeVisible] = useState(false);
    const [isSubDesignDetailVisible, setIsSubDesignDetailVisible] = useState(false);
    const [selectedSubDesign, setSelectedSubDesign] = useState<any>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const toggleSortOrder = () => {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };

    console.log("selectedPrpCode", selectedPrpCode)
    console.log("Hiii", selectedItem)

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

            }).catch(error => { console.log('Hook Property Get Error: ', error) });
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
                String(item?.MITMNAME || '').toLowerCase().includes(lowercasedQuery) ||
                String(item?.ITMNAME || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.QTY || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.SHDNAME || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.MERNAME || '').toLowerCase().includes(lowercasedQuery)
                || String(item?.GRDName || '').toLowerCase().includes(lowercasedQuery)
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
        const payload = {
            prpcodes: selectedPrpCode.map(item => item.PrpCode),
            prptype: "S",
            txntype: "mob_yarn_stock"
        };
        setPayload(payload as any);
        console.log("payload", payload)
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.get(`${API}/api/appyarninstockdata`, {
                params: payload,
                headers: headers
            });
            console.log("response", response)
            const responseData = response?.data?.response?.data || [];
            if (response.data.success === true) {
                if (responseData.length > 0) {
                    const itemSummary = getmainitemwisesummary(responseData);
                    setRenderedData(itemSummary);
                    setsalesdata(responseData);
                }
            }
            else {
                Alert.alert(`${response.data.message}`);
                setRenderedData([]);
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

    // const getmainitemwisesummary = (data) => {
    //     const summary = data.reduce((acc, item) => {
    //         const key = item.MITMCODE;
    //         if (!acc[key]) {
    //             acc[key] = {
    //                 MITMCODE: item.MITMCODE,
    //                 MITMNAME: item.MITMNAME,
    //                 TOTQTY: 0
    //             };
    //         }
    //         const qty = parseFloat(item?.QTY ?? 0) || 0;
    //         acc[key].TOTQTY += qty;
    //         return acc;
    //     }, {});
    //     return Object.values(summary);
    // };

    const getmainitemwisesummary = (data, order = 'asc') => {
        const summary = data.reduce((acc, item) => {
            const key = item.MITMCODE;

            if (!acc[key]) {
                acc[key] = {
                    MITMCODE: item.MITMCODE,
                    MITMNAME: item.MITMNAME,
                    TOTQTY: 0
                };
            }

            const qty = parseFloat(item?.QTY ?? 0) || 0;
            acc[key].TOTQTY += qty;

            return acc;
        }, {});

        let result = Object.values(summary);

        // 🔽 NAME se sorting
        result.sort((a, b) =>
            order === 'asc'
                ? a.MITMNAME.localeCompare(b.MITMNAME)
                : b.MITMNAME.localeCompare(a.MITMNAME)
        );

        return result;
    };

    // const getSubItemSummary = (mainItm = {}, data = []) => {
    //     const filtered = data.filter(
    //         item => item.MITMCODE === mainItm?.MITMCODE
    //     );

    //     const summary = filtered.reduce((acc, item) => {
    //         const key = item.ITMCODE;

    //         if (!acc[key]) {
    //             acc[key] = {
    //                 ITMCODE: item.ITMCODE,
    //                 ITMNAME: item.ITMNAME,
    //                 TOTQTY: 0
    //             };
    //         }

    //         const qty = parseFloat(item?.QTY ?? 0) || 0;
    //         acc[key].TOTQTY += qty;

    //         return acc;
    //     }, {});

    //     const result = Object.values(summary);

    //     const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

    //     const allItem = {
    //         ITMCODE: 'ALL',
    //         ITMNAME: 'ALL [ ITEMS ]',
    //         TOTQTY: total
    //     };

    //     return [allItem, ...result];
    // };


    const getSubItemSummary = (mainItm = {}, data = [], order = 'asc') => {
        // const filtered = data.filter(
        //     item => item.MITMCODE === mainItm?.MITMCODE
        // );

        const filtered = data.filter(
            item =>
                mainItm?.MITMCODE === 'ALL'
                    ? true
                    : item.MITMCODE === mainItm?.MITMCODE
        );

        const summary = filtered.reduce((acc, item) => {
            const key = item.ITMCODE;

            if (!acc[key]) {
                acc[key] = {
                    ITMCODE: item.ITMCODE,
                    ITMNAME: item.ITMNAME,
                    TOTQTY: 0
                };
            }

            const qty = parseFloat(item?.QTY ?? 0) || 0;
            acc[key].TOTQTY += qty;

            return acc;
        }, {});

        let result = Object.values(summary);

        // 🔽 NAME se sorting (A-Z / Z-A)
        result.sort((a, b) =>
            order === 'asc'
                ? a.ITMNAME.localeCompare(b.ITMNAME)
                : b.ITMNAME.localeCompare(a.ITMNAME)
        );

        const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

        const allItem = {
            ITMCODE: 'ALL',
            ITMNAME: 'ALL [ ITEMS ]',
            TOTQTY: total
        };

        return [allItem, ...result];
    };

    // const subItemData = useMemo(() => {
    //     if (!selectedItem) return [];

    //     return getSubItemSummary(selectedItem, salesdata);
    // }, [selectedItem, salesdata]);

    const subItemData = useMemo(() => {

        if (!selectedItem) return [];

        let data: any[] = getSubItemSummary(selectedItem, salesdata);

        // SEARCH FILTER
        if (searchQueryPOT.trim()) {

            const search = searchQueryPOT.toLowerCase();

            data = data.filter((item: any) =>
                String(item?.ITMCODE || '').toLowerCase().includes(search) ||
                String(item?.TOTQTY || '').toLowerCase().includes(search)
            );
        }

        return data;

    }, [selectedItem, salesdata, searchQueryPOT]);


    // const getmergeSummary = (selectedItem = {}, data = []) => {
    //     const filtered = data.filter(item =>
    //         item.MITMCODE === selectedItem?.MITMCODE &&
    //         item.ITMCODE === selectedItem?.ITMCODE
    //     );

    //     const summary = filtered.reduce((acc, item) => {
    //         const key = item.MERCODE;

    //         if (!acc[key]) {
    //             acc[key] = {
    //                 MERCODE: item.MERCODE,
    //                 MERNAME: item.MERNAME,
    //                 TOTQTY: 0
    //             };
    //         }

    //         const qty = parseFloat(item?.QTY ?? 0) || 0;
    //         acc[key].TOTQTY += qty;

    //         return acc;
    //     }, {});

    //     const result = Object.values(summary);

    //     const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

    //     const allItem = {
    //         MERCODE: 'ALL',
    //         MERNAME: 'ALL [ MERGE ]',
    //         TOTQTY: total
    //     };

    //     return [allItem, ...result];
    // };

    const getmergeSummary = (selectedItem = {}, data = [], order = 'asc') => {
        // const filtered = data.filter(item =>
        //     item.MITMCODE === selectedItem?.MITMCODE &&
        //     item.ITMCODE === selectedItem?.ITMCODE
        // );

        const filtered = data.filter(item =>
            (selectedItem?.MITMCODE === 'ALL' || item.MITMCODE === selectedItem?.MITMCODE) &&
            (selectedItem?.ITMCODE === 'ALL' || item.ITMCODE === selectedItem?.ITMCODE)
        );

        const summary = filtered.reduce((acc, item) => {
            const key = item.MERCODE;

            if (!acc[key]) {
                acc[key] = {
                    MERCODE: item.MERCODE,
                    MERNAME: item.MERNAME,
                    TOTQTY: 0
                };
            }

            const qty = parseFloat(item?.QTY ?? 0) || 0;
            acc[key].TOTQTY += qty;

            return acc;
        }, {});

        let result = Object.values(summary);

        // 🔽 NAME se sorting (A-Z / Z-A)
        result.sort((a, b) =>
            order === 'asc'
                ? (a.MERNAME || '').localeCompare(b.MERNAME || '')
                : (b.MERNAME || '').localeCompare(a.MERNAME || '')
        );

        const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

        const allItem = {
            MERCODE: 'ALL',
            MERNAME: 'ALL [ MERGE ]',
            TOTQTY: total
        };

        return [allItem, ...result];
    };

    // const mergeData = useMemo(() => {
    //     if (!selectedDesign || !selectedItem) return [];

    //     return getmergeSummary(
    //         {
    //             MITMCODE: selectedItem.MITMCODE,
    //             ITMCODE: selectedDesign.ITMCODE
    //         },
    //         salesdata
    //     );
    // }, [selectedDesign, selectedItem, salesdata]);

    const mergeData = useMemo(() => {

        if (!selectedDesign || !selectedItem) return [];

        let data: any[] = getmergeSummary(
            {
                MITMCODE: selectedItem.MITMCODE,
                ITMCODE: selectedDesign.ITMCODE
            },
            salesdata
        );

        // SEARCH FILTER
        if (searchQueryPOT.trim()) {

            const search = searchQueryPOT.toLowerCase();

            data = data.filter((item: any) =>
                String(item?.MERNAME || '').toLowerCase().includes(search) ||
                String(item?.TOTQTY || '').toLowerCase().includes(search)
            );
        }

        return data;

    }, [selectedDesign, selectedItem, salesdata, searchQueryPOT]);


    // const getshadeSummary = (selectedMerge = {}, data = []) => {
    //     const filtered = data.filter(item =>
    //         item.MITMCODE === selectedMerge?.MITMCODE &&
    //         item.ITMCODE === selectedMerge?.ITMCODE &&
    //         item.MERCODE === selectedMerge?.MERCODE
    //     );

    //     const summary = filtered.reduce((acc, item) => {
    //         const key = item.SHDCODE;

    //         if (!acc[key]) {
    //             acc[key] = {
    //                 SHDCODE: item.SHDCODE,
    //                 SHDNAME: item.SHDNAME,
    //                 TOTQTY: 0
    //             };
    //         }

    //         const qty = parseFloat(item?.QTY ?? 0) || 0;
    //         acc[key].TOTQTY += qty;

    //         return acc;
    //     }, {});

    //     const result = Object.values(summary);

    //     const total = result.reduce((sum, item) => sum + item.TOTQTY, 0);

    //     const allItem = {
    //         SHDCODE: 'ALL',
    //         SHDNAME: 'ALL [ SHADES ]',
    //         TOTQTY: total
    //     };

    //     return [allItem, ...result];
    // };

    const getshadeSummary = (selectedMerge = {}, data = [], order = 'asc') => {
        // const filtered = data.filter(item =>
        //     item.MITMCODE === selectedMerge?.MITMCODE &&
        //     item.ITMCODE === selectedMerge?.ITMCODE &&
        //     item.MERCODE === selectedMerge?.MERCODE
        // );

        const filtered = data.filter(item =>
            (selectedMerge?.MITMCODE === 'ALL' || item.MITMCODE === selectedMerge?.MITMCODE) &&
            (selectedMerge?.ITMCODE === 'ALL' || item.ITMCODE === selectedMerge?.ITMCODE) &&
            (selectedMerge?.MERCODE === 'ALL' || item.MERCODE === selectedMerge?.MERCODE)
        );

        const summary = filtered.reduce((acc, item) => {
            const key = item.SHDCODE;

            if (!acc[key]) {
                acc[key] = {
                    SHDCODE: item.SHDCODE,
                    SHDNAME: item.SHDNAME,
                    TOTQTY: 0
                };
            }

            const qty = parseFloat(item?.QTY ?? 0) || 0;
            acc[key].TOTQTY += qty;

            return acc;
        }, {});

        let result = Object.values(summary);

        // 🔽 NAME se sorting (A-Z / Z-A)
        result.sort((a, b) =>
            order === 'asc'
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

    // const shadeData = useMemo(() => {
    //     if (!selectedSubDesign || !selectedDesign || !selectedItem) return [];

    //     return getshadeSummary(
    //         {
    //             MITMCODE: selectedItem.MITMCODE,
    //             ITMCODE: selectedDesign.ITMCODE,
    //             MERCODE: selectedSubDesign.MERCODE
    //         },
    //         salesdata
    //     );
    // }, [selectedSubDesign, selectedDesign, selectedItem, salesdata]);

    const shadeData = useMemo(() => {

        if (!selectedSubDesign || !selectedDesign || !selectedItem) return [];

        let data: any[] = getshadeSummary(
            {
                MITMCODE: selectedItem.MITMCODE,
                ITMCODE: selectedDesign.ITMCODE,
                MERCODE: selectedSubDesign.MERCODE
            },
            salesdata
        );

        // SEARCH FILTER
        if (searchQueryPOT.trim()) {

            const search = searchQueryPOT.toLowerCase();

            data = data.filter((item: any) =>
                String(item?.SHDNAME || '').toLowerCase().includes(search) ||
                String(item?.TOTQTY || '').toLowerCase().includes(search)
            );
        }

        return data;

    }, [selectedSubDesign, selectedDesign, selectedItem, salesdata, searchQueryPOT]);


    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const addAllCard = (data) => {

        if (!data || data.length === 0) return [];

        const total = data.reduce((sum, item) => {

            return sum + Number(item.TOTQTY || 0);

        }, 0);

        const allItem = { MITMCODE: 'ALL', MITMNAME: 'ALL [ MAIN ITEMS ]', TOTQTY: total };


        return [allItem, ...data];
    };

    // const displayData = useMemo(() => {
    //     return addAllCard(renderedData);
    // }, [renderedData]);

    // const displayData = useMemo(() => {

    //     let baseData: any[] = addAllCard(renderedData);

    //     // SEARCH FILTER
    //     if (searchQueryPOT.trim()) {

    //         const search = searchQueryPOT.toLowerCase();

    //         baseData = baseData.filter((item: any) =>
    //             String(item?.MITMNAME || '').toLowerCase().includes(search) ||
    //             String(item?.TOTQTY || '').toLowerCase().includes(search)
    //         );
    //     }

    //     return baseData;

    // }, [renderedData, searchQueryPOT]);

    const displayData = useMemo(() => {

        let baseData: any[] = addAllCard(renderedData);

        // SEARCH FILTER
        if (searchQueryPOT.trim()) {

            const search = searchQueryPOT.toLowerCase();

            baseData = baseData.filter((item: any) =>
                String(item?.MITMNAME || '').toLowerCase().includes(search) ||
                String(item?.TOTQTY || '').toLowerCase().includes(search)
            );
        }

        // SORTING
        baseData.sort((a: any, b: any) => {

            // ALL item top pe
            if (a.MITMCODE === 'ALL') return -1;
            if (b.MITMCODE === 'ALL') return 1;

            return sortOrder === 'asc'
                ? Number(a.TOTQTY || 0) - Number(b.TOTQTY || 0)
                : Number(b.TOTQTY || 0) - Number(a.TOTQTY || 0);
        });

        return [...baseData];

    }, [renderedData, searchQueryPOT, sortOrder]);

    // const totalQty = useMemo(() => {
    //     return renderedData
    //         .reduce((sum, item) => sum + Number(item.TOTQTY || 0), 0)
    //         .toFixed(3);
    // }, [renderedData]);

    const totalQty = useMemo(() => {

        let data: any[] = renderedData;

        // SEARCH FILTER
        if (searchQueryPOT.trim()) {

            const search = searchQueryPOT.toLowerCase();

            data = data.filter((item: any) =>
                String(item?.MITMNAME || '').toLowerCase().includes(search) ||
                String(item?.TOTQTY || '').toLowerCase().includes(search)
            );
        }

        return data
            .reduce((sum, item) => sum + Number(item.TOTQTY || 0), 0)
            .toFixed(3);

    }, [renderedData, searchQueryPOT]);

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

            {!selectedPrpCode || selectedPrpCode.length === 0 ? (
                <View style={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    paddingTop: 20
                }}>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: 'red'
                    }}>
                        No Property Selected
                    </Text>
                </View>
            ) : (
                <>
                    <View style={{ flex: 1 }}>
                        <TouchableOpacity
                            onPress={toggleSortOrder}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                alignSelf: 'flex-end',
                                backgroundColor: '#F2F4F7',
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                marginHorizontal: 10,
                                marginTop: 10,
                                marginBottom: 5,
                                elevation: 2,
                            }}
                        >
                            <Icon
                                name={
                                    sortOrder === 'asc'
                                        ? 'arrow-upward'
                                        : 'arrow-downward'
                                }
                                size={16}
                                color="#000"
                            />

                            <Text
                                style={{
                                    fontSize: 13,
                                    color: '#000',
                                    marginLeft: 6,
                                    fontWeight: '600',
                                }}
                            >
                                {/* {sortOrder === 'asc'
                                    ? 'Low → High'
                                    : 'High → Low'} */}
                                Sort by Amount
                            </Text>
                        </TouchableOpacity>
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
                                            {item.MITMNAME}
                                        </Text>
                                        {/* <View style={{
                                            backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center',
                                            alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10
                                        }}>
                                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Number(item.TOTQTY || 0).toFixed(3)}</Text>
                                        </View> */}

                                        <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                            {/* {Number(item.TOTQTY || 0).toFixed(3)} */}
                                            {Number(item.TOTQTY || 0).toLocaleString('en-IN', {
                                                minimumFractionDigits: 3,
                                                maximumFractionDigits: 3,
                                            })}
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
                                    {/* {Number(totalQty || 0).toFixed(3)} */}
                                    {Number(totalQty || 0).toLocaleString('en-IN', {
                                        minimumFractionDigits: 3,
                                        maximumFractionDigits: 3,
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Modal visible={isDetailVisible} animationType="slide">
                        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                            <View style={{
                                backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> Main Item:    {selectedItem?.MITMNAME} </Text>
                                <TouchableOpacity
                                    onPress={() => setIsDetailVisible(false)}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }} >
                                    <Icon name="close" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#fff',
                                    marginHorizontal: 12,
                                    marginTop: 12,
                                    marginBottom: 5,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    height: 48,
                                }}
                            >
                                <Icon name="search" size={22} color="#666" />

                                <TextInput
                                    placeholder="Search stock..."
                                    value={searchQueryPOT}
                                    onChangeText={setSearchQueryPOT}
                                    placeholderTextColor="#999"
                                    style={{
                                        flex: 1,
                                        marginLeft: 10,
                                        color: '#000',
                                        fontSize: 15,
                                        paddingVertical: 0,
                                    }}
                                />
                            </View>
                            <FlatList
                                //data={detailData}
                                data={subItemData}
                                keyExtractor={(_, index) => index.toString()}
                                contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={
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
                                            <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}> {item.ITMNAME} </Text>
                                            {/* <View
                                                style={{
                                                    backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center',
                                                    alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10
                                                }} >
                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Number(item.TOTQTY || 0).toFixed(3)}</Text>
                                            </View> */}
                                            {/* <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                                {Number(item.TOTQTY || 0).toFixed(3)}
                                            </Text> */}
                                            <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                                {/* {Number(item.TOTQTY || 0).toFixed(3)} */}
                                                {Number(item.TOTQTY || 0).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                })}
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
                                        {/* {
                                            subItemData && subItemData.length > 0 ? (subItemData[0].TOTQTY).toFixed(3) : 0
                                        } */}
                                        {
                                            subItemData && subItemData.length > 0
                                                ? Number(subItemData[0].TOTQTY)
                                                    .toLocaleString('en-IN', {
                                                        minimumFractionDigits: 3,
                                                        maximumFractionDigits: 3,
                                                    })
                                                : '0.000'
                                        }

                                        {/* subItemData.reduce((sum, i) => sum + Number(i.TOTQTY || 0), 0) */}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isSubDesignDetailVisible} animationType="slide">
                        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                            <View style={{
                                backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> Item:  {selectedDesign?.ITMNAME} </Text>
                                <TouchableOpacity onPress={() => setIsSubDesignDetailVisible(false)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }}>
                                    <Icon name="close" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#fff',
                                    marginHorizontal: 12,
                                    marginTop: 12,
                                    marginBottom: 5,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    height: 48,
                                }}
                            >
                                <Icon name="search" size={22} color="#666" />

                                <TextInput
                                    placeholder="Search stock..."
                                    value={searchQueryPOT}
                                    onChangeText={setSearchQueryPOT}
                                    placeholderTextColor="#999"
                                    style={{
                                        flex: 1,
                                        marginLeft: 10,
                                        color: '#000',
                                        fontSize: 15,
                                        paddingVertical: 0,
                                    }}
                                />
                            </View>
                            <FlatList
                                data={mergeData}
                                keyExtractor={(_, index) => index.toString()}
                                contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={
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
                                            <Text numberOfLines={2} style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1 }}> {item.MERNAME} </Text>
                                            {/* <View
                                                style={{ backgroundColor: theme.BRAND_GRADIENT_END, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 6, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10 }} >
                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}> {Number(item.TOTQTY || 0).toFixed(3)} </Text>
                                            </View> */}
                                            <Text style={{ color: '#333', fontSize: 14, fontWeight: '600', flex: 1, alignItems: 'flex-end', textAlign: 'right' }}>
                                                {/* {Number(item.TOTQTY || 0).toFixed(3)}
                                                 */}
                                                {Number(item.TOTQTY || 0).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                })}
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
                                        {/* {
                                            mergeData && mergeData.length > 0 ? (mergeData[0].TOTQTY).toFixed(3) : 0
                                        } */}
                                        {
                                            mergeData && mergeData.length > 0
                                                ? Number(mergeData[0].TOTQTY || 0).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                })
                                                : '0.000'
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isShadeVisible} animationType="slide">
                        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                            <View style={{
                                backgroundColor: theme.BRAND_GRADIENT_END, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 }}> Merge:   {selectedSubDesign?.MERNAME} </Text>
                                <TouchableOpacity onPress={() => setIsShadeVisible(false)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6 }}>
                                    <Icon name="close" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#fff',
                                    marginHorizontal: 12,
                                    marginTop: 12,
                                    marginBottom: 5,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    height: 48,
                                }}
                            >
                                <Icon name="search" size={22} color="#666" />

                                <TextInput
                                    placeholder="Search stock..."
                                    value={searchQueryPOT}
                                    onChangeText={setSearchQueryPOT}
                                    placeholderTextColor="#999"
                                    style={{
                                        flex: 1,
                                        marginLeft: 10,
                                        color: '#000',
                                        fontSize: 15,
                                        paddingVertical: 0,
                                    }}
                                />
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
                                                {/* {Number(item.TOTQTY || 0).toFixed(3)} */}
                                                {Number(item.TOTQTY || 0).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                })}
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
                                        {/* {
                                            shadeData && shadeData.length > 0 ? (shadeData[0].TOTQTY).toFixed(3) : 0
                                        } */}
                                        {
                                            shadeData && shadeData.length > 0
                                                ? Number(shadeData[0].TOTQTY || 0).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                })
                                                : '0.000'
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
            )}

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

export default React.memo(YarnStock);
