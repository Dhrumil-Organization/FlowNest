import React, { useEffect, useMemo, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';
import Footer from '../Footer/Footer';

type Inquiry = {
    id: string;
    prpcode: string;
    prptype: string;
    yearno: string;
    createdAt: string;
    status: string;
    deliveryDate: string;
    party: {
        partyname: string;
        partycode: string;
        items: Array<{
            itemtitle: string;
            itemtitlecode: string;
            shades: Array<{
                shadename: string;
                shadecode: string;
                quantity: string;
                rate: string;
                deliverydate: string;
                remarks: string;
                status: string;
            }>;
        }>;
    };
};

const STATUS_TABS = [
    { key: 'All', label: 'All', icon: 'list' },
    { key: 'P', label: 'Pending', icon: 'hourglass-empty' },
    { key: 'R', label: 'Running', icon: 'sync' },
    { key: 'C', label: 'Closed', icon: 'check-circle' },
    { key: 'Ca', label: 'Cancelled', icon: 'cancel' },
] as const;

type StatusType = typeof STATUS_TABS[number]['key'];

const formatDate = (d?: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }
    return d;
};

const getRelativeTime = (dateString: string) => {
    const dateParts = dateString.split('-');
    const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    const now = new Date();

    let years = now.getFullYear() - date.getFullYear();
    let months = now.getMonth() - date.getMonth();
    let days = now.getDate() - date.getDate();

    if (days < 0) {
        months--;
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    if (years > 0) {
        return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}${days > 0 ? `, ${days} day${days > 1 ? 's' : ''}` : ''} ago`;
    } else if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''}${days > 0 ? `, ${days} day${days > 1 ? 's' : ''}` : ''} ago`;
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return 'Today';
    }
};

