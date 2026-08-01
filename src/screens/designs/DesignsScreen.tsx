// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/DesignsScreen.tsx
// ✅ MERGED VERSION
//    Base UI/structure = original DesignsScreen (Doc 1)
//    Client            = new lightweight client (common/API/client.ts)
//    Save logic        = validated + verified save from Doc 3
//    Navigation        = Doc 3's catalogRefreshKey / handleDesignSaved
//      so that after a successful save the user is taken back to
//      Catalog and the list is force-refreshed.
// ═══════════════════════════════════════════════════════════════
import { useFocusEffect } from '@react-navigation/native';
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
    View
} from 'react-native';
import { useHeaderExtrasStore } from '../../core/layout/headerExtras';
import { usePermission } from '../../core/permissions';
import { T } from '../../theme';
// ✅ CHANGED: import from the new lightweight client instead of legacyClient
// import client, { DesignAPI, ItemAPI, type Design, type GetItem, type YarnMaster } from '../../../common/API/client';
import client, { DesignAPI, ItemAPI, type Design, type GetItem, type YarnMaster } from '../../../common/API/client_fix_design';

const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const f1 = (n: number) => n > 0 ? n.toFixed(1) : '—';

const DESIGN_TABS = [
    { key: 'Aliases', label: 'Aliases', resource: 'designs.aliases' },
    { key: 'Catalog', label: 'Catalog', resource: 'designs.catalog' },
    { key: 'Design', label: 'Design', resource: 'designs.design' },
    { key: 'Colourway', label: 'Colourway', resource: 'designs.colourway' },
    { key: 'Yarns', label: 'Yarns', resource: 'designs.yarns' },
    { key: 'Dyeing', label: 'Dyeing', resource: 'designs.dyeing' },
] as const;

type DesignTabDefinition = typeof DESIGN_TABS[number];
type Tab = DesignTabDefinition['key'];

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
    const wf = ppiLoom > 0 ? ppiTable / ppiLoom : 1;

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
function TabBar({
    active,
    tabs,
    onChange,
}: {
    active: Tab | null;
    tabs: readonly DesignTabDefinition[];
    onChange: (t: Tab) => void;
}) {
    return (
        <View style={tb.bar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tb.inner}>
                {tabs.map(item => (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => onChange(item.key)}
                        style={[tb.tab, active === item.key && tb.tabActive]}
                    >
                        <Text style={[tb.label, active === item.key && tb.labelActive]}>{item.label}</Text>
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
// LIVE SPEC PANEL
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
                        PPI greige = ΣPPI + 2. Greige GSM = greige GLM ÷ width(m).
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

    const loadYarns = useCallback(async (q = '') => {
        if (!visible) return;
        setLoading(true);
        try {
            const res = await (DesignAPI.yarns as any)({
                yearno: yearno,
                prpcode: prpcode,
                strcode: strcode,
                limit: 50,
                search: q.trim() || undefined,
            });
            setYarns(res?.data?.data || []);
            console.log('YARN SEARCH OK', {
                search: q,
                count: res?.data?.data?.length || 0,
                url: res?.config?.url,
                baseURL: res?.config?.baseURL,
                params: res?.config?.params,
            });
        } catch (e: any) {
            console.log('YARN SEARCH ERROR', {
                message: e?.message,
                code: e?.code,
                status: e?.response?.status,
                data: e?.response?.data,
                baseURL: e?.config?.baseURL,
                url: e?.config?.url,
                params: e?.config?.params,
            });
            setYarns([]);
        } finally {
            setLoading(false);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => loadYarns(search), search.trim() ? 350 : 0);
        return () => clearTimeout(t);
    }, [visible, search, loadYarns]);

    const closePicker = () => {
        onClose();
        setSearch('');
        setYarns([]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={closePicker}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>{title}</Text>
                        <TouchableOpacity onPress={closePicker} style={yp.closeBtn}>
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search yarn name / code / count..."
                            placeholderTextColor={T.muted}
                            style={yp.search}
                            autoFocus
                        />
                    </View>
                    {loading && <ActivityIndicator color={T.copper} style={{ paddingVertical: 10 }} />}
                    <View style={yp.listFrame}>
                        <FlatList
                            data={yarns}
                            keyExtractor={(y, idx) => `${y.mi_id}-${idx}`}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item: y }) => (
                                <TouchableOpacity style={yp.row} activeOpacity={0.7}
                                    onPress={() => { onSelect(y); closePicker(); }}>
                                    <Text style={yp.yarnName}>{y.name}</Text>
                                    <Text style={yp.yarnSub}>
                                        Code {y.mi_id} · {y.cnt}/1 {y.sys}{y.price > 0 ? ` · ₹${y.price}/kg` : ''}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />}
                            ListEmptyComponent={!loading ? <Text style={{ padding: 16, color: T.muted, textAlign: 'center' }}>
                                {search.trim() ? 'No yarns found' : 'Type to search yarns, or choose from the first 50 results'}
                            </Text> : null}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </View>
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
            setCategories(list);
        } catch (e: any) {
            setCategories([]);
        } finally {
            setLoading(false);
        }

    }, [visible]);

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
                    <View style={yp.listFrame}>
                        <FlatList
                            data={filteredCategories}
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
            </View>
        </Modal>
    );
}


const yp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: T.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '85%',
        height: '78%', // <-- Add this
    },
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
    listFrame: { height: 430 },
});

