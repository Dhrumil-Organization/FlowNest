import AsyncStorage from '@/common/utils/compatibleStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    CONTENT_MAX,
    EmptyState,
    PanelHeader,
    SearchBox,
    SectionHead,
    useSotLayout,
} from '../sotUi';

interface GrandTotal {
    [key: string]: number;
}

interface ChallanData {
    chalno: string;
    chaldate: string;
    chalqty: string;
    uid: string;
    dsnname: string;
    shdname: string;
    chalsrno: string;
    data: {
        chaluid: string;
        stepname: string;
        totalqty: string;
        rate: string;
        amount: number;
    }[];
}

interface SOPartyDetailsProps {
    route?: {
        params: {
            party: any;
        };
    };
    token?: string;
    navigation?: any;
    username: string;
    party: any;
    setChallanView: (v: boolean) => void;
    setChallanPartyName: (v: string) => void;
}

// Stage → icon / colour (same keys the legacy carousel used, NEW ERP tokens).
const STAGE_ICONS: Record<string, string> = {
    purchase: 'shopping-cart',
    jobin: 'work',
    jobin_prod: 'factory',
    Repack: 'inventory',
    Grading: 'grade',
};
const STAGE_COLORS: Record<string, string> = {
    purchase: T.green,
    jobin: T.blue,
    jobin_prod: T.copper,
    Repack: T.purple,
    Grading: T.yd,
};

const StageCard = ({ name, value }: { name: string; value: number }) => {
    const color = STAGE_COLORS[name] || T.muted;
    return (
        <View style={styles.stageCard}>
            <View style={[styles.stageIcon, { backgroundColor: `${color}16` }]}>
                <Icon name={(STAGE_ICONS[name] || 'info') as any} size={18} color={color} />
            </View>
            <Text style={styles.stageName} numberOfLines={1}>{name.replace(/_/g, ' ')}</Text>
            <Text style={[styles.stageValue, { color }]} numberOfLines={1}>{value.toLocaleString('en-IN')}</Text>
        </View>
    );
};

const money = (v: number) =>
    v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Collapsible challan card with its step-wise table.
