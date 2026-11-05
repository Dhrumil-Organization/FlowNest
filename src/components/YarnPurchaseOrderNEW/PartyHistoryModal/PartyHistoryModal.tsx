import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    ActivityIndicator,
    FlatList,
    StyleSheet,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// NEW ERP theme (presentation only)
import { S, T } from '@/src/theme';
import {
    CONTENT_MAX,
    EmptyState,
    Metric,
    PanelHeader,
    SearchBox,
    Segment,
    cellWidth,
    useSotLayout,
} from '@/src/components/erpUi';

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
    // The purchase-order screen passes the same values with a `YPO` suffix
    // (partyListYPO, historyDataYPO, …); both spellings are accepted.
    [k: string]: any;
}

const PartyHistoryModal: React.FC<PartyHistoryModalProps> = (props) => {
    // Bug fix: the parent passes `partyListYPO`, `historyDataYPO`, `prodorderLoadingYPO`,
    // `historyLoadingYPO`, `activeTabYPO`, `setActiveTabYPO`, `getParnameYPO`, which the
    // original destructuring ignored (modal always showed empty defaults).
    const {
        visible,
        onClose,
        partyList = props.partyListYPO ?? [],
        historyData = props.historyDataYPO ?? [],
        // allhistoryData = [],
        partyLoading = props.prodorderLoadingYPO ?? false,
        historyLoading = props.historyLoadingYPO ?? false,
        // allhistoryLoading = false,
        // showAllHistoryOnly = false,
        activeTab = props.activeTabYPO ?? '',
        getParname = props.getParnameYPO ?? '',
        setActiveTab = props.setActiveTabYPO ?? ((_tab: 'party' | 'history') => { }),
    } = props;
    const { cols, gutter } = useSotLayout();
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

    const historyTone = (isauth: string) =>
        isauth === '1' ? T.green : isauth === '2' ? T.red : T.muted;

    const renderPartyItem = ({ item }: { item: PartyData }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <View style={styles.card}>
                <View style={styles.partyHead}>
                    <View style={styles.partyIcon}>
                        <Icon name="storefront" size={16} color={T.copper} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.ParName}</Text>
                </View>
                <View style={styles.box}>
                    <Text style={styles.key}>Address</Text>
                    <Text style={styles.value}>{item.Address}</Text>
                </View>
            </View>
        </View>
    );

    const renderHistoryItem = ({ item }: { item: HistoryData }) => {
        const tone = historyTone(item.isauth);
        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View
                    style={[
                        styles.card,
                        item.isauth === '1' ? styles.acceptedCard : item.isauth === '2' ? styles.rejectedCard : null,
                    ]}
                >
                    <View style={styles.histHead}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.eyebrow} numberOfLines={1}>{item.prptypename}</Text>
                            <View style={styles.dateRow}>
                                <Icon name="event" size={12} color={T.muted} />
                                <Text style={styles.dateText}>{item.date}</Text>
                            </View>
                        </View>
                        {item.isauth ? (
                            <View style={[styles.stamp, { backgroundColor: `${tone}14`, borderColor: `${tone}40` }]}>
                                <View style={[styles.stampDot, { backgroundColor: tone }]} />
                                <Text style={[styles.stampText, { color: tone }]}>
                                    {item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' ? 'REJECTED' : 'PENDING'}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.box}>
                        <View style={styles.row}>
                            <Metric label="Old Limit" value={String(item.limit1 ?? '')} color={T.green} />
                            <Metric label="Req. Limit" value={String(item.limit2 ?? '')} color={T.copper} align="right" />
                        </View>
                        <View style={styles.row}>
                            <Metric label="Auth. Limit" value={String(item.limit3 ?? '')} color={T.blue} />
                            <Metric label="Auth. Days" value={String(item.crday3 ?? '')} color={T.blue} align="right" />
                        </View>
                        <View style={styles.row}>
                            <Metric label="Old Cr. Days" value={String(item.crday1 ?? '')} color={T.green} />
                            <Metric label="Req. Cr. Days" value={String(item.crday2 ?? '')} color={T.copper} align="right" />
                        </View>
                        <View style={styles.row}>
                            <Metric label="Authorised Date" value={item.adate || 'N/A'} />
                            <Metric label="Authorised By" value={item.ausrname || 'N/A'} align="right" />
                        </View>
                        <View style={styles.row}>
                            <Metric
                                label="Status"
                                value={String(item.status ?? '')}
                                color={item.status === 'Authorised' ? T.green : item.status === 'Rejected' ? T.red : T.ink}
                            />
                            <Metric label="Revert Date" value={item.revertdate || 'N/A'} align="right" />
                        </View>
                    </View>

                    <View style={styles.kv}>
                        <Text style={styles.key}>Remark</Text>
                        <Text style={styles.value}>{item.remark}</Text>
                    </View>
                    <View style={styles.kv}>
                        <Text style={styles.key}>Broker</Text>
                        <Text style={styles.value}>{item.BrkAccName}</Text>
                    </View>
                    <View style={styles.kv}>
                        <Text style={styles.key}>SExe</Text>
                        <Text style={styles.value}>{item.sexename}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const listStyle = [styles.list, { paddingHorizontal: gutter - 5 }];

    // Render the appropriate tab content
    const renderTabContent = () => {
        if (activeTab === 'party') {
            return (
                <>
                    <View style={[styles.searchWrap, { paddingHorizontal: gutter }]}>
                        <SearchBox
                            placeholder="Search Parties..."
                            value={partySearchQuery}
                            onChangeText={setPartySearchQuery}
                        />
                    </View>
                    {partyLoading ? (
                        <ActivityIndicator size="large" color={T.copper} style={styles.loader} />
                    ) : filteredPartyList.length > 0 ? (
                        <FlatList
                            key={`party-${cols}`}
                            data={filteredPartyList}
                            numColumns={cols}
                            renderItem={renderPartyItem}
                            keyExtractor={(item) => item.ParCode}
                            contentContainerStyle={listStyle}
                            ListEmptyComponent={
                                <EmptyState icon="person-search" title="No parties found!" />
                            }
                        />
                    ) : (
                        <EmptyState icon="person-search" title="No parties found!" />
                    )}
                </>
            );
        } else if (activeTab === 'history') {
            return (
                <>
                    <View style={[styles.searchWrap, { paddingHorizontal: gutter }]}>
                        <SearchBox
                            placeholder="Search History..."
                            value={historySearchQuery}
                            onChangeText={setHistorySearchQuery}
                        />
                    </View>
                    {historyLoading ? (<>
                        <ActivityIndicator size="large" color={T.copper} style={styles.loader} />
                    </>
                    ) : filteredHistoryData.length > 0 ? (
                        <>
                            <View style={[styles.partyBanner, { marginHorizontal: gutter }]}>
                                <Icon name="person" size={15} color={T.copper} />
                                <Text style={styles.partyBannerText} numberOfLines={1}>{getParname}</Text>
                            </View>
                            <FlatList
                                key={`hist-${cols}`}
                                data={filteredHistoryData}
                                numColumns={cols}
                                renderItem={renderHistoryItem}
                                keyExtractor={(item) => item.uid}
                                contentContainerStyle={listStyle}
                                ListEmptyComponent={
                                    <EmptyState icon="history" title="No history found!" />
                                }
                            />
                        </>
                    ) : (
                        <EmptyState icon="history" title="No history found!" />
                    )}
                </>
            );
        }
        // allhistory tab was commented out in the original (see git history)
        return null;
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <PanelHeader
                    onBack={onClose}
                    backLabel="Close"
                    crumbs={['Purchase Order']}
                    title={getParname || 'Party History'}
                    subtitle="Parties & credit-limit history"
                />
                <View style={styles.tabContainer}>
                    <View style={[styles.tabInner, { paddingHorizontal: gutter }]}>
                        <Segment
                            value={activeTab as any}
                            onChange={(v) => setActiveTab(v as 'party' | 'history')}
                            options={[
                                { value: 'party', label: `Parties (${partyList.length})`, icon: 'groups' },
                                { value: 'history', label: `History (${historyData.length})`, icon: 'history' },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.listContainer}>
                    {renderTabContent()}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: T.bg },
    tabContainer: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 10,
    },
    tabInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    searchWrap: { paddingTop: 10, paddingBottom: 4, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    listContainer: { flex: 1 },
    list: { paddingTop: 6, paddingBottom: 24, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    gridCell: { padding: 5 },
    card: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 10,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    acceptedCard: { borderLeftWidth: 4, borderLeftColor: T.green },
    rejectedCard: { borderLeftWidth: 4, borderLeftColor: T.red },
    partyHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    partyIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: T.ink },
    histHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2, textTransform: 'uppercase' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    dateText: { fontSize: 12, fontWeight: '700', color: T.ink },
    stamp: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    stampDot: { width: 6, height: 6, borderRadius: 3 },
    stampText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    box: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    row: { flexDirection: 'row', gap: 10 },
    kv: { gap: 2 },
    key: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
    value: { fontSize: 13, fontWeight: '600', color: T.ink },
    partyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${T.copper}12`,
        borderWidth: 1,
        borderColor: `${T.copper}40`,
        alignSelf: 'stretch',
    },
    partyBannerText: { flex: 1, fontSize: 13, fontWeight: '800', color: T.nav },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default PartyHistoryModal;
