import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, FlatList, RefreshControl, Modal, Share,
} from 'react-native';
// SafeAreaView import removed — no longer used, the tabs layout now owns
// the top safe-area inset for every tab screen (see (tabs)/_layout.tsx).
import { T } from '../../theme';
import { CostingAPI, DesignAPI, type CostInputs, type ComputeResult, type Design, type SubDesign, type YarnMaster } from '../../api/legacyClient';

// ── formatters ───────────────────────────────────────────────
const r2 = (n: number) => `₹${n.toFixed(2)}`;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number) => `${Math.round(n)}%`;

// ── Tab bar ──────────────────────────────────────────────────
const TABS = ['Costing', 'History', 'Variance'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    return (
        <View style={tb.bar}>
            {TABS.map(t => (
                <TouchableOpacity key={t} onPress={() => onChange(t)}
                    style={[tb.tab, active === t && tb.tabActive]}>
                    <Text style={[tb.label, active === t && tb.labelActive]}>{t}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
const tb = StyleSheet.create({
    bar: { flexDirection: 'row', backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: T.copper },
    label: { fontSize: 13, fontWeight: '600', color: T.muted },
    labelActive: { color: T.ink, fontWeight: '700' },
});

// ── Design picker ────────────────────────────────────────────
function DesignPicker({ value, onSelect }: { value: string; onSelect: (d: Design) => void }) {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        DesignAPI.list().then(r => setDesigns(r.data.data)).catch(() => { });
    }, []);

    const current = designs?.find(d => d.id === value);
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return q ? designs.filter(d =>
            d.code.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
        ) : designs;
    }, [designs, search]);

    const label = current
        ? `${current.code} · ${current.category.replace('Linen ', '')} (${current.type})`
        : 'Select design…';

    return (
        <View style={dp.wrap}>
            <Text style={dp.fieldLabel}>DESIGN</Text>
            <TouchableOpacity style={[dp.trigger, open && dp.triggerOpen]}
                onPress={() => { setOpen(o => !o); setSearch(''); }} activeOpacity={0.7}>
                <Text style={[dp.triggerTxt, !current && dp.triggerPh]}>{label}</Text>
                <Text style={dp.arrow}>{open ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {open && (
                <View style={dp.sheet}>
                    <TextInput value={search} onChangeText={setSearch}
                        placeholder="Search design…" placeholderTextColor={T.muted}
                        style={dp.search} autoFocus />
                    <ScrollView style={{ maxHeight: 220 }}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={false}>
                        {filtered.map(d => (
                            <TouchableOpacity key={d.id}
                                style={[dp.row, d.id === value && dp.rowActive]}
                                onPress={() => { onSelect(d); setOpen(false); }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[dp.rowCode, d.id === value && { color: T.copper }]}>{d.code}</Text>
                                    <Text style={dp.rowSub}>{d.category.replace('Linen ', '')}</Text>
                                </View>
                                <View style={{ backgroundColor: d.type === 'YD' ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: d.type === 'YD' ? T.yd : T.pd }}>{d.type}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {filtered.length === 0 && <Text style={dp.empty}>No designs match</Text>}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
const dp = StyleSheet.create({
    wrap: { marginBottom: 4 },
    fieldLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    trigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13 },
    triggerOpen: { borderColor: T.copper },
    triggerTxt: { flex: 1, fontSize: 14, color: T.ink, fontWeight: '600' },
    triggerPh: { color: T.muted, fontWeight: '400' },
    arrow: { fontSize: 13, color: T.muted },
    sheet: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginTop: 4, overflow: 'hidden', zIndex: 99 },
    search: { margin: 10, backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: T.ink },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.border },
    rowActive: { backgroundColor: T.sub },
    rowCode: { fontSize: 14, fontWeight: '700', color: T.ink },
    rowSub: { fontSize: 11, color: T.muted, marginTop: 1 },
    empty: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },
});

// ── Input field ──────────────────────────────────────────────
function Inp({ value, onChange, suffix }: { value: string; onChange: (v: string) => void; suffix?: string }) {
    return (
        <View style={inp.wrap}>
            <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad"
                style={inp.field} placeholderTextColor={T.muted} />
            {suffix && <Text style={inp.suffix}>{suffix}</Text>}
        </View>
    );
}
const inp = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 11 },
    field: { flex: 1, fontSize: 15, color: T.ink },
    suffix: { fontSize: 11, color: T.muted, marginLeft: 4 },
});

// ── Result row ───────────────────────────────────────────────
function ResRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontSize: 12, color: T.muted }}>{label}</Text>
            <Text style={{ fontSize: 13, fontWeight: highlight ? '800' : '600', color: highlight ? T.copper : T.ink }}>{value}</Text>
        </View>
    );
}



