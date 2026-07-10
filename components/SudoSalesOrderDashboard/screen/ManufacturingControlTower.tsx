import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../../common/utils/theme';
import { RealCostingChainAPI } from '../../../common/API/client';

type ControlTowerResponse = {
    success?: boolean;
    response?: {
        context?: any;
        summary?: any;
        designs?: any[];
        cost_chain?: any;
        control_tower?: ControlTower;
        manufacturing_flow?: any[];
        phase4_kpis?: any;
        data_quality?: any[];
        mapping?: any;
    };
};

type ControlTower = {
    title?: string;
    subtitle?: string;
    factory_health?: {
        score?: number;
        status?: string;
        color?: string;
        summary?: string;
    };
    hero_cards?: Array<{
        key: string;
        title: string;
        value: number | string;
        prefix?: string;
        suffix?: string;
        status?: string;
    }>;
    operations?: Record<string, any>;
    financial_pulse?: Record<string, any>;
    alerts?: Array<{
        severity?: string;
        module?: string;
        title?: string;
        message?: string;
        action?: string;
    }>;
    today_priorities?: Array<{
        title?: string;
        module?: string;
        severity?: string;
        action?: string;
    }>;
    timeline?: Array<{
        stage?: string;
        ref_no?: string;
        event_date?: string;
        title?: string;
    }>;
    drilldowns?: Record<string, string>;
};

const DEFAULT_FILTERS = {
    prpcode: 'SIP',
    yearno: '27',
    from_date: '20260701',
    to_date: '20260731',
};

const money = (v: any) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '₹0';
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const qty = (v: any) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-IN');
};

const percent = (v: any) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '0%';
    return `${n.toFixed(1)}%`;
};

const compactValue = (card: any) => {
    const prefix = card?.prefix || '';
    const suffix = card?.suffix || '';
    const raw = card?.value;

    if (prefix === '₹') return money(raw);
    if (suffix === '%') return percent(raw);
    if (suffix) return `${qty(raw)} ${suffix}`;
    return typeof raw === 'number' ? qty(raw) : String(raw ?? '-');
};

const statusColor = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('excellent') || s.includes('healthy') || s === 'ok') return T.green;
    if (s.includes('partial') || s.includes('watch') || s.includes('attention')) return T.amber;
    if (s.includes('critical') || s.includes('loss') || s.includes('low')) return T.red;
    return T.copper;
};

function Header({ health }: { health?: ControlTower['factory_health'] }) {
    return (
        <View style={hdr.wrap}>
            <Text style={hdr.brand}>MADHUSUDHAN FABRICS</Text>
            <Text style={hdr.title}>Manufacturing Control Tower</Text>
            <Text style={hdr.sub}>Factory health, profit pulse and live operations</Text>

            <View style={hdr.healthCard}>
                <View>
                    <Text style={hdr.healthLabel}>FACTORY HEALTH</Text>
                    <Text style={hdr.healthStatus}>{health?.status || 'Loading'}</Text>
                    <Text style={hdr.healthSummary}>{health?.summary || 'Reading factory signals…'}</Text>
                </View>
                <View style={[hdr.scoreBubble, { borderColor: statusColor(health?.status) }]}>
                    <Text style={[hdr.score, { color: statusColor(health?.status) }]}>
                        {Math.round(Number(health?.score || 0))}
                    </Text>
                    <Text style={hdr.scoreSub}>/100</Text>
                </View>
            </View>
        </View>
    );
}

function HeroCards({ cards }: { cards?: ControlTower['hero_cards'] }) {
    if (!cards?.length) return null;
    return (
        <View style={s.grid}>
            {cards.map(card => (
                <View key={card.key} style={s.heroCard}>
                    <Text style={s.cardLabel}>{card.title}</Text>
                    <Text style={s.cardValue}>{compactValue(card)}</Text>
                    {!!card.status && <Text style={[s.statusText, { color: statusColor(card.status) }]}>{card.status}</Text>}
                </View>
            ))}
        </View>
    );
}

