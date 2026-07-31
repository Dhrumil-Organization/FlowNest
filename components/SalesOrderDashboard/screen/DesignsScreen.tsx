// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/DesignsScreen.tsx
// ✅ FIXED — adds the 3 MISSING pieces from the web artifact:
//    1. GREIGE WIDTH field (auto = reed × (1 − warp shrink), or the
//       entry field when width basis = "Greige width")
//    2. "Sizing" toggle chip on each warp yarn row
//    3. LIVE SPEC panel — reed/total-ends card, LOOM→GREIGE→FINISHED
//       construction table, GSM/GLM grid, fibre blend bar, formula
//       basis, Rapier-loom warning
//    + corrected fabric math to match CostingEngine / web artifact:
//       EPI greige  = total ends ÷ greige width   (ends conserved)
//       EPI finished= total ends ÷ finished width
//       PPI greige  = PPI(loom) + 2               (table pick)
//       PPI finished= PPI greige ÷ (1 − finish shrink)
// ═══════════════════════════════════════════════════════════════
import client, { DesignAPI, ItemAPI, type Design, type GetItem, type YarnMaster } from '@/common/API/client';
import { T } from '@/common/utils/theme';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';

const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const f1 = (n: number) => n > 0 ? n.toFixed(1) : '—';

const TABS = ['Catalog', 'Design', 'Colourway', 'Yarns', 'Dyeing'] as const;
type Tab = typeof TABS[number];

const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
    return financialYear.toString().substring(2);
};

const DEFAULT_PRPCODE = 'SIP';
const DEFAULT_STRCODE = '002';
const DEFAULT_YEARNO = getCurrentFinancialYear();

type ERPContextValue = { prpcode: string; strcode: string; yearno: string };

const DEFAULT_ERP_CONTEXT: ERPContextValue = {
    prpcode: DEFAULT_PRPCODE,
    strcode: DEFAULT_STRCODE,
    yearno: DEFAULT_YEARNO,
};

const ERPContext = createContext<ERPContextValue>(DEFAULT_ERP_CONTEXT);

function useERP(): ERPContextValue {
    return useContext(ERPContext);
}

type DesignOptionShade = { color_name: string; hex: string; shade_no?: string };
type DesignOptions = { shades: DesignOptionShade[]; blend_options: string[] };

// ═══════════════════════════════════════════════════════════════
// SHARED FABRIC MATH — mirrors app/Services/CostingEngine.php
// ═══════════════════════════════════════════════════════════════

// grams of yarn per metre of yarn — matches YarnMaster::gpm()
const GPM = (sys: string, cnt: number): number => {
    if (!cnt || cnt <= 0) return 0;
    switch (sys) {
        case 'Lea': return 1.6535 / cnt;        // Linen
        case 'Ne': return 0.5905 / cnt;         // Cotton / blends
        case 'Den': return cnt / 9000;          // Filament
        case 'Dtx': return (cnt * 0.9) / 9000;  // Dtex
        default: return 0;
    }
};

export type FabricSpec = ReturnType<typeof calcSpec>;

function calcSpec(d: any) {
    const s = (Number(d.warp_shrink) || 0) / 100;   // warp take-up
    const gf = (Number(d.gf_shrink) || 0) / 100;    // greige→finish shrink
    const ws = (Number(d.weft_shrink) || 0) / 100;  // weft crimp / width-direction take-up
    const basis: 'reed' | 'greige' = d.width_basis === 'greige' ? 'greige' : 'reed';

    // reed ↔ greige width are interchangeable
    let reed = Number(d.reed_space) || 0;
    let widthGreige = Number(d.greige_width) || 0;
    if (basis === 'greige' && widthGreige > 0 && s < 1) {
        reed = widthGreige / (1 - s);
    } else {
        widthGreige = reed * (1 - s);
    }

    const warpYarns: any[] = d.warp_yarns ?? [];
    const weftYarns: any[] = d.weft_yarns ?? [];
    const epiLoom = warpYarns.reduce((t, y) => t + (Number(y.epi) || 0), 0);
    const ppiLoom = weftYarns.reduce((t, y) => t + (Number(y.ppi) || 0), 0);

    const totalEnds = epiLoom * reed;
    const ppiTable = ppiLoom > 0 ? ppiLoom + 2 : 0;          // "+2 picks on table"
    const pickFactor = ppiLoom > 0 ? ppiTable / ppiLoom : 1;
    const weftTakeupFactor = ws > 0 && ws < 1 ? 1 / (1 - ws) : 1;
    const wf = pickFactor * weftTakeupFactor;

    // ends are conserved loom → greige → finished
    const epiGreige = widthGreige > 0 ? totalEnds / widthGreige : 0;
    const finWidthIn = (Number(d.fin_width) || 0) > 0
        ? Number(d.fin_width)
        : (gf < 1 ? widthGreige * (1 - gf) : widthGreige);
    const epiFinished = finWidthIn > 0 ? totalEnds / finWidthIn : 0;
    // picks pack closer as length shrinks in finishing
    const ppiFinished = gf < 1 ? ppiTable / (1 - gf) : ppiTable;

    // ── GLM (per-yarn, same formulas as CostingEngine::compute) ──
    let warpGLM = 0;
    warpYarns.forEach((y) => {
        warpGLM += (Number(y.epi) || 0) * reed * GPM(y.sys, Number(y.cnt));
    });
    let weftGLM = 0;
    weftYarns.forEach((y) => {
        weftGLM += (Number(y.ppi) || 0) * wf * widthGreige * GPM(y.sys, Number(y.cnt));
    });
    const greigGLM = warpGLM + weftGLM;
    const widthGreigeM = widthGreige * 0.0254;
    const greigGSM = widthGreigeM > 0 ? greigGLM / widthGreigeM : 0;
    const finGLM = gf < 1 ? greigGLM / (1 - gf) : greigGLM;   // mass conserved
    const finWidthM = finWidthIn * 0.0254;
    const finGSM = finWidthM > 0 ? finGLM / finWidthM : 0;

    // ── fibre blend, weighted by grams contributed ─────────────
    const fibreOf = (sys: string) =>
        sys === 'Lea' ? 'Linen' : sys === 'Ne' ? 'Cotton'
            : (sys === 'Den' || sys === 'Dtx') ? 'Polyester' : 'Other';
    const blendTotals: Record<string, number> = {};
    warpYarns.forEach((y) => {
        const g = (Number(y.epi) || 0) * reed * GPM(y.sys, Number(y.cnt));
        if (g > 0) blendTotals[fibreOf(y.sys)] = (blendTotals[fibreOf(y.sys)] ?? 0) + g;
    });
    weftYarns.forEach((y) => {
        const g = (Number(y.ppi) || 0) * wf * widthGreige * GPM(y.sys, Number(y.cnt));
        if (g > 0) blendTotals[fibreOf(y.sys)] = (blendTotals[fibreOf(y.sys)] ?? 0) + g;
    });
    const blendGrand = Object.values(blendTotals).reduce((a, b) => a + b, 0);
    const hasNaturalFibre = warpYarns.concat(weftYarns).some(y => y.sys === 'Lea');

    return {
        basis, reed, widthGreige, finWidthIn,
        reedCount: Number(d.reed_count) || 0, weftShrink: ws * 100,
        epiLoom, ppiLoom, ppiTable, totalEnds,
        epiGreige, epiFinished, ppiFinished,
        warpGLM, weftGLM, greigGLM, greigGSM, finGLM, finGSM,
        blendTotals, blendGrand, hasNaturalFibre,
        finWidthEntered: (Number(d.fin_width) || 0) > 0,
    };
}

const BLEND_COLORS: Record<string, string> = {
    Linen: '#C8A96E', Cotton: '#A8C8A0', Polyester: '#A0B8C8', Other: '#C8A8B0',
};

