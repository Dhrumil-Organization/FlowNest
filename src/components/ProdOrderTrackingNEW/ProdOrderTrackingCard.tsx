import AppAlert from '@/common/utils/appAlert';

import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { API } from '../../common/API/dynamicAPI';
import { Btn, CONTENT_MAX, EmptyState, Kpi, KpiGrid, SectionHead, Sheet, cellWidth, useSotLayout } from '../erpUi';
import { CardPayload, LabelMap, POTDataProps, StageData } from './Modal';

const ProdOrderTrackingCard: React.FC<POTDataProps> = ({
    gePOTData,
    searchQueryPOT,
    getpayload,
    token,
    parentDesignData,
    onOpenFilters
}) => {
    const [filteredData, setFilteredData] = useState(gePOTData || []);
    const [getStageData, setStageData] = useState<StageData[]>([]);
    const [isStageLoading, setStageLoading] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [allData, setAllData] = useState(gePOTData || []);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const { width: screenWidth } = useWindowDimensions();

    const { width } = useWindowDimensions();

    const getColumns = () => {
        if (width < 600) return 1;      // mobile
        if (width < 1000) return 2;     // tablet
        return 3;                       // web / large
    };

    const numColumns = getColumns();

    // Explicit item width so the last row doesn't stretch weirdly
    const GRID_PAD = 10;
    const GRID_GAP = 10;
    const gridItemWidth =
        numColumns > 1
            ? (width - GRID_PAD * 2 - GRID_GAP * (numColumns - 1)) / numColumns
            : width;

    // useEffect(() => {
    //     if (!searchQueryPOT.trim()) {
    //         setFilteredData(gePOTData || []);
    //     } else {
    //         const filtered = (gePOTData || []).filter((item) =>
    //             Object.values(item).some(
    //                 (value) =>
    //                     typeof value === 'string' &&
    //                     value.toLowerCase().includes(searchQueryPOT.toLowerCase())
    //             )
    //         );
    //         setFilteredData(filtered);
    //     }
    // }, [gePOTData, searchQueryPOT]);

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
                // parent.pdesign.toLowerCase().includes(searchQueryPOT.toLowerCase())
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
        setSelectedCardId(item.uid);
        setStageLoading(true);
        console.log('Selected Card Data:', item);
        const getpayloadsend = getpayload as object as CardPayload[];
        const infoPyload = { ...getpayloadsend[0], rowdata: [item] };
        console.log('infoPyload:', infoPyload);
        handleConfirmAction(infoPyload);
    };

    const getToken = () => {
        return token;
    };

    const handleConfirmAction = async (infoPyload: CardPayload) => {
        console.log('🔵 Send Row payload', infoPyload);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            // const response = await axios.post(`https://apig.tms-webapp.com/api/prodordertrack`, infoPyload, { headers });
            const response = await axios.post(`${API}/api/prodordertrack`, infoPyload, { headers });
            if (response.data.success && response.data.data) {
                const { data: responseData, caption, stages } = response.data.data;

                const isValidValue = (val: any) => {
                    if (val === null || val === undefined) return false;
                    if (val === '') return false;
                    if (!isNaN(val) && val !== true && val !== false) {
                        const numVal = parseFloat(val);
                        return !(isNaN(numVal) || numVal === 0);
                    }
                    return true;
                };

                const formatValue = (val: any, key: any) => {
                    if (key === 'prodorderno' || key === 'dsnname') {
                        return val;
                    }
                    if (!isNaN(val) && val !== '' && val !== null && val !== undefined) {
                        return parseFloat(val).toFixed(2);
                    }
                    return val;
                };

                const stagesData = stages
                    .map((stageKey: string | number) => {
                        const rawVal = responseData[stageKey];
                        if (!isValidValue(rawVal)) return null;
                        const formattedVal = formatValue(rawVal, stageKey);
                        return {
                            stage: caption[stageKey] || stageKey,
                            qty: formattedVal
                        };
                    })
                    .filter(Boolean);

                console.log('Final Stages Data:', stagesData);
                setStageData(stagesData);
                setStageLoading(false);
                setModalVisible(true);
            } else {
                setStageLoading(false);
                console.error('Unexpected response structure:', response.data);
                AppAlert.alert(`${response.data}`);
            }
        } catch (error) {
            setStageLoading(false);
            AppAlert.alert('Server Error');
        }
    };

    const labelMap: LabelMap = {
        prpcode: { label: 'Property' },
        vouno: { label: 'Vou No' },
        voudate: { label: 'Date' },
        accname: { label: 'Party Name', hide: true },
        uid: { label: 'UID', hide: true },
        sexename: { label: 'Sales Executive' },
        dsnname: { label: 'Design Name' },
        itmname: { label: 'Item Name' },
        ptype: { label: 'Product Type' },
    };

    const CircularProgress = ({ pendingPercent }: { pendingPercent: number }) => {
        const size = 60;
        const strokeWidth = 6;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (pendingPercent / 100) * circumference;

        return (
            <View style={styles.circularProgressContainer}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={T.alt}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={pendingPercent > 50 ? T.red : T.green}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                        />
                    </G>
                </Svg>
                <Text style={styles.circularProgressText}>{pendingPercent.toFixed(0)}%</Text>
            </View>
        );
    };

    // Production pie (same maths as before): green = completed share,
    // copper = still pending. Drawn as a donut with the % in the middle.
    const PieProgress = ({ pendingPercent }) => {
        const size = 66;
        const radius = size / 2;

        // Handle all cases
        let displayPercent;
        let showFullGreen = false;

        if (pendingPercent < 0) {
            // Negative pending = 100% complete (full green)
            displayPercent = 100;
            showFullGreen = true;
        } else if (pendingPercent >= 100) {
            // 100% or more pending = 0% complete (full red)
            displayPercent = 0;
        } else {
            // Normal case
            displayPercent = 100 - pendingPercent;
        }

        const greenPercent = displayPercent;
        const redPercent = 100 - displayPercent;

        // Calculate paths only if not showing full circle
        let greenPath = '', redPath = '';

        if (!showFullGreen && greenPercent > 0) {
            greenPath = `
              M${radius},${radius}
              L${radius},0
              A${radius},${radius} 0 ${greenPercent > 50 ? 1 : 0},1 ${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
              Z
            `;
        }

        if (!showFullGreen && redPercent > 0) {
            redPath = `
              M${radius},${radius}
              L${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
              A${radius},${radius} 0 ${redPercent > 50 ? 1 : 0},1 ${radius},0
              Z
            `;
        }

        const done = showFullGreen || greenPercent >= 100;
        return (
            <View style={[styles.pieContainer, { width: size, height: size }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* track = pending colour */}
                    <Circle cx={radius} cy={radius} r={radius} fill={T.copper} />
                    {/* Full green: negative pending or nothing pending */}
                    {done && <Circle cx={radius} cy={radius} r={radius} fill={T.green} />}
                    {/* Normal pie */}
                    {!done && greenPercent > 0 && <Path d={greenPath} fill={T.green} />}
                    {!done && redPercent > 0 && greenPercent !== 100 && <Path d={redPath} fill={T.copper} />}
                </Svg>
                <View style={styles.pieHole}>
                    <Text style={styles.pieText}>{displayPercent.toFixed(0)}%</Text>
                    <Text style={styles.pieSub}>done</Text>
                </View>
            </View>
        );
    };

    const renderQuantityGraph = (item: any) => {
        const totalQty = parseFloat(item.totqty) || 1;
        const producedQty = parseFloat(item.producedqty) || 0;
        const remainingQty = parseFloat(item.prodpending) || 0;
        const pendingPercent = parseFloat(item.pendingperc) || 0;
        const producedWidth = (producedQty / totalQty) * 100;
        const remainingWidth = (remainingQty / totalQty) * 100;

        return (
            <View style={styles.graphContainer}>
                <View style={styles.graphHeader}>
                    <PieProgress pendingPercent={pendingPercent} />
                    <View style={styles.graphLabels}>
                        <Text style={styles.graphHeaderText}>Production Status</Text>
                        <View style={styles.graphLabelRow}>
                            <View style={styles.graphLabelPair}>
                                <Text style={styles.graphLabel}>Total</Text>
                                <Text style={styles.graphValue} numberOfLines={1}>{totalQty.toFixed(2)}</Text>
                            </View>
                            <View style={styles.graphLabelPair}>
                                <Text style={styles.graphLabel}>Produced</Text>
                                <Text style={[styles.graphValue, { color: T.green }]} numberOfLines={1}>{producedQty.toFixed(2)}</Text>
                            </View>
                        </View>
                        <View style={styles.graphLabelRow}>
                            <View style={styles.graphLabelPair}>
                                <Text style={styles.graphLabel}>Remaining</Text>
                                <Text style={[styles.graphValue, { color: T.copper }]} numberOfLines={1}>{remainingQty.toFixed(2)}</Text>
                            </View>
                            <View style={styles.graphLabelPair}>
                                <Text style={styles.graphLabel}>Pending</Text>
                                <Text style={[styles.graphValue, { color: T.pd }]} numberOfLines={1}>{pendingPercent.toFixed(2)}%</Text>
                            </View>
                        </View>
                    </View>
                </View>
                {/* Produced vs remaining split of the total quantity */}
                <View style={styles.linearGraphBackground}>
                    <View style={[styles.linearGraphProduced, { width: `${Math.max(0, Math.min(100, producedWidth))}%` }]} />
                    <View style={[styles.linearGraphRemaining, { width: `${Math.max(0, Math.min(100 - Math.max(0, Math.min(100, producedWidth)), remainingWidth))}%` }]} />
                </View>
            </View>
        );
    };

    const renderStageTableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Stage</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Qty</Text>
        </View>
    );

    // Load more data on scroll
    const loadMoreData = () => {
        if (isLoadingMore || (searchQueryPOT.trim() && filteredData.length <= page * 10)) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            // Filtered data par kaam karna hai
            const nextPageData = filteredData.slice(0, (page + 1) * 10);
            setAllData(nextPageData);
            setPage(page + 1);
            setIsLoadingMore(false);
        }, 500); // Simulate network delay
    };


    // ---------------------------------------------------------------------
    // NEW ERP UI (presentation only).
    // ---------------------------------------------------------------------
    const { isPhone, cols, gutter } = useSotLayout();
    const num = (v: any) => {
        const x = parseFloat(String(v ?? ''));
        return Number.isFinite(x) ? x : 0;
    };
    const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sumOf = (key: string) => filteredData.reduce((acc: number, r: any) => acc + num(r[key]), 0);
    const totTotal = sumOf('totqty');
    const totProduced = sumOf('producedqty');
    const totPending = sumOf('prodpending');
    const selectedCard: any =
        (filteredData || []).find((r: any) => r.uid === selectedCardId) ||
        (gePOTData || []).find((r: any) => r.uid === selectedCardId);
    const stageMax = getStageData.reduce((m, s) => {
        const isNum = s.qty !== '' && s.qty !== null && s.qty !== undefined && !isNaN(s.qty as any);
        return isNum ? Math.max(m, num(s.qty)) : m;
    }, 0);

    const renderCard = ({ item }: { item: any }) => {
        const loadingThis = isStageLoading && selectedCardId === item.uid;
        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIcon}>
                            <Icon name="precision-manufacturing" size={18} color={T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.cardTitle} numberOfLines={2}>{item.dsnname}</Text>
                            <Text style={styles.cardSub} numberOfLines={1}>
                                {item.vouno}{item.voudate ? `  ·  ${item.voudate}` : ''}
                            </Text>
                        </View>
                        <Btn
                            label="Stages"
                            icon="info"
                            kind="soft"
                            compact
                            loading={loadingThis}
                            onPress={() => handleCardPress(item)}
                            style={styles.stageBtn}
                        />
                    </View>
                    <View style={styles.cardBody}>
                        {Object.entries(labelMap).map(([key, config]) => {
                            if (config.hide) return null;
                            return (
                                <View key={key} style={styles.cardRow}>
                                    <Text style={styles.cardLabel} numberOfLines={1}>{config.label}</Text>
                                    <Text style={styles.cardValue} numberOfLines={2}>{item[key] || '—'}</Text>
                                </View>
                            );
                        })}
                    </View>
                    {renderQuantityGraph(item)}
                </View>
            </View>
        );
    };

    const listHeader =
        filteredData.length > 0 ? (
            <View style={styles.listHeader}>
                <KpiGrid isPhone={isPhone}>
                    <Kpi label="Orders" icon="receipt-long" accent={T.blue} value={String(filteredData.length)} />
                    <Kpi label="Total Qty" icon="straighten" accent={T.nav} value={fmt(totTotal)} />
                    <Kpi
                        label="Produced"
                        icon="check-circle"
                        accent={T.green}
                        valueColor={T.green}
                        value={fmt(totProduced)}
                        sub={totTotal > 0 ? `${Math.round((totProduced / totTotal) * 100)}% of total` : undefined}
                    />
                    <Kpi
                        label="Remaining"
                        icon="pending-actions"
                        accent={T.copper}
                        valueColor={T.copper}
                        value={fmt(totPending)}
                        sub={totTotal > 0 ? `${Math.round((totPending / totTotal) * 100)}% of total` : undefined}
                    />
                </KpiGrid>
                <SectionHead
                    title="Production Orders"
                    meta={`${allData.length} shown · ${filteredData.length} total`}
                />
            </View>
        ) : null;

    return (
        <View style={styles.container}>
            <FlatList
                key={`pot-grid-${cols}`}
                data={allData}
                numColumns={cols}
                style={{ flex: 1 }}
                renderItem={({ item }) => renderCard({ item })}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
                onEndReached={loadMoreData}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={listHeader}
                ListFooterComponent={
                    isLoadingMore ? <ActivityIndicator size="small" color={T.copper} style={styles.footerSpinner} /> : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        {(gePOTData || []).length > 0 && searchQueryPOT.trim() ? (
                            <EmptyState
                                icon="search-off"
                                title="No data found!"
                                text={`No production order matches “${searchQueryPOT.trim()}”. Try a design, parent design, item or voucher no.`}
                            />
                        ) : (
                            <EmptyState
                                icon="precision-manufacturing"
                                title="No data found!"
                                text="Open Filters, choose the date range, year and filters, then tap Load to track production orders."
                                action={
                                    onOpenFilters ? (
                                        <Btn label="Open Filters" icon="tune" onPress={onOpenFilters} compact />
                                    ) : undefined
                                }
                            />
                        )}
                    </View>
                }
            />

            {/* Stage info (was a full-screen white modal) */}
            <Sheet
                open={modalVisible}
                onClose={() => {
                    setModalVisible(!modalVisible);
                }}
                eyebrow="PRODUCTION ORDER TRACKING"
                title="Production Stages"
                wideMax={560}
                footer={
                    <Btn label="Close" kind="ghost" onPress={() => setModalVisible(!modalVisible)} style={{ flex: 1 }} />
                }
            >
                {selectedCard ? (
                    <View style={styles.stageSummary}>
                        <View style={styles.cardIcon}>
                            <Icon name="precision-manufacturing" size={18} color={T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.cardTitle} numberOfLines={2}>{selectedCard.dsnname}</Text>
                            <Text style={styles.cardSub} numberOfLines={1}>
                                {[selectedCard.vouno, selectedCard.voudate, selectedCard.itmname].filter(Boolean).join('  ·  ')}
                            </Text>
                        </View>
                    </View>
                ) : null}
                <View style={styles.tableContainer}>
                    {renderStageTableHeader()}
                    {getStageData.map((item, index) => {
                        const isNum = item.qty !== '' && item.qty !== null && item.qty !== undefined && !isNaN(item.qty as any);
                        const w = isNum && stageMax > 0 ? Math.max(2, Math.min(100, (num(item.qty) / stageMax) * 100)) : 0;
                        return (
                            <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]} key={index}>
                                <View style={styles.tableRowTop}>
                                    <Text style={[styles.tableCellKey, { flex: 2 }]}>{item.stage}</Text>
                                    <Text style={[styles.tableCell, { flex: 1 }, isNum && styles.tableCellNum]}>{item.qty}</Text>
                                </View>
                                {isNum ? (
                                    <View style={styles.stageTrack}>
                                        <View style={[styles.stageFill, { width: `${w}%` }]} />
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                    {!getStageData.length ? <Text style={styles.noStage}>No stage data available.</Text> : null}
                </View>
            </Sheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.bg,
    },
    listContent: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
    gridCell: { padding: 5 },
    footerSpinner: { marginVertical: 16 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // ----- card -----
    card: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    cardSub: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 2 },
    stageBtn: { height: 36, paddingHorizontal: 10 },
    cardBody: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 9,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 10,
    },
    cardRow: {
        width: '50%',
        paddingRight: 8,
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: T.muted,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    cardValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: T.ink,
        marginTop: 2,
    },

    // ----- production graph -----
    graphContainer: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    graphHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    graphHeaderText: {
        fontSize: 10,
        fontWeight: '800',
        color: T.copper,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    circularProgressContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circularProgressText: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: 'bold',
        color: T.ink,
    },
    linearGraphBackground: {
        height: 6,
        borderRadius: 6,
        backgroundColor: T.alt,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    linearGraphProduced: {
        height: '100%',
        backgroundColor: T.green,
    },
    linearGraphRemaining: {
        height: '100%',
        backgroundColor: T.copper,
    },
    graphLabels: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    graphLabelRow: {
        flexDirection: 'row',
        gap: 8,
    },
    graphLabelPair: {
        flex: 1,
        minWidth: 0,
    },
    graphLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: T.muted,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    graphValue: {
        fontSize: 13.5,
        fontWeight: '800',
        color: T.ink,
        marginTop: 1,
    },
    pieContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieHole: {
        position: 'absolute',
        top: 11,
        left: 11,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pieText: {
        fontSize: 13,
        fontWeight: '900',
        color: T.ink,
        textAlign: 'center',
    },
    pieSub: {
        fontSize: 8.5,
        fontWeight: '800',
        color: T.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },

    // ----- stage sheet -----
    stageSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 10,
    },
    tableContainer: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        backgroundColor: T.surface,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: T.nav,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    tableHeaderText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    tableRow: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        gap: 6,
    },
    tableRowAlt: { backgroundColor: T.sub },
    tableRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    tableCell: {
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '700',
        color: T.ink,
    },
    tableCellNum: { fontWeight: '800', color: T.nav },
    tableCellKey: {
        fontSize: 13,
        fontWeight: '600',
        color: T.muted,
    },
    stageTrack: { height: 5, borderRadius: 5, backgroundColor: T.alt, overflow: 'hidden' },
    stageFill: { height: 5, borderRadius: 5, backgroundColor: T.copper },
    noStage: { textAlign: 'center', color: T.muted, fontSize: 12.5, paddingVertical: 16 },
});

export default ProdOrderTrackingCard;
