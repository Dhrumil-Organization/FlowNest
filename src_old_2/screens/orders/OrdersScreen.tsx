import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// FILE: src/screens/orders/OrdersScreen.tsx
// Replaces OrderListScreen — single screen with 5 tabs matching web artifact:
// New Order · Auth · Tracking · All Orders · Summary

import React, { useState, useMemo } from 'react';
import { T } from '../../theme';
import { NewOrderTab } from './NewOrderTab';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CUSTOMERS } from '../../data/seeds';
import type { SalesOrder, OrderColor } from '../../types';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

// ─── helpers ─────────────────────────────────────────────────
const fmt   = (n: number) => Math.round(n).toLocaleString('en-IN');
const rupee = (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
};
//const TODAY = new Date().toISOString().slice(0, 10);

function orderStatus(o: SalesOrder): string {
    if (o.status === 'pending_auth') return 'Pending';
    if (o.status === 'rejected') return 'Rejected';
    const t = o.colors.reduce((s, c) => s + c.qty, 0);
    const d = o.colors.reduce((s, c) => s + (c.qty - c.pendingQty), 0);
    if (d <= 0) return 'Authorized';
    if (d >= t) return 'Completed';
    return 'Partial';
}

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
    Pending:    { color: '#C98A1A', bg: '#FBF1DC' },
    Authorized: { color: '#3A568A', bg: '#E6EBF6' },
    Partial:    { color: '#9A4A10', bg: '#F8EDE6' },
    Completed:  { color: '#2A6044', bg: '#E4F1E8' },
    Rejected:   { color: '#B23A2A', bg: '#FAE7E3' },
};

const custMap = Object.fromEntries(CUSTOMERS.map(c => [c.id, c]));

// function genSO(orders: SalesOrder[]) {
//     const d = TODAY.replace(/-/g, '');
//     const n = String(orders.filter(o => o.soNumber.startsWith(`SO-${d}`)).length + 1).padStart(3, '0');
//     return `SO-${d}-${n}`;
// }

// ─── TAB 1: New Order ─────────────────────────────────────────


// ─── TAB 2: Auth ──────────────────────────────────────────────
function AuthTab() {
    const orders         = useAppStore(s => s.orders);
    const mains          = useAppStore(s => s.mains);
    const authorizeOrder = useAppStore(s => s.authorizeOrder);
    const rejectOrder    = useAppStore(s => s.rejectOrder);

    const pending    = orders.filter(o => o.status === 'pending_auth');
    const authorized = orders.filter(o => o.status === 'authorized');

    const confirm = (soNumber: string, approve: boolean) => {
        Alert.alert(
            approve ? 'Approve Order' : 'Reject Order',
            `${approve ? 'Authorize' : 'Reject'} ${soNumber}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: approve ? 'Approve' : 'Reject',
                    style: approve ? 'default' : 'destructive',
                    onPress: () => { approve ? authorizeOrder(soNumber) : rejectOrder(soNumber); autoSave(); },
                },
            ]
        );
    };

    const OrderCard = ({ o, showActions }: { o: SalesOrder; showActions: boolean }) => {
        const m  = mains.find(x => x.id === o.mdId);
        const tQ = o.colors.reduce((s, c) => s + c.qty, 0);
        const cust = custMap[o.customer];
        return (
            <View style={au.card}>
                <View style={au.top}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={au.soNum}>{o.soNumber}</Text>
                            <View style={[au.badge, { backgroundColor: o.fabricType === 'greige' ? '#E6EBF6' : '#E4F1E8' }]}>
                                <Text style={[au.badgeTxt, { color: o.fabricType === 'greige' ? T.blue : T.green }]}>
                                    {o.fabricType.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={au.custName}>{cust?.name ?? o.customer}</Text>
                        <Text style={au.design}>{m?.code ?? o.mdId}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={au.amt}>{rupee(tQ * o.price)}</Text>
                        <Text style={au.qty}>{fmt(tQ)} m</Text>
                        {!showActions && <Text style={au.arrow}>▾</Text>}
                    </View>
                </View>
                {o.colors.map((c, i) => (
                    <View key={i} style={au.colorRow}>
                        <View style={au.colorDot} />
                        <Text style={{ flex: 1, fontSize: 12, color: T.ink }}>{c.color}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: T.ink }}>{fmt(c.qty)} m</Text>
                    </View>
                ))}
                {showActions && (
                    <View style={au.actions}>
                        <TouchableOpacity style={au.rejectBtn} onPress={() => confirm(o.soNumber, false)}>
                            <Text style={au.rejectTxt}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={au.approveBtn} onPress={() => confirm(o.soNumber, true)}>
                            <Text style={au.approveTxt}>✓ Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Pending section */}
            <View style={au.section}>
                <View style={au.sectionHead}>
                    <Text style={au.sectionTitle}>Pending</Text>
                    <View style={au.countBadge}><Text style={au.countTxt}>{pending.length}</Text></View>
                </View>
                {pending.length === 0 && <Text style={au.empty}>No orders pending.</Text>}
                {pending.map(o => <OrderCard key={o.soNumber} o={o} showActions={true} />)}
            </View>

            {/* Authorized section */}
            <View style={au.section}>
                <View style={au.sectionHead}>
                    <Text style={au.sectionTitle}>Authorized</Text>
                    <View style={[au.countBadge, { backgroundColor: T.green + '20' }]}>
                        <Text style={[au.countTxt, { color: T.green }]}>{authorized.length}</Text>
                    </View>
                </View>
                {authorized.map(o => <OrderCard key={o.soNumber} o={o} showActions={false} />)}
            </View>
        </ScrollView>
    );
}

// ─── TAB 3: Tracking ─────────────────────────────────────────
function TrackingTab() {
    const orders         = useAppStore(s => s.orders);
    const mains          = useAppStore(s => s.mains);
    const dispatchOrder  = useAppStore(s => s.dispatchOrder);

    const [filter, setFilter]       = useState<'All' | 'Authorized' | 'Partial' | 'Completed'>('All');
    const [search, setSearch]       = useState('');
    const [dispTarget, setDispTarget] = useState<{ soNumber: string; color: OrderColor } | null>(null);
    const [dispQtyStr, setDispQtyStr] = useState('');

    const authed = orders.filter(o => o.status === 'authorized');

    // Summary stats
    const totalQty = authed.reduce((s, o) => s + o.colors.reduce((a, c) => a + c.qty, 0), 0);
    const dispQty  = authed.reduce((s, o) => s + o.colors.reduce((a, c) => a + (c.qty - c.pendingQty), 0), 0);
    const pendQty  = totalQty - dispQty;
    const dispPct  = totalQty > 0 ? Math.round(dispQty / totalQty * 100) : 0;

    const filtered = authed.filter(o => {
        const st = orderStatus(o);
        if (filter !== 'All' && st !== filter) return false;
        if (search) {
            const cust = custMap[o.customer]?.name ?? o.customer;
            const m    = mains.find(x => x.id === o.mdId)?.code ?? '';
            return cust.toLowerCase().includes(search.toLowerCase()) || m.toLowerCase().includes(search.toLowerCase());
        }
        return true;
    });

    function openDispatch(soNumber: string, color: OrderColor) {
        setDispTarget({ soNumber, color });
        setDispQtyStr(String(color.pendingQty));
    }

    function confirmDispatch() {
        if (!dispTarget) return;
        const dq = Math.min(parseInt(dispQtyStr) || 0, dispTarget.color.pendingQty);
        if (dq > 0) {
            dispatchOrder(dispTarget.soNumber, { [dispTarget.color.color]: dq });
            autoSave();
        }
        setDispTarget(null);
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                {/* Summary card */}
                <View style={tr.summaryCard}>
                    <View style={tr.donut}>
                        <Text style={tr.donutPct}>{dispPct}%</Text>
                        <Text style={tr.donutLabel}>done</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <ProgressBar pct={dispPct} color={T.green} height={8} />
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                            <Text style={[tr.legend, { color: T.green }]}>■ {fmt(dispQty)} m dispatched</Text>
                            <Text style={[tr.legend, { color: T.amber }]}>■ {fmt(pendQty)} m pending</Text>
                        </View>
                        <View style={tr.statsRow}>
                            <View style={tr.stat}>
                                <Text style={tr.statLabel}>ORDERED</Text>
                                <Text style={tr.statVal}>{fmt(totalQty)} <Text style={tr.statUnit}>m</Text></Text>
                            </View>
                            <View style={[tr.stat, { borderLeftWidth: 1, borderLeftColor: T.border }]}>
                                <Text style={[tr.statLabel, { color: T.green }]}>DISPATCHED</Text>
                                <Text style={[tr.statVal, { color: T.green }]}>{fmt(dispQty)} <Text style={tr.statUnit}>m</Text></Text>
                            </View>
                            <View style={[tr.stat, { borderLeftWidth: 1, borderLeftColor: T.border }]}>
                                <Text style={[tr.statLabel, { color: T.amber }]}>PENDING</Text>
                                <Text style={[tr.statVal, { color: T.amber }]}>{fmt(pendQty)} <Text style={tr.statUnit}>m</Text></Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Filter chips */}
                <View style={tr.filterRow}>
                    {(['All', 'Authorized', 'Partial', 'Completed'] as const).map(f => (
                        <TouchableOpacity key={f} onPress={() => setFilter(f)}
                            style={[tr.chip, filter === f && tr.chipActive]}>
                            <Text style={[tr.chipTxt, filter === f && tr.chipTxtActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search */}
                <View style={tr.searchWrap}>
                    <TextInput value={search} onChangeText={setSearch}
                        placeholder="Search party or design…" placeholderTextColor={T.muted}
                        style={tr.search} />
                </View>

                {/* Order cards */}
                {filtered.map(o => {
                    const m    = mains.find(x => x.id === o.mdId);
                    const cust = custMap[o.customer];
                    const tQ   = o.colors.reduce((s, c) => s + c.qty, 0);
                    const dQ   = o.colors.reduce((s, c) => s + (c.qty - c.pendingQty), 0);
                    const st   = orderStatus(o);
                    const cfg  = STATUS_CFG[st];
                    return (
                        <View key={o.soNumber} style={tr.card}>
                            <View style={tr.cardTop}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={tr.soNum}>{o.soNumber}</Text>
                                        <View style={[tr.badge, { backgroundColor: cfg.bg }]}>
                                            <Text style={[tr.badgeTxt, { color: cfg.color }]}>{st}</Text>
                                        </View>
                                    </View>
                                    <Text style={tr.custName}>{cust?.name ?? o.customer}</Text>
                                    <Text style={tr.design}>{m?.code ?? o.mdId} · {o.fabricType} · due {o.deliveryDate}</Text>
                                </View>
                                <Text style={tr.amt}>{rupee(tQ * o.price)}</Text>
                            </View>
                            <ProgressBar pct={tQ > 0 ? dQ / tQ * 100 : 0} color={T.green} height={6} />

                            {/* Color lines */}
                            {o.colors.map((c, i) => {
                                const done = c.pendingQty === 0;
                                const cd   = c.qty - c.pendingQty;
                                return (
                                    <View key={i} style={tr.colorLine}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={tr.colorName}>
                                                {c.color}
                                                <Text style={tr.colorQty}>  {fmt(cd)}/{fmt(c.qty)} m</Text>
                                            </Text>
                                        </View>
                                        {done
                                            ? <Text style={tr.doneTag}>✓ {fmt(c.qty)} m</Text>
                                            : <TouchableOpacity style={tr.dispatchBtn} onPress={() => openDispatch(o.soNumber, c)}>
                                                <Text style={tr.dispatchTxt}>Dispatch</Text>
                                              </TouchableOpacity>
                                        }
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Dispatch bottom sheet */}
            <BottomSheet open={!!dispTarget} onClose={() => setDispTarget(null)}
                title={`Dispatch — ${dispTarget?.color.color ?? ''}`} scroll={false}>
                <View style={{ padding: 18 }}>
                    <Text style={tr.sheetLabel}>Metres to dispatch (max {fmt(dispTarget?.color.pendingQty ?? 0)})</Text>
                    <TextInput value={dispQtyStr} onChangeText={setDispQtyStr}
                        keyboardType="number-pad" autoFocus style={tr.sheetInput} />
                    <View style={{ height: 14 }} />
                    <Button label="Confirm Dispatch" onPress={confirmDispatch} fullWidth />
                </View>
            </BottomSheet>
        </View>
    );
}

// ─── TAB 4: All Orders ───────────────────────────────────────
function AllOrdersTab() {
    const orders = useAppStore(s => s.orders);
    const mains  = useAppStore(s => s.mains);

    const [statusFilter, setStatusFilter] = useState('All');
    const [designFilter, setDesignFilter] = useState('All');
    const [execFilter, setExecFilter]     = useState('All');
    const [sortAsc, setSortAsc]           = useState(false);

    const execList = [...new Set(orders.map(o => o.salesExec))];
    const designList = [...new Set(orders.map(o => mains.find(m => m.id === o.mdId)?.code ?? o.mdId))];

    const filtered = orders
        .filter(o => {
            if (statusFilter !== 'All' && orderStatus(o) !== statusFilter) return false;
            if (designFilter !== 'All') {
                const code = mains.find(m => m.id === o.mdId)?.code ?? o.mdId;
                if (code !== designFilter) return false;
            }
            if (execFilter !== 'All' && o.salesExec !== execFilter) return false;
            return true;
        })
        .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

    const bookVal = filtered.reduce((s, o) => s + o.colors.reduce((a, c) => a + c.qty, 0) * o.price, 0);

    const Picker = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
        <View style={al.pickerWrap}>
            <Text style={al.pickerLabel}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['All', ...options].map(opt => (
                        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
                            style={[al.pickerChip, value === opt && al.pickerChipActive]}>
                            <Text style={[al.pickerChipTxt, value === opt && al.pickerChipTxtActive]} numberOfLines={1}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );

    return (
        <FlatList
            data={filtered}
            keyExtractor={o => o.soNumber}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListHeaderComponent={
                <View>
                    <Picker label="STATUS"   value={statusFilter} options={['Pending','Authorized','Partial','Completed','Rejected']} onChange={setStatusFilter} />
                    <Picker label="DESIGN"   value={designFilter} options={designList} onChange={setDesignFilter} />
                    <Picker label="EXECUTIVE" value={execFilter}  options={execList}   onChange={setExecFilter} />
                    <TouchableOpacity style={al.sortRow} onPress={() => setSortAsc(a => !a)}>
                        <Text style={al.sortLabel}>Sort by date</Text>
                        <Text style={al.sortDir}>{sortAsc ? '▲ Asc' : '▼ Desc'}</Text>
                    </TouchableOpacity>
                    <View style={al.summary}>
                        <Text style={al.summaryCount}>{filtered.length} orders</Text>
                        <Text style={al.summaryVal}>{rupee(bookVal)}</Text>
                    </View>
                </View>
            }
            renderItem={({ item: o }) => {
                const m    = mains.find(x => x.id === o.mdId);
                const cust = custMap[o.customer];
                const tQ   = o.colors.reduce((s, c) => s + c.qty, 0);
                const pQ   = o.colors.reduce((s, c) => s + c.pendingQty, 0);
                const st   = orderStatus(o);
                const cfg  = STATUS_CFG[st];
                return (
                    <View style={al.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={al.soNum}>{o.soNumber}</Text>
                                    <View style={[al.badge, { backgroundColor: cfg.bg }]}>
                                        <Text style={[al.badgeTxt, { color: cfg.color }]}>{st.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={al.design}>{m?.code ?? o.mdId} · {cust?.name ?? o.customer} · {o.date}</Text>
                            </View>
                            <Text style={al.amt}>{rupee(tQ * o.price)}</Text>
                        </View>
                        <Text style={al.qty}>{fmt(tQ)} m{pQ > 0 ? ` · ${fmt(pQ)} pend` : ''}</Text>
                    </View>
                );
            }}
        />
    );
}

// ─── TAB 5: Summary ──────────────────────────────────────────
function SummaryTab() {
    const orders = useAppStore(s => s.orders);
    const mains  = useAppStore(s => s.mains);

    const [month, setMonth]       = useState('2026-05');
    const [custFilter, setCustFilter] = useState('All');
    const [mdFilter, setMdFilter]     = useState('All');

    const months = [...new Set(orders.map(o => o.date.slice(0, 7)))].sort().reverse();
    const custList = CUSTOMERS.map(c => c.name);
    const mdList   = mains.map(m => m.code);

    const monthOrders = orders.filter(o => {
        if (o.date.slice(0, 7) !== month) return false;
        if (custFilter !== 'All' && (custMap[o.customer]?.name ?? o.customer) !== custFilter) return false;
        if (mdFilter !== 'All' && (mains.find(m => m.id === o.mdId)?.code ?? o.mdId) !== mdFilter) return false;
        return true;
    });

    // Group by design
    const byDesign: Record<string, { code: string; mdId: string; orders: SalesOrder[]; colors: Record<string, number> }> = {};
    monthOrders.forEach(o => {
        if (!byDesign[o.mdId]) {
            byDesign[o.mdId] = {
                code:   mains.find(m => m.id === o.mdId)?.code ?? o.mdId,
                mdId:   o.mdId,
                orders: [],
                colors: {},
            };
        }
        byDesign[o.mdId].orders.push(o);
        o.colors.forEach(c => {
            byDesign[o.mdId].colors[c.color] = (byDesign[o.mdId].colors[c.color] ?? 0) + c.qty;
        });
    });

    const totalM  = monthOrders.reduce((s, o) => s + o.colors.reduce((a, c) => a + c.qty, 0), 0);
    const totalSO = monthOrders.length;
    const designs = Object.values(byDesign);

    const monthLabel = new Date(month + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' }).replace(' ', ' \'');

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Month pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sm.monthRow}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14 }}>
                    {months.map(m => (
                        <TouchableOpacity key={m} onPress={() => setMonth(m)}
                            style={[sm.monthChip, month === m && sm.monthChipActive]}>
                            <Text style={[sm.monthChipTxt, month === m && sm.monthChipTxtActive]}>
                                {new Date(m + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Filters */}
            <View style={sm.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['All', ...custList].map(c => (
                            <TouchableOpacity key={c} onPress={() => setCustFilter(c)}
                                style={[sm.filterChip, custFilter === c && sm.filterChipActive]}>
                                <Text style={[sm.filterChipTxt, custFilter === c && sm.filterChipTxtActive]} numberOfLines={1}>
                                    {c === 'All' ? 'All customers' : c.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
            <View style={sm.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['All', ...mdList].map(c => (
                            <TouchableOpacity key={c} onPress={() => setMdFilter(c)}
                                style={[sm.filterChip, mdFilter === c && sm.filterChipActive]}>
                                <Text style={[sm.filterChipTxt, mdFilter === c && sm.filterChipTxtActive]}>
                                    {c === 'All' ? 'All designs' : c}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Header total */}
            <View style={sm.totalCard}>
                <Text style={sm.totalLabel}>MONTHLY DESIGN · SO SUMMARY</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <Text style={sm.totalMonth}>{monthLabel}</Text>
                    <Text style={sm.totalQty}>{fmt(totalM)} <Text style={{ fontSize: 14 }}>m</Text></Text>
                </View>
                <Text style={sm.totalSub}>{designs.length} designs · {totalSO} SOs</Text>
            </View>

            {/* Per-design cards */}
            {designs.map(d => {
                const dTotal = Object.values(d.colors).reduce((s, n) => s + n, 0);
                return (
                    <View key={d.mdId} style={sm.designCard}>
                        {/* Design header */}
                        <View style={sm.designHead}>
                            <View style={sm.designTag}>
                                <Text style={sm.designTagTxt}>{d.code}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={sm.designCode}>{d.code}</Text>
                                <Text style={sm.designMeta}>
                                    {mains.find(m => m.id === d.mdId)?.category ?? ''} · {d.orders.length} SO · {Object.keys(d.colors).length} charts
                                </Text>
                            </View>
                            <Text style={sm.designTotal}>{fmt(dTotal)} <Text style={{ fontSize: 11 }}>m</Text></Text>
                        </View>

                        {/* Color chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {Object.entries(d.colors).map(([color, qty]) => (
                                    <View key={color} style={sm.colorChip}>
                                        <View style={sm.colorDot} />
                                        <Text style={sm.colorChipTxt}>{color} <Text style={{ color: T.copper, fontWeight: '800' }}>{fmt(qty)}</Text></Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Per-SO rows */}
                        {d.orders.map(o => {
                            const cust = custMap[o.customer];
                            const oTotal = o.colors.reduce((s, c) => s + c.qty, 0);
                            const st   = orderStatus(o);
                            const cfg  = STATUS_CFG[st];
                            return (
                                <View key={o.soNumber} style={sm.soRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={sm.soNum}>{o.soNumber.replace('SO-', '')}</Text>
                                            <View style={[sm.badge, { backgroundColor: cfg.bg }]}>
                                                <Text style={[sm.badgeTxt, { color: cfg.color }]}>{st}</Text>
                                            </View>
                                        </View>
                                        <Text style={sm.soMeta}>
                                            {o.date.slice(5)} · {cust?.name ?? o.customer} · deliver {o.deliveryDate.slice(5)}
                                        </Text>
                                        {o.colors.map((c, i) => (
                                            <View key={i} style={sm.soColor}>
                                                <View style={sm.colorDot} />
                                                <Text style={sm.soColorTxt}>{c.color}</Text>
                                                <Text style={sm.soColorQty}>{fmt(c.qty)} m</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={sm.soTotal}>{fmt(oTotal)} m</Text>
                                </View>
                            );
                        })}
                    </View>
                );
            })}

            {designs.length === 0 && (
                <Text style={{ textAlign: 'center', color: T.muted, padding: 40, fontSize: 13 }}>
                    No orders for this period.
                </Text>
            )}
        </ScrollView>
    );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
type TabKey = 'new' | 'auth' | 'tracking' | 'all' | 'summary';

export function OrdersScreen() {
    const orders  = useAppStore(s => s.orders);
    const user    = useAppStore(s => s.user);
    const [tab, setTab] = useState<TabKey>('new');

    const pendingCount = orders.filter(o => o.status === 'pending_auth').length;

    const TABS: { key: TabKey; label: string }[] = [
        { key: 'new',      label: 'New Order' },
        { key: 'auth',     label: `Auth${pendingCount ? ` (${pendingCount})` : ''}` },
        { key: 'tracking', label: 'Tracking' },
        { key: 'all',      label: 'All Orders' },
        { key: 'summary',  label: 'Summary' },
    ];

    return (
        <SafeAreaView style={s.safe}>
            <ScreenHeader
                brand="MADHUSUDHAN FABRICS"
                title="Orders"
                right={<Text style={s.sub}>{user?.name ?? ''} · {user?.role ?? ''}</Text>}
            />

            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
                <View style={{ flexDirection: 'row' }}>
                    {TABS.map(t => (
                        <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                            style={[s.tab, tab === t.key && s.tabActive]}>
                            <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Content */}
            <View style={{ flex: 1 }}>
                {tab === 'new'      && <NewOrderTab />}
                {tab === 'auth'     && <AuthTab />}
                {tab === 'tracking' && <TrackingTab />}
                {tab === 'all'      && <AllOrdersTab />}
                {tab === 'summary'  && <SummaryTab />}
            </View>
        </SafeAreaView>
    );
}

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: T.bg },
    sub:        { fontSize: 10, color: '#7A99B4', marginTop: 2 },
    tabBar:     { backgroundColor: T.nav, flexGrow: 0 },
    tab:        { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive:  { borderBottomColor: T.copper, backgroundColor: T.bg },
    tabTxt:     { fontSize: 12, fontWeight: '700', color: '#5A7A94' },
    tabTxtActive: { color: T.nav },
});

const ns = StyleSheet.create({
    scroll:     { padding: 14, paddingBottom: 24 },
    card:       { marginBottom: 12, overflow: 'hidden' },
    stepHead:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    stepBody:   { padding: 14, borderTopWidth: 1, borderTopColor: T.alt },
    stepTitle:  { fontSize: 14, fontWeight: '700', color: T.ink },
    stepSub:    { fontSize: 11, color: T.muted, marginTop: 2 },
    dot:        { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    dotTxt:     { color: '#fff', fontSize: 11, fontWeight: '800' },
    pillRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pill:       { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
    pillActive: { backgroundColor: T.nav, borderColor: T.nav },
    pillTxt:    { fontSize: 12, fontWeight: '700', color: T.ink },
    pillTxtActive: { color: '#fff' },
    fabBtn:     { flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 2, borderColor: T.border, alignItems: 'center', backgroundColor: T.surface },
    fabBtnActive: { borderColor: T.copper },
    fabBtnTxt:  { fontSize: 13, fontWeight: '700', color: T.muted },
    fieldLabel: { fontSize: 9, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
    inp:        { backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, padding: 11, fontSize: 14, color: T.ink },
    marginBox:  { borderRadius: 9, padding: 11, marginBottom: 12 },
    marginLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    marginAmt:  { fontSize: 15, fontWeight: '800', marginTop: 2 },
    marginSub:  { fontSize: 10, color: T.muted, marginTop: 2 },
    nextBtn:    { backgroundColor: T.nav, borderRadius: 9, padding: 12, alignItems: 'center', marginTop: 4 },
    nextBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    addBtn:     { backgroundColor: T.copper, borderRadius: 9, paddingHorizontal: 16, justifyContent: 'center' },
    addBtnTxt:  { fontSize: 20, color: '#fff', fontWeight: '300' },
    colorRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, borderTopWidth: 1, borderTopColor: T.alt },
    colorDot:   { width: 10, height: 10, borderRadius: 5 },
    totalRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border },
    totalLabel: { fontSize: 11, color: T.muted, fontWeight: '700' },
    totalAmt:   { fontSize: 13, fontWeight: '800', color: T.copper },
    submitBtn:  { backgroundColor: T.copper, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    submitBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

const au = StyleSheet.create({
    section:    { padding: 14, paddingBottom: 0 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
    countBadge: { backgroundColor: T.amber + '25', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    countTxt:   { fontSize: 12, fontWeight: '800', color: T.amber },
    card:       { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    top:        { flexDirection: 'row', marginBottom: 10 },
    soNum:      { fontSize: 11, fontWeight: '700', color: T.copper },
    badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    badgeTxt:   { fontSize: 9, fontWeight: '800' },
    custName:   { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 3 },
    design:     { fontSize: 11, color: T.muted, marginTop: 1 },
    amt:        { fontSize: 15, fontWeight: '800', color: T.ink },
    qty:        { fontSize: 11, color: T.muted, marginTop: 2 },
    arrow:      { fontSize: 16, color: T.muted, marginTop: 4 },
    colorRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8, borderTopWidth: 1, borderTopColor: T.sub },
    colorDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: T.muted },
    actions:    { flexDirection: 'row', gap: 10, marginTop: 12 },
    rejectBtn:  { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: 'center', backgroundColor: '#FAE7E3', borderWidth: 1, borderColor: '#E6B8AE' },
    approveBtn: { flex: 1.6, paddingVertical: 11, borderRadius: 9, alignItems: 'center', backgroundColor: T.green },
    rejectTxt:  { fontSize: 13, fontWeight: '800', color: T.red },
    approveTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    empty:      { fontSize: 12, color: T.muted, paddingVertical: 8 },
});

const tr = StyleSheet.create({
    summaryCard: { flexDirection: 'row', gap: 14, padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, alignItems: 'center' },
    donut:      { width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: T.green, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
    donutPct:   { fontSize: 12, fontWeight: '800', color: T.ink },
    donutLabel: { fontSize: 8, color: T.muted },
    legend:     { fontSize: 10 },
    statsRow:   { flexDirection: 'row', marginTop: 10 },
    stat:       { flex: 1, paddingLeft: 8 },
    statLabel:  { fontSize: 8, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
    statVal:    { fontSize: 16, fontWeight: '800', color: T.ink, marginTop: 2 },
    statUnit:   { fontSize: 10, fontWeight: '400' },
    filterRow:  { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
    chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: T.alt },
    chipActive: { backgroundColor: T.nav },
    chipTxt:    { fontSize: 11, fontWeight: '700', color: T.muted },
    chipTxtActive: { color: '#fff' },
    searchWrap: { padding: 10, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search:     { backgroundColor: T.sub, borderRadius: 9, padding: 10, fontSize: 14, color: T.ink },
    card:       { margin: 12, marginBottom: 0, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    soNum:      { fontSize: 11, fontWeight: '700', color: T.copper },
    badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    badgeTxt:   { fontSize: 9, fontWeight: '800' },
    custName:   { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 2 },
    design:     { fontSize: 10, color: T.muted, marginTop: 1 },
    amt:        { fontSize: 13, fontWeight: '800', color: T.ink },
    colorLine:  { flexDirection: 'row', alignItems: 'center', paddingTop: 8, gap: 8 },
    colorName:  { fontSize: 12, fontWeight: '600', color: T.ink },
    colorQty:   { fontSize: 11, color: T.muted, fontWeight: '400' },
    dispatchBtn: { backgroundColor: T.green, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7 },
    dispatchTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
    doneTag:    { fontSize: 11, fontWeight: '800', color: T.green },
    sheetLabel: { fontSize: 11, fontWeight: '700', color: T.muted, marginBottom: 8 },
    sheetInput: { backgroundColor: T.sub, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, padding: 13, fontSize: 18, fontWeight: '700', color: T.ink, textAlign: 'center' },
});

const al = StyleSheet.create({
    pickerWrap:    { paddingHorizontal: 14, paddingTop: 10 },
    pickerLabel:   { fontSize: 8, fontWeight: '800', color: T.muted, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
    pickerChip:    { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, backgroundColor: T.sub },
    pickerChipActive: { backgroundColor: T.nav },
    pickerChipTxt: { fontSize: 11, fontWeight: '700', color: T.muted },
    pickerChipTxtActive: { color: '#fff' },
    sortRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    sortLabel:     { fontSize: 11, color: T.muted, fontWeight: '700' },
    sortDir:       { fontSize: 11, color: T.copper, fontWeight: '700' },
    summary:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
    summaryCount:  { fontSize: 12, color: T.muted },
    summaryVal:    { fontSize: 13, fontWeight: '800', color: T.ink },
    card:          { marginHorizontal: 12, marginTop: 10, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    soNum:         { fontSize: 10, fontWeight: '700', color: T.copper },
    badge:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeTxt:      { fontSize: 8, fontWeight: '800' },
    design:        { fontSize: 11, color: T.muted, marginTop: 2 },
    amt:           { fontSize: 13, fontWeight: '800', color: T.ink },
    qty:           { fontSize: 11, color: T.muted, marginTop: 3 },
});

const sm = StyleSheet.create({
    monthRow:      { paddingVertical: 10, flexGrow: 0 },
    monthChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: T.alt },
    monthChipActive: { backgroundColor: T.copper },
    monthChipTxt:  { fontSize: 12, fontWeight: '700', color: T.muted },
    monthChipTxtActive: { color: '#fff' },
    filterRow:     { paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row' },
    filterChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: T.alt, marginRight: 6 },
    filterChipActive: { backgroundColor: T.nav },
    filterChipTxt: { fontSize: 11, fontWeight: '700', color: T.muted },
    filterChipTxtActive: { color: '#fff' },
    totalCard:     { backgroundColor: T.nav, margin: 14, borderRadius: 12, padding: 14 },
    totalLabel:    { fontSize: 8, color: '#5A7A94', fontWeight: '700', letterSpacing: 0.6 },
    totalMonth:    { fontSize: 20, fontWeight: '800', color: '#fff' },
    totalQty:      { fontSize: 24, fontWeight: '800', color: T.copper },
    totalSub:      { fontSize: 10, color: '#7A99B4', marginTop: 4 },
    designCard:    { backgroundColor: T.surface, marginHorizontal: 14, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    designHead:    { flexDirection: 'row', alignItems: 'flex-start' },
    designTag:     { backgroundColor: T.copper + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    designTagTxt:  { fontSize: 9, fontWeight: '800', color: T.copper },
    designCode:    { fontSize: 14, fontWeight: '800', color: T.ink },
    designMeta:    { fontSize: 10, color: T.muted, marginTop: 2 },
    designTotal:   { fontSize: 18, fontWeight: '800', color: T.copper, marginLeft: 8 },
    colorChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.sub, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    colorDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: T.muted },
    colorChipTxt:  { fontSize: 11, color: T.ink },
    soRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10, borderTopWidth: 1, borderTopColor: T.alt },
    soNum:         { fontSize: 10, fontWeight: '700', color: T.copper },
    badge:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeTxt:      { fontSize: 8, fontWeight: '800' },
    soMeta:        { fontSize: 10, color: T.muted, marginTop: 2 },
    soColor:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    soColorTxt:    { flex: 1, fontSize: 11, color: T.ink },
    soColorQty:    { fontSize: 11, fontWeight: '700', color: T.ink },
    soTotal:       { fontSize: 14, fontWeight: '800', color: T.ink, marginLeft: 8 },
});
