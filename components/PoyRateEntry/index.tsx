import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View, } from 'react-native';
import { API } from '../../common/API/dynamicAPI';

const RUPEE = '\u20B9';
const DASH = '\u2014';

const POYRateEntry = ({ token, username, navigation }: any) => {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const styles = useMemo(() => createStyles(width, height), [width, height]);

    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [listData, setListData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [showKeypad, setShowKeypad] = useState(false);
    const [failedSrNo, setFailedSrNo] = useState<any>(null);
    const failedBlink = useRef(new Animated.Value(0)).current;
    const listRef = useRef<FlatList<any>>(null);
    const [alertData, setAlertData] = useState({
        visible: false,
        message: '',
        type: 'warning',
    });

    // const completedCount = useMemo(() => {
    //     return listData.filter(item => Number(getItemRate(item) || 0) > 0).length;
    // }, [listData]);

    // const pendingCount = Math.max((listData.length || 15) - (completedCount || 1), 0);
    // const totalCount = listData.length || 15;
    // const progressPercent = `${Math.min(((completedCount || 1) / totalCount) * 100, 100)}%`;

    const completedCount = useMemo(() => {
        return listData.filter(item => Number(getItemRate(item) || 0) > 0).length;
    }, [listData]);

    const totalCount = listData.length;

    const pendingCount = totalCount - completedCount;

    const progressPercent =
        totalCount > 0
            ? `${(completedCount / totalCount) * 100}%`
            : '0%';

    useEffect(() => {
        if (!failedSrNo) {
            failedBlink.stopAnimation();
            failedBlink.setValue(0);
            return;
        }

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(failedBlink, {
                    toValue: 1,
                    duration: 450,
                    useNativeDriver: true,
                }),
                Animated.timing(failedBlink, {
                    toValue: 0,
                    duration: 450,
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [failedSrNo, failedBlink]);

    const scrollToItemCode = (itmCode?: string, data: any[] = filteredData) => {
        if (!itmCode || data.length === 0) return;

        const index = data.findIndex(x => x?.ItmCode === itmCode);

        if (index < 0) return;

        setTimeout(() => {
            console.log("listRef.current?.scrollToIndex =>", listRef.current)
            console.log("typeof scrollToIndex =", typeof listRef.current?.scrollToIndex);
            listRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5,
            });
        }, 250);
    };

    const getItemSrNo = (item: any) => {
        return item?.RSrNo ?? item?.SrNo ?? item?.srno;
    };

    const markSaveErrorRow = (item: any, responseData?: any) => {
        const errorSrNo =
            responseData?.srno ??
            responseData?.SrNo ??
            responseData?.RSrNo ??
            getItemSrNo(item);

        setFailedSrNo(errorSrNo);
    };

    function getItemRate(item: any) {
        return item?.Rate ?? item?.rate ?? '';
    }

    function getItemUom(item: any) {
        return item?.UOM || item?.uom || 'KGS';
    }

    const showWarning = (msg: string) =>
        setAlertData({ visible: true, message: msg, type: 'warning' });

    const showSuccess = (msg: string) =>
        setAlertData({ visible: true, message: msg, type: 'success' });

    const showError = (msg: string) =>
        setAlertData({ visible: true, message: msg, type: 'error' });

    const formatDate = (d: Date) => {
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            setListData([]);
            setFilteredData([]);
            setSelected(null);
            setAmount('');
            setShowKeypad(false);
            setDate(selectedDate);
        }
    };

    const loadDataGet = async (selectItmCode?: string) => {

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = await AsyncStorage.getItem('yno');

        try {
            setLoading(true);
            setShowKeypad(false);
            setSelected(null);
            setAmount('');

            const payload = {
                prptype: userPtype,
                // prptype: 'R',
                prpcode: 'MTX',
                yearno: yno,
                strcode: '001',
                txntype: 'mob_poy_rate_entry',
                appfrom: formatDate(date),
            };

            console.log("loadDataGet payload => ", payload)

            const res = await axios.get(`${API}/api/get_price_list_poy_items`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });

            const result = res?.data?.data || [];

            console.log("loadDataGet res => ", res)
            console.log("loadDataGet result => ", result)
            console.log("loadDataGet result[0] => ", result[0])

            setListData(result);
            setFilteredData(result);

            if (result.length > 0) {
                const itemToSelect =
                    result.find((x: any) => x?.ItmCode === selectItmCode) || result[0];

                setSelected(itemToSelect);
                // setAmount(getItemRate(itemToSelect)?.toString() || '');
                const rate = getItemRate(itemToSelect);

                if (Number(rate || 0) === 0) {
                    setAmount('');
                } else {
                    setAmount(rate.toString());
                }

                console.log('RATE=>', getItemRate(itemToSelect));
                setShowKeypad(true);

                if (selectItmCode) {
                    scrollToItemCode(itemToSelect?.ItmCode, result);
                }
            } else {
                setSelected(null);
                setAmount('');
                setShowKeypad(false);
            }
        } catch (error) {
            console.log(error);
            showError('Unable to load POY items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(!token) return;
        loadDataGet();
    }, [date, token]);

    const PoyRateEntrySave = async (item: any) => {
        if (!amount) {
            showWarning('Please enter rate');
            return;
        }

        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = await AsyncStorage.getItem('yno');

        try {
            setLoading(true);

            const payload = {
                prptype: userPtype,
                // prptype: 'R',
                prpcode: item?.PrpCode || '',
                yearno: yno,
                strcode: '001',
                txntype: 'mob_poy_rate_entry',
                rate: amount,
                srno: item?.RSrNo,
                itmcode: item?.ItmCode,
                itmname: item?.ItmName,
                appfrom: item?.AppFrom,
            };

            console.log("PoyRateEntrySave payload => ", payload)

            const res = await axios.post(`${API}/api/save_price_list_poy_items`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            console.log("PoyRateEntrySave res => ", res)

            const isError =
                res?.data?.success === false ||
                res?.data?.status === false ||
                res?.data?.error === true;

            if (isError) {
                markSaveErrorRow(item, res?.data);
                return;
            }

            setFailedSrNo(null);

            const currentIndex = listData.findIndex(
                x => x.ItmCode === selected?.ItmCode,
            );

            let nextItemCode = selected?.ItmCode;

            if (currentIndex >= 0 && currentIndex < listData.length - 1) {
                nextItemCode = listData[currentIndex + 1]?.ItmCode;
            }

            await loadDataGet(nextItemCode);
        } catch (error: any) {
            console.log(error);
            markSaveErrorRow(item, error?.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchText(text);

        if (!text.trim()) {
            setFilteredData(listData);
            return;
        }

        const search = text.toLowerCase();

        const filtered = listData.filter(item =>
            item?.SrNo?.toString()?.toLowerCase()?.includes(search) ||
            item?.PrpCode?.toLowerCase()?.includes(search) ||
            item?.StrCode?.toLowerCase()?.includes(search) ||
            item?.ItmCode?.toLowerCase()?.includes(search) ||
            item?.ItmName?.toLowerCase()?.includes(search) ||
            item?.ShtName?.toLowerCase()?.includes(search) ||
            item?.UOM?.toLowerCase()?.includes(search) ||
            item?.AppFrom?.toString()?.toLowerCase()?.includes(search) ||
            item?.Rate?.toString()?.toLowerCase()?.includes(search)
        );

        setFilteredData(filtered);
    };

    const clearSearch = () => {
        setSearchText('');
        setFilteredData(listData);
        Keyboard.dismiss();
    };

    const selectItem = (item: any) => {
        setSelected(item);
        // setAmount(getItemRate(item)?.toString() || '');
        const rate = getItemRate(item);

        if (Number(rate || 0) === 0) {
            setAmount('');
        } else {
            setAmount(rate.toString());
        }
        setShowKeypad(true);
    };

    const handleKeyPress = (key: string) => {
        if (key === 'back') {
            setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : ''));
            return;
        }

        if (key === 'done') {
            Keyboard.dismiss();
            return;
        }

        // if (key === '.') {
        //     if (amount.includes('.')) return;
        //     setAmount(prev => (prev ? `${prev}.` : '0.'));
        //     return;
        // }

        if (key === '.') {
            if (amount.includes('.')) return;

            setAmount(prev => (prev ? `${prev}.` : '0.'));
            return;
        }

        if (key === '+' || key === '-') {
            return;
        }

        // setAmount(prev => {
        //     if (prev.length >= 8) return prev;
        //     if (prev === '0') return key;
        //     return `${prev}${key}`;
        // });
        setAmount(prev => {
            if (prev.length >= 8) return prev;

            // agar screen par sirf 0 dikh raha hai aur user digit press kare
            // to 0 replace ho jaye
            if (prev === '' || prev === '0') {
                return key;
            }

            return `${prev}${key}`;
        });
    };

    const keypad = ['1', '2', '3', 'back', '4', '5', '6', '+', '7', '8', '9', '-', '.', '0', 'done'];

    const renderItem = ({ item, index }: any) => {
        const active = selected?.ItmCode === item?.ItmCode;
        const rate = getItemRate(item);
        const done = Number(rate || 0) > 0;
        const unit = getItemUom(item);
        const rowSrNo = getItemSrNo(item);
        const failed = failedSrNo != null && rowSrNo === failedSrNo;

        return (
            <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => selectItem(item)}
                style={[
                    styles.itemCard,
                    active && styles.itemCardActive,
                    failed && styles.itemCardFailed,
                ]}>
                {failed && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.failedBlinkLine,
                            {
                                opacity: failedBlink,
                            },
                        ]}
                    />
                )}

                <View style={styles.itemStatusWrap}>
                    <View
                        style={[
                            styles.itemStatus,
                            done && styles.itemStatusDone,
                            failed && styles.itemStatusFailed,
                        ]}>
                        {failed ? (
                            <Icon name="close" size={styles.iconSizes.status} color="#FFFFFF" />
                        ) : done ? (
                            <Icon name="check" size={styles.iconSizes.status} color="#FFFFFF" />
                        ) : (
                            <Text style={styles.itemStatusText}>{item?.SrNo || index + 1}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.itemMiddle}>
                    <Text numberOfLines={3} ellipsizeMode="tail" style={styles.itemTitle} >
                        {item?.ItmName || '-'}
                    </Text>
                    {/* <Text numberOfLines={1} style={styles.itemDesc}>
                        {item?.ShtName || 'Inventory item'}
                    </Text> */}
                </View>

                <View style={styles.itemRight}>
                    <Text style={[styles.itemRate, failed && styles.itemRateFailed]}>
                        {rate ? `${RUPEE}${rate}` : DASH}
                    </Text>
                    {/* <View style={[styles.unitBadge, unit === 'BOX' && styles.unitBadgeGreen]}>
                        <Text style={[styles.unitBadgeText, unit === 'BOX' && styles.unitBadgeTextGreen]}>
                            {unit}
                        </Text>
                    </View> */}

                    <View style={styles.unitBadge}>
                        <Text style={styles.unitBadgeText}>
                            {unit}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSkeleton = () => {
        return [1, 2, 3].map(item => (
            <View key={item} style={styles.skeletonCard}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonTextWrap}>
                    <View style={styles.skeletonLineLarge} />
                    <View style={styles.skeletonLineSmall} />
                </View>
            </View>
        ));
    };

    const selectedUnit = getItemUom(selected);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.screenContent}>
                <View style={styles.header}>
                    <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => router.back()}
                        style={styles.backButton}>
                        <Icon name="arrow-back" size={styles.iconSizes.header} color="#168A35" />
                    </TouchableOpacity>

                    <View style={styles.headerText}>
                        <Text numberOfLines={1} style={styles.headerTitle}>
                            POY Rate Entry
                        </Text>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.82}
                        style={styles.datePill}
                        onPress={() => setShowDatePicker(true)}>
                        <Icon name="calendar-month" size={styles.iconSizes.date} color="#168A35" />
                        <Text style={styles.dateText}>{formatDate(date)}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryTop}>
                        <View style={styles.summaryItem}>
                            <View style={styles.summaryIconGreen}>
                                <Icon name="check-circle" size={styles.iconSizes.summary} color="#27943D" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Done</Text>
                                <Text style={styles.summaryDone}>{completedCount}</Text>
                            </View>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryItem}>
                            <View style={styles.summaryIconAmber}>
                                <Icon name="schedule" size={styles.iconSizes.summary} color="#E48900" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Pending</Text>
                                <Text style={styles.summaryPending}>{pendingCount}</Text>
                            </View>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryItem}>
                            <View style={styles.summaryIconBlue}>
                                <Icon name="layers" size={styles.iconSizes.summary} color="#23364F" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Store</Text>
                                <Text style={styles.summaryBatch}>POY</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.progressRow}>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: progressPercent }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {completedCount} of {totalCount} completed
                        </Text>
                    </View>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Icon name="search" size={styles.iconSizes.search} color="#243044" />
                        <TextInput
                            placeholder="Search an Item..."
                            placeholderTextColor="#000"
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={handleSearch}
                        />

                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={clearSearch} hitSlop={styles.hitSlop}>
                                <Icon name="close" size={styles.iconSizes.close} color="#7C8492" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.listArea}>
                    {loading ? (
                        renderSkeleton()
                    ) : (
                        <FlatList
                            ref={listRef}
                            data={filteredData}
                            renderItem={renderItem}
                            keyExtractor={(item, index) =>
                                item?.ItmCode?.toString() ||
                                item?.itemcode?.toString() ||
                                index.toString()
                            }
                            showsVerticalScrollIndicator
                            keyboardShouldPersistTaps="handled"
                            ItemSeparatorComponent={() => <View style={styles.itemGap} />}
                            onScrollToIndexFailed={info => {
                                setTimeout(() => {
                                    listRef.current?.scrollToOffset({
                                        offset: Math.max(0, info.averageItemLength * info.index),
                                        animated: true,
                                    });

                                    setTimeout(() => {
                                        listRef.current?.scrollToIndex({
                                            index: info.index,
                                            animated: true,
                                            viewPosition: 0.5,
                                        });
                                    }, 150);
                                }, 150);
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyText}>No POY item found</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {!loading && showKeypad && selected && (
                    <View style={styles.editorCard}>
                        <View style={styles.editorHeader}>
                            <View style={styles.editorTitleWrap}>
                                <Text style={styles.editorLabel}>Selected Item</Text>
                                <Text numberOfLines={1} style={styles.editorItem}>
                                    {selected?.ItmName || '-'}
                                </Text>
                            </View>

                            <View style={styles.selectedUnitBadge}>
                                <Text style={styles.selectedUnitText}>{selectedUnit}</Text>
                            </View>
                        </View>

                        <View style={styles.amountRow}>
                            <Text style={styles.currency}>{RUPEE}</Text>
                            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>
                                {amount || '0'}
                            </Text>
                            <Text style={styles.amountUnit}>/ {selectedUnit}</Text>
                        </View>

                        <View style={styles.editorLine} />

                        <View style={styles.chipRow}>
                            {['250', '270', '295', '320'].map(rate => (
                                <TouchableOpacity
                                    key={rate}
                                    activeOpacity={0.82}
                                    onPress={() => setAmount(rate)}
                                    style={styles.rateChip}>
                                    <Text style={styles.rateChipText}>
                                        {RUPEE}{rate}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.keypad}>
                            {keypad.map(key => {
                                const isDone = key === 'done';
                                const isBack = key === 'back';

                                return (
                                    <TouchableOpacity
                                        key={key}
                                        activeOpacity={0.84}
                                        onPress={() => handleKeyPress(key)}
                                        style={[styles.key, isDone && styles.doneKey]}>
                                        {isBack ? (
                                            <Icon
                                                name="backspace"
                                                size={styles.iconSizes.keyIcon}
                                                color="#1F2933"
                                            />
                                        ) : isDone ? (
                                            <Icon
                                                name="check"
                                                size={styles.iconSizes.done}
                                                color="#FFFFFF"
                                            />
                                        ) : (
                                            <Text style={styles.keyText}>{key}</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.88}
                            disabled={loading}
                            onPress={() => {
                                if (!selected) {
                                    showWarning('Please select item');
                                    return;
                                }

                                PoyRateEntrySave({
                                    ...selected,
                                    Rate: amount,
                                });
                            }}
                            style={styles.saveButton}>
                            <Text style={styles.saveText}>
                                {loading ? 'Saving...' : 'Save & Next'}
                            </Text>
                            <Icon name="arrow-forward" size={styles.iconSizes.save} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}

            <Modal transparent visible={alertData.visible} animationType="fade">
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <Icon
                            name={
                                alertData.type === 'success'
                                    ? 'check-circle'
                                    : alertData.type === 'error'
                                        ? 'error'
                                        : 'warning'
                            }
                            size={42}
                            color={
                                alertData.type === 'success'
                                    ? '#168A35'
                                    : alertData.type === 'error'
                                        ? '#F44336'
                                        : '#FFA000'
                            }
                        />

                        <Text style={styles.alertTitle}>
                            {alertData.type === 'success'
                                ? 'Success'
                                : alertData.type === 'error'
                                    ? 'Error'
                                    : 'Warning'}
                        </Text>

                        <Text style={styles.alertMessage}>{alertData.message}</Text>

                        <TouchableOpacity
                            onPress={() =>
                                setAlertData({
                                    visible: false,
                                    message: '',
                                    type: 'warning',
                                })
                            }
                            style={styles.alertBtn}>
                            <Text style={styles.alertBtnText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default POYRateEntry;

const GREEN = '#168A35';
const TEXT = '#111827';
const MUTED = '#667085';
const BORDER = '#E5E7EB';
const BG = '#F7F8FA';

const createStyles = (width: number, height: number) => {
    const isSmall = width <= 365 || height <= 700;
    const isLarge = width >= 420;

    const scale = Math.min(Math.max(width / 393, 0.88), 1.12);
    const fs = (size: number) => Math.round(size * scale);
    const wp = (percent: number) => (width * percent) / 100;
    const hp = (percent: number) => (height * percent) / 100;

    const pagePadding = isSmall ? wp(3.2) : wp(4.2);
    const cardRadius = isSmall ? 12 : 15;

    return StyleSheet.create({
        iconSizes: {
            header: fs(22),
            date: fs(15),
            summary: fs(18),
            search: fs(23),
            filter: fs(22),
            close: fs(20),
            status: fs(20),
            chevron: fs(24),
            helper: fs(14),
            keyIcon: fs(isSmall ? 18 : 20),
            done: fs(isSmall ? 22 : 24),
            save: fs(isSmall ? 20 : 22),
        } as any,
        container: {
            flex: 1,
            backgroundColor: BG,
        },
        scrollContent: {
            paddingHorizontal: pagePadding,
            paddingTop: isSmall ? hp(1) : hp(1.4),
            paddingBottom: hp(2.2),
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: isSmall ? hp(1.2) : hp(1.8),
        },
        backButton: {
            width: isSmall ? wp(10.5) : wp(11.5),
            height: isSmall ? wp(10.5) : wp(11.5),
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: BORDER,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#111827',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 1,
        },
        headerText: {
            flex: 1,
            marginLeft: wp(3),
            marginRight: wp(2),
            minWidth: 0,
        },
        headerTitle: {
            color: TEXT,
            fontSize: fs(isSmall ? 16 : 18),
            fontWeight: '900',
        },
        headerSubTitle: {
            color: MUTED,
            fontSize: fs(isSmall ? 10 : 11),
            fontWeight: '500',
            marginTop: 2,
        },
        datePill: {
            minHeight: isSmall ? 36 : 40,
            paddingHorizontal: isSmall ? wp(2.4) : wp(3),
            borderRadius: 14,
            backgroundColor: '#F3FBF5',
            borderWidth: 1,
            borderColor: '#CFE8D5',
            flexDirection: 'row',
            alignItems: 'center',
        },
        dateText: {
            marginLeft: 6,
            color: GREEN,
            fontSize: fs(isSmall ? 11 : 12),
            fontWeight: '900',
        },
        summaryCard: {
            backgroundColor: '#FFFFFF',
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: pagePadding,
            paddingVertical: isSmall ? hp(1.2) : hp(1.5),
            marginBottom: isSmall ? hp(1.0) : hp(1.0),
            shadowColor: '#111827',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
        },
        summaryTop: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        summaryItem: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: 0,
        },
        summaryIconGreen: {
            width: isSmall ? 32 : 38,
            height: isSmall ? 32 : 38,
            borderRadius: 99,
            backgroundColor: '#EAF7ED',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: isSmall ? 7 : 9,
        },
        summaryIconAmber: {
            width: isSmall ? 32 : 38,
            height: isSmall ? 32 : 38,
            borderRadius: 99,
            backgroundColor: '#FFF5E8',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: isSmall ? 7 : 9,
        },
        summaryIconBlue: {
            width: isSmall ? 32 : 38,
            height: isSmall ? 32 : 38,
            borderRadius: 99,
            backgroundColor: '#EEF3F8',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: isSmall ? 7 : 9,
        },
        summaryLabel: {
            color: TEXT,
            fontSize: fs(isSmall ? 9 : 10),
            fontWeight: '500',
        },
        summaryDone: {
            color: GREEN,
            fontSize: fs(isSmall ? 16 : 19),
            fontWeight: '900',
        },
        summaryPending: {
            color: '#E48900',
            fontSize: fs(isSmall ? 16 : 19),
            fontWeight: '900',
        },
        summaryBatch: {
            color: '#23364F',
            fontSize: fs(isSmall ? 14 : 17),
            fontWeight: '900',
        },
        summaryDivider: {
            width: 1,
            height: isSmall ? 36 : 43,
            backgroundColor: BORDER,
            marginHorizontal: isSmall ? wp(2) : wp(2.6),
        },
        progressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: isSmall ? hp(1.1) : hp(1.4),
        },
        progressTrack: {
            flex: 1,
            height: 5,
            borderRadius: 10,
            backgroundColor: '#E9ECEF',
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: 10,
            backgroundColor: GREEN,
        },
        progressText: {
            marginLeft: wp(3),
            color: TEXT,
            fontSize: fs(isSmall ? 9 : 11),
            fontWeight: '600',
        },
        searchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: isSmall ? hp(1.0) : hp(1.0),
        },
        searchBox: {
            flex: 1,
            height: isSmall ? 42 : 42,
            backgroundColor: '#FFFFFF',
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: wp(3),
            flexDirection: 'row',
            alignItems: 'center',
        },
        searchInput: {
            flex: 1,
            marginLeft: wp(2.5),
            color: TEXT,
            fontSize: fs(isSmall ? 12 : 14),
            fontWeight: '600',
            height: '100%',
        },
        filterButton: {
            width: isSmall ? 44 : 52,
            height: isSmall ? 44 : 52,
            borderRadius: cardRadius,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: BORDER,
            marginLeft: wp(2.4),
            justifyContent: 'center',
            alignItems: 'center',
        },
        listWrap: {
            height: isSmall ? hp(22) : hp(25),
            marginBottom: isSmall ? hp(0.8) : hp(1),
        },
        itemGap: {
            height: isSmall ? hp(0.8) : hp(1),
        },
        itemCard: {
            minHeight: isSmall ? 58 : 68,
            backgroundColor: '#FFFFFF',
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: isSmall ? wp(2.7) : wp(3),
            paddingVertical: isSmall ? hp(0.8) : hp(1),
            flexDirection: 'row',
            alignItems: 'center',
        },
        itemCardActive: {
            borderColor: GREEN,
            backgroundColor: '#F5FCF6',
            borderWidth: 1.3,
        },
        itemStatusWrap: {
            width: isSmall ? 34 : 40,
            alignItems: 'flex-start',
        },
        itemStatus: {
            width: isSmall ? 28 : 34,
            height: isSmall ? 28 : 34,
            borderRadius: 99,
            backgroundColor: '#F0F2F4',
            justifyContent: 'center',
            alignItems: 'center',
        },
        itemStatusDone: {
            backgroundColor: GREEN,
        },
        itemStatusText: {
            color: TEXT,
            fontSize: fs(isSmall ? 12 : 14),
            fontWeight: '900',
        },
        itemMiddle: {
            flex: 1,
            minWidth: 0,
            paddingRight: wp(2),
        },
        itemTitle: {
            color: TEXT,
            fontSize: fs(isSmall ? 12 : 15),
            fontWeight: '900',
            lineHeight: fs(isSmall ? 16 : 20),
            flexWrap: 'wrap',
        },
        itemDesc: {
            marginTop: 3,
            color: TEXT,
            fontSize: fs(isSmall ? 9 : 11),
            fontWeight: '500',
        },
        itemRight: {
            alignItems: 'flex-end',
            marginRight: wp(1.5),
            minWidth: isSmall ? 46 : 54,
        },
        itemRate: {
            color: TEXT,
            fontSize: fs(isSmall ? 12 : 14),
            fontWeight: '900',
        },
        unitBadge: {
            marginTop: 3,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: '#FFF3E1',
            borderWidth: 1,
            borderColor: '#FFD39A',
        },

        unitBadgeText: {
            color: '#E48900',
            fontSize: fs(isSmall ? 9 : 10),
            fontWeight: '900',
        },
        unitBadgeGreen: {
            backgroundColor: '#EEF9F0',
            borderColor: '#CFE8D5',
        },
        // unitBadgeText: {
        //     color: '#E48900',
        //     fontSize: fs(isSmall ? 9 : 10),
        //     fontWeight: '900',
        // },
        unitBadgeTextGreen: {
            color: GREEN,
        },
        editorHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        editorTitleWrap: {
            flex: 1,
            minWidth: 0,
            paddingRight: wp(3),
        },
        editorLabel: {
            color: GREEN,
            fontSize: fs(isSmall ? 11 : 13),
            fontWeight: '900',
        },
        editorItem: {
            marginTop: 4,
            color: TEXT,
            fontSize: fs(isSmall ? 14 : 17),
            fontWeight: '900',
        },
        selectedUnitBadge: {
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: '#EEF9F0',
            borderWidth: 1,
            borderColor: '#CFE8D5',
        },
        selectedUnitText: {
            color: GREEN,
            fontSize: fs(isSmall ? 11 : 13),
            fontWeight: '900',
        },
        amountRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginTop: isSmall ? hp(0.8) : hp(1),
            fontSize: fs(isSmall ? 11 : 13),
        },
        currency: {
            color: TEXT,
            fontSize: fs(isSmall ? 31 : 38),
            fontWeight: '900',
            marginBottom: isSmall ? 3 : 5,
            marginRight: wp(1.5),
        },
        amount: {
            color: TEXT,
            fontSize: fs(isSmall ? 35 : 35),
            lineHeight: fs(isSmall ? 50 : 63),
            fontWeight: '900',
            maxWidth: width * 0.52,
        },
        amountUnit: {
            color: TEXT,
            fontSize: fs(isSmall ? 11 : 13),
            fontWeight: '700',
            marginLeft: wp(2),
            marginBottom: isSmall ? 9 : 13,
        },
        editorLine: {
            height: 1.5,
            borderRadius: 4,
            backgroundColor: GREEN,
            marginTop: isSmall ? hp(0.6) : hp(0.8),
            marginBottom: isSmall ? hp(0.9) : hp(1.1),
        },
        chipRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: isSmall ? hp(0.7) : hp(0.9),
        },
        rateChip: {
            minWidth: width * 0.18,
            height: isSmall ? 28 : 32,
            borderRadius: 999,
            backgroundColor: '#FBFEFC',
            borderWidth: 1,
            borderColor: '#D9EBDD',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: wp(2),
        },
        rateChipText: {
            color: GREEN,
            fontSize: fs(isSmall ? 10 : 12),
            fontWeight: '900',
        },
        helperRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: isSmall ? hp(0.8) : hp(1),
        },
        helperText: {
            marginLeft: 6,
            color: MUTED,
            fontSize: fs(isSmall ? 9 : 11),
            fontWeight: '600',
        },
        saveText: {
            color: '#FFFFFF',
            fontSize: fs(isSmall ? 13 : 15),
            fontWeight: '900',
            marginRight: wp(6),
        },
        skeletonCard: {
            minHeight: isSmall ? 58 : 68,
            backgroundColor: '#FFFFFF',
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: wp(3),
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: isSmall ? hp(0.8) : hp(1),
        },
        skeletonCircle: {
            width: isSmall ? 28 : 34,
            height: isSmall ? 28 : 34,
            borderRadius: 99,
            backgroundColor: '#E6EAF0',
        },
        skeletonTextWrap: {
            flex: 1,
            marginLeft: wp(3),
        },
        skeletonLineLarge: {
            width: '55%',
            height: 12,
            borderRadius: 8,
            backgroundColor: '#E6EAF0',
        },
        skeletonLineSmall: {
            width: '36%',
            height: 9,
            borderRadius: 8,
            backgroundColor: '#E6EAF0',
            marginTop: 8,
        },
        alertOverlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
        },
        alertBox: {
            width: '85%',
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 22,
            alignItems: 'center',
        },
        alertTitle: {
            fontSize: 18,
            fontWeight: '800',
            marginTop: 10,
            color: TEXT,
        },
        alertMessage: {
            textAlign: 'center',
            marginTop: 10,
            color: '#444',
            fontSize: 14,
        },
        alertBtn: {
            marginTop: 18,
            backgroundColor: GREEN,
            paddingHorizontal: 28,
            paddingVertical: 11,
            borderRadius: 10,
        },
        alertBtnText: {
            color: '#FFFFFF',
            fontWeight: '800',
        },
        hitSlop: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
        },
        emptyBox: {
            height: isSmall ? hp(12) : hp(14),
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: BORDER,
        },
        emptyText: {
            color: MUTED,
            fontSize: fs(isSmall ? 12 : 14),
            fontWeight: '700',
        },
        screenContent: {
            flex: 1,
            paddingHorizontal: pagePadding,
            paddingTop: isSmall ? hp(1) : hp(1.4),
        },
        listArea: {
            flex: 1,
            minHeight: isSmall ? hp(12) : hp(16),
            marginBottom: isSmall ? hp(0.6) : hp(0.8),
        },
        editorCard: {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: isSmall ? 15 : 18,
            borderTopRightRadius: isSmall ? 15 : 18,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: pagePadding,
            paddingTop: isSmall ? hp(0.7) : hp(0.9),
            paddingBottom: isSmall ? hp(0.7) : hp(0.9),
            marginHorizontal: -pagePadding,
        },
        keypad: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            rowGap: isSmall ? hp(0.35) : hp(0.45),
        },
        key: {
            width: '23.5%',
            height: isSmall ? 30 : isLarge ? 38 : 34,
            borderRadius: isSmall ? 7 : 9,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: BORDER,
            justifyContent: 'center',
            alignItems: 'center',
        },
        doneKey: {
            width: '48.8%',
            backgroundColor: GREEN,
            borderColor: GREEN,
        },
        keyText: {
            color: TEXT,
            fontSize: fs(isSmall ? 14 : 17),
            fontWeight: '800',
        },
        saveButton: {
            height: isSmall ? 34 : 40,
            borderRadius: isSmall ? 8 : 10,
            backgroundColor: GREEN,
            marginTop: isSmall ? hp(0.7) : hp(0.9),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        itemCardFailed: {
            borderColor: '#EF4444',
            backgroundColor: '#FFF5F5',
        },
        itemStatusFailed: {
            backgroundColor: '#EF4444',
        },
        itemRateFailed: {
            color: '#DC2626',
        },
        failedBlinkLine: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            borderTopLeftRadius: cardRadius,
            borderBottomLeftRadius: cardRadius,
            backgroundColor: '#EF4444',
        },
    });
};