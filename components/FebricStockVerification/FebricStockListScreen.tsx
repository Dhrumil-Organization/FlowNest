import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

const FebricStockListScreen = ({ navigation, route }) => {
    const stockData = route?.params?.stockData || [];

    const [search, setSearch] = useState('');

    const filteredData = useMemo(() => {
        if (!search) return stockData;

        return stockData.filter(item =>
            JSON.stringify(item)
                .toLowerCase()
                .includes(search.toLowerCase()),
        );
    }, [search, stockData]);

    const totalQty = useMemo(() => {
        return filteredData.reduce(
            (sum, item) =>
                sum + parseFloat(item?.Wt || 0),
            0,
        );
    }, [filteredData]);

    const renderCard = ({ item }) => {
        const statusColor =
            item.Status === '1'
                ? '#2563EB'
                : item.Status === '2'
                    ? '#16A34A'
                    : '#F97316';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[
                    styles.card,
                    {
                        borderLeftColor: statusColor,
                    },
                ]}
                onPress={() =>
                    navigation.navigate(
                        'YarnStockDetailScreen',
                        {
                            stockRow: item,
                        },
                    )
                }
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cartNo}>
                        {item.CartNo}
                    </Text>

                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor:
                                    statusColor + '20',
                            },
                        ]}
                    >
                        <Text
                            style={{
                                color: statusColor,
                                fontSize: 12,
                                fontWeight: '600',
                            }}
                        >
                            Status {item.Status}
                        </Text>
                    </View>
                </View>

                <Text style={styles.itemName}>
                    {item.ItmName}
                </Text>

                <View style={styles.infoRow}>
                    <View>
                        <Text style={styles.info}>
                            Grade : {item.GrdName}
                        </Text>

                        <Text style={styles.info}>
                            Shade : {item.ShdName}
                        </Text>

                        <Text style={styles.info}>
                            Merge : {item.MerName}
                        </Text>

                        <Text style={styles.info}>
                            Denier : {item.Denier}
                        </Text>
                    </View>

                    <View>
                        <Text style={styles.qtyLabel}>
                            Qty (KG)
                        </Text>

                        <Text style={styles.qty}>
                            {item.Wt}
                        </Text>

                        <Text style={styles.userLabel}>
                            User
                        </Text>

                        <Text style={styles.user}>
                            {item.UsrCode}
                        </Text>
                    </View>
                </View>

                <View style={styles.bottomRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                    >
                        <Icon
                            name="visibility"
                            size={18}
                        />

                        <Text style={styles.actionText}>
                            VIEW
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                    >
                        <Icon
                            name="local-print-shop"
                            size={18}
                        />

                        <Text style={styles.actionText}>
                            PRINT
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() =>
                        navigation.goBack()
                    }
                >
                    <Icon
                        name="arrow-back"
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    Yarn Stock List
                </Text>

                <View
                    style={{
                        flexDirection: 'row',
                    }}
                >
                    <TouchableOpacity
                        style={{ marginLeft: 15 }}
                    >
                        <Icon
                            name="filter-list"
                            size={22}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* SEARCH */}

            <View style={styles.searchBox}>
                <Icon
                    name="search"
                    size={18}
                    color="#999"
                />

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by Carton No / Item / Shade / User"
                    style={styles.input}
                />
            </View>

            {/* SUMMARY */}

            <View style={styles.summaryRow}>
                <SummaryCard
                    title="Total Cartons"
                    value={filteredData.length}
                />

                <SummaryCard
                    title="Total Qty (KG)"
                    value={totalQty.toFixed(2)}
                />

                <SummaryCard
                    title="Saved"
                    value={
                        filteredData.filter(
                            x => x.Status === '2',
                        ).length
                    }
                />
            </View>

            <FlatList
                data={filteredData}
                keyExtractor={(item, index) =>
                    index.toString()
                }
                renderItem={renderCard}
                contentContainerStyle={{
                    paddingBottom: 120,
                }}
            />

            {/* FAB */}

            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    navigation.navigate(
                        'NewCartonScreen',
                    )
                }
            >
                <Icon
                    name="add"
                    size={30}
                    color="#fff"
                />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const SummaryCard = ({
    title,
    value,
}) => (
    <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
            {title}
        </Text>

        <Text style={styles.summaryValue}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },

    header: {
        height: 60,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
    },

    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },

    searchBox: {
        backgroundColor: '#fff',
        margin: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },

    input: {
        flex: 1,
        height: 48,
        marginLeft: 10,
    },

    summaryRow: {
        flexDirection: 'row',
        marginHorizontal: 12,
        marginBottom: 12,
    },

    summaryCard: {
        flex: 1,
        backgroundColor: '#EAF1FF',
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 4,
        alignItems: 'center',
    },

    summaryTitle: {
        fontSize: 11,
        color: '#666',
    },

    summaryValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
    },

    card: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 12,
        padding: 15,
        borderLeftWidth: 4,
        elevation: 3,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    cartNo: {
        fontSize: 24,
        fontWeight: '700',
    },

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },

    itemName: {
        fontSize: 18,
        marginTop: 10,
        marginBottom: 10,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    info: {
        marginBottom: 5,
    },

    qtyLabel: {
        fontSize: 12,
    },

    qty: {
        fontSize: 24,
        fontWeight: '700',
    },

    userLabel: {
        fontSize: 12,
        marginTop: 8,
    },

    user: {
        fontWeight: '700',
    },

    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    },

    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    actionText: {
        marginLeft: 5,
        fontWeight: '600',
    },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 25,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
    },
});

export default FebricStockListScreen;