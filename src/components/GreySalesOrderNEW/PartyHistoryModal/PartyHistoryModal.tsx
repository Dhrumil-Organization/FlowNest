import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    FlatList,
    StyleSheet,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { EmptyState, PanelHeader, SearchBox, Segment, cellWidth, CONTENT_MAX, useSotLayout } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import { AuthPill, InfoCell } from '../ui';

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
    partyList?: PartyData[];
    historyData?: HistoryData[];
    // allhistoryData?: HistoryData[];
    partyLoading?: boolean;
    historyLoading?: boolean;
    // allhistoryLoading?: boolean;
    // showAllHistoryOnly?: boolean;
    activeTab?: 'party' | 'history' | '';
    setActiveTab?: (tab: 'party' | 'history') => void;
    getParname?: string;
    // The sales-order screen passes the same values with a `YPO` suffix
    // (partyListYPO, historyDataYPO, …); both spellings are accepted.
    partyListYPO?: PartyData[];
    historyDataYPO?: HistoryData[];
    prodorderLoadingYPO?: boolean;
    historyLoadingYPO?: boolean;
    activeTabYPO?: 'party' | 'history' | '';
    setActiveTabYPO?: (tab: 'party' | 'history') => void;
    getParnameYPO?: string;
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

    // NEW ERP UI (presentation only)
    const { cols, gutter } = useSotLayout();

    const renderPartyItem = ({ item }: { item: PartyData }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <View style={styles.card}>
                <View style={styles.cardHead}>
                    <View style={styles.cardIcon}>
                        <Icon name="storefront" size={18} color={T.copper} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.ParName}</Text>
                </View>
                <View style={styles.metricBox}>
                    <View style={styles.metricRow}>
                        <InfoCell label="Address" value={item.Address} lines={3} />
                    </View>
                </View>
            </View>
        </View>
    );

    const renderHistoryItem = ({ item }: { item: HistoryData }) => {
        const stamp = item.isauth ? (item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' ? 'REJECTED' : 'PENDING') : '';
        const statusColor = item.status === 'Authorised' ? T.green : item.status === 'Rejected' ? T.red : undefined;
        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View style={[
                    styles.card,
                    item.isauth === '1' ? styles.cardAccepted : item.isauth === '2' ? styles.cardRejected : null
                ]}>
                    <View style={styles.cardHead}>
                        <View style={styles.cardIcon}>
                            <Icon name="credit-score" size={18} color={T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.eyebrow}>{item.date}</Text>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.prptypename}</Text>
                        </View>
                        {stamp ? <AuthPill label={stamp} /> : null}
                    </View>
                    <View style={styles.metricBox}>
                        <View style={styles.metricRow}>
                            <InfoCell label="Old Limit" value={item.limit1} color={T.green} />
                            <InfoCell label="Req. Limit" value={item.limit2} color={T.copper} />
                        </View>
                        <View style={styles.metricRow}>
                            <InfoCell label="Auth. Limit" value={item.limit3} color={T.nav} />
                            <InfoCell label="Auth. Days" value={item.crday3} color={T.nav} />
                        </View>
                        <View style={styles.metricRow}>
                            <InfoCell label="Old Cr. Days" value={item.crday1} color={T.green} />
                            <InfoCell label="Req. Cr. Days" value={item.crday2} color={T.copper} />
                        </View>
                        <View style={styles.metricRow}>
                            <InfoCell label="Authorised Date" value={item.adate || 'N/A'} />
                            <InfoCell label="Authorised By" value={item.ausrname || 'N/A'} />
                        </View>
                        <View style={styles.metricRow}>
                            <InfoCell label="Status" value={item.status} color={statusColor} />
                            <InfoCell label="Revert Date" value={item.revertdate || 'N/A'} />
                        </View>
                    </View>
                    <View style={styles.metricRow}>
                        <InfoCell label="Remark" value={item.remark} lines={3} />
                    </View>
                    <View style={styles.metricRow}>
                        <InfoCell label="Broker" value={item.BrkAccName} />
                        <InfoCell label="SExe" value={item.sexename} />
                    </View>
                </View>
            </View>
        );
    };

    const listContent = [styles.list, { paddingHorizontal: gutter - 5 }];

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
                            contentContainerStyle={listContent}
                            ListEmptyComponent={
                                <EmptyState icon="storefront" title="No parties found!" />
                            }
                        />
                    ) : (
                        <EmptyState icon="storefront" title="No parties found!" />
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
                        <FlatList
                            key={`hist-${cols}`}
                            data={filteredHistoryData}
                            numColumns={cols}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item) => item.uid}
                            contentContainerStyle={listContent}
                            ListHeaderComponent={
                                <View style={styles.partyBanner}>
                                    <Text style={styles.partyBannerEyebrow}>PARTY</Text>
                                    <Text style={styles.partyBannerText} numberOfLines={2}>{getParname}</Text>
                                </View>
                            }
                            ListEmptyComponent={
                                <EmptyState icon="history" title="No history found!" />
                            }
                        />
                    ) : (
                        <EmptyState icon="history" title="No history found!" />
                    )}
                </>
            );
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <PanelHeader
                    onBack={onClose}
                    backLabel="Close"
                    crumbs={['Sales Order']}
                    title="Party details"
                    subtitle={getParname || undefined}
                />
                <View style={[styles.tabWrap, { paddingHorizontal: gutter }]}>
                    <View style={styles.tabInner}>
                        <Segment
                            value={activeTab as any}
                            onChange={(v) => setActiveTab(v as any)}
                            options={[
                                { value: 'party', label: `Parties (${partyList.length})`, icon: 'storefront' },
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
    tabWrap: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 10,
    },
    tabInner: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    searchWrap: { paddingTop: 10, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    listContainer: { flex: 1 },
    list: { paddingTop: 8, paddingBottom: 24, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    gridCell: { padding: 5 },
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardAccepted: { borderColor: `${T.green}66` },
    cardRejected: { borderColor: `${T.red}55` },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    cardTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 2 },
    metricBox: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    metricRow: { flexDirection: 'row', gap: 10 },
    partyBanner: {
        margin: 5,
        backgroundColor: T.nav,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    partyBannerEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    partyBannerText: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 2 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default PartyHistoryModal;
