// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/DesignsScreen.tsx
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, FlatList, TextInput,
    TouchableOpacity, StyleSheet, Alert, RefreshControl,
    ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../../common/utils/theme';
import { DesignAPI, type Design, type SubDesign, type YarnMaster } from '../../../common/API/client';

const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const f1 = (n: number) => n > 0 ? n.toFixed(1) : '—';

const TABS = ['Catalog', 'Design', 'Colourway', 'Yarns', 'Dyeing'] as const;
type Tab = typeof TABS[number];

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

// ── calcFabric ────────────────────────────────────────────────
function calcFabric(d: Design & { epi_total: number; ppi_total: number }) {
    const epiLoom = d.epi_total ?? 0;
    const ppiLoom = d.ppi_total ?? 0;
    const warpShk = d.warp_shrink ?? 0;
    const gfShk = d.gf_shrink ?? 0;
    const reedSpace = d.reed_space ?? 0;
    const finWidth = d.fin_width ?? 0;
    const epiGreige = epiLoom * (1 + warpShk / 100);
    const epiFinished = epiGreige * (1 + gfShk / 100);
    const ppiGreige = ppiLoom * (1 + warpShk / 100);
    const ppiFinished = ppiGreige * (1 + gfShk / 100);
    const widthGreige = reedSpace * (1 - warpShk / 100);
    const widthFin = finWidth > 0 ? finWidth : widthGreige * (1 - gfShk / 100);
    const totalEnds = epiLoom * reedSpace;
    const gpmLea = (cnt: number) => 453.592 / (cnt * 300 * 0.9144);
    const gpmNe = (cnt: number) => 453.592 / (cnt * 840 * 0.9144);
    const gpmDen = (cnt: number) => cnt / 9000;
    const widthGreigeM = widthGreige * 0.0254;
    let warpGLM = 0;
    (d.warp_yarns ?? []).forEach((y: any) => {
        const cnt = Number(y.cnt); const epi = Number(y.epi);
        if (!cnt || cnt <= 0 || !epi) return;
        const ends = epi * reedSpace;
        if (y.sys === 'Lea') warpGLM += ends * gpmLea(cnt);
        else if (y.sys === 'Ne') warpGLM += ends * gpmNe(cnt);
        else if (y.sys === 'Den') warpGLM += ends * gpmDen(cnt);
    });
    let weftGLM = 0;
    (d.weft_yarns ?? []).forEach((y: any) => {
        const cnt = Number(y.cnt); const ppi = Number(y.ppi);
        if (!cnt || cnt <= 0 || !ppi) return;
        const picksPerM = ppi / 0.0254;
        if (y.sys === 'Lea') weftGLM += picksPerM * widthGreigeM * gpmLea(cnt);
        else if (y.sys === 'Ne') weftGLM += picksPerM * widthGreigeM * gpmNe(cnt);
        else if (y.sys === 'Den') weftGLM += picksPerM * widthGreigeM * gpmDen(cnt);
    });
    const greigGLM = warpGLM + weftGLM;
    const greigGSM = widthGreigeM > 0 ? greigGLM / widthGreigeM : 0;
    const finGLM = gfShk > 0 ? greigGLM / (1 - gfShk / 100) : greigGLM;
    const finWidthM = (finWidth > 0 ? finWidth : widthGreige) * 0.0254;
    const finGSM = finWidthM > 0 ? finGLM / finWidthM : 0;
    return { epiGreige, epiFinished, ppiGreige, ppiFinished, widthGreige, widthFin, totalEnds, greigGLM, greigGSM, finGLM, finGSM };
}

// ── fibreBlend ────────────────────────────────────────────────
function fibreBlend(d: Design) {
    const all = [...(d.warp_yarns ?? []), ...(d.weft_yarns ?? [])];
    if (!all.length) return null;
    const totals: Record<string, number> = {};
    let grand = 0;
    all.forEach((y: any) => {
        const key = y.sys === 'Lea' ? 'Linen' : y.sys === 'Ne' ? 'Cotton' : y.sys === 'Den' ? 'Polyester' : 'Other';
        totals[key] = (totals[key] ?? 0) + 1; grand++;
    });
    const colors: Record<string, string> = { Linen: '#C8A96E', Cotton: '#A8C8A0', Polyester: '#A0B8C8', Other: '#C8A8B0' };
    return { totals, grand, colors };
}