// ── TabBar ────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    return (
        <View style={tb.bar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tb.inner}>
                {TABS.map(t => (
                    <TouchableOpacity key={t} onPress={() => onChange(t)}
                        style={[tb.tab, active === t && tb.tabActive]}>
                        <Text style={[tb.label, active === t && tb.labelActive]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
const tb = StyleSheet.create({
    bar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    inner: { paddingHorizontal: 12 },
    tab: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: T.copper },
    label: { fontSize: 13, fontWeight: '600', color: T.muted },
    labelActive: { color: T.ink, fontWeight: '700' },
});

// ── Swatch ────────────────────────────────────────────────────
function Swatch({ design, size = 44 }: { design: Design; size?: number }) {
    const isGreige = design.type === 'PD';
    return (
        <View style={{
            width: size, height: size, borderRadius: 8, overflow: 'hidden',
            backgroundColor: isGreige ? '#D4C5A9' : '#1B2A4A',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: T.border,
        }}>
            {isGreige && <Text style={{ fontSize: 8, color: '#888', fontWeight: '600' }}>GREIGE</Text>}
        </View>
    );
}

// ── TypeBadge ─────────────────────────────────────────────────
function TypeBadge({ type }: { type: 'YD' | 'PD' }) {
    const isYD = type === 'YD';
    return (
        <View style={{ backgroundColor: isYD ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: isYD ? T.yd : T.pd }}>{type}</Text>
        </View>
    );
}

// ── enrich ────────────────────────────────────────────────────
function enrich(d: Design): Design & { epi_total: number; ppi_total: number } {
    const epi = d.epi_total ?? (d.warp_yarns ?? []).reduce((s: number, y: any) => s + (Number(y.epi) || 0), 0);
    const ppi = d.ppi_total ?? (d.weft_yarns ?? []).reduce((s: number, y: any) => s + (Number(y.ppi) || 0), 0);
    return { ...d, epi_total: epi, ppi_total: ppi };
}

// ═══════════════════════════════════════════════════════════════
// ✅ NEW — LIVE SPEC PANEL (the whole MISSING right-hand panel)
// ═══════════════════════════════════════════════════════════════
function LiveSpecPanel({ design }: { design: any }) {
    const [showFormula, setShowFormula] = useState(false);
    const spec = useMemo(() => calcSpec(design), [design]);

    const hasConstruction = spec.epiLoom > 0 && spec.reed > 0;
    const hasWeight = spec.greigGLM > 0;
    if (!hasConstruction && !hasWeight) return null;

    return (
        <View style={ls.wrap}>
            <Text style={ls.title}>LIVE SPEC</Text>

            {/* ── dark reed / total ends card ── */}
            <View style={ls.darkCard}>
                <View style={{ flex: 1 }}>
                    <Text style={ls.darkLabel}>
                        {spec.basis === 'greige' ? 'GREIGE WIDTH · BASIS' : 'REED SPACE · BASIS'}
                    </Text>
                    <Text style={ls.darkVal}>
                        {spec.basis === 'greige' ? `${f1(spec.widthGreige)}"` : `${spec.reed}"`}
                    </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={ls.darkLabel}>TOTAL ENDS</Text>
                    <Text style={ls.darkVal}>
                        {spec.totalEnds > 0 ? Math.round(spec.totalEnds).toLocaleString('en-IN') : '—'}
                    </Text>
                </View>
            </View>

            <Text style={ls.loomLine}>
                ↑EPI {f1(spec.epiLoom)} × ↑PPI {f1(spec.ppiLoom)}  (on loom)
            </Text>

            {/* ── construction table LOOM / GREIGE / FINISHED ── */}
            <View style={ls.table}>
                <View style={[ls.tr, ls.trHead]}>
                    {['CONSTRUCTION', 'LOOM', 'GREIGE', 'FINISHED'].map((h, i) => (
                        <Text key={i} style={[ls.td, ls.tdHead, i === 0 && ls.tdLabel]}>{h}</Text>
                    ))}
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>EPI</Text>
                    <Text style={ls.td}>{f1(spec.epiLoom)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.epiGreige)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.epiFinished)}</Text>
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>PPI</Text>
                    <Text style={ls.td}>{f1(spec.ppiLoom)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.ppiTable)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.ppiFinished)}</Text>
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>Width"</Text>
                    <Text style={ls.td}>{f1(spec.reed)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.widthGreige)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.finWidthIn)}</Text>
                </View>
            </View>

            {/* ── GSM / GLM grid ── */}
            {hasWeight && (
                <View style={ls.gsmGrid}>
                    <View style={ls.gsmBox}>
                        <Text style={ls.gsmLabel}>Greige GSM</Text>
                        <Text style={ls.gsmVal}>{Math.round(spec.greigGSM)}</Text>
                    </View>
                    <View style={ls.gsmBox}>
                        <Text style={ls.gsmLabel}>Greige GLM</Text>
                        <Text style={ls.gsmVal}>{spec.greigGLM.toFixed(1)} g/m</Text>
                    </View>
                    <View style={[ls.gsmBox, ls.gsmBoxBorder]}>
                        <Text style={ls.gsmLabel}>Finished GSM</Text>
                        <Text style={ls.gsmVal}>{Math.round(spec.finGSM)}</Text>
                        {spec.finWidthEntered && <Text style={ls.gsmNote}>{spec.finWidthIn}" fin</Text>}
                    </View>
                    <View style={[ls.gsmBox, ls.gsmBoxBorder]}>
                        <Text style={ls.gsmLabel}>Finished GLM</Text>
                        <Text style={ls.gsmVal}>{spec.finGLM.toFixed(1)} g/m</Text>
                    </View>
                </View>
            )}

            {/* ── fibre blend bar ── */}
            {spec.blendGrand > 0 && (
                <View style={{ marginTop: 14 }}>
                    <Text style={ls.sec}>FIBRE BLEND</Text>
                    <View style={ls.blendBar}>
                        {Object.entries(spec.blendTotals).map(([k, v]) => (
                            <View key={k} style={{ flex: v / spec.blendGrand, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {Object.entries(spec.blendTotals).map(([k, v]) => (
                            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                <Text style={{ fontSize: 10, color: T.muted }}>
                                    {k} {Math.round(v / spec.blendGrand * 100)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── formula basis (expandable) ── */}
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setShowFormula(v => !v)}>
                <Text style={{ fontSize: 12, color: T.copper, fontWeight: '600' }}>
                    {showFormula ? '▾' : '▸'} Formula basis
                </Text>
            </TouchableOpacity>
            {showFormula && (
                <View style={ls.formulaBox}>
                    <Text style={ls.formulaTxt}>
                        Reed and greige width are interchangeable: greige width = reed × (1 − warp shrink).
                        Total ends = ΣEPI(loom) × reed. EPI greige = ΣEPI ÷ (1 − warp shrink),
                        PPI greige = ΣPPI + 2. Weft consumption includes weft crimp factor 1 ÷ (1 − weft shrink). Greige GSM = greige GLM ÷ width(m).
                        Finished GLM = greige GLM ÷ (1 − finish shrink); mass conserved.
                        Finished EPI = total ends ÷ finished width (ends conserved).
                        Finished PPI = PPI greige ÷ (1 − finish shrink) — picks pack closer as length shrinks.
                    </Text>
                </View>
            )}

            {/* ── natural fibre / Rapier warning ── */}
            {spec.hasNaturalFibre && (
                <View style={ls.warnBox}>
                    <Text style={ls.warnTxt}>
                        ⚠️ Contains natural fibre — this design is restricted to{' '}
                        <Text style={{ fontWeight: '800', color: T.copper }}>Rapier</Text> looms;
                        water-jet gating is blocked automatically.
                    </Text>
                </View>
            )}
        </View>
    );
}
const ls = StyleSheet.create({
    wrap: { marginTop: 24, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    title: { fontSize: 10, fontWeight: '800', color: T.ink, letterSpacing: 0.8, marginBottom: 10 },
    darkCard: { flexDirection: 'row', backgroundColor: T.nav, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
    darkLabel: { fontSize: 9, color: '#ffffffAA', fontWeight: '600', letterSpacing: 0.4 },
    darkVal: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
    loomLine: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, marginBottom: 6 },
    table: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    tr: { flexDirection: 'row', backgroundColor: T.surface },
    trHead: { backgroundColor: T.sub },
    td: { flex: 1, fontSize: 11, color: T.ink, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right' },
    tdHead: { fontSize: 9, fontWeight: '700', color: T.muted },
    tdLabel: { textAlign: 'left', fontWeight: '600', flex: 1.2 },
    tdGreige: { fontWeight: '700', color: T.ink },
    tdFin: { fontWeight: '700', color: T.copper },
    gsmGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: 8, overflow: 'hidden' },
    gsmBox: { width: '50%', backgroundColor: T.sub, padding: 10 },
    gsmBoxBorder: { borderTopWidth: 1, borderTopColor: T.border },
    gsmLabel: { fontSize: 9, color: T.muted, fontWeight: '600', letterSpacing: 0.3 },
    gsmVal: { fontSize: 16, fontWeight: '800', color: T.ink, marginTop: 2 },
    gsmNote: { fontSize: 9, color: T.muted },
    sec: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    blendBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    formulaBox: { backgroundColor: T.sub, borderRadius: 8, padding: 10, marginTop: 6 },
    formulaTxt: { fontSize: 10, color: T.muted, lineHeight: 15 },
    warnBox: { backgroundColor: '#FBF3E3', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#EAD9B0' },
    warnTxt: { fontSize: 11, color: '#7A5C1E', lineHeight: 16 },
});

// ═══════════════════════════════════════════════════════════════
// SHARED: Server Search Yarn Picker Modal
// Used by Warp / Weft / Selvedge. It does NOT depend on first 300 yarns.
// Every search uses DEFAULT_PRPCODE, DEFAULT_STRCODE and the current financial year
// ═══════════════════════════════════════════════════════════════
function YarnPickerModal({ visible, title = 'Select yarn', onSelect, onClose }: {
    visible: boolean;
    title?: string;
    onSelect: (y: YarnMaster) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [search, setSearch] = useState('');
    const [yarns, setYarns] = useState<YarnMaster[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadYarns = useCallback(async (q = '') => {
        if (!visible) return;
        setLoading(true);
        setError('');
        try {
            const res = await (DesignAPI.yarns as any)({
                yearno,
                prpcode,
                strcode,
                limit: 50,
                search: q.trim() || undefined,
            });
            setYarns(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (e: any) {
            setYarns([]);
            setError(e?.response?.data?.message || 'Unable to load yarns. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [visible, yearno, prpcode, strcode]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => loadYarns(search), search.trim() ? 350 : 0);
        return () => clearTimeout(timer);
    }, [visible, search, loadYarns]);

    const closePicker = useCallback(() => {
        onClose();
        setSearch('');
        setYarns([]);
        setError('');
    }, [onClose]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={closePicker}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={yp.title}>{title}</Text>
                            <Text style={yp.pickerHint}>One result per Main Yarn Code</Text>
                        </View>
                        <TouchableOpacity onPress={closePicker} style={yp.closeBtn}>
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch}
                            placeholder="Search name, code or count..." placeholderTextColor={T.muted}
                            style={yp.search} autoFocus autoCorrect={false} returnKeyType="search" />
                    </View>
                    {loading && <ActivityIndicator color={T.copper} style={{ paddingVertical: 12 }} />}
                    {!loading && !!error && (
                        <View style={yp.errorBox}>
                            <Text style={yp.errorText}>{error}</Text>
                            <TouchableOpacity onPress={() => loadYarns(search)} style={yp.retryButton}>
                                <Text style={yp.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <FlatList
                        data={yarns}
                        keyExtractor={(y) => String(y.main_yarn_code ?? y.m_itm_code ?? y.mi_id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item: y }) => {
                            const mainCode = String(y.main_yarn_code ?? y.m_itm_code ?? y.mi_id ?? '');
                            const itemCode = String(y.itm_code ?? y.mi_id ?? '');
                            const countText = Number(y.cnt) > 0 ? `${Number(y.cnt)} ${y.sys || ''}`.trim() : y.sys || 'Count unavailable';
                            return (
                                <TouchableOpacity style={yp.yarnRow} activeOpacity={0.7}
                                    onPress={() => { onSelect(y); closePicker(); }}>
                                    <View style={yp.codeBadge}>
                                        <Text style={yp.codeBadgeLabel}>MAIN CODE</Text>
                                        <Text style={yp.codeBadgeValue}>{mainCode}</Text>
                                    </View>
                                    <View style={yp.yarnContent}>
                                        <Text style={yp.yarnName} numberOfLines={2}>{y.name || y.itm_name || 'Unnamed yarn'}</Text>
                                        <Text style={yp.yarnSub}>{countText}{Number(y.price) > 0 ? ` · ₹${Number(y.price).toLocaleString('en-IN')}/kg` : ''}</Text>
                                        {!y.is_main_yarn_item && <Text style={yp.fallbackText}>ERP item {itemCode} · family representative</Text>}
                                    </View>
                                    <Text style={yp.selectArrow}>›</Text>
                                </TouchableOpacity>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={yp.separator} />}
                        ListEmptyComponent={!loading && !error ? (
                            <Text style={yp.emptyText}>{search.trim() ? 'No matching Main Yarn Codes found' : 'Type to search, or select from the first 50 Main Yarn Codes'}</Text>
                        ) : null}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </View>
            </View>
        </Modal>
    );
}

function CategoryPickerModal({ visible, onSelect, onClose, }: {
    visible: boolean;
    onSelect: (value: GetItem) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [search, setSearch] = useState('');
    const [categories, setCategories] = useState<GetItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCategories = useCallback(async (q = '') => {
        if (!visible) return;

        setLoading(true);

        try {
            const res = await ItemAPI.getItem({
                yearno: yearno,
                prpcode: prpcode,
                strcode: strcode,
                txntype: 'design_master',
                isall: 1,
                billdate: '',
                itmcode: '',
                ttype: [8, 3, 30, 2, 34, 83, 42],
                fetch: '',
            });

            console.log("ITEM RESPONSE =>", res.data);

            const list = res.data.response?.data || [];
            // const filtered = q.trim()
            //     ? list.filter((item: any) =>
            //         item.ItmName?.toLowerCase().includes(q.toLowerCase()) ||
            //         item.ItmCode?.toLowerCase().includes(q.toLowerCase())
            //     )
            //     : list;

            // setCategories(list);
            setCategories(list);

            // console.log("CATEGORY SEARCH OK", {
            //     search: q,
            //     count: list.length,
            //     url: res.config?.url,
            //     baseURL: res.config?.baseURL,
            //     params: res.config?.params,
            // });

        } catch (e: any) {

            // console.log("CATEGORY SEARCH ERROR", {
            //     message: e?.message,
            //     code: e?.code,
            //     status: e?.response?.status,
            //     data: e?.response?.data,
            //     baseURL: e?.config?.baseURL,
            //     url: e?.config?.url,
            //     params: e?.config?.params,
            // });

            setCategories([]);

        } finally {

            setLoading(false);

        }

    }, [visible]);

    // useEffect(() => {

    //     if (!visible) return;

    //     const t = setTimeout(
    //         () => loadCategories(search),
    //         search.trim() ? 350 : 0
    //     );

    //     return () => clearTimeout(t);

    // }, [visible, search, loadCategories]);

    useEffect(() => {
        if (!visible) return;

        loadCategories();
    }, [visible]);

    const closePicker = () => {
        onClose();
        setSearch('');
        setCategories([]);
    };

    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return categories;

        return categories.filter(item =>
            item.ItmName?.toLowerCase().includes(q) ||
            item.ItmCode?.toLowerCase().includes(q)
        );
    }, [categories, search]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={closePicker}
        >
            <View style={yp.overlay}>
                <View style={yp.sheet}>

                    <View style={yp.handle} />

                    <View style={yp.header}>
                        <Text style={yp.title}>
                            Select Category
                        </Text>

                        <TouchableOpacity
                            onPress={closePicker}
                            style={yp.closeBtn}
                        >
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={yp.searchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            // onChangeText={(text) => {
                            //     setSearch(text);
                            //     loadCategories(text);
                            // }}
                            placeholder="Search Category..."
                            placeholderTextColor={T.muted}
                            style={yp.search}
                            autoFocus
                        />
                    </View>

                    {loading && (
                        <ActivityIndicator
                            color={T.copper}
                            style={{ paddingVertical: 10 }}
                        />
                    )}

                    <FlatList
                        // data={categories}
                        data={filteredCategories}
                        // keyExtractor={(item) => item.ItmCode}
                        keyExtractor={(item, index) =>
                            `${item.ItmCode}_${item.ItmName}_${index}`
                        }
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={yp.row}
                                activeOpacity={0.7}
                                onPress={() => {
                                    onSelect(item);
                                    closePicker();
                                }}
                            >
                                <Text style={yp.yarnName}>
                                    {item.ItmName}
                                </Text>

                                <Text style={yp.yarnSub}>
                                    {item.ItmCode}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => (
                            <View
                                style={{
                                    height: 1,
                                    backgroundColor: T.border,
                                    marginLeft: 16,
                                }}
                            />
                        )}
                        ListEmptyComponent={
                            !loading ? (
                                <Text
                                    style={{
                                        padding: 16,
                                        color: T.muted,
                                        textAlign: "center",
                                    }}
                                >
                                    No Category Found
                                </Text>
                            ) : null
                        }
                    />
                </View>
            </View>
        </Modal>
    );
}


const yp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: T.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    handle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    title: { fontSize: 16, fontWeight: '700', color: T.ink },
    closeBtn: { padding: 4 },
    closeTxt: { fontSize: 16, color: T.muted },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    row: { paddingHorizontal: 16, paddingVertical: 12 },
    yarnName: { fontSize: 14, fontWeight: '600', color: T.ink },
    yarnSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    pickerHint: { fontSize: 10, color: T.muted, marginTop: 2 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    codeBadge: { width: 78, minHeight: 48, borderRadius: 9, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6 },
    codeBadgeLabel: { fontSize: 8, fontWeight: '700', color: T.muted, letterSpacing: 0.4 },
    codeBadgeValue: { fontSize: 13, fontWeight: '800', color: T.copper, marginTop: 2 },
    yarnContent: { flex: 1, paddingHorizontal: 12 },
    fallbackText: { fontSize: 9, color: T.muted, marginTop: 3 },
    selectArrow: { fontSize: 25, color: T.muted, paddingLeft: 4 },
    separator: { height: 1, backgroundColor: T.border, marginLeft: 106 },
    emptyText: { paddingHorizontal: 24, paddingVertical: 30, color: T.muted, textAlign: 'center', lineHeight: 18 },
    errorBox: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E7B9B9', backgroundColor: '#FFF4F4', alignItems: 'center' },
    errorText: { fontSize: 12, color: '#9B3030', textAlign: 'center' },
    retryButton: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, backgroundColor: T.copper },
    retryText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

// ── Yarn line row (✅ NEW: Sizing chip + selvedge/ENDS mode) ──
function YarnLineRow({ yarn, type, onChange, onRemove }: {
    yarn: any; type: 'warp' | 'weft' | 'selvedge';
    onChange: (k: string, v: any) => void; onRemove: () => void;
}) {
    const key = type === 'warp' ? 'epi' : type === 'weft' ? 'ppi' : 'ends';
    const lbl = type === 'warp' ? 'EPI' : type === 'weft' ? 'PPI' : 'ENDS';
    return (
        <View style={yl.card}>
            <View style={yl.row}>
                <View style={{ flex: 1 }}>
                    <Text style={yl.name}>{yarn.name}</Text>
                    <Text style={yl.mainCode}>Main Yarn {String(yarn.main_yarn_code ?? yarn.m_itm_code ?? yarn.mi_id ?? '')}</Text>
                    <Text style={yl.sub}>{Number(yarn.cnt) > 0 ? `${Number(yarn.cnt)} ${yarn.sys || ''}`.trim() : yarn.sys || 'Count unavailable'}</Text>
                </View>
                {type === 'warp' && (
                    <TouchableOpacity style={[yl.sizingChip, yarn.sizing && yl.sizingChipOn]}
                        onPress={() => onChange('sizing', !yarn.sizing)}>
                        <Text style={[yl.sizingTxt, yarn.sizing && yl.sizingTxtOn]}>Sizing</Text>
                    </TouchableOpacity>
                )}
                <View style={yl.epiWrap}>
                    <TextInput value={String(yarn[key] ?? '')}
                        onChangeText={v => onChange(key, parseFloat(v) || 0)} keyboardType="numeric" style={yl.epiInput} />
                    <Text style={yl.epiLabel}>{lbl}</Text>
                </View>
                <TouchableOpacity onPress={onRemove} style={{ paddingLeft: 8 }}><Text style={{ color: T.pd, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={yl.blendLabel}>BLEND / SUB ITEM</Text>
            <TextInput value={yarn.blend_ratio ?? ''}
                onChangeText={v => onChange('blend_ratio', v.trim() || null)}
                placeholder="Pure or ratio/sub-item, e.g. 65/35"
                placeholderTextColor={T.muted} style={yl.blendInput} />
        </View>
    );
}
const yl = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    mainCode: { fontSize: 10, fontWeight: '700', color: T.copper, marginTop: 2 },
    sizingChip: { borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: T.sub },
    sizingChipOn: { backgroundColor: T.copper + '22', borderColor: T.copper },
    sizingTxt: { fontSize: 10, fontWeight: '700', color: T.muted },
    sizingTxtOn: { color: T.copper },
    epiWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    epiInput: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: T.ink, width: 56, textAlign: 'center' },
    epiLabel: { fontSize: 11, color: T.muted, fontWeight: '600' },
    blendLabel: { fontSize: 9, color: T.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
    blendInput: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: T.ink, fontSize: 12 },
});

// ═══════════════════════════════════════════════════════════════
// TAB 1 — CATALOG
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ onSelectDesign, onEditDesign, }: { onSelectDesign: (d: Design) => void; onEditDesign: (d: Design) => void; }) {
    const { yearno } = useERP();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedDetail, setExpandedDetail] = useState<Design | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const load = useCallback(async (page = 1) => {
        try {
            const res = await DesignAPI.list({
                yearno: yearno,
                page,
                per_page: 50,
                limit: 50,
                category: filter !== 'All' ? filter : undefined,
                search: search || undefined,
            } as any);

            console.log('DESIGN LIST OK', {
                url: res.config?.url,
                baseURL: res.config?.baseURL,
                params: res.config?.params,
                status: res.status,
            });

            console.log("Design res", res)

            const body: any = res.data;
            const rows: Design[] = Array.isArray(body?.data)
                ? body.data
                : Array.isArray(body?.data?.data)
                    ? body.data.data
                    : [];

            const meta = body?.meta ?? body?.data?.meta ?? {};
            const hasMore = Boolean(meta.has_more);

            setDesigns(prev => page === 1 ? rows : [...prev, ...rows]);
            setTotalPages(hasMore ? page + 1 : page);
            setTotal((page === 1 ? 0 : designs.length) + rows.length + (hasMore ? 1 : 0));
            setCurrentPage(page);
        } catch (e: any) {
            const msg = e?.response?.data?.message
                || e?.response?.data?.error
                || e?.message
                || 'Unable to load designs';

            console.log('DESIGN LIST ERROR', {
                message: e?.message,
                code: e?.code,
                status: e?.response?.status,
                data: e?.response?.data,
                url: e?.config?.url,
                baseURL: e?.config?.baseURL,
                params: e?.config?.params,
            });

            Alert.alert('Design list error', String(msg));
        }
        finally { setLoading(false); setRefreshing(false); }
    }, [filter, search, designs.length]);

    useEffect(() => { load(1); }, [filter]);
    useEffect(() => { const t = setTimeout(() => load(1), 400); return () => clearTimeout(t); }, [search]);

    const handleExpand = async (d: Design) => {
        if (expandedId === d.id) { setExpandedId(null); setExpandedDetail(null); return; }
        setExpandedId(d.id); setExpandedDetail(null); setDetailLoading(true);
        try {
            const res = await DesignAPI.get(d.id);
            setExpandedDetail({ ...d, ...res.data.data });
        } catch { setExpandedDetail(d); }
        finally { setDetailLoading(false); }
    };

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    {['All', ...Array.from(new Set(designs.map(d => d.category).filter(Boolean)))].map(c => (
                        <TouchableOpacity key={c} onPress={() => setFilter(c)}
                            style={[ct.chip, filter === c && ct.chipActive]}>
                            <Text style={[ct.chipTxt, filter === c && ct.chipTxtActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View style={ct.searchWrap}>
                <TextInput value={search} onChangeText={setSearch}
                    placeholder="Search design…" placeholderTextColor={T.muted} style={ct.search} />
            </View>
            <FlatList
                data={designs} keyExtractor={d => d.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} />}
                renderItem={({ item: d }) => {
                    const expanded = expandedId === d.id;
                    const raw = expanded ? expandedDetail : null;
                    const det = raw ? enrich(raw) : null;
                    return (
                        <View>
                            <TouchableOpacity style={ct.row} activeOpacity={0.7} onPress={() => handleExpand(d)}>
                                <Swatch design={d} size={44} />
                                <View style={ct.rowInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={ct.rowCode}>{d.code}</Text>
                                        <TypeBadge type={d.type} />
                                    </View>
                                    <Text style={ct.rowSub}>
                                        {SHORT(d.category)} ·
                                        {Number(d.epi_total).toFixed(2)}×{Number(d.ppi_total).toFixed(2)} ·
                                        {d.cw_count} cw
                                    </Text>
                                </View>
                                <View style={ct.rowRight}>
                                    <Text style={ct.rowPrice}>{d.latest_cost ? r0(d.latest_cost) : '—'}</Text>
                                    <Text style={ct.rowPriceSub}>per m</Text>
                                </View>
                                <Text style={[ct.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
                            </TouchableOpacity>
                            {expanded && (
                                <View style={ct.expandBox}>
                                    {detailLoading ? (
                                        <ActivityIndicator color={T.copper} style={{ paddingVertical: 20 }} />
                                    ) : det ? (() => {
                                        // ✅ uses the same corrected math as the Live Spec panel
                                        const fab = calcSpec(det);
                                        const hasC = det.epi_total > 0 && (det.reed_space ?? 0) > 0;
                                        const hasG = fab.greigGLM > 0;
                                        return (
                                            <>
                                                {!!det.weave && <Text style={ct.expandWeave}>{det.weave}{det.note ? ` · ${det.note}` : ''}</Text>}
                                                {((det.warp_yarns?.length ?? 0) > 0 || (det.weft_yarns?.length ?? 0) > 0 || (det.selvedge_yarns?.length ?? 0) > 0) && (
                                                    <>
                                                        <Text style={ct.expandSec}>YARNS</Text>
                                                        {det.warp_yarns?.map((y: any, i: number) => (
                                                            <View key={`w${i}`} style={ct.yarnRow}>
                                                                <View style={ct.yarnBadgeWarp}><Text style={ct.yarnBadgeTxt}>WARP</Text></View>
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}{y.sizing ? ' · sized' : ''}</Text>
                                                                <Text style={ct.yarnEpi}>{Number(y.epi).toFixed(2)} EPI</Text>
                                                            </View>
                                                        ))}
                                                        {det.weft_yarns?.map((y: any, i: number) => (
                                                            <View key={`f${i}`} style={ct.yarnRow}>
                                                                <View style={ct.yarnBadgeWeft}><Text style={ct.yarnBadgeTxt}>WEFT</Text></View>
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                                                                <Text style={ct.yarnEpi}>{Number(y.ppi).toFixed(2)} PPI</Text>
                                                            </View>
                                                        ))}
                                                        {det.selvedge_yarns?.map((y: any, i: number) => (
                                                            <View key={`s${i}`} style={ct.yarnRow}>
                                                                <View style={ct.yarnBadgeSelvedge}><Text style={ct.yarnBadgeTxt}>SELV</Text></View>
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                                                                <Text style={ct.yarnEpi}>{Number(y.ends).toFixed(0)} ENDS</Text>
                                                            </View>
                                                        ))}
                                                    </>
                                                )}
                                                <View style={ct.designMetaRow}>
                                                    <Text style={ct.designMetaText}>Reed Count: {Number(det.reed_count) > 0 ? Number(det.reed_count) : '—'}</Text>
                                                    <Text style={ct.designMetaText}>Warp Shrink: {Number(det.warp_shrink || 0).toFixed(2)}%</Text>
                                                    <Text style={ct.designMetaText}>Weft Shrink: {Number(det.weft_shrink || 0).toFixed(2)}%</Text>
                                                </View>
                                                {hasC && (
                                                    <View style={ct.statsRow}>
                                                        <View style={ct.statBox}>
                                                            <Text style={ct.statLabel}>REED SPACE · BASIS</Text>
                                                            <Text style={ct.statVal}>{det.reed_space}"</Text>
                                                        </View>
                                                        <View style={ct.statBox}>
                                                            <Text style={ct.statLabel}>TOTAL ENDS</Text>
                                                            <Text style={ct.statVal}>{fab.totalEnds > 0 ? Math.round(fab.totalEnds).toLocaleString('en-IN') : '—'}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {hasC && (
                                                    <>
                                                        <Text style={[ct.expandSec, { marginTop: 10 }]}>↑EPI {det.epi_total} × ↑PPI {det.ppi_total} (on loom)</Text>
                                                        <View style={ct.constructTable}>
                                                            <View style={[ct.tableRow, ct.tableHeader]}>
                                                                {['CONSTRUCTION', 'LOOM', 'GREIGE', 'FINISHED'].map((h, i) => (
                                                                    <Text key={i} style={[ct.tableCell, ct.tableCellHdr, i === 0 && ct.tableCellLabel]}>{h}</Text>
                                                                ))}
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>EPI</Text>
                                                                <Text style={ct.tableCell}>{f1(det.epi_total)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.epiGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{f1(fab.epiFinished)}</Text>
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>PPI</Text>
                                                                <Text style={ct.tableCell}>{f1(det.ppi_total)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.ppiTable)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{f1(fab.ppiFinished)}</Text>
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>Width"</Text>
                                                                <Text style={ct.tableCell}>{det.reed_space}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.widthGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{det.fin_width > 0 ? det.fin_width : f1(fab.finWidthIn)}</Text>
                                                            </View>
                                                        </View>
                                                    </>
                                                )}
                                                {hasG && (
                                                    <View style={ct.gsmGrid}>
                                                        <View style={ct.gsmBox}>
                                                            <Text style={ct.gsmLabel}>Greige GSM</Text>
                                                            <Text style={ct.gsmVal}>{Math.round(fab.greigGSM)}</Text>
                                                        </View>
                                                        <View style={ct.gsmBox}>
                                                            <Text style={ct.gsmLabel}>Greige GLM</Text>
                                                            <Text style={ct.gsmVal}>{fab.greigGLM.toFixed(1)} g/m</Text>
                                                        </View>
                                                        <View style={[ct.gsmBox, { borderTopWidth: 1, borderTopColor: T.border }]}>
                                                            <Text style={ct.gsmLabel}>Finished GSM</Text>
                                                            <Text style={ct.gsmVal}>{Math.round(fab.finGSM)}</Text>
                                                            {det.fin_width > 0 && <Text style={{ fontSize: 9, color: T.muted }}>{det.fin_width}" fin</Text>}
                                                        </View>
                                                        <View style={[ct.gsmBox, { borderTopWidth: 1, borderTopColor: T.border }]}>
                                                            <Text style={ct.gsmLabel}>Finished GLM</Text>
                                                            <Text style={ct.gsmVal}>{fab.finGLM.toFixed(1)} g/m</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {fab.blendGrand > 0 && (
                                                    <View style={{ marginTop: 14 }}>
                                                        <Text style={ct.expandSec}>FIBRE BLEND</Text>
                                                        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                                                            {Object.entries(fab.blendTotals).map(([k, v]) => (
                                                                <View key={k} style={{ flex: v / fab.blendGrand, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                                            ))}
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                                            {Object.entries(fab.blendTotals).map(([k, v]) => (
                                                                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                                                    <Text style={{ fontSize: 10, color: T.muted }}>{k} {Math.round(v / fab.blendGrand * 100)}%</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}
                                                {!!det.latest_cost && (
                                                    <View style={ct.latestCostRow}>
                                                        <Text style={ct.latestCostTxt}>Latest cost</Text>
                                                        <Text style={ct.latestCostVal}>{r0(det.latest_cost)}/m</Text>
                                                    </View>
                                                )}
                                                <View style={ct.cwRow}>
                                                    <Text style={ct.cwTitle}>COLOURWAYS ({det.cw_count ?? 0})</Text>
                                                    <TouchableOpacity style={ct.cwAddBtn} onPress={() => onSelectDesign(det)}>
                                                        <Text style={ct.cwAddTxt}>+ Add Sub Design</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[ct.cwAddBtn]}
                                                        onPress={() => onEditDesign(det)}
                                                    >
                                                        <Text style={ct.cwAddTxt}>
                                                            Update Design
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        );
                                    })() : null}
                                </View>
                            )}
                        </View>
                    );
                }}
                ItemSeparatorComponent={() => <View style={ct.sep} />}
                ListEmptyComponent={<Text style={s.empty}>No designs found</Text>}
                ListFooterComponent={
                    currentPage < totalPages
                        ? <TouchableOpacity onPress={() => load(currentPage + 1)} style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ color: T.copper, fontWeight: '700' }}>Load More ({total - designs.length} remaining)</Text>
                        </TouchableOpacity>
                        : null
                }
            />
        </View>
    );
}
const ct = StyleSheet.create({
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipTxt: { fontSize: 12, fontWeight: '600', color: T.muted },
    chipTxtActive: { color: '#fff' },
    searchWrap: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.surface, gap: 10 },
    rowInfo: { flex: 1 },
    rowCode: { fontSize: 15, fontWeight: '700', color: T.ink },
    rowSub: { fontSize: 11, color: T.muted, marginTop: 2 },
    rowRight: { alignItems: 'flex-end' },
    rowPrice: { fontSize: 14, fontWeight: '800', color: T.copper },
    rowPriceSub: { fontSize: 9, color: T.muted },
    chevron: { fontSize: 18, color: T.muted },
    sep: { height: 1, backgroundColor: T.border, marginLeft: 68 },
    expandBox: { backgroundColor: T.bg, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    expandWeave: { fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 8 },
    expandSec: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    yarnBadgeWarp: { backgroundColor: T.yd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeWeft: { backgroundColor: T.pd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeTxt: { fontSize: 9, fontWeight: '800', color: T.muted },
    yarnName: { flex: 1, fontSize: 12, fontWeight: '600', color: T.ink },
    yarnEpi: { fontSize: 12, fontWeight: '700', color: T.copper },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 4 },
    statBox: { flex: 1, backgroundColor: T.nav, borderRadius: 8, padding: 10 },
    statLabel: { fontSize: 9, color: '#fff', fontWeight: '600', letterSpacing: 0.4 },
    statVal: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
    constructTable: { marginTop: 4, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    tableRow: { flexDirection: 'row', backgroundColor: T.surface },
    tableHeader: { backgroundColor: T.sub },
    tableCell: { flex: 1, fontSize: 11, color: T.ink, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right' },
    tableCellHdr: { fontSize: 9, fontWeight: '700', color: T.muted, textAlign: 'right' },
    tableCellLabel: { textAlign: 'left', fontWeight: '600', flex: 1.2 },
    tdGreige: { fontWeight: '700', color: T.ink },
    tdFinished: { fontWeight: '700', color: T.copper },
    gsmGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: 8, overflow: 'hidden' },
    gsmBox: { width: '50%', backgroundColor: T.surface, padding: 10 },
    gsmLabel: { fontSize: 9, color: T.muted, fontWeight: '600', letterSpacing: 0.3 },
    gsmVal: { fontSize: 16, fontWeight: '800', color: T.ink, marginTop: 2 },
    latestCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: T.border },
    latestCostTxt: { fontSize: 12, color: T.muted, fontWeight: '600' },
    latestCostVal: { fontSize: 14, fontWeight: '800', color: T.copper },
    cwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
    cwTitle: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4 },
    cwAddBtn: { backgroundColor: T.copper + '22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    cwAddTxt: { fontSize: 12, fontWeight: '700', color: T.copper },
    yarnBadgeSelvedge: { backgroundColor: '#7B6D8D22', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, marginRight: 8 },
    designMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    designMetaText: { fontSize: 10, color: T.muted, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — DESIGN  (Reed Space input + calculated Greige Width + Live Spec)
// ═══════════════════════════════════════════════════════════════
const EMPTY_FORM = {
    code: '', category: '', type: 'YD',
    weave: '', reed_count: 0, reed_space: 0, greige_width: 0, warp_shrink: 0, weft_shrink: 0, gf_shrink: 0,
    fin_width: 0, warp_wastage: 0, weft_wastage: 0,
    warp_yarns: [], weft_yarns: [], selvedge_yarns: [], width_basis: 'reed',
};

function DesignTab({ design, onRefresh, onCancelEdit }: {
    design: Design | null; onRefresh: () => void; onCancelEdit: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();

    const [saving, setSaving] = useState(false);
    const [pickerFor, setPickerFor] = useState<'warp' | 'weft' | 'selvedge' | null>(null);
    const [form, setForm] = useState<any>({ ...EMPTY_FORM });
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

    useEffect(() => {
        if (design) setForm({
            ...EMPTY_FORM, ...design,
            width_basis: (design as any).width_basis ?? 'reed',
            reed_count: (design as any).reed_count ?? 0,
            greige_width: (design as any).greige_width ?? 0,
            weft_shrink: (design as any).weft_shrink ?? 0,
            selvedge_yarns: (design as any).selvedge_yarns ?? [],
            warp_wastage: (design as any).warp_wastage ?? 0,
            weft_wastage: (design as any).weft_wastage ?? 6,
        });
        else setForm({ ...EMPTY_FORM });
    }, [design?.id]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    // ✅ MISSING #1 — greige width ⇄ reed space, kept in sync live
    const shrinkFrac = (Number(form.warp_shrink) || 0) / 100;
    const autoGreige = (Number(form.reed_space) || 0) * (1 - shrinkFrac);

    const addYarn = (y: YarnMaster, type: 'warp' | 'weft' | 'selvedge') => {
        const key = `${type}_yarns`;
        set(key, [...(form[key] ?? []), {
            mi_id: y.mi_id, itm_code: y.itm_code, m_itm_code: y.m_itm_code, main_yarn_code: y.main_yarn_code, is_main_yarn_item: y.is_main_yarn_item, prp_code: y.prp_code, str_code: y.str_code, name: y.name, sys: y.sys, cnt: y.cnt, base_price: y.price,
            blend_ratio: null,
            ...(type === 'warp' ? { epi: 60, sizing: false } : type === 'weft' ? { ppi: 52 } : { ends: 0 }),
        }]);
    };
    const updateYarn = (type: string, idx: number, k: string, v: any) => {
        const key = `${type}_yarns`; const list = [...(form[key] ?? [])];
        list[idx] = { ...list[idx], [k]: v }; set(key, list);
    };
    const removeYarn = (type: string, idx: number) =>
        set(`${type}_yarns`, (form[`${type}_yarns`] ?? []).filter((_: any, i: number) => i !== idx));

    const save = async () => {
        if (!String(form.code || '').trim()) {
            Alert.alert('Validation', 'Design code is required.');
            return;
        }

        if (!String(form.category || '').trim()) {
            Alert.alert('Validation', 'Category is required.');
            return;
        }

        if (!Array.isArray(form.warp_yarns) || form.warp_yarns.length === 0) {
            Alert.alert('Validation', 'At least one warp yarn is required.');
            return;
        }

        if (!Array.isArray(form.weft_yarns) || form.weft_yarns.length === 0) {
            Alert.alert('Validation', 'At least one weft yarn is required.');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...form,

                yearno,
                YearNo: yearno,

                prpcode,
                PrpCode: prpcode,

                strcode,
                StrCode: strcode,

                width_basis: 'reed',
                reed_count: Number(form.reed_count) || 0,
                reed_space: Number(form.reed_space) || 0,
                greige_width: Number(autoGreige) || 0,
                warp_shrink: Number(form.warp_shrink) || 0,
                weft_shrink: Number(form.weft_shrink) || 0,
                warp_wastage: Number(form.warp_wastage) || 0,
                weft_wastage: Number(form.weft_wastage) || 6,

                warp_yarns: (form.warp_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    epi: Number(row.epi) || 0,
                    sizing: Boolean(row.sizing),
                })),

                weft_yarns: (form.weft_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    ppi: Number(row.ppi) || 0,
                })),

                selvedge_yarns: (form.selvedge_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    ends: Number(row.ends) || 0,
                })),
            };

            console.log('DESIGN SAVE PAYLOAD', JSON.stringify(payload, null, 2));

            const response = design?.id
                ? await DesignAPI.update(design.id, payload)
                : await DesignAPI.create(payload);

            console.log('DESIGN SAVE FULL RESPONSE', {
                status: response.status,
                baseURL: response.config?.baseURL,
                url: response.config?.url,
                requestParams: response.config?.params,
                responseData: response.data,
            });

            const saved = response?.data?.data;

            if (
                response?.data?.success !== true ||
                !saved ||
                !String(saved.id || '').trim()
            ) {
                throw new Error(
                    'Server returned success without a saved engineering design ID.'
                );
            }

            // Verify immediately by fetching the same record.
            const verifyResponse = await DesignAPI.get(String(saved.id));
            const verified = verifyResponse?.data?.data;

            console.log('DESIGN SAVE VERIFY RESPONSE', {
                id: saved.id,
                responseData: verifyResponse.data,
            });

            if (!verified || String(verified.id) !== String(saved.id)) {
                throw new Error(
                    `Design ${saved.id} was returned by save but could not be read back.`
                );
            }

            Alert.alert(
                'Saved',
                `Design saved successfully.\n\nID: ${saved.id}`
            );

            setForm({ ...EMPTY_FORM });
            setPickerFor(null);
            onRefresh();
            if (design?.id) onCancelEdit();
        } catch (e: any) {
            console.log('DESIGN SAVE FINAL ERROR', {
                message: e?.message,
                status: e?.response?.status,
                responseData: e?.response?.data,
                baseURL: e?.config?.baseURL,
                url: e?.config?.url,
            });

            Alert.alert(
                'Design save failed',
                String(
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.message ||
                    'Unable to save design'
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} style={[fm.chip, active && fm.chipActive]}>
            <Text style={[fm.chipTxt, active && fm.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                {/* ── editing banner (owner mode) ── */}
                {design?.id && (
                    <View style={fm.editBanner}>
                        <Text style={fm.editTxt}>
                            <Text style={{ fontWeight: '800' }}>Editing {design.code}</Text> — owner mode.
                            Changes update the existing design; saved costings keep their snapshots,
                            and the next costing version picks up the new recipe automatically.
                        </Text>
                        <TouchableOpacity onPress={onCancelEdit}>
                            <Text style={fm.editCancel}>Cancel editing</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={fm.label}>DESIGN CODE</Text>
                <TextInput value={form.code ?? ''} onChangeText={v => set('code', v)} placeholder="e.g. Cambridge" placeholderTextColor={T.muted} style={fm.input} />

                <Text style={fm.label}>CATEGORY</Text>
                {/* <View style={fm.chipRow}>
                    {[['Shirting', 'Linen Shirting'], ['Sportswear', 'Sportswear'], ['Suiting', 'Linen Suiting']].map(([label, val]) => (
                        <Chip key={val} label={label} active={form.category === val} onPress={() => set('category', val)} />
                    ))}
                </View> */}

                {form.category ? (
                    <View style={yl.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={yl.name}>{form.category}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => set('category', '')}
                            style={{ paddingLeft: 8 }}
                        >
                            <Text style={{ color: T.pd, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={fm.addBtn}
                    onPress={() => setCategoryPickerVisible(true)}
                >
                    <Text style={fm.addBtnTxt}>
                        {'+ Select Category'}
                    </Text>
                </TouchableOpacity>


                <Text style={fm.label}>DYE TYPE</Text>
                <View style={fm.chipRow}>
                    <Chip label="Yarn Dyed" active={form.type === 'YD'} onPress={() => set('type', 'YD')} />
                    <Chip label="Piece Dyed" active={form.type === 'PD'} onPress={() => set('type', 'PD')} />
                </View>

                <Text style={fm.label}>WEAVE / STRUCTURE</Text>
                <TextInput value={form.weave ?? ''} onChangeText={v => set('weave', v)} placeholder="e.g. Dobby — fine dobby" placeholderTextColor={T.muted} style={fm.input} />

                <Text style={fm.label}>REED COUNT</Text>
                <Text style={fm.hint}>Reed specification used by production and reporting</Text>
                <TextInput
                    value={form.reed_count ? String(form.reed_count) : ''}
                    onChangeText={v => set('reed_count', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    style={fm.input}
                    placeholder="e.g. 72"
                    placeholderTextColor={T.muted}
                />

                <Text style={fm.label}>WIDTH BASIS</Text>
                <Text style={fm.hint}>Reed Space is the construction anchor. Greige Width is calculated automatically.</Text>
                <View style={fm.chipRow}>
                    <View style={[fm.chip, fm.chipActive]}>
                        <Text style={[fm.chipTxt, fm.chipTxtActive]}>Reed space</Text>
                    </View>
                    <View style={[fm.chip, fm.chipDisabled]}>
                        <Text style={[fm.chipTxt, fm.chipDisabledTxt]}>Greige width · auto</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>REED SPACE · INPUT</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.reed_space ?? '')} onChangeText={v => set('reed_space', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                            <Text style={fm.unit}>"</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WARP SHRINK</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.warp_shrink ?? '')} onChangeText={v => set('warp_shrink', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                <Text style={fm.label}>GREIGE WIDTH · CALCULATED</Text>
                <Text style={fm.hint}>Greige Width = Reed Space × (1 − Warp Shrink)</Text>
                <View style={fm.inputRow}>
                    <View style={[fm.input, fm.inputRO, { flex: 1 }]}>
                        <Text style={fm.roTxt}>{autoGreige > 0 ? autoGreige.toFixed(1) : '—'}</Text>
                    </View>
                    <Text style={fm.unit}>"</Text>
                </View>

                <Text style={fm.label}>WEFT SHRINK / CRIMP</Text>
                <Text style={fm.hint}>Used in weft consumption: factor = 1 ÷ (1 − shrink)</Text>
                <View style={fm.inputRow}>
                    <TextInput
                        value={String(form.weft_shrink ?? '')}
                        onChangeText={v => set('weft_shrink', parseFloat(v) || 0)}
                        keyboardType="decimal-pad"
                        style={[fm.input, { flex: 1 }]}
                        placeholder="0"
                        placeholderTextColor={T.muted}
                    />
                    <Text style={fm.unit}>%</Text>
                </View>

                <Text style={fm.label}>WARP YARNS</Text>
                {(form.warp_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="warp" onChange={(k, v) => updateYarn('warp', i, k, v)} onRemove={() => removeYarn('warp', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('warp')}>
                    <Text style={fm.addBtnTxt}>+ Add warp yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>WEFT YARNS</Text>
                {(form.weft_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="weft" onChange={(k, v) => updateYarn('weft', i, k, v)} onRemove={() => removeYarn('weft', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('weft')}>
                    <Text style={fm.addBtnTxt}>+ Add weft yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>SELVEDGE</Text>
                <Text style={fm.hint}>optional · cost only, excluded from GSM</Text>
                {(form.selvedge_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="selvedge" onChange={(k, v) => updateYarn('selvedge', i, k, v)} onRemove={() => removeYarn('selvedge', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('selvedge')}>
                    <Text style={fm.addBtnTxt}>+ Select selvedge yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>WASTAGE</Text>
                <Text style={fm.hint}>adds to yarn cost only — does not change GSM / fabric weight</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WARP WASTAGE</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.warp_wastage ?? '0')} onChangeText={v => set('warp_wastage', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="0" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WEFT WASTAGE</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.weft_wastage ?? '6')} onChangeText={v => set('weft_wastage', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="6" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>FINISHED WIDTH</Text>
                        <Text style={fm.hint}>optional</Text>
                        <View style={fm.inputRow}>
                            <TextInput editable={!form.finish_locked} value={form.fin_width ? String(form.fin_width) : ''} onChangeText={v => set('fin_width', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="58" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>"</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>FINISH SHRINK</Text>
                        <View style={fm.inputRow}>
                            <TextInput editable={!form.finish_locked} value={String(form.gf_shrink ?? '5')} onChangeText={v => set('gf_shrink', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="5" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                {/* ✅ MISSING #3 — LIVE SPEC panel (updates as you type) */}
                <LiveSpecPanel design={{
                    ...form,
                    width_basis: 'reed',
                    reed_space: form.reed_space,
                    greige_width: autoGreige,
                }} />

                <TouchableOpacity style={[fm.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                    <Text style={fm.saveTxt}>{saving ? 'Saving…' : design ? 'Update design' : 'Create design'}</Text>
                </TouchableOpacity>
            </ScrollView>
            <YarnPickerModal
                visible={pickerFor !== null}
                title={pickerFor === 'warp' ? 'Select warp yarn' : pickerFor === 'weft' ? 'Select weft yarn' : 'Select selvedge yarn'}
                onSelect={y => pickerFor && addYarn(y, pickerFor)}
                onClose={() => setPickerFor(null)}
            />
            {/* <CategoryPickerModal
                visible={categoryPickerVisible}
                onSelect={(category) => {
                    set('category', category);
                }}
                onClose={() => setCategoryPickerVisible(false)}
            /> */}
            <CategoryPickerModal
                visible={categoryPickerVisible}
                onSelect={(item) => {
                    set('category', item.ItmName);
                    // setCategoryPickerVisible(false);
                }}
                onClose={() => setCategoryPickerVisible(false)}
            />

        </>
    );
}
const fm = StyleSheet.create({
    fixedBasis: { backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    fixedBasisTitle: { fontSize: 12, fontWeight: '800', color: T.ink },
    fixedBasisText: { fontSize: 11, lineHeight: 16, color: T.muted, marginTop: 4 },
    editBanner: { backgroundColor: T.copper + '15', borderWidth: 1, borderColor: T.copper + '55', borderRadius: 10, padding: 12, marginBottom: 4 },
    editTxt: { fontSize: 12, color: T.ink, lineHeight: 17 },
    editCancel: { fontSize: 12, fontWeight: '700', color: T.copper, marginTop: 6 },
    label: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    hint: { fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 6 },
    input: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    inputRO: { backgroundColor: T.sub, justifyContent: 'center' },
    roTxt: { fontSize: 14, color: T.ink, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unit: { fontSize: 14, color: T.muted, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipDisabled: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
    chipTxt: { fontSize: 13, fontWeight: '600', color: T.muted },
    chipTxtActive: { color: '#fff' },
    chipDisabledTxt: { color: T.muted },
    addBtn: { borderWidth: 1.5, borderColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
    addBtnTxt: { fontSize: 14, fontWeight: '700', color: T.copper },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — SUB DESIGN / COLOURWAY
// Each yarn has its own independent shade-band builder.
// Same/different shades and multiple shades per yarn are supported.
// ═══════════════════════════════════════════════════════════════
function DesignPickerModal({ visible, onSelect, onClose }: {
    visible: boolean;
    onSelect: (d: Design) => void;
    onClose: () => void;
}) {
    const { yearno } = useERP();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        DesignAPI.list({ page: 1, per_page: 200, limit: 200, yearno: yearno } as any)
            .then(r => {
                const envelope: any = r.data.data;
                setDesigns(Array.isArray(envelope) ? envelope : (envelope?.data ?? []));
            })
            .catch(() => setDesigns([]))
            .finally(() => setLoading(false));
    }, [visible]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return !q ? designs : designs.filter(d =>
            d.code.toLowerCase().includes(q) || String(d.category || '').toLowerCase().includes(q)
        );
    }, [designs, search]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>Select Main Design</Text>
                        <TouchableOpacity onPress={onClose} style={yp.closeBtn}><Text style={yp.closeTxt}>✕</Text></TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="Search design..." placeholderTextColor={T.muted} style={yp.search} />
                    </View>
                    {loading ? <ActivityIndicator color={T.copper} style={{ padding: 24 }} /> : (
                        <FlatList
                            data={filtered}
                            keyExtractor={d => d.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={yp.row} onPress={() => { onSelect(item); onClose(); }}>
                                    <Text style={yp.yarnName}>{item.code}</Text>
                                    <Text style={yp.yarnSub}>{item.category} · {item.type}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

type Shade = { color_name: string; hex: string; shade_no?: string };
type ShadeBand = Shade & { mi_id: string; blend_ratio?: string | null; thread_count: number };

function ShadePickerModal({ visible, onSelect, onClose }: {
    visible: boolean;
    onSelect: (shade: Shade) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<Shade[]>([]);
    const [name, setName] = useState('');
    const [shadeNo, setShadeNo] = useState('');
    const [hex, setHex] = useState('#808080');

    useEffect(() => {
        if (!visible) return;
        client.get('/design-options', { params: { prpcode, strcode, yearno } })
            .then(r => setRows(r.data?.data?.shades || []))
            .catch(() => setRows([]));
    }, [visible, prpcode, strcode, yearno]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return !q ? rows : rows.filter(x => `${x.color_name} ${x.shade_no || ''}`.toLowerCase().includes(q));
    }, [rows, search]);

    const addManual = () => {
        if (!name.trim()) { Alert.alert('Shade name required'); return; }
        onSelect({ color_name: name.trim(), shade_no: shadeNo.trim() || name.trim(), hex: /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#808080' });
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}><View style={yp.sheet}>
                <View style={yp.handle} />
                <View style={yp.header}><Text style={yp.title}>Select or Add Shade</Text><TouchableOpacity onPress={onClose}><Text style={yp.closeTxt}>✕</Text></TouchableOpacity></View>
                <View style={yp.searchWrap}><TextInput value={search} onChangeText={setSearch} placeholder="Search saved shades..." placeholderTextColor={T.muted} style={yp.search} /></View>
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: T.border }}>
                    <TextInput value={name} onChangeText={setName} placeholder="Shade name" placeholderTextColor={T.muted} style={yp.search} />
                    <TextInput value={shadeNo} onChangeText={setShadeNo} placeholder="Shade number/code (optional)" placeholderTextColor={T.muted} style={[yp.search, { marginTop: 8 }]} />
                    <TextInput value={hex} onChangeText={setHex} placeholder="#RRGGBB" autoCapitalize="none" style={[yp.search, { marginTop: 8 }]} />
                    <TouchableOpacity onPress={addManual} style={{ backgroundColor: T.copper, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 }}><Text style={{ color: '#fff', fontWeight: '800' }}>Use This Shade</Text></TouchableOpacity>
                </View>
                <FlatList data={filtered} keyExtractor={(x, i) => `${x.color_name}-${x.shade_no || ''}-${i}`}
                    renderItem={({ item }) => <TouchableOpacity style={yp.row} onPress={() => { onSelect(item); onClose(); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.hex || '#808080', borderWidth: 1, borderColor: T.border }} /><View><Text style={yp.yarnName}>{item.color_name}</Text><Text style={yp.yarnSub}>{item.shade_no || ''}</Text></View></View></TouchableOpacity>} />
            </View></View>
        </Modal>
    );
}

function YarnShadeBlock({ yarn, direction, bands, onChange }: {
    yarn: any;
    direction: 'warp' | 'weft';
    bands: ShadeBand[];
    onChange: (rows: ShadeBand[]) => void;
}) {
    const [picker, setPicker] = useState(false);
    const [pendingShade, setPendingShade] = useState<Shade | null>(null);
    const [count, setCount] = useState('1');
    const unit = direction === 'warp' ? `${Number(yarn.epi || 0)} EPI` : `${Number(yarn.ppi || 0)} PPI`;

    const add = () => {
        if (!pendingShade) { Alert.alert('Shade required', 'Select a shade first.'); return; }
        const n = Math.max(1, Math.round(Number(count) || 1));
        onChange([...bands, {
            ...pendingShade,
            mi_id: yarn.mi_id,
            blend_ratio: yarn.blend_ratio ?? null,
            thread_count: n,
        }]);
        setPendingShade(null);
        setCount('1');
    };

    return (
        <View style={cw3.yarnBlock}>
            <View style={cw3.yarnHeader}>
                <View style={[cw3.dirBadge, direction === 'weft' && { backgroundColor: T.pd + '20' }]}>
                    <Text style={[cw3.dirText, direction === 'weft' && { color: T.pd }]}>{direction.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={cw3.yarnName}>{yarn.name}</Text>
                    <Text style={cw3.yarnMeta}>{unit}{yarn.blend_ratio ? ` · ${yarn.blend_ratio}` : ''}</Text>
                </View>
            </View>

            {bands.length > 0 && (
                <View style={{ marginTop: 10 }}>
                    {bands.map((b, i) => (
                        <View key={`${b.color_name}-${i}`} style={cw3.bandRow}>
                            <View style={[cw3.bandDot, { backgroundColor: b.hex }]} />
                            <Text style={cw3.bandName}>{b.color_name}</Text>
                            <Text style={cw3.bandCount}>{b.thread_count}</Text>
                            <TouchableOpacity onPress={() => onChange(bands.filter((_, x) => x !== i))}>
                                <Text style={cw3.remove}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={cw3.addRow}>
                <TouchableOpacity style={cw3.shadeSelect} onPress={() => setPicker(true)}>
                    {pendingShade ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                            <View style={[cw3.bandDot, { backgroundColor: pendingShade.hex }]} />
                            <Text style={cw3.shadeSelectText}>{pendingShade.color_name}</Text>
                        </View>
                    ) : <Text style={cw3.shadeSelectText}>Select shade ▾</Text>}
                </TouchableOpacity>
                <TextInput value={count} onChangeText={setCount} keyboardType="numeric" style={cw3.countInput} />
                <TouchableOpacity style={cw3.addBandBtn} onPress={add}><Text style={cw3.addBandText}>Add</Text></TouchableOpacity>
            </View>

            <ShadePickerModal visible={picker} onSelect={setPendingShade} onClose={() => setPicker(false)} />
        </View>
    );
}

function ColourwayTab({ design, onNavigateToCatalog }: { design: Design | null; onNavigateToCatalog: () => void }) {
    const [baseDesign, setBaseDesign] = useState<Design | null>(design);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subCode, setSubCode] = useState('');
    const [commercialName, setCommercialName] = useState('');
    const [warpBands, setWarpBands] = useState<Record<string, ShadeBand[]>>({});
    const [weftBands, setWeftBands] = useState<Record<string, ShadeBand[]>>({});

    const loadFull = useCallback(async (d: Design) => {
        try {
            const res = await DesignAPI.get(d.id);
            setBaseDesign({ ...d, ...res.data.data });
        } catch {
            setBaseDesign(d);
        }
    }, []);

    useEffect(() => {
        if (!design) return;
        loadFull(design);
        setSubCode(`${design.code.replace(/\s+/g, '-')}-01`);
        setWarpBands({}); setWeftBands({}); setCommercialName('');
    }, [design?.id, loadFull]);

    const warpYarns = baseDesign?.warp_yarns ?? [];
    const weftYarns = baseDesign?.weft_yarns ?? [];
    const allWarp = Object.values(warpBands).flat();
    const allWeft = Object.values(weftBands).flat();

    const save = async () => {
        if (!baseDesign) { Alert.alert('Main Design required'); return; }
        if (!subCode.trim()) { Alert.alert('Sub Design code required'); return; }
        if (baseDesign.type === 'YD' && allWarp.length === 0 && allWeft.length === 0) {
            Alert.alert('Shade pattern required', 'Add at least one warp or weft shade band.'); return;
        }
        if (baseDesign.type === 'PD' && !commercialName.trim()) {
            Alert.alert('Commercial shade required', 'Enter the final piece-dyed shade name.'); return;
        }

        setSaving(true);
        try {
            const toColors = (rows: ShadeBand[]) => rows.map(r => ({
                mi_id: r.mi_id, blend_ratio: r.blend_ratio ?? null,
                shade: r.shade_no ?? r.color_name, color_name: r.color_name, hex: r.hex,
            }));
            const toPatterns = (rows: ShadeBand[]) => rows.map(r => ({
                mi_id: r.mi_id, blend_ratio: r.blend_ratio ?? null,
                shade: r.shade_no ?? r.color_name, color_name: r.color_name, hex: r.hex,
                thread_count: r.thread_count,
            }));

            await DesignAPI.addColourway(baseDesign.id, {
                code: subCode.trim(),
                commercial_name: commercialName.trim() || undefined,
                warp_colors: toColors(allWarp),
                weft_colors: toColors(allWeft),
                warp_patterns: toPatterns(allWarp),
                weft_patterns: toPatterns(allWeft),
            } as any);

            Alert.alert('Saved', 'Sub Design saved successfully.');
            setWarpBands({}); setWeftBands({});
            setSubCode(`${baseDesign.code.replace(/\s+/g, '-')}-01`);
        } catch (e: any) {
            Alert.alert('Save failed', e?.response?.data?.message || e?.message || 'Unable to save Sub Design');
        } finally { setSaving(false); }
    };

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                <View style={cw3.intro}>
                    <Text style={cw3.introTitle}>NEW SUB DESIGN</Text>
                    <Text style={cw3.introText}>Construction stays in Main Design. This screen stores yarn-wise shades and repeat counts only.</Text>
                </View>

                <Text style={cw3.label}>MAIN DESIGN</Text>
                <TouchableOpacity style={cw3.picker} onPress={() => setShowDesignPicker(true)}>
                    <Text style={cw3.pickerText}>{baseDesign ? `${baseDesign.code} · ${baseDesign.type}` : 'Select Main Design'}</Text>
                    <Text>▾</Text>
                </TouchableOpacity>

                {baseDesign && (
                    <>
                        <Text style={cw3.label}>SUB DESIGN CODE</Text>
                        <TextInput value={subCode} onChangeText={setSubCode} style={cw3.input} placeholder="e.g. RIB-145-NAVY" placeholderTextColor={T.muted} />

                        {baseDesign.type === 'YD' ? (
                            <>
                                <Text style={cw3.label}>COMMERCIAL NAME</Text>
                                <TextInput
                                    value={commercialName}
                                    onChangeText={setCommercialName}
                                    style={cw3.input}
                                    placeholder="optional market name"
                                    placeholderTextColor={T.muted}
                                />
                                <Text style={cw3.section}>WOVEN CHECK</Text>
                                <View style={cw3.preview}>
                                    <View style={cw3.previewLine}>
                                        {[...allWarp, ...allWeft].slice(0, 80).map((b, i) => (
                                            <View key={i} style={{ width: Math.max(3, Math.min(20, b.thread_count * 2)), height: 42, backgroundColor: b.hex }} />
                                        ))}
                                    </View>
                                    <Text style={cw3.previewText}>{allWarp.length} warp bands · {allWeft.length} weft bands</Text>
                                </View>

                                <Text style={cw3.section}>WARP SHADES</Text>
                                {warpYarns.map((y: any, i: number) => {
                                    const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                                    return <YarnShadeBlock key={key} yarn={y} direction="warp" bands={warpBands[key] ?? []} onChange={rows => setWarpBands(p => ({ ...p, [key]: rows }))} />;
                                })}

                                <Text style={cw3.section}>WEFT SHADES</Text>
                                {weftYarns.map((y: any, i: number) => {
                                    const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                                    return <YarnShadeBlock key={key} yarn={y} direction="weft" bands={weftBands[key] ?? []} onChange={rows => setWeftBands(p => ({ ...p, [key]: rows }))} />;
                                })}
                            </>
                        ) : (
                            <>
                                <View style={cw3.pdBox}>
                                    <Text style={cw3.pdTitle}>PIECE-DYED SUB DESIGN</Text>
                                    <Text style={cw3.pdText}>The complete greige fabric is dyed after weaving. Yarn-wise shade selection is not required.</Text>
                                </View>

                                <Text style={cw3.label}>COMMERCIAL SHADE</Text>
                                <TextInput
                                    value={commercialName}
                                    onChangeText={setCommercialName}
                                    style={cw3.input}
                                    placeholder="e.g. Indigo, Olive, Charcoal"
                                    placeholderTextColor={T.muted}
                                />

                                <View style={cw3.preview}>
                                    <View style={[cw3.previewLine, cw3.pdPreview]}>
                                        <Text style={cw3.pdPreviewText}>
                                            {commercialName.trim() || 'GREIGE / SHADE PREVIEW'}
                                        </Text>
                                    </View>
                                    <Text style={cw3.previewText}>Piece-dyed commercial shade</Text>
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[cw3.save, saving && { opacity: 0.5 }]} disabled={saving} onPress={save}>
                            <Text style={cw3.saveText}>{saving ? 'Saving…' : 'Save Sub Design'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                {!baseDesign && <TouchableOpacity onPress={onNavigateToCatalog}><Text style={s.empty}>Select a Main Design or return to Catalog.</Text></TouchableOpacity>}
            </ScrollView>

            <DesignPickerModal
                visible={showDesignPicker}
                onSelect={d => { loadFull(d); setSubCode(`${d.code.replace(/\s+/g, '-')}-01`); setWarpBands({}); setWeftBands({}); }}
                onClose={() => setShowDesignPicker(false)}
            />
        </>
    );
}

const cw3 = StyleSheet.create({
    intro: { backgroundColor: T.copper + '16', borderWidth: 1, borderColor: T.copper + '55', borderRadius: 10, padding: 12 },
    introTitle: { fontSize: 11, fontWeight: '900', color: T.copper, letterSpacing: 0.7 },
    introText: { fontSize: 11, lineHeight: 16, color: T.ink, marginTop: 4 },
    label: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    section: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 14 },
    pickerText: { fontSize: 14, color: T.ink, fontWeight: '700' },
    input: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: T.ink, fontSize: 14 },
    yarnBlock: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10 },
    yarnHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    dirBadge: { backgroundColor: T.yd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
    dirText: { color: T.yd, fontSize: 9, fontWeight: '900' },
    yarnName: { fontSize: 13, fontWeight: '800', color: T.ink },
    yarnMeta: { fontSize: 10, color: T.muted, marginTop: 2 },
    bandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.sub },
    bandDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: T.border },
    bandName: { flex: 1, fontSize: 12, color: T.ink, fontWeight: '700' },
    bandCount: { fontSize: 12, color: T.copper, fontWeight: '900' },
    remove: { color: T.pd, fontSize: 16, paddingLeft: 8 },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    shadeSelect: { flex: 1, minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10 },
    shadeSelectText: { fontSize: 12, color: T.copper, fontWeight: '700' },
    countInput: { width: 58, backgroundColor: T.sub, borderRadius: 8, paddingVertical: 9, textAlign: 'center', color: T.ink },
    addBandBtn: { backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    addBandText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    swatches: { gap: 7, paddingTop: 10, paddingRight: 10 },
    quickDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: T.border },
    paletteItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
    paletteDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: T.border },
    paletteText: { fontSize: 12, color: T.ink, fontWeight: '700' },
    preview: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10 },
    previewLine: { flexDirection: 'row', minHeight: 42, borderRadius: 7, overflow: 'hidden', backgroundColor: T.sub },
    previewText: { color: T.muted, fontSize: 10, marginTop: 6 },
    pdBox: { backgroundColor: T.sub, borderRadius: 10, padding: 14, marginTop: 16 },
    pdTitle: { fontSize: 11, fontWeight: '900', color: T.ink },
    pdText: { fontSize: 11, lineHeight: 16, color: T.muted, marginTop: 4 },
    pdPreview: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    pdPreviewText: { color: T.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    save: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 4 — YARNS
// ═══════════════════════════════════════════════════════════════
function YarnsTab() {
    const { prpcode, strcode, yearno } = useERP();
    const [yarns, setYarns] = useState<YarnMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'Lea' | 'Ne' | 'Den'>('all');
    const [search, setSearch] = useState('');

    const loadYarns = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const res = await (DesignAPI.yarns as any)({ limit: 100, yearno: yearno, prpcode: prpcode, strcode: strcode, search: q.trim() || undefined });
            setYarns(res?.data?.data || []);
        } catch (e: any) {
            console.log('YARNS TAB ERROR', { message: e?.message, status: e?.response?.status, data: e?.response?.data, baseURL: e?.config?.baseURL, url: e?.config?.url, params: e?.config?.params });
            setYarns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => loadYarns(search), search.trim() ? 350 : 0);
        return () => clearTimeout(t);
    }, [search, loadYarns]);

    const filtered = useMemo(() => filter === 'all' ? yarns : yarns.filter(y => y.sys === filter), [yarns, filter]);
    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <TextInput value={search} onChangeText={setSearch} placeholder="Search yarn name / code / count..." placeholderTextColor={T.muted} style={[ct.search, { marginBottom: 8 }]} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {(['all', 'Lea', 'Ne', 'Den'] as const).map(f => (
                        <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[ct.chip, filter === f && ct.chipActive]}>
                            <Text style={[ct.chipTxt, filter === f && ct.chipTxtActive]}>
                                {f === 'all' ? 'All' : f === 'Lea' ? 'Linen (Lea)' : f === 'Ne' ? 'Cotton (Ne)' : 'Polyester (Den)'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            {loading && <ActivityIndicator color={T.copper} style={{ paddingVertical: 12 }} />}
            <FlatList data={filtered} keyExtractor={(y, idx) => `${y.mi_id}-${idx}`} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
                renderItem={({ item: y }) => (
                    <View style={yn.row}>
                        <View style={[yn.badge, { backgroundColor: y.sys === 'Lea' ? '#E8F4E8' : y.sys === 'Ne' ? '#E8EEF4' : '#F4EEE8' }]}>
                            <Text style={[yn.badgeTxt, { color: y.sys === 'Lea' ? T.green : y.sys === 'Ne' ? T.blue : T.pd }]}>{y.sys}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={yn.name}>{y.name}</Text>
                            <Text style={yn.sub}>{y.mi_id} · {y.cnt} {y.sys === 'Den' ? 'Denier' : 'count'}</Text>
                        </View>
                        <Text style={yn.price}>₹{y.price}/kg</Text>
                    </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border }} />}
                ListEmptyComponent={!loading ? <Text style={s.empty}>No yarns found</Text> : null}
            />
        </View>
    );
}
const yn = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    badge: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    mainCode: { fontSize: 10, fontWeight: '700', color: T.copper, marginTop: 2 },
    price: { fontSize: 13, fontWeight: '700', color: T.copper },
});

// ═══════════════════════════════════════════════════════════════
// TAB 5 — DYEING
// ═══════════════════════════════════════════════════════════════
function DyeingTab({ design }: { design: Design | null }) {
    const [dyeData, setDyeData] = useState<Record<string, { average: number; recent: any[] }>>({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!design) return;
        setLoading(true);
        const all = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
        const unique = [...new Set(all.map(y => y.mi_id))];
        Promise.all(unique.map(miId => DesignAPI.yarnDyeing(miId).then(r => ({ miId, data: r.data.data }))))
            .then(results => { const map: any = {}; results.forEach(r => { map[r.miId] = r.data; }); setDyeData(map); })
            .catch(() => { }).finally(() => setLoading(false));
    }, [design?.id]);
    if (!design) return <View style={s.center}><Text style={s.empty}>Select a design from Catalog</Text></View>;
    if (design.type === 'PD') return <View style={s.center}><Text style={s.empty}>Piece-dyed — dyeing costs are per meter</Text></View>;
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;
    const all = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
    const unique = all.filter((y, i, arr) => arr.findIndex(x => x.mi_id === y.mi_id) === i);
    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Dyeing cost history for {design.code} yarns (YD)</Text>
            {unique.map(y => {
                const d = dyeData[y.mi_id];
                return (
                    <View key={y.mi_id} style={dy.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={dy.name}>{y.name}</Text>
                            <Text style={dy.avg}>Avg ₹{d?.average ?? 0}/kg</Text>
                        </View>
                        {d?.recent?.length > 0 ? d.recent.map((r: any, i: number) => (
                            <View key={i} style={dy.row}>
                                <Text style={dy.rowDate}>{r.created_at?.slice(0, 10)}</Text>
                                <Text style={dy.rowCode}>{r.code}</Text>
                                <Text style={dy.rowAmt}>₹{r.dye_cost}/kg</Text>
                            </View>
                        )) : <Text style={s.empty}>No dyeing history yet</Text>}
                    </View>
                );
            })}
        </ScrollView>
    );
}
const dy = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    avg: { fontSize: 13, fontWeight: '700', color: T.green },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.sub },
    rowDate: { flex: 1, fontSize: 11, color: T.muted },
    rowCode: { fontSize: 11, color: T.ink, marginRight: 8 },
    rowAmt: { fontSize: 12, fontWeight: '700', color: T.copper },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export function DesignsScreen() {
    const context = DEFAULT_ERP_CONTEXT;
    const [tab, setTab] = useState<Tab>('Catalog');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail] = useState<Design | null>(null);
    const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
    const router = useRouter();

    const handleSelectDesign = async (d: Design) => {
        setSelected(d);
        setDetail(d);

        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
        } catch {
            setDetail(d);
        }

        setTab('Design');
    };

    const handleAddSubDesign = async (d: Design) => {
        setSelected(d);

        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
        } catch {
            setDetail(d);
        }

        setTab('Colourway');
    };

    const handleCancelEdit = () => {
        setSelected(null);
        setDetail(null);
    };

    const handleDesignSaved = () => {
        setSelected(null);
        setDetail(null);
        setCatalogRefreshKey(value => value + 1);
        setTab('Catalog');
    };

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };
    return (
        <ERPContext.Provider value={context}>
            <SafeAreaView style={{ flex: 0, backgroundColor: T.nav }} edges={['top']} />
            <StatusBar style="light" backgroundColor={T.nav} />

            <View style={hdr.wrap}>
                {/* <TouchableOpacity onPress={goBack} style={hdr.backBtn}>
                    <Icon name="arrow-back-ios-new" size={18} color="#fff" />
                </TouchableOpacity> */}

                <Text style={hdr.brand}>MADHUSUDHAN FABRICS</Text>
                <Text style={hdr.title}>Designs</Text>

                {selectedDesign && (
                    <Text style={hdr.sub}>
                        Selected: {selectedDesign.code}
                    </Text>
                )}
            </View>

            <TabBar active={tab} onChange={setTab} />

            <View style={{ flex: 1 }}>
                {tab === 'Catalog' && (
                    <CatalogTab
                        key={catalogRefreshKey}
                        onSelectDesign={handleAddSubDesign}
                        onEditDesign={handleSelectDesign}
                    />
                )}

                {tab === 'Design' && (
                    <DesignTab
                        design={detailDesign}
                        onRefresh={handleDesignSaved}
                        onCancelEdit={handleCancelEdit}
                    />
                )}

                {tab === 'Colourway' && (
                    <ColourwayTab
                        design={detailDesign}
                        onNavigateToCatalog={() => setTab('Catalog')}
                    />
                )}

                {tab === 'Yarns' && <YarnsTab />}

                {tab === 'Dyeing' && (
                    <DyeingTab design={detailDesign} />
                )}
            </View>
            {/* </SafeAreaView> */}
        </ERPContext.Provider>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub: { fontSize: 11, color: '#fff', marginTop: 2 },
    backBtn: {
        position: 'absolute',
        left: 15,
        top: 15,
        zIndex: 9999,
        elevation: 9999,
    }
});

const s = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty: { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default DesignsScreen;
