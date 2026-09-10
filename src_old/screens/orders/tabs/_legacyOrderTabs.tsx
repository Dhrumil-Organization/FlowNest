import AppAlert from '@/common/utils/appAlert';
// FILE: src/screens/orders/tabs/_legacyOrderTabs.tsx
// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY — NOT YET MIGRATED. This file is AuthTab, TrackingTab, and
// SummaryTab extracted verbatim from the original SalesOrderNew/index.tsx
// (only the import block below and the exports at the bottom were added —
// the function bodies themselves are byte-for-byte unchanged from the
// original). They still use raw axios, the file's own local PickerSheet,
// and hardcoded colors rather than the app's shared conventions.
//
// This exists so the whole Orders screen stays fully functional while the
// migration proceeds tab-by-tab (see ORDERS_MIGRATION.md) — NewOrderTab and
// the root screen are fully converted; these three are next. Delete this
// file once all three are migrated into their own proper files.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, FlatList,
    TouchableOpacity, TextInput, Modal, Alert,
    ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL as API } from '@/src/api/client';

// ── Helpers (duplicated from the original file's top-level helpers —
//    kept local here rather than shared, since this whole file is
//    temporary scaffolding, not a permanent module). ──────────────────
const fmtDisplay = (d: any) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};
const ymd = (d: any) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
};
const parseNum = (v: any) => Number(String(v || '0').replace(/,/g, ''));
const moneyShort = (v: any) => {
    const n = parseNum(v);
    return n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
};
const authHdr = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-platform': 'mob',
});