// ═══════════════════════════════════════════════════════════════
// SHARED: Yarn Picker Modal
// ═══════════════════════════════════════════════════════════════
function YarnPickerModal({ visible, yarns, title = 'Select yarn', onSelect, onClose }: {
    visible: boolean; yarns: YarnMaster[];
    title?: string;
    onSelect: (y: YarnMaster) => void; onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return yarns;
        return yarns.filter(y => y.name.toLowerCase().includes(q) || y.sys.toLowerCase().includes(q) || String(y.cnt).includes(q));
    }, [yarns, search]);
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>{title}</Text>
                        <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={yp.closeBtn}>
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="Search..."
                            placeholderTextColor={T.muted} style={yp.search} autoFocus />
                    </View>
                    <FlatList data={filtered} keyExtractor={y => y.mi_id} keyboardShouldPersistTaps="handled"
                        renderItem={({ item: y }) => (
                            <TouchableOpacity style={yp.row} activeOpacity={0.7}
                                onPress={() => { onSelect(y); onClose(); setSearch(''); }}>
                                <Text style={yp.yarnName}>{y.name}</Text>
                                <Text style={yp.yarnSub}>{y.cnt}/1 {y.sys}{y.price > 0 ? ` · ₹${y.price}/kg` : ''}</Text>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />}
                        ListEmptyComponent={<Text style={{ padding: 16, color: T.muted, textAlign: 'center' }}>No yarns found</Text>}
                        contentContainerStyle={{ paddingBottom: 40 }}
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
});

