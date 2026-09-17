/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal, Alert, TextInput } from 'react-native';
// import axios from 'axios';
import Icon from '@expo/vector-icons/MaterialIcons';
import { POTDataProps, LabelMap, CardPayload, StageData } from './Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
// import Svg, { Circle, G, Path } from 'react-native-svg';
// import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';

const YarnStockCard: React.FC<POTDataProps> = ({
    gePOTData,
    searchQueryPOT,
    token,
    parentDesignData,
    setSelectedStockRow,
    setModalOpen,
    getSavedCartons,
    printSticker,
    getPrintRow,
    setPrintRow
}) => {
    const [filteredData, setFilteredData] = useState(gePOTData || []);
    const [getStageData, setStageData] = useState<StageData[]>([]);
    const [isStageLoading, setStageLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [allData, setAllData] = useState(gePOTData || []);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cardSearchQuery, setCardSearchQuery] = useState(searchQueryPOT || '');

    useEffect(() => {
        setCardSearchQuery(searchQueryPOT || '');
    }, [searchQueryPOT]);

    // Universal card-list search:
    // Searches the value entered in the search box across ALL fields of each
    // loaded card. This is intentionally NOT a dropdown/property/year/store
    // filter. The result is only the cards that contain the searched value.
    const getSearchableText = (value: any): string => {
        if (value === null || value === undefined) return '';

        if (Array.isArray(value)) {
            return value.map(getSearchableText).join(' ');
        }

        if (typeof value === 'object') {
            return Object.values(value).map(getSearchableText).join(' ');
        }

        return String(value);
    };

    useEffect(() => {
        const sourceData = Array.isArray(gePOTData) ? gePOTData : [];
        const query = cardSearchQuery.trim().toLowerCase();

        // No search -> show the complete loaded list (10 at a time).
        if (!query) {
            setFilteredData(sourceData);
            setAllData(sourceData.slice(0, 10));
            setPage(1);
            return;
        }

        // Search ALL card fields (string, number, date, etc.).
        // Example: DH23, MESTRE, BLACK, 15.300, 31/03/2027, 8, etc.
        const filtered = sourceData.filter((item: any) =>
            getSearchableText(item).toLowerCase().includes(query)
        );

        setFilteredData(filtered);
        setAllData(filtered.slice(0, 10));
        setPage(1);
    }, [gePOTData, cardSearchQuery]);

    const handleCardPress = (item: any) => {
        setSelectedStockRow(item)
        setModalOpen(true);
    };
    const handlePrintData = (item: any) => {
        setPrintRow(item)
        printSticker(item)
    }

    const getToken = () => {
        return token;
    };

    const renderStageTableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Stage</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Qty</Text>
        </View>
    );

    const loadMoreData = () => {
        if (isLoadingMore) return;

        const start = page * 10;
        const end = start + 10;

        const nextItems = filteredData.slice(start, end);

        if (nextItems.length === 0) return;

        setIsLoadingMore(true);

        setTimeout(() => {
            setAllData(prev => [...prev, ...nextItems]);
            setPage(prev => prev + 1);
            setIsLoadingMore(false);
        }, 300);
    };

    const convDate = (dateStr) => {
        if (!dateStr || typeof dateStr == 'undefined' || dateStr == null || dateStr == '' || parseFloat(dateStr) == 0 || dateStr == '0') return '';

        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);

        return `${day}/${month}/${year}`;
    };

    const getStatusMeta = (item: any) => {
        const saved = Array.isArray(getSavedCartons) && getSavedCartons.includes(item.UId);
        if (saved || item.Status === '2') return { label: 'AUTO FOUND', color: '#D4A900', bg: '#FFFBE6', border: '#E8D36B', icon: 'check-circle' };
        if (item.Status === '3') return { label: 'AUTO FOR REPACKING', color: '#7652B5', bg: '#F7F2FF', border: '#C9B5EC', icon: 'inventory-2' };
        if (item.Status === '5') return { label: 'STOCK NOT FOUND', color: '#B35D9E', bg: '#FFF4FB', border: '#D9A5CE', icon: 'error-outline' };
        if (item.Status === '0') return { label: 'MANUAL', color: '#168A92', bg: '#F0FCFD', border: '#9DDDE1', icon: 'edit' };
        if (item.Status === '1') return { label: 'VERIFY', color: '#087FA3', bg: '#EFF9FC', border: '#9ACFDE', icon: 'verified' };
        return { label: 'AUTO NOT FOUND', color: '#6D7880', bg: '#F6F8F9', border: '#CDD5D9', icon: 'radio-button-unchecked' };
    };

    const renderCard = React.useCallback(({ item }) => {
        const status = getStatusMeta(item);
        const canVerify = item.Status === '1' && !getSavedCartons.includes(item.UId);
        const canPrint = item.Status === '2' || getSavedCartons.includes(item.UId);

        const displayValue = (value: any) =>
            value === null || value === undefined || value === '' ? '--' : String(value);

        return (
            <View style={[styles.newCard, { borderLeftColor: status.border }]}>
                {/* Header: carton number + status */}
                <View style={styles.cardTopRow}>
                    <View
                        style={[
                            styles.cartonBadge,
                            { backgroundColor: '#F2F8FA', borderColor: '#B8DDE4' }
                        ]}
                    >
                        <View style={styles.cartonIconCircle}>
                            <Icon name="inventory-2" size={17} color="#087FA3" />
                        </View>
                        <View style={styles.cartonTextWrap}>
                            <Text style={styles.cartonBadgeLabel}>TAKA / ROLL NO.</Text>
                            <Text style={styles.cartonBadgeText} numberOfLines={1}>
                                {displayValue(item.CartNo)}
                            </Text>
                        </View>
                    </View>

                    {/* <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor: status.bg,
                                borderColor: status.border
                            }
                        ]}
                    >
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.statusText, { color: status.color }]}
                        >
                            {status.label}
                        </Text>
                    </View> */}
                </View>

                {/* Primary information */}
                <View style={styles.mainInfo}>
                    <View style={styles.inlineInfoRow}>
                        <Text style={styles.infoLabel}>Item</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{displayValue(item.ItmName)}</Text>
                    </View>

                    <View style={styles.inlineInfoRow}>
                        <Text style={styles.infoLabel}>Design</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{displayValue(item.DsnName)}</Text>
                    </View>

                    {/* <View style={styles.inlineInfoRow}>
                        <Text style={styles.infoLabel}>Grade</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{displayValue(item.GrdName)}</Text>
                    </View> */}

                    <View style={styles.inlineInfoRow}>
                        <Text style={styles.infoLabel}>Shade</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{displayValue(item.ShdName)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Secondary details */}
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Chees</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.Chees)}
                        </Text>
                    </View>

                    {/* <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Denier</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.Denier)}
                        </Text>
                    </View> */}

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Stock</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.StkType)}
                        </Text>
                    </View>

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Tran Date</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {convDate(item.TranDate) || '--'}
                        </Text>
                    </View>

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>System Meter</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.Wt)}
                        </Text>
                    </View>

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Is Auto</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.IsAuto)}
                        </Text>
                    </View>

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Status</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.Status)}
                        </Text>
                    </View>

                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>User</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {displayValue(item.UsrCode)}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                {/* {(canVerify || canPrint) && ( */}
                <View style={styles.actionRow}>
                    {canVerify && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.verifyButton]}
                            onPress={() => handleCardPress(item)}
                            activeOpacity={0.8}
                        >
                            <Icon name="verified" size={17} color="#fff" />
                            <Text style={styles.actionText}>Verify</Text>
                        </TouchableOpacity>
                    )}

                    {canPrint && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.printButton]}
                            onPress={() => handlePrintData(item)}
                            activeOpacity={0.8}
                        >
                            <Icon name="local-print-shop" size={18} color="#fff" />
                            <Text style={styles.actionText}>Print</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {/* )} */}
            </View>
        );
    }, [getSavedCartons, handleCardPress, handlePrintData]);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.cardSearchWrap}>
                <Icon name="search" size={20} color="#7A8790" />
                <TextInput
                    value={cardSearchQuery}
                    onChangeText={setCardSearchQuery}
                    placeholder="Search taka, item, design, shade..."
                    placeholderTextColor="#9AA6AD"
                    style={styles.cardSearchInput}
                    returnKeyType="search"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                />
                {cardSearchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setCardSearchQuery('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icon name="close" size={19} color="#7A8790" />
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={allData}
                renderItem={renderCard}
                keyExtractor={(item, index) => String(item.UId ?? item.CartNo ?? index)}
                contentContainerStyle={styles.listContent}

                onEndReached={loadMoreData}
                onEndReachedThreshold={0.5}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews
                ListFooterComponent={isLoadingMore ? (<ActivityIndicator size="small" color="rgb(86,156,214)" />) : null}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No data found!</Text></View>}
            />
            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => { setModalVisible(!modalVisible) }}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>Production Stages</Text>
                        <TouchableOpacity onPress={() => setModalVisible(!modalVisible)}>
                            <Icon name="close" size={24} color="rgb(86, 156, 214)" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.tableContainer}>
                        {
                            renderStageTableHeader()
                        }
                        <ScrollView style={styles.tableBody}>
                            {
                                getStageData.map((item, index) => (
                                    <View style={styles.tableRow} key={index}>
                                        <Text style={[styles.tableCellKey, { flex: 2 }]}>{item.stage}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{item.qty}</Text>
                                    </View>
                                ))
                            }
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    cardSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 3,
        marginBottom: 6,
        paddingHorizontal: 12,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DCE3E7',
        borderRadius: 10,
    },
    cardSearchInput: {
        flex: 1,
        marginLeft: 8,
        paddingVertical: 0,
        fontSize: 14,
        color: '#263238',
    },
    container: {
        flex: 0,
        backgroundColor: '#F4F7F8',
    },

    listContent: {
        paddingTop: 2,
        paddingBottom: 92,
    },

    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },

    emptyText: {
        color: '#66737A',
        fontSize: 15,
    },

    /* ---------------- Card ---------------- */
    newCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 8,
        marginVertical: 3,
        padding: 9,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E1E8EB',
        borderLeftWidth: 4,
        shadowColor: '#17343D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },

    cardTopRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },

    cartonBadge: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 6,
    },

    cartonIconCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E4F4F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 5,
    },

    cartonTextWrap: {
        flex: 1,
        minWidth: 0,
    },

    cartonBadgeLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.55,
        color: '#718188',
    },

    cartonBadgeText: {
        marginTop: 1,
        fontSize: 13,
        lineHeight: 16,
        fontWeight: '800',
        color: '#20343B',
    },

    statusBadge: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 30,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 15,
        borderWidth: 1,
    },

    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 6,
        flexShrink: 0,
    },

    statusText: {
        fontSize: 11,
        lineHeight: 11,
        fontWeight: '800',
        letterSpacing: 0.15,
        flexShrink: 1,
    },

    mainInfo: {
        width: '100%',
    },

    inlineInfoRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 17,
        marginBottom: 1,
    },

    infoLabel: {
        width: 52,
        fontSize: 12,
        lineHeight: 13,
        color: '#7B878D',
        fontWeight: '500',
    },

    infoValue: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        lineHeight: 14,
        fontWeight: '700',
        color: '#24343A',
        flexShrink: 1,
    },

    divider: {
        height: 1,
        backgroundColor: '#E5EAEC',
        marginTop: 2,
        marginBottom: 7,
    },

    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    gridItem: {
        width: '48%',
        minWidth: 0,
        marginBottom: 8,
    },

    gridLabel: {
        fontSize: 12,
        lineHeight: 12,
        color: '#7C888E',
        marginBottom: 3,
        fontWeight: '500',
    },

    gridValue: {
        fontSize: 12,
        lineHeight: 14,
        fontWeight: '700',
        color: '#26343A',
        flexShrink: 1,
    },

    actionRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
        paddingTop: 1,
    },

    actionButton: {
        minWidth: 82,
        height: 33,
        paddingHorizontal: 11,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },

    verifyButton: {
        backgroundColor: '#087FA3',
    },

    printButton: {
        backgroundColor: '#168A92',
    },

    actionText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '800',
        marginLeft: 5,
    },

    /* ---------------- Production stages modal ---------------- */
    modalContainer: {
        flex: 1,
        backgroundColor: '#F6F8F9',
        padding: 16,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E3E9EC',
    },

    modalHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#087FA3',
    },

    tableContainer: {
        flex: 1,
    },

    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EAF5F8',
        paddingVertical: 11,
        borderRadius: 8,
    },

    tableHeaderText: {
        fontWeight: '700',
        color: '#087FA3',
        paddingHorizontal: 10,
    },

    tableBody: {
        flex: 1,
    },

    tableRow: {
        flexDirection: 'row',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#E7ECEF',
    },

    tableCell: {
        paddingHorizontal: 10,
        textAlign: 'right',
        color: '#4B5960',
    },

    tableCellKey: {
        paddingHorizontal: 10,
        color: '#4B5960',
    },
});

export default YarnStockCard;