// Modal Table Component
const ModalTable: React.FC<{
    inquiry: Inquiry;
    onClose: () => void;
}> = ({ inquiry, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(
        new Set(inquiry.party.items.map(item => item.itemtitlecode))
    );
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Format number in Indian format
    const formatIndianNumber = (num: number) => {
        return num.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        });
    };

    // Get first shade's delivery date and remarks
    const firstShade = inquiry.party.items[0]?.shades[0] || {};
    const commonDeliveryDate = firstShade.deliverydate || '-';
    const commonRemarks = firstShade.remarks || '-';

    // Flatten all shades
    const allShades = useMemo(() => {
        return inquiry.party.items.flatMap(item =>
            item.shades.map(shade => ({
                ...shade,
                itemtitle: item.itemtitle,
                itemtitlecode: item.itemtitlecode,
            }))
        );
    }, [inquiry]);

    // Filtered shades
    const filteredShades = useMemo(() => {
        if (!searchQuery.trim()) return allShades;
        const q = searchQuery.toLowerCase();
        return allShades.filter(shade =>
            Object.values(shade).some(val =>
                String(val).toLowerCase().includes(q)
            )
        );
    }, [allShades, searchQuery]);

    // Group by item
    const groupedShades = useMemo(() => {
        const groups: Record<string, typeof filteredShades> = {};
        filteredShades.forEach(shade => {
            if (!groups[shade.itemtitlecode]) {
                groups[shade.itemtitlecode] = [];
            }
            groups[shade.itemtitlecode].push(shade);
        });
        return groups;
    }, [filteredShades]);

    // Toggle item expansion
    const toggleItem = (itemtitlecode: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemtitlecode)) {
                newSet.delete(itemtitlecode);
            } else {
                newSet.add(itemtitlecode);
            }
            return newSet;
        });
    };

    // Toggle full screen
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    // Calculate item totals
    const getItemTotals = (shades: typeof filteredShades) => {
        return shades.reduce(
            (totals, shade) => ({
                qty: totals.qty + parseFloat(shade.quantity),
                amount: totals.amount + (parseFloat(shade.quantity) * parseFloat(shade.rate)),
            }),
            { qty: 0, amount: 0 }
        );
    };

    // Calculate grand totals
    const grandTotals = useMemo(() => {
        return filteredShades.reduce(
            (totals, shade) => ({
                qty: totals.qty + parseFloat(shade.quantity),
                amount: totals.amount + (parseFloat(shade.quantity) * parseFloat(shade.rate)),
            }),
            { qty: 0, amount: 0 }
        );
    }, [filteredShades]);

    // Render shade row
    const renderShadeRow = (shade: (typeof filteredShades)[0], index: number) => (
        <View style={styles.tableRow} key={index}>
            <Text style={[styles.tableCell, { width: 150, textAlign: 'left' }]}>{shade.shadename}</Text>
            <Text style={[styles.tableCell, { width: 80, textAlign: 'right' }]}>
                {formatIndianNumber(parseFloat(shade.quantity))}
            </Text>
            <Text style={[styles.tableCell, { width: 80, textAlign: 'right' }]}>
                ₹{formatIndianNumber(parseFloat(shade.rate))}
            </Text>
            <Text style={[styles.tableCell, { width: 100, textAlign: 'right' }]}>
                ₹{formatIndianNumber(parseFloat(shade.quantity) * parseFloat(shade.rate))}
            </Text>
        </View>
    );

    // Render item group
    const renderItemGroup = (itemtitlecode: string) => {
        const shades = groupedShades[itemtitlecode];
        const item = inquiry.party.items.find(it => it.itemtitlecode === itemtitlecode);
        if (!item) return null;

        const { qty, amount } = getItemTotals(shades);

        return (
            <View style={styles.itemGroup} key={itemtitlecode}>
                <TouchableOpacity
                    style={styles.itemHeader}
                    onPress={() => toggleItem(itemtitlecode)}
                >
                    <View style={styles.itemHeaderLeft}>
                        <Icon
                            name={expandedItems.has(itemtitlecode) ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={theme.TEXT_SECONDARY}
                        />
                        <Text style={styles.itemTitle}>{item.itemtitle} ({shades.length})</Text>
                    </View>
                </TouchableOpacity>
                {expandedItems.has(itemtitlecode) && (
                    <>
                        {shades.map((shade, index) => renderShadeRow(shade, index))}
                        <View style={styles.itemFooter}>
                            <Text style={[styles.itemFooterText, { width: 150, textAlign: 'left' }]}>Item Total</Text>
                            <Text style={[styles.itemFooterTotal, { width: 80, textAlign: 'right' }]}>
                                {formatIndianNumber(qty)}
                            </Text>
                            <Text style={[styles.itemFooterTotal, { width: 80, textAlign: 'right' }]}>-</Text>
                            <Text style={[styles.itemFooterTotal, { width: 100, textAlign: 'right' }]}>
                                ₹{formatIndianNumber(amount)}
                            </Text>
                        </View>
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={isFullScreen ? styles.fullScreenContainer : styles.modalContainer}>
            {!isFullScreen && (
                <>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Icon name="close" size={24} color={theme.TEXT_SECONDARY} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{inquiry.party.partyname}</Text>

                    {/* Common Info Header */}
                    <View style={styles.commonInfoHeader}>
                        <View style={styles.commonInfoRow}>
                            <Text style={styles.commonInfoLabel}>Delivery Date:</Text>
                            <Text style={styles.commonInfoValue}>{commonDeliveryDate}</Text>
                        </View>
                        <View style={styles.commonInfoRow}>
                            <Text style={styles.commonInfoLabel}>Remarks:</Text>
                            <Text style={[styles.commonInfoValue, { flex: 1, flexWrap: 'wrap' }]}>{commonRemarks}</Text>
                        </View>
                    </View>
                </>
            )}

            {/* Search Bar with Full Screen Icon */}
            <View style={[styles.searchContainer, isFullScreen ? styles.fullScreenSearch : null]}>
                <Icon name="search" size={20} color={theme.TEXT_SECONDARY} style={styles.searchIcon} />
                <TextInput
                    style={isFullScreen ? styles.fullScreenSearchInput : styles.searchInput}
                    placeholder="Search..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {!isFullScreen && (
                    <TouchableOpacity onPress={toggleFullScreen} style={styles.fullScreenIcon}>
                        <Icon name="fullscreen" size={22} color={theme.TEXT_SECONDARY} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Table */}
            <ScrollView horizontal style={styles.tableScrollView}>
                <View style={[styles.tableWrapper, isFullScreen ? styles.fullScreenTable : null]}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { width: 150, textAlign: 'left' }]}>Shade Name</Text>
                        <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Rate</Text>
                        <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'right' }]}>Amount</Text>
                    </View>

                    {/* Table Body */}
                    <FlatList
                        data={Object.keys(groupedShades)}
                        keyExtractor={itemtitlecode => itemtitlecode}
                        renderItem={({ item: itemtitlecode }) => renderItemGroup(itemtitlecode)}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={10}
                    />

                    {/* Grand Total Footer */}
                    <View style={styles.grandTotalFooter}>
                        <Text style={[styles.grandTotalText, { width: 150, textAlign: 'left' }]}>Grand Total</Text>
                        <Text style={[styles.grandTotalAmount, { width: 80, textAlign: 'right' }]}>
                            {formatIndianNumber(grandTotals.qty)}
                        </Text>
                        <Text style={[styles.grandTotalAmount, { width: 80, textAlign: 'right' }]}>-</Text>
                        <Text style={[styles.grandTotalAmount, { width: 100, textAlign: 'right' }]}>
                            ₹{formatIndianNumber(grandTotals.amount)}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {isFullScreen && (
                <TouchableOpacity style={styles.fullScreenCloseButton} onPress={toggleFullScreen}>
                    <Icon name="close" size={24} color={theme.TEXT_SECONDARY} />
                </TouchableOpacity>
            )}
        </View>
    );
};


const CollectionCard: React.FC<{
    gePOTData?: Inquiry[];
    searchQueryPOT?: string;
    isConnected?: boolean | null;
    setIsLoggedIn?: (v: boolean) => void;
}> = ({ gePOTData = [], searchQueryPOT = '', isConnected, setIsLoggedIn }) => {
    const [data, setData] = useState<Inquiry[]>(gePOTData);
    const [activeTab, setActiveTab] = useState<StatusType>('All');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

    useEffect(() => {
        setData(gePOTData);
    }, [gePOTData]);

    const filteredByStatus = useMemo(() => {
        if (activeTab === 'All') return data;
        return data.filter(d => d.status === activeTab);
    }, [data, activeTab]);

    const filteredData = useMemo(() => {
        if (!searchQueryPOT.trim()) return filteredByStatus;
        const q = searchQueryPOT.toLowerCase();
        return filteredByStatus.filter(it => JSON.stringify(it).toLowerCase().includes(q));
    }, [filteredByStatus, searchQueryPOT]);

    const getStatusCounts = () => {
        const counts = { All: data.length, P: 0, R: 0, C: 0, Ca: 0 };
        data.forEach(d => {
            if (d.status in counts) {
                counts[d.status]++;
            }
        });
        return counts;
    };

    const renderShades = (shades: Inquiry['party']['items'][0]['shades']) => (
        <View style={styles.shadeContainer}>
            <FlatList
                data={shades}
                keyExtractor={(sh, i) => `${sh.shadecode}-${i}`}
                renderItem={({ item: sh }) => (
                    <View style={styles.shadeRow}>
                        <Text style={styles.shadeName}>{sh.shadename}</Text>
                        <View style={styles.shadeMeta}>
                            <Text style={styles.metaText}>Qty: {sh.quantity}</Text>
                            <Text style={styles.metaText}>Rate: ₹{sh.rate}</Text>
                            <Text style={styles.amountText}>Amt: ₹{(parseFloat(sh.quantity) * parseFloat(sh.rate)).toFixed(2)}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderInquiry = ({ item }: { item: Inquiry }) => {
        const statusLabel = STATUS_TABS.find(tab => tab.key === item.status)?.label || item.status;
        const statusColor = {
            'Pending': '#FFA500',
            'Running': '#0000FF',
            'Closed': '#008000',
            'Cancelled': '#FF0000'
        }[statusLabel] || '#808080';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    setSelectedInquiry(item);
                    setModalVisible(true);
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.partyName}>{item.party.partyname}</Text>
                        <Text style={styles.jobText}>{item.party.partycode} • {item.yearno} • {item.prpcode}</Text>
                    </View>
                    <View style={[styles.statusTooltip, { backgroundColor: statusColor }]}>
                        <Text style={styles.tooltipText}>{statusLabel}</Text>
                    </View>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.label}>Delivery Date</Text>
                    <Text style={styles.value}>{getRelativeTime(item.deliveryDate)}</Text>
                </View>
                <FlatList
                    data={item.party.items}
                    keyExtractor={(it, idx) => `${it.itemtitlecode}-${idx}`}
                    renderItem={({ item: it }) => (
                        <View style={styles.itemBox}>
                            <TouchableOpacity
                                style={styles.itemHeader}
                                onPress={() => setExpandedItemId(expandedItemId === it.itemtitlecode ? null : it.itemtitlecode)}
                            >
                                <View style={styles.itemHeaderLeft}>
                                    <Icon name="shopping-cart" size={14} color={theme.TEXT_SECONDARY} style={{ marginRight: 6 }} />
                                    <Text style={styles.itemTitle}>{it.itemtitle}</Text>
                                </View>
                                <View style={styles.itemHeaderRight}>
                                    <Text style={styles.itemCount}>({it.shades.length})</Text>
                                    <Icon name={expandedItemId === it.itemtitlecode ? 'expand-less' : 'expand-more'} size={22} color={theme.TEXT_SECONDARY} />
                                </View>
                            </TouchableOpacity>
                            {expandedItemId === it.itemtitlecode && renderShades(it.shades)}
                        </View>
                    )}
                />
            </TouchableOpacity>
        );
    };

    const renderTabs = () => {
        const statusCounts = getStatusCounts();
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                {STATUS_TABS.map(tab => {
                    const active = activeTab === tab.key;
                    const color = active ? theme.BRAND_ACCENT : theme.TEXT_SECONDARY;
                    const count = statusCounts[tab.key];
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.75}
                        >
                            <Icon name={tab.icon} size={18} color={color} />
                            <Text style={[styles.tabText, { color }]}>
                                {tab.label} ({count})
                            </Text>
                            {active && <View style={styles.tabUnderline} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

    return (
        <>
            <Footer onLogout={() => setIsLoggedIn?.(false)} isConnected={isConnected} />
            <SafeAreaView style={styles.container}>
                <FlatList
                    data={filteredData}
                    keyExtractor={(it, idx) => `${it.id}-${idx}`}
                    renderItem={renderInquiry}
                    ListHeaderComponent={renderTabs}
                    stickyHeaderIndices={[0]}
                    contentContainerStyle={{ paddingBottom: 120 }}
                />
            </SafeAreaView>
            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                {selectedInquiry && <ModalTable inquiry={selectedInquiry} onClose={() => setModalVisible(false)} />}
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.BG || '#f6f7fa' },
    tabScroll: { paddingHorizontal: 12, backgroundColor: '#fff', height: 56, alignItems: 'center' },
    tabItem: { minWidth: 130, height: 56, marginRight: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    tabText: { marginLeft: 6, fontSize: 13, fontWeight: '800' },
    tabUnderline: { position: 'absolute', bottom: 0, height: 3, width: '100%', borderRadius: 3, backgroundColor: theme.BRAND_ACCENT },
    card: { marginHorizontal: 12, marginVertical: 10, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    partyName: { fontSize: 15, fontWeight: '800', color: theme.BRAND_DARK },
    jobText: { fontSize: 12, marginTop: 2, color: theme.TEXT_SECONDARY },
    statusTooltip: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    tooltipText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    label: { fontSize: 12, color: '#888' },
    value: { fontSize: 12, fontWeight: '700', color: '#222' },
    itemBox: { marginTop: 8, borderRadius: 12, backgroundColor: '#f7f8fa', overflow: 'hidden' },
    itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#eef1f4' },
    itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
    itemHeaderRight: { flexDirection: 'row', alignItems: 'center' },
    itemTitle: { fontSize: 13, fontWeight: '800', color: '#222', flexShrink: 1 },
    itemCount: { fontSize: 12, fontWeight: '700', color: theme.TEXT_SECONDARY, marginRight: 4 },
    shadeContainer: { padding: 12 },
    shadeRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
    shadeName: { fontSize: 12, fontWeight: '700', color: '#222' },
    shadeMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    metaText: { fontSize: 11, color: '#666' },
    amountText: { fontSize: 11, fontWeight: '900', color: theme.BRAND_ACCENT },
    modalContainer: { flex: 1, backgroundColor: '#fff', padding: 16 },
    closeButton: { alignSelf: 'flex-end', padding: 8 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    // searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 12 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 40, fontSize: 14 },
    fullScreenSearchInput: { flex: 1, height: 40, fontSize: 14, },
    // tableWrapper: { minWidth: 600 },
    tableWrapper: {
        width: '100%',
        minWidth: '100%',
    },
    // tableHeader: { flexDirection: 'row', backgroundColor: '#eef1f4', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
    // tableHeaderText: { fontWeight: 'bold', textAlign: 'center' },
    // tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    // tableCell: { textAlign: 'center', fontSize: 12 },
    itemGroup: { marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
    // itemFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: '#f7f8fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
    // itemFooterText: { fontSize: 12, color: '#666', marginRight: 8 },
    itemFooterAmount: { fontSize: 12, fontWeight: 'bold' },
    // grandTotalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#eef1f4', borderTopWidth: 1, borderTopColor: '#ccc' },
    // grandTotalText: { fontSize: 14, fontWeight: 'bold', marginRight: 8 },
    // grandTotalAmount: { fontSize: 14, fontWeight: 'bold', color: theme.BRAND_ACCENT },
    // 
    // tableHeaderText: {
    //     fontWeight: 'bold',
    //     fontSize: 12,
    //     padding: 8,
    // },
    // tableCell: {
    //     fontSize: 12,
    //     padding: 8,
    // },
    // itemFooterText: {
    //     fontSize: 12,
    //     fontWeight: '600',
    //     color: '#555',
    // },
    // itemFooterTotal: {
    //     fontSize: 12,
    //     fontWeight: 'bold',
    //     color: theme.BRAND_ACCENT,
    // },
    // grandTotalText: {
    //     fontSize: 14,
    //     fontWeight: 'bold',
    //     color: '#333',
    // },
    // grandTotalAmount: {
    //     fontSize: 14,
    //     fontWeight: 'bold',
    //     color: theme.BRAND_ACCENT,
    // },
    deliveryDateSubHeader: {
        backgroundColor: '#f0f8ff',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e6f2ff',
    },
    deliveryDateText: {
        fontSize: 12,
        color: '#0066cc',
        fontWeight: '600',
    },
    commonDeliveryDateHeader: {
        padding: 12,
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        marginBottom: 12,
    },
    commonDeliveryDateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0066cc',
    },
    commonInfoHeader: {
        padding: 12,
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        marginBottom: 12,
    },
    commonInfoRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    commonInfoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0066cc',
        width: 100,
    },
    commonInfoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    // 
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#eef1f4',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    tableHeaderText: {
        fontWeight: 'bold',
        fontSize: 12,
        padding: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        fontSize: 12,
        padding: 4,
    },
    itemFooter: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: '#f7f8fa',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    itemFooterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    itemFooterTotal: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.BRAND_ACCENT,
    },
    grandTotalFooter: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#eef1f4',
        borderTopWidth: 2,
        borderTopColor: theme.BRAND_ACCENT,
    },
    grandTotalText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    grandTotalAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.BRAND_ACCENT,
    },
    // fullScreenContainer: {
    //     position: 'absolute',
    //     top: 0,
    //     left: 0,
    //     right: 0,
    //     bottom: 0,
    //     backgroundColor: '#fff',
    //     zIndex: 1000,
    // },
    fullScreenTitle: {
        marginTop: 40,
    },
    fullScreenIcon: {
        padding: 8,
        marginLeft: 8,
    },
    // fullScreenTable: {
    //     minWidth: '100%',
    // },
    // fullScreenCloseButton: {
    //     position: 'absolute',
    //     top: 10,
    //     right: 10,
    //     padding: 8,
    //     zIndex: 1001,
    // },
    // searchContainer: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginBottom: 12,
    //     backgroundColor: '#f0f0f0',
    //     borderRadius: 8,
    //     paddingHorizontal: 12,
    // },
    // 

    fullScreenScroll: {
        flex: 1,
    },



    // 
    fullScreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        padding: 0,
        zIndex: 1000,
    },
    fullScreenSearch: {
        marginTop: 10,
        marginHorizontal: 10,
        marginBottom: 0,
    },
    tableScrollView: {
        flex: 1,
    },
    fullScreenTable: {
        width: '100%',
        minWidth: '100%',
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 8,
        zIndex: 1001,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingHorizontal: 12,
    },


});

export default CollectionCard;
