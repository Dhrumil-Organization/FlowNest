// NEW ERP UI copy of '@/components/CreditLimitRequest/PartyHistoryModal'
// (shared legacy file left untouched). Props, state, search filters and the
// tab-reset effect are verbatim; only the presentation changed.
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { T, S } from '@/src/theme';
import {
    Avatar,
    CONTENT_MAX,
    EmptyState,
    PanelHeader,
    SearchBox,
    Segment,
    cellWidth,
    useSotLayout,
} from '@/src/components/erpUi';
import { HistoryCard } from './ui';

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
    // allhistoryData?: HistoryData[];
    partyLoading: boolean;
    historyLoading: boolean;
    // allhistoryLoading?: boolean;
    // showAllHistoryOnly?: boolean;
    activeTab: 'party' | 'history';
    setActiveTab: (tab: 'party' | 'history') => void;
    getParname: string;
}

const PartyHistoryModal: React.FC<PartyHistoryModalProps> = ({
    visible,
    onClose,
    partyList = [],
    historyData = [],
    // allhistoryData = [],
    partyLoading = false,
    historyLoading = false,
    // allhistoryLoading = false,
    // showAllHistoryOnly = false,
    activeTab = '',
    getParname = '',
    setActiveTab = () => { },
}) => {
    // const [activeTab, setActiveTab] = useState<'party' | 'history' | 'allhistory'>('party');
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    // const [allhistorySearchQuery, setAllHistorySearchQuery] = useState('');

    // Initialize active tab based on props
    // useEffect(() => {
    //     if (showAllHistoryOnly && allhistoryData.length > 0) {
    //         setActiveTab('allhistory');
    //     } else if (historyData.length > 0 && !showAllHistoryOnly) {
    //         setActiveTab('history');
    //     } else if (partyList.length > 0) {
    //         setActiveTab('party');
    //     }
    // }, [showAllHistoryOnly, allhistoryData, historyData, partyList]);

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

    // const filteredAllHistoryData = allhistoryData.filter((item) =>
    //     Object.values(item).some((val) =>
    //         String(val).toLowerCase().includes(allhistorySearchQuery.toLowerCase())
    //     )
    // );

    // Reset search queries when switching tabs
    useEffect(() => {
        if (activeTab === 'party') {
            setHistorySearchQuery('');
            // setAllHistorySearchQuery('');
        } else if (activeTab === 'history') {
            setPartySearchQuery('');
            // setAllHistorySearchQuery('');
        }
        // else if (activeTab === 'allhistory') {
        //     setPartySearchQuery('');
        //     setHistorySearchQuery('');
        // }
    }, [activeTab]);

    // ===== NEW ERP UI (presentation only) =====
    const { cols, gutter, isPhone } = useSotLayout();

    const renderPartyItem = ({ item }: { item: PartyData }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <View style={styles.card}>
                <View style={styles.cardHead}>
                    <Avatar name={item.ParName} size={38} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.partyName} numberOfLines={2}>{item.ParName}</Text>
                        {!!item.ParCode && <Text style={styles.partyCode}>#{item.ParCode}</Text>}
                    </View>
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
                            key={`clr-party-${cols}`}
                            data={filteredPartyList}
                            renderItem={renderPartyItem}
                            keyExtractor={(item) => item.ParCode}
                            numColumns={cols}
                            style={styles.flex}
                            contentContainerStyle={listContentStyle}
                            ListEmptyComponent={
                                <EmptyState icon="search-off" title="No parties found!" />
                            }
                        />
                    ) : (
                        <View style={[styles.emptyWrap, { marginHorizontal: gutter }]}>
                            <EmptyState
                                icon="person-search"
                                title="No parties found!"
                                text={partySearchQuery ? 'No party matches your search.' : undefined}
                            />
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
                    {historyLoading ? (<>
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={T.copper} />
                            <Text style={styles.loaderText}>Loading history…</Text>
                        </View>
                    </>
                    ) : filteredHistoryData.length > 0 ? (
                        <>
                            <FlatList
                                key={`clr-phist-${cols}`}
                                data={filteredHistoryData}
                                renderItem={renderHistoryItem}
                                keyExtractor={(item) => item.uid}
                                numColumns={cols}
                                style={styles.flex}
                                contentContainerStyle={listContentStyle}
                                ListHeaderComponent={
                                    <View style={styles.histHead}>
                                        <Text style={styles.eyebrow}>CREDIT LIMIT HISTORY</Text>
                                        <Text style={styles.histParty} numberOfLines={2}>{getParname}</Text>
                                    </View>
                                }
                                ListEmptyComponent={
                                    <EmptyState icon="history" title="No history found!" />
                                }
                            />
                        </>
                    ) : (
                        <View style={[styles.emptyWrap, { marginHorizontal: gutter }]}>
                            <EmptyState
                                icon="history"
                                title="No history found!"
                                text={historySearchQuery ? 'Nothing matches your search.' : 'This party has no earlier credit limit requests.'}
                            />
                        </View>
                    )}
                </>
            );
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.safe}>
                <View style={styles.modalContainer}>
                    <PanelHeader
                        onBack={onClose}
                        crumbs={['Credit Limit Request', 'Party history']}
                        title={getParname || 'Party history'}
                        subtitle={`${partyList.length} part${partyList.length === 1 ? 'y' : 'ies'} · ${historyData.length} history record${historyData.length === 1 ? '' : 's'}`}
                    />
                    <View style={styles.tabBar}>
                        <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                        <View style={!isPhone ? { maxWidth: 420 } : null}>
                            <Segment
                                value={activeTab as 'party' | 'history'}
                                onChange={(v) => setActiveTab(v)}
                                options={[
                                    { value: 'party', label: `Parties (${partyList.length})`, icon: 'groups' },
                                    { value: 'history', label: `History (${historyData.length})`, icon: 'history' },
                                ]}
                            />
                        </View>
                        </View>
                    </View>

                    <View style={styles.listContainer}>
                        {renderTabContent()}
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: T.surface },
    modalContainer: {
        flex: 1,
        backgroundColor: T.bg,
    },
    tabBar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 2,
        paddingBottom: 10,
    },
    centered: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    searchBar: { paddingTop: 10, paddingBottom: 2 },
    searchInner: { backgroundColor: T.surface },
    listContainer: {
        flex: 1,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
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
    partyName: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    partyCode: { fontSize: 11, fontWeight: '700', color: T.muted, marginTop: 2 },
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
