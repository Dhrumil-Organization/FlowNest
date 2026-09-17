import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated, Dimensions,
    FlatList,
    Keyboard,
    Modal,
    SafeAreaView,
    ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { API } from '../../common/API/dynamicAPI';

const { width } = Dimensions.get('window');

const screenWidth = Dimensions.get('window').width;

const isTablet = width >= 768;

const ShimmerBox = ({ width, height, radius = 12, }: any) => {

    const translateX = useRef(new Animated.Value(-250)).current;

    useEffect(() => {
        Animated.loop(Animated.timing(translateX,
            {
                toValue: 350,
                duration: 1400,
                useNativeDriver: true,
            }
        )).start();
    }, []);

    return (
        <View style={{ width, height, borderRadius: radius, backgroundColor: '#ECEFF3', overflow: 'hidden', }}>
            <Animated.View style={{ position: 'absolute', width: 120, height: '100%', backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ translateX }], }} />
        </View>
    );
};

const TableSkeleton = ({ dateCount = 4, }: { dateCount?: number; }) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} >
            <View>
                {[1, 2, 3, 4, 5, 6].map((row) => (
                    <View key={row} style={{ flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', }} >
                        <View style={{ width: isTablet ? 280 : 170, paddingHorizontal: 15, }} >
                            <ShimmerBox width={'65%'} height={20} />
                            <View style={{ height: 8 }} />
                            <ShimmerBox width={'35%'} height={12} />
                        </View>

                        {Array.from({ length: dateCount, }).map((_, idx) => (
                            <View key={idx} style={{ width: isTablet ? 110 : 95, alignItems: 'center', justifyContent: 'center', }} >
                                <ShimmerBox width={isTablet ? 90 : 72} height={44} radius={14} />
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const PriceList = ({ token, username, navigation }: any) => {
    const router = useRouter();
    const [search, setSearch] = useState('');

    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December',
    ];

    const currentMonth = new Date().getMonth();
    const [YarnlistData, setYarnListData] = useState<any[]>([]);
    const [Yarnloading, setYarnLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [tempMonth, setTempMonth] = useState(selectedMonth);
    const [tempYear, setTempYear] = useState(currentYear);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [editingCell, setEditingCell] = useState<any>(null);
    const [editingValue, setEditingValue] = useState('');
    const monthNo = String(selectedMonth + 1).padStart(2, '0');
    const searchRef = useRef<TextInput>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoMessage, setInfoMessage] = useState('');
    const [selectedItemName, setSelectedItemName] = useState('');
    const dateColumns = useMemo(() => {

        const uniqueDates = [
            ...new Set(
                YarnlistData.map((x: any) => x.PLDate)
            )
        ];

        return uniqueDates.map((date: string) => {
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            return {
                rawDate: date,
                day,
                month: MONTHS[Number(month) - 1].substring(0, 3),
                year,
            };
        });

    }, [YarnlistData]);

    const clearSearch = () => {
        searchRef.current?.clear();
        searchRef.current?.blur();
        Keyboard.dismiss();
        setTimeout(() => {
            setSearch('');
        }, 0);

    };

    const handleAddNewRateDate = () => {
        // navigation.navigate("Poy Rate Entry", {
        //     refreshPriceList: true,
        // });
        // router.push({
        //     pathname: '/PoyRateEntry',
        //     // params: {
        //     //     refreshPriceList: true
        //     // }
        // })
        router.push('/PoyRateEntry');
    };

    const YarnRateListData = async (month: string) => {

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = await AsyncStorage.getItem('yno');

        try {
            setYarnLoading(true);

            const payload = {
                prptype: userPtype,
                prpcode: 'MTX',
                yearno: yno,
                strcode: '002',
                txntype: 'mob_price_list',
                month: month,
            }

            console.log("YarnRateListData payload => ", payload);

            const response = await axios.get(`${API}/api/get_price_list`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });

            const result = response?.data?.data || [];

            console.log("YarnRateListData res => ", response);
            console.log("YarnRateListData result => ", result);
            console.log("YarnRateListData result[0] => ", result[0]);

            setYarnListData(result);
        } catch (error) {
            console.log(error);
        } finally {
            setYarnLoading(false);
        }
    }

    useEffect(() => {
        const currentMonthNo = String(currentMonth + 1).padStart(2, '0');
        YarnRateListData(currentMonthNo);

    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const currentMonthNo = String(selectedMonth + 1).padStart(2, '0');

            YarnRateListData(currentMonthNo);

        }, [selectedMonth])
    );

    const filtered = useMemo(() => {

        const txt = search.trim().toLowerCase();

        if (!txt) {
            return YarnlistData;
        }

        return YarnlistData.filter((x: any) => {
            const searchString = `
            ${x.ItmName || ''}
            ${x.ItmCode || ''}
            ${x.PLRate || ''}
            ${x.PLDate || ''}
        `.toLowerCase();

            return searchString.includes(txt);
        });

    }, [search, YarnlistData]);

    const uniqueItems = useMemo(() => {

        const map = new Map();

        filtered.forEach((item: any) => {

            if (!map.has(item.ItmCode)) {

                map.set(item.ItmCode, {
                    ItmCode: item.ItmCode,
                    ItmName: item.ItmName,
                    Status: item.Status,
                });
            }

        });

        return Array.from(map.values());

    }, [filtered]);

    const rateMap = useMemo(() => {
        const map: any = {};
        YarnlistData.forEach((item: any) => {
            map[`${item.ItmCode}_${item.PLDate}`] = item;
        });
        return map;
    }, [YarnlistData]);

    const getRateStyle = (itemCode: string, currentDate: string) => {

        const currentRate = Number(
            rateMap[`${itemCode}_${currentDate}`]?.PLRate || 0
        );

        if (currentRate === 0) {
            return styles.missing;
        }

        const rates = dateColumns
            .map(col => Number(rateMap[`${itemCode}_${col.rawDate}`]?.PLRate || 0))
            .filter(rate => rate > 0);

        if (rates.length <= 1) {
            return styles.normal;
        }

        // Duplicate count
        const duplicateCount = rates.filter(r => r === currentRate).length;

        if (duplicateCount > 1) {
            return styles.same;
        }

        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);

        if (currentRate === minRate) {
            return styles.lower;
        }

        if (currentRate === maxRate) {
            return styles.higher;
        }

        return styles.normal;
    };

    const handleInlineSave = async (itemCode: string, date: string, value: string) => {

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = await AsyncStorage.getItem('yno');

        try {

            const payload = {
                prptype: userPtype,
                prpcode: 'MTX',
                yearno: yno,
                itmcode: itemCode,
                date: date,
                rate: value,
                txntype: 'mob_price_list',
            };

            console.log('handleInlineSave Rate Update Payload', payload);

            const response = await axios.post(`${API}/api/save_price_list`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            console.log("handleInlineSave Rate Update response => ", response)

            setYarnListData(prev =>
                prev.map(item => {

                    if (item.ItmCode === itemCode && item.PLDate === date) {
                        return { ...item, PLRate: value, };
                    }
                    return item;
                })
            );

        } catch (e) {

            console.log(e);

        } finally {

            setEditingCell(null);

        }

    };

     const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <TouchableOpacity activeOpacity={0.8} onPress={goBack} style={styles.backBtn}>
                    <Icon name="arrow-back" size={28} color="#168A35" />
                </TouchableOpacity>

                <Text style={styles.screenTitle}>
                    Price List
                </Text>

                <TouchableOpacity activeOpacity={0.8} style={styles.dateCard} onPress={() => setShowMonthPicker(true)} >
                    <Icon name="calendar-month" size={22} color="#2D9444" />

                    <Text style={styles.dateCardText}>
                        {MONTHS[selectedMonth].substring(0, 3)}
                    </Text>

                    <Icon name="keyboard-arrow-down" size={22} color="#2D9444" />
                </TouchableOpacity>

            </View>

            <View style={styles.searchBox}>
                <Icon name="search" size={20} color="#000" />

                <TextInput
                    ref={searchRef}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search an Item..."
                    placeholderTextColor="#000"
                    style={styles.input}
                    returnKeyType="search"
                />

                {search.length > 0 && (
                    <TouchableOpacity onPress={clearSearch}>
                        <Icon name="close" size={22} color="#000" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#b7ffc9' }]} />
                    <Text style={styles.legendText}>Higher</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ffd9ae' }]} />
                    <Text style={styles.legendText}>Lower</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ffd2d2' }]} />
                    <Text style={styles.legendText}>Missing</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#dfd4fc' }]} />
                    <Text style={styles.legendText}>Same</Text>
                </View>
            </View>

            {Yarnloading ? (
                <>
                    <View style={styles.headerRow}>
                        <View style={styles.itemColumn}>
                            <Text style={styles.headerText}>
                                Items
                            </Text>
                        </View>

                        {dateColumns.map((d: any, i: number) => (
                            <View key={i} style={styles.dateColumn}>
                                <Text style={styles.dateHeaderText}>
                                    {d.day} {d.month}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <TableSkeleton
                        dateCount={dateColumns.length || 4}
                    />
                </>
            ) : (
                <ScrollView horizontal contentContainerStyle={{ minWidth: screenWidth, }} showsHorizontalScrollIndicator={false} >
                    <View>
                        <View
                            style={[
                                styles.headerRow,
                                isTablet && {
                                    minWidth: width - 40,
                                },
                            ]}
                        >
                            <View style={styles.itemColumn}>
                                <Text style={styles.headerText}>
                                    Items
                                </Text>
                            </View>

                            {dateColumns.map((d: any, i: number) => (
                                <View
                                    key={i}
                                    style={styles.dateColumn}
                                >
                                    <Text
                                        style={styles.dateHeaderText}
                                    >
                                        {d.day} {d.month}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <FlatList
                            data={uniqueItems}
                            keyExtractor={(item, index) =>
                                `${item.ItmCode}_${index}`
                            }
                            removeClippedSubviews
                            initialNumToRender={15}
                            maxToRenderPerBatch={15}
                            windowSize={10}
                            showsVerticalScrollIndicator={false}
                            style={{
                                height: '100%',
                            }}
                            renderItem={({ item, index }) => (

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        if (item.Status === "0") {
                                            setSelectedItemName(item.ItmName);

                                            setInfoMessage(
                                                'One or more recipe items are not mapped in the POY Rate Item List.'
                                            );
                                            setShowInfoModal(true);
                                        }
                                    }}
                                    style={[
                                        styles.rowCard,
                                        item.Status === "0" && styles.highlightRow,
                                    ]}
                                >
                                    <View style={styles.itemColumn}>

                                        <Text style={styles.itemTitle}>
                                            {item.ItmName}
                                        </Text>

                                        <Text style={styles.itemSub}>
                                            {item.ItmCode}
                                        </Text>

                                    </View>

                                    {dateColumns.map((col: any, idx: number) => {

                                        const rowData = rateMap[`${item.ItmCode}_${col.rawDate}`];

                                        return (
                                            <View key={idx} style={styles.dateColumn}>
                                                <View
                                                    style={[
                                                        styles.rateBadge,
                                                        getRateStyle(
                                                            item.ItmCode,
                                                            col.rawDate
                                                        ),
                                                    ]}
                                                >
                                                    {
                                                        editingCell ===
                                                            `${item.ItmCode}_${col.rawDate}` ? (

                                                            <TextInput
                                                                autoFocus
                                                                keyboardType="numeric"
                                                                value={editingValue}
                                                                onChangeText={setEditingValue}

                                                                onBlur={() => {
                                                                    handleInlineSave(
                                                                        item.ItmCode,
                                                                        col.rawDate,
                                                                        editingValue
                                                                    );
                                                                }}

                                                                onSubmitEditing={() => {
                                                                    handleInlineSave(
                                                                        item.ItmCode,
                                                                        col.rawDate,
                                                                        editingValue
                                                                    );
                                                                }}

                                                                style={{
                                                                    width: '100%',
                                                                    textAlign: 'center',
                                                                    fontSize: 16,
                                                                    fontWeight: '700',
                                                                    color: '#000',
                                                                }}
                                                            />

                                                        ) : (

                                                            <TouchableOpacity
                                                                activeOpacity={0.7}
                                                                onPress={() => {

                                                                    setEditingCell(
                                                                        `${item.ItmCode}_${col.rawDate}`
                                                                    );

                                                                    // setEditingValue(
                                                                    //     rowData?.PLRate || ''
                                                                    // );

                                                                    setEditingValue(
                                                                        Number(rowData?.PLRate || 0) === 0
                                                                            ? ''
                                                                            : String(rowData?.PLRate)
                                                                    );

                                                                }}
                                                            >

                                                                {/* <Text style={styles.rateText}>
                                                                    ₹ {rowData?.PLRate || '0.00'}
                                                                </Text> */}

                                                                <Text style={styles.rateText}>
                                                                    ₹ {Number(rowData?.PLRate || 0) > 0 ? rowData?.PLRate : '0'}
                                                                </Text>

                                                            </TouchableOpacity>

                                                        )}
                                                </View>
                                            </View>
                                        );
                                    }
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </ScrollView>
            )}

            <TouchableOpacity style={styles.addBtn} onPress={handleAddNewRateDate} >
                <Icon name="event" size={20} color="#1F8A45" />

                <Text style={styles.addBtnText}>
                    Add new rate date
                </Text>
            </TouchableOpacity>

            <Modal visible={showMonthPicker} transparent animationType="fade" >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20, }}>
                    <View style={styles.periodCard}>
                        <Text style={styles.periodTitle}>
                            Select Month
                        </Text>

                        <View style={styles.monthContainer}>
                            {MONTHS.map((month, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.monthButton,
                                        tempMonth === index &&
                                        styles.monthButtonActive,
                                    ]}
                                    onPress={() => setTempMonth(index)}
                                >
                                    <Text
                                        style={[
                                            styles.monthButtonText,
                                            tempMonth === index &&
                                            styles.monthButtonTextActive,
                                        ]}
                                    >
                                        {month.substring(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.footerRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMonthPicker(false)} >
                                <Text style={styles.cancelText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => {
                                    const selectedMonthNo = String(tempMonth + 1).padStart(2, '0');
                                    setSelectedMonth(tempMonth);
                                    setSelectedYear(tempYear);
                                    setShowMonthPicker(false);
                                    YarnRateListData(selectedMonthNo);
                                }}
                            >
                                <Text style={styles.applyText}>
                                    Apply
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showInfoModal}
                transparent
                animationType="fade"
            >
                <View style={styles.infoOverlay}>
                    <View style={styles.infoCard}>

                        <View style={styles.infoIconWrap}>
                            <Icon
                                name="info-outline"
                                size={24}
                                color="#2563EB"
                            />
                        </View>

                        {/* <Text style={styles.infoTitle}>
                            Information
                        </Text> */}

                        <Text style={styles.infoTitle}>
                            {selectedItemName}
                        </Text>

                        <Text style={styles.infoDesc}>
                            {infoMessage}
                        </Text>

                        <TouchableOpacity
                            style={styles.infoBtn}
                            onPress={() => setShowInfoModal(false)}
                        >
                            <Text style={styles.infoBtnText}>
                                OK
                            </Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default PriceList;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA', padding: 15 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 4,
    },
    screenTitle: {
        flex: 1,
        marginLeft: 18,
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    dateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#F3FBF5',
        borderWidth: 1,
        borderColor: '#D9EEDC',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateCardText: {
        marginLeft: 8,
        color: '#2D9444',
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#111827',
        fontSize: 18,
        fontWeight: '900',
    },
    datePill: {
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: '#F3FBF5',
        borderWidth: 1,
        borderColor: '#CFE8D5',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        marginLeft: 6,
        color: '#168A35',
        fontSize: 12,
        fontWeight: '900',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    monthBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    monthText: {
        marginLeft: 5,
        color: '#00695C',
        fontWeight: '700',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: isTablet ? 20 : 10,
        minHeight: isTablet ? 60 : 50,
        marginBottom: 15,
    },
    input: { flex: 1, height: 45 },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#00695C',
    },
    headCell: {
        width: 100,
        color: '#fff',
        fontWeight: '800',
        padding: 12,
    },
    row: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    itemName: {
        padding: 12,
        fontWeight: '700',
        lineHeight: 20,
    },
    rateCell: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rate: {
        fontWeight: '800',
        color: '#00695C',
    },
    addText: {
        color: '#fff',
        fontWeight: '800',
        marginLeft: 8,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 20,
        marginRight: 5,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    rowCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#ECECEC',
    },
    itemColumn: {
        width: isTablet ? screenWidth * 0.35 : screenWidth * 0.38,
        padding: isTablet ? 20 : 12,
    },
    dateColumn: {
        width: isTablet ? screenWidth * 0.14 : screenWidth * 0.22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        fontSize: isTablet ? 22 : 14,
        fontWeight: '700',
        color: '#000',
    },
    dateHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    dayText: {
        fontSize: 22,
        fontWeight: '700',
    },
    monthHeaderText: {
        color: '#777',
    },
    itemTitle: {
        fontSize: isTablet ? 22 : 16,
        fontWeight: '700',
        color: '#111',
        lineHeight: 20,
        paddingRight: 6,
    },
    itemSub: {
        marginTop: 5,
        color: '#000',
        fontSize: 14,
    },
    rateBadge: {
        minWidth: isTablet ? screenWidth * 0.12 : screenWidth * 0.16,
        height: isTablet ? 52 : 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    higher: {
        backgroundColor: '#b7ffc9',
    },
    lower: {
        backgroundColor: '#ffd9ae',
    },
    missing: {
        backgroundColor: '#ffd2d2',
    },
    same: {
        backgroundColor: '#dfd4fc',
    },
    rateText: {
        fontWeight: '700',
        fontSize: isTablet ? 18 : 14,
        color: '#000',
    },
    addBtn: {
        height: 40,
        borderWidth: 1.5,
        borderColor: '#1F8A45',
        borderRadius: 18,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    addBtnText: {
        color: '#1F8A45',
        fontWeight: '700',
        fontSize: 18,
        marginLeft: 10,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthChip: {
        width: '30%',
        height: 50,
        borderRadius: 14,
        backgroundColor: '#F5F7FA',
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthChipSelected: {
        backgroundColor: '#168A35',
    },
    monthChipText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    monthChipTextSelected: {
        color: '#FFF',
    },
    periodCard: {
        width: isTablet ? '65%' : '100%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
    },
    periodTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 20,
    },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
    },
    yearText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginHorizontal: 20,
    },
    monthContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: '30%',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    monthButtonActive: {
        backgroundColor: '#168A35',
    },
    monthButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
    monthButtonTextActive: {
        color: '#FFF',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    applyBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#168A35',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    cancelText: {
        fontWeight: '700',
        color: '#374151',
    },
    applyText: {
        fontWeight: '700',
        color: '#FFF',
    },
    pendingBadge: {
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: '#FFF3E0',
    },

    pendingBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#E65100',
    },
    highlightRow: {
        backgroundColor: '#d6eaff',
        borderLeftWidth: 4,
        borderLeftColor: '#9ab1e0',
    },
    infoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    infoCard: {
        width: '88%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: 'center',
        elevation: 8,
    },

    infoIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    infoTitle: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },

    infoDesc: {
        marginTop: 10,
        fontSize: 17,
        textAlign: 'center',
        color: '#000',
        lineHeight: 22,
    },

    infoBtn: {
        marginTop: 20,
        width: '100%',
        height: 48,
        borderRadius: 14,
        backgroundColor: '#168A35',
        justifyContent: 'center',
        alignItems: 'center',
    },

    infoBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },

    normal: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
});
