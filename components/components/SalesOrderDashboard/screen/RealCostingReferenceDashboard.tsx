import AppAlert from '@/common/utils/appAlert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    LayoutAnimation,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RealCostingChainAPI } from '@/common/API/client';
import Icon from "@expo/vector-icons/MaterialIcons";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DashboardResponse = {
    success?: boolean;
    response?: {
        context?: any;
        summary?: any;
        designs?: RealCostingDesign[];
        cost_chain?: any;
    };
};

type RealCostingDesign = {
    dsncode?: string | number;
    dsnname?: string;
    cost_dsncode?: string | number;
    cost_dsnname?: string | null;
    cost_uid?: string | number;
    document_count?: string | number;
    output_qty?: string | number;
    grey_rate?: string | number;
    finish_rate?: string | number;
    selling_rate?: string | number;
    estimated_raw_material?: string | number;
    estimated_weaving_processing?: string | number;
    actual_raw_material?: string | number;
    issue_qty?: string | number;
    issue_count?: string | number;
    actual_weaving_qty?: string | number;
    actual_weaving_cost?: string | number;
    estimated_total?: string | number;
    actual_total?: string | number;
    selling_total?: string | number;
    variance_total?: string | number;
    first_voudate?: string | number;
    last_voudate?: string | number;
};

const C = {
    bg: '#F5F1EA',
    nav: '#0D1B2A',
    card: '#FFFFFF',
    soft: '#F8F4EE',
    soft2: '#FBF8F3',
    border: '#E5DED4',
    borderSoft: '#EFE8DE',
    ink: '#111827',
    text: '#1F2937',
    muted: '#8A8177',
    muted2: '#A69C91',
    copper: '#B77932',
    copperDark: '#9E6324',
    green: '#2F855A',
    red: '#C53030',
};

const DEFAULT_FILTERS = {
    prpcode: 'SIP',
    yearno: '27',
    from_date: '20260701',
    to_date: '20260731',
};

const toNumber = (v: any) => {
    const x = Number(v || 0);
    return Number.isFinite(x) ? x : 0;
};

