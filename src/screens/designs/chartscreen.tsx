// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/chartscreen.tsx
// ERP-theme version. Same API as before.
// Web fixes: visible scrollbar + drag-to-scroll + hover/tap tooltip on points.
//  1) IN-SCREEN (Yarns tab in DesignsScreen):
//       <ChartScreen item={...} d1Item={...} token={...} onBack={() => ...} />
//  2) ROUTE (Purchase Order screen):
//       router.push({ pathname: '/chartscreen', params: { item, d1Item, token } })
// ═══════════════════════════════════════════════════════════════
import { API } from '@/common/API/dynamicAPI';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Btn, EmptyState, Sheet } from '@/src/components/erpUi';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import client from '../../../common/API/client_fix_design';
import { T } from '../../theme';

// ───────────── helpers ─────────────
const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// ERP response dates: "2026-06-10" (new) or "10-Jun-2026" (legacy).
const parseDate = (input: string): Date | null => {
    const raw = String(input || '').trim();
    let year: number, month: number, day: number;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const legacy = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw);
    if (iso) {
        year = Number(iso[1]); month = Number(iso[2]) - 1; day = Number(iso[3]);
    } else if (legacy && MONTHS[legacy[2]] !== undefined) {
        year = Number(legacy[3]); month = MONTHS[legacy[2]]; day = Number(legacy[1]);
    } else {
        return null;
    }
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
        ? date : null;
};
const formatShort = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const formatFull = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtINR = (n: number) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const readParam = (v: any) => (Array.isArray(v) ? v[0] : v);
const safeJson = (v: any) => {
    try {
        const raw = readParam(v);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};
const readField = (obj: any, ...keys: string[]): string => {
    for (const key of keys) {
        const value = obj?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
};

type LegacyPoint = { label: string; value: number | string };
type Purchase = {
    id: string;
    date: string;
    label: string;
    value: number;
    prpcode: string;
    yearno: string;
    uid: string;
    parcode: string;
    party_name: string;
};
type SupplierSeries = { key: string; name: string; color: string; points: Purchase[] };

const COLORS = [
    '#C67531', '#385987', '#5E8563', '#835A9B', '#AD5550', '#31908D',
    '#A17C34', '#6A6DAD', '#4E819A', '#A76080', '#818B39', '#736353',
];
const colorAt = (index: number) => COLORS[index] || `hsl(${Math.round(index * 137.508) % 360}, 62%, 43%)`;
const AXIS_W = 64;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 216;
const PLOT_H = 265;
const EVENT_STEP = 48;
const X_START = 27;

// Shape-preserving monotone cubic interpolation in SVG screen coordinates.
// - Every original purchase stays on the curve at its exact (x, y).
// - Flat price runs remain flat, and peaks/valleys do not overshoot.
// - A single purchase has no connecting line; two purchases form a line.
// - Distinct transactions (including same-day purchases) keep their own slots.
// No extra transaction points are generated, and the chart's axis/selection
// coordinate system remains unchanged.
type TrendXY = { x: number; y: number };
const buildSmoothPricePath = (ordered: TrendXY[]): string => {
    if (ordered.length < 2) return '';
    const pts = ordered.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 2) return '';

    const path: string[] = [`M ${pts[0].x} ${pts[0].y}`];
    if (pts.length === 2) {
        // Two samples cannot determine a meaningful curve; connect exactly.
        return `${path[0]} L ${pts[1].x} ${pts[1].y}`;
    }

    // The timeline is in ascending x order, with a unique slot per purchase.
    // Handle a malformed duplicate-x gracefully rather than dividing by zero.
    const h: number[] = [];
    const secants: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        if (!(dx > 0)) {
            // This path is only used if input order is invalid; no interpolation
            // can be guaranteed without strictly increasing x coordinates.
            return pts.map((p, j) => `${j ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
        }
        h.push(dx);
        secants.push((pts[i + 1].y - pts[i].y) / dx);
    }

    // PCHIP (Fritsch-Carlson) tangents avoid inventing price extrema.
    // Geometry is computed in screen pixels, not in purchase-rate units.
    const endpoint = (h0: number, h1: number, s0: number, s1: number) => {
        let m = ((2 * h0 + h1) * s0 - h0 * s1) / (h0 + h1);
        if (m * s0 <= 0) return 0;
        if (s0 * s1 < 0 && Math.abs(m) > Math.abs(3 * s0)) m = 3 * s0;
        return m;
    };
    const tangent: number[] = new Array(pts.length).fill(0);
    tangent[0] = endpoint(h[0], h[1], secants[0], secants[1]);
    const last = pts.length - 1;
    tangent[last] = endpoint(h[last - 1], h[last - 2], secants[last - 1], secants[last - 2]);
    for (let i = 1; i < last; i++) {
        const s0 = secants[i - 1];
        const s1 = secants[i];
        // Plateau, reversal, and a genuine local extremum must be horizontal.
        if (s0 === 0 || s1 === 0 || s0 * s1 <= 0) continue;
        const w0 = 2 * h[i] + h[i - 1];
        const w1 = h[i] + 2 * h[i - 1];
        tangent[i] = (w0 + w1) / (w0 / s0 + w1 / s1);
    }

    for (let i = 0; i < last; i++) {
        const dt = h[i] / 3;
        path.push(
            `C ${pts[i].x + dt} ${pts[i].y + tangent[i] * dt} ` +
            `${pts[i + 1].x - dt} ${pts[i + 1].y - tangent[i + 1] * dt} ` +
            `${pts[i + 1].x} ${pts[i + 1].y}`,
        );
    }
    return path.join(' ');
};

const Skeleton = () => (
    <View style={st.card}>
        <View style={[st.skel, { height: 14, width: '40%', marginBottom: 12 }]} />
        <View style={[st.skel, { height: 250 }]} />
    </View>
);

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={st.stat}>
            <Text style={st.statLabel}>{label}</Text>
            <Text style={[st.statValue, color ? { color } : null]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

// One transaction occupies one timeline slot, even when date/rate are identical.
// Each supplier joins ONLY its own purchase points, with no fabricated zeros.
function TrendChart({
    data,
    title,
    windowWidth,
    mode,
    isLegacy,
    emptyReason,
}: {
    data: Purchase[];
    title?: string;
    windowWidth: number;
    mode: 'item' | 'party';
    isLegacy: boolean;
    emptyReason?: string;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [cardWidth, setCardWidth] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const pointPick = useRef<(index: number) => void>(() => {});
    const dragMeta = useRef({ n: 0 });

    const points = useMemo(() => data
        .filter(p => Number.isFinite(Number(p.value)) && parseDate(p.date || p.label) !== null)
        .map(p => ({ ...p, value: Number(p.value) }))
        .sort((a, b) => (a.date || a.label).localeCompare(b.date || b.label)
            || a.prpcode.localeCompare(b.prpcode)
            || a.uid.localeCompare(b.uid)
            || a.id.localeCompare(b.id)), [data]);

    const bySupplier = useMemo<SupplierSeries[]>(() => {
        if (mode === 'item') {
            return [{ key: 'item', name: 'All purchase rates', color: T.copper, points }];
        }
        const map = new Map<string, { name: string; points: Purchase[] }>();
        const manyProperties = new Set(points.map(p => p.prpcode)).size > 1;
        points.forEach(p => {
            const key = `${p.prpcode}:${p.parcode}`;
            if (!map.has(key)) {
                const name = p.party_name || (p.parcode ? `Supplier ${p.parcode}` : 'Unspecified supplier');
                map.set(key, { name: manyProperties && p.prpcode ? `${name} (${p.prpcode})` : name, points: [] });
            }
            map.get(key)!.points.push(p);
        });
        return Array.from(map.entries())
            .sort((a, b) => a[1].name.localeCompare(b[1].name) || a[0].localeCompare(b[0]))
            .map(([key, group], index) => ({ key, name: group.name, points: group.points, color: colorAt(index) }));
    }, [points, mode]);

    useEffect(() => { setSelectedId(null); scrollRef.current?.scrollTo({ x: 0, animated: false }); }, [data, mode]);

    const actualWidth = cardWidth > 0 ? cardWidth : Math.min(windowWidth - 24, 1120);
    const viewport = Math.max(180, actualWidth - 28 - AXIS_W);
    const plotWidth = Math.max(viewport, 2 * X_START + Math.max(0, points.length - 1) * EVENT_STEP);
    const allValues = points.map(p => p.value);
    const latest = points.length ? points[points.length - 1].value : 0;
    const minRate = points.length ? Math.min(...allValues) : 0;
    const maxRate = points.length ? Math.max(...allValues) : 0;
    const average = points.length ? allValues.reduce((sum, value) => sum + value, 0) / points.length : 0;
    const spread = maxRate - minRate;
    const buffer = spread > 0 ? spread * 0.12 : Math.max(1, Math.abs(maxRate) * 0.05);
    const low = minRate - buffer;
    const high = maxRate + buffer;
    const xOf = (i: number) => X_START + i * EVENT_STEP;
    const yOf = (v: number) => PLOT_BOTTOM - (v - low) / (high - low) * (PLOT_BOTTOM - PLOT_TOP);
    const yTicks = Array.from({ length: 5 }, (_, i) => high - (high - low) * i / 4);
    const pointIndices = useMemo(() => {
        const lookup = new Map<string, number>();
        points.forEach((p, index) => lookup.set(p.id, index));
        return lookup;
    }, [points]);
    const selected = selectedId ? (points.find(p => p.id === selectedId) || null) : null;
    dragMeta.current = { n: points.length };
    pointPick.current = (index: number) => {
        if (index >= 0 && index < points.length) setSelectedId(points[index].id);
    };

    // Desktop: drag horizontally, or simply move the pointer to inspect a
    // transaction. The fixed rate axis is separate from the scrollable plot.
    useEffect(() => {
        if (Platform.OS !== 'web' || !points.length) return;
        const node: any = (scrollRef.current as any)?.getScrollableNode?.();
        if (!node?.addEventListener) return;
        let down = false;
        let moved = false;
        let downX = 0;
        let left = 0;
        node.style.cursor = 'grab';
        const downHandler = (e: MouseEvent) => {
            if (e.button !== 0) return;
            down = true; moved = false; downX = e.pageX; left = node.scrollLeft;
            node.style.cursor = 'grabbing';
        };
        const moveHandler = (e: MouseEvent) => {
            if (down) {
                const dx = e.pageX - downX;
                if (Math.abs(dx) > 3) moved = true;
                if (moved) node.scrollLeft = left - dx;
                return;
            }
            const rect = node.getBoundingClientRect();
            const x = e.clientX - rect.left + node.scrollLeft;
            const index = Math.round((x - X_START) / EVENT_STEP);
            if (index >= 0 && index < dragMeta.current.n) pointPick.current(index);
        };
        const upHandler = () => { down = false; node.style.cursor = 'grab'; };
        node.addEventListener('mousedown', downHandler);
        node.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
        node.addEventListener('mouseleave', upHandler);
        return () => {
            node.removeEventListener('mousedown', downHandler);
            node.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            node.removeEventListener('mouseleave', upHandler);
        };
    }, [points.length, mode]);

    if (!points.length) {
        return (
            <View style={st.card}>
                <EmptyState icon="show-chart" title="No purchase rates found"
                    text={emptyReason || 'No matching purchase rates were returned for this item and date range.'} />
            </View>
        );
    }

    const axisLabelsStep = points.length <= 8 ? 1 : 3;

    return (
        <View style={st.card} onLayout={e => setCardWidth(e.nativeEvent.layout.width)}>
            <View style={st.trendHeader}>
                <Icon name="show-chart" size={19} color="#fff" />
                <Text style={st.trendHeaderText}>PRICE TREND</Text>
                <Text style={st.trendCount}>{points.length} rates</Text>
            </View>
            {!!title && <Text style={st.chartTitle}>{title}</Text>}
            <View style={st.statRow}>
                <Stat label="Latest" value={`₹${fmtINR(latest)}`} color={T.copper} />
                <Stat label="Lowest" value={`₹${fmtINR(minRate)}`} color={T.green} />
                <Stat label="Highest" value={`₹${fmtINR(maxRate)}`} color={T.red} />
                <Stat label="Average" value={`₹${fmtINR(average)}`} />
            </View>

            <View style={st.pointBox}>
                {selected ? (
                    <>
                        <Text style={st.pointLabel} numberOfLines={1}>
                            {selected.party_name || 'Supplier'} · {formatFull(parseDate(selected.date || selected.label)!)}
                        </Text>
                        <Text style={st.pointValue}>₹{fmtINR(selected.value)}</Text>
                        <Text style={st.pointReference} numberOfLines={1}>
                            {selected.uid ? `Purchase UID ${selected.uid}` : 'Purchase entry'}
                            {selected.prpcode ? ` · ${selected.prpcode}` : ''}
                        </Text>
                    </>
                ) : (
                    <Text style={st.pointHint}>
                        {Platform.OS === 'web' ? 'Hover over the graph or click a point for its rate' : 'Tap a point to see its rate and supplier'}
                    </Text>
                )}
            </View>

            <View style={st.chartBody}>
                <Svg width={AXIS_W} height={PLOT_H}>
                    {yTicks.map((tick, i) => (
                        <SvgText key={`y-${i}`} x={AXIS_W - 7} y={yOf(tick) + 4}
                            fontSize={11.5} fill={T.muted} textAnchor="end">
                            {`₹${fmtINR(tick)}`}
                        </SvgText>
                    ))}
                </Svg>
                <View style={st.chartPlot}>
                    <ScrollView ref={scrollRef} horizontal nestedScrollEnabled
                        showsHorizontalScrollIndicator={Platform.OS === 'web'}
                        contentContainerStyle={{ minWidth: viewport }}
                        scrollEventThrottle={16}>
                        <Svg width={plotWidth} height={PLOT_H}>
                            {yTicks.map((tick, i) => (
                                <Line key={`grid-${i}`} x1={0} x2={plotWidth} y1={yOf(tick)} y2={yOf(tick)}
                                    stroke={T.border} strokeWidth={1} strokeDasharray="4 6" />
                            ))}
                            {selected && pointIndices.has(selected.id) && (
                                <Line x1={xOf(pointIndices.get(selected.id)!)} x2={xOf(pointIndices.get(selected.id)!)}
                                    y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke={T.muted}
                                    strokeOpacity={0.45} strokeDasharray="3 5" />
                            )}
                            {bySupplier.map(group => {
                                const ordered = group.points.map(p => ({ p, i: pointIndices.get(p.id) ?? -1 }))
                                    .filter(q => q.i >= 0);
                                // Smooth only the visual path; the markers, transaction count,
                                // interaction targets, and prices still use the actual purchases.
                                const d = buildSmoothPricePath(ordered.map(q => ({
                                    x: xOf(q.i), y: yOf(q.p.value),
                                })));
                                return d ? <Path key={group.key} d={d} stroke={group.color} fill="none"
                                    strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /> : null;
                            })}
                            {points.map((p, i) => {
                                const group = mode === 'item' ? bySupplier[0] : bySupplier.find(g => g.key === `${p.prpcode}:${p.parcode}`);
                                const color = group?.color || T.copper;
                                const isSelected = selectedId === p.id;
                                return (
                                    <G key={p.id}>
                                        <Circle cx={xOf(i)} cy={yOf(p.value)} r={isSelected ? 5.7 : 4}
                                            fill={color} stroke="#fff" strokeWidth={isSelected ? 2.2 : 1.4} />
                                        <Circle cx={xOf(i)} cy={yOf(p.value)} r={14} fill="transparent"
                                            onPress={() => setSelectedId(p.id)} />
                                    </G>
                                );
                            })}
                            {points.map((p, i) => {
                                if (i % axisLabelsStep !== 0) return null;
                                const dt = parseDate(p.date || p.label);
                                if (!dt) return null;
                                return <SvgText key={`x-${p.id}`} x={xOf(i)} y={PLOT_BOTTOM + 23}
                                    textAnchor="middle" fontSize={11.5} fill={T.muted}>
                                    {formatShort(dt)}
                                </SvgText>;
                            })}
                        </Svg>
                    </ScrollView>
                </View>
            </View>

            <View style={st.legendRow}>
                {bySupplier.map(group => (
                    <View key={group.key} style={st.legendItem}>
                        <View style={[st.legendDot, { backgroundColor: group.color }]} />
                        <Text style={st.legendText} numberOfLines={2}>
                            {group.name} <Text style={st.legendCount}>· {group.points.length}</Text>
                        </Text>
                    </View>
                ))}
            </View>
            <Text style={st.chartFooter}>
                {isLegacy && mode === 'party'
                    ? 'Supplier comparison requires the updated purchase history API.'
                    : `${points.length} individual purchase entries · Scroll horizontally to see all rates`}
            </Text>
        </View>
    );
}

// ───────────── screen ─────────────
type ChartScreenProps = {
    token?: string;
    item?: any;
    d1Item?: any;
    onBack?: () => void;   // given when opened inside DesignsScreen (in-screen mode)
};

const ChartScreen = ({ token: tokenProp, item: itemProp, d1Item: d1ItemProp, onBack }: ChartScreenProps) => {
    const embedded = typeof onBack === 'function';
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const item = useMemo(() => itemProp ?? safeJson(params?.item), [itemProp, params?.item]);
    const d1Item = useMemo(() => d1ItemProp ?? safeJson(params?.d1Item), [d1ItemProp, params?.d1Item]);
    const propToken = String(tokenProp || readParam(params?.token) || '');

    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [tab, setTab] = useState<'item' | 'party'>('item');

    // filter
    const [filterVisible, setFilterVisible] = useState(false);
    const [tempFrom, setTempFrom] = useState<Date | null>(null);
    const [tempTo, setTempTo] = useState<Date | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [showFrom, setShowFrom] = useState(false);
    const [showTo, setShowTo] = useState(false);
    const [activeQuick, setActiveQuick] = useState<number | null>(null);

    // ── Data loading ─────────────────────────────────────────────
    // 1) Primary: the app's shared `client` (auth header added by the client).
    // 2) Fallback (only if client route is 404/401/unreachable): legacy fetch
    //    with a token resolved at call time (props → params → storage keys).
    const reqId = useRef(0);

    const resolveToken = useCallback(async () => {
        if (propToken) return propToken;
        const keys = ['token', 'userToken', 'access_token', 'authToken', 'auth_token', 'accessToken', 'user_token'];
        for (const k of keys) {
            const v = await AsyncStorage.getItem(k);
            if (v) return String(v).replace(/^"|"$/g, '');
        }
        return '';
    }, [propToken]);

    const fetchData = useCallback(async () => {
        if (!item || !d1Item) {
            setErrorText('Item details are missing for this chart.');
            setChartData(null);
            return;
        }
        const myReq = ++reqId.current;
        setLoading(true);
        setErrorText('');
        try {
            const type = await AsyncStorage.getItem('user_prptype');
            // Read exact ERP codes from the selected transaction/detail; do not
            // substitute fixed property, year, or store defaults.
            const body = {
                prptype: String(type || '').trim(),
                yearno: readField(item, 'yearno', 'YearNo', 'yearNo') || readField(d1Item, 'yearno', 'YearNo'),
                prpcode: readField(item, 'PrpCode', 'prpcode') || readField(d1Item, 'PrpCode', 'prpcode'),
                uid: readField(item, 'UId', 'uid'),
                strcode: readField(d1Item, 'StrCode', 'strcode') || readField(item, 'StrCode', 'strcode'),
                itmcode: readField(d1Item, 'ItmCode', 'itmcode'),
                parcode: readField(item, 'ParCode', 'parcode'),
            };
            if (!body.yearno || !body.itmcode || !body.strcode || (!body.prpcode && !body.prptype)) {
                throw new Error('Selected item is missing its ERP property/year/store/item code.');
            }

            let result: any;
            try {
                const res = await client.post('/purchase_order_chart', body);
                result = res?.data;
            } catch (e: any) {
                const status = e?.response?.status;
                if (status && status !== 404 && status !== 401) throw e;
                const token = await resolveToken();
                if (!token) throw new Error('NO_TOKEN');
                const res = await fetch(`${API}/api/purchase_order_chart`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                result = await res.json();
                if (!res.ok) throw new Error(String(result?.message || `Purchase chart HTTP ${res.status}`));
            }

            if (myReq !== reqId.current) return;
            if (result?.success) {
                const payload = result?.response || {};
                setChartData({
                    itemwisedata: Array.isArray(payload.itemwisedata) ? payload.itemwisedata : [],
                    partywisedata: Array.isArray(payload.partywisedata) ? payload.partywisedata : [],
                    purchases: Array.isArray(payload.purchases) ? payload.purchases : null,
                    itemdetail: payload.itemdetail || '',
                    party_detail: payload.party_detail || '',
                    meta: payload.meta || {},
                });
            } else {
                setChartData(null);
                setErrorText(String(result?.message || 'Purchase chart request failed.'));
            }
        } catch (e: any) {
            if (myReq !== reqId.current) return;
            setChartData(null);
            setErrorText(
                e?.message === 'NO_TOKEN' ? 'Login token missing. Please sign in again.' :
                String(e?.response?.data?.message || e?.message || 'Unable to load purchase chart.'),
            );
        } finally {
            if (myReq === reqId.current) setLoading(false);
        }
    }, [item, d1Item, resolveToken]);

    useEffect(() => {
        void fetchData();
        return () => { reqId.current += 1; };   // ignore late responses after unmount/back
    }, [fetchData]);

    // quick ranges
    const applyQuick = (days: number) => {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - days);
        setTempFrom(past);
        setTempTo(today);
        setActiveQuick(days);
    };

    const filterData = useCallback((arr: Purchase[]) => {
        const from = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()) : null;
        const to = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59) : null;
        return arr.filter(p => {
            const dt = parseDate(p.date || p.label);
            return dt !== null && (!from || dt >= from) && (!to || dt <= to);
        });
    }, [fromDate, toDate]);

    const isLegacy = chartData?.purchases == null;
    const purchases = useMemo<Purchase[]>(() => {
        if (!chartData) return [];
        if (Array.isArray(chartData.purchases)) {
            return chartData.purchases.map((p: any, index: number) => ({
                id: String(p.id ?? `entry-${index}`),
                date: String(p.date || p.label || ''),
                label: String(p.label || p.date || ''),
                value: Number(p.value),
                prpcode: String(p.prpcode || ''),
                yearno: String(p.yearno || ''),
                uid: String(p.uid || ''),
                parcode: String(p.parcode || ''),
                party_name: String(p.party_name || ''),
            }));
        }
        // Compatible with older servers. The legacy response cannot provide
        // multi-supplier lines; it is never falsely presented as supplier data.
        const legacy = tab === 'party' ? chartData.partywisedata : chartData.itemwisedata;
        return (Array.isArray(legacy) ? legacy : []).map((p: LegacyPoint, i: number) => ({
            id: `legacy-${i}`, date: p.label, label: p.label, value: Number(p.value),
            prpcode: '', yearno: '', uid: '', parcode: '',
            party_name: tab === 'party' ? (chartData.party_detail || 'Selected supplier') : 'Supplier information unavailable',
        }));
    }, [chartData, tab]);
    const filteredPurchases = useMemo(() => filterData(purchases), [filterData, purchases]);
    const filterActive = !!(fromDate || toDate);

    const resetFilter = () => {
        setTempFrom(null);
        setTempTo(null);
        setFromDate(null);
        setToDate(null);
        setActiveQuick(null);
        setFilterVisible(false);
    };
    const applyFilter = () => {
        setFromDate(tempFrom);
        setToDate(tempTo);
        setFilterVisible(false);
    };

    return (
        <View style={st.root}>
            {/* HEADER */}
            <View style={[st.header, { paddingTop: embedded ? 10 : insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => (embedded ? onBack?.() : router.back())}
                    style={st.hBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <Icon name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.hEyebrow}>PURCHASE ANALYSIS</Text>
                    <Text style={st.hTitle} numberOfLines={1}>
                        {d1Item?.ItmName || 'Rate chart'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setTempFrom(fromDate);
                        setTempTo(toDate);
                        setFilterVisible(true);
                    }}
                    style={st.hBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Filter by date"
                >
                    <Icon name="filter-list" size={24} color="#fff" />
                    {filterActive && <View style={st.hDot} />}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={st.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={st.column}>
                    {/* Item-level trend / supplier-level comparison */}
                    <View style={st.tabWrap}>
                        {([['item', 'Item Wise'], ['party', 'Party Wise']] as const).map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setTab(key)}
                                style={[st.tabBtn, tab === key && st.tabBtnActive]}
                            >
                                <Text style={[st.tabText, tab === key && st.tabTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* active filter chip */}
                    {filterActive && (
                        <View style={st.filterChip}>
                            <Icon name="event" size={14} color={T.copper} />
                            <Text style={st.filterChipText} numberOfLines={1}>
                                {fromDate ? formatFull(fromDate) : 'Start'} →{' '}
                                {toDate ? formatFull(toDate) : 'Today'}
                            </Text>
                            <TouchableOpacity onPress={resetFilter} hitSlop={8}>
                                <Icon name="close" size={16} color={T.muted} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {loading ? (
                        <Skeleton />
                    ) : errorText ? (
                        <View style={st.card}>
                            <EmptyState icon="error-outline" title="Purchase chart unavailable"
                                text={errorText} action={
                                    <Btn label="Retry" icon="refresh" compact onPress={fetchData} />
                                } />
                        </View>
                    ) : (
                        <TrendChart
                            data={filteredPurchases}
                            title={chartData?.itemdetail || d1Item?.ItmName}
                            windowWidth={width}
                            mode={tab}
                            isLegacy={isLegacy}
                            emptyReason={filterActive
                                ? 'No purchase entries in the selected date range.'
                                : chartData?.meta?.reason === 'selected_item_not_found'
                                    ? 'Selected item was not found in the property/store item master.'
                                    : 'No matching purchase records were returned. Verify the ERP store/item mapping and purchase history.'}
                        />
                    )}
                </View>
            </ScrollView>

            {/* FILTER SHEET */}
            <Sheet
                open={filterVisible}
                onClose={() => setFilterVisible(false)}
                eyebrow="FILTER"
                title="Date Range"
                wideMax={460}
                footer={
                    <>
                        <Btn
                            label="Reset"
                            icon="restart-alt"
                            kind="ghost"
                            onPress={resetFilter}
                            style={{ flex: 1 }}
                        />
                        <Btn
                            label="Apply"
                            icon="check"
                            onPress={applyFilter}
                            disabled={!tempFrom && !tempTo}
                            style={{ flex: 2 }}
                        />
                    </>
                }
            >
                <View style={st.quickRow}>
                    {[7, 30].map(d => (
                        <TouchableOpacity
                            key={d}
                            onPress={() => applyQuick(d)}
                            style={[st.quickBtn, activeQuick === d && st.quickBtnActive]}
                        >
                            <Text style={[st.quickText, activeQuick === d && st.quickTextActive]}>
                                {d} Days
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={st.fieldLabel}>FROM</Text>
                <TouchableOpacity style={st.dateBox} onPress={() => setShowFrom(true)}>
                    <Icon name="event" size={16} color={T.copper} />
                    <Text style={[st.dateText, !tempFrom && { color: T.muted }]}>
                        {tempFrom ? formatFull(tempFrom) : 'From Date'}
                    </Text>
                </TouchableOpacity>

                <Text style={st.fieldLabel}>TO</Text>
                <TouchableOpacity style={st.dateBox} onPress={() => setShowTo(true)}>
                    <Icon name="event" size={16} color={T.copper} />
                    <Text style={[st.dateText, !tempTo && { color: T.muted }]}>
                        {tempTo ? formatFull(tempTo) : 'To Date'}
                    </Text>
                </TouchableOpacity>

                {showFrom && (
                    <DateTimePicker
                        value={tempFrom || new Date()}
                        mode="date"
                        onChange={(_e, d) => {
                            setShowFrom(false);
                            if (d) {
                                setTempFrom(d);
                                setActiveQuick(null);
                            }
                        }}
                    />
                )}
                {showTo && (
                    <DateTimePicker
                        value={tempTo || new Date()}
                        mode="date"
                        onChange={(_e, d) => {
                            setShowTo(false);
                            if (d) {
                                setTempTo(d);
                                setActiveQuick(null);
                            }
                        }}
                    />
                )}
            </Sheet>
        </View>
    );
};

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    // header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.nav,
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    hBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    hDot: {
        position: 'absolute',
        top: 7,
        right: 7,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: T.copper,
        borderWidth: 1.5,
        borderColor: T.nav,
    },
    hEyebrow: { fontSize: 10, fontWeight: '800', color: '#ffffffAA', letterSpacing: 1.2 },
    hTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
    // body
    content: { padding: 12, paddingBottom: 40 },
    column: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 12 },
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
    },
    trendHeader: {
        backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
        marginBottom: 12,
    },
    trendHeaderText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.1, flex: 1 },
    trendCount: { color: '#fff', fontSize: 11, fontWeight: '700' },
    chartBody: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', minWidth: 0, marginTop: 8 },
    chartPlot: { flex: 1, minWidth: 0, overflow: 'hidden' },
    pointReference: { fontSize: 10, color: T.muted, marginTop: 2 },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
    legendDot: { width: 12, height: 4, borderRadius: 3 },
    legendText: { fontSize: 11.5, fontWeight: '700', color: T.ink, flexShrink: 1, maxWidth: 190 },
    legendCount: { fontSize: 10, color: T.muted, fontWeight: '500' },
    chartFooter: { fontSize: 10.5, color: T.muted, textAlign: 'right', marginTop: 12 },
    skel: { backgroundColor: T.sub, borderRadius: 10 },
    tabWrap: { flexDirection: 'row', backgroundColor: T.sub, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: T.border },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
    tabBtnActive: { backgroundColor: T.copper },
    tabText: { fontSize: 13, fontWeight: '700', color: T.muted },
    tabTextActive: { color: '#fff' },
    chartTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: T.ink,
        textAlign: 'center',
        marginBottom: 12,
    },
    statRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 10,
    },
    stat: { flexGrow: 1, flexBasis: '22%', minWidth: 74 },
    statLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
    statValue: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 3 },
    pointBox: { minHeight: 64, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
    pointLabel: { fontSize: 11, fontWeight: '600', color: T.muted },
    pointValue: { fontSize: 18, fontWeight: '800', color: T.copper },
    pointHint: { fontSize: 11, color: T.muted },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: T.copper + '14',
        borderWidth: 1,
        borderColor: T.copper + '55',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    filterChipText: { fontSize: 11.5, fontWeight: '700', color: T.ink },
    // filter sheet
    quickRow: { flexDirection: 'row', gap: 8 },
    quickBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.border,
    },
    quickBtnActive: { backgroundColor: T.copper, borderColor: T.copper },
    quickText: { fontSize: 13, fontWeight: '700', color: T.ink },
    quickTextActive: { color: '#fff' },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: T.muted,
        letterSpacing: 0.5,
        marginTop: 14,
        marginBottom: 6,
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dateText: { fontSize: 14, fontWeight: '600', color: T.ink },
});

export default ChartScreen;