// ── Yarn line row ──
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
                    <Text style={yl.sub}>{yarn.cnt}/1 {yarn.sys}</Text>
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
                                        const fab = calcSpec(det);
                                        const hasC = det.epi_total > 0 && (det.reed_space ?? 0) > 0;
                                        const hasG = fab.greigGLM > 0;
                                        return (
                                            <>
                                                {!!det.weave && <Text style={ct.expandWeave}>{det.weave}{det.note ? ` · ${det.note}` : ''}</Text>}
                                                {((det.warp_yarns?.length ?? 0) > 0 || (det.weft_yarns?.length ?? 0) > 0) && (
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
                                                    </>
                                                )}
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
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — DESIGN  (Reed Space input + calculated Greige Width + Live Spec)
// ✅ save() logic below is the validated + verified version (from the
//    second file) adapted to the new lightweight client, which does
//    NOT inject yearno/prpcode/strcode automatically — so we add them
//    to the payload explicitly here.
// ═══════════════════════════════════════════════════════════════
const EMPTY_FORM = {
    code: '', category: '', type: 'YD',
    weave: '', reed_space: 0, greige_width: 0, warp_shrink: 0, gf_shrink: 0,
    fin_width: 58, warp_wastage: 0, weft_wastage: 0,
    warp_yarns: [], weft_yarns: [], selvedge_yarns: [], width_basis: 'reed',
};

function DesignTab({ design, onRefresh, onCancelEdit }: {
    design: Design | null; onRefresh: () => void; onCancelEdit: () => void;
}) {
    // ✅ needed because the new client doesn't auto-attach these
    const { prpcode, strcode, yearno } = useERP();

    const [saving, setSaving] = useState(false);
    const [pickerFor, setPickerFor] = useState<'warp' | 'weft' | 'selvedge' | null>(null);
    const [form, setForm] = useState<any>({ ...EMPTY_FORM });
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

    useEffect(() => {
        if (design) setForm({
            ...EMPTY_FORM, ...design,
            width_basis: (design as any).width_basis ?? 'reed',
            greige_width: (design as any).greige_width ?? 0,
            selvedge_yarns: (design as any).selvedge_yarns ?? [],
            warp_wastage: (design as any).warp_wastage ?? 0,
            weft_wastage: (design as any).weft_wastage ?? 6,
            fin_width: (design as any).fin_width ?? 58,
        });
        else setForm({ ...EMPTY_FORM });
    }, [design?.id]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    // greige width ⇄ reed space, kept in sync live
    const shrinkFrac = (Number(form.warp_shrink) || 0) / 100;
    const autoGreige = (Number(form.reed_space) || 0) * (1 - shrinkFrac);

    const addYarn = (y: YarnMaster, type: 'warp' | 'weft' | 'selvedge') => {
        const key = `${type}_yarns`;
        set(key, [...(form[key] ?? []), {
            mi_id: y.mi_id, itm_code: y.itm_code, m_itm_code: y.m_itm_code, prp_code: y.prp_code, str_code: y.str_code, name: y.name, sys: y.sys, cnt: y.cnt, base_price: y.price,
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

    // ✅ validated + verified save (ported logic)
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
                reed_space: Number(form.reed_space) || 0,
                greige_width: Number(autoGreige) || 0,
                warp_shrink: Number(form.warp_shrink) || 0,
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

            onRefresh();
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

                {/* LIVE SPEC panel (updates as you type) */}
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
            <CategoryPickerModal
                visible={categoryPickerVisible}
                onSelect={(item) => {
                    set('category', item.ItmName);
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
                        <View style={yp.listFrame}>
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
                        </View>
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
                <View style={yp.listFrame}>
                    <FlatList data={filtered} keyExtractor={(x, i) => `${x.color_name}-${x.shade_no || ''}-${i}`}
                        renderItem={({ item }) => <TouchableOpacity style={yp.row} onPress={() => { onSelect(item); onClose(); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.hex || '#808080', borderWidth: 1, borderColor: T.border }} /><View><Text style={yp.yarnName}>{item.color_name}</Text><Text style={yp.yarnSub}>{item.shade_no || ''}</Text></View></View></TouchableOpacity>} />
                </View>
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

// Design Picker Modal (Isolated for AliasesTab)
// function AliasesDesignPickerModal({
//     visible,
//     onSelect,
//     onClose,
// }: {
//     visible: boolean;
//     onSelect: (d: Design) => void;
//     onClose: () => void;
// }) {
//     const { yearno } = useERP();
//     const [designs, setDesigns] = useState<Design[]>([]);
//     const [search, setSearch] = useState('');
//     const [loading, setLoading] = useState(false);

//     const loadDesigns = useCallback(async () => {
//         if (!visible) return;
//         setLoading(true);
//         try {
//             const res = await DesignAPI.list({
//                 page: 1,
//                 per_page: 200,
//                 limit: 200,
//                 yearno: yearno,
//             } as any);
//             const envelope: any = res.data.data;
//             setDesigns(Array.isArray(envelope) ? envelope : (envelope?.data ?? []));
//         } catch (e) {
//             setDesigns([]);
//         } finally {
//             setLoading(false);
//         }
//     }, [visible, yearno]);

//     useEffect(() => {
//         loadDesigns();
//     }, [visible, loadDesigns]);

//     const filteredDesigns = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return !q
//             ? designs
//             : designs.filter(
//                 d =>
//                     d.code.toLowerCase().includes(q) ||
//                     String(d.category || '').toLowerCase().includes(q)
//             );
//     }, [designs, search]);

//     return (
//         <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
//             <View style={styles.modalOverlay}>
//                 <View style={styles.modalSheet}>
//                     <View style={styles.modalHandle} />
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>Select Main Design</Text>
//                         <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
//                             <Text style={styles.modalCloseTxt}>✕</Text>
//                         </TouchableOpacity>
//                     </View>
//                     <View style={styles.modalSearchWrap}>
//                         <TextInput
//                             value={search}
//                             onChangeText={setSearch}
//                             placeholder="Search design..."
//                             placeholderTextColor={T.muted}
//                             style={styles.modalSearch}
//                             autoFocus
//                         />
//                     </View>
//                     {loading ? (
//                         <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
//                     ) : (
//                         <FlatList
//                             data={filteredDesigns}
//                             keyExtractor={d => d.id}
//                             renderItem={({ item }) => (
//                                 <TouchableOpacity
//                                     style={styles.modalRow}
//                                     onPress={() => {
//                                         onSelect(item);
//                                         onClose();
//                                     }}
//                                 >
//                                     <Text style={styles.modalRowName}>{item.code}</Text>
//                                     <Text style={styles.modalRowSub}>
//                                         {item.category} · {item.type}
//                                     </Text>
//                                 </TouchableOpacity>
//                             )}
//                             ItemSeparatorComponent={() => (
//                                 <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />
//                             )}
//                             ListEmptyComponent={
//                                 !loading ? (
//                                     <Text style={styles.modalEmptyText}>No designs found</Text>
//                                 ) : null
//                             }
//                         />
//                     )}
//                 </View>
//             </View>
//         </Modal>
//     );
// }

// // Main AliasesTab Component
// // Main AliasesTab Component
// function AliasesTab({ design }: AliasesTabProps) {
//     // State
//     const [selectedDesign, setSelectedDesign] = useState<Design | null>(design);
//     const [showDesignPicker, setShowDesignPicker] = useState(false);
//     const [aliasInput, setAliasInput] = useState('');
//     const [aliases, setAliases] = useState<Alias[]>([]);
//     const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
//     const [searchQuery, setSearchQuery] = useState('');

//     // refs for auto-scroll
//     const scrollViewRef = useRef<ScrollView>(null);
//     const itemRefs = useRef<Record<string, any>>({});

//     // Load aliases when design changes (simulate API call)
//     useEffect(() => {
//         if (design) {
//             setSelectedDesign(design);
//             setAliases([
//                 { id: '1', name: `${design.code}-ALIAS-1` },
//                 { id: '2', name: `${design.code}-SUMMER` },
//             ]);
//             setEditingAliasId(null);
//             setAliasInput('');
//         } else {
//             setSelectedDesign(null);
//             setAliases([]);
//         }
//     }, [design?.id]);

//     // Filter aliases based on search
//     const filteredAliases = useMemo(() => {
//         return aliases.filter(alias =>
//             alias.name.toLowerCase().includes(searchQuery.toLowerCase())
//         );
//     }, [aliases, searchQuery]);

//     // Load full design details when selected
//     const loadFullDesign = useCallback(async (d: Design) => {
//         try {
//             const res = await DesignAPI.get(d.id);
//             setSelectedDesign({ ...d, ...res.data.data });
//             setAliases([
//                 { id: '1', name: `${d.code}-ALIAS-1` },
//                 { id: '2', name: `${d.code}-SUMMER` },
//             ]);
//             setEditingAliasId(null);
//             setAliasInput('');
//         } catch {
//             setSelectedDesign(d);
//         }
//     }, []);

//     // Scroll helper: jump to a specific alias row in the list
//     const scrollToAlias = useCallback((id: string) => {
//         setTimeout(() => {
//             const node = itemRefs.current[id];
//             const scrollNode = findNodeHandle(scrollViewRef.current);
//             if (node && scrollNode && typeof node.measureLayout === 'function') {
//                 node.measureLayout(
//                     scrollNode,
//                     (_x: number, y: number) => {
//                         scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
//                     },
//                     () => { }
//                 );
//             }
//         }, 100); // small delay so layout is settled after re-render
//     }, []);

//     // Start editing: fills the top "Add New Alias" box and scrolls up to it
//     const handleEditStart = (alias: Alias) => {
//         setEditingAliasId(alias.id);
//         setAliasInput(alias.name);
//         scrollViewRef.current?.scrollTo({ y: 0, animated: true });
//     };

//     // Cancel editing — resets the top box back to "Add" mode
//     const handleEditCancel = () => {
//         setEditingAliasId(null);
//         setAliasInput('');
//     };

//     // Single handler for both Add and Update (dynamic based on editingAliasId)
//     const handleAddOrUpdateAlias = () => {
//         if (!aliasInput.trim()) {
//             Alert.alert('Error', 'Alias name cannot be empty.');
//             return;
//         }
//         if (!selectedDesign) {
//             Alert.alert('Error', 'Please select a main design first.');
//             return;
//         }

//         if (editingAliasId) {
//             // ── UPDATE MODE ──
//             const targetId = editingAliasId;
//             const newName = aliasInput.trim();

//             setAliases(prev =>
//                 prev.map(a => (a.id === targetId ? { ...a, name: newName } : a))
//             );

//             setEditingAliasId(null);
//             setAliasInput('');
//             console.log('Updated alias:', targetId, newName);

//             // auto-scroll back down to that alias's position in the list
//             scrollToAlias(targetId);
//         } else {
//             // ── ADD MODE ──
//             const newAlias: Alias = {
//                 id: Date.now().toString(),
//                 name: aliasInput.trim(),
//             };
//             setAliases(prev => [...prev, newAlias]);
//             setAliasInput('');
//             console.log('Added alias:', newAlias);
//         }
//     };

//     // Delete an alias
//     const handleDeleteAlias = (id: string) => {
//         Alert.alert(
//             'Delete Alias',
//             'Are you sure you want to delete this alias?',
//             [
//                 { text: 'Cancel', style: 'cancel' },
//                 {
//                     text: 'Delete',
//                     style: 'destructive',
//                     onPress: () => {
//                         setAliases(prev => prev.filter(alias => alias.id !== id));
//                         if (editingAliasId === id) {
//                             setEditingAliasId(null);
//                             setAliasInput('');
//                         }
//                         console.log('Deleted alias:', id);
//                     },
//                 },
//             ]
//         );
//     };

//     // Render
//     return (
//         <>
//             <ScrollView
//                 ref={scrollViewRef}
//                 contentContainerStyle={styles.container}
//                 keyboardShouldPersistTaps="handled"
//             >
//                 {/* Header: Selected Design */}
//                 <View style={styles.header}>
//                     <Text style={styles.headerTitle}>Aliases for Design</Text>
//                     <TouchableOpacity
//                         style={styles.picker}
//                         onPress={() => setShowDesignPicker(true)}
//                     >
//                         <Text style={styles.pickerText}>
//                             {selectedDesign ? `${selectedDesign.code} (${selectedDesign.type})` : 'Select Main Design'}
//                         </Text>
//                         <Text style={styles.pickerArrow}>▾</Text>
//                     </TouchableOpacity>
//                 </View>

//                 {/* Add / Update Alias Input — dynamic section */}
//                 <View style={styles.inputContainer}>
//                     <Text style={styles.label}>
//                         {editingAliasId ? 'UPDATE ALIAS' : 'ADD NEW ALIAS'}
//                     </Text>
//                     <View style={styles.inputRow}>
//                         <TextInput
//                             value={aliasInput}
//                             onChangeText={setAliasInput}
//                             placeholder="e.g. RIB-145-NAVY"
//                             placeholderTextColor={T.muted}
//                             style={styles.input}
//                             autoCapitalize="words"
//                         />
//                         <TouchableOpacity style={styles.addButton} onPress={handleAddOrUpdateAlias}>
//                             <Text style={styles.addButtonText}>
//                                 {editingAliasId ? 'Update' : '+ Add'}
//                             </Text>
//                         </TouchableOpacity>
//                     </View>
//                     {editingAliasId && (
//                         <TouchableOpacity onPress={handleEditCancel} style={{ marginTop: 8 }}>
//                             <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>
//                                 Cancel update
//                             </Text>
//                         </TouchableOpacity>
//                     )}
//                 </View>

//                 {/* Search */}
//                 <View style={styles.searchContainer}>
//                     <Text style={styles.label}>SEARCH ALIASES</Text>
//                     <TextInput
//                         value={searchQuery}
//                         onChangeText={setSearchQuery}
//                         placeholder="Search..."
//                         placeholderTextColor={T.muted}
//                         style={styles.searchInput}
//                     />
//                 </View>

//                 {/* Aliases List */}
//                 <View style={styles.listHeader}>
//                     <Text style={styles.listTitle}>ALIASES LIST ({filteredAliases.length})</Text>
//                 </View>

//                 {filteredAliases.length === 0 ? (
//                     <View style={styles.emptyContainer}>
//                         <Text style={styles.emptyText}>No aliases found.</Text>
//                     </View>
//                 ) : (
//                     <View style={styles.listContent}>
//                         {filteredAliases.map((item, idx) => (
//                             <View key={item.id}>
//                                 <View
//                                     ref={(ref) => { itemRefs.current[item.id] = ref; }}
//                                     style={[
//                                         styles.aliasItem,
//                                         editingAliasId === item.id && styles.aliasItemActive,
//                                     ]}
//                                 >
//                                     <View style={styles.aliasRow}>
//                                         <Text style={styles.aliasName}>{item.name}</Text>
//                                         <View style={styles.aliasActions}>
//                                             <TouchableOpacity
//                                                 style={styles.actionButton}
//                                                 onPress={() => handleEditStart(item)}
//                                             >
//                                                 <Text style={styles.actionButtonText}>Edit</Text>
//                                             </TouchableOpacity>
//                                             <TouchableOpacity
//                                                 style={[styles.actionButton, styles.deleteButton]}
//                                                 onPress={() => handleDeleteAlias(item.id)}
//                                             >
//                                                 <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
//                                                     Delete
//                                                 </Text>
//                                             </TouchableOpacity>
//                                         </View>
//                                     </View>
//                                 </View>
//                                 {idx < filteredAliases.length - 1 && <View style={styles.separator} />}
//                             </View>
//                         ))}
//                     </View>
//                 )}

//                 {/* Save Button — logs all aliases with the selected design attached */}
//                 <TouchableOpacity
//                     style={styles.saveButton}
//                     onPress={() => {
//                         const payload = aliases.map(alias => ({
//                             ...alias,
//                             design_id: selectedDesign?.id,
//                             design_code: selectedDesign?.code,
//                         }));
//                         console.log('SAVED ALIASES', payload);
//                         Alert.alert('Success', `Aliases saved for ${selectedDesign?.code || 'design'}.`);
//                     }}
//                 >
//                     <Text style={styles.saveButtonText}>Save Aliases</Text>
//                 </TouchableOpacity>
//             </ScrollView>

//             {/* Isolated Design Picker Modal */}
//             <AliasesDesignPickerModal
//                 visible={showDesignPicker}
//                 onSelect={(d) => {
//                     loadFullDesign(d);
//                     setShowDesignPicker(false);
//                 }}
//                 onClose={() => setShowDesignPicker(false)}
//             />
//         </>
//     );
// }
// // Styles
// const styles = StyleSheet.create({
//     // Modal Styles
//     modalOverlay: {
//         flex: 1,
//         backgroundColor: 'rgba(0,0,0,0.4)',
//         justifyContent: 'flex-end',
//     },
//     modalSheet: {
//         backgroundColor: T.surface,
//         borderTopLeftRadius: 16,
//         borderTopRightRadius: 16,
//         maxHeight: '85%',
//     },
//     modalHandle: {
//         width: 40,
//         height: 4,
//         backgroundColor: T.border,
//         borderRadius: 2,
//         alignSelf: 'center',
//         marginTop: 10,
//     },
//     modalHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         paddingVertical: 14,
//         borderBottomWidth: 1,
//         borderBottomColor: T.border,
//     },
//     modalTitle: {
//         fontSize: 16,
//         fontWeight: '700',
//         color: T.ink,
//     },
//     modalCloseBtn: {
//         padding: 4,
//     },
//     modalCloseTxt: {
//         fontSize: 16,
//         color: T.muted,
//     },
//     modalSearchWrap: {
//         paddingHorizontal: 16,
//         paddingVertical: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: T.border,
//     },
//     modalSearch: {
//         backgroundColor: T.sub,
//         borderRadius: 10,
//         paddingHorizontal: 12,
//         paddingVertical: 9,
//         fontSize: 14,
//         color: T.ink,
//     },
//     modalRow: {
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//     },
//     modalRowName: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: T.ink,
//     },
//     modalRowSub: {
//         fontSize: 12,
//         color: T.muted,
//         marginTop: 2,
//     },
//     modalEmptyText: {
//         padding: 16,
//         color: T.muted,
//         textAlign: 'center',
//     },

//     // Main Container
//     container: {
//         padding: 14,
//         paddingBottom: 30,
//         backgroundColor: T.bg,
//     },
//     header: {
//         marginBottom: 16,
//     },
//     headerTitle: {
//         fontSize: 11,
//         fontWeight: '900',
//         color: T.ink,
//         letterSpacing: 0.8,
//         marginBottom: 8,
//     },
//     picker: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         padding: 14,
//     },
//     pickerText: {
//         fontSize: 14,
//         fontWeight: '700',
//         color: T.ink,
//     },
//     pickerArrow: {
//         fontSize: 14,
//         color: T.muted,
//     },
//     inputContainer: {
//         marginBottom: 16,
//     },
//     label: {
//         fontSize: 10,
//         fontWeight: '800',
//         color: T.muted,
//         letterSpacing: 0.5,
//         marginBottom: 6,
//     },
//     inputRow: {
//         flexDirection: 'row',
//         gap: 8,
//     },
//     input: {
//         flex: 1,
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         paddingHorizontal: 14,
//         paddingVertical: 12,
//         fontSize: 14,
//         color: T.ink,
//     },
//     addButton: {
//         backgroundColor: T.copper,
//         borderRadius: 10,
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     addButtonText: {
//         color: '#fff',
//         fontSize: 14,
//         fontWeight: '700',
//     },
//     searchContainer: {
//         marginBottom: 16,
//     },
//     searchInput: {
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         paddingHorizontal: 14,
//         paddingVertical: 12,
//         fontSize: 14,
//         color: T.ink,
//     },
//     listHeader: {
//         marginBottom: 8,
//     },
//     listTitle: {
//         fontSize: 11,
//         fontWeight: '900',
//         color: T.ink,
//         letterSpacing: 0.8,
//     },
//     aliasItem: {
//         backgroundColor: T.surface,
//         borderRadius: 10,
//         borderWidth: 1,
//         borderColor: T.border,
//         padding: 12,
//     },
//     aliasItemActive: {
//         borderColor: T.copper,
//         borderWidth: 2,
//     },
//     aliasRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     aliasName: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: T.ink,
//         flex: 1,
//     },
//     aliasActions: {
//         flexDirection: 'row',
//         gap: 8,
//     },
//     actionButton: {
//         backgroundColor: T.sub,
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//     },
//     actionButtonText: {
//         fontSize: 12,
//         fontWeight: '700',
//         color: T.copper,
//     },
//     deleteButton: {
//         backgroundColor: '#FBF3E3',
//         borderWidth: 1,
//         borderColor: '#EAD9B0',
//     },
//     deleteButtonText: {
//         color: '#7A5C1E',
//     },
//     editRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 8,
//     },
//     editInput: {
//         flex: 1,
//         backgroundColor: T.sub,
//         borderWidth: 1,
//         borderColor: T.copper,
//         borderRadius: 8,
//         paddingHorizontal: 10,
//         paddingVertical: 8,
//         fontSize: 14,
//         color: T.ink,
//     },
//     editButton: {
//         backgroundColor: T.copper,
//         borderRadius: 8,
//         padding: 8,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     editButtonText: {
//         color: '#fff',
//         fontSize: 14,
//         fontWeight: '800',
//     },
//     separator: {
//         height: 1,
//         backgroundColor: T.border,
//         marginVertical: 4,
//     },
//     listContent: {
//         paddingVertical: 4,
//     },
//     emptyContainer: {
//         alignItems: 'center',
//         padding: 20,
//     },
//     emptyText: {
//         fontSize: 13,
//         color: T.muted,
//     },
//     saveButton: {
//         backgroundColor: T.copper,
//         borderRadius: 10,
//         paddingVertical: 14,
//         alignItems: 'center',
//         marginTop: 20,
//     },
//     saveButtonText: {
//         color: '#fff',
//         fontSize: 15,
//         fontWeight: '800',
//     },
// });
type DesignAliasRow = {
    client_id: string;
    dsn_code: string | null;
    dsn_name: string;
    original_name: string;
    operation: 'unchanged' | 'create' | 'update' | 'delete';
};

const unwrapAliasPayload = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

function AliasesDesignPickerModal({
    visible,
    onSelect,
    onClose,
}: {
    visible: boolean;
    onSelect: (d: Design) => void;
    onClose: () => void;
}) {
    const { yearno } = useERP();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const loadDesigns = useCallback(async (nextPage = 1, append = false) => {
        if (!visible) return;
        setLoading(true);
        try {
            const response = await DesignAPI.list({
                page: nextPage,
                per_page: 50,
                limit: 50,
                yearno,
                search: search.trim() || undefined,
            } as any);
            const body: any = response.data;
            const rows: Design[] = Array.isArray(body?.data)
                ? body.data
                : Array.isArray(body?.data?.data)
                    ? body.data.data
                    : [];
            const meta = body?.meta ?? body?.data?.meta ?? {};
            setDesigns(previous => append ? [...previous, ...rows] : rows);
            setPage(nextPage);
            setHasMore(Boolean(meta.has_more));
        } catch (error: any) {
            setDesigns([]);
            Alert.alert(
                'Design help unavailable',
                String(error?.response?.data?.message || error?.message || 'Unable to load designs.')
            );
        } finally {
            setLoading(false);
        }
    }, [visible, yearno, search]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => loadDesigns(1, false), search.trim() ? 350 : 0);
        return () => clearTimeout(timer);
    }, [visible, search, loadDesigns]);

    const close = () => {
        setSearch('');
        setDesigns([]);
        setPage(1);
        setHasMore(false);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, styles.aliasDesignSheet]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Main Design</Text>
                        <TouchableOpacity onPress={close} style={styles.modalCloseBtn}>
                            <Text style={styles.modalCloseTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalSearchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search design code / category / weave..."
                            placeholderTextColor={T.muted}
                            style={styles.modalSearch}
                            autoFocus
                        />
                    </View>

                    {/* Fixed-height result frame: search never changes sheet height. */}
                    <View style={styles.aliasDesignListFrame}>
                        {loading && designs.length === 0 ? (
                            <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
                        ) : (
                            <FlatList
                                data={designs}
                                keyExtractor={item => item.id}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.modalRow}
                                        onPress={() => { onSelect(item); close(); }}
                                    >
                                        <Text style={styles.modalRowName}>{item.code}</Text>
                                        <Text style={styles.modalRowSub}>{item.category} · {item.type}</Text>
                                    </TouchableOpacity>
                                )}
                                ItemSeparatorComponent={() => (
                                    <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />
                                )}
                                ListEmptyComponent={!loading ? (
                                    <Text style={styles.modalEmptyText}>No designs found</Text>
                                ) : null}
                                ListFooterComponent={hasMore ? (
                                    <TouchableOpacity
                                        disabled={loading}
                                        onPress={() => loadDesigns(page + 1, true)}
                                        style={styles.aliasLoadMore}
                                    >
                                        <Text style={styles.aliasLoadMoreText}>
                                            {loading ? 'Loading…' : 'Load more'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function AliasesTab({ design }: { design: Design | null }) {
    const { yearno, prpcode } = useERP();
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(design);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [aliasInput, setAliasInput] = useState('');
    const [aliases, setAliases] = useState<DesignAliasRow[]>([]);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadAliases = useCallback(async (selected: Design) => {
        setLoading(true);
        try {
            const response = await client.get(`/design-aliases/${encodeURIComponent(selected.id)}`, {
                params: { yearno, prpcode },
            });
            const envelope = unwrapAliasPayload(response.data);
            const rows = Array.isArray(envelope?.aliases) ? envelope.aliases : [];
            setAliases(rows.map((row: any) => ({
                client_id: `erp_${String(row.dsn_code)}`,
                dsn_code: String(row.dsn_code),
                dsn_name: String(row.dsn_name || ''),
                original_name: String(row.dsn_name || ''),
                operation: 'unchanged' as const,
            })));
        } catch (error: any) {
            setAliases([]);
            Alert.alert(
                'Aliases unavailable',
                String(error?.response?.data?.message || error?.message || 'Unable to load aliases.')
            );
        } finally {
            setLoading(false);
        }
    }, [yearno, prpcode]);

    const selectDesign = useCallback((selected: Design) => {
        setSelectedDesign(selected);
        setAliasInput('');
        setEditingClientId(null);
        setSearchQuery('');
        void loadAliases(selected);
    }, [loadAliases]);

    useEffect(() => {
        if (design?.id) selectDesign(design);
    }, [design?.id, selectDesign]);

    const visibleAliases = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return aliases.filter(row => {
            if (row.operation === 'delete') return false;
            return !query || row.dsn_name.toLowerCase().includes(query);
        });
    }, [aliases, searchQuery]);

    const beginEdit = (row: DesignAliasRow) => {
        setEditingClientId(row.client_id);
        setAliasInput(row.dsn_name);
    };

    const cancelEdit = () => {
        setEditingClientId(null);
        setAliasInput('');
    };

    const addOrUpdate = () => {
        const name = aliasInput.trim();
        if (!selectedDesign) {
            Alert.alert('Select design', 'Please select a Main Design first.');
            return;
        }
        if (!name) {
            Alert.alert('Alias required', 'Enter the new alias name.');
            return;
        }
        if (name.length > 40) {
            Alert.alert('Alias too long', 'Alias name cannot exceed 40 characters.');
            return;
        }

        const duplicate = aliases.some(row =>
            row.operation !== 'delete' &&
            row.client_id !== editingClientId &&
            row.dsn_name.trim().toUpperCase() === name.toUpperCase()
        );
        if (duplicate) {
            Alert.alert('Duplicate alias', 'This alias name is already present in the array.');
            return;
        }

        if (editingClientId) {
            setAliases(previous => previous.map(row => {
                if (row.client_id !== editingClientId) return row;
                const nextOperation = row.dsn_code === null
                    ? 'create'
                    : name.toUpperCase() === row.original_name.toUpperCase()
                        ? 'unchanged'
                        : 'update';
                return { ...row, dsn_name: name, operation: nextOperation };
            }));
            cancelEdit();
            return;
        }

        setAliases(previous => [...previous, {
            client_id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            dsn_code: null,
            dsn_name: name,
            original_name: '',
            operation: 'create',
        }]);
        setAliasInput('');
    };

    const deleteAlias = (row: DesignAliasRow) => {
        Alert.alert('Delete Alias', 'This will soft delete the saved ERP alias when you press Save Aliases.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setAliases(previous => row.dsn_code === null
                        ? previous.filter(item => item.client_id !== row.client_id)
                        : previous.map(item => item.client_id === row.client_id
                            ? { ...item, operation: 'delete' }
                            : item
                        )
                    );
                    if (editingClientId === row.client_id) cancelEdit();
                },
            },
        ]);
    };

    const saveAliases = async () => {
        if (!selectedDesign) {
            Alert.alert('Select design', 'Please select a Main Design first.');
            return;
        }

        const changes = aliases
            .filter(row => row.operation !== 'unchanged')
            .map(row => ({
                dsn_code: row.dsn_code,
                dsn_name: row.dsn_name,
                operation: row.operation,
            }));

        if (changes.length === 0) {
            Alert.alert('No changes', 'Add, edit, or delete an alias before saving.');
            return;
        }

        setSaving(true);
        try {
            const response = await client.post('/design-aliases/save', {
                yearno,
                prpcode,
                design_id: selectedDesign.id,
                aliases: changes,
            });
            if (response?.data?.success !== true) {
                throw new Error(response?.data?.message || 'Alias save failed.');
            }
            await loadAliases(selectedDesign);
            cancelEdit();
            Alert.alert('Saved', 'Aliases saved successfully in DAPDesign.');
        } catch (error: any) {
            Alert.alert(
                'Alias save failed',
                String(error?.response?.data?.message || error?.message || 'Unable to save aliases.')
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>ALIASES FOR DESIGN</Text>
                    <TouchableOpacity style={styles.picker} onPress={() => setShowDesignPicker(true)}>
                        <Text style={styles.pickerText} numberOfLines={1}>
                            {selectedDesign ? `${selectedDesign.code} (${selectedDesign.type})` : 'Select Main Design'}
                        </Text>
                        <Text style={styles.pickerArrow}>▾</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{editingClientId ? 'UPDATE ALIAS' : 'ADD NEW ALIAS'}</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            value={aliasInput}
                            onChangeText={setAliasInput}
                            placeholder="Enter customer alias name"
                            placeholderTextColor={T.muted}
                            style={styles.input}
                            maxLength={40}
                            autoCapitalize="characters"
                            editable={Boolean(selectedDesign) && !saving}
                        />
                        <TouchableOpacity
                            style={[styles.addButton, (!selectedDesign || saving) && { opacity: 0.45 }]}
                            disabled={!selectedDesign || saving}
                            onPress={addOrUpdate}
                        >
                            <Text style={styles.addButtonText}>{editingClientId ? 'Update' : '+ Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    {editingClientId && (
                        <TouchableOpacity onPress={cancelEdit} style={{ marginTop: 8 }}>
                            <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>Cancel update</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.searchContainer}>
                    <Text style={styles.label}>SEARCH ALIASES</Text>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search added aliases..."
                        placeholderTextColor={T.muted}
                        style={styles.searchInput}
                    />
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>ALIASES LIST ({visibleAliases.length})</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
                ) : visibleAliases.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {selectedDesign ? 'No active aliases found.' : 'Select a Main Design to load aliases.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContent}>
                        {visibleAliases.map((row, index) => (
                            <View key={row.client_id}>
                                <View style={[
                                    styles.aliasItem,
                                    editingClientId === row.client_id && styles.aliasItemActive,
                                ]}>
                                    <View style={styles.aliasRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.aliasName}>{row.dsn_name}</Text>
                                            <Text style={styles.aliasCodeText}>
                                                {row.dsn_code ? `ERP code ${row.dsn_code}` : 'New · pending save'}
                                            </Text>
                                        </View>
                                        <View style={styles.aliasActions}>
                                            <TouchableOpacity style={styles.actionButton} onPress={() => beginEdit(row)}>
                                                <Text style={styles.actionButtonText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.deleteButton]}
                                                onPress={() => deleteAlias(row)}
                                            >
                                                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                {index < visibleAliases.length - 1 && <View style={styles.separator} />}
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, (!selectedDesign || saving) && { opacity: 0.45 }]}
                    disabled={!selectedDesign || saving}
                    onPress={saveAliases}
                >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Aliases'}</Text>
                </TouchableOpacity>
            </ScrollView>

            <AliasesDesignPickerModal
                visible={showDesignPicker}
                onSelect={selectDesign}
                onClose={() => setShowDesignPicker(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: T.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    aliasDesignSheet: { height: '78%' },
    aliasDesignListFrame: { height: 430 },
    modalHandle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: T.ink },
    modalCloseBtn: { padding: 4 },
    modalCloseTxt: { fontSize: 16, color: T.muted },
    modalSearchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    modalSearch: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    modalRow: { paddingHorizontal: 16, paddingVertical: 12 },
    modalRowName: { fontSize: 14, fontWeight: '600', color: T.ink },
    modalRowSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    modalEmptyText: { padding: 16, color: T.muted, textAlign: 'center' },
    aliasLoadMore: { padding: 14, alignItems: 'center' },
    aliasLoadMoreText: { color: T.copper, fontWeight: '700' },
    container: { padding: 14, paddingBottom: 30, backgroundColor: T.bg },
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8, marginBottom: 8 },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 14 },
    pickerText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
    pickerArrow: { marginLeft: 8, fontSize: 14, color: T.muted },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    inputRow: { flexDirection: 'row', gap: 8 },
    input: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    addButton: { backgroundColor: T.copper, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    searchContainer: { marginBottom: 16 },
    searchInput: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    listHeader: { marginBottom: 8 },
    listTitle: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8 },
    aliasItem: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    aliasItemActive: { borderColor: T.copper, borderWidth: 2 },
    aliasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    aliasName: { fontSize: 14, fontWeight: '600', color: T.ink },
    aliasCodeText: { marginTop: 3, fontSize: 10, color: T.muted },
    aliasActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
    actionButton: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    actionButtonText: { fontSize: 12, fontWeight: '700', color: T.copper },
    deleteButton: { backgroundColor: '#FBF3E3', borderWidth: 1, borderColor: '#EAD9B0' },
    deleteButtonText: { color: '#7A5C1E' },
    separator: { height: 1, backgroundColor: T.border, marginVertical: 4 },
    listContent: { paddingVertical: 4 },
    emptyContainer: { alignItems: 'center', padding: 20 },
    emptyText: { fontSize: 13, color: T.muted },
    saveButton: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// Export
//   export { AliasesTab };

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
            <View style={yp.listFrame}>
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
        </View>
    );
}
const yn = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    badge: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
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
// ✅ Adds catalogRefreshKey / handleDesignSaved so that a successful
//    save takes the user back to Catalog and force-refreshes the list.
// ═══════════════════════════════════════════════════════════════
export function DesignsScreen() {
    const context = DEFAULT_ERP_CONTEXT;
    const { canAccess } = usePermission();
    const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
    const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);
    const [tab, setTab] = useState<Tab | null>('Catalog');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail] = useState<Design | null>(null);
    const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

    // One permission-aware source drives the tab header and tab content.
    // A developer only adds a tab to DESIGN_TABS and the registry definition.
    const visibleTabs = useMemo(
        () => DESIGN_TABS.filter(item => canAccess(item.resource)),
        [canAccess],
    );

    const firstAllowedTab = visibleTabs[0]?.key ?? null;

    // FIX: this screen used to render its own hand-rolled header ("MADHUSUDHAN
    // FABRICS" / "Designs" / "Selected: ...") completely separately from
    // AppHeader — that was the second navy header block stacking under the
    // Designs tab. The header is now rendered once, in
    // app/new/(tabs)/_layout.tsx; only the "Selected: code" subtitle still
    // needs to reach it, via the shared extras store.
    useFocusEffect(
        useCallback(() => {
            setHeaderExtras({ subtitle: selectedDesign ? `Selected: ${selectedDesign.code}` : null });
            return () => clearHeaderExtras();
        }, [selectedDesign, setHeaderExtras, clearHeaderExtras]),
    );

    const openTab = useCallback((nextTab: Tab) => {
        const definition = DESIGN_TABS.find(item => item.key === nextTab);
        if (definition && canAccess(definition.resource)) {
            setTab(nextTab);
            return true;
        }
        setTab(firstAllowedTab);
        return false;
    }, [canAccess, firstAllowedTab]);

    // Live permission changes are applied without logout. If the active tab is
    // denied, move to the first allowed tab and never render denied content.
    useEffect(() => {
        if (visibleTabs.length === 0) {
            if (tab !== null) setTab(null);
            return;
        }

        const activeIsAllowed = tab !== null && visibleTabs.some(item => item.key === tab);
        if (!activeIsAllowed) setTab(firstAllowedTab);
    }, [firstAllowedTab, tab, visibleTabs]);

    const handleSelectDesign = async (d: Design) => {
        setSelected(d);
        setDetail(d);
        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
            console.log('design res', res);
        } catch { }

        openTab('Design');
    };

    const handleAddSubDesign = async (d: Design) => {
        setSelected(d);
        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
        } catch {
            setDetail(d);
        }
        openTab('Colourway');
    };

    const handleCancelEdit = () => {
        setSelected(null);
        setDetail(null);
    };

    const handleDesignSaved = () => {
        setSelected(null);
        setDetail(null);
        setCatalogRefreshKey(v => v + 1);
        openTab('Catalog');
    };

    return (
        <ERPContext.Provider value={context}>
            <View style={{ flex: 1, backgroundColor: T.bg }}>
                {visibleTabs.length > 0 ? (
                    <>
                        <TabBar active={tab} tabs={visibleTabs} onChange={openTab} />
                        <View style={{ flex: 1 }}>
                            {tab === 'Aliases' && canAccess('designs.aliases') && <AliasesTab design={detailDesign} />}
                            {tab === 'Catalog' && canAccess('designs.catalog') && (
                                <CatalogTab
                                    key={catalogRefreshKey}
                                    onSelectDesign={handleAddSubDesign}
                                    onEditDesign={handleSelectDesign}
                                />
                            )}
                            {tab === 'Design' && canAccess('designs.design') && (
                                <DesignTab
                                    design={detailDesign}
                                    onRefresh={handleDesignSaved}
                                    onCancelEdit={handleCancelEdit}
                                />
                            )}
                            {tab === 'Colourway' && canAccess('designs.colourway') && (
                                <ColourwayTab
                                    design={detailDesign}
                                    onNavigateToCatalog={() => openTab('Catalog')}
                                />
                            )}
                            {tab === 'Yarns' && canAccess('designs.yarns') && <YarnsTab />}
                            {tab === 'Dyeing' && canAccess('designs.dyeing') && <DyeingTab design={detailDesign} />}
                        </View>
                    </>
                ) : (
                    <View style={s.center}>
                        <Text style={s.empty}>You do not have access to any Design tab.</Text>
                    </View>
                )}
            </View>
        </ERPContext.Provider>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub: { fontSize: 11, color: '#fff', marginTop: 2 },
});

const s = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty: { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default DesignsScreen;