import React, { useState, useEffect } from 'react';

import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, Modal, } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

const PCAcard = (props) => {
    const {
        getAllData,
        onSave,
        getChunkData,
        searchQuery,
        getSelectedRow,
        setSelectedRow,
        getModalOpen,
        setModalOpen
    } = props;

    const [filteredData, setFilteredData] = useState(getChunkData || []);
    const [allData, setAllData] = useState(getChunkData || []);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredData(getChunkData || []);
            setAllData((getChunkData || []).slice(0, 20));
            setPage(1);
        } else {
            const filtered = (getChunkData || []).filter((item) => {
                const matchesSearch = Object.values(item).some(
                    (value) => typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return matchesSearch;
            });
            setFilteredData(filtered);
            setAllData(filtered.slice(0, 20));
            setPage(1);
        }
    }, [getChunkData, searchQuery]);

    // const loadMoreData = () => {
    //     if (isLoadingMore) return;
    //     const start = page * 10;
    //     const end = start + 10;
    //     const nextItems = filteredData.slice(start, end);

    //     if (nextItems.length === 0) return;

    //     setIsLoadingMore(true);

    //     setTimeout(() => {
    //         setAllData(prev => [...prev, ...nextItems]);
    //         setPage(prev => prev + 1);
    //         setIsLoadingMore(false);
    //     }, 300);
    // };
    const loadMoreData = () => {
        if (isLoadingMore) return;

        const start = page * 20;
        const end = start + 20;
        const nextItems = filteredData.slice(start, end);

        if (nextItems.length === 0) return;

        setIsGlobalLoading(true);

        setTimeout(() => {
            setAllData(prev => [...prev, ...nextItems]);
            setPage(prev => prev + 1);
            setIsGlobalLoading(false);
        }, 300);
    };

    const handleCardPress = (item: any) => {
        setSelectedRow(item)
        setModalOpen(true);
        //onSave(item);
    };

    const renderItem = React.useCallback(({ item }) => (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerText}>Grd. no. : {item.GreadingNo}</Text>
                <Text style={styles.subHeader}>prod type : {item.ProdType}</Text>
            </View>
            {/* Top Info */}
            <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Item</Text>
                    <Text style={styles.infoValue}>{item.ItmName}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Merge</Text>
                    <Text style={styles.infoValue}>{item.MerName}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Shade</Text>
                    <Text style={styles.infoValue}>{item.ShdName}</Text>
                </View>
            </View>
            {/* Grid Data */}
            <View style={styles.grid}>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Packing no.</Text>
                    <Text style={styles.value}>{item.PackingNo}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Pack. date</Text>
                    <Text style={styles.value}>{item.PackDate}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Weight</Text>
                    <Text style={styles.value}>{item.TotWt}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Pcs</Text>
                    <Text style={styles.value}>{item.TotPcs}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Itm. code</Text>
                    <Text style={styles.value}>{item.ItmCode}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Mer. code</Text>
                    <Text style={styles.value}>{item.MerCode}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Shd. code</Text>
                    <Text style={styles.value}>{item.ShdCode}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Chk.</Text>
                    <Text style={styles.value}>{item.CHK}</Text>
                </View>
            </View>
            {/* Footer */}
            <View style={styles.footerRow}>
                <TouchableOpacity
                    style={styles.saveBtn}
                    //onPress={() => onSave(item)}
                    onPress={() => handleCardPress(item)}
                >
                    <Icon name="save" size={22} color="#fff" />
                    <Text style={styles.btnText}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    ));

    const loadedCount = allData.length;
    const totalCount = filteredData.length;

    return (
        <>
            <FlatList
                data={allData}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                onEndReached={loadMoreData}
                onEndReachedThreshold={0.5}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews
                ListFooterComponent={null}
                //ListFooterComponent={isLoadingMore ? (<ActivityIndicator size="small" color="rgb(86,156,214)" />) : null}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No data found!</Text></View>}
            />
            {isGlobalLoading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    {/* <Text style={styles.loaderText}>
                        Loading {loadedCount} of {totalCount}
                    </Text> */}
                </View>
            )}
        </>
    );
}

export default PCAcard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#e9f0fc',
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        marginHorizontal: 15,
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#c9ddfd',
    },
    headerContainer: {
        backgroundColor: theme.BRAND_GRADIENT_START,
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
    },
    headerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    subHeader: {
        color: '#e0e0e0',
        fontSize: 12,
        marginTop: 2,
    },
    infoBox: {
        backgroundColor: '#f8f9fb',
        padding: 10,
        borderRadius: 12,
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    infoLabel: {
        width: 70,
        fontSize: 12,
        color: '#888',
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    gridItem: {
        width: '48%',
        backgroundColor: '#fafafa',
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        color: '#999',
    },
    value: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#222',
    },
    footerRow: {
        alignItems: 'center',
        marginTop: 5,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.BRAND_GRADIENT_START,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    btnText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    loaderOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loaderText: {
        marginTop: 10,
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