function CostSheetPreviewModal({
    visible,
    onClose,
    design,
    result,
    onSave,
    saving,
}: {
    visible: boolean;
    onClose: () => void;
    design: Design | null;
    result: ComputeResult | null;
    onSave: () => void;
    saving: boolean;
}) {
    if (!design || !result) return null;

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-GB').replace(/\//g, '/');
    const gsm = Math.round((result.snap_greige_glm / (result.greige_width || 1)) * 100);
    const shareText = [
        'ESTIMATED FABRIC COST',
        `Design: ${design.code}`,
        `Type: ${design.type}`,
        `GSM: ${gsm}`,
        `Greige width: ${result.greige_width?.toFixed(1)}\"`,
        `Raw material: ${r2(result.snap_rm)}`,
        `Weaving: ${r2(result.snap_weaving_cost)}`,
        `Greige price/m: ${r2(result.snap_greige_price)}`,
        `Finished price/m: ${r2(result.snap_final_cost)}`,
    ].join('\n');

    const doShare = async () => {
        try {
            await Share.share({ message: shareText });
        } catch (e: any) {
            Alert.alert('Share Error', e?.message || 'Unable to share costing');
        }
    };

    const YarnTable = ({ title, rows }: { title: string; rows: any[] }) => (
        <View style={pm.block}>
            <Text style={pm.blockTitle}>{title}</Text>
            <View style={pm.tableHead}>
                <Text style={[pm.th, { flex: 1.7 }]}>Yarn</Text>
                <Text style={pm.th}>Count/Den</Text>
                <Text style={pm.th}>{title.startsWith('WARP') ? 'EPI' : 'PPI'}</Text>
                <Text style={pm.th}>g/m</Text>
                <Text style={pm.th}>Rate</Text>
                <Text style={pm.th}>Cost</Text>
            </View>
            {rows.map((r, i) => (
                <View key={`${r.mi_id}-${i}`} style={pm.tr}>
                    <Text style={[pm.td, { flex: 1.7 }]} numberOfLines={1}>{r.name || r.mi_id}</Text>
                    <Text style={pm.td}>{Math.round(Number(r.cnt || 0))}{String(r.sys || '').toUpperCase().startsWith('DEN') ? 'D' : r.sys}</Text>
                    <Text style={pm.td}>{r.yarn_type === 'warp' ? r.epi : r.ppi}</Text>
                    <Text style={pm.td}>{Math.round(Number(r.grams_per_metre || 0))}</Text>
                    <Text style={pm.td}>₹{Math.round(Number(r.rate || 0))}</Text>
                    <Text style={[pm.td, pm.money]}>{r2(Number(r.cost || 0))}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={pm.overlay}>
                <View style={pm.sheet}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                        <Text style={pm.title}>ESTIMATED FABRIC COST</Text>
                        <View style={pm.metaRow}>
                            <Text style={pm.meta}>Design: <Text style={pm.bold}>{design.code}</Text></Text>
                            <Text style={pm.meta}>Type: <Text style={pm.bold}>{design.type === 'PD' ? 'Piece-dyed' : 'Yarn-dyed'}</Text></Text>
                        </View>
                        <View style={pm.metaRow}>
                            <Text style={pm.meta}>Date: <Text style={pm.bold}>{dateLabel}</Text></Text>
                            <Text style={pm.meta}>GSM: <Text style={pm.bold}>{gsm}</Text></Text>
                            <Text style={pm.meta}>Greige width: <Text style={pm.bold}>{result.greige_width?.toFixed(1)}\"</Text></Text>
                        </View>
                        {!!design.weave && <Text style={pm.meta}>Weave: <Text style={pm.bold}>{design.weave}</Text></Text>}

                        <View style={pm.line} />
                        <YarnTable title={`WARP · Reed ${design.reed_space} · EPI ${result.warp_rows?.[0]?.epi ?? ''}`} rows={result.warp_rows || []} />
                        <YarnTable title={`WEFT · PPI loom ${result.snap_ppi_loom} / fabric ${result.snap_ppi_table}`} rows={result.weft_rows || []} />

                        <View style={pm.block}>
                            <Text style={pm.blockTitle}>BUILD-UP · per metre</Text>
                            <PreviewRow label="Total yarn cost" value={r2(result.snap_rm)} strong />
                            <PreviewRow label={`Weaving (${result.snap_ppi_table} picks)`} value={r2(result.snap_weaving_cost)} />
                            <PreviewRow label="Greige mfg cost" value={r2(result.snap_greige_mfg)} strong />
                            <PreviewRow label="Greige brokerage" value={r2(result.snap_greige_brok_amt)} />
                            <PreviewRow label="Greige price /m" value={r2(result.snap_greige_price)} strong />
                            {result.snap_has_fin && (
                                <>
                                    <PreviewRow label="Shrinkage impact" value={r2(result.shrink_impact)} />
                                    <PreviewRow label="Dyeing / processing" value={r2(result.dye_proc_amount)} />
                                    <PreviewRow label="Finished brokerage" value={r2(result.fin_brok_amt)} />
                                    <PreviewRow label="Cutting / packing" value={r2(result.cut_pack)} />
                                    <PreviewRow label="Finished price /m" value={r2(result.snap_final_cost)} strong />
                                </>
                            )}
                        </View>

                        <View style={pm.twoCards}>
                            <View style={pm.smallCard}>
                                <Text style={pm.smallLabel}>DAILY CONVERSION</Text>
                                <Text style={pm.smallText}>Prod / day: <Text style={pm.bold}>{result.snap_prod_day?.toFixed(0)} m</Text></Text>
                                <Text style={pm.smallText}>Conversion / day: <Text style={pm.bold}>{r0(result.snap_prod_day * result.snap_final_cost)}</Text></Text>
                            </View>
                            <View style={pm.smallCard}>
                                <Text style={pm.smallLabel}>CONTRIBUTION</Text>
                                <Text style={pm.smallText}>RM: <Text style={pm.bold}>{pct(result.snap_rm_pct)}</Text></Text>
                                <Text style={pm.smallText}>Weaving: <Text style={pm.bold}>{pct(result.snap_weave_pct)}</Text></Text>
                            </View>
                        </View>

                        <Text style={pm.footer}>Madhusudhan Fabrics · estimated cost · wastage & selvedge rules as configured</Text>
                    </ScrollView>

                    <View style={pm.actions}>
                        <TouchableOpacity style={pm.closeBtn} onPress={onClose}><Text style={pm.closeTxt}>Close</Text></TouchableOpacity>
                        <TouchableOpacity style={pm.shareBtn} onPress={doShare}><Text style={pm.actionTxt}>WhatsApp</Text></TouchableOpacity>
                        <TouchableOpacity style={[pm.saveBtn, saving && { opacity: 0.55 }]} onPress={onSave} disabled={saving}>
                            <Text style={pm.actionTxt}>{saving ? 'Saving…' : 'Save costing'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <View style={pm.previewRow}>
            <Text style={[pm.previewLabel, strong && { fontWeight: '800', color: T.ink }]}>{label}</Text>
            <Text style={[pm.previewValue, strong && { color: T.copper }]}>{value}</Text>
        </View>
    );
}

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    sheet: { width: '100%', maxHeight: '92%', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
    title: { fontSize: 17, fontWeight: '900', color: T.ink, textAlign: 'center', marginBottom: 12 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    meta: { fontSize: 11, color: T.ink },
    bold: { fontWeight: '900', color: T.ink },
    line: { height: 1, backgroundColor: T.border, marginVertical: 10 },
    block: { marginBottom: 12 },
    blockTitle: { fontSize: 10, color: T.copper, fontWeight: '900', letterSpacing: 0.5, marginBottom: 7 },
    tableHead: { flexDirection: 'row', backgroundColor: T.sub, paddingVertical: 6, paddingHorizontal: 5 },
    th: { flex: 1, fontSize: 8.5, color: T.muted, fontWeight: '900', textAlign: 'right' },
    tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: T.border },
    td: { flex: 1, fontSize: 9.5, color: T.ink, textAlign: 'right' },
    money: { fontWeight: '900' },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    previewLabel: { fontSize: 11, color: T.muted },
    previewValue: { fontSize: 11, color: T.ink, fontWeight: '900' },
    twoCards: { flexDirection: 'row', gap: 8, marginTop: 4 },
    smallCard: { flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 10 },
    smallLabel: { fontSize: 8.5, color: T.muted, fontWeight: '900', marginBottom: 5 },
    smallText: { fontSize: 10, color: T.ink, marginTop: 2 },
    footer: { fontSize: 8.5, color: T.muted, textAlign: 'center', marginTop: 7 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    closeBtn: { flex: 0.8, backgroundColor: T.sub, borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
    shareBtn: { flex: 1, backgroundColor: T.green, borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
    saveBtn: { flex: 1.2, backgroundColor: T.copper, borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
    closeTxt: { color: T.ink, fontSize: 12, fontWeight: '900' },
    actionTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 1 — COSTING
// ═══════════════════════════════════════════════════════════════
const DEFAULT_P: Omit<CostInputs, 'price_map' | 'dye_map'> = {
    weaving_rate: 0.45, rpm: 400, eff: 85,
    greige_brok: 2, dyeing_proc: 40, finished_brok: 3, cut_pack: 10,
};

function CostingTab({ onSaved }: { onSaved: () => void }) {
    const [mdId, setMdId] = useState('');
    const [design, setDesign] = useState<Design | null>(null);
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});
    const [dyeMap, setDyeMap] = useState<Record<string, number>>({});
    const [params, setParams] = useState({ ...DEFAULT_P });
    const [result, setResult] = useState<ComputeResult | null>(null);
    const [computing, setComputing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // build yarn key
    const yKey = (miId: string, br: string | null) => `${miId}|${br ?? ''}`;

    // load design details + init price map
    const handleSelectDesign = async (d: Design) => {
        try {
            const res = await DesignAPI.get(d.id);
            const full = res.data.data;
            setDesign(full);
            setMdId(full.id);
            setResult(null);

            // init price map from base prices
            const pm: Record<string, number> = {};
            const dm: Record<string, number> = {};
            [...full.warp_yarns, ...full.weft_yarns].forEach(y => {
                const k = yKey(y.mi_id, y.blend_ratio);
                if (!(k in pm)) { pm[k] = y.base_price; dm[k] = 0; }
            });
            setPriceMap(pm);
            setDyeMap(dm);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // live compute
    const compute = useCallback(async () => {
        if (!mdId || !design) return;
        setComputing(true);
        try {
            const res = await CostingAPI.compute({
                md_id: mdId, price_map: priceMap, dye_map: dyeMap, ...params,
            });
            setResult(res.data.data);
        } catch (e: any) {
            Alert.alert('Compute Error', e.message);
        } finally {
            setComputing(false);
        }
    }, [mdId, priceMap, dyeMap, params]);

    // debounce compute on input changes
    useEffect(() => {
        if (!mdId) return;
        const t = setTimeout(compute, 600);
        return () => clearTimeout(t);
    }, [mdId, priceMap, dyeMap, params]);

    const save = async () => {
        if (!result) { Alert.alert('Compute first'); return; }
        setSaving(true);
        try {
            await CostingAPI.save({ md_id: mdId, price_map: priceMap, dye_map: dyeMap, ...params });
            Alert.alert('Saved ✓', 'Costing record saved to history');
            onSaved();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // unique yarn keys for price inputs
    const yarnKeys = useMemo(() => {
        if (!design) return [];
        const all = [...design.warp_yarns, ...design.weft_yarns];
        const seen = new Set<string>();
        return all.filter(y => {
            const k = yKey(y.mi_id, y.blend_ratio);
            if (seen.has(k)) return false;
            seen.add(k); return true;
        });
    }, [design]);

    const setP = (key: string, v: string) =>
        setParams(p => ({ ...p, [key]: parseFloat(v) || 0 }));

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
            {/* Design selector */}
            <View style={c.section}>
                <DesignPicker value={mdId} onSelect={handleSelectDesign} />
            </View>

            {design && (
                <>
                    {/* Yarn prices */}
                    <View style={c.section}>
                        <Text style={c.sHdr}>YARN PRICES · ₹/kg + yarn dyeing</Text>
                        {yarnKeys.map(y => {
                            const k = yKey(y.mi_id, y.blend_ratio);
                            return (
                                <View key={k} style={c.yarnRow}>
                                    <Text style={c.yarnLabel}>
                                        {y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                                        <View style={{ flex: 1 }}>
                                            <Inp
                                                value={String(priceMap[k] ?? '')}
                                                onChange={v => setPriceMap(p => ({ ...p, [k]: parseFloat(v) || 0 }))}
                                            />
                                        </View>
                                        {design.type === 'YD' && (
                                            <View style={{ flex: 0.6 }}>
                                                <Inp
                                                    value={String(dyeMap[k] ?? '')}
                                                    onChange={v => setDyeMap(p => ({ ...p, [k]: parseFloat(v) || 0 }))}
                                                    suffix="dye"
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Conversion params */}
                    <View style={c.section}>
                        <Text style={c.sHdr}>CONVERSION</Text>
                        <Text style={c.subHdr}>WEAVING RATE · ₹ per pick (× PPI table)</Text>
                        <Inp value={String(params.weaving_rate)} onChange={v => setP('weaving_rate', v)} suffix="₹/pick" />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={c.subHdr}>LOOM RPM</Text>
                                <Inp value={String(params.rpm)} onChange={v => setP('rpm', v)} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={c.subHdr}>EFFICIENCY</Text>
                                <Inp value={String(params.eff)} onChange={v => setP('eff', v)} suffix="%" />
                            </View>
                        </View>
                        <Text style={[c.subHdr, { marginTop: 10 }]}>GREIGE BROKERAGE</Text>
                        <Inp value={String(params.greige_brok)} onChange={v => setP('greige_brok', v)} suffix="%" />
                    </View>

                    {/* Finishing */}
                    {design.finish_locked && (
                        <View style={c.section}>
                            <Text style={c.sHdr}>FINISHING</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={c.subHdr}>DYEING / PROC</Text>
                                    <Inp value={String(params.dyeing_proc)} onChange={v => setP('dyeing_proc', v)} suffix="₹/m" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={c.subHdr}>CUT / PACK</Text>
                                    <Inp value={String(params.cut_pack)} onChange={v => setP('cut_pack', v)} suffix="₹/m" />
                                </View>
                            </View>
                            <Text style={[c.subHdr, { marginTop: 10 }]}>FINISHED BROKERAGE</Text>
                            <Inp value={String(params.finished_brok)} onChange={v => setP('finished_brok', v)} suffix="%" />
                        </View>
                    )}

                    {/* Results */}
                    {computing && <ActivityIndicator color={T.copper} style={{ marginVertical: 16 }} />}
                    {result && !computing && (
                        <>
                            {/* Greige section */}
                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>GREIGE COST</Text>
                                <ResRow label="Raw Material" value={r2(result.snap_rm)} />
                                <ResRow label="RM %" value={pct(result.snap_rm_pct)} />
                                <ResRow label="Weaving Cost" value={r2(result.snap_weaving_cost)} />
                                <ResRow label="Weaving %" value={pct(result.snap_weave_pct)} />
                                <View style={c.divider} />
                                <ResRow label="Greige Mfg" value={r2(result.snap_greige_mfg)} />
                                <ResRow label="Brokerage" value={r2(result.snap_greige_brok_amt)} />
                                <ResRow label="Greige Price" value={r0(result.snap_greige_price)} highlight />
                                <ResRow label="Greige ₹/kg" value={r0(result.snap_greige_kg)} />
                            </View>

                            {/* Warp/Weft breakdown */}
                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>YARN BREAKDOWN</Text>
                                {[...result.warp_rows, ...result.weft_rows].map((row, i) => (
                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: T.border }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 11, color: T.ink, fontWeight: '600' }}>
                                                {row.yarn_type === 'warp' ? '↕' : '↔'} {row.mi_id}{row.blend_ratio ? ` ${row.blend_ratio}` : ''}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: T.muted }}>
                                                {row.grams_per_metre?.toFixed(2)}g/m · ₹{row.price}+{row.dye_cost} = ₹{row.rate}/kg
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: T.ink }}>
                                            {r2(row.cost)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Production stats */}
                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>PRODUCTION</Text>
                                <ResRow label="PPI (loom)" value={`${result.snap_ppi_loom}`} />
                                <ResRow label="PPI (table)" value={`${result.snap_ppi_table}`} />
                                <ResRow label="Greige Width" value={`${result.greige_width?.toFixed(1)}″`} />
                                <ResRow label="GSM (greige)" value={`${Math.round((result.snap_greige_glm / (result.greige_width || 1)) * 100)}`} />
                                <ResRow label="Prod/Day" value={`${result.snap_prod_day?.toFixed(1)} m`} />
                            </View>

                            {/* Finished section */}
                            {result.snap_has_fin && (
                                <View style={c.resultCard}>
                                    <Text style={c.sHdr}>FINISHED COST</Text>
                                    <ResRow label="Shrink Impact" value={r2(result.shrink_impact)} />
                                    <ResRow label="Dyeing/Proc" value={r2(result.dye_proc_amount)} />
                                    <ResRow label="Finished Brok" value={r2(result.fin_brok_amt)} />
                                    <ResRow label="Cut & Pack" value={r2(result.cut_pack)} />
                                    <View style={c.divider} />
                                    <ResRow label="Finished Price" value={r0(result.snap_finished_price)} highlight />
                                    <ResRow label="Finished ₹/kg" value={r0(result.snap_finished_kg)} />
                                </View>
                            )}

                            {/* Final */}
                            <View style={[c.resultCard, { backgroundColor: T.copper + '10', borderColor: T.copper }]}>
                                <Text style={c.sHdr}>FINAL COST</Text>
                                <ResRow label={result.snap_has_fin ? 'Finished Price/m' : 'Greige Price/m'}
                                    value={r0(result.snap_final_cost)} highlight />
                            </View>

                            {/* Preview */}
                            <TouchableOpacity style={c.previewBtn} onPress={() => setPreviewOpen(true)}>
                                <Text style={c.previewTxt}>↧ Preview & export cost sheet</Text>
                            </TouchableOpacity>

                            {/* Save */}
                            <TouchableOpacity style={[c.saveBtn, saving && { opacity: 0.5 }]}
                                onPress={save} disabled={saving}>
                                <Text style={c.saveTxt}>{saving ? 'Saving…' : 'Save Costing'}</Text>
                            </TouchableOpacity>

                            <CostSheetPreviewModal
                                visible={previewOpen}
                                onClose={() => setPreviewOpen(false)}
                                design={design}
                                result={result}
                                onSave={save}
                                saving={saving}
                            />
                        </>
                    )}
                </>
            )}
        </ScrollView>
    );
}
const c = StyleSheet.create({
    section: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
    sHdr: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    subHdr: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    yarnLabel: { fontSize: 12, fontWeight: '600', color: T.ink, width: 110 },
    resultCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    divider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
    previewBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8, marginBottom: 8 },
    previewTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
    saveBtn: { backgroundColor: T.ink, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 0 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — HISTORY
// ═══════════════════════════════════════════════════════════════
function HistoryTab({ refreshKey }: { refreshKey: number }) {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const res = await CostingAPI.history();
            setGroups(res.data.data);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [refreshKey]);

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <FlatList
            data={groups}
            keyExtractor={g => g.md_id}
            contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            renderItem={({ item: g }) => (
                <View style={h.card}>
                    <View style={h.header}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={h.code}>{g.code}</Text>
                                <View style={{ backgroundColor: g.type === 'YD' ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: g.type === 'YD' ? T.yd : T.pd }}>{g.type}</Text>
                                </View>
                            </View>
                            <Text style={h.sub}>{g.count} costing{g.count > 1 ? 's' : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={h.costAmt}>₹{g.latest_cost} /m</Text>
                            <Text style={h.costDate}>{g.latest_at?.slice(0, 10)}</Text>
                        </View>
                    </View>
                    {g.records.slice(0, 3).map((r: any) => (
                        <View key={r.id} style={h.recRow}>
                            <Text style={h.recDate}>{r.created_at?.slice(0, 10)}</Text>
                            <Text style={h.recAmt}>₹{r.snap_final_cost} /m</Text>
                            <View style={[h.typeBadge, { backgroundColor: r.snap_has_fin ? T.green + '20' : T.amber + '20' }]}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: r.snap_has_fin ? T.green : T.amber }}>
                                    {r.snap_has_fin ? 'FIN' : 'GRG'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>No costings saved yet</Text>}
        />
    );
}
const h = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    code: { fontSize: 15, fontWeight: '800', color: T.ink },
    sub: { fontSize: 10.5, color: T.muted, marginTop: 2 },
    costAmt: { fontSize: 15, fontWeight: '800', color: T.green },
    costDate: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    recRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.sub },
    recDate: { flex: 1, fontSize: 11, color: T.muted },
    recAmt: { fontSize: 12.5, fontWeight: '700', color: T.ink },
    typeBadge: { marginLeft: 8, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — VARIANCE
// ═══════════════════════════════════════════════════════════════
function VarianceTab() {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [mdId, setMdId] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        DesignAPI.list().then(r => setDesigns(r.data.data)).catch(() => { });
    }, []);

    const load = async (id: string) => {
        setMdId(id);
        setLoading(true);
        try {
            const res = await CostingAPI.variance(id);
            setData(res.data.data);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const VarRow = ({ label, value }: { label: string; value: number | null }) => {
        if (value === null) return null;
        const up = value > 0;
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: T.muted }}>{label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: up ? T.red : T.green }}>
                    {up ? '+' : ''}{r2(value)}
                </Text>
            </View>
        );
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            {/* Design selector */}
            <View style={{ backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 8 }}>SELECT DESIGN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {designs?.map(d => (
                        <TouchableOpacity key={d.id} onPress={() => load(d.id)}
                            style={[v.chip, mdId === d.id && v.chipActive]}>
                            <Text style={[v.chipTxt, mdId === d.id && { color: '#fff' }]}>{d.code}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && <ActivityIndicator color={T.copper} style={{ marginVertical: 20 }} />}

            {data && !loading && (
                <>
                    {data.variance ? (
                        <View style={v.card}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 10 }}>
                                CHANGE vs PREVIOUS COSTING
                            </Text>
                            <VarRow label="Raw Material Δ" value={data.variance.rm} />
                            <VarRow label="Weaving Cost Δ" value={data.variance.weaving_cost} />
                            <VarRow label="Greige Price Δ" value={data.variance.greige_price} />
                            <VarRow label="Finished Price Δ" value={data.variance.finished_price} />
                            <View style={{ height: 1, backgroundColor: T.border, marginVertical: 8 }} />
                            <VarRow label="FINAL COST Δ" value={data.variance.final_cost} />
                            <VarRow label="RM% Δ" value={data.variance.rm_pct_delta} />
                        </View>
                    ) : (
                        <Text style={s.empty}>Need at least 2 costings to compare</Text>
                    )}

                    {/* History table */}
                    <View style={v.card}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 10 }}>COSTING HISTORY</Text>
                        {data.records.map((r: any, i: number) => (
                            <View key={r.id} style={[v.row, i === 0 && { backgroundColor: T.copper + '10' }]}>
                                <Text style={{ flex: 1, fontSize: 11, color: T.muted }}>{r.created_at?.slice(0, 10)}</Text>
                                <Text style={{ fontSize: 11, color: T.ink, width: 60 }}>RM {r.rm_pct}%</Text>
                                <Text style={{ fontSize: 11, color: T.ink, width: 60 }}>W {r.weave_pct}%</Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: i === 0 ? T.copper : T.ink }}>
                                    ₹{r.final_cost}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
}
const v = StyleSheet.create({
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipTxt: { fontSize: 12, fontWeight: '600', color: T.muted },
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.border, borderRadius: 6, paddingHorizontal: 4 },
});

export function CostingScreen() {
    const [tab, setTab] = useState<Tab>('Costing');
    const [histRefreshKey, setHistRefreshKey] = useState(0);

    // FIX: this screen used to render its own hand-rolled header (same bug
    // as Designs/Orders/Permission Manager — see app/new/(tabs)/_layout.tsx).
    // No subtitle/right-side content needed here, so nothing further to wire
    // through headerExtras — just removing the duplicate.
    return (
        <View style={{ flex: 1, backgroundColor: T.bg }}>
            <TabBar active={tab} onChange={setTab} />

            <View style={{ flex: 1 }}>
                {tab === 'Costing' && <CostingTab onSaved={() => setHistRefreshKey(k => k + 1)} />}
                {tab === 'History' && <HistoryTab refreshKey={histRefreshKey} />}
                {tab === 'Variance' && <VarianceTab />}
            </View>
        </View>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
});

const s = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty: { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default CostingScreen;
