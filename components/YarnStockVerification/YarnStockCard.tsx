/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, Modal, Alert } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { POTDataProps, LabelMap, CardPayload, StageData } from './Modal';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { API } from '../../common/API/dynamicAPI';

const YarnStockCard: React.FC<POTDataProps> = ({
    gePOTData,
    searchQueryPOT,
    token,
    parentDesignData,
    setSelectedStockRow,
    setModalOpen,
    getSavedCartons
}) => {
    const [filteredData, setFilteredData] = useState(gePOTData || []);
    const [getStageData, setStageData] = useState<StageData[]>([]);
    const [isStageLoading, setStageLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [allData, setAllData] = useState(gePOTData || []);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (!searchQueryPOT.trim()) {
            setFilteredData(gePOTData || []);
            setAllData((gePOTData || []).slice(0, 10)); // Reset pagination
            setPage(1);
        } else {
            // Step 1: ParentDesignData se pdesign nikalo jo searchQuery se match kare
            const matchedParentDesigns = parentDesignData.filter((parent) =>
                parent.pdesign.toLowerCase().includes(searchQueryPOT.toLowerCase()) ||
                parent.cdesign.toLowerCase().includes(searchQueryPOT.toLowerCase())
            );

            // Step 2: gePOTData ko filter karo (normal search + parent design match)
            const filtered = (gePOTData || []).filter((item) => {
                const matchesSearch = Object.values(item).some(
                    (value) =>
                        typeof value === 'string' &&
                        value.toLowerCase().includes(searchQueryPOT.toLowerCase())
                );
                const matchesParentDesign = matchedParentDesigns.some(
                    (parent) => parent.pdesign === item.dsnname
                );
                return matchesSearch || matchesParentDesign;
            });
            setFilteredData(filtered);
            setAllData(filtered.slice(0, 10)); // Reset pagination
            setPage(1);
        }
    }, [gePOTData, searchQueryPOT, parentDesignData]);

    const handleCardPress = (item: any) => {
        setSelectedStockRow(item)
        setModalOpen(true);
    };

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

    const renderCard = React.useCallback(({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={[
                styles.newCard,
                getSavedCartons.includes(item.UId) && styles.savedCard,
                item.Status === '0' && styles.skyCard,
                item.Status === '2' && styles.yellowCard,
                item.Status === '3' && styles.purpleCard,
                item.Status === '5' && styles.pinkCard
            ]}>
            <View style={styles.cartHeaderRow}>
                <Text style={styles.cartHeaderText}>
                    {item.CartNo}
                </Text>
            </View>
            <View style={styles.mainInfo}>
                <View style={styles.subInfoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Item</Text>
                        <Text style={styles.infoValue}>{item.ItmName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Merge</Text>
                        <Text style={styles.infoValue}>{item.MerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Grade</Text>
                        <Text style={styles.infoValue}>{item.GrdName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shade</Text>
                        <Text style={styles.infoValue}>{item.ShdName}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.grid}>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Chees</Text>
                    <Text style={styles.gridValue}>{item.Chees}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Denier</Text>
                    <Text style={styles.gridValue}>{item.Denier}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Stock</Text>
                    <Text style={styles.gridValue}>{item.StkType}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>User</Text>
                    <Text style={styles.gridValue}>{item.UsrCode}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Tran Date</Text>
                    <Text style={styles.gridValue}>{convDate(item.TranDate)}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Weight</Text>
                    <Text style={styles.gridValue}>{item.Wt}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Is auto</Text>
                    <Text style={styles.gridValue}>{item.IsAuto}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Transaction</Text>
                    <Text style={styles.gridValue1}>{item.TranName}</Text>
                </View>
            </View>
            <View style={styles.bottomRow}>
                {
                    item.Status === '1' && !getSavedCartons.includes(item.UId) && (
                        <TouchableOpacity
                            style={styles.goButton}
                            onPress={() => handleCardPress(item)}
                            activeOpacity={0.7}
                        >
                            <Icon name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                    )
                }
            </View>
        </TouchableOpacity>
    ));

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={allData}
                renderItem={renderCard}
                keyExtractor={(item) => item.UId}
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
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 0,
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    modalHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
    },
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableHeaderText: {
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
        paddingHorizontal: 10,
    },
    tableBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        paddingHorizontal: 10,
        textAlign: 'right',
        color: 'rgb(113, 113, 113)',
    },
    tableCellKey: {
        paddingHorizontal: 10,
        color: 'rgb(113, 113, 113)',
    },
    newCard: {
        backgroundColor: "#FFF",
        marginHorizontal: 10,
        marginVertical: 6,
        borderRadius: 14,
        padding: 14,
        elevation: 3,
    },
    savedCard: { backgroundColor: "#F1FA73" },
    skyCard: { backgroundColor: "#98FAF3" },
    yellowCard: { backgroundColor: "#F1FA73" },
    purpleCard: { backgroundColor: "#B59AE3" },
    pinkCard: { backgroundColor: "#DBA7D7" },
    mainInfo: {
        marginBottom: 8
    },
    subInfo: {
        fontSize: 13,
        color: "#666",
        marginTop: 0
    },
    divider: {
        height: 1,
        backgroundColor: "#666",
        marginVertical: 0,
        marginTop: 2,
        marginBottom: 4,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between"
    },
    gridItem: {
        width: "48%",
        marginBottom: 4
    },

    gridLabel: {
        fontSize: 15,
        color: "#666"
    },
    gridValue: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333"
    },
    gridValue1: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333"
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4
    },
    subInfoContainer: {
        marginTop: 0
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 0
    },
    infoLabel: {
        width: 60,              // fixed alignment
        fontSize: 15,
        color: "#666"           // light color
    },
    infoValue: {
        flex: 1,
        fontSize: 16,
        fontWeight: "700",
        color: "#333"
    },
    cartHeaderRow: {
        backgroundColor: "#E3F2FD",
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    cartHeaderText: {
        fontSize: 21,
        fontWeight: "700",
        color: "#007EA7"
    },
    goButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#007EA7",
        width: 45,
        height: 45,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        elevation: 3,
        zIndex: 10
    },
});

export default YarnStockCard;