function FinancialPulse({ data }: { data?: Record<string, any> }) {
    if (!data) return null;
    return (
        <View style={s.section}>
            <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Financial Pulse</Text>
                <Text style={[s.badge, { color: statusColor(data.status) }]}>{data.status || '—'}</Text>
            </View>

            <Row label="Sales Value" value={money(data.sales_value)} />
            <Row label="Actual Cost" value={money(data.actual_cost)} />
            <Row label="Gross Profit" value={money(data.gross_profit)} highlight />
            <Row label="Margin" value={percent(data.margin_percent)} />
            <View style={s.divider} />
            <Row label="Estimated Cost" value={money(data.estimated_cost)} />
            <Row label="Variance" value={money(data.variance_amount)} />
            {!!data.note && <Text style={s.note}>{data.note}</Text>}
        </View>
    );
}

function Operations({ operations }: { operations?: Record<string, any> }) {
    const rows = useMemo(() => Object.entries(operations || {}), [operations]);
    if (!rows.length) return null;

    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>Live Operations</Text>
            {rows.map(([key, item]) => {
                const pct = Math.max(0, Math.min(100, Number(item?.completion_percent || 0)));
                return (
                    <View key={key} style={op.row}>
                        <View style={{ flex: 1 }}>
                            <View style={op.rowHead}>
                                <Text style={op.label}>{item?.label || key}</Text>
                                <Text style={[op.status, { color: statusColor(item?.status) }]}>{item?.status || '—'}</Text>
                            </View>
                            <View style={op.track}>
                                <View style={[op.fill, { width: `${pct}%`, backgroundColor: statusColor(item?.status) }]} />
                            </View>
                            <Text style={op.source}>{item?.source}</Text>
                        </View>
                        <View style={op.metricBox}>
                            <Text style={op.metric}>
                                {item?.value != null ? money(item.value) : qty(item?.qty || item?.cost || 0)}
                            </Text>
                            <Text style={op.metricSub}>{pct.toFixed(0)}%</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

function Alerts({ alerts, priorities }: { alerts?: ControlTower['alerts']; priorities?: ControlTower['today_priorities'] }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>Attention</Text>

            {alerts?.length ? alerts.map((a, i) => (
                <View key={`a-${i}`} style={alert.card}>
                    <Text style={[alert.sev, { color: statusColor(a.severity) }]}>{String(a.severity || 'info').toUpperCase()}</Text>
                    <Text style={alert.title}>{a.title}</Text>
                    <Text style={alert.msg}>{a.message}</Text>
                    {!!a.action && <Text style={alert.action}>{a.action}</Text>}
                </View>
            )) : <Text style={s.empty}>No critical alerts for this filter.</Text>}

            {!!priorities?.length && (
                <>
                    <Text style={[s.sectionTitle, { marginTop: 14 }]}>Today’s Priorities</Text>
                    {priorities.map((p, i) => (
                        <View key={`p-${i}`} style={priority.row}>
                            <View style={priority.no}><Text style={priority.noText}>{i + 1}</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={priority.title}>{p.title}</Text>
                                <Text style={priority.sub}>{p.module} · {p.action}</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}
        </View>
    );
}

function Timeline({ items }: { items?: ControlTower['timeline'] }) {
    if (!items?.length) return null;

    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>Factory Timeline</Text>
            {items.slice(0, 12).map((t, i) => (
                <View key={`${t.stage}-${t.ref_no}-${i}`} style={time.row}>
                    <View style={time.dotWrap}>
                        <View style={time.dot} />
                        {i !== Math.min(items.length, 12) - 1 && <View style={time.line} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={time.title}>{t.title}</Text>
                        <Text style={time.sub}>{t.stage} · {t.ref_no} · {t.event_date}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={s.row}>
            <Text style={s.rowLabel}>{label}</Text>
            <Text style={[s.rowValue, highlight && { color: T.green, fontWeight: '800' }]}>{value}</Text>
        </View>
    );
}

export function ManufacturingControlTower({ route }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payload, setPayload] = useState<ControlTowerResponse['response'] | null>(null);

    const params = {
        ...DEFAULT_FILTERS,
        ...(route?.params || {}),
    };

    const load = useCallback(async () => {
        try {
            const res = await RealCostingChainAPI.dashboard(params);
            setPayload(res.data?.response || null);
        } catch (e: any) {
            Alert.alert('Control Tower Error', e?.response?.data?.message || e?.message || 'Unable to load dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [params.prpcode, params.yearno, params.from_date, params.to_date]);

    useEffect(() => {
        load();
    }, [load]);

    const tower = payload?.control_tower;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
            <Header health={tower?.factory_health} />

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator color={T.copper} />
                    <Text style={s.loadingText}>Loading Control Tower…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={s.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                >
                    <HeroCards cards={tower?.hero_cards} />
                    <FinancialPulse data={tower?.financial_pulse} />
                    <Operations operations={tower?.operations} />
                    <Alerts alerts={tower?.alerts} priorities={tower?.today_priorities} />
                    <Timeline items={tower?.timeline} />

                    <View style={s.footerNote}>
                        <Text style={s.footerText}>Source: Real Costing Chain · SQL Server · No external AI</Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 4 },
    healthCard: {
        marginTop: 14,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    healthLabel: { fontSize: 9, color: 'rgba(255,255,255,0.66)', fontWeight: '800', letterSpacing: 0.8 },
    healthStatus: { fontSize: 23, color: '#fff', fontWeight: '900', marginTop: 4 },
    healthSummary: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 3, maxWidth: 210 },
    scoreBubble: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    score: { fontSize: 25, fontWeight: '900' },
    scoreSub: { fontSize: 10, color: T.muted, marginTop: -2 },
});

const s = StyleSheet.create({
    content: { padding: 14, paddingBottom: 36 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 10, fontSize: 12, color: T.muted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    heroCard: {
        width: '48%',
        backgroundColor: T.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: T.border,
        minHeight: 92,
    },
    cardLabel: { fontSize: 10, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    cardValue: { fontSize: 20, color: T.ink, fontWeight: '900', marginTop: 8 },
    statusText: { fontSize: 11, fontWeight: '800', marginTop: 5 },
    section: {
        backgroundColor: T.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: T.border,
        marginBottom: 12,
    },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 13, color: T.ink, fontWeight: '900', marginBottom: 10 },
    badge: { fontSize: 11, fontWeight: '900' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
    rowLabel: { fontSize: 12, color: T.muted },
    rowValue: { fontSize: 13, color: T.ink, fontWeight: '700' },
    divider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
    note: { fontSize: 11, color: T.muted, lineHeight: 16, marginTop: 8 },
    empty: { fontSize: 12, color: T.muted, textAlign: 'center', paddingVertical: 8 },
    footerNote: { paddingVertical: 12, alignItems: 'center' },
    footerText: { fontSize: 10, color: T.muted },
});

const op = StyleSheet.create({
    row: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: T.sub },
    rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    label: { fontSize: 12.5, fontWeight: '800', color: T.ink },
    status: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    track: { height: 7, borderRadius: 10, backgroundColor: T.sub, overflow: 'hidden' },
    fill: { height: 7, borderRadius: 10 },
    source: { fontSize: 9.5, color: T.muted, marginTop: 5 },
    metricBox: { width: 76, alignItems: 'flex-end', justifyContent: 'center' },
    metric: { fontSize: 12, fontWeight: '900', color: T.ink },
    metricSub: { fontSize: 10, color: T.muted, marginTop: 3 },
});

const alert = StyleSheet.create({
    card: { backgroundColor: T.sub, borderRadius: 12, padding: 12, marginBottom: 8 },
    sev: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
    title: { fontSize: 13, fontWeight: '900', color: T.ink, marginTop: 3 },
    msg: { fontSize: 11, color: T.muted, lineHeight: 16, marginTop: 4 },
    action: { fontSize: 11, color: T.copper, fontWeight: '800', marginTop: 6 },
});

const priority = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.sub },
    no: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.copper + '22', alignItems: 'center', justifyContent: 'center' },
    noText: { fontSize: 12, fontWeight: '900', color: T.copper },
    title: { fontSize: 12.5, color: T.ink, fontWeight: '800' },
    sub: { fontSize: 10.5, color: T.muted, marginTop: 2 },
});

const time = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10, minHeight: 48 },
    dotWrap: { alignItems: 'center', width: 18 },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: T.copper, marginTop: 4 },
    line: { flex: 1, width: 1, backgroundColor: T.border, marginTop: 3 },
    title: { fontSize: 12.5, color: T.ink, fontWeight: '800' },
    sub: { fontSize: 10.5, color: T.muted, marginTop: 2 },
});

export default ManufacturingControlTower;