const money0 = (v: any) => {
    const x = toNumber(v);
    const sign = x < 0 ? '-' : '';
    const a = Math.abs(x);

    if (a >= 10000000) return `${sign}₹${(a / 10000000).toFixed(2)} Cr`;
    if (a >= 100000) return `${sign}₹${(a / 100000).toFixed(2)} L`;
    return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`;
};

const money2 = (v: any) => {
    const x = toNumber(v);
    const sign = x < 0 ? '-' : '';
    return `${sign}₹${Math.abs(x).toFixed(2)}`;
};

const qty = (v: any) => Math.round(toNumber(v)).toLocaleString('en-IN');
const pct = (v: any) => `${toNumber(v).toFixed(1)}%`;

const perMtr = (amount: any, output: any) => {
    const q = toNumber(output);
    return q > 0 ? toNumber(amount) / q : 0;
};

const deltaText = (value: number) => {
    if (Math.abs(value) < 0.005) return '0';
    return `${value > 0 ? '+' : '-'}${money2(Math.abs(value))}`;
};

const deltaArrow = (value: number) => value > 0 ? '▲' : '▼';
const deltaColor = (value: number) => value > 0 ? C.red : C.green;

const monthShort = (m: string) => ({
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}[m] || '');

const monthFull = (m: string) => ({
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December',
}[m] || '');

const dateLabel = (raw?: any) => {
    const s = String(raw || '');
    if (s.length !== 8) return s || '-';
    return `${s.slice(6, 8)} ${monthShort(s.slice(4, 6))}`;
};

const monthLabel = (context?: any) => {
    const f = String(context?.from_date || DEFAULT_FILTERS.from_date);
    if (f.length < 6) return 'Monthly real-costing summary';
    return `${monthFull(f.slice(4, 6))} ${f.slice(0, 4)}`;
};

const designName = (d: RealCostingDesign) => {
    const name = String(d.cost_dsnname || d.dsnname || `Design ${d.dsncode || ''}`).trim();
    return name || `Design ${d.dsncode || ''}`;
};

const designKey = (d: RealCostingDesign) => String(d.dsncode || d.cost_uid || designName(d));

const designStatusLine = (d: RealCostingDesign) => {
    const metres = qty(d.output_qty || d.actual_weaving_qty);
    const beams = Math.max(1, Math.round(toNumber(d.document_count || 1)));
    return `Finished · ${metres} m · ${beams} beam${beams > 1 ? 's' : ''}`;
};

const getDesignMath = (d: RealCostingDesign) => {
    const output = toNumber(d.output_qty || d.actual_weaving_qty);

    const rawAssumed = perMtr(d.estimated_raw_material, output);
    const rawActual = perMtr(d.actual_raw_material, output);

    const weavingAssumed = perMtr(d.estimated_weaving_processing, output);
    const weavingActual = perMtr(d.actual_weaving_cost, output);

    const greigeAssumed = rawAssumed + weavingAssumed;
    const greigeActual = rawActual + weavingActual;

    const finalAssumedFromTotal = perMtr(d.estimated_total, output);
    const finalActualFromTotal = perMtr(d.actual_total, output);
    const sellingActual = perMtr(d.selling_total, output);

    const finalAssumed = finalAssumedFromTotal || greigeAssumed || rawAssumed;
    const finalActual = finalActualFromTotal || sellingActual || greigeActual;
    const variance = finalActual - finalAssumed;

    return {
        output,
        rawAssumed,
        rawActual,
        weavingAssumed,
        weavingActual,
        greigeAssumed,
        greigeActual,
        finalAssumed,
        finalActual,
        variance,
    };
};

function Header({ onRefresh }: { onRefresh: () => void }) {
    return (
        <View style={header.wrap}>
            <View style={header.content}>
                <View>
                    <Text style={header.brand}>MADHUSUDHAN FABRICS</Text>
                    <Text style={header.title}>Reports</Text>
                    <Text style={header.path}>Production · Reports</Text>
                    <Text style={header.pathSub}>Production Planner · Production Planner</Text>
                </View>

                <TouchableOpacity style={header.refresh} onPress={onRefresh} activeOpacity={0.75}>
                    <Text style={header.refreshText}>↻</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function SummaryCard({ summary, context }: { summary?: any; context?: any }) {
    const estimated = toNumber(summary?.estimated_total);
    const actual = toNumber(summary?.actual_total);
    const output = toNumber(summary?.costed_output);
    const delta = actual - estimated;
    const deltaPct = estimated > 0 ? (delta / estimated) * 100 : 0;

    const estimatedPerM = output > 0 ? estimated / output : 0;
    const actualPerM = output > 0 ? actual / output : 0;
    const perDelta = actualPerM - estimatedPerM;

    return (
        <View style={summaryStyles.outer}>
            <View style={summaryStyles.accent} />

            <View style={summaryStyles.inner}>
                <Text style={summaryStyles.kicker}>
                    {monthLabel(context)} · all designs
                </Text>

                <View style={summaryStyles.metricRow}>
                    <SummaryMetric value={qty(summary?.designs)} label="DESIGNS" />
                    <SummaryMetric value={`${qty(output)} m`} label="COSTED OUTPUT" />
                    <SummaryMetric
                        value={pct(deltaPct)}
                        label="VS ASSUMED"
                        valueColor={deltaColor(deltaPct)}
                    />
                </View>

                <SummaryCompare
                    label="TOTAL COST · assumed → actual"
                    left={money0(estimated)}
                    right={money0(actual)}
                    delta={delta}
                    valueFormatter={money0}
                />

                <View style={summaryStyles.divider} />

                <SummaryCompare
                    label="BLENDED ₹/METRE · assumed → actual"
                    left={money2(estimatedPerM)}
                    right={money2(actualPerM)}
                    delta={perDelta}
                    valueFormatter={money2}
                />
            </View>
        </View>
    );
}

function SummaryMetric({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
    return (
        <View style={summaryStyles.metricBox}>
            <Text style={[summaryStyles.metricValue, valueColor && { color: valueColor }]} numberOfLines={1}>
                {value}
            </Text>
            <Text style={summaryStyles.metricLabel}>{label}</Text>
        </View>
    );
}

function SummaryCompare({
    label,
    left,
    right,
    delta,
    valueFormatter,
}: {
    label: string;
    left: string;
    right: string;
    delta: number;
    valueFormatter: (v: any) => string;
}) {
    return (
        <View style={summaryStyles.compareBlock}>
            <View style={{ flex: 1 }}>
                <Text style={summaryStyles.compareLabel}>{label}</Text>
                <Text style={summaryStyles.compareValue}>{left} → {right}</Text>
            </View>

            <Text style={[summaryStyles.compareDelta, { color: deltaColor(delta) }]}>
                {deltaArrow(delta)} {valueFormatter(Math.abs(delta))}
            </Text>
        </View>
    );
}

function DesignCard({
    design,
    expanded,
    onPress,
}: {
    design: RealCostingDesign;
    expanded: boolean;
    onPress: () => void;
}) {
    const spin = useRef(new Animated.Value(expanded ? 1 : 0)).current;
    const m = getDesignMath(design);

    useEffect(() => {
        Animated.timing(spin, {
            toValue: expanded ? 1 : 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [expanded, spin]);

    const rotate = spin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={[card.card, expanded && card.cardExpanded]}>
            <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={card.header}>
                <View style={card.nameCol}>
                    <Text style={card.designName} numberOfLines={1}>
                        {designName(design)}
                    </Text>
                    <Text style={card.status}>
                        {designStatusLine(design)}
                    </Text>
                </View>

                <View style={card.priceCol}>
                    <Text style={card.price}>
                        {money2(m.finalActual)}<Text style={card.per}> /m</Text>
                    </Text>
                    <Text style={[card.deltaText, { color: deltaColor(m.variance) }]}>
                        {deltaArrow(m.variance)} {money2(Math.abs(m.variance))} vs est
                    </Text>
                </View>

                <Animated.Text style={[card.chevron, { transform: [{ rotate }] }]}>
                    {/* ⌄ */}
                      <Icon name="expand-more" size={20} color="#000" />
                </Animated.Text>
            </TouchableOpacity>

            {expanded && <ExpandedCost design={design} math={m} />}
        </View>
    );
}

function ExpandedCost({ design, math }: { design: RealCostingDesign; math: ReturnType<typeof getDesignMath> }) {
    const rows = [
        { label: 'Raw material', assumed: math.rawAssumed, actual: math.rawActual },
        { label: 'Weaving', assumed: math.weavingAssumed, actual: math.weavingActual },
        { label: 'Greige mfg', assumed: math.greigeAssumed, actual: math.greigeActual },
        { label: 'Warp shortage', assumed: 0, actual: 0 },
        { label: 'Finish shrink', assumed: 0, actual: 0 },
        { label: 'Processing', assumed: 0, actual: 0 },
    ];

    return (
        <View style={expandedStyles.wrap}>
            <View style={expandedStyles.tableHead}>
                <Text style={[expandedStyles.th, { flex: 1.55, textAlign: 'left' }]}>
                    ASSUMED vs ACTUAL · per metre
                </Text>
                <Text style={expandedStyles.th}>ASSUMED</Text>
                <Text style={expandedStyles.th}>ACTUAL</Text>
                <Text style={expandedStyles.th}>Δ</Text>
            </View>

            {rows.map((r) => {
                const delta = r.actual - r.assumed;
                return (
                    <View key={r.label} style={expandedStyles.row}>
                        <Text style={[expandedStyles.label, { flex: 1.55 }]}>{r.label}</Text>
                        <Text style={expandedStyles.cell}>{money2(r.assumed)}</Text>
                        <Text style={expandedStyles.actualCell}>{money2(r.actual)}</Text>
                        <Text style={[expandedStyles.deltaCell, { color: deltaColor(delta) }]}>
                            {Math.abs(delta) < 0.005 ? '0' : deltaText(delta)}
                        </Text>
                    </View>
                );
            })}

            <View style={expandedStyles.finalDivider} />

            <View style={expandedStyles.finalRow}>
                <Text style={[expandedStyles.finalLabel, { flex: 1.55 }]}>Final ₹/m</Text>
                <Text style={expandedStyles.finalCell}>{money2(math.finalAssumed)}</Text>
                <Text style={expandedStyles.finalActual}>{money2(math.finalActual)}</Text>
                <Text style={[expandedStyles.finalDelta, { color: deltaColor(math.variance) }]}>
                    {Math.abs(math.variance) < 0.005 ? '0' : deltaText(math.variance)}
                </Text>
            </View>

            <Text style={expandedStyles.note}>
                Assumed from costing. Actual gathered from issue, weaving, packing and sales chain.
            </Text>

            <BeamFooter design={design} math={math} />
        </View>
    );
}

function BeamFooter({ design, math }: { design: RealCostingDesign; math: ReturnType<typeof getDesignMath> }) {
    const beamNo = `BM-${String(design.dsncode || design.cost_dsncode || '0000').slice(-4)}`;
    const metres = toNumber(design.actual_weaving_qty || design.output_qty);
    const cost = toNumber(design.actual_weaving_cost);
    const pickRate = math.weavingActual;

    return (
        <View style={beam.wrap}>
            <Text style={beam.title}>BEAM-WISE · WOVEN-DATE PICK RATE</Text>

            <View style={beam.grid}>
                <BeamColumn label="BEAM" value={beamNo} />
                <BeamColumn label="SHED" value="RAP" accent />
                <BeamColumn label="WOVEN" value={dateLabel(design.last_voudate)} />
                <BeamColumn label="₹/PK" value={money2(pickRate)} />
                <BeamColumn label="METRES" value={qty(metres)} />
                <BeamColumn label="COST" value={money0(cost)} strong />
            </View>

            <Text style={beam.note}>
                Each beam costed at the pick rate in force when woven.
            </Text>
        </View>
    );
}

function BeamColumn({ label, value, accent, strong }: {
    label: string;
    value: string;
    accent?: boolean;
    strong?: boolean;
}) {
    return (
        <View style={beam.col}>
            <Text style={beam.label}>{label}</Text>
            <Text
                style={[
                    beam.value,
                    accent && { color: C.copper },
                    strong && { color: C.ink, fontWeight: '900' },
                ]}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

export default function RealCostingReferenceDashboard({ route }: any) {
    const [payload, setPayload] = useState<DashboardResponse['response'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const params = {
        ...DEFAULT_FILTERS,
        ...(route?.params || {}),
    };

    const load = useCallback(async () => {
        try {
            const res = await RealCostingChainAPI.dashboard(params);
            const response = res.data?.response || null;
            setPayload(response);

            const first = response?.designs?.[0];
            setExpandedKey(first ? designKey(first) : null);
        } catch (error: any) {
            AppAlert.alert(
                'Real Costing Error',
                error?.response?.data?.message || error?.message || 'Unable to load real costing chain'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [params.prpcode, params.yearno, params.from_date, params.to_date]);

    useEffect(() => {
        load();
    }, [load]);

    const designs = useMemo(() => payload?.designs || [], [payload?.designs]);

    const toggle = (key: string) => {
        LayoutAnimation.configureNext({
            duration: 220,
            create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
            update: { type: LayoutAnimation.Types.easeInEaseOut },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        setExpandedKey(prev => prev === key ? null : key);
    };

    return (
        <SafeAreaView style={page.safe} edges={['top']}>
            <Header onRefresh={() => { setRefreshing(true); load(); }} />

            {loading ? (
                <View style={page.loader}>
                    <ActivityIndicator color={C.copper} />
                    <Text style={page.loaderText}>Loading real costing chain…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={page.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={C.copper}
                        />
                    }
                >
                    <Text style={page.back}>‹ Reports</Text>
                    <Text style={page.title}>Real costing chain</Text>
                    <Text style={page.subtitle}>
                        Top-down: month total → design → beam. Assumed costing shown against actual gathered live.
                    </Text>

                    <SummaryCard summary={payload?.summary} context={payload?.context} />

                    <Text style={page.sectionTitle}>DESIGN-WISE REAL COSTING</Text>

                    {designs.map((d) => {
                        const key = designKey(d);
                        return (
                            <DesignCard
                                key={key}
                                design={d}
                                expanded={expandedKey === key}
                                onPress={() => toggle(key)}
                            />
                        );
                    })}

                    {!designs.length && (
                        <View style={page.emptyCard}>
                            <Text style={page.emptyText}>No design costing found for this filter.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const page = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    content: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 40,
    },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loaderText: { marginTop: 10, fontSize: 12, color: C.muted },
    back: {
        fontSize: 12,
        lineHeight: 18,
        color: C.copper,
        fontWeight: '800',
        marginTop: 2,
    },
    title: {
        fontSize: 24,
        lineHeight: 34,
        fontWeight: '900',
        color: C.ink,
        letterSpacing: -0.7,
        marginTop: 4,
    },
    subtitle: {
        fontSize: 10,
        lineHeight: 20,
        color: C.text,
        opacity: 0.82,
        marginTop: 5,
        marginBottom: 2,
    },
    sectionTitle: {
        fontSize: 11,
        lineHeight: 16,
        color: C.ink,
        fontWeight: '900',
        letterSpacing: 1.1,
        marginTop: 17,
        marginBottom: 9,
    },
    emptyCard: {
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        padding: 22,
        alignItems: 'center',
    },
    emptyText: { fontSize: 13, color: C.muted },
});

const header = StyleSheet.create({
    wrap: {
        backgroundColor: C.nav,
        paddingHorizontal: 16,
        paddingTop: 13,
        paddingBottom: 15,
    },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: {
        color: 'rgba(255,255,255,0.52)',
        fontSize: 8.5,
        lineHeight: 11,
        fontWeight: '900',
        letterSpacing: 1.45,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 22,
        fontWeight: '900',
        marginTop: 3,
    },
    path: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 9.5,
        lineHeight: 13,
        fontWeight: '700',
        marginTop: 2,
    },
    pathSub: {
        color: 'rgba(255,255,255,0.52)',
        fontSize: 8.5,
        lineHeight: 12,
        marginTop: 1,
    },
    refresh: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    refreshText: { color: '#fff', fontSize: 22, fontWeight: '800' },
});

const summaryStyles = StyleSheet.create({
    outer: {
        marginTop: 14,
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.045,
        shadowRadius: 10,
        elevation: 1,
    },
    accent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: C.copper,
    },
    inner: {
        padding: 15,
        paddingLeft: 16,
    },
    kicker: {
        color: C.muted,
        fontSize: 8.8,
        lineHeight: 12,
        fontWeight: '900',
        letterSpacing: 0.95,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    metricRow: { flexDirection: 'row', gap: 8, marginBottom: 11 },
    metricBox: {
        flex: 1,
        backgroundColor: C.soft,
        borderRadius: 11,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricValue: {
        color: C.ink,
        fontSize: 15.5,
        lineHeight: 20,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    metricLabel: {
        color: C.muted,
        fontSize: 7.5,
        lineHeight: 10,
        fontWeight: '900',
        letterSpacing: 0.65,
        marginTop: 3,
    },
    compareBlock: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    compareLabel: {
        color: C.muted,
        fontSize: 8.5,
        lineHeight: 11,
        fontWeight: '900',
        letterSpacing: 0.45,
        textTransform: 'uppercase',
    },
    compareValue: {
        color: C.ink,
        fontSize: 14.5,
        lineHeight: 20,
        fontWeight: '900',
        letterSpacing: -0.35,
        marginTop: 4,
    },
    compareDelta: {
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: '900',
        marginLeft: 8,
    },
    divider: { height: 1, backgroundColor: C.borderSoft, marginVertical: 2 },
});

const card = StyleSheet.create({
    card: {
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 9,
        elevation: 1,
    },
    cardExpanded: {
        shadowOpacity: 0.055,
        elevation: 2,
    },
    header: {
        minHeight: 76,
        paddingHorizontal: 18,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameCol: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
    },
    designName: {
        color: C.ink,
        fontSize: 16,
        lineHeight: 23,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    status: {
        color: C.text,
        fontSize: 12,
        lineHeight: 18,
        marginTop: 3,
    },
    priceCol: {
        alignItems: 'flex-end',
        marginLeft: 8,
        minWidth: 94,
    },
    price: {
        color: C.copper,
        fontSize: 16.5,
        lineHeight: 23,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    per: {
        color: C.ink,
        fontSize: 10,
        fontWeight: '900',
    },
    deltaText: {
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: '900',
        marginTop: 3,
    },
    chevron: {
        color: C.ink,
        fontSize: 18,
        lineHeight: 20,
        fontWeight: '900',
        marginLeft: 12,
        opacity: 0.82,
    },
});

const expandedStyles = StyleSheet.create({
    wrap: {
        borderTopWidth: 1,
        borderTopColor: C.borderSoft,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 16,
    },
    tableHead: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingBottom: 11,
    },
    th: {
        flex: 1,
        color: C.ink,
        fontSize: 9.5,
        lineHeight: 11,
        fontWeight: '900',
        letterSpacing: 0.35,
        textAlign: 'right',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5.1,
    },
    label: {
        color: C.ink,
        fontSize: 12.5,
        lineHeight: 18,
        fontWeight: '800',
    },
    cell: {
        flex: 1,
        color: C.text,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '800',
        textAlign: 'right',
    },
    actualCell: {
        flex: 1,
        color: C.ink,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '900',
        textAlign: 'right',
    },
    deltaCell: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '900',
        textAlign: 'right',
    },
    finalDivider: {
        height: 1,
        backgroundColor: C.borderSoft,
        marginTop: 8,
        marginBottom: 6,
    },
    finalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    finalLabel: {
        color: C.copperDark,
        fontSize: 12.5,
        lineHeight: 18,
        fontWeight: '900',
    },
    finalCell: {
        flex: 1,
        color: C.ink,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '900',
        textAlign: 'right',
    },
    finalActual: {
        flex: 1,
        color: C.copperDark,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '900',
        textAlign: 'right',
    },
    finalDelta: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '900',
        textAlign: 'right',
    },
    note: {
        color: C.muted,
        fontSize: 9,
        lineHeight: 13,
        marginTop: 6,
    },
});

const beam = StyleSheet.create({
    wrap: {
        marginTop: 13,
        backgroundColor: C.soft2,
        borderRadius: 12,
        padding: 11,
        borderWidth: 1,
        borderColor: C.borderSoft,
    },
    title: {
        color: C.ink,
        fontSize: 9.5,
        lineHeight: 13,
        fontWeight: '900',
        letterSpacing: 0.75,
        marginBottom: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 10,
    },
    col: { width: '33.33%' },
    label: {
        color: C.ink,
        fontSize: 8.5,
        lineHeight: 11,
        fontWeight: '900',
    },
    value: {
        color: C.ink,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '800',
        marginTop: 3,
    },
    note: {
        color: C.muted,
        fontSize: 8.8,
        lineHeight: 12,
        marginTop: 9,
    },
});
