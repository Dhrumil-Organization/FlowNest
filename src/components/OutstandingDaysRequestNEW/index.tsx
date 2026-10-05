// FILE: src/components/OutstandingDaysRequestNEW/index.tsx
// NEW ERP port of the legacy "Outstanding Days Request" screen (sibling of
// CreditLimitRequestNEW — same look and structure).
//
// Legacy source : components/OutstandingDaysRequest/index.tsx
//                 components/OutstandingDaysRequest/PartyHistoryModal.tsx
// Legacy route  : app/(tabs)/outstanding-days-request.tsx  (passed token, username)
//
// Endpoints (all in ./api.ts, identical path / method / headers / keys / response paths):
//   GET  /api/osdaysreqbrowse  { txntype:'outstandingdaysrequest', referrer:'dashboard' }            -> data.data
//   GET  /api/osdaysreqbrowse  { txntype:'outstandingdaysrequesthistory', action:'allpartyhistory',
//                                referrer:'dashboard' }                                              -> data.data
//   GET  /api/osdaysreqbrowse  { acccode, txntype:'outstandingdaysrequesthistory', referrer:'dashboard',
//                                action:'partyhistory', prptype }                                    -> data.data
//   GET  /api/get_criterion    { prpcodes:[prpcode], prptype, yearno, strcode:'', parcodes:[parcode],
//                                txntype:'outstandingdaysrequest', fetch:'dr' }                      -> data.response.data
//   GET  /api/osdaysreqbills   { uid, prpcode, acccode, txntype:'outstandingdaysrequestbills',
//                                referrer:'dashboard', action:'partybills', prptype }
//                                                                        -> data.data.mainpardata / data.data.osbills
//   POST /api/osdaysreqedit    { ...card, limit2, limit3, isauth 1|2, referrer:'dashboard',
//                                txntype:'outstandingdaysrequest', action:'edit' }      -> data.success / data.message
//
// AsyncStorage keys: none in this component (legacy component used none; the
// legacy route read access_token / user_details, now the `token` / `username` props).
//
// Logic kept exactly as legacy: both tab effects (so History is requested twice
// on a tab switch, as before), search on every value, integer-only edit with
// its two "Invalid Input" alerts, the confirm validations and payloads, the
// 2 s result message, the processed card moving to the end of the list +
// scrollToEnd, the per-render axios cancel source, and closing the party
// history clearing the all-history list.
//
// Deliberate deviations (presentation / brief rules only):
//  - No legacy Header / FullScreenLoader / gradients; search moved into the toolbar.
//  - Bills and Party-history full-screen modals are in-screen panels with a back
//    row; Android hardware back closes them. Confirm dialog is the kit Sheet.
//  - Grid breakpoints follow the brief (1 col < 768, 2, 3 from 1180) instead of
//    the legacy 600 / 1000.
//  - KPI strip + section title added above each list (house style, read-only
//    totals of what is listed; money totals use the same digits-only parsing as
//    the cards).
//  - Display fixes: a missing limit showed "NaN" (cards and the editable input);
//    now '—' / empty input.
//  - Crash fix: legacy handleValidation evaluated an UNUSED
//    `updatedItem.limit1.replace(...)`, which threw when limit1 was not a
//    string; that unused expression is not ported.
//  - Legacy dead code not ported: limit-in-words (computed, never rendered),
//    unused `duration` prop. `username` is accepted but unused (it only fed the
//    legacy Header).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { AppAlert } from '@/common/utils/appAlert';
import { T, S } from '@/src/theme';
import {
    Avatar,
    Btn,
    BusyOverlay,
    EmptyState,
    Field,
    Kpi,
    KpiGrid,
    SearchBox,
    SectionHead,
    Segment,
    Sheet,
    cellWidth,
} from '@/src/components/erpUi';
import {
    Row,
    fetchAllHistory,
    fetchBills,
    fetchCriterionParties,
    fetchPartyHistory,
    fetchRequests,
    isCancel,
    newCancelSource,
    postEdit,
} from './api';
import BillsPanel from './BillsPanel';
import {
    buildEditPayload,
    digitsValue,
    filterRows,
    formatToIndianCurrency,
    intText,
    requestedInputValue,
    validateEdit,
} from './model';
import PartyHistoryModal from './PartyHistoryModal';
import { CONTENT_W, Cell, HistoryCard, InfoLine, Pill, Tag, useGrid } from './ui';

interface Props {
    token: string;
    API: string;
    username?: string;
}

type CardData = Row & { isProcessed?: boolean; actionType?: 'accept' | 'reject' };

const OutstandingDaysRequestNEW: React.FC<Props> = ({ token, API }) => {
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);

    const [data, setData] = useState<CardData[]>([]);
    const [allhistoryData, setAllHistoryData] = useState<Row[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [partyList, setPartyList] = useState<any[]>([]);
    const [getParname, setParname] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchhistoryQuery, setSearchhistoryQuery] = useState('');
    const [billsSearchQuery, setBillsSearchQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setIsHistoryLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [billsLoading, setBillsLoading] = useState(false);

    const [editableValues, setEditableValues] = useState<any>({});
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'list' | 'info' | null>(null);

    const [showOverlay, setShowOverlay] = useState(false);
    const [showPartyHistoryModal, setShowPartyHistoryModal] = useState(false);
    const [showBillsAccordion, setShowBillsAccordion] = useState(false);
    const [billsData, setBillsData] = useState<any[]>([]);
    const [mainParData, setMainParData] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'party' | 'history'>('party');
    const [activeTab1, setActiveTab1] = useState<'requests' | 'history'>('requests');

    const [responsemessage, setresponsemessage] = useState('');
    const [getSuccess, setSuccess] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);
    const [isInfoLoading, setInfoLoading] = useState(false);

    // Legacy: a plain per-render variable (not a ref) — kept so cancellation behaves exactly as before.
    let cancelToken: any;

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            setData(await fetchRequests(API, token));
            setAllHistoryData([]);
        } catch {
            AppAlert.alert('Error', 'Server error');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch All History (legacy: no catch, no alert)
    const fetchAllHistoryData = async () => {
        setIsLoading(true);
        try {
            setAllHistoryData(await fetchAllHistory(API, token));
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistoryData = async (parcode: string, prptype: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = newCancelSource();
        setIsHistoryLoading(true);
        try {
            setHistoryData(await fetchPartyHistory(API, token, parcode, prptype, cancelToken?.token));
        } catch (error) {
            if (!isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab1 === 'history') {
            fetchAllHistoryData();
        }
    }, [activeTab1]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!token) return;
        if (activeTab1 === 'requests') fetchData();
        else fetchAllHistoryData();
    }, [activeTab1, token]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
        setActiveTab('party');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = newCancelSource();
        setIsPartyLoading(true);
        try {
            const parties = await fetchCriterionParties(API, token, prpcode, prptype, yearno, parcode, cancelToken?.token);
            if (parties) {
                setPartyList(parties);
                fetchHistoryData(parcode, prptype);
            } else {
                setPartyList([]);
            }
        } catch (error) {
            if (!isCancel(error)) {
                AppAlert.alert('Error', 'Server error');
            }
        } finally {
            setIsPartyLoading(false);
        }
    };

    // Search Logic
    const filteredData = useMemo(() => filterRows(data, searchQuery), [data, searchQuery]);
    const filteredhistoryData = useMemo(
        () => filterRows(allhistoryData, searchhistoryQuery),
        [allhistoryData, searchhistoryQuery],
    );

    // Edit Value Logic
    const handleEdit = (uid: string, field: string, value: string) => {
        if (field === 'limit2') {
            if (value === '') {
                setEditableValues((prev: any) => ({
                    ...prev,
                    [uid]: { ...prev[uid], [field]: value },
                }));
                return;
            }
            const numericValue = parseInt(value, 10);
            if (isNaN(numericValue) || numericValue < 0) {
                AppAlert.alert('Invalid Input', 'Please enter a valid positive integer.');
                return;
            }
            setEditableValues((prev: any) => ({
                ...prev,
                [uid]: { ...prev[uid], [field]: numericValue.toString() },
            }));
        } else {
            setEditableValues((prev: any) => ({
                ...prev,
                [uid]: { ...prev[uid], [field]: value },
            }));
        }
    };

    // Icon Press Logic
    const handleIconPress = (item: any, action: any) => {
        if (action === 'list') {
            setSelectedItem(item);
            setSelectedAction(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            setShowPartyHistoryModal(true);
            setParname(item.parname);
            return;
        }
        setSelectedItem(item);
        setSelectedAction(action);
        setShowOverlay(true);
    };

    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    const scrollHistoryToTop = () => {
        flatHistoryListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    // Confirm Action Logic
    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        const currentLimit2 = editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2;
        if (currentLimit2 === '' || currentLimit2 === undefined) {
            AppAlert.alert('Validation Error', 'Requested OS Days cannot be empty.');
            return;
        }

        const payload = buildEditPayload(selectedItem, editableValues[selectedItem.uid]?.limit2, selectedAction);
        const validationError = validateEdit(payload, selectedAction);
        if (validationError) {
            AppAlert.alert('Validation Error', validationError);
            return;
        }

        setSuccess(true);
        setresponsemessage('Loading...');
        try {
            const response = await postEdit(API, token, payload);
            if (response.success) {
                setresponsemessage(response.message || 'Success');
                setTimeout(() => {
                    setSuccess(false);
                    setShowOverlay(false);
                }, 2000);
                setData((prevData) => {
                    const newData = prevData.filter((item) => item.uid !== selectedItem.uid);
                    newData.push({ ...selectedItem, isProcessed: true, actionType: selectedAction as 'accept' | 'reject' });
                    return newData;
                });
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
            } else {
                setresponsemessage(response.message || 'Success');
                setTimeout(() => {
                    setSuccess(false);
                }, 2000);
            }
        } catch (error) {
            setresponsemessage('Server Error');
            setTimeout(() => {
                setSuccess(false);
            }, 2000);
        }
    };

    const closeBillsModal = () => {
        setShowBillsAccordion(false);
        setBillsData([]);
        setMainParData(null);
        setBillsSearchQuery('');
    };

    // Fetch Bills Data
    const fetchBillsData = async (parcode: string, prptype: string, uid: string, prpcode: string) => {
        setInfoLoading(true);
        setBillsLoading(true);
        try {
            const res = await fetchBills(API, token, parcode, prptype, uid, prpcode);
            if (res.success === true) {
                setMainParData(res.mainParData);
                setBillsData(res.bills);
            } else {
                AppAlert.alert('Error', res.message);
                closeBillsModal();
            }
        } catch (error) {
            AppAlert.alert('Error', 'Server error');
            closeBillsModal();
        } finally {
            setInfoLoading(false);
            setBillsLoading(false);
        }
    };

    const handleInfoIconClick = (item: CardData) => {
        setSelectedItem(item);
        setSelectedAction('info');
        setBillsData([]);
        setMainParData(null);
        setShowBillsAccordion(true);
        fetchBillsData(item.parcode, item.prptype, item.uid, item.prpcode);
    };

    const closePartyHistory = () => {
        setShowPartyHistoryModal(false);
        setAllHistoryData([]);
    };

    // Android hardware back closes the open in-screen panel (legacy: Modal onRequestClose).
    useEffect(() => {
        if (!showBillsAccordion && !showPartyHistoryModal) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showBillsAccordion) closeBillsModal();
            else closePartyHistory();
            return true;
        });
        return () => sub.remove();
    }, [showBillsAccordion, showPartyHistoryModal]); // eslint-disable-line react-hooks/exhaustive-deps

    // =====================================================================
    // NEW ERP UI (presentation only)
    // =====================================================================
    const { isPhone, cols, gutter } = useGrid();

    const amount = (v: any) => `₹ ${formatToIndianCurrency(v || '0')}`;

    const reqSummary = useMemo(() => {
        let outstanding = 0, overdue = 0, processed = 0;
        filteredData.forEach((i) => {
            outstanding += digitsValue(i.outstanding);
            overdue += digitsValue(i.overdue);
            if (i.isProcessed) processed += 1;
        });
        return { outstanding, overdue, processed, pending: filteredData.length - processed };
    }, [filteredData]);

    const histSummary = useMemo(() => {
        let ok = 0, bad = 0, pend = 0;
        filteredhistoryData.forEach((i) => {
            if (i.isauth === '1') ok += 1;
            else if (i.isauth === '2') bad += 1;
            else pend += 1;
        });
        return { ok, bad, pend };
    }, [filteredhistoryData]);

    // Render Card Logic
    const renderCard = ({ item }: { item: CardData }) => {
        const overdueAmt = digitsValue(item.overdue);
        return (
            <View style={[cellWidth(cols), styles.gridCell]}>
                <View
                    accessibilityLabel="Outstanding days request"
                    style={[
                        styles.card,
                        item.actionType === 'accept'
                            ? styles.cardAccepted
                            : item.actionType === 'reject'
                                ? styles.cardRejected
                                : null,
                    ]}
                >
                    {/* header: party + division + date + status */}
                    <View style={styles.cardHead}>
                        <Avatar name={item.parname} size={40} />
                        <View style={styles.cardHeadInfo}>
                            <Text style={styles.partyName} numberOfLines={2}>{item.parname}</Text>
                            <View style={styles.metaRow}>
                                <Tag icon="business" text={item.prptypename} tone="blue" />
                                <Tag icon="event" text={item.date} />
                            </View>
                        </View>
                        {item.isProcessed ? (
                            item.actionType === 'accept'
                                ? <Pill text="APPROVED" tone="green" icon="check-circle" />
                                : <Pill text="REJECTED" tone="red" icon="cancel" />
                        ) : (
                            <Pill text="PENDING" tone="copper" />
                        )}
                    </View>

                    {/* current position */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricRow}>
                            <Cell label="Outstanding" value={amount(item.outstanding)} color={T.pd} />
                            <Cell label="Overdue" value={amount(item.overdue)} color={overdueAmt > 0 ? T.red : T.ink} />
                        </View>
                        <View style={styles.metricRow}>
                            <Cell label="OS Days" value={String(parseInt(item.limit1 || '0', 10))} color={T.green} />
                        </View>
                    </View>

                    {/* requested (editable) */}
                    <View style={styles.reqBox}>
                        <Text style={styles.eyebrow}>REQUESTED</Text>
                        <Field
                            label="Requested OS Days"
                            value={requestedInputValue(editableValues[item.uid]?.limit2, item.limit2)}
                            onChangeText={(text: string) => {
                                if (text === '') {
                                    handleEdit(item.uid, 'limit2', text);
                                    return;
                                }
                                if (!/^\d*$/.test(text)) {
                                    AppAlert.alert('Invalid Input', 'Please enter a valid integer (no decimals allowed).');
                                    return;
                                }
                                handleEdit(item.uid, 'limit2', text);
                            }}
                            keyboardType="numeric"
                            autoFocus={false}
                            inputStyle={styles.reqInput}
                        />
                    </View>

                    {/* remark / broker / sales exe */}
                    <View style={styles.lines}>
                        <InfoLine icon="notes" label="Remark" value={item.remark} lines={3} />
                        <InfoLine icon="handshake" label="Broker" value={item.BrkAccName} bold />
                        <InfoLine icon="badge" label="SExe" value={item.sexename} bold />
                    </View>

                    {/* actions (2 x 2 so nothing clips on a phone) */}
                    <View style={styles.actions}>
                        <Btn
                            label="Approve"
                            icon="check-circle"
                            compact
                            onPress={() => handleIconPress(item, 'accept')}
                            disabled={item.isProcessed}
                            style={[styles.actionBtn, { backgroundColor: T.green }]}
                        />
                        <Btn
                            label="Reject"
                            icon="cancel"
                            kind="danger"
                            compact
                            onPress={() => handleIconPress(item, 'reject')}
                            disabled={item.isProcessed}
                            style={styles.actionBtn}
                        />
                        <Btn
                            label="Bills"
                            icon="info"
                            kind="soft"
                            compact
                            onPress={() => handleInfoIconClick(item)}
                            disabled={item.isProcessed || isInfoLoading}
                            loading={isInfoLoading}
                            style={styles.actionBtn}
                        />
                        <Btn
                            label="History"
                            icon="history"
                            kind="ghost"
                            compact
                            onPress={() => handleIconPress(item, 'list')}
                            disabled={item.isProcessed}
                            style={styles.actionBtn}
                        />
                    </View>
                </View>
            </View>
        );
    };

    // Render All Card History Logic
    const renderAllCardHistory = ({ item }: { item: Row }) => (
        <View style={[cellWidth(cols), styles.gridCell]}>
            <HistoryCard item={item} showParty />
        </View>
    );

    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    const requestsHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi
                    label="Pending"
                    icon="pending-actions"
                    accent={T.copper}
                    valueColor={T.copper}
                    value={String(reqSummary.pending)}
                    sub={`of ${filteredData.length} shown`}
                />
                <Kpi
                    label="Actioned"
                    icon="task-alt"
                    accent={T.green}
                    valueColor={T.green}
                    value={String(reqSummary.processed)}
                />
                <Kpi
                    label="Outstanding"
                    icon="account-balance-wallet"
                    accent={T.pd}
                    valueColor={T.pd}
                    value={amount(reqSummary.outstanding)}
                />
                <Kpi
                    label="Overdue"
                    icon="warning-amber"
                    accent={T.red}
                    valueColor={reqSummary.overdue > 0 ? T.red : T.ink}
                    value={amount(reqSummary.overdue)}
                />
            </KpiGrid>
            <SectionHead
                title="Outstanding days requests"
                meta={`${filteredData.length} shown${searchQuery ? ` · ${data.length} total` : ''}`}
            />
        </View>
    );

    const historyHeader = (
        <View style={styles.listHeader}>
            <KpiGrid isPhone={isPhone}>
                <Kpi label="Total" icon="history" accent={T.nav} value={String(filteredhistoryData.length)} />
                <Kpi label="Authorised" icon="verified" accent={T.green} valueColor={T.green} value={String(histSummary.ok)} />
                <Kpi label="Rejected" icon="block" accent={T.red} valueColor={T.red} value={String(histSummary.bad)} />
                <Kpi label="Pending" icon="schedule" accent={T.copper} valueColor={T.copper} value={String(histSummary.pend)} />
            </KpiGrid>
            <SectionHead
                title="Outstanding days history"
                meta={`${filteredhistoryData.length} shown${searchhistoryQuery ? ` · ${allhistoryData.length} total` : ''}`}
            />
        </View>
    );

    const isAccept = selectedAction === 'accept';
    const tone = isAccept ? T.green : T.red;
    // what the confirm will authorise (same expression as the payload's limit3)
    const pendingDays = selectedItem
        ? intText(editableValues[selectedItem.uid]?.limit2 || selectedItem.limit2)
        : '';
    const panelOpen = showBillsAccordion || showPartyHistoryModal;

    return (
        <View style={styles.root}>
            <View
                style={styles.main}
                importantForAccessibility={panelOpen ? 'no-hide-descendants' : 'auto'}
                accessibilityElementsHidden={panelOpen}
            >
                {/* ───────────── Toolbar: Request/History switch + search ───────────── */}
                <View style={styles.toolbar}>
                    <View style={[styles.toolbarInner, { paddingHorizontal: gutter }, isPhone && styles.toolbarPhone]}>
                        <View style={isPhone ? null : styles.segWrap}>
                            <Segment
                                value={activeTab1}
                                onChange={(v) => setActiveTab1(v)}
                                options={[
                                    { value: 'requests', label: 'Request', icon: 'assignment' },
                                    { value: 'history', label: 'History', icon: 'history' },
                                ]}
                            />
                        </View>
                        {activeTab1 === 'requests' ? (
                            <SearchBox
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search request..."
                                style={isPhone ? null : styles.flexMin}
                            />
                        ) : activeTab1 === 'history' ? (
                            <SearchBox
                                value={searchhistoryQuery}
                                onChangeText={setSearchhistoryQuery}
                                placeholder="Search history..."
                                style={isPhone ? null : styles.flexMin}
                            />
                        ) : null}
                    </View>
                </View>

                {/* LIST */}
                {activeTab1 === 'requests' ? (
                    <FlatList
                        ref={flatListRef}
                        style={styles.list}
                        data={filteredData}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.uid}
                        numColumns={cols}
                        key={'cols-req-' + cols}
                        contentContainerStyle={listContentStyle}
                        keyboardShouldPersistTaps="handled"
                        ListHeaderComponent={data.length > 0 ? requestsHeader : null}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButton(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={styles.emptyCard}>
                                    <EmptyState icon={searchQuery ? 'search-off' : 'inbox'} title="No request data found!" />
                                </View>
                            ) : null
                        }
                    />
                ) : activeTab1 === 'history' ? (
                    <FlatList
                        ref={flatHistoryListRef}
                        style={styles.list}
                        data={filteredhistoryData}
                        renderItem={renderAllCardHistory}
                        keyExtractor={(item) => item.uid}
                        numColumns={cols}
                        key={'cols-hist-' + cols}
                        contentContainerStyle={listContentStyle}
                        keyboardShouldPersistTaps="handled"
                        ListHeaderComponent={allhistoryData.length > 0 ? historyHeader : null}
                        onScroll={({ nativeEvent }) => {
                            setShowTopButton(nativeEvent.contentOffset.y > 100);
                        }}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={styles.emptyCard}>
                                    <EmptyState icon={searchhistoryQuery ? 'search-off' : 'history'} title="No history data found!" />
                                </View>
                            ) : null
                        }
                    />
                ) : null}

                {showTopButton ? (
                    <TouchableOpacity
                        style={styles.topButton}
                        onPress={activeTab1 === 'requests' ? scrollToTop : scrollHistoryToTop}
                        accessibilityRole="button"
                        accessibilityLabel="Scroll to top"
                    >
                        <Icon name="arrow-upward" size={22} color="#fff" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* ───────────── Confirm / result dialog ───────────── */}
            <Sheet
                open={showOverlay}
                onClose={() => setShowOverlay(false)}
                eyebrow="OUTSTANDING DAYS REQUEST"
                title={selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                wideMax={440}
                footer={
                    getSuccess === true ? undefined : (
                        <View style={styles.dialogButtons}>
                            <Btn
                                label="Cancel"
                                kind="ghost"
                                onPress={() => setShowOverlay(false)}
                                style={styles.dialogBtn}
                            />
                            <Btn
                                label={isAccept ? 'Confirm accept' : 'Confirm reject'}
                                icon={isAccept ? 'check' : 'close'}
                                kind={isAccept ? 'primary' : 'danger'}
                                onPress={handleConfirmAction}
                                style={[styles.dialogBtn, isAccept && { backgroundColor: T.green }]}
                            />
                        </View>
                    )
                }
            >
                <View style={styles.dialogHead}>
                    <View style={[styles.dialogIcon, { backgroundColor: `${tone}16` }]}>
                        <Icon name={isAccept ? 'check-circle' : 'cancel'} size={24} color={tone} />
                    </View>
                    <Text style={styles.dialogParty} numberOfLines={3}>
                        Party: {selectedItem?.parname}
                    </Text>
                </View>
                {getSuccess === true ? (
                    responsemessage === 'Loading...' ? (
                        <View style={styles.dialogStatus}>
                            <ActivityIndicator size="small" color={T.copper} />
                            <Text style={styles.loadingText}>{responsemessage}</Text>
                        </View>
                    ) : (
                        <View style={styles.dialogStatus}>
                            <Icon
                                name={responsemessage === 'Server Error' ? 'error-outline' : 'info-outline'}
                                size={18}
                                color={responsemessage === 'Server Error' ? T.red : T.nav}
                            />
                            <Text style={[styles.responseText, responsemessage === 'Server Error' && { color: T.red }]}>
                                {responsemessage}
                            </Text>
                        </View>
                    )
                ) : selectedItem ? (
                    <View style={styles.dialogBox}>
                        <Cell label="OS Days" value={String(parseInt(selectedItem.limit1 || '0', 10))} color={T.green} />
                        <Cell label="Requested OS Days" value={pendingDays} color={T.copper} style={styles.dialogWide} />
                    </View>
                ) : null}
            </Sheet>

            {/* BILLS (in-screen panel) */}
            <BillsPanel
                visible={showBillsAccordion}
                onClose={closeBillsModal}
                loading={billsLoading}
                mainParData={mainParData}
                billsData={billsData}
                searchQuery={billsSearchQuery}
                onSearch={setBillsSearchQuery}
            />

            {/* PARTY HISTORY (in-screen panel) */}
            <PartyHistoryModal
                visible={showPartyHistoryModal}
                onClose={closePartyHistory}
                partyList={partyList}
                historyData={historyData}
                partyLoading={partyLoading}
                historyLoading={historyLoading}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                getParname={getParname}
            />

            <BusyOverlay visible={isLoading} text="Loading..." />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    main: { flex: 1 },
    flexMin: { flex: 1, minWidth: 0 },
    list: { flex: 1, backgroundColor: T.bg },
    listContent: {
        paddingTop: 10,
        paddingBottom: 96,
        width: '100%',
        maxWidth: CONTENT_W,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
    gridCell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // toolbar
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 10,
    },
    toolbarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        maxWidth: CONTENT_W,
        alignSelf: 'center',
    },
    toolbarPhone: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
    segWrap: { width: 280 },

    // request card
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
    cardAccepted: { borderColor: `${T.green}66`, backgroundColor: `${T.green}08` },
    cardRejected: { borderColor: `${T.red}66`, backgroundColor: `${T.red}08` },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardHeadInfo: { flex: 1, minWidth: 0 },
    partyName: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
    metricBox: {
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    metricRow: { flexDirection: 'row', gap: 10 },
    reqBox: {
        gap: 8,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: `${T.copper}40`,
        backgroundColor: `${T.copper}08`,
    },
    reqInput: { fontWeight: '800', color: T.pd },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    lines: { gap: 6 },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 11,
        marginTop: 'auto',
    },
    actionBtn: { flexGrow: 1, flexBasis: '45%', minWidth: 0, height: 40, paddingHorizontal: 8 },

    topButton: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: T.nav,
        alignItems: 'center',
        justifyContent: 'center',
        ...S.sheet,
    },

    // confirm sheet
    dialogHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dialogIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dialogParty: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink, lineHeight: 19 },
    dialogBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    dialogWide: { flex: 1.6 },
    dialogButtons: { flex: 1, flexDirection: 'row', gap: 10 },
    dialogBtn: { flex: 1, minWidth: 0 },
    dialogStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.hair,
    },
    loadingText: { fontSize: 13.5, fontWeight: '800', color: T.nav },
    responseText: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '700', color: T.nav },
});

export default OutstandingDaysRequestNEW;
