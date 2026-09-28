import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

/**
 * All views live at module level + React.memo.
 * (Previously they were declared inside PayableNew, so every state change
 *  re-created them and React remounted the whole tree -> lag / stuck.)
 */

const C = { navy: '#10283A', orange: '#F97316', ink: '#1E293B', mute: '#64748B', line: '#E8E2D9', bg: '#FBFAF7' };
const TONES: Record<string, { bg: string; fg: string }> = {
    blue: { bg: '#EAF2FF', fg: '#1D4ED8' }, orange: { bg: '#FFF1E6', fg: '#C2410C' },
    green: { bg: '#E7F7EF', fg: '#047857' }, purple: { bg: '#F1EBFE', fg: '#6D28D9' },
    red: { bg: '#FFE9EC', fg: '#BE123C' }, sky: { bg: '#E6F4FA', fg: '#0369A1' },
};

export const money = (v: any) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = (v: any) => Math.floor(parseFloat(String(v ?? 0).replace(/,/g, '')) || 0).toLocaleString('en-IN');

export const useCols = (phone = 1, tablet = 2, desktop = 3, wide = 4) => {
    const { width } = useWindowDimensions();
    return width >= 1400 ? wide : width >= 1000 ? desktop : width >= 640 ? tablet : phone;
};

/* ---------------- Dashboard cards ---------------- */
const compact = (v: any) => {
    const n = Math.abs(parseFloat(String(v ?? 0).replace(/,/g, '')) || 0);
    if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
    return String(Math.round(n));
};

const CARD_INFO = (c = '') => {
    const k = c.toLowerCase().trim();
    if (k === 'all') return { title: 'Total payable', hint: 'Total amount we owe to all parties', icon: 'groups', bg: '#FFF1E2', fg: '#C2410C' };
    if (k.includes('advance')) return { title: 'Advance paid', hint: 'Paid to parties before receiving bills', icon: 'account-balance-wallet', bg: '#EAF2FF', fg: '#1D4ED8' };
    if (k.includes('over')) return { title: 'Over due', hint: 'Bills past due date. Pay these first', icon: 'warning-amber', bg: '#FFE9EC', fg: '#BE123C' };
    if (k.includes('not due')) return { title: 'Not due yet', hint: 'Bills that can be paid later', icon: 'event-available', bg: '#F1EBFE', fg: '#6D28D9' };
    if (k.includes('due today')) return { title: 'Due today', hint: 'Bills to be paid today', icon: 'today', bg: '#E3F6EE', fg: '#047857' };
    if (k.includes('on account')) return { title: 'On account', hint: 'Payments made but not matched to a bill', icon: 'payments', bg: '#FFF4D6', fg: '#A16207' };
    if (k.includes('above')) return { title: 'Over 120 days', hint: 'Very old bills, highest risk', icon: 'hourglass-bottom', bg: '#FDE8E8', fg: '#991B1B' };
    const m = k.match(/(\d+)\s*-\s*(\d+)/);
    if (m) return { title: `${m[1]} to ${m[2]} days`, hint: `Bills ${m[1]}-${m[2]} days old`, icon: 'date-range', bg: '#E9F3F6', fg: '#0E7490' };
    return { title: c, hint: '', icon: 'list-alt', bg: '#EEF2F6', fg: '#334155' };
};