// ── Bottom Sheet Picker (local to this file, same as the original —
//    NOT the app's real PickerSheet.tsx; a naming collision that gets
//    resolved once SummaryTab is migrated to MasterSelectField). ──────
function PickerSheet({ visible, title, items, keyField, labelField, subField,
    search, setSearch, onSelect, onClose, loading, renderItem }: any) {
    const filtered = search
        ? items.filter((i: any) =>
            String(i[labelField] || '').toLowerCase().includes(search.toLowerCase()) ||
            String(i[keyField] || '').toLowerCase().includes(search.toLowerCase()))
        : items;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={P.safe} edges={['top', 'bottom']}>
                <View style={P.header}>
                    <TouchableOpacity onPress={onClose} style={P.backBtn}>
                        <Text style={P.backText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={P.title}>{title}</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={P.searchRow}>
                    <Text style={P.searchIcon}>⌕</Text>
                    <TextInput value={search} onChangeText={setSearch}
                        placeholder={`Search ${title.toLowerCase()}...`}
                        placeholderTextColor="#9ca3af"
                        style={P.searchInput} />
                    {!!search && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={{ color: '#9ca3af', fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {loading ? (
                    <View style={P.loader}><ActivityIndicator color="#13879A" /></View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item, i) => `${item[keyField]}_${i}`}
                        renderItem={renderItem
                            ? ({ item }) => renderItem(item)
                            : ({ item }) => (
                                <TouchableOpacity style={P.row} onPress={() => { onSelect(item); onClose(); }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={P.rowText}>{item[labelField]}</Text>
                                        {!!subField && !!item[subField] && <Text style={P.rowSub}>{item[subField]}</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                        ListEmptyComponent={<View style={P.empty}><Text style={P.emptyText}>No results found</Text></View>}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const P = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    header: { height: 56, backgroundColor: '#13879A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
    backBtn: { width: 36 },
    backText: { color: '#fff', fontSize: 32, lineHeight: 38 },
    title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
    searchRow: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#f1f5f9', borderRadius: 10, height: 44, paddingHorizontal: 12, gap: 8 },
    searchIcon: { fontSize: 18, color: '#9ca3af' },
    searchInput: { flex: 1, fontSize: 14, color: '#101828' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    row: { padding: 16, borderBottomWidth: .5, borderBottomColor: '#f1f5f9' },
    rowText: { fontSize: 14, color: '#101828' },
    rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9ca3af' },
});

// ── ─────────────────────────────────────────────────────────────
//    AUTH TAB
// ── ─────────────────────────────────────────────────────────────
// ── ─────────────────────────────────────────────────────────────
//    AUTH TAB
// ── ─────────────────────────────────────────────────────────────
function AuthTab({ token }) {
    const [pending, setPending] = useState([]);
    const [authorised, setAuthorised] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [showFrom, setShowFrom] = useState(false);
    const [showTo, setShowTo] = useState(false);
    const [approving, setApproving] = useState(null);
    const [prpcode, setPrpCode] = useState('');
    const [yearno, setYearNo] = useState('');
    const [expandedId, setExpandedId] = useState(null); // ← track which card is open

    useEffect(() => {
        if (!token) return;
        const today = new Date();
        const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        setFromDate(new Date(fy, 3, 1));
        setToDate(today);
    }, [token]);

    useEffect(() => {
        const loadFilterData = async () => {
            const code = await AsyncStorage.getItem('selected_prpcode');
            const year = await AsyncStorage.getItem('selected_yearno');
            setPrpCode(code || '');
            setYearNo(year ? `${year.slice(-2)}` : '');
        };
        loadFilterData();
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        if (!fromDate || !toDate) return;
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const base = {
                prptype: userPtype,
                strcode: '012',
                fromdate: ymd(fromDate),
                todate: ymd(toDate),
                strtype: 'g',
                txntype: 'sales_order',
                referrer: 'mob_dashboard',
                yearno: '27',
                prpcode: prpcode,
                prpcodes: [],
                search: '',
            };
            console.log("base", base);
            const cfg = (extra) => ({ headers: authHdr(token), params: { ...base, ...extra } });

            const [pRes, aRes] = await Promise.all([
                axios.get(`${API}/api/sosortbrowse`, cfg({ isauth: 0, atype: 'b' })),
                axios.get(`${API}/api/sosortbrowse`, cfg({ isauth: 1, atype: 'm' })),
            ]);

            console.log("pRes", pRes);
            console.log("aRes", aRes);
            setPending(pRes.data?.response?.data || []);
            setAuthorised(aRes.data?.response?.data || []);
        } catch (e) {
            console.log('auth load', e?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fromDate, toDate, token, prpcode, yearno]);

    useEffect(() => {
        if (!token) return;
        load();
    }, [prpcode, yearno, fromDate, toDate, token]);

    const approveOrder = async (item, action) => {
        console.log("here...")
        try {
            setApproving(item.UId);
            const payload = {
                UId: item.UId,
                PrpCode: item.PrpCode,
                StrCode: item.StrCode || '012',
                ARemark: '',
                aremark: '',
                IsAuth: 1,
                referrer: 'dashboard',
                txntype: 'sales_order',
                action: 'edit',
                GrpCode: item.GrpCode || '',
                SONo: item.SONo || '',
                PONo: item.PONo || '',
                NSODate: item.NSODate || '',
                SODate: item.SODate || '',
                PODate: item.PODate || '',
                ParCode: item.ParCode || '',
                ParName: item.ParName || '',
                DueDay: item.DueDay || '',
                DueDate: item.DueDate || '',
                BAccCode: item.BAccCode || '',
                BAccName: item.BAccName || '',
                EntType: item.EntType || '',
                EntryType: item.EntryType || '',
                NetAmt: item.NetAmt || '',
                Remark: item.Remark || '',
                Status: item.Status || '',
                AuthCode: item.AuthCode || '',
                AUsrCode: item.AUsrCode || '',
                ALastDate: item.ALastDate || '',
                ALastTime: item.ALastTime || '',
                AuthStatus: item.AuthStatus || '',
                AuthorisedBy: item.AuthorisedBy || '',
                yearno: item.yearno || '',
                yarnstrcode: item.yarnstrcode || '',
                greystrcode: item.greystrcode || '',
                chipsstrcode: item.chipsstrcode || '',
                AuthorisedDate: item.AuthorisedDate || '',
                PTYPE: item.PTYPE || '',
                CountOfItem: item.CountOfItem || '',
                mailsent: '',
                StoreName: item.StoreName || '',
                dduedate: item.dduedate || '',
                username: item.username || '',
                itemNameArray: '',
            };
            const res = await axios.get(
                `${API}/api/authso`,
                {
                    headers: authHdr(token),
                    params: payload,
                }
            );

            console.log("payload", payload);
            console.log("res", res);

            if (res.data?.success) {
                load();
                AppAlert.alert('Done', `Order ${action}d successfully`);
            } else {
                AppAlert.alert('Failed', res.data?.message || 'Action failed');
            }
        } catch (e) {
            AppAlert.alert('Error', e?.message);
        } finally {
            setApproving(null);
        }
    };

    const toggleExpand = (uid) => {
        setExpandedId(prev => (prev === uid ? null : uid));
    };

    // ── Helpers to read from real API fields ──────────────────────

    // Design name: from first d1 row
    const getDesignName = (item) => item.d1?.[0]?.DsnName || '';

    // Total qty: sum of all d1 rows
    const getTotalQty = (item) => {
        if (!Array.isArray(item.d1)) return 0;
        return item.d1.reduce((s, r) => s + parseNum(r.Qty), 0);
    };

    const getRatePerM = (item) => {
        const raw = item.d1?.[0]?.UnitRate;
        return raw ? String(raw).replace(/,/g, '') : '—';
    };

    // SO identifier: formatted as SO-YYYYMMDD-NNN
    const getSoId = (item) => {
        if (!item.NSODate || !item.SONo) return item.SONo || '—';
        return `SO-${item.NSODate}-${item.SONo}`;
    };

    // ── Pending card ──────────────────────────────────────────────
    const renderPendingCard = (item) => {
        const isOpen = expandedId === item.UId;
        const totalQty = getTotalQty(item);
        const ratePerM = getRatePerM(item);
        const designName = getDesignName(item);
        const soId = getSoId(item);

        return (
            <View key={item.UId} style={A.card}>
                {/* ── Summary row (always visible) ── */}
                <TouchableOpacity
                    style={A.cardSummaryRow}
                    onPress={() => toggleExpand(item.UId)}
                    activeOpacity={0.8}
                >
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={A.soMetaRow}>
                            <Text style={A.soNo}>{soId}</Text>
                            <View style={A.pendingBadge}>
                                <Text style={A.pendingBadgeText}>Pending</Text>
                            </View>
                        </View>
                        <Text style={A.partyNameLg}>{item.ParName}</Text>
                        <Text style={A.designNameSm}>{designName}</Text>
                    </View>
                    <View style={A.cardSummaryRight}>
                        <Text style={A.cardAmt}>
                            {moneyShort(item.NetAmt)}
                        </Text>
                        <Text style={A.cardQty}>Qty:{totalQty.toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={[A.chevron, isOpen && A.chevronOpen]}>▾</Text>
                </TouchableOpacity>

                {/* ── Expanded detail ── */}
                {isOpen && (
                    <View style={A.cardDetail}>
                        {/* Exec · Rate · Due */}
                        <View style={A.execRow}>
                            <Text style={A.execText}>
                                Exec: <Text style={A.execName}>{item.SexecName || '—'}</Text>
                            </Text>
                            {/* <Text style={A.execPill}>₹/m: {ratePerM}</Text> */}
                            <Text style={A.execPill}>Due: {item.dduedate || item.DueDate || '—'}</Text>
                        </View>

                        {/* Shade rows from d1 */}
                        {Array.isArray(item.d1) && item.d1.map((row, i) => (
                            <View key={`${row.ShdCode}_${i}`} style={A.shadeRow}>
                                <View style={[
                                    A.shadeSwatch,
                                    { backgroundColor: row.ShdColor || shadeColorFromName(row.ShdName) }
                                ]} />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={A.shadeName}>{row.ShdName}</Text>
                                    <Text style={A.shadeType}>{row.ItmName}</Text>
                                </View>
                                <Text style={A.shadeQty}>
                                    {Number(row.Qty || 0).toLocaleString('en-IN')} Qty
                                </Text>
                            </View>
                        ))}

                        {/* VS Latest Costing — only if data available */}
                        {item.CostPerM ? (
                            <View style={A.costBox}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={A.costLbl}>
                                            VS LATEST COSTING{item.CostMonth ? ` (${item.CostMonth})` : ''}
                                        </Text>
                                        <Text style={A.costDetail}>
                                            Cost ₹{Number(item.CostPerM).toFixed(0)}  ·  Rate ₹{ratePerM}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {(() => {
                                            const diff = parseNum(ratePerM) - parseNum(item.CostPerM);
                                            const pct = parseNum(item.CostPerM) > 0
                                                ? (diff / parseNum(item.CostPerM) * 100).toFixed(1)
                                                : null;
                                            const color = diff >= 0 ? '#16a34a' : '#dc2626';
                                            return (
                                                <>
                                                    <Text style={[A.costDiff, { color }]}>
                                                        ₹{diff >= 0 ? '+' : ''}{Math.round(diff)}
                                                    </Text>
                                                    {pct !== null && (
                                                        <Text style={[A.costMargin, { color }]}>
                                                            {pct}% margin
                                                        </Text>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        {/* Shortfall banner — only if data available */}
                        {Number(item.Shortfall) > 0 ? (
                            <View style={A.shortfallBox}>
                                <Text style={A.shortfallTitle}>
                                    ⚠ Shortfall — {Number(item.Shortfall).toLocaleString('en-IN')} m to produce
                                </Text>
                                <View style={A.shortfallMeta}>
                                    <Text style={A.shortfallPill}>
                                        Finished: <Text style={A.shortfallVal}>{Number(item.FinishedStock || 0).toLocaleString('en-IN')} m</Text>
                                    </Text>
                                    <Text style={A.shortfallPill}>
                                        Greige: <Text style={A.shortfallVal}>{Number(item.GreigeStock || 0).toLocaleString('en-IN')} m</Text>
                                    </Text>
                                    <Text style={A.shortfallPill}>
                                        Order: <Text style={A.shortfallVal}>{Number(item.OrderQty || 0).toLocaleString('en-IN')} m</Text>
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Approve / Reject */}
                        <View style={A.actRow}>
                            <TouchableOpacity
                                style={A.approveBtn}
                                onPress={() => approveOrder(item, 'approve')}
                                disabled={approving === item.UId}
                                activeOpacity={0.8}
                            >
                                <Text style={A.approveTxt}>
                                    {approving === item.UId ? '...' : '✓ Approve'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={A.rejectBtn}
                                onPress={() => approveOrder(item, 'reject')}
                                disabled={approving === item.UId}
                                activeOpacity={0.8}
                            >
                                <Text style={A.rejectTxt}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // ── Authorized card ───────────────────────────────────────────
    const renderAuthCard = (item) => {
        const isOpen = expandedId === item.UId;
        const totalQty = getTotalQty(item);
        const designName = getDesignName(item);
        const soId = getSoId(item);

        return (
            <View key={item.UId} style={A.card}>
                {/* Summary row */}
                <TouchableOpacity
                    style={A.cardSummaryRow}
                    onPress={() => toggleExpand(item.UId)}
                    activeOpacity={0.8}
                >
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={A.soNo}>{soId}</Text>
                        <Text style={A.partyNameLg}>{item.ParName}</Text>
                        <Text style={A.designNameSm}>{designName}</Text>
                    </View>
                    <View style={A.cardSummaryRight}>
                        <Text style={A.cardAmt}>{moneyShort(item.NetAmt)}</Text>
                        <Text style={A.cardQty}>Qty:{totalQty.toLocaleString('en-IN')}</Text>
                    </View>
                    <TouchableOpacity
                        style={A.jobBtn}
                        onPress={() => {/* TODO: open job chart */ }}
                        activeOpacity={0.8}
                    >
                        <Text style={A.jobBtnText}>Job chart</Text>
                    </TouchableOpacity>
                    <Text style={[A.chevron, isOpen && A.chevronOpen]}>▾</Text>
                </TouchableOpacity>

                {/* Expanded detail */}
                {isOpen && (
                    <View style={A.cardDetail}>
                        <View style={A.execRow}>
                            <Text style={A.execText}>
                                Exec: <Text style={A.execName}>{item.SexecName || '—'}</Text>
                            </Text>
                            {/* <Text style={A.execPill}>₹/m: {getRatePerM(item)}</Text> */}
                            <Text style={A.execPill}>Due: {item.dduedate || item.DueDate || '—'}</Text>
                        </View>

                        {Array.isArray(item.d1) && item.d1.map((row, i) => (
                            <View key={`${row.ShdCode}_${i}`} style={A.shadeRow}>
                                <View style={[
                                    A.shadeSwatch,
                                    { backgroundColor: row.ShdColor || shadeColorFromName(row.ShdName) }
                                ]} />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={A.shadeName}>{row.ShdName}</Text>
                                    <Text style={A.shadeType}>{row.ItmName}</Text>
                                </View>
                                <Text style={A.shadeQty}>
                                    {Number(row.Qty || 0).toLocaleString('en-IN')} Qty
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // ── Shade color fallback (deterministic pastel from name) ─────
    const shadeColorFromName = (name = '') => {
        const colors = [
            '#b5c4d0', '#d4a97a', '#8dab8e', '#c5b8d2',
            '#e8c97a', '#a8c4b8', '#d4b483', '#9fb8d4',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) {
        return (
            <View style={A.centered}>
                <ActivityIndicator color="#13879A" size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => load(true)}
                    colors={['#13879A']}
                />
            }
        >
            {/* Date filter strip */}
            <View style={A.dateStrip}>
                <TouchableOpacity style={A.datePill} onPress={() => setShowFrom(true)}>
                    <Text style={A.datePillText}>From: {fromDate ? fmtDisplay(fromDate) : '—'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={A.datePill} onPress={() => setShowTo(true)}>
                    <Text style={A.datePillText}>To: {toDate ? fmtDisplay(toDate) : '—'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={A.applyBtn} onPress={() => load()}>
                    <Text style={A.applyBtnText}>Apply</Text>
                </TouchableOpacity>
            </View>

            <Text style={A.sectionHead}>
                Pending <Text style={A.sectionCnt}>{pending.length}</Text>
            </Text>
            {pending.map(renderPendingCard)}
            {pending.length === 0 && (
                <View style={A.emptyBox}>
                    <Text style={A.emptyText}>No pending orders</Text>
                </View>
            )}

            <Text style={[A.sectionHead, { marginTop: 20 }]}>
                Authorized <Text style={A.sectionCnt}>{authorised.length}</Text>
            </Text>
            {authorised.map(renderAuthCard)}
            {authorised.length === 0 && (
                <View style={A.emptyBox}>
                    <Text style={A.emptyText}>No authorized orders</Text>
                </View>
            )}

            {showFrom && (
                <DateTimePicker
                    value={fromDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, d) => {
                        setShowFrom(false);
                        if (e.type === 'set' && d) setFromDate(d);
                    }}
                />
            )}
            {showTo && (
                <DateTimePicker
                    value={toDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, d) => {
                        setShowTo(false);
                        if (e.type === 'set' && d) setToDate(d);
                    }}
                />
            )}
        </ScrollView>
    );
}

// ── ─────────────────────────────────────────────────────────────
//    TRACKING TAB
// ── ─────────────────────────────────────────────────────────────
// TrackingTab — Sales Order Tracking (matches approved mockup)
// Assumes same imports as OrdersScreen.jsx:
// React, { useState, useEffect, useCallback }, axios, AsyncStorage,
// View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Modal,
// ActivityIndicator, RefreshControl, Alert, Platform, StyleSheet,
// DateTimePicker, API, authHdr, fmtDisplay

// ── ─────────────────────────────────────────────────────────────
//    TRACKING TAB  (full replacement — matches approved mockups)
//
//    Paste into OrdersScreen.jsx replacing the old TrackingTab.
//    • Module-level helpers below (STATUS_FILTERS … isAPCShade)
//      go near your other helpers (after authHdr).
//    • The `Tr` StyleSheet goes next to your other style blocks.
//    • Job chart "Copy" needs:  npm i @react-native-clipboard/clipboard
//      then add at top of file:
//      import Clipboard from '@react-native-clipboard/clipboard';
// ── ─────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'authorized', label: 'Authorized' },
    { key: 'partial', label: 'Partial' },
    { key: 'completed', label: 'Completed' },
];

const num = (v) => Number(v) || 0;
const fmtIN = (v) => Math.round(num(v)).toLocaleString('en-IN');

const STATUS_META = {
    completed: { label: 'Completed', bg: '#ECFDF3', fg: '#027A48' },
    partial: { label: 'Partial', bg: '#FEF3C7', fg: '#92400E' },
    authorized: { label: 'Authorized', bg: '#EFF6FF', fg: '#1D4ED8' },
};

// APC = shade placeholder awaiting colour confirmation.
// Adjust the detection to whatever the ERP actually sends
// (flag field, special ShdCode, or the name itself).
const isAPCShade = (sh) =>
    sh?.IsAPC === 1 || sh?.IsAPC === '1' ||
    String(sh?.ShdCode || '').toUpperCase() === 'APC' ||
    /^apc\b/i.test(String(sh?.ShdName || sh?.ShadeName || ''));

const getShades = (item) => item?.Items || item?.D1 || item?.d1 || [];

const hasAPC = (item) => getShades(item).some(isAPCShade);

const getOrderStatus = (item) => {
    const ordered = num(item.OrderQty ?? item.totmtr);
    const pending = num(item.PendingQty ?? item.pendingmtr);
    const dispatched = ordered - pending;
    if (ordered > 0 && dispatched >= ordered) return 'completed';
    if (dispatched > 0) return 'partial';
    return 'authorized';
};

// Buttons shown depend on the ACTIVE FILTER CHIP (per spec):
//   All        → Job chart
//   Authorized → Dispatch · Confirm APC (if order has APC) · Job chart
//   Partial    → Dispatch · Job chart
//   Completed  → Job chart
const getCardActions = (filterKey, item) => {
    switch (filterKey) {
        case 'authorized':
            return hasAPC(item)
                ? ['dispatch', 'confirmAPC', 'job']
                : ['dispatch', 'job'];
        case 'partial':
            return ['dispatch', 'job'];
        case 'completed':
        case 'all':
        default:
            return ['job'];
    }
};

// ── Component ────────────────────────────────────────────────────

function TrackingTab({ token }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [prpcode, setPrpCode] = useState('');
    const [yearno, setYearNo] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Dispatch modal
    const [dispItem, setDispItem] = useState(null);
    const [dispQtys, setDispQtys] = useState({});
    const [dispChecked, setDispChecked] = useState({});
    const [dispatching, setDispatching] = useState(false);

    // Confirm APC modal
    const [confirmItem, setConfirmItem] = useState(null);   // order being confirmed
    const [confirmShadeRow, setConfirmShadeRow] = useState(null); // the APC d1 row
    const [confirmShades, setConfirmShades] = useState([]);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmSaving, setConfirmSaving] = useState(false);
    const [totalDispatchQty, setTotalDispatchQty] = useState('');

    // Job chart modal
    const [jobItem, setJobItem] = useState(null);

    useEffect(() => {
        const loadFilterData = async () => {
            const code = await AsyncStorage.getItem('selected_prpcode');
            const year = await AsyncStorage.getItem('selected_yearno');
            setPrpCode(code || '');
            setYearNo(year ? `${year.slice(-2)}` : '');
        };
        loadFilterData();
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        try {
            const userPtype = await AsyncStorage.getItem('user_prptype');
            isRefresh ? setRefreshing(true) : setLoading(true);
            const params = {
                referrer: 'mob_dashboard',
                strtype: 'g',
                fromdate: '',
                deldate: '',
                todate: '',
                yearno: yearno || '27',
                sexes: '',
                type: 'all',
                wise: 'order',          // TODO confirm with ERP: order-wise list
                dsncodes: [],
                itemcodes: [],
                parties: [],
                prptype: userPtype,
                txntype: 'prodorderlist',
            };
            const res = await axios.post(
                `${API}/api/salesordertracking`,
                params,
                { headers: authHdr(token) }
            );
            console.log("res", res);
            setOrders(res?.data?.data?.salesdata || []);
        } catch (e) {
            console.log('tracking err', e?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, yearno]);

    useEffect(() => {
        if (!token) return;
        load();
    }, [yearno, token]);

    // ── Aggregates (all orders, not filtered) ──
    const totalOrdered = orders.reduce((s, it) => s + num(it.OrderQty ?? it.totmtr), 0);
    const totalPending = orders.reduce((s, it) => s + num(it.PendingQty ?? it.pendingmtr), 0);
    const totalDispatched = totalOrdered - totalPending;
    const overallPct = totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0;

    // ── Filtering ──
    const filteredOrders = orders.filter((it) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            (it.ParName || it.partyname || '').toLowerCase().includes(q) ||
            (it.DsnName || '').toLowerCase().includes(q) ||
            (it.SONo || it.SO_No || '').toLowerCase().includes(q);
        const matchesStatus =
            statusFilter === 'all' || getOrderStatus(it) === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // ── Dispatch ──
    const openDispatch = (item) => {
        const qtys = {};
        const checked = {};
        getShades(item).forEach((sh) => {
            qtys[sh.ShdCode] = '';
            // non-APC shades pre-checked; APC can't be checked at all
            checked[sh.ShdCode] = !isAPCShade(sh);
        });
        setTotalDispatchQty(
            String(item.PendingQty ?? item.pendingmtr ?? item.totmtr ?? 0)
        );
        setDispQtys(qtys);
        setDispChecked(checked);
        setDispItem(item);
    };

    const toggleDispCheck = (sh) => {
        if (isAPCShade(sh)) return; // locked until confirmed
        setDispChecked((p) => ({ ...p, [sh.ShdCode]: !p[sh.ShdCode] }));
    };

    // const modalTotal = getShades(dispItem || {}).reduce((s, sh) => {
    //     if (!dispChecked[sh.ShdCode]) return s;
    //     return s + num(dispQtys[sh.ShdCode]);
    // }, 0);

    const modalTotal = num(
        dispItem?.PendingQty ?? dispItem?.pendingmtr
    );

    const apcCount = getShades(dispItem || {}).filter(isAPCShade).length;

    const handleDispatchQtyChange = (text) => {
        const cleaned = text.replace(/[^0-9.]/g, '');

        if (/^\d*\.?\d{0,3}$/.test(cleaned)) {
            setTotalDispatchQty(cleaned);
        }
    };

    const confirmDispatch = async () => {
        if (!dispItem) return;

        const pendingQty = Number(
            dispItem?.PendingQty ?? dispItem?.pendingmtr ?? 0
        );

        const enteredQty = Number(totalDispatchQty || 0);

        if (enteredQty > pendingQty) {
            AppAlert.alert(
                'Validation',
                `Dispatch Qty cannot exceed Pending Qty (${pendingQty.toFixed(3)} m)`
            );
            return;
        }

        const items = getShades(dispItem)
            .filter((sh) => dispChecked[sh.ShdCode] && num(dispQtys[sh.ShdCode]) > 0)
            .map((sh) => ({ ShdCode: sh.ShdCode, Qty: num(dispQtys[sh.ShdCode]) }));
        if (items.length === 0) {
            AppAlert.alert('Required', 'Enter at least one dispatch quantity');
            return;
        }
        try {
            setDispatching(true);
            const res = await axios.post(`${API}/api/sodispatch`, {
                uid: dispItem.UId,
                prpcode: dispItem.PrpCode || prpcode,
                strcode: dispItem.StrCode || '012',
                Items: items,
            }, { headers: authHdr(token) });
            if (res.data?.success) {
                setDispItem(null);
                load();
                AppAlert.alert('Done', 'Dispatched successfully');
            } else {
                AppAlert.alert('Failed', res.data?.message || 'Dispatch failed');
            }
        } catch (e) {
            AppAlert.alert('Error', e?.message);
        } finally {
            setDispatching(false);
        }
    };

    // ── Confirm APC ──
    const openConfirmAPC = async (item) => {
        const apcRow = getShades(item).find(isAPCShade);
        if (!apcRow) return;
        setConfirmItem(item);
        setConfirmShadeRow(apcRow);
        setConfirmShades([]);
        try {
            setConfirmLoading(true);
            const res = await axios.get(`${API}/api/getshade`, {
                headers: authHdr(token),
                params: {
                    prpcode: item.PrpCode || prpcode,
                    strcode: item.StrCode || '012',
                    yearno: yearno,
                    itmcode: item.ItmCode || apcRow.ItmCode,
                    mitmcode: item.MItmCode || apcRow.MItmCode || item.ItmCode || apcRow.ItmCode,
                    dsncode: item.DsnCode || apcRow.DsnCode,
                },
            });
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            // exclude APC itself from the choices
            setConfirmShades((Array.isArray(data) ? data : []).filter((s) => !isAPCShade(s)));
        } catch (e) {
            setConfirmShades([]);
        } finally {
            setConfirmLoading(false);
        }
    };

    const confirmAPCShade = async (shade) => {
        if (!confirmItem || !confirmShadeRow) return;
        try {
            setConfirmSaving(true);
            // TODO: replace with the real ERP endpoint for converting an
            // APC line to a confirmed shade. Payload below is a best guess —
            // verify field names against the web dashboard's network call.
            const res = await axios.post(`${API}/api/soconfirmapc`, {
                uid: confirmItem.UId,
                prpcode: confirmItem.PrpCode || prpcode,
                strcode: confirmItem.StrCode || '012',
                OldShdCode: confirmShadeRow.ShdCode,
                ShdCode: shade.ShdCode,
                ShdName: shade.ShdName || shade.ShadeName,
            }, { headers: authHdr(token) });
            if (res.data?.success) {
                setConfirmItem(null);
                setConfirmShadeRow(null);
                load();
                AppAlert.alert('Done', `APC confirmed as ${shade.ShdName || shade.ShadeName}`);
            } else {
                AppAlert.alert('Failed', res.data?.message || 'Could not confirm shade');
            }
        } catch (e) {
            AppAlert.alert('Error', e?.message);
        } finally {
            setConfirmSaving(false);
        }
    };

    // ── Job chart ──
    const buildJobChartText = (item) => {
        if (!item) return '';
        const lines = [];
        lines.push('JOB CHART');
        lines.push(`REF: ${item.SONo || item.SO_No || ''}`);
        lines.push(`DESIGN: ${item.DsnName || ''}`);
        if (item.FabState || item.StageName) lines.push(`STAGE: ${item.FabState || item.StageName}`);
        lines.push('');
        lines.push('SHADE / COLOUR');
        getShades(item).forEach((sh) => {
            const qty = `${fmtIN(sh.OrderQty ?? sh.Qty)} m`;
            if (isAPCShade(sh)) lines.push(`APC — not confirmed  ${qty}`);
            else lines.push(`${sh.ShdName || sh.ShadeName}  ${qty}`);
        });
        const tot = getShades(item).reduce((s, sh) => s + num(sh.OrderQty ?? sh.Qty), 0);
        lines.push('');
        lines.push(`TOTAL: ${fmtIN(tot)} m`);
        return lines.join('\n');
    };

    const copyJobChart = () => {
        try {
            Clipboard.setString(buildJobChartText(jobItem));
            AppAlert.alert('Copied', 'Job chart copied to clipboard');
        } catch (e) {
            AppAlert.alert('Error', 'Clipboard unavailable — install @react-native-clipboard/clipboard');
        }
    };

    // ── SO card ──
    const renderOrderCard = (item) => {
        const ordered = num(item.OrderQty ?? item.totmtr);
        const pending = num(item.PendingQty ?? item.pendingmtr);
        const dispatched = ordered - pending;
        const pct = ordered > 0 ? Math.min(100, (dispatched / ordered) * 100) : 0;
        const status = getOrderStatus(item);
        const meta = STATUS_META[status];
        const barColor = status === 'completed' ? '#14532D' : '#C2823A';
        const marginVal = item.MarginPerM != null ? Number(item.MarginPerM) : null;
        const shades = getShades(item);
        const actions = getCardActions(statusFilter, item);

        return (
            <View key={item.UId} style={Tr.card}>
                <View style={Tr.cardHead}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={Tr.soNo}>{item.SONo || item.SO_No}</Text>
                            <View style={[Tr.badge, { backgroundColor: meta.bg }]}>
                                <Text style={[Tr.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                            </View>
                            {hasAPC(item) && (
                                <View style={Tr.apcBadge}>
                                    <Text style={Tr.apcBadgeText}>⊙ APC</Text>
                                </View>
                            )}
                        </View>
                        <Text style={Tr.party}>{item.ParName || item.partyname}</Text>
                        <Text style={Tr.meta}>
                            {item.DsnName || ''} · due {item.DeliveryDate || item.DueDate || '—'}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={Tr.amt}>₹{fmtIN(item.NetAmt ?? item.amount)}</Text>
                        <Text style={Tr.qtySub}>{fmtIN(ordered)} m</Text>
                    </View>
                </View>

                <View style={Tr.progRow}>
                    <View style={Tr.progTrack}>
                        <View style={[Tr.progFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={Tr.progPct}>{Math.round(pct)}%</Text>
                </View>

                {shades.length > 0 && (
                    <View style={Tr.chipWrap}>
                        {shades.map((sh, i) => {
                            const apc = isAPCShade(sh);
                            const shOrd = num(sh.OrderQty ?? sh.Qty);
                            const shDisp = num(sh.DispQty ?? sh.DispatchedQty);
                            const done = shOrd > 0 && shDisp >= shOrd;
                            return (
                                <View key={i} style={[Tr.shadeChip, apc && Tr.shadeChipAPC]}>
                                    {!apc && (
                                        <View style={[Tr.shadeDot, { backgroundColor: sh.ShdColor || '#94A3B8' }]} />
                                    )}
                                    <Text style={[Tr.shadeName, apc && { color: '#B45309' }]}>
                                        {apc ? '⊙ APC' : (sh.ShdName || sh.ShadeName)}
                                    </Text>
                                    <Text style={[Tr.shadeQty, done && { color: '#16A34A' }, apc && { color: '#B45309' }]}>
                                        {done ? `✓ ${fmtIN(shOrd)}` : `${fmtIN(shDisp)}/${fmtIN(shOrd)}`}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {marginVal != null && (
                    <Text style={[Tr.margin, { color: marginVal >= 0 ? '#16A34A' : '#DC2626' }]}>
                        Margin ₹{item.MarginPerM}/m
                        {item.MarginPct != null ? ` (${Number(item.MarginPct).toFixed(1)}%)` : ''} vs costing
                    </Text>
                )}

                <View style={Tr.btnRow}>
                    {actions.includes('dispatch') && (
                        <TouchableOpacity style={Tr.dispBtn} onPress={() => openDispatch(item)}>
                            <Text style={Tr.dispBtnText}>Dispatch</Text>
                        </TouchableOpacity>
                    )}
                    {actions.includes('confirmAPC') && (
                        <TouchableOpacity style={Tr.confirmApcBtn} onPress={() => openConfirmAPC(item)}>
                            <Text style={Tr.confirmApcBtnText}>Confirm APC</Text>
                        </TouchableOpacity>
                    )}
                    {actions.includes('job') && (
                        <TouchableOpacity style={Tr.jobBtn} onPress={() => setJobItem(item)}>
                            <Text style={Tr.jobBtnText}>Job chart</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#13879A" size="large" />
            </View>
        );
    }

    const jobShades = getShades(jobItem || {});
    const jobTotal = jobShades.reduce((s, sh) => s + num(sh.OrderQty ?? sh.Qty), 0);

    return (
        <>
            <FlatList
                data={filteredOrders}
                keyExtractor={(item, i) => `${item.UId}_${i}`}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => load(true)}
                        colors={['#13879A']}
                    />
                }
                contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                renderItem={({ item }) => renderOrderCard(item)}
                ListHeaderComponent={
                    <>
                        {/* summary */}
                        <View style={Tr.summaryCard}>
                            <View style={Tr.summaryTop}>
                                <View style={Tr.donutOuter}>
                                    <View style={Tr.donutInner}>
                                        <Text style={Tr.donutPct}>{Math.round(overallPct)}%</Text>
                                        <Text style={Tr.donutLbl}>DONE</Text>
                                    </View>
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <View style={Tr.mixBar}>
                                        <View style={[Tr.mixGreen, { width: `${overallPct}%` }]} />
                                    </View>
                                    <View style={Tr.mixLabels}>
                                        <Text style={Tr.dispLbl}>■ {fmtIN(totalDispatched)} m dispatched</Text>
                                        <Text style={Tr.pendLbl}>■ {fmtIN(totalPending)} m pending</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={Tr.statsRow}>
                                <View style={Tr.statBox}>
                                    <Text style={Tr.statHead}>ORDERED</Text>
                                    <Text style={Tr.statNum}>{fmtIN(totalOrdered)} m</Text>
                                </View>
                                <View style={[Tr.statBox, { backgroundColor: '#ECFDF3' }]}>
                                    <Text style={Tr.statHead}>DISPATCHED</Text>
                                    <Text style={[Tr.statNum, { color: '#16A34A' }]}>{fmtIN(totalDispatched)} m</Text>
                                </View>
                                <View style={[Tr.statBox, { backgroundColor: '#FFF7ED' }]}>
                                    <Text style={Tr.statHead}>PENDING</Text>
                                    <Text style={[Tr.statNum, { color: '#C2823A' }]}>{fmtIN(totalPending)} m</Text>
                                </View>
                            </View>
                        </View>

                        {/* filter chips */}
                        <View style={Tr.filterRow}>
                            {STATUS_FILTERS.map((f) => {
                                const active = statusFilter === f.key;
                                return (
                                    <TouchableOpacity
                                        key={f.key}
                                        onPress={() => setStatusFilter(f.key)}
                                        style={[Tr.filterChip, active && Tr.filterChipActive]}
                                    >
                                        <Text style={active ? Tr.filterTextActive : Tr.filterText}>
                                            {f.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* search */}
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search party or design..."
                            placeholderTextColor="#9CA3AF"
                            style={Tr.searchInput}
                        />
                    </>
                }
                ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af' }}>No tracking data found</Text>
                    </View>
                }
            />


            {/* ── Dispatch Modal ── */}
            <Modal
                visible={!!dispItem}
                animationType="slide"
                transparent
                onRequestClose={() => setDispItem(null)}
            >
                <View style={Tr.modalOverlay}>
                    <View style={Tr.modalSheet}>
                        <View style={Tr.modalGrab} />
                        <View style={Tr.modalHead}>
                            <Text style={Tr.modalTitle}>Dispatch · {dispItem?.SONo}</Text>
                            <TouchableOpacity onPress={() => setDispItem(null)}>
                                <Text style={{ fontSize: 24, color: '#667085' }}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {apcCount > 0 && (
                                <View style={Tr.apcWarnBox}>
                                    <Text style={Tr.apcWarnText}>
                                        ⊙ {apcCount} APC shade(s) can't dispatch until confirmed.
                                    </Text>
                                </View>
                            )}

                            {getShades(dispItem || {}).map((sh, i) => {
                                const apc = isAPCShade(sh);
                                const checked = !!dispChecked[sh.ShdCode];
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            Tr.dispCard,
                                            checked && Tr.dispCardOn,
                                            apc && Tr.dispCardAPC,
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={Tr.dispCardTop}
                                            onPress={() => toggleDispCheck(sh)}
                                            activeOpacity={apc ? 1 : 0.7}
                                        >
                                            <View style={[
                                                Tr.checkbox,
                                                checked && Tr.checkboxOn,
                                                apc && Tr.checkboxDisabled,
                                            ]}>
                                                {checked && <Text style={Tr.checkboxTick}>✓</Text>}
                                            </View>
                                            <View style={[Tr.swatchSm, { backgroundColor: sh.ShdColor || '#94A3B8' }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[Tr.dispShadeName, apc && { color: '#B45309' }]}>
                                                    {apc ? '⊙ APC — not confirmed' : (sh.ShdName || sh.ShadeName)}
                                                </Text>
                                                <Text style={Tr.dispShadeSub}>
                                                    Pending {fmtIN(sh.PendingQty ?? sh.Qty)} m
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {checked && !apc && (
                                            <View style={Tr.dispQtyBlock}>
                                                <Text style={Tr.dispQtyLbl}>DISPATCH QTY</Text>
                                                <View style={Tr.dispInputWrap}>
                                                    <TextInput
                                                        style={Tr.dispInput}
                                                        value={dispQtys[sh.ShdCode] || ''}
                                                        onChangeText={(v) =>
                                                            setDispQtys((p) => ({ ...p, [sh.ShdCode]: v }))
                                                        }
                                                        keyboardType="decimal-pad"
                                                        placeholder="0"
                                                        placeholderTextColor="#d1d5db"
                                                    />
                                                    <Text style={Tr.dispInputUnit}>m</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            <View style={Tr.modalTotalRow}>
                                <Text style={{ color: '#667085' }}>Total to dispatch</Text>
                                {/* <Text style={Tr.modalTotalNum}>{fmtIN(modalTotal)} m</Text> */}
                                <TextInput
                                    style={[Tr.modalTotalNum, { minWidth: 100 }]}
                                    value={totalDispatchQty}
                                    onChangeText={handleDispatchQtyChange}
                                    onBlur={() => {
                                        const val = parseFloat(totalDispatchQty || 0);
                                        setTotalDispatchQty(val.toFixed(3));
                                    }}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor="#d1d5db"
                                />
                            </View>

                            <TouchableOpacity
                                style={[Tr.confirmBtn, (totalDispatchQty === 0 || dispatching) && { opacity: 0.5 }]}
                                onPress={confirmDispatch}
                                disabled={totalDispatchQty === 0 || dispatching}
                            >
                                <Text style={Tr.confirmBtnText}>
                                    {dispatching
                                        ? 'Dispatching...'
                                        : `Confirm dispatch (${(totalDispatchQty)} m)`}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Confirm APC (shade picker) Modal ── */}
            <Modal
                visible={!!confirmItem}
                animationType="slide"
                transparent
                onRequestClose={() => setConfirmItem(null)}
            >
                <View style={Tr.modalOverlay}>
                    <View style={Tr.modalSheet}>
                        <View style={Tr.modalGrab} />
                        <View style={Tr.modalHead}>
                            <Text style={Tr.modalTitle}>Confirm shade</Text>
                            <TouchableOpacity onPress={() => setConfirmItem(null)}>
                                <Text style={{ fontSize: 24, color: '#667085' }}>×</Text>
                            </TouchableOpacity>
                        </View>
                        {confirmLoading ? (
                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <ActivityIndicator color="#13879A" />
                            </View>
                        ) : (
                            <ScrollView>
                                {confirmShades.map((sh, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={Tr.confirmRow}
                                        onPress={() => confirmAPCShade(sh)}
                                        disabled={confirmSaving}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[Tr.shadeDotLg, { backgroundColor: sh.ShdColor || '#94A3B8' }]} />
                                        <Text style={Tr.confirmRowText}>
                                            {sh.ShdName || sh.ShadeName}
                                        </Text>
                                        {confirmSaving && <ActivityIndicator size="small" color="#13879A" />}
                                    </TouchableOpacity>
                                ))}
                                {confirmShades.length === 0 && (
                                    <View style={{ padding: 30, alignItems: 'center' }}>
                                        <Text style={{ color: '#9ca3af' }}>No shades found for this design</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Job Chart Modal ── */}
            <Modal
                visible={!!jobItem}
                animationType="slide"
                transparent
                onRequestClose={() => setJobItem(null)}
            >
                <View style={Tr.modalOverlay}>
                    <View style={Tr.modalSheet}>
                        <View style={Tr.modalGrab} />
                        <View style={Tr.modalHead}>
                            <Text style={Tr.modalTitle}>Job chart</Text>
                            <TouchableOpacity onPress={() => setJobItem(null)}>
                                <Text style={{ fontSize: 24, color: '#667085' }}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <View style={Tr.jobCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={Tr.jobLbl}>REF</Text>
                                        <Text style={Tr.jobRef}>{jobItem?.SONo || jobItem?.SO_No}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={Tr.jobLbl}>DESIGN</Text>
                                        <Text style={Tr.jobDesign}>{jobItem?.DsnName || '—'}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                                    {!!(jobItem?.FabState || jobItem?.StageName) && (
                                        <View style={Tr.jobTag}>
                                            <Text style={Tr.jobTagText}>
                                                {(jobItem.FabState || jobItem.StageName).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    {!!(jobItem?.FabType || jobItem?.ItmName) && (
                                        <View style={[Tr.jobTag, { backgroundColor: '#F3F4F6' }]}>
                                            <Text style={[Tr.jobTagText, { color: '#374151' }]}>
                                                {jobItem.FabType || jobItem.ItmName}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={Tr.jobTableHead}>
                                    <Text style={Tr.jobTableHeadText}>SHADE / COLOUR</Text>
                                </View>

                                {jobShades.map((sh, i) => {
                                    const apc = isAPCShade(sh);
                                    return (
                                        <View key={i} style={Tr.jobShadeRow}>
                                            {!apc && (
                                                <View style={[Tr.shadeDot, { backgroundColor: sh.ShdColor || '#94A3B8' }]} />
                                            )}
                                            <Text style={[Tr.jobShadeName, apc && { color: '#B45309', fontWeight: '700' }]}>
                                                {apc ? 'APC — not confirmed' : (sh.ShdName || sh.ShadeName)}
                                            </Text>
                                            <Text style={Tr.jobShadeQty}>
                                                {fmtIN(sh.OrderQty ?? sh.Qty)} m
                                            </Text>
                                        </View>
                                    );
                                })}

                                <View style={Tr.jobTotalRow}>
                                    <Text style={Tr.jobTotalLbl}>TOTAL</Text>
                                    <Text style={Tr.jobTotalNum}>{fmtIN(jobTotal)} m</Text>
                                </View>
                            </View>

                            <Text style={Tr.jobNote}>
                                Job chart carries no customer or pricing information.
                            </Text>

                            <TouchableOpacity style={Tr.copyBtn} onPress={copyJobChart}>
                                <Text style={Tr.copyBtnText}>Copy job chart text</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ── Tracking styles ──────────────────────────────────────────────

const Tr = StyleSheet.create({
    // summary
    summaryCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        marginBottom: 14, elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    summaryTop: { flexDirection: 'row', alignItems: 'center' },
    donutOuter: {
        width: 64, height: 64, borderRadius: 32, borderWidth: 5,
        borderColor: '#14532D', justifyContent: 'center', alignItems: 'center',
    },
    donutInner: { alignItems: 'center' },
    donutPct: { fontSize: 15, fontWeight: '800', color: '#14532D' },
    donutLbl: { fontSize: 8, color: '#9CA3AF', letterSpacing: 1 },
    mixBar: {
        height: 8, borderRadius: 4, backgroundColor: '#C2823A',
        overflow: 'hidden', flexDirection: 'row',
    },
    mixGreen: { backgroundColor: '#14532D', borderRadius: 4 },
    mixLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    dispLbl: { fontSize: 11, color: '#14532D', fontWeight: '600' },
    pendLbl: { fontSize: 11, color: '#C2823A', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    statBox: {
        flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 10,
    },
    statHead: { fontSize: 9, color: '#9CA3AF', letterSpacing: 0.8, fontWeight: '700' },
    statNum: {
        fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4,
        fontVariant: ['tabular-nums'],
    },

    // filter chips
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    },
    filterChipActive: { backgroundColor: '#1F2937', borderColor: '#1F2937' },
    filterText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    filterTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },

    // search
    searchInput: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
        borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 13, color: '#111827', marginBottom: 14,
    },

    // SO card
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        marginBottom: 12, elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardHead: { flexDirection: 'row' },
    soNo: {
        fontSize: 12, fontWeight: '700', color: '#C2823A',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    apcBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
        backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    },
    apcBadgeText: {
        fontSize: 10, fontWeight: '700', color: '#B45309',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    party: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 4 },
    meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    amt: { fontSize: 16, fontWeight: '800', color: '#111827' },
    qtySub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

    progRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
    progTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
    progFill: { height: '100%', borderRadius: 4 },
    progPct: { fontSize: 11, fontWeight: '700', color: '#374151', width: 36, textAlign: 'right' },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    shadeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999,
        paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FAFAFA',
    },
    shadeChipAPC: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    shadeDot: { width: 10, height: 10, borderRadius: 5 },
    shadeDotLg: { width: 16, height: 16, borderRadius: 8 },
    shadeName: { fontSize: 11, fontWeight: '700', color: '#111827' },
    shadeQty: {
        fontSize: 11, color: '#6B7280',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    margin: { fontSize: 11, fontWeight: '600', marginTop: 10 },

    btnRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
    dispBtn: {
        backgroundColor: '#DCFCE7', borderRadius: 10,
        paddingHorizontal: 18, paddingVertical: 9,
        borderWidth: 0.5, borderColor: '#86EFAC',
    },
    dispBtnText: { color: '#15803D', fontWeight: '700', fontSize: 13 },
    confirmApcBtn: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#fff',
    },
    confirmApcBtnText: { color: '#111827', fontWeight: '700', fontSize: 13 },
    jobBtn: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#fff',
    },
    jobBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },

    // modal shells
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 18, maxHeight: '85%',
    },
    modalGrab: {
        width: 44, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
        alignSelf: 'center', marginBottom: 12,
    },
    modalHead: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

    // dispatch modal
    apcWarnBox: {
        backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
        borderRadius: 10, padding: 12, marginBottom: 12,
    },
    apcWarnText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
    dispCard: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14,
        padding: 12, marginBottom: 10, backgroundColor: '#fff',
    },
    dispCardOn: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    dispCardAPC: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', opacity: 0.85 },
    dispCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
        borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxOn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    checkboxDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
    checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
    swatchSm: { width: 14, height: 14, borderRadius: 7 },
    dispShadeName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    dispShadeSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    dispQtyBlock: { marginTop: 12, marginLeft: 32 },
    dispQtyLbl: { fontSize: 9, color: '#9CA3AF', letterSpacing: 0.8, fontWeight: '700', marginBottom: 6 },
    dispInputWrap: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        backgroundColor: '#fff', paddingHorizontal: 12,
    },
    dispInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: '#111827' },
    dispInputUnit: { fontSize: 12, color: '#9CA3AF' },
    modalTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', backgroundColor: '#F9FAFB',
        borderRadius: 10, padding: 12, marginVertical: 12,
    },
    modalTotalNum: {
        fontWeight: '800', fontSize: 14, color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    confirmBtn: {
        backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0',
        borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    },
    confirmBtnText: { color: '#15803D', fontWeight: '700', fontSize: 14 },

    // confirm APC modal
    confirmRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    confirmRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },

    // job chart modal
    jobCard: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14,
        padding: 14, backgroundColor: '#fff',
    },
    jobLbl: { fontSize: 9, color: '#9CA3AF', letterSpacing: 0.8, fontWeight: '700' },
    jobRef: {
        fontSize: 15, fontWeight: '800', color: '#C2823A', marginTop: 3,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    jobDesign: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 3 },
    jobTag: {
        backgroundColor: '#ECFDF3', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    jobTagText: {
        fontSize: 10, fontWeight: '700', color: '#027A48',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    jobTableHead: {
        backgroundColor: '#FAF5EF', borderRadius: 6,
        paddingHorizontal: 10, paddingVertical: 6, marginTop: 14,
    },
    jobTableHeadText: { fontSize: 9, color: '#9CA3AF', letterSpacing: 0.8, fontWeight: '700' },
    jobShadeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    jobShadeName: { flex: 1, fontSize: 13, color: '#111827' },
    jobShadeQty: {
        fontSize: 13, fontWeight: '700', color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    jobTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingTop: 12,
    },
    jobTotalLbl: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', letterSpacing: 0.8 },
    jobTotalNum: {
        fontSize: 15, fontWeight: '800', color: '#C2823A',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    jobNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginVertical: 12 },
    copyBtn: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center', marginBottom: 10,
        backgroundColor: '#fff',
    },
    copyBtnText: { fontSize: 14, fontWeight: '700', color: '#111827' },
});


// ── ─────────────────────────────────────────────────────────────
//    SUMMARY TAB
// ── ─────────────────────────────────────────────────────────────
// ── ─────────────────────────────────────────────────────────────
//    SUMMARY TAB  (full replacement — matches approved mockups)
//
//    Paste into OrdersScreen.jsx replacing the old SummaryTab.
//    • Uses your existing PickerSheet component for the two filters.
//    • Add the `SU` StyleSheet next to your other style blocks.
//    • The old `SM` StyleSheet is no longer used by this tab —
//      delete it or keep it, no conflicts either way.
//    • Reuses helpers already in the file: num, fmtIN (from the
//      Tracking work), authHdr, API. If you skipped those, they're
//      one-liners: const num=v=>Number(v)||0;
//      const fmtIN=v=>Math.round(num(v)).toLocaleString('en-IN');
// ── ─────────────────────────────────────────────────────────────

function SummaryTab({ token }) {
    const MONTHS = (() => {
        const N = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date(); let m = now.getMonth(), y = now.getFullYear();
        return Array.from({ length: 6 }, () => {
            const label = `${N[m]} '${String(y).slice(-2)}`;
            const key = `${String(m + 1).padStart(2, '0')}${y}`;
            const r = { label, key, month: m + 1, year: y };
            m--; if (m < 0) { m = 11; y--; }
            return r;
        });
    })();

    const [selMonth, setSelMonth] = useState(MONTHS[0]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [filterCust, setFilterCust] = useState('');
    const [filterCustName, setFilterCustName] = useState('');

    const [filterDesign, setFilterDesign] = useState('');
    const [filterDesignName, setFilterDesignName] = useState('');
    const [showCustPicker, setShowCustPicker] = useState(false);
    const [showDsnPicker, setShowDsnPicker] = useState(false);
    const [custSearch, setCustSearch] = useState('');
    const [dsnSearch, setDsnSearch] = useState('');
    const [prpcode, setPrpCode] = useState('');
    const [yearno, setYearNo] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [partyLoading, setPartyLoading] = useState(false);
    const [parties, setParties] = useState([]);
    const [designList, setDesignList] = useState([]);
    const [designLoading, setDesignLoading] = useState(false);

    const getConfig = (params) => ({
        headers: authHdr(token),
        params,
    });

    useEffect(() => {
        const loadFilterData = async () => {
            const code = await AsyncStorage.getItem('selected_prpcode');
            const year = await AsyncStorage.getItem('selectedyear');
            setPrpCode(code || '');
            setYearNo(year ? `${year.slice(-2)}` : '');
            console.log("Read PrpCode =", code);
            console.log("Read year =", year);
        };
        loadFilterData();
    }, []);

    const loadParties = useCallback(async () => {
        const yno = (await AsyncStorage.getItem('selectedyear'))?.slice(-2) || '';
        if (!prpcode) return;

        try {
            setPartyLoading(true);
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const res = await axios.get(`${API}/api/accountbasic`, getConfig({
                prpcode,
                prptype: userPtype,
                yearno: yno,
                strcode: '012',
                txntype: 'sales_order',
                partytype: 'p',
                type: 'S',
                page: '',
                limit: '',
                search: '',
                isceo: '',
                partype: '',
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: '',
            }));
            setParties(res.data?.response?.data || []);
            console.log("Party data", res)
        } catch (e) { setParties([]); }
        finally { setPartyLoading(false); }
    }, [prpcode, token]);


    const loadDesigns = useCallback(async () => {
        const yno = (await AsyncStorage.getItem('selectedyear'))?.slice(-2) || '';
        if (!prpcode) return;
        try {
            setDesignLoading(true);
            const res = await axios.get(`${API}/api/getdesign`, getConfig({
                prpcode,
                strcode: '012',
                yearno: yno,
            }));
            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            console.log("res", res);
            setDesignList(Array.isArray(data) ? data : []);
        } catch (e) { setDesignList([]); }
        finally { setDesignLoading(false); }
    }, [prpcode, token]);

    useEffect(() => {
        if (!token) return;
        if (prpcode) {
            loadParties();
            loadDesigns();
        }
    }, [prpcode, token]);

    // const load = useCallback(async (mo, isRefresh = false) => {
    //     try {
    //         isRefresh ? setRefreshing(true) : setLoading(true);
    //         const userPtype = await AsyncStorage.getItem('user_prptype');
    //         const code = await AsyncStorage.getItem('selected_prpcode');
    //         const yno = (await AsyncStorage.getItem('selectedyear'))?.slice(-2) || '';
    //         console.log("State PrpCode =", prpcode);
    //         const params = {
    //             prptype: userPtype,
    //             strcode: '012',
    //             fromdate: ymd(fromDate),
    //             todate: ymd(toDate),
    //             strtype: 'g',
    //             txntype: 'sales_order',
    //             referrer: 'mob_dashboard',
    //             yearno: yno,
    //             prpcode: code,
    //             prpcodes: [],
    //             search: '',
    //         };

    //         console.log('API PARAMS =>', params);
    //         console.log('API PARAMS JSON =>', JSON.stringify(params, null, 2));

    //         const res = await axios.get(`${API}/api/sosortbrowse`, {
    //             headers: authHdr(token),
    //             params,
    //         });

    //         console.log('API RESPONSE =>', res.data);

    //         const dataArray = res.data?.response?.data || [];
    //         const grouped = {};

    //         dataArray.forEach(order => {

    //             const designs = [
    //                 ...new Set(
    //                     (order.d1 || []).map(x => x.DsnCode)
    //                 )
    //             ];

    //             designs.forEach(dsnCode => {

    //                 const designItems = (order.d1 || []).filter(
    //                     x => x.DsnCode === dsnCode
    //                 );

    //                 if (!designItems.length) return;

    //                 const firstItem = designItems[0];

    //                 if (!grouped[dsnCode]) {
    //                     grouped[dsnCode] = {
    //                         DsnCode: dsnCode,
    //                         DsnName: firstItem.DsnName,
    //                         orders: [],
    //                     };
    //                 }

    //                 grouped[dsnCode].orders.push({
    //                     ...order,

    //                     OrderQty: designItems.reduce(
    //                         (sum, item) => sum + num(item.Qty),
    //                         0
    //                     ),

    //                     Items: designItems,
    //                 });
    //             });
    //         });

    //         // =========================
    //         // DESIGN SUMMARY
    //         // =========================
    //         const designGroups = Object.values(grouped).map(g => {

    //             const shadeMap = {};

    //             g.orders.forEach(order => {

    //                 (order.Items || []).forEach(item => {

    //                     const key = item.ShdCode;

    //                     if (!shadeMap[key]) {
    //                         shadeMap[key] = {
    //                             ShdCode: item.ShdCode,
    //                             ShdName: item.ShdName,
    //                             ShdColor: item.ShdColor,
    //                             TotalQty: 0,
    //                         };
    //                     }

    //                     shadeMap[key].TotalQty += num(item.Qty);
    //                 });
    //             });

    //             return {
    //                 ...g,

    //                 totalQty: g.orders.reduce(
    //                     (sum, order) => sum + num(order.OrderQty),
    //                     0
    //                 ),

    //                 shadeAgg: Object.values(shadeMap),
    //             };
    //         });

    //         console.log("GROUPED =", grouped);
    //         console.log("DESIGN GROUPS =", designGroups);

    //         setSummary(designGroups);

    //         console.log("Summary", summary);
    //     } catch (e) {

    //         console.log('summary err', e?.message);

    //         setSummary(null);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // }, [token, fromDate, toDate, prpcode]);

    const load = useCallback(async (mo, isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);

            const userPtype = await AsyncStorage.getItem('user_prptype');
            const code = await AsyncStorage.getItem('selected_prpcode');
            const yno = (await AsyncStorage.getItem('selectedyear'))?.slice(-2) || '';

            console.log("State PrpCode =", prpcode);

            const params = {
                prptype: userPtype,
                strcode: '012',
                fromdate: ymd(fromDate),
                todate: ymd(toDate),
                strtype: 'g',
                txntype: 'sales_order',
                referrer: 'mob_dashboard',
                yearno: yno,
                prpcode: code,
                prpcodes: [],
                search: '',
            };

            console.log('API PARAMS =>', params);

            const res = await axios.get(`${API}/api/sosortbrowse`, {
                headers: authHdr(token),
                params,
            });

            console.log('API RESPONSE =>', res.data);

            const dataArray = res.data?.response?.data || [];

            const filteredData = dataArray.filter(order => {
                if (!order.SODate) return false;

                const [day, month, year] = order.SODate
                    .split('/')
                    .map(Number);

                return (
                    month === mo.month &&
                    year === mo.year
                );
            });

            console.log("Selected Month =", mo.label);
            console.log("API Total Records =", dataArray.length);
            console.log("Month Filter Records =", filteredData.length);

            console.log(
                "Filtered SOs =>",
                filteredData.map(x => ({
                    SONo: x.SONo,
                    SODate: x.SODate,
                }))
            );

            const grouped = {};

            filteredData.forEach(order => {

                const designs = [
                    ...new Set(
                        (order.d1 || []).map(x => x.DsnCode)
                    )
                ];

                designs.forEach(dsnCode => {

                    const designItems = (order.d1 || []).filter(
                        x => x.DsnCode === dsnCode
                    );

                    if (!designItems.length) return;

                    const firstItem = designItems[0];

                    if (!grouped[dsnCode]) {
                        grouped[dsnCode] = {
                            DsnCode: dsnCode,
                            DsnName: firstItem.DsnName,
                            orders: [],
                        };
                    }

                    grouped[dsnCode].orders.push({
                        ...order,

                        OrderQty: designItems.reduce(
                            (sum, item) => sum + num(item.Qty),
                            0
                        ),

                        Items: designItems,
                    });
                });
            });
            const designGroups = Object.values(grouped).map(g => {

                const shadeMap = {};

                g.orders.forEach(order => {

                    (order.Items || []).forEach(item => {

                        const key = item.ShdCode;

                        if (!shadeMap[key]) {
                            shadeMap[key] = {
                                ShdCode: item.ShdCode,
                                ShdName: item.ShdName,
                                ShdColor: item.ShdColor,
                                TotalQty: 0,
                            };
                        }

                        shadeMap[key].TotalQty += num(item.Qty);
                    });
                });

                return {
                    ...g,

                    totalQty: g.orders.reduce(
                        (sum, order) => sum + num(order.OrderQty),
                        0
                    ),

                    shadeAgg: Object.values(shadeMap),
                };
            });

            console.log("GROUPED =", grouped);
            console.log("DESIGN GROUPS =", designGroups);

            setSummary(designGroups);

        } catch (e) {

            console.log('summary err', e);

            setSummary([]);

        } finally {

            setLoading(false);
            setRefreshing(false);
        }
    }, [token, fromDate, toDate, prpcode]);

    useEffect(() => {
        if (!token) return;
        load(selMonth);
    }, [selMonth, token]);

    useEffect(() => {
        if (!token) return;
        console.log("SUMMARY STATE =", summary);
    }, [summary, token]);

    // ── Filter option lists (from unfiltered data) ──
    const allGroups = summary || [];
    const custList = [...new Set(allGroups.flatMap(g => (g.orders || []).map(o => o.ParName)))].filter(Boolean);
    const dsnList = [...new Set(allGroups.map(g => g.DsnName))].filter(Boolean);

    console.log("allGroups =", allGroups);


    // ── Apply filters + recompute totals client-side ──
    // const visibleGroups = allGroups
    //     .filter(g => !filterDesign || g.DsnName === filterDesign)
    //     .map(g => {
    //         const orders = (g.orders || []).filter(o => !filterCust || o.ParName === filterCust);
    //         const totalQty = orders.reduce((s, o) => s + num(o.OrderQty), 0);
    //         // aggregate shade chips from the visible orders' items
    //         const shadeMap = {};
    //         orders.forEach(o => (o.Items || []).forEach(it => {
    //             const k = it.ShdCode || it.ShdName || it.ShadeName;
    //             if (!shadeMap[k]) {
    //                 shadeMap[k] = {
    //                     ShdName: it.ShdName || it.ShadeName,
    //                     ShdColor: it.ShdColor,
    //                     TotalQty: 0,
    //                 };
    //             }
    //             shadeMap[k].TotalQty += num(it.Qty);
    //         }));
    //         return { ...g, orders, totalQty, shadeAgg: Object.values(shadeMap) };
    //     })
    //     .filter(g => g.orders.length > 0);

    // const totalM = visibleGroups.reduce((s, g) => s + g.totalQty, 0);
    // const totalSOs = visibleGroups.reduce((s, g) => s + g.orders.length, 0);

    const visibleGroups = allGroups
        .filter(g =>
            !filterDesign ||
            g.DsnCode === filterDesign
        )
        .map(g => {
            const orders = (g.orders || [])
                .filter(o =>
                    !filterCust ||
                    o.ParCode === filterCust
                );

            const totalQty = orders.reduce(
                (s, o) => s + num(o.OrderQty),
                0
            );

            const shadeMap = {};

            orders.forEach(o =>
                (o.Items || []).forEach(it => {

                    const k = it.ShdCode;

                    if (!shadeMap[k]) {
                        shadeMap[k] = {
                            ShdName: it.ShdName,
                            ShdColor: it.ShdColor,
                            TotalQty: 0,
                        };
                    }

                    shadeMap[k].TotalQty += num(it.Qty);
                })
            );

            return {
                ...g,
                orders,
                totalQty,
                shadeAgg: Object.values(shadeMap),
            };
        })
        .filter(g => g.orders.length > 0);

    const totalM = visibleGroups.reduce(
        (s, g) => s + g.totalQty,
        0
    );

    const totalSOs = visibleGroups.length;

    console.log("visibleGroups =", visibleGroups);

    // ── Design group card ──
    const renderGroup = (g, gi) => (
        <View key={gi} style={SU.groupCard}>
            {/* group header */}
            <View style={SU.groupHead}>
                <View style={SU.dsnBadge}>
                    <Text style={SU.dsnBadgeText}>{(g.DsnName || '—').split(' ')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={SU.dsnName}>
                        {g.DsnName}
                        <Text style={SU.dsnCode}>  · {g.DsnCode}</Text>
                    </Text>
                    <Text style={SU.dsnMeta}>
                        {g.FabricType || ''} · {g.orders.length} SO · {g.shadeAgg.length} charts
                    </Text>
                </View>
                <Text style={SU.dsnQty}>{fmtIN(g.totalQty)} m</Text>
            </View>

            {/* aggregated shade chips */}
            <View style={SU.chipRow}>
                {g.shadeAgg.map((sh, si) => (
                    <View key={si} style={SU.shChip}>
                        <View style={[SU.shDot, { backgroundColor: sh.ShdColor || '#94A3B8' }]} />
                        <Text style={SU.shChipName}>{sh.ShdName}</Text>
                        <Text style={SU.shChipQty}>{fmtIN(sh.TotalQty)}</Text>
                    </View>
                ))}
            </View>

            {/* SO rows */}
            {g.orders.map((o, oi) => {
                const authorised = o.AuthStatus === 'Authorised';
                return (
                    <View key={oi} style={SU.soBlock}>
                        <View style={SU.soTopRow}>
                            <Text style={SU.soNo}>{o.SONo}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[SU.soBadge, { backgroundColor: authorised ? '#ECFDF3' : '#FEF3C7' }]}>
                                    <Text style={[SU.soBadgeText, { color: authorised ? '#027A48' : '#92400E' }]}>
                                        {authorised ? 'Authorised' : 'Pending Auth'}
                                    </Text>
                                </View>
                                <Text style={SU.soQty}>{fmtIN(o.OrderQty)} m</Text>
                            </View>
                        </View>
                        <Text style={SU.soSub}>
                            {o.SODate}
                            {/* party shown only when not already filtered to one customer */}
                            {/* {!filterCust && o.ParName ? ` · ${o.ParName}` : ''} */}
                            {o.ParName ? ` · ${o.ParName}` : ''}
                            {` · deliver ${o.DeliveryDate || '—'}`}
                        </Text>

                        {(o.Items || []).map((it, ii) => (
                            <View key={ii} style={SU.soShadeRow}>
                                <View style={[SU.shDotLg, { backgroundColor: it.ShdColor || '#94A3B8' }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={SU.soShadeName}>{it.ShdName || it.ShadeName}</Text>
                                    <Text style={SU.soShadeSub}>
                                        {[it.WarpColorName || it.WarpColor, it.WeftColorName || it.WeftColor]
                                            .filter(Boolean).join(' · ') || '—'}
                                    </Text>
                                </View>
                                <Text style={SU.soShadeQty}>{fmtIN(it.Qty)} m</Text>
                            </View>
                        ))}
                    </View>
                );
            })}
        </View>
    );

    return (
        <>
            <ScrollView
                contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => load(selMonth, true)}
                        colors={['#13879A']}
                    />
                }
            >
                {/* month pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {MONTHS.map(mo => {
                            const on = selMonth.key === mo.key;
                            return (
                                <TouchableOpacity
                                    key={mo.key}
                                    onPress={() => setSelMonth(mo)}
                                    style={[SU.pill, on && SU.pillOn]}
                                >
                                    <Text style={[SU.pillText, on && SU.pillTextOn]}>{mo.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* filter dropdowns */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                        style={SU.filterBox}
                        onPress={() => setShowCustPicker(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={SU.filterText} numberOfLines={1}>
                            {filterCustName || 'All customers'}
                        </Text>
                        <Text style={SU.filterArrow}>▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={SU.filterBox}
                        onPress={() => setShowDsnPicker(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={SU.filterText} numberOfLines={1}>
                            {filterDesignName || 'All designs'}
                        </Text>
                        <Text style={SU.filterArrow}>▾</Text>
                    </TouchableOpacity>
                </View>

                {/* dark summary header */}
                <View style={SU.summaryHeader}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={SU.summaryLabel}>MONTHLY DESIGN · SO SUMMARY</Text>
                        <Text style={SU.summaryQty}>{fmtIN(totalM)} m</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Text style={SU.summaryMonth}>
                            {selMonth.label}{filterCust ? ` · ${filterCust}` : ''}
                        </Text>
                        <Text style={SU.summaryMeta}>
                            {visibleGroups.length} designs · {totalSOs} SOs
                        </Text>
                    </View>
                </View>

                {loading && <ActivityIndicator color="#13879A" style={{ marginTop: 20 }} />}

                {!loading && visibleGroups.map(renderGroup)}

                {!loading && visibleGroups.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af' }}>
                            No summary data for {selMonth.label}
                            {filterCust ? ` · ${filterCust}` : ''}
                            {filterDesign ? ` · ${filterDesign}` : ''}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Customer filter picker */}
            {/* <PickerSheet
                visible={showCustPicker}
                title="Customer"
                items={[
                    { Code: '', Name: 'All customers' },
                    ...custList.map(c => ({ Code: c, Name: c })),
                ]}
                keyField="Code"
                labelField="Name"
                search={custSearch}
                setSearch={setCustSearch}
                loading={false}
                onSelect={item => setFilterCust(item.Code)}
                onClose={() => { setShowCustPicker(false); setCustSearch(''); }}
            /> */}
            <PickerSheet
                visible={showCustPicker}
                title="Customer"
                items={[
                    {
                        acccode: '',
                        accountname: 'All Customers',
                    },
                    ...parties,
                ]}
                keyField="acccode"
                labelField="accountname"
                search={custSearch}
                setSearch={setCustSearch}
                loading={partyLoading}
                onSelect={(item) => {
                    setFilterCust(item.acccode);          // filter code
                    setFilterCustName(item.accountname);  // display name
                    setShowCustPicker(false);
                }}
                onClose={() => {
                    setShowCustPicker(false);
                    setCustSearch('');
                }}
            />

            {/* Design filter picker */}
            {/* <PickerSheet
                visible={showDsnPicker}
                title="Design"
                items={[
                    { Code: '', Name: 'All designs' },
                    ...dsnList.map(d => ({ Code: d, Name: d })),
                ]}
                keyField="Code"
                labelField="Name"
                search={dsnSearch}
                setSearch={setDsnSearch}
                loading={false}
                onSelect={item => setFilterDesign(item.Code)}
                onClose={() => { setShowDsnPicker(false); setDsnSearch(''); }}
            /> */}
            <PickerSheet
                visible={showDsnPicker}
                title="Design"
                items={[
                    {
                        DsnCode: '',
                        DsnName: 'All Designs',
                    },
                    ...designList,
                ]}
                keyField="DsnCode"
                labelField="DsnName"
                search={dsnSearch}
                setSearch={setDsnSearch}
                loading={designLoading}
                onSelect={(item) => {
                    setFilterDesign(item.DsnCode);      // filter code
                    setFilterDesignName(item.DsnName);  // display name
                    setShowDsnPicker(false);
                }}
                onClose={() => {
                    setShowDsnPicker(false);
                    setDsnSearch('');
                }}
            />
        </>
    );
}

// ── Summary styles ───────────────────────────────────────────────

const SU = StyleSheet.create({
    // month pills
    pill: {
        paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    },
    pillOn: { backgroundColor: '#13879A', borderColor: '#13879A' },
    pillText: { fontSize: 12, color: '#000', fontWeight: '600' },
    pillTextOn: { color: '#fff', fontWeight: '700' },

    // filter dropdowns
    filterBox: {
        flex: 1, height: 46, backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row',
        alignItems: 'center', paddingHorizontal: 14,
    },
    filterText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
    filterArrow: { fontSize: 11, color: '#000' },

    // dark summary header
    summaryHeader: {
        backgroundColor: '#1E2A38', borderRadius: 14, padding: 16, marginBottom: 12,
    },
    summaryLabel: { fontSize: 9, color: '#8A97A6', letterSpacing: 1, fontWeight: '700' },
    summaryQty: {
        fontSize: 18, fontWeight: '800', color: '#E0A864',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    summaryMonth: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 6 },
    summaryMeta: { fontSize: 11, color: '#8A97A6' },

    // design group card
    groupCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
        shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dsnBadge: {
        backgroundColor: '#FCEAD9', borderRadius: 8,
        paddingHorizontal: 9, paddingVertical: 5,
    },
    dsnBadgeText: {
        fontSize: 10, fontWeight: '700', color: '#C2823A',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    dsnName: { fontSize: 15, fontWeight: '800', color: '#111827' },
    dsnCode: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
    dsnMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    dsnQty: {
        fontSize: 15, fontWeight: '800', color: '#C2823A',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // aggregated shade chips
    chipRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
        marginTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    shChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999,
        paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FAFAFA',
    },
    shDot: { width: 14, height: 14, borderRadius: 7 },
    shDotLg: { width: 20, height: 20, borderRadius: 10 },
    shChipName: { fontSize: 11, fontWeight: '700', color: '#111827' },
    shChipQty: {
        fontSize: 11, fontWeight: '700', color: '#C2823A',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // SO block
    soBlock: {
        paddingTop: 12, marginTop: 2,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10,
    },
    soTopRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    soNo: {
        fontSize: 13, fontWeight: '800', color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    soBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    soBadgeText: {
        fontSize: 9, fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    soQty: {
        fontSize: 13, fontWeight: '800', color: '#111827',
        fontVariant: ['tabular-nums'],
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    soSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

    soShadeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10,
    },
    soShadeName: { fontSize: 13, fontWeight: '700', color: '#111827' },
    soShadeSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
    soShadeQty: {
        fontSize: 12, fontWeight: '700', color: '#374151',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});


// Auth stylesheet — was defined at the very bottom of the original file
// (after New Order's styles), extracted here verbatim.
const A = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Date strip
    dateStrip: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    datePill: { flex: 1, height: 36, backgroundColor: '#fff', borderRadius: 10, borderWidth: .5, borderColor: '#e4e7ef', justifyContent: 'center', alignItems: 'center' },
    datePillText: { fontSize: 12, color: '#000' },
    applyBtn: { width: 56, height: 36, backgroundColor: '#13879A', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Section headings
    sectionHead: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 10 },
    sectionCnt: { color: '#13879A' },

    // Card shell
    card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, borderWidth: .5, borderColor: '#e4e7ef', overflow: 'hidden' },

    // Summary row (always visible, tappable)
    cardSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 8 },
    cardSummaryRight: { alignItems: 'flex-end', flexShrink: 0 },
    cardAmt: { fontSize: 14, fontWeight: '700', color: '#000' },
    cardQty: { fontSize: 12, color: '#000', marginTop: 2 },

    // SO number + badge row
    soMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
    soNo: { fontSize: 12, fontWeight: '700', color: '#c2823a', fontVariant: ['tabular-nums'] },
    pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },

    partyNameLg: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 1 },
    designNameSm: { fontSize: 12, color: '#000' },

    // Chevron
    chevron: { color: '#b0aaa0', fontSize: 14, marginTop: 2, flexShrink: 0 },
    chevronOpen: { transform: [{ rotate: '180deg' }] },

    // Expanded detail area
    cardDetail: { borderTopWidth: .5, borderTopColor: '#f0ede8', padding: 14, backgroundColor: '#faf9f7' },

    // Exec / rate / due row
    execRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    execText: { fontSize: 12, color: '#000' },
    execName: { color: '#101828', fontWeight: '600' },
    execPill: { fontSize: 12, color: '#000', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: .5, borderColor: '#e4e7ef' },

    // Shade rows
    shadeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: .5, borderColor: '#e8e4de' },
    shadeSwatch: { width: 30, height: 30, borderRadius: 7, flexShrink: 0, borderWidth: .5, borderColor: '#e0ddd8' },
    shadeName: { fontSize: 13, fontWeight: '600', color: '#000' },
    shadeType: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
    shadeQty: { fontSize: 13, fontWeight: '600', color: '#000', flexShrink: 0 },

    // VS Latest Costing box
    costBox: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 8, marginBottom: 8, borderWidth: .5, borderColor: '#e4e7ef' },
    costLbl: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: .05 },
    costDetail: { fontSize: 12, color: '#000', marginTop: 3 },
    costDiff: { fontSize: 15, fontWeight: '700' },
    costMargin: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    // Shortfall banner
    shortfallBox: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: .5, borderColor: '#FDE68A' },
    shortfallTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 },
    shortfallMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    shortfallPill: { fontSize: 11, color: '#92400E', backgroundColor: 'rgba(0,0,0,.05)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
    shortfallVal: { fontWeight: '700' },

    // Approve / Reject
    actRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    approveBtn: { flex: 1, height: 44, backgroundColor: '#DCFCE7', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: .5, borderColor: '#86EFAC' },
    approveTxt: { color: '#166534', fontWeight: '700', fontSize: 14 },
    rejectBtn: { flex: 1, height: 44, backgroundColor: '#FEF2F2', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: .5, borderColor: '#FECACA' },
    rejectTxt: { color: '#dc2626', fontWeight: '700', fontSize: 14 },

    // Job chart button (authorized cards)
    jobBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: .5, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff', flexShrink: 0 },
    jobBtnText: { fontSize: 11, color: '#000' },

    // Empty state
    emptyBox: { paddingVertical: 20, alignItems: 'center' },
    emptyText: { color: '#000', fontSize: 13 },
});

export { AuthTab, TrackingTab, SummaryTab };
