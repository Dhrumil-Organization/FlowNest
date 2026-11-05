// FILE: src/components/OutstandingDaysRequestNEW/PartyHistoryModal.tsx
// NEW ERP port of components/OutstandingDaysRequest/PartyHistoryModal.tsx
// (legacy file left untouched). Props, local search state, the "any value
// contains the query" filters, the tab-reset effect, counts in the tab labels
// and every empty text are the legacy ones; only the presentation changed.
//
// Deviation (porting brief): the legacy full-screen <Modal> is now an
// in-screen panel drawn over the list (compact back row instead of the
// floating close button); the parent handles the Android hardware back.
// The component stays mounted while hidden, like the legacy Modal host, so the
// search texts survive closing/re-opening exactly as before.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { T, S } from '@/src/theme';
import { Avatar, EmptyState, PanelHeader, SearchBox, Segment, cellWidth } from '@/src/components/erpUi';
import { CONTENT_W, HistoryCard, useGrid } from './ui';

interface PartyData {
    ParCode: string;
    ParName: string;
    Address: string;
    Mhname: string;
    Shname: string;
}

interface HistoryData {
    uid: string;
    prptype: string;
    prptypename: string;
    prpcode: string;
    date: string;
    parcode: string;
    parname: string;
    limit1: string;
    limit2: string;
    limit3: string;
    crday1: string;
    crday2: string;
    crday3: string;
    isauth: string;
    status: string;
    ausrname: string;
    adate: string;
    remark: string;
    yearno: string;
    revertdate: string;
    sexename: string;
    BrkAccName: string;
    crdays: string;
}

interface PartyHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    partyList: PartyData[];
    historyData: HistoryData[];
    partyLoading: boolean;
    historyLoading: boolean;
    activeTab: 'party' | 'history';
    setActiveTab: (tab: 'party' | 'history') => void;
    getParname: string;
}

const PartyHistoryModal: React.FC<PartyHistoryModalProps> = ({
    visible,
    onClose,
    partyList = [],
    historyData = [],
    partyLoading = false,
    historyLoading = false,
    activeTab,
    getParname = '',
    setActiveTab,
}) => {
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    // Filter data based on search queries
    const filteredPartyList = partyList.filter((item) =>
        Object.values(item).some((val) =>
            String(val).toLowerCase().includes(partySearchQuery.toLowerCase())
        )
    );

    const filteredHistoryData = historyData.filter((item) =>
        Object.values(item).some((val) =>
            String(val).toLowerCase().includes(historySearchQuery.toLowerCase())
        )
    );

    // Reset search queries when switching tabs
    useEffect(() => {
        if (activeTab === 'party') {
            setHistorySearchQuery('');
        } else if (activeTab === 'history') {
            setPartySearchQuery('');
        }
    }, [activeTab]);

    // ===== NEW ERP UI (presentation only) =====
    const { cols, gutter, isPhone } = useGrid();

    if (!visible) return null;

    const renderPartyItem = ({ item }: { item: PartyData }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <View style={styles.card}>
                <View style={styles.cardHead}>
                    <Avatar name={item.ParName} size={38} />
                    <Text style={styles.partyName} numberOfLines={3}>{item.ParName}</Text>
                </View>
                <View style={styles.addrBox}>
                    <Icon name="place" size={15} color={T.copper} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.addrLabel}>Address</Text>
                        <Text style={styles.addrValue}>{item.Address || '—'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderHistoryItem = ({ item }: { item: HistoryData }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <HistoryCard item={item} />
        </View>
    );

    const listContentStyle = [styles.list, { paddingHorizontal: gutter - 5 }];

    // Render the appropriate tab content
    const renderTabContent = () => {
        if (activeTab === 'party') {
            return (
                <>
                    <View style={styles.searchBar}>
                        <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                            <SearchBox
                                placeholder="Search Parties..."
                                value={partySearchQuery}
                                onChangeText={setPartySearchQuery}
                                style={styles.searchInner}
                            />
                        </View>
                    </View>
                    {partyLoading ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={T.copper} />
                            <Text style={styles.loaderText}>Loading parties…</Text>
                        </View>
                    ) : filteredPartyList.length > 0 ? (
                        <FlatList
                            key={`odr-party-${cols}`}
                            data={filteredPartyList}
                            renderItem={renderPartyItem}
                            keyExtractor={(item) => item.ParCode}
                            numColumns={cols}
                            style={styles.flex}
                            contentContainerStyle={listContentStyle}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <EmptyState icon="search-off" title="No parties found!" />
                            }
                        />
                    ) : (
                        <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                            <View style={styles.emptyWrap}>
                                <EmptyState
                                    icon="person-search"
                                    title="No parties found!"
                                    text={partySearchQuery ? 'No party matches your search.' : undefined}
                                />
                            </View>
                        </View>
                    )}
                </>
            );
        } else if (activeTab === 'history') {
            return (
                <>
                    <View style={styles.searchBar}>
                        <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                            <SearchBox
                                placeholder="Search History..."
                                value={historySearchQuery}
                                onChangeText={setHistorySearchQuery}
                                style={styles.searchInner}
                            />
                        </View>
                    </View>
                    {historyLoading ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={T.copper} />
                            <Text style={styles.loaderText}>Loading history…</Text>
                        </View>
                    ) : filteredHistoryData.length > 0 ? (
                        <FlatList
                            key={`odr-phist-${cols}`}
                            data={filteredHistoryData}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item) => item.uid}
                            numColumns={cols}
                            style={styles.flex}
                            contentContainerStyle={listContentStyle}
                            keyboardShouldPersistTaps="handled"
                            ListHeaderComponent={
                                <View style={styles.histHead}>
                                    <Text style={styles.eyebrow}>OUTSTANDING DAYS HISTORY</Text>
                                    <Text style={styles.histParty} numberOfLines={2}>{getParname}</Text>
                                </View>
                            }
                            ListEmptyComponent={
                                <EmptyState icon="history" title="No history found!" />
                            }
                        />
                    ) : (
                        <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                            <View style={styles.emptyWrap}>
                                <EmptyState
                                    icon="history"
                                    title="No history found!"
                                    text={historySearchQuery ? 'Nothing matches your search.' : undefined}
                                />
                            </View>
                        </View>
                    )}
                </>
            );
        }
        return null;
    };

    return (
        <View style={styles.panel}>
            <PanelHeader
                onBack={onClose}
                crumbs={['Outstanding Days Request', 'Party history']}
                title={getParname || 'Party history'}
                subtitle={`${partyList.length} part${partyList.length === 1 ? 'y' : 'ies'} · ${historyData.length} history record${historyData.length === 1 ? '' : 's'}`}
            />
            <View style={styles.tabBar}>
                <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                    <View style={!isPhone ? { maxWidth: 420 } : null}>
                        <Segment
                            value={activeTab}
                            onChange={(v) => setActiveTab(v)}
                            options={[
                                { value: 'party', label: `Parties (${partyList.length})`, icon: 'groups' },
                                { value: 'history', label: `History (${historyData.length})`, icon: 'history' },
                            ]}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.flex}>
                {renderTabContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    panel: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
        elevation: 20,
        backgroundColor: T.bg,
    },
    tabBar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 2,
        paddingBottom: 10,
    },
    centered: { width: '100%', maxWidth: CONTENT_W, alignSelf: 'center' },
    searchBar: { paddingTop: 10, paddingBottom: 2 },
    searchInner: { backgroundColor: T.surface },
    list: {
        paddingTop: 8,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_W,
        alignSelf: 'center',
    },
    gridCell: { padding: 5 },
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
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    partyName: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    addrBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    addrLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
    addrValue: { fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 2, lineHeight: 18 },
    histHead: { paddingHorizontal: 5, paddingTop: 2, paddingBottom: 4 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    histParty: { fontSize: 15, fontWeight: '800', color: T.nav, marginTop: 2 },
    emptyWrap: {
        marginTop: 12,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    loaderText: { fontSize: 13, fontWeight: '800', color: T.nav },
});

export default PartyHistoryModal;