const DashCard = memo(({ item, active, loading, onPress }: any) => {
    const look = CARD_INFO(item.caption);
    const zero = (parseFloat(String(item.summary).replace(/,/g, '')) || 0) === 0;
    return (
        <Pressable
            disabled={zero}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${look.title}. ${look.hint}`}
            style={({ pressed }) => [s.dash, { backgroundColor: look.bg }, active && { borderColor: look.fg }, zero && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
            <View style={s.dashTop}>
                <View style={s.dashIcon}>
                    {active && loading ? <ActivityIndicator size="small" color={look.fg} /> : <Icon name={look.icon as any} size={20} color={look.fg} />}
                </View>
                <Text style={[s.dashCap, { color: look.fg }]} numberOfLines={1}>{look.title}</Text>
            </View>
            <Text style={[s.dashVal, { color: look.fg }]} numberOfLines={1} adjustsFontSizeToFit>₹ {whole(item.summary)}</Text>
            <Text style={[s.dashCompact, { color: look.fg }]}>≈ ₹ {compact(item.summary)}</Text>
            <Text style={s.dashHint} numberOfLines={2}>{look.hint}</Text>
            <View style={s.dashFoot}>
                <Text style={[s.dashCta, { color: look.fg }]}>{zero ? 'Nothing here' : 'View parties'}</Text>
                {!zero && <Icon name="arrow-forward" size={15} color={look.fg} />}
            </View>
        </Pressable>
    );
});

export const DashboardGrid = memo(({ cards, onCardPress, activeSlab, loading }: any) => {
    const cols = useCols(2, 3, 4, 4);
    return (
        <FlatList
            key={cols}
            data={cards}
            numColumns={cols}
            keyExtractor={(i: any) => i.slab}
            renderItem={({ item }) => (
                <View style={{ flex: 1 / cols, padding: 6 }}>
                    <DashCard item={item} active={activeSlab === item.slab} loading={loading} onPress={onCardPress} />
                </View>
            )}
            contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            ListEmptyComponent={!loading ? <Empty text="No payable data found" icon="inbox" /> : null}
        />
    );
});

const Skeleton = () => (
    <View style={{ padding: 12, gap: 10 }}>
        <View style={s.row}><ActivityIndicator color={C.orange} /><Text style={s.meta}>Loading parties…</Text></View>
        {[0, 1, 2, 3].map(i => <View key={i} style={[s.card, { height: 120, backgroundColor: '#F1EEE8', borderColor: 'transparent' }]} />)}
    </View>
);

const Empty = ({ text, icon }: any) => (
    <View style={s.empty}><Icon name={icon} size={30} color="#94A3B8" /><Text style={s.emptyTxt}>{text}</Text></View>
);

const Metric = ({ label, value, tone, plain }: any) => (
    <View style={[s.metric, { backgroundColor: TONES[tone].bg }]}>
        <Text style={s.metricLbl}>{label}</Text>
        <Text style={[s.metricVal, { color: TONES[tone].fg }]} numberOfLines={1}>{plain ? String(value ?? 0) : `₹ ${money(value)}`}</Text>
    </View>
);

/* ---------------- Summary (party) list ---------------- */
const AGE = [
    { k: 'slab1', l: '0-30', c: '#10B981' }, { k: 'slab2', l: '31-60', c: '#F59E0B' },
    { k: 'slab3', l: '61-90', c: '#F97316' }, { k: 'slab4', l: '91-120', c: '#EF4444' }, { k: 'slab5', l: '121+', c: '#991B1B' },
];

const Chip = ({ text, bg, fg }: any) => (
    <View style={[s.chip, { backgroundColor: bg }]}><Text style={[s.chipTxt, { color: fg }]}>{text}</Text></View>
);

const PartyCard = memo(({ item, mode, onOpen }: any) => {
    const main = mode === 'advance' ? item.advance : mode === 'onaccount' ? (item.amount ?? item.onaccount) : item.Total;
    const label = mode === 'advance' ? 'Advance paid' : mode === 'onaccount' ? 'On account' : 'We have to pay';
    const buckets = AGE.map(a => ({ ...a, v: Math.max(0, Number(item[a.k]) || 0) }));
    const sum = buckets.reduce((t, b) => t + b.v, 0);
    const top = buckets.reduce((m, b) => (b.v > m.v ? b : m), buckets[0]);
    const old = (buckets[3].v + buckets[4].v) > 0 && sum > 0 && (buckets[3].v + buckets[4].v) / sum > 0.5;
    return (
        <Pressable onPress={() => onOpen(item.AccCode)} style={({ pressed }) => [s.card, pressed && { backgroundColor: '#FFF7F0' }]}>
            <View style={s.row}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{String(item.AccName || 'A').trim().charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={2}>{item.AccName || 'Unnamed account'}</Text>
                    <Text style={s.meta}>Code {item.AccCode || '-'}</Text>
                </View>
                <Icon name="chevron-right" size={22} color={C.orange} />
            </View>
            <Text style={[s.metricLbl, { marginTop: 12 }]}>{label}</Text>
            <Text style={s.bigAmt} numberOfLines={1} adjustsFontSizeToFit>₹ {money(main)}</Text>
            {mode === 'summary' && sum > 0 && (<>
                <View style={s.ageBar}>
                    {buckets.filter(b => b.v > 0).map(b => <View key={b.k} style={{ flex: b.v, backgroundColor: b.c }} />)}
                </View>
                <Text style={s.meta}>Most of it is {top.l} days old</Text>
            </>)}
            <View style={[s.row, { flexWrap: 'wrap', gap: 6, marginTop: 10 }]}>
                {old && <Chip text="Old bills" bg="#FDE8E8" fg="#991B1B" />}
                {Number(item.advance) > 0 && <Chip text={`Advance ₹ ${compact(item.advance)}`} bg="#EAF2FF" fg="#1D4ED8" />}
                {Number(item.onaccount) > 0 && <Chip text={`On account ₹ ${compact(item.onaccount)}`} bg="#F1EBFE" fg="#6D28D9" />}
                <Chip text={`Credit days: ${item.crday ?? 0}`} bg="#F1F5F9" fg="#475569" />
            </View>
        </Pressable>
    );
});

export const SummaryList = memo(({ data, mode = 'summary', onOpen, loading }: any) => {
    const cols = useCols(1, 2, 2, 3);
    if (loading) return <Skeleton />;
    return (
        <FlatList
            key={cols}
            data={data}
            numColumns={cols}
            keyExtractor={(i: any, idx) => `${i.AccCode}-${idx}`}
            renderItem={({ item }) => <View style={{ flex: 1 / cols, padding: 5 }}><PartyCard item={item} mode={mode} onOpen={onOpen} /></View>}
            contentContainerStyle={{ padding: 6, paddingBottom: 40 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Empty text="No summary data found" icon="inbox" />}
        />
    );
});

/* ---------------- Customer summary body ---------------- */
export const CustomerSummaryBody = memo(({ customer, code, selected, onSelect, onViewDetails }: any) => {
    const cols = useCols(2, 4, 4, 4);
    const ageing = [
        { label: '0-30', v: Number(customer?.slab1) || 0 }, { label: '31-60', v: Number(customer?.slab2) || 0 },
        { label: '61-90', v: Number(customer?.slab3) || 0 }, { label: '91-120', v: Number(customer?.slab4) || 0 },
        { label: '121+', v: Number(customer?.slab5) || 0 },
    ];
    const max = Math.max(...ageing.map(a => a.v), 1);
    const pick = ageing.find(a => a.label === selected);
    const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 };
    const cell = { width: `${100 / cols - 2}%` as any, flexGrow: 1 };
    return (
        <View style={{ padding: 12, gap: 12 }}>
            <View style={[s.card, s.row]}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{String(customer?.AccName || 'A').trim().charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={2}>{customer?.AccName || 'Customer'}</Text>
                    <Text style={s.meta}>Code: {code || '-'}  |  Group: {customer?.MHName || 'SUNDRY CREDITORS'}</Text>
                </View>
            </View>
            <View style={grid}>
                {[['Outstanding', customer?.Total, 'blue'], ['Credit days', customer?.crday ?? 0, 'orange', 1], ['Cumulative', customer?.Total, 'green']].map(([l, v, t, p]: any) => (
                    <View key={l} style={cell}><Metric label={l} value={v} tone={t} plain={p} /></View>
                ))}
            </View>
            <View style={s.card}>
                <View style={s.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.name}>Ageing analysis</Text>
                        <Text style={s.meta}>{pick ? `${pick.label} days: ₹ ${money(pick.v)}` : 'Tap a bar for the exact amount'}</Text>
                    </View>
                </View>
                <View style={s.chart}>
                    {ageing.map(a => {
                        const on = selected === a.label;
                        return (
                            <Pressable key={a.label} style={s.barCol} onPress={() => onSelect(on ? null : a.label)}>
                                <Text style={[s.barVal, on && { color: C.orange }]}>{a.v ? `${money(a.v / 100000)} L` : '₹ 0'}</Text>
                                <View style={s.barTrack}><View style={[s.bar, { height: Math.max(5, (a.v / max) * 120) }, on && { backgroundColor: '#C2410C' }]} /></View>
                                <Text style={[s.barLbl, on && { color: C.orange, fontWeight: '800' }]}>{a.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
            <View style={grid}>
                {[['Advance', customer?.advance, 'green'], ['On account', customer?.onaccount, 'purple'], ['PDC amount', customer?.pdcamt, 'sky'], ['NCL amount', customer?.nclramt, 'red']].map(([l, v, t]: any) => (
                    <View key={l} style={cell}><Metric label={l} value={v} tone={t} /></View>
                ))}
            </View>
            <Pressable style={s.cta} onPress={onViewDetails}>
                <Icon name="description" size={20} color="#fff" /><Text style={s.ctaTxt}>View details</Text>
            </Pressable>
        </View>
    );
});

/* ---------------- Voucher details ---------------- */
const TYPES: Record<string, string> = {
    PURC: 'Purchase bill', GINW: 'Job work bill', OPBL: 'Opening balance', BKPM: 'Bank payment',
    EXJV: 'Journal entry', JV: 'Journal entry', DBNT: 'Debit note', CRNT: 'Credit note',
};

const Voucher = memo(({ item, onAcc }: any) => {
    const date = String(item.TRANDATE || item.NTRANDATE || '-');
    const amt = Number(item.CUMBAL ?? item.AMOUNT ?? 0);
    const credit = amt < 0;
    const type = String(item.TYPE || '');
    const age = Number(item.DUEDAY ?? item.dueday ?? 0);
    return (
        <View style={s.card}>
            <View style={s.row}>
                <View style={s.date}><Text style={s.dateD}>{date.slice(0, 2)}</Text><Text style={s.dateM}>{date.slice(3, 5)}/{date.slice(8, 10)}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{TYPES[type] || type || (onAcc ? 'On account' : 'Entry')}</Text>
                    <Text style={s.meta} numberOfLines={1}>Voucher {item.VOUNO || item.TRANID || '-'}{item.DOCNO ? `  |  Bill ${item.DOCNO}` : ''}</Text>
                </View>
                <Chip text={credit ? 'We paid' : 'To pay'} bg={credit ? '#E7F7EF' : '#FFF1E6'} fg={credit ? '#047857' : '#C2410C'} />
            </View>
            <Text style={[s.bigAmt, { marginTop: 10, color: credit ? '#047857' : C.navy }]}>₹ {money(Math.abs(amt))}</Text>
            {!!item.PTCL && <Text style={s.meta} numberOfLines={1}>{item.PTCL}</Text>}
            {!!item.NARR && <Text style={s.meta} numberOfLines={2}>{item.NARR}</Text>}
            <View style={[s.row, { gap: 8, marginTop: 10 }]}>
                {onAcc ? (<>
                    <Metric label="Cheque no." value={item.chqno || '-'} tone="blue" plain />
                    <Metric label="Cheque date" value={item.chqdate || '-'} tone="orange" plain />
                    <Metric label="Cleared on" value={item.clrdate || '-'} tone="green" plain />
                </>) : (<>
                    <Metric label="Bill age" value={`${age} days`} tone={age > 90 ? 'red' : age > 30 ? 'orange' : 'green'} plain />
                    <Metric label="Running total" value={item.Cumulative ?? amt} tone="sky" />
                </>)}
            </View>
        </View>
    );
});

export const VoucherList = memo(({ rows, isOnAccount }: any) => {
    const cols = useCols(1, 1, 2, 2);
    const sorted = useMemo(() => [...(rows || [])].sort((a: any, b: any) =>
        String(b.NTRANDATE || b.TRANDATE || '').localeCompare(String(a.NTRANDATE || a.TRANDATE || ''))), [rows]);
    const total = useMemo(() => sorted.reduce((t: number, r: any) => t + (Number(r.CUMBAL ?? r.AMOUNT ?? r.BALANCE) || 0), 0), [sorted]);
    return (
        <FlatList
            key={cols}
            data={sorted}
            numColumns={cols}
            keyExtractor={(i: any, idx) => `${i.TRANID ?? i.VOUNO}-${idx}`}
            renderItem={({ item }) => <View style={{ flex: 1 / cols, padding: 5 }}><Voucher item={item} onAcc={isOnAccount} /></View>}
            contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Empty text="No details available" icon="inbox" />}
            ListFooterComponent={sorted.length ? (
                <View style={s.total}>
                    <View style={{ flex: 1 }}><Text style={s.meta}>Balance</Text><Text style={s.totalVal}>₹ {money(total)}</Text></View>
                    <View style={{ flex: 1 }}><Text style={s.meta}>Cumulative</Text><Text style={s.totalVal}>₹ {money(total)}</Text></View>
                </View>
            ) : null}
        />
    );
});

const s = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.line },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFE8D6', alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { color: '#C2410C', fontWeight: '800', fontSize: 17 },
    name: { color: C.navy, fontSize: 14, fontWeight: '800' },
    meta: { color: C.mute, fontSize: 11, marginTop: 2 },
    metric: { flex: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: 0 },
    metricLbl: { color: C.mute, fontSize: 10 },
    metricVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
    chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    chipTxt: { fontSize: 10, fontWeight: '700' },
    bigAmt: { color: C.navy, fontSize: 20, fontWeight: '900', marginTop: 2 },
    ageBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8, marginBottom: 4, backgroundColor: '#EEE' },
    dashCompact: { fontSize: 12, fontWeight: '700', opacity: 0.8, marginTop: 1 },
    dashHint: { color: '#475569', fontSize: 11, marginTop: 6, lineHeight: 15 },
    dashFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    dashCta: { fontSize: 11, fontWeight: '800' },
    dash: { borderRadius: 18, padding: 14, minHeight: 150, borderWidth: 2, borderColor: 'transparent' },
    dashTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dashIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFFB0', alignItems: 'center', justifyContent: 'center' },
    dashCap: { fontSize: 13, fontWeight: '800', flex: 1 },
    dashVal: { fontSize: 24, fontWeight: '900', marginTop: 10 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 175, marginTop: 10 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    barTrack: { height: 122, justifyContent: 'flex-end' },
    bar: { width: 26, borderRadius: 6, backgroundColor: C.orange },
    barVal: { fontSize: 10, color: C.mute, marginBottom: 4 },
    barLbl: { fontSize: 10, color: C.mute, marginTop: 6 },
    cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy, borderRadius: 14, height: 50 },
    ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
    date: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center' },
    dateD: { fontSize: 17, fontWeight: '900', color: '#C2410C' },
    dateM: { fontSize: 9, color: '#C2410C' },
    vNo: { color: C.mute, fontSize: 11, maxWidth: 130 },
    total: { flexDirection: 'row', margin: 5, padding: 14, borderRadius: 14, backgroundColor: '#FFF1E6', borderWidth: 1, borderColor: '#F7CFAE' },
    totalVal: { color: '#C2410C', fontSize: 17, fontWeight: '900', marginTop: 2 },
    empty: { alignItems: 'center', padding: 40, gap: 8 },
    emptyTxt: { color: '#94A3B8', fontSize: 14 },
});