// ── Yarn line row ─────────────────────────────────────────────
function YarnLineRow({ yarn, type, onChange, onRemove }: {
    yarn: any; type: 'warp' | 'weft';
    onChange: (k: string, v: any) => void; onRemove: () => void;
}) {
    const key = type === 'warp' ? 'epi' : 'ppi';
    const lbl = type === 'warp' ? 'EPI' : 'PPI';
    return (
        <View style={yl.row}>
            <View style={{ flex: 1 }}>
                <Text style={yl.name}>{yarn.name}</Text>
                <Text style={yl.sub}>{yarn.cnt}/1 {yarn.sys}</Text>
            </View>
            <View style={yl.epiWrap}>
                <TextInput value={String(yarn[key] ?? '')} onChangeText={v => onChange(key, parseFloat(v) || 0)}
                    keyboardType="numeric" style={yl.epiInput} />
                <Text style={yl.epiLabel}>{lbl}</Text>
            </View>
            <TouchableOpacity onPress={onRemove} style={{ paddingLeft: 8 }}>
                <Text style={{ color: T.pd, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
        </View>
    );
}
const yl = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, gap: 8 },
    name: { fontSize: 13, fontWeight: '600', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    epiWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    epiInput: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: T.ink, width: 56, textAlign: 'center' },
    epiLabel: { fontSize: 11, color: T.muted, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 1 — CATALOG
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ onSelectDesign }: { onSelectDesign: (d: Design) => void }) {
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
            const res = await DesignAPI.list({ category: filter !== 'All' ? filter : undefined, search: search || undefined, page, limit: 50 });
            const envelope = (res.data as any).data;
            const rows: Design[] = Array.isArray(envelope) ? envelope : (envelope?.data ?? []);
            console.log("response",res)
            setDesigns(prev => page === 1 ? rows : [...prev, ...rows]);
            setTotalPages(envelope?.total_pages ?? 1);
            setTotal(envelope?.total ?? rows.length);
            setCurrentPage(page);
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, [filter, search]);

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
                    {['All', 'Shirting', 'Sportswear', 'Suiting'].map(c => (
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
                                    {/* <Text style={ct.rowSub}>{SHORT(d.category)} · {d.epi_total}×{d.ppi_total} · {d.cw_count} cw</Text> */}
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
                                        const fab = calcFabric(det);
                                        const blend = fibreBlend(det);
                                        const hasC = det.epi_total > 0 && det.reed_space > 0;
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
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
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
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.ppiGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{f1(fab.ppiFinished)}</Text>
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>Width"</Text>
                                                                <Text style={ct.tableCell}>{det.reed_space}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.widthGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{det.fin_width > 0 ? det.fin_width : '—'}</Text>
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
                                                {blend && (
                                                    <View style={{ marginTop: 14 }}>
                                                        <Text style={ct.expandSec}>FIBRE BLEND</Text>
                                                        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                                                            {Object.entries(blend.totals).map(([k, v]) => (
                                                                <View key={k} style={{ flex: v / blend.grand, backgroundColor: blend.colors[k] ?? '#888' }} />
                                                            ))}
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                                            {Object.entries(blend.totals).map(([k, v]) => (
                                                                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: blend.colors[k] ?? '#888' }} />
                                                                    <Text style={{ fontSize: 10, color: T.muted }}>{k} {Math.round(v / blend.grand * 100)}%</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}
                                                <TouchableOpacity style={{ marginTop: 12 }}>
                                                    <Text style={{ fontSize: 12, color: T.copper, fontWeight: '600' }}>▸ Formula basis</Text>
                                                </TouchableOpacity>
                                                {!!det.latest_cost && (
                                                    <View style={ct.latestCostRow}>
                                                        <Text style={ct.latestCostTxt}>Latest cost</Text>
                                                        <Text style={ct.latestCostVal}>{r0(det.latest_cost)}/m</Text>
                                                    </View>
                                                )}
                                                <View style={ct.cwRow}>
                                                    <Text style={ct.cwTitle}>COLOURWAYS ({det.cw_count ?? 0})</Text>
                                                    <TouchableOpacity style={ct.cwAddBtn} onPress={() => onSelectDesign(det)}>
                                                        <Text style={ct.cwAddTxt}>+ Add colourway</Text>
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


function DesignTab({ design, onRefresh }: { design: Design | null; onRefresh: () => void }) {
    const [allYarns, setAllYarns] = useState<YarnMaster[]>([]);
    const [saving, setSaving] = useState(false);
    const [pickerFor, setPickerFor] = useState<'warp' | 'weft' | 'selvedge' | null>(null);
    const [form, setForm] = useState<any>({
        code: '', category: 'Linen Shirting', type: 'YD',
        weave: '', reed_space: 64, warp_shrink: 6, gf_shrink: 5,
        fin_width: 0, warp_wastage: 0, weft_wastage: 6,
        warp_yarns: [], weft_yarns: [], selvedge_yarns: [], width_basis: 'reed',
    });

    useEffect(() => { DesignAPI.yarns().then(r => setAllYarns(r.data.data)).catch(() => { }); }, []);
    useEffect(() => {
        if (design) setForm({ ...design, width_basis: 'reed', selvedge_yarns: (design as any).selvedge_yarns ?? [], warp_wastage: (design as any).warp_wastage ?? 0, weft_wastage: (design as any).weft_wastage ?? 6 });
        else setForm({ code: '', category: 'Linen Shirting', type: 'YD', weave: '', reed_space: 64, warp_shrink: 6, gf_shrink: 5, fin_width: 0, warp_wastage: 0, weft_wastage: 6, warp_yarns: [], weft_yarns: [], selvedge_yarns: [], width_basis: 'reed' });
    }, [design?.id]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const addYarn = (y: YarnMaster, type: 'warp' | 'weft' | 'selvedge') => {
        const key = `${type}_yarns`;
        set(key, [...(form[key] ?? []), { mi_id: y.mi_id, name: y.name, sys: y.sys, cnt: y.cnt, base_price: y.price, blend_ratio: null, ...(type === 'warp' ? { epi: 60 } : type === 'weft' ? { ppi: 52 } : { epi: 0 }) }]);
    };
    const updateYarn = (type: string, idx: number, k: string, v: any) => {
        const key = `${type}_yarns`; const list = [...(form[key] ?? [])];
        list[idx] = { ...list[idx], [k]: v }; set(key, list);
    };
    const removeYarn = (type: string, idx: number) =>
        set(`${type}_yarns`, (form[`${type}_yarns`] ?? []).filter((_: any, i: number) => i !== idx));
    const save = async () => {
        setSaving(true);
        try {
            if (design?.id) await DesignAPI.update(design.id, form);
            else await DesignAPI.create(form);
            Alert.alert('Saved', 'Design saved successfully'); onRefresh();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSaving(false); }
    };
    const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} style={[fm.chip, active && fm.chipActive]}>
            <Text style={[fm.chipTxt, active && fm.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
    );
    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <Text style={fm.label}>DESIGN CODE</Text>
                <TextInput value={form.code ?? ''} onChangeText={v => set('code', v)} placeholder="e.g. Cambridge" placeholderTextColor={T.muted} style={fm.input} />
                <Text style={fm.label}>CATEGORY</Text>
                <View style={fm.chipRow}>
                    {[['Shirting', 'Linen Shirting'], ['Sportswear', 'Sportswear'], ['Suiting', 'Linen Suiting']].map(([label, val]) => (
                        <Chip key={val} label={label} active={form.category === val} onPress={() => set('category', val)} />
                    ))}
                </View>
                <Text style={fm.label}>DYE TYPE</Text>
                <View style={fm.chipRow}>
                    <Chip label="Yarn Dyed" active={form.type === 'YD'} onPress={() => set('type', 'YD')} />
                    <Chip label="Piece Dyed" active={form.type === 'PD'} onPress={() => set('type', 'PD')} />
                </View>
                <Text style={fm.label}>WEAVE / STRUCTURE</Text>
                <TextInput value={form.weave ?? ''} onChangeText={v => set('weave', v)} placeholder="e.g. Dobby — fine dobby" placeholderTextColor={T.muted} style={fm.input} />
                <Text style={fm.label}>WIDTH BASIS</Text>
                <Text style={fm.hint}>how you enter the warp width</Text>
                <View style={fm.chipRow}>
                    <Chip label="Reed space" active={form.width_basis === 'reed'} onPress={() => set('width_basis', 'reed')} />
                    <Chip label="Greige width" active={form.width_basis === 'greige'} onPress={() => set('width_basis', 'greige')} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>REED SPACE</Text>
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
                    <YarnLineRow key={i} yarn={y} type="warp" onChange={(k, v) => updateYarn('selvedge', i, k, v)} onRemove={() => removeYarn('selvedge', i)} />
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
                            <TextInput value={form.fin_width ? String(form.fin_width) : ''} onChangeText={v => set('fin_width', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="58" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>"</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>FINISH SHRINK</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.gf_shrink ?? '5')} onChangeText={v => set('gf_shrink', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="5" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={[fm.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                    <Text style={fm.saveTxt}>{saving ? 'Saving…' : design ? 'Save design' : 'Create design'}</Text>
                </TouchableOpacity>
            </ScrollView>
            <YarnPickerModal visible={pickerFor !== null} yarns={allYarns}
                onSelect={y => pickerFor && addYarn(y, pickerFor)}
                onClose={() => setPickerFor(null)} />
        </>
    );
}
const fm = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    hint: { fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 6 },
    input: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unit: { fontSize: 14, color: T.muted, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipTxt: { fontSize: 13, fontWeight: '600', color: T.muted },
    chipTxtActive: { color: '#fff' },
    addBtn: { borderWidth: 1.5, borderColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
    addBtnTxt: { fontSize: 14, fontWeight: '700', color: T.copper },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — COLOURWAY
// ═══════════════════════════════════════════════════════════════

// Design picker for Colourway tab base design selection
function DesignPickerModal({ visible, onSelect, onClose }: {
    visible: boolean;
    onSelect: (d: Design) => void;
    onClose: () => void;
}) {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        DesignAPI.list({ limit: 200 } as any)
            .then(r => {
                const envelope = (r.data as any).data;
                const rows = Array.isArray(envelope) ? envelope : (envelope?.data ?? []);
                setDesigns(rows);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [visible]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return designs;
        return designs.filter(d => d.code.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }, [designs, search]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>Base design</Text>
                        <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={yp.closeBtn}>
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="Search..."
                            placeholderTextColor={T.muted} style={yp.search} autoFocus />
                    </View>
                    {loading ? <ActivityIndicator color={T.copper} style={{ padding: 24 }} /> : (
                        <FlatList data={filtered} keyExtractor={d => d.id} keyboardShouldPersistTaps="handled"
                            renderItem={({ item: d }) => (
                                <TouchableOpacity style={[yp.row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                    activeOpacity={0.7}
                                    onPress={() => { onSelect(d); onClose(); setSearch(''); }}>
                                    <View>
                                        <Text style={yp.yarnName}>{d.code}</Text>
                                        <Text style={yp.yarnSub}>{SHORT(d.category)}</Text>
                                    </View>
                                    <TypeBadge type={d.type} />
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

// Shade picker modal
function ShadePickerModal({ visible, onSelect, onClose }: {
    visible: boolean;
    onSelect: (shade: { color_name: string; hex: string; shade_no?: string }) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');

    // Mock shade data — replace with API call when shade endpoint available
    const shades = [
        { color_name: 'Navy', hex: '#1B2A6B', suppliers: [{ name: 'Rainbow Dyechem', shade_no: 'RB-Navy-2231', code: 'SH-1001' }, { name: 'Colortex', shade_no: '12-NAVY', code: 'SH-1002' }] },
        { color_name: 'White', hex: '#FFFFFF', suppliers: [{ name: 'Spectrum Dyes', shade_no: 'OBA-Bright', code: 'SH-1003' }] },
        { color_name: 'Sky Blue', hex: '#87CEEB', suppliers: [{ name: 'Rainbow Dyechem', shade_no: 'RB-Sky-1180', code: 'SH-1004' }] },
        { color_name: 'Royal Blue', hex: '#4169E1', suppliers: [{ name: 'Colortex', shade_no: '22-ROYAL', code: 'SH-1005' }] },
        { color_name: 'Black', hex: '#000000', suppliers: [{ name: 'Spectrum Dyes', shade_no: 'SP-Jet-990', code: 'SH-1006' }] },
        { color_name: 'Charcoal', hex: '#36454F', suppliers: [{ name: 'Spectrum Dyes', shade_no: 'SP-Char-400', code: 'SH-1007' }] },
        { color_name: 'Indigo Navy', hex: '#003153', suppliers: [{ name: 'Rainbow Dyechem', shade_no: 'RB-Indigo-500', code: 'SH-1008' }, { name: 'Colortex', shade_no: 'IND-NAVY', code: 'SH-1009' }] },
        { color_name: 'Olive', hex: '#808000', suppliers: [{ name: 'Spectrum Dyes', shade_no: 'SP-Olive-22', code: 'SH-1010' }] },
        { color_name: 'Beige', hex: '#F5F5DC', suppliers: [{ name: 'Rainbow Dyechem', shade_no: 'RB-Beige-100', code: 'SH-1011' }] },
        { color_name: 'Red', hex: '#CC0000', suppliers: [{ name: 'Colortex', shade_no: 'RED-202', code: 'SH-1012' }] },
    ];

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return shades;
        return shades.filter(s =>
            s.color_name.toLowerCase().includes(q) ||
            s.suppliers.some(sp => sp.name.toLowerCase().includes(q) || sp.shade_no.toLowerCase().includes(q))
        );
    }, [search]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>Select dyed shade</Text>
                        <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={yp.closeBtn}>
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch}
                            placeholder="Search colour, code or company..."
                            placeholderTextColor={T.muted} style={yp.search} autoFocus />
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingBottom: 40 }}>
                        {filtered.map((shade, si) => (
                            <View key={si}>
                                {/* Color group header */}
                                <View style={sd.groupHdr}>
                                    <View style={[sd.colorDot, { backgroundColor: shade.hex, borderWidth: shade.hex === '#FFFFFF' ? 1 : 0, borderColor: T.border }]} />
                                    <Text style={sd.colorName}>{shade.color_name}</Text>
                                    <Text style={sd.supplierCount}>{shade.suppliers.length} supplier{shade.suppliers.length > 1 ? 's' : ''}</Text>
                                </View>
                                {/* Supplier rows */}
                                {shade.suppliers.map((sp, spi) => (
                                    <TouchableOpacity key={spi} style={sd.supplierRow} activeOpacity={0.7}
                                        onPress={() => { onSelect({ color_name: shade.color_name, hex: shade.hex, shade_no: sp.shade_no }); onClose(); setSearch(''); }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={sd.supplierName}>{sp.name}</Text>
                                            <Text style={sd.shadeNo}>Shade no. {sp.shade_no}</Text>
                                        </View>
                                        <Text style={sd.shadeCode}>{sp.code}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
const sd = StyleSheet.create({
    groupHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: T.bg },
    colorDot: { width: 20, height: 20, borderRadius: 10 },
    colorName: { fontSize: 14, fontWeight: '700', color: T.ink, flex: 1 },
    supplierCount: { fontSize: 11, color: T.muted },
    supplierRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, paddingLeft: 44, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
    supplierName: { fontSize: 13, fontWeight: '600', color: T.copper },
    shadeNo: { fontSize: 11, color: T.muted, marginTop: 2 },
    shadeCode: { fontSize: 12, fontWeight: '700', color: T.copper },
});

function ColourwayTab({ design, onNavigateToCatalog }: { design: Design | null; onNavigateToCatalog: () => void }) {
    const [baseDesign, setBaseDesign] = useState<Design | null>(design);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [shadePickerFor, setShadePickerFor] = useState<{ yarnIdx: number; yarnType: 'warp' | 'weft' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [subCode, setSubCode] = useState('');
    const [selectedShades, setSelectedShades] = useState<Record<string, any>>({});

    useEffect(() => {
        if (design) {
            setBaseDesign(design);
            // auto-generate sub-design code
            const base = design.code?.replace(/\s+/g, '-') ?? 'Design';
            setSubCode(`${base}-01`);
        }
    }, [design?.id]);

    const warpYarns = baseDesign?.warp_yarns ?? [];
    const weftYarns = baseDesign?.weft_yarns ?? [];

    const save = async () => {
        if (!baseDesign) { Alert.alert('Error', 'Select a base design first'); return; }
        setSaving(true);
        try {
            const warpColors = warpYarns.map((y: any, i: number) => ({
                mi_id: y.mi_id, ...(selectedShades[`warp_${i}`] ?? {})
            }));
            const weftColors = weftYarns.map((y: any, i: number) => ({
                mi_id: y.mi_id, ...(selectedShades[`weft_${i}`] ?? {})
            }));
            await DesignAPI.addColourway(baseDesign.id, {
                code: subCode,
                warp_colors: warpColors,
                weft_colors: weftColors,
            } as any);
            Alert.alert('Saved', 'Colourway saved successfully');
            setSelectedShades({});
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSaving(false); }
    };

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

                {/* BASE DESIGN picker */}
                <Text style={cw2.label}>BASE DESIGN</Text>
                <TouchableOpacity style={cw2.picker} onPress={() => setShowDesignPicker(true)}>
                    <Text style={[cw2.pickerTxt, !baseDesign && { color: T.muted }]}>
                        {baseDesign ? `${baseDesign.code} (${baseDesign.type})` : 'Select main design'}
                    </Text>
                    <Text style={{ color: T.muted }}>▾</Text>
                </TouchableOpacity>

                {baseDesign && (
                    <>
                        {/* SUB-DESIGN CODE */}
                        <Text style={cw2.label}>SUB-DESIGN CODE</Text>
                        <Text style={cw2.hint}>auto-generated from the main design — non-editable, no duplicates</Text>
                        <View style={cw2.codeRow}>
                            <View style={cw2.codeBadge}>
                                <Text style={cw2.codeBadgeTxt}>{baseDesign.code}</Text>
                            </View>
                            <Text style={cw2.codeVal}>{subCode}</Text>
                            <Text style={cw2.codeAuto}>AUTO</Text>
                        </View>

                        {/* WARP YARNS — assign shade */}
                        {warpYarns.length > 0 && (
                            <>
                                <Text style={cw2.label}>WARP YARNS</Text>
                                <Text style={cw2.hint}>assign a dyed shade to each yarn</Text>
                                {warpYarns.map((y: any, i: number) => {
                                    const shade = selectedShades[`warp_${i}`];
                                    return (
                                        <View key={i} style={cw2.yarnShadeRow}>
                                            <View style={cw2.yarnBadge}>
                                                <Text style={cw2.yarnBadgeTxt}>WARP</Text>
                                            </View>
                                            <Text style={cw2.yarnNm} numberOfLines={1}>{y.name}</Text>
                                            {y.blend_ratio ? (
                                                <View style={cw2.blendBadge}>
                                                    <Text style={cw2.blendTxt}>{y.blend_ratio}</Text>
                                                </View>
                                            ) : null}
                                            <TouchableOpacity style={[cw2.shadeBtn, shade && { backgroundColor: shade.hex + '30', borderColor: shade.hex }]}
                                                onPress={() => setShadePickerFor({ yarnIdx: i, yarnType: 'warp' })}>
                                                {shade ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: shade.hex }} />
                                                        <Text style={[cw2.shadeBtnTxt, { color: T.ink }]}>{shade.color_name}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={cw2.shadeBtnTxt}>Select shade ▾</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </>
                        )}

                        {/* WEFT YARNS — assign shade */}
                        {weftYarns.length > 0 && (
                            <>
                                <Text style={cw2.label}>WEFT YARNS</Text>
                                {weftYarns.map((y: any, i: number) => {
                                    const shade = selectedShades[`weft_${i}`];
                                    return (
                                        <View key={i} style={cw2.yarnShadeRow}>
                                            <View style={[cw2.yarnBadge, { backgroundColor: T.pd + '20' }]}>
                                                <Text style={[cw2.yarnBadgeTxt, { color: T.pd }]}>WEFT</Text>
                                            </View>
                                            <Text style={cw2.yarnNm} numberOfLines={1}>{y.name}</Text>
                                            {y.blend_ratio ? (
                                                <View style={cw2.blendBadge}>
                                                    <Text style={cw2.blendTxt}>{y.blend_ratio}</Text>
                                                </View>
                                            ) : null}
                                            <TouchableOpacity style={[cw2.shadeBtn, shade && { backgroundColor: shade.hex + '30', borderColor: shade.hex }]}
                                                onPress={() => setShadePickerFor({ yarnIdx: i, yarnType: 'weft' })}>
                                                {shade ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: shade.hex }} />
                                                        <Text style={[cw2.shadeBtnTxt, { color: T.ink }]}>{shade.color_name}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={cw2.shadeBtnTxt}>Select shade ▾</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </>
                        )}

                        {/* PREVIEW box */}
                        <View style={cw2.previewBox}>
                            <View style={cw2.previewSwatch} />
                            <View style={{ flex: 1 }}>
                                <Text style={cw2.previewLabel}>PREVIEW</Text>
                                <Text style={cw2.previewSub}>
                                    Warp — {Object.entries(selectedShades).filter(([k]) => k.startsWith('warp')).map(([, v]: any) => v.color_name).join(' / ') || '—'} / Weft — {Object.entries(selectedShades).filter(([k]) => k.startsWith('weft')).map(([, v]: any) => v.color_name).join(' / ') || '—'}
                                </Text>
                            </View>
                        </View>

                        {/* Save */}
                        <TouchableOpacity style={[cw2.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                            <Text style={cw2.saveTxt}>{saving ? 'Saving…' : 'Save colourway'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                {!baseDesign && (
                    <View style={s.center}>
                        <Text style={s.empty}>Select a base design to add a colourway</Text>
                        <TouchableOpacity onPress={onNavigateToCatalog} style={{ marginTop: 12 }}>
                            <Text style={{ color: T.copper, fontWeight: '700', fontSize: 14 }}>Browse Catalog →</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Design picker modal */}
            <DesignPickerModal
                visible={showDesignPicker}
                onSelect={d => { setBaseDesign(d); const base = d.code?.replace(/\s+/g, '-') ?? 'Design'; setSubCode(`${base}-01`); }}
                onClose={() => setShowDesignPicker(false)}
            />

            {/* Shade picker modal */}
            <ShadePickerModal
                visible={shadePickerFor !== null}
                onSelect={shade => {
                    if (!shadePickerFor) return;
                    const key = `${shadePickerFor.yarnType}_${shadePickerFor.yarnIdx}`;
                    setSelectedShades(prev => ({ ...prev, [key]: shade }));
                    setShadePickerFor(null);
                }}
                onClose={() => setShadePickerFor(null)}
            />
        </>
    );
}
const cw2 = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    hint: { fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 6 },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 14 },
    pickerTxt: { fontSize: 14, fontWeight: '600', color: T.ink },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12 },
    codeBadge: { backgroundColor: T.sub, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    codeBadgeTxt: { fontSize: 11, fontWeight: '700', color: T.muted },
    codeVal: { flex: 1, fontSize: 15, fontWeight: '800', color: T.ink },
    codeAuto: { fontSize: 10, color: T.muted, fontWeight: '600' },
    yarnShadeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    yarnBadge: { backgroundColor: T.yd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeTxt: { fontSize: 9, fontWeight: '800', color: T.yd },
    yarnNm: { flex: 1, fontSize: 12, fontWeight: '600', color: T.ink },
    blendBadge: { backgroundColor: T.green + '30', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    blendTxt: { fontSize: 9, fontWeight: '700', color: T.green },
    shadeBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    shadeBtnTxt: { fontSize: 12, color: T.copper, fontWeight: '600' },
    previewBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12, marginTop: 16 },
    previewSwatch: { width: 60, height: 60, borderRadius: 8, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
    previewLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5 },
    previewSub: { fontSize: 12, color: T.muted, marginTop: 4 },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 4 — YARNS
// ═══════════════════════════════════════════════════════════════
function YarnsTab() {
    const [yarns, setYarns] = useState<YarnMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'Lea' | 'Ne' | 'Den'>('all');
    useEffect(() => { DesignAPI.yarns().then(r => setYarns(r.data.data)).catch(() => { }).finally(() => setLoading(false)); }, []);
    const filtered = useMemo(() => filter === 'all' ? yarns : yarns.filter(y => y.sys === filter), [yarns, filter]);
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;
    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
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
            <FlatList data={filtered} keyExtractor={y => y.mi_id} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
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
    const [tab, setTab] = useState<Tab>('Catalog');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail] = useState<Design | null>(null);

    const handleSelectDesign = async (d: Design) => {
        setSelected(d); setDetail(d);
        try { const res = await DesignAPI.get(d.id); setDetail({ ...d, ...res.data.data }); } catch { }
        setTab('Design');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
            <View style={hdr.wrap}>
                <Text style={hdr.brand}>MADHUSUDHAN FABRICS</Text>
                <Text style={hdr.title}>Designs</Text>
                {selectedDesign && <Text style={hdr.sub}>Selected: {selectedDesign.code}</Text>}
            </View>
            <TabBar active={tab} onChange={setTab} />
            <View style={{ flex: 1 }}>
                {tab === 'Catalog' && <CatalogTab onSelectDesign={handleSelectDesign} />}
                {tab === 'Design' && <DesignTab design={detailDesign} onRefresh={() => selectedDesign && handleSelectDesign(selectedDesign)} />}
                {tab === 'Colourway' && <ColourwayTab design={detailDesign} onNavigateToCatalog={() => setTab('Catalog')} />}
                {tab === 'Yarns' && <YarnsTab />}
                {tab === 'Dyeing' && <DyeingTab design={detailDesign} />}
            </View>
        </SafeAreaView>
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
