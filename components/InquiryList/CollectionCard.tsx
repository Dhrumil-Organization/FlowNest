import React, { useEffect, useMemo, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';
import Footer from '../Footer/Footer';

type Inquiry = any;

const STATUS_TABS = [
    { key: 'All', label: 'All', icon: 'list' }, // ✅ NEW
    { key: 'Pending', label: 'Pending', icon: 'hourglass-empty' },
    { key: 'Running', label: 'Running', icon: 'sync' },
    { key: 'Closed', label: 'Closed', icon: 'check-circle' },
    { key: 'Cancelled', label: 'Cancelled', icon: 'cancel' },
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

const CollectionCard: React.FC<{
    gePOTData?: Inquiry[];
    searchQueryPOT?: string;
    isConnected?: boolean | null;
    setIsLoggedIn?: (v: boolean) => void;
}> = ({
    gePOTData = [],
    searchQueryPOT = '',
    isConnected,
    setIsLoggedIn,
}) => {
        const [data, setData] = useState<Inquiry[]>([]);
        const [activeTab, setActiveTab] = useState<StatusType>('All');
        const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
        const tabScrollRef = React.useRef<ScrollView>(null);
        const tabLayouts = React.useRef<Record<string, number>>({});

        useEffect(() => {
            setData(Array.isArray(gePOTData) ? gePOTData : []);
        }, [gePOTData]);



        useEffect(() => {
            const x = tabLayouts.current[activeTab];
            if (x != null && tabScrollRef.current) {
                tabScrollRef.current.scrollTo({
                    x: Math.max(x - 24, 0),
                    animated: true,
                });
            }
        }, [activeTab]);

        const onTabLayout = (key: string, x: number) => {
            tabLayouts.current[key] = x;
        };



        /** status-wise filter */
        const filteredByStatus = useMemo(() => {
            if (activeTab === 'All') return data;

            return data.filter(
                d =>
                    String(d.status || '').toLowerCase() ===
                    activeTab.toLowerCase()
            );
        }, [data, activeTab]);


        /** search filter */
        const filteredData = useMemo(() => {
            if (!searchQueryPOT.trim()) return filteredByStatus;
            const q = searchQueryPOT.toLowerCase();
            return filteredByStatus.filter(it =>
                JSON.stringify(it).toLowerCase().includes(q)
            );
        }, [filteredByStatus, searchQueryPOT]);

        const calcAmount = (qty: any, rate: any) => {
            const q = parseFloat(qty || 0);
            const r = parseFloat(rate || 0);
            return (q * r).toFixed(2);
        };


        const renderShades = (shades: any[]) => (
            // <View style={{ height: 170 }}>
            <View>
                <FlatList
                    data={shades || []}
                    keyExtractor={(sh, i) => sh._id ?? String(i)}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    renderItem={({ item: sh }) => {
                        const qty = Number(sh.quantity || 0);
                        const rate = Number(sh.rate || 0);
                        const amount = (qty * rate).toFixed(2);

                        return (
                            <View style={styles.shadeRow}>
                                {/* Shade Name */}
                                <Text style={styles.shadeName} numberOfLines={1}>
                                    {sh.shadename}
                                </Text>

                                {/* Meta Row */}
                                <View style={styles.shadeMeta}>
                                    <Text style={styles.metaText}>Qty: {qty}</Text>
                                    <Text style={styles.metaText}>Rate: ₹{rate}</Text>
                                    <Text style={styles.amountText}>
                                        Amt: ₹{amount}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
        );



        const renderInquiry = ({ item }: { item: Inquiry }) => {
            const party = item.data?.[0];

            return (
                <View style={styles.card}>
                    {/* ===== CARD HEADER ===== */}
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.partyName}>
                                {party?.partyname ?? 'Unknown Party'}
                            </Text>

                            <Text style={styles.jobText}>
                                {party?.partycode} • {item.yearno} • {item.prpcode}
                            </Text>
                            {/* <Text style={styles.jobText}>
                                {item.prpcode} • FY-{item.yearno}
                            </Text> */}
                        </View>

                        <View style={[styles.statusPill, styles[`pill${item.status}`]]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>

                    {/* ===== DETAILS ===== */}
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Delivery Date</Text>
                        <Text style={styles.value}>
                            {formatDate(item.deliveryDate)}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Remark</Text>
                        <Text style={styles.value} numberOfLines={1}>
                            {item.remarks || '-'}
                        </Text>
                    </View>

                    {/* ===== ITEMS (Accordion) ===== */}
                    {/* <View style={{ marginTop: 10, height: 240 }}> */}
                    <View style={{ marginTop: 10 }}>
                        <FlatList
                            data={party?.items || []}
                            keyExtractor={(it, idx) => it._id ?? String(idx)}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                            renderItem={({ item: it }) => {
                                const expanded = expandedItemId === it._id;

                                return (
                                    <View style={styles.itemBox}>
                                        <TouchableOpacity
                                            style={styles.itemHeader}
                                            onPress={() =>
                                                setExpandedItemId(expanded ? null : it._id)
                                            }
                                        >
                                            {/* LEFT SIDE */}
                                            <View style={styles.itemHeaderLeft}>
                                                <Icon
                                                    name="shopping-cart"
                                                    size={14}
                                                    color={theme.TEXT_SECONDARY}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text
                                                    style={styles.itemTitle}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {it.itemtitle}
                                                </Text>
                                            </View>

                                            {/* RIGHT SIDE */}
                                            <View style={styles.itemHeaderRight}>
                                                <Text style={styles.itemCount}>
                                                    ({it.shades?.length || 0})
                                                </Text>
                                                <Icon
                                                    name={expanded ? 'expand-less' : 'expand-more'}
                                                    size={22}
                                                    color={theme.TEXT_SECONDARY}
                                                />
                                            </View>
                                        </TouchableOpacity>


                                        {expanded && renderShades(it.shades)}
                                    </View>
                                );
                            }}
                        />
                    </View>

                </View>
            );
        };

        const tabCounts = useMemo(() => {
            const counts: Record<string, number> = {
                All: data.length,
            };

            STATUS_TABS.forEach(tab => {
                if (tab.key !== 'All') {
                    counts[tab.key] = data.filter(
                        d => String(d.status) === tab.key
                    ).length;
                }
            });

            return counts;
        }, [data]);


        const renderTabs = React.useMemo(
            () => (
                <ScrollView
                    ref={tabScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabScroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {STATUS_TABS.map(tab => {
                        const active = activeTab === tab.key;
                        const color = active
                            ? theme.BRAND_ACCENT
                            : theme.TEXT_SECONDARY;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tabItem}
                                onPress={() => setActiveTab(tab.key)}
                                onLayout={e =>
                                    onTabLayout(tab.key, e.nativeEvent.layout.x)
                                }
                                activeOpacity={0.75}
                            >
                                <Icon name={tab.icon} size={18} color={color} />
                                <Text style={[styles.tabText, { color }]}>
                                    {tab.label} ({tabCounts[tab.key] ?? 0})
                                </Text>

                                {active && <View style={styles.tabUnderline} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ),
            [activeTab, tabCounts]
        );






        return (
            <>
                <Footer
                    onLogout={() => setIsLoggedIn?.(false)}
                    isConnected={isConnected}
                />

                <SafeAreaView style={styles.container}>
                    <FlatList
                        data={filteredData}
                        keyExtractor={(it, idx) => it._id ?? String(idx)}
                        renderItem={renderInquiry}
                        ListHeaderComponent={renderTabs}
                        stickyHeaderIndices={[0]}   // 🔥 optional (tabs sticky)
                        contentContainerStyle={{ paddingBottom: 120 }}
                    />

                </SafeAreaView>

            </>
        );
    };

export default CollectionCard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.BG || '#f6f7fa',
    },

    /* ===== TABS (FIXED HEIGHT) ===== */
    /* ===== TABS ===== */
    tabScroll: {
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        height: 56,                 // 🔥 FIXED HEIGHT (NO JUMP)
        alignItems: 'center',
    },

    tabItem: {
        minWidth: 130,              // 🔥 TAB BADA
        height: 56,
        marginRight: 14,
        paddingHorizontal: 16,

        flexDirection: 'row',       // icon + text side-by-side
        alignItems: 'center',
        justifyContent: 'center',

        borderRadius: 12,
        // backgroundColor: '#f3f5f8',
    },

    tabItemActive: {
        backgroundColor: '#fff',    // clean active look
    },

    tabText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '800',
    },

    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '100%',
        borderRadius: 3,
        backgroundColor: theme.BRAND_ACCENT,
    },

    /* ===== CARD ===== */
    card: {
        marginHorizontal: 12,
        marginVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        elevation: 2,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    partyName: {
        fontSize: 15,
        fontWeight: '800',
        color: theme.BRAND_DARK,
    },
    jobText: {
        fontSize: 12,
        marginTop: 2,
        color: theme.TEXT_SECONDARY,
    },

    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.TEXT_SECONDARY,
    },

    pillPending: { backgroundColor: '#fff1d6', height: 26 },
    pillRunning: { backgroundColor: '#e3f2fd', height: 26 },
    pillClosed: { backgroundColor: '#e6f6ec', height: 26 },
    pillCancelled: { backgroundColor: '#fdecea', height: 26 },

    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    label: {
        fontSize: 12,
        color: '#888',
    },
    value: {
        fontSize: 12,
        fontWeight: '700',
        color: '#222',
    },

    /* ===== ITEMS ===== */
    itemBox: {
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: '#f7f8fa',
        overflow: 'hidden',
    },

    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#eef1f4',
    },

    itemHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,              // 🔥 text ko space mile
        paddingRight: 8,
    },

    itemHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    itemTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#222',
        flexShrink: 1,        // 🔥 long name cut ho jaaye
    },

    itemCount: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.TEXT_SECONDARY,
        marginRight: 4,
    },

    shadeRow: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },

    shadeName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#222',
    },

    shadeMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },

    metaText: {
        fontSize: 11,
        color: '#666',
    },

    amountText: {
        fontSize: 11,
        fontWeight: '900',
        color: theme.BRAND_ACCENT,
    },



    remarkText: {
        fontSize: 11,
        marginTop: 4,
        color: '#666',
    },

    empty: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
    },
});