const AccordionTable = ({ data }: { data: ChallanData }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleAccordion = () => setIsOpen(!isOpen);

    const totalQty = data.data.reduce((sum, item) => sum + parseFloat(item.totalqty), 0);
    const totalAmount = data.data.reduce((sum, item) => sum + item.amount, 0);

    // Column widths (table scrolls horizontally on narrow phones)
    const columnWidths = {
        step: 170,
        qty: 96,
        rate: 96,
        amount: 124,
    };

    return (
        <View style={[styles.challanCard, isOpen && styles.challanCardOpen]}>
            <TouchableOpacity style={styles.challanHead} onPress={toggleAccordion} accessibilityRole="button">
                <View style={styles.challanIcon}>
                    <Icon name="description" size={18} color={T.nav} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.challanNumber} numberOfLines={1}>{data.chalno}</Text>
                    <View style={styles.challanMetaRow}>
                        <Icon name="event" size={12} color={T.muted} />
                        <Text style={styles.challanDate}>{data.chaldate}</Text>
                        {!!data.chalqty && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <Text style={styles.challanDate}>{data.chalqty} m</Text>
                            </>
                        )}
                    </View>
                    {!!(data.dsnname || data.shdname) && (
                        <Text style={styles.challanDesign} numberOfLines={1}>
                            {data.dsnname}{data.shdname ? ` · ${data.shdname}` : ''}
                        </Text>
                    )}
                </View>
                <View style={styles.challanAmt}>
                    <Text style={styles.challanAmtLabel}>Amount</Text>
                    <Text style={styles.challanAmtValue}>₹ {money(totalAmount)}</Text>
                </View>
                <Icon name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={T.muted} />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.tableContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
                        <View style={{ flex: 1, minWidth: columnWidths.step + columnWidths.qty + columnWidths.rate + columnWidths.amount }}>
                            <View style={styles.headerRow}>
                                <Text style={[styles.headerCellText, { flex: 1.8, minWidth: columnWidths.step }]}>STEP NAME</Text>
                                <Text style={[styles.headerCellTextRight, { flex: 1, minWidth: columnWidths.qty }]}>QUANTITY</Text>
                                <Text style={[styles.headerCellTextRight, { flex: 1, minWidth: columnWidths.rate }]}>RATE (₹)</Text>
                                <Text style={[styles.headerCellTextRight, { flex: 1.3, minWidth: columnWidths.amount }]}>AMOUNT (₹)</Text>
                            </View>
                            {data.data.map((item, index) => (
                                <View key={index} style={[styles.dataRow, index % 2 === 1 && styles.oddRow]}>
                                    <Text style={[styles.cellText, { flex: 1.8, minWidth: columnWidths.step }]}>{item.stepname}</Text>
                                    <Text style={[styles.cellTextRight, { flex: 1, minWidth: columnWidths.qty }]}>
                                        {parseFloat(item.totalqty).toFixed(2)}
                                    </Text>
                                    <Text style={[styles.cellTextRight, { flex: 1, minWidth: columnWidths.rate }]}>
                                        {parseFloat(item.rate).toFixed(2)}
                                    </Text>
                                    <Text style={[styles.cellTextRight, { flex: 1.3, minWidth: columnWidths.amount }]}>
                                        {money(item.amount)}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.footerRow}>
                                <Text style={[styles.footerCellText, { flex: 1.8, minWidth: columnWidths.step }]}>TOTAL</Text>
                                <Text style={[styles.footerCellTextRight, { flex: 1, minWidth: columnWidths.qty }]}>{totalQty.toFixed(2)}</Text>
                                <Text style={[styles.footerCellTextRight, { flex: 1, minWidth: columnWidths.rate }]}>-</Text>
                                <Text style={[styles.footerCellTextRight, { flex: 1.3, minWidth: columnWidths.amount }]}>{money(totalAmount)}</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const SOPartyDetailsPart1: React.FC<SOPartyDetailsProps> = ({ username, party, setChallanView, setChallanPartyName }) => {
    // const { party } = route.params;
    const params = useLocalSearchParams();
    const { gutter } = useSotLayout();
    // const party = params?.party;
    const [getChallanResponse, setChallanResponse] = useState(null);
    const [renderedChallans, setRenderedChallans] = useState<ChallanData[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredChallans, setFilteredChallans] = useState<ChallanData[]>([]);
    const itemsPerPage = 10;

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const parties_tracking_details_challan_response = await AsyncStorage.getItem('parties_tracking_details_challan_response');
                if (parties_tracking_details_challan_response) {
                    const parsedData = JSON.parse(parties_tracking_details_challan_response);
                    setChallanResponse(parsedData);

                    if (parsedData.data && parsedData.data.data_all) {
                        setFilteredChallans(parsedData.data.data_all);
                        setRenderedChallans(parsedData.data.data_all.slice(0, itemsPerPage));
                    } else if (parsedData.data_all) {
                        setFilteredChallans(parsedData.data_all);
                        setRenderedChallans(parsedData.data_all.slice(0, itemsPerPage));
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initializeApp();
    }, []);

    // Search function that searches through all data
    const searchInChallanData = (challan: ChallanData, query: string): boolean => {
        const lowerQuery = query.toLowerCase();

        // Search in main challan fields
        if (challan.chalno?.toLowerCase().includes(lowerQuery) ||
            challan.chaldate?.toLowerCase().includes(lowerQuery) ||
            challan.dsnname?.toLowerCase().includes(lowerQuery) ||
            challan.shdname?.toLowerCase().includes(lowerQuery) ||
            challan.uid?.toLowerCase().includes(lowerQuery) ||
            challan.chalsrno?.toLowerCase().includes(lowerQuery) ||
            challan.chalqty?.toLowerCase().includes(lowerQuery)) {
            return true;
        }

        // Search in table data
        if (challan.data && Array.isArray(challan.data)) {
            return challan.data.some(item =>
                item.stepname?.toLowerCase().includes(lowerQuery) ||
                item.totalqty?.toLowerCase().includes(lowerQuery) ||
                item.rate?.toLowerCase().includes(lowerQuery) ||
                item.amount?.toString().toLowerCase().includes(lowerQuery) ||
                item.chaluid?.toLowerCase().includes(lowerQuery)
            );
        }

        return false;
    };

    useEffect(() => {
        const debouncedSearch = debounce(() => {
            if (!getChallanResponse) return;

            let dataAll = [];
            if (getChallanResponse.data && getChallanResponse.data.data_all) {
                dataAll = getChallanResponse.data.data_all;
            } else if (getChallanResponse.data_all) {
                dataAll = getChallanResponse.data_all;
            }

            if (dataAll.length === 0) return;

            const query = searchQuery.toLowerCase();

            if (query === '') {
                setFilteredChallans(dataAll);
                setRenderedChallans(dataAll.slice(0, itemsPerPage));
            } else {
                const filtered = dataAll.filter(challan =>
                    searchInChallanData(challan, query)
                );
                setFilteredChallans(filtered);
                setRenderedChallans(filtered.slice(0, itemsPerPage));
            }

            setPage(1);
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [searchQuery, getChallanResponse]);

    const loadMoreChallans = useCallback(() => {
        if (loading || !filteredChallans || renderedChallans.length >= filteredChallans.length) return;

        setLoading(true);
        setTimeout(() => {
            const nextPage = page + 1;
            const startIndex = page * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            setRenderedChallans(prev => [
                ...prev,
                ...filteredChallans.slice(startIndex, endIndex)
            ]);
            setPage(nextPage);
            setLoading(false);
        }, 500);
    }, [page, loading, filteredChallans, renderedChallans]);

    const formatValue = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return value;
        if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
        return num.toFixed(2);
    };

    const partyLabel = typeof party === 'object' ? party?.partyname : party;
    const goBack = () => {
        setChallanView(false)
        setChallanPartyName('')
    };

    if (!getChallanResponse) {
        return (
            <View style={styles.root}>
                <PanelHeader
                    onBack={goBack}
                    crumbs={['Sales Orders', 'Challans']}
                    title={partyLabel || 'Challans'}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={T.copper} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    // Get grand total data - handle different data structures
    let grandTotalData = {};
    if (getChallanResponse.data && getChallanResponse.data.grandtotal) {
        grandTotalData = getChallanResponse.data.grandtotal;
    } else if (getChallanResponse.grandtotal) {
        grandTotalData = getChallanResponse.grandtotal;
    }

    const grandTotalEntries = Object.entries(grandTotalData).map(([key, value]) => ({
        key,
        value: typeof value === 'number' ? value : parseFloat(value as string) || 0
    }));

    // Get data_all - handle different data structures
    let dataAll = [];
    if (getChallanResponse.data && getChallanResponse.data.data_all) {
        dataAll = getChallanResponse.data.data_all;
    } else if (getChallanResponse.data_all) {
        dataAll = getChallanResponse.data_all;
    }

    // Calculate total quantity
    const totalQuantity = dataAll.reduce((sum, item) => sum + parseFloat(item.chalqty || '0'), 0);

    return (
        <View style={styles.root}>
            <PanelHeader
                onBack={goBack}
                crumbs={['Sales Orders', 'Challans']}
                title={partyLabel || 'Challans'}
                subtitle={`${dataAll.length} challan${dataAll.length === 1 ? '' : 's'} · ${formatValue(totalQuantity)} m`}
            />

            <View style={[styles.searchContainer, { paddingHorizontal: gutter }]}>
                <View style={styles.searchInner}>
                    <SearchBox
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search challan no, date, step, amount…"
                    />
                </View>
            </View>

            <FlatList
                style={styles.container}
                data={filteredChallans.length > 0 ? renderedChallans : []}
                renderItem={({ item }) => <AccordionTable data={item} />}
                keyExtractor={(item, index) => `${item.uid || 'chal'}-${index}`}
                onEndReached={loadMoreChallans}
                onEndReachedThreshold={0.5}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter }]}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        {grandTotalEntries.length > 0 && (
                            <>
                                <SectionHead title="Production Summary" />
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.stageRow}
                                >
                                    {grandTotalEntries.map(e => (
                                        <StageCard key={e.key} name={e.key} value={e.value} />
                                    ))}
                                </ScrollView>
                            </>
                        )}
                        <SectionHead
                            title="Challan Details"
                            meta={
                                dataAll.length > 0
                                    ? `Total Challans: ${dataAll.length} | Total Quantity: ${formatValue(totalQuantity)}${searchQuery !== '' ? ` | Filtered: ${filteredChallans.length}` : ''}`
                                    : undefined
                            }
                        />
                    </View>
                }
                ListEmptyComponent={<EmptyState icon="description" title="No challans found" />}
                ListFooterComponent={
                    loading ? (
                        <View style={styles.loadingIndicator}>
                            <ActivityIndicator size="small" color={T.copper} />
                        </View>
                    ) : renderedChallans.length < filteredChallans.length ? (
                        <TouchableOpacity style={styles.moreBtn} onPress={loadMoreChallans}>
                            <Text style={styles.moreBtnText}>Show more challans</Text>
                        </TouchableOpacity>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontSize: 13, fontWeight: '700', color: T.muted },
    searchContainer: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 8,
    },
    searchInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    listContent: {
        paddingTop: 12,
        paddingBottom: 28,
        gap: 10,
        width: '100%',
        maxWidth: 1000,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { gap: 10, marginBottom: 2 },
    loadingIndicator: { paddingVertical: 16, alignItems: 'center' },
    moreBtn: { alignItems: 'center', paddingVertical: 14 },
    moreBtnText: { fontSize: 13, fontWeight: '800', color: T.copper },

    stageRow: { gap: 8, paddingRight: 4 },
    stageCard: {
        width: 140,
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        padding: 12,
        gap: 6,
    },
    stageIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    stageName: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
    stageValue: { fontSize: 17, fontWeight: '900' },

    challanCard: {
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    challanCardOpen: { borderColor: `${T.nav}55` },
    challanHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    challanIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    challanNumber: { fontSize: 14, fontWeight: '900', color: T.nav },
    challanMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    challanDate: { fontSize: 11.5, fontWeight: '600', color: T.muted },
    dot: { color: T.muted, fontSize: 11, marginHorizontal: 2 },
    challanDesign: { fontSize: 11.5, fontWeight: '700', color: T.ink, marginTop: 2 },
    challanAmt: { alignItems: 'flex-end' },
    challanAmtLabel: { fontSize: 9.5, fontWeight: '700', color: T.muted, textTransform: 'uppercase' },
    challanAmtValue: { fontSize: 13, fontWeight: '900', color: T.green, marginTop: 1 },

    tableContainer: { borderTopWidth: 1, borderTopColor: T.hair },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: T.nav,
        paddingVertical: 9,
        paddingHorizontal: 6,
    },
    headerCellText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, paddingHorizontal: 6 },
    headerCellTextRight: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, paddingHorizontal: 6, textAlign: 'right' },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    oddRow: { backgroundColor: T.sub },
    cellText: { fontSize: 12.5, fontWeight: '600', color: T.ink, paddingHorizontal: 6 },
    cellTextRight: { fontSize: 12.5, fontWeight: '700', color: T.ink, paddingHorizontal: 6, textAlign: 'right' },
    footerRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 6,
        backgroundColor: `${T.copper}12`,
    },
    footerCellText: { fontSize: 12, fontWeight: '900', color: T.nav, paddingHorizontal: 6 },
    footerCellTextRight: { fontSize: 12, fontWeight: '900', color: T.nav, paddingHorizontal: 6, textAlign: 'right' },
});

export default SOPartyDetailsPart1;
