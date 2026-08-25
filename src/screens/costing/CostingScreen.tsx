import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const TABS = ['Costing', 'Temp / New', 'History', 'Variance'] as const;
type Tab = typeof TABS[number];

type ReopenCostingRequest = {
    costingId: string;
    requestKey: number;
};

type ReopenedCostingInfo = {
    id: string;
    createdAt?: string | null;
};


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
function DesignPicker({ value, onSelect, selectedDesign, disabled = false }: { value: string; onSelect: (d: Design) => void; selectedDesign?: Design | null; disabled?: boolean }) {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const requestSeq = React.useRef(0);

    const loadDesigns = useCallback(async (term = '') => {
        const seq = ++requestSeq.current;
        setLoading(true);
        try {
            const r: any = await DesignAPI.list({ page: 1, per_page: 50, search: term.trim() || undefined });
            if (seq !== requestSeq.current) return;
            const payload = r?.data?.data;
            const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
            setDesigns(rows);
        } catch (e) {
            if (seq === requestSeq.current) setDesigns([]);
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, []);

    useEffect(() => { void loadDesigns(''); }, [loadDesigns]);
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => void loadDesigns(search), 250);
        return () => clearTimeout(t);
    }, [search, open, loadDesigns]);

    const current = selectedDesign || designs.find(d => d.id === value) || null;
    const label = current
        ? `${current.code} · ${String(current.category || '').replace('Linen ', '')} (${current.type})`
        : 'Select design…';

    return (
        <View style={dp.wrap}>
            <Text style={dp.fieldLabel}>DESIGN</Text>
            <TouchableOpacity style={[dp.trigger, open && dp.triggerOpen, disabled && { opacity: 0.6 }]}
                disabled={disabled}
                onPress={() => { const next = !open; setOpen(next); if (next) setSearch(''); }} activeOpacity={0.7}>
                <Text style={[dp.triggerTxt, !current && dp.triggerPh]} numberOfLines={1}>{label}</Text>
                {disabled ? <ActivityIndicator size="small" color={T.copper} /> : <Text style={dp.arrow}>{open ? '▴' : '▾'}</Text>}
            </TouchableOpacity>
            {open && !disabled && (
                <View style={dp.sheet}>
                    <TextInput value={search} onChangeText={setSearch}
                        placeholder="Search code, category, weave…" placeholderTextColor={T.muted}
                        style={dp.search} autoFocus autoCapitalize="none" autoCorrect={false} />
                    <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {loading && <View style={{ padding: 14 }}><ActivityIndicator color={T.copper} /></View>}
                        {!loading && designs.map(d => (
                            <TouchableOpacity key={d.id} style={[dp.row, d.id === value && dp.rowActive]}
                                onPress={() => { setOpen(false); setSearch(''); onSelect(d); }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[dp.rowCode, d.id === value && { color: T.copper }]}>{d.code}</Text>
                                    <Text style={dp.rowSub}>{d.category || 'Uncategorised'}{d.weave ? ` · ${d.weave}` : ''}</Text>
                                </View>
                                <View style={{ backgroundColor: d.type === 'YD' ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: d.type === 'YD' ? T.yd : T.pd }}>{d.type}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {!loading && designs.length === 0 && <Text style={dp.empty}>No designs match</Text>}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
const dp = StyleSheet.create({
    wrap: { marginBottom: 4 }, fieldLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    trigger: { minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13 },
    triggerOpen: { borderColor: T.copper }, triggerTxt: { flex: 1, fontSize: 14, color: T.ink, fontWeight: '600', paddingRight: 8 }, triggerPh: { color: T.muted, fontWeight: '400' }, arrow: { fontSize: 13, color: T.muted },
    sheet: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginTop: 4, overflow: 'hidden', zIndex: 99 },
    search: { margin: 10, backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: T.ink },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.border }, rowActive: { backgroundColor: T.sub }, rowCode: { fontSize: 14, fontWeight: '700', color: T.ink }, rowSub: { fontSize: 11, color: T.muted, marginTop: 1 }, empty: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },
});

// ── Numeric input field ──────────────────────────────────────
// Keeps a local text draft while focused. This is important for decimal
// entry: typing "0." must not immediately collapse back to "0" because the
// parent stores numeric values for API compute/save.
function Inp({ value, onChange, suffix }: { value: string; onChange: (v: string) => void; suffix?: string }) {
    const [draft, setDraft] = useState(String(value ?? ''));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setDraft(String(value ?? ''));
    }, [value, focused]);

    const change = (raw: string) => {
        let next = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const firstDot = next.indexOf('.');
        if (firstDot >= 0) {
            next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
        }
        if (next.startsWith('.')) next = `0${next}`;
        setDraft(next);
        onChange(next);
    };

    const blur = () => {
        setFocused(false);
        if (draft === '' || draft === '.') {
            setDraft('0');
            onChange('0');
            return;
        }
        const n = Number(draft);
        if (Number.isFinite(n)) setDraft(String(n));
    };

    return (
        <View style={[inp.wrap, focused && inp.wrapFocus]}>
            <TextInput
                value={draft}
                onChangeText={change}
                onFocus={() => setFocused(true)}
                onBlur={blur}
                keyboardType="decimal-pad"
                style={inp.field}
                placeholderTextColor={T.muted}
                selectTextOnFocus={false}
            />
            {suffix && <Text style={inp.suffix}>{suffix}</Text>}
        </View>
    );
}
const inp = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 12, minHeight: 48 },
    wrapFocus: { borderColor: T.copper },
    field: { flex: 1, fontSize: 15, color: T.ink, paddingVertical: 10 },
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
    weaving_rate: 0.3, rpm: 400, eff: 85,
    greige_brok: 0, dyeing_proc: 18, finished_brok: 0, cut_pack: 3,
};

type YdTierCode = 'A' | 'L' | 'M' | 'D';
type YdTierRates = { L: number; M: number; D: number };
const DEFAULT_YD_TIERS: YdTierRates = { L: 60, M: 70, D: 85 };

function CostingTab({
    onSaved,
    reopenRequest,
    freshMode = false,
}: {
    onSaved: () => void;
    reopenRequest: ReopenCostingRequest | null;
    freshMode?: boolean;
}) {
    const [mdId, setMdId] = useState('');
    const [design, setDesign] = useState<Design | null>(null);
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});
    const [dyeMap, setDyeMap] = useState<Record<string, number>>({});
    const [ydTiers, setYdTiers] = useState<YdTierRates>({ ...DEFAULT_YD_TIERS });
    const [subTiers, setSubTiers] = useState<Record<string, YdTierCode>>({});
    const [colourways, setColourways] = useState<SubDesign[]>([]);
    const [colourwaysLoading, setColourwaysLoading] = useState(false);
    const [params, setParams] = useState({ ...DEFAULT_P });
    const [result, setResult] = useState<ComputeResult | null>(null);
    const [computing, setComputing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [reopening, setReopening] = useState(false);
    const [reopenedInfo, setReopenedInfo] = useState<ReopenedCostingInfo | null>(null);
    const [prefilledInfo, setPrefilledInfo] = useState<ReopenedCostingInfo | null>(null);
    const [designLoading, setDesignLoading] = useState(false);
    const [adjust, setAdjust] = useState({ greige_width: 0, warp_shrink: 0, warp_wastage: 0, weft_wastage: 0, weft_shrink: 0, fin_width: 0, gf_shrink: 0 });

    // build yarn key
    const yKey = (miId: string, br: string | null) => `${miId}|${br ?? ''}`;

    const designAdjustments = (full: Design) => ({
        greige_width: Number(full.greige_width || full.reed_space || 0),
        warp_shrink: Number(full.warp_shrink || 0),
        warp_wastage: Number(full.warp_wastage || 0),
        weft_wastage: Number(full.weft_wastage || 0),
        weft_shrink: Number((full as any).weft_shrink || 0),
        fin_width: Number(full.fin_width || 0),
        gf_shrink: Number(full.gf_shrink || 0),
    });

    const masterRateMaps = (full: Design) => {
        const pm: Record<string, number> = {};
        const dm: Record<string, number> = {};
        const allYarns = [
            ...(full.warp_yarns || []),
            ...(full.weft_yarns || []),
            ...(full.selvedge_yarns || []),
        ];
        allYarns.forEach((y: any) => {
            const k = yKey(String(y.mi_id), y.blend_ratio ?? null);
            if (!(k in pm)) {
                pm[k] = Number(y.base_price || 0);
                // Claude YD starting point: Medium dye tier (₹70/kg). PD
                // remains zero. Users can still set an individual yarn row to
                // zero when it must stay undyed.
                dm[k] = String(full.type || '').toUpperCase() === 'YD' ? DEFAULT_YD_TIERS.M : 0;
            }
        });
        return { pm, dm };
    };

    const applyMasters = (full: Design) => {
        const maps = masterRateMaps(full);
        setPriceMap(maps.pm);
        setDyeMap(maps.dm);
        setYdTiers({ ...DEFAULT_YD_TIERS });
        setSubTiers({});
        setParams({ ...DEFAULT_P });
        setAdjust(designAdjustments(full));
        setResult(null);
        setPrefilledInfo(null);
        setReopenedInfo(null);
    };

    const applyLatestSavedInputs = async (full: Design) => {
        // Start from current masters first. Latest saved costing then overlays
        // conversion/finishing/recalc fields. Yarn prices intentionally stay
        // refreshed from the current design/rate master, as in the client spec.
        applyMasters(full);

        if (freshMode) return;

        try {
            const historyResponse: any = await CostingAPI.history({
                md_id: String(full.id),
                page: 1,
                per_page: 1,
                records_per_design: 1,
            });
            const group = Array.isArray(historyResponse?.data?.data)
                ? historyResponse.data.data[0]
                : null;
            const latest = Array.isArray(group?.records) ? group.records[0] : null;
            if (!latest?.id) return;

            const detailResponse: any = await CostingAPI.get(String(latest.id));
            const saved = detailResponse?.data?.data;
            const inputs = saved?.inputs || {};
            if (!saved) return;

            setParams({
                weaving_rate: Number(inputs.weaving_rate ?? DEFAULT_P.weaving_rate),
                rpm: Number(inputs.rpm ?? DEFAULT_P.rpm),
                eff: Number(inputs.eff ?? DEFAULT_P.eff),
                greige_brok: Number(inputs.greige_brok ?? DEFAULT_P.greige_brok),
                dyeing_proc: Number(inputs.dyeing_proc ?? DEFAULT_P.dyeing_proc),
                finished_brok: Number(inputs.finished_brok ?? DEFAULT_P.finished_brok),
                cut_pack: Number(inputs.cut_pack ?? DEFAULT_P.cut_pack),
            });

            const masterAdjust = designAdjustments(full);
            setAdjust({
                greige_width: Number(inputs.greige_width ?? masterAdjust.greige_width),
                warp_shrink: Number(inputs.warp_shrink ?? masterAdjust.warp_shrink),
                warp_wastage: Number(inputs.warp_wastage ?? masterAdjust.warp_wastage),
                weft_wastage: Number(inputs.weft_wastage ?? masterAdjust.weft_wastage),
                weft_shrink: Number(inputs.weft_shrink ?? masterAdjust.weft_shrink),
                fin_width: Number(inputs.fin_width ?? masterAdjust.fin_width),
                gf_shrink: Number(inputs.gf_shrink ?? masterAdjust.gf_shrink),
            });

            if (String(full.type || '').toUpperCase() === 'YD') {
                const savedTiers = inputs.yd_tiers || {};
                setYdTiers({
                    L: Number(savedTiers.L ?? DEFAULT_YD_TIERS.L),
                    M: Number(savedTiers.M ?? DEFAULT_YD_TIERS.M),
                    D: Number(savedTiers.D ?? DEFAULT_YD_TIERS.D),
                });
                setSubTiers((inputs.yd_sub_tiers || {}) as Record<string, YdTierCode>);
            }

            setPrefilledInfo({
                id: String(saved.id || latest.id),
                createdAt: saved.created_at || latest.created_at || null,
            });
        } catch (e: any) {
            // Prefill is best-effort. A history outage must never block a new
            // costing; the user still gets current master defaults.
            console.log('LATEST COSTING PREFILL SKIPPED', e?.response?.data || e?.message || e);
        }
    };

    // Load design details quickly, then prefill either latest costing or masters.
    const handleSelectDesign = async (d: Design) => {
        setDesignLoading(true);
        setResult(null);
        setPrefilledInfo(null);
        try {
            const res = await DesignAPI.get(d.id);
            const full = res.data.data;
            setDesign(full);
            setMdId(full.id);

            if (String(full.type || '').toUpperCase() === 'YD') {
                setColourwaysLoading(true);
                try {
                    const [cwResponse] = await Promise.all([
                        DesignAPI.colourways(String(full.id)),
                        applyLatestSavedInputs(full),
                    ]);
                    const rows = Array.isArray(cwResponse?.data?.data) ? cwResponse.data.data : [];
                    setColourways(rows);
                } finally {
                    setColourwaysLoading(false);
                }
            } else {
                setColourways([]);
                await applyLatestSavedInputs(full);
            }
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e.message || 'Unable to load design');
        } finally {
            setDesignLoading(false);
        }
    };

    const startFreshFromMasters = () => {
        if (!design) return;
        applyMasters(design);
    };

    // Reopen a historical costing as an editable new revision.
    // The original costing is never updated or overwritten.
    useEffect(() => {
        if (!reopenRequest?.costingId) return;

        let cancelled = false;

        const reopen = async () => {
            setReopening(true);
            setResult(null);

            try {
                const detailResponse = await CostingAPI.get(
                    reopenRequest.costingId
                );

                const saved = detailResponse?.data?.data;
                if (!saved?.md_id) {
                    throw new Error(
                        'Saved costing does not contain a design reference.'
                    );
                }

                const designResponse = await DesignAPI.get(
                    String(saved.md_id)
                );
                const fullDesign = designResponse?.data?.data;

                if (!fullDesign) {
                    throw new Error(
                        'Unable to load the design for this costing.'
                    );
                }

                if (cancelled) return;

                const inputs = saved.inputs || {};

                setDesign(fullDesign);
                setMdId(String(saved.md_id));
                setPrefilledInfo(null);
                const savedPriceMap =
                    inputs.price_map &&
                        typeof inputs.price_map === 'object'
                        ? inputs.price_map
                        : {};

                const savedDyeMap =
                    inputs.dye_map &&
                        typeof inputs.dye_map === 'object'
                        ? inputs.dye_map
                        : {};

                const savedLines = Array.isArray(saved.yarn_lines)
                    ? saved.yarn_lines
                    : [];

                const reopenedPriceMap: Record<string, number> = {};
                const reopenedDyeMap: Record<string, number> = {};

                const allDesignYarns = [
                    ...(fullDesign.warp_yarns || []),
                    ...(fullDesign.weft_yarns || []),
                ];

                allDesignYarns.forEach((yarn: any) => {
                    const currentKey = yKey(
                        String(yarn.mi_id),
                        yarn.blend_ratio ?? null
                    );

                    const matchedLine = savedLines.find((line: any) => {
                        const sameItem =
                            String(line.mi_id || '') ===
                            String(yarn.mi_id || '');

                        const sameBlend =
                            String(line.blend_ratio || '').trim() ===
                            String(yarn.blend_ratio || '').trim();

                        return sameItem && sameBlend;
                    });

                    const savedKey = matchedLine?.yarn_key;

                    const savedPrice =
                        savedPriceMap[currentKey] ??
                        (savedKey ? savedPriceMap[savedKey] : undefined) ??
                        matchedLine?.price ??
                        yarn.base_price ??
                        0;

                    const savedDye =
                        savedDyeMap[currentKey] ??
                        (savedKey ? savedDyeMap[savedKey] : undefined) ??
                        matchedLine?.dye_cost ??
                        0;

                    reopenedPriceMap[currentKey] =
                        Number(savedPrice) || 0;

                    reopenedDyeMap[currentKey] =
                        Number(savedDye) || 0;
                });

                setPriceMap(reopenedPriceMap);
                setDyeMap(reopenedDyeMap);

                if (String(fullDesign.type || '').toUpperCase() === 'YD') {
                    const savedTiers = saved.inputs?.yd_tiers || {};
                    setYdTiers({
                        L: Number(savedTiers.L ?? DEFAULT_YD_TIERS.L),
                        M: Number(savedTiers.M ?? DEFAULT_YD_TIERS.M),
                        D: Number(savedTiers.D ?? DEFAULT_YD_TIERS.D),
                    });
                    setSubTiers((saved.inputs?.yd_sub_tiers || {}) as Record<string, YdTierCode>);
                    setColourwaysLoading(true);
                    try {
                        const cwResponse = await DesignAPI.colourways(String(fullDesign.id));
                        setColourways(Array.isArray(cwResponse?.data?.data) ? cwResponse.data.data : []);
                    } finally {
                        setColourwaysLoading(false);
                    }
                } else {
                    setYdTiers({ ...DEFAULT_YD_TIERS });
                    setSubTiers({});
                    setColourways([]);
                }
                setParams({
                    weaving_rate: Number(
                        inputs.weaving_rate ?? DEFAULT_P.weaving_rate
                    ),
                    rpm: Number(inputs.rpm ?? DEFAULT_P.rpm),
                    eff: Number(inputs.eff ?? DEFAULT_P.eff),
                    greige_brok: Number(
                        inputs.greige_brok ?? DEFAULT_P.greige_brok
                    ),
                    dyeing_proc: Number(
                        inputs.dyeing_proc ?? DEFAULT_P.dyeing_proc
                    ),
                    finished_brok: Number(
                        inputs.finished_brok ?? DEFAULT_P.finished_brok
                    ),
                    cut_pack: Number(
                        inputs.cut_pack ?? DEFAULT_P.cut_pack
                    ),
                });
                const masterAdjust = designAdjustments(fullDesign);
                setAdjust({
                    greige_width: Number(inputs.greige_width ?? masterAdjust.greige_width),
                    warp_shrink: Number(inputs.warp_shrink ?? masterAdjust.warp_shrink),
                    warp_wastage: Number(inputs.warp_wastage ?? masterAdjust.warp_wastage),
                    weft_wastage: Number(inputs.weft_wastage ?? masterAdjust.weft_wastage),
                    weft_shrink: Number(inputs.weft_shrink ?? masterAdjust.weft_shrink),
                    fin_width: Number(inputs.fin_width ?? masterAdjust.fin_width),
                    gf_shrink: Number(inputs.gf_shrink ?? masterAdjust.gf_shrink),
                });
                setReopenedInfo({
                    id: String(saved.id || reopenRequest.costingId),
                    createdAt: saved.created_at || null,
                });
            } catch (e: any) {
                if (!cancelled) {
                    console.log(
                        'REOPEN COSTING ERROR:',
                        e?.response?.data || e
                    );
                    Alert.alert(
                        'Unable to reopen costing',
                        e?.response?.data?.message ||
                        e?.message ||
                        'The saved costing could not be loaded.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setReopening(false);
                }
            }
        };

        void reopen();

        return () => {
            cancelled = true;
        };
    }, [reopenRequest?.requestKey, reopenRequest?.costingId]);

    // live compute
    const compute = useCallback(async () => {
        if (!mdId || !design) return;
        setComputing(true);
        try {
            const res = await CostingAPI.compute({
                md_id: mdId,
                price_map: priceMap,
                dye_map: dyeMap,
                tier_code: 'STD',
                yd_tiers: ydTiers,
                yd_sub_tiers: subTiers,
                ...params,
                ...adjust,
            });
            setResult(res.data.data);
        } catch (e: any) {
            Alert.alert('Compute Error', e.message);
        } finally {
            setComputing(false);
        }
    }, [mdId, design, priceMap, dyeMap, ydTiers, subTiers, params, adjust]);

    // debounce compute on input changes
    useEffect(() => {
        if (!mdId) return;
        const t = setTimeout(compute, 600);
        return () => clearTimeout(t);
    }, [mdId, priceMap, dyeMap, ydTiers, subTiers, params, adjust]);

    // const save = async () => {
    //     if (!result) { Alert.alert('Compute first'); return; }
    //     setSaving(true);
    //     try {
    //         await CostingAPI.save({ md_id: mdId, price_map: priceMap, dye_map: dyeMap, ...params });
    //         Alert.alert('Saved ✓', 'Costing record saved to history');
    //         onSaved();
    //     } catch (e: any) {
    //         Alert.alert('Error', e.message);
    //     } finally {
    //         setSaving(false);
    //     }
    // };

    const save = async () => {
        if (!result) {
            Alert.alert('Compute first');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                md_id: mdId,
                price_map: priceMap,
                dye_map: dyeMap,
                tier_code: 'STD',
                yd_tiers: ydTiers,
                yd_sub_tiers: subTiers,
                ...params,
                ...adjust,
            };
            console.log("SAVE REQUEST:", payload);
            const response = await CostingAPI.save(payload);
            console.log("SAVE RESPONSE:", response?.data);
            if (response?.data?.success) {
                Alert.alert("Success", response.data.message);
                onSaved();
            } else {
                Alert.alert("Error", response?.data?.message);
            }
        } catch (e: any) {
            console.log("SAVE ERROR:", e?.response?.data || e);
            Alert.alert("Error", e?.response?.data?.message || e?.message);
        } finally {
            setSaving(false);
        }
    };

    // unique yarn keys for price inputs
    const yarnKeys = useMemo(() => {
        if (!design) return [];
        const all = [...(design.warp_yarns || []), ...(design.weft_yarns || []), ...(design.selvedge_yarns || [])];
        const seen = new Set<string>();
        return all.filter(y => {
            const k = yKey(y.mi_id, y.blend_ratio);
            if (seen.has(k)) return false;
            seen.add(k); return true;
        });
    }, [design]);

    const numeric = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
    const setP = (key: string, v: string) =>
        setParams(p => ({ ...p, [key]: numeric(v, 0) }));

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
            {reopening ? (
                <View style={c.reopenBanner}>
                    <ActivityIndicator color={T.copper} size="small" />
                    <View style={{ flex: 1 }}>
                        <Text style={c.reopenTitle}>Opening saved costing…</Text>
                        <Text style={c.reopenSub}>Loading saved inputs and design.</Text>
                    </View>
                </View>
            ) : reopenedInfo ? (
                <View style={c.prefillBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={c.prefillTitle}>PREFILLED FROM {reopenedInfo.id}</Text>
                        <Text style={c.prefillText}>
                            Historical revision reopened for editing. Save creates a new version; the original stays unchanged.
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* Design selector */}
            <View style={c.section}>
                <DesignPicker value={mdId} selectedDesign={design} disabled={designLoading} onSelect={handleSelectDesign} />
            </View>

            {design && prefilledInfo && !reopenedInfo && !freshMode && (
                <View style={c.prefillBanner}>
                    <Text style={c.prefillTitle}>PREFILLED FROM {prefilledInfo.id}</Text>
                    <Text style={c.prefillText}>
                        {prefilledInfo.createdAt ? `${historyDateTimeLabel(prefilledInfo.createdAt)} · ` : ''}
                        Conversion, finishing and costing adjustments carry the latest saved costing. Yarn prices are refreshed from the current masters. Change what you need and Save to create a new version.
                    </Text>
                    <TouchableOpacity onPress={startFreshFromMasters} activeOpacity={0.75} style={c.freshLink}>
                        <Text style={c.freshLinkText}>↻ Start fresh from masters</Text>
                    </TouchableOpacity>
                </View>
            )}

            {design && freshMode && (
                <View style={c.freshModeBanner}>
                    <Text style={c.freshModeTitle}>TEMP / NEW · MASTER VALUES</Text>
                    <Text style={c.prefillText}>Starts from current Design Master and current yarn rates. No previous costing is prefilled.</Text>
                </View>
            )}

            {design && (
                <>

                    <View style={c.infoCard}>
                        <Text style={c.infoTitle}>WARP SHORTAGE · RECIPE vs FLOOR</Text>
                        <Text style={c.infoText}>No closed beams for this design yet — using the recipe assumption of 0%. Once beams close, costing can switch to cumulative floor actual + buffer when that production feed is available.</Text>
                    </View>

                    {/* Yarn prices */}
                    <View style={c.section}>
                        <Text style={c.sHdr}>YARN PRICES · ₹/KG PER ROW</Text>
                        <Text style={c.help}>Rates are per row — the same yarn can carry different rates where the costing engine exposes separate row keys. Current master rate is used as the starting value.</Text>
                        {yarnKeys.map(y => {
                            const k = yKey(y.mi_id, y.blend_ratio);
                            return (
                                <View key={k} style={c.yarnRow}>
                                    <View style={c.yarnIdentity}>
                                        <Text style={[c.yarnTypeLabel, { color: (design.weft_yarns || []).some((x: any) => x.mi_id === y.mi_id) && !(design.warp_yarns || []).some((x: any) => x.mi_id === y.mi_id) ? T.copper : T.ink }]}>
                                            {(design.selvedge_yarns || []).some((x: any) => x.mi_id === y.mi_id) ? 'SELV' : ((design.weft_yarns || []).some((x: any) => x.mi_id === y.mi_id) && !(design.warp_yarns || []).some((x: any) => x.mi_id === y.mi_id) ? 'WEFT' : 'WARP')}
                                        </Text>
                                        <Text style={c.yarnLabel}>{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                                        <View style={{ flex: 1 }}>
                                            <Inp
                                                value={String(priceMap[k] ?? '')}
                                                onChange={v => setPriceMap(p => ({ ...p, [k]: numeric(v, 0) }))}
                                            />
                                        </View>
                                        {design.type === 'YD' && (
                                            <View style={{ flex: 0.6 }}>
                                                <Inp
                                                    value={String(dyeMap[k] ?? '')}
                                                    onChange={v => setDyeMap(p => ({ ...p, [k]: numeric(v, 0) }))}
                                                    suffix="dye"
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {String(design.type || '').toUpperCase() === 'YD' && (
                        <View style={c.section}>
                            <Text style={c.sHdr}>SHADE-TIER DYED RATES · ₹/KG</Text>
                            <Text style={c.help}>
                                L / M / D replace the existing positive yarn-dye component — they are not added on top. A uses actual shade-master mill rates and stays disabled until that real feed is connected.
                            </Text>

                            <View style={c.tierInputRow}>
                                {(['L', 'M', 'D'] as const).map(code => (
                                    <View key={code} style={c.tierInputCell}>
                                        <Text style={c.tierInputLabel}>{code === 'L' ? 'LIGHT' : code === 'M' ? 'MEDIUM' : 'DARK'}</Text>
                                        <Inp
                                            value={String(ydTiers[code])}
                                            onChange={v => setYdTiers(t => ({ ...t, [code]: numeric(v, DEFAULT_YD_TIERS[code]) }))}
                                            suffix="₹/kg"
                                        />
                                    </View>
                                ))}
                            </View>

                            <View style={c.tierResultRow}>
                                {(['L', 'M', 'D'] as const).map(code => {
                                    const tierResult = (result as any)?.yd_tier_results?.[code];
                                    return (
                                        <View key={code} style={c.tierResultCard}>
                                            <Text style={c.tierResultCode}>{code}</Text>
                                            <Text style={c.tierResultRate}>₹{Number(ydTiers[code] || 0).toFixed(0)}/kg</Text>
                                            <Text style={c.tierResultCost}>
                                                {tierResult ? `${r2(Number(tierResult.final_cost || 0))}/m` : 'Calculating…'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={c.autoTierNote}>
                                <Text style={c.autoTierTitle}>A · AUTO SHADE MASTER</Text>
                                <Text style={c.autoTierText}>
                                    Disabled safely for now. The current ERP has colourway shades, but no persisted shade-wise mill-rate master equivalent to Claude's YD Shade Master. We will enable A only when that real rate source is connected — never from a guessed yarn average.
                                </Text>
                            </View>

                            <Text style={[c.subHdr, { marginTop: 12 }]}>COLOURWAY TIER ASSIGNMENT</Text>
                            {colourwaysLoading ? (
                                <ActivityIndicator color={T.copper} style={{ marginVertical: 10 }} />
                            ) : colourways.length === 0 ? (
                                <Text style={c.tierEmpty}>No saved colourways for this design.</Text>
                            ) : colourways.map((sd: any) => {
                                const selected: YdTierCode = subTiers[String(sd.id)] || 'M';
                                const selectedResult = selected === 'A' ? null : (result as any)?.yd_tier_results?.[selected];
                                return (
                                    <View key={String(sd.id)} style={c.colourwayTierRow}>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={c.colourwayTierName} numberOfLines={1}>{sd.code || sd.commercial_name || sd.id}</Text>
                                            <Text style={c.colourwayTierCost}>
                                                {selectedResult ? `${r2(Number(selectedResult.final_cost || 0))}/m` : 'Auto rate unavailable'}
                                            </Text>
                                        </View>
                                        <View style={c.tierButtons}>
                                            {(['A', 'L', 'M', 'D'] as YdTierCode[]).map(code => {
                                                const disabled = code === 'A';
                                                const active = selected === code;
                                                return (
                                                    <TouchableOpacity
                                                        key={code}
                                                        disabled={disabled}
                                                        activeOpacity={0.75}
                                                        onPress={() => setSubTiers(prev => ({ ...prev, [String(sd.id)]: code }))}
                                                        style={[
                                                            c.tierButton,
                                                            active && c.tierButtonActive,
                                                            disabled && c.tierButtonDisabled,
                                                        ]}
                                                    >
                                                        <Text style={[
                                                            c.tierButtonText,
                                                            active && c.tierButtonTextActive,
                                                            disabled && c.tierButtonTextDisabled,
                                                        ]}>{code}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

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

                    <View style={c.section}>
                        <Text style={c.sHdr}>RECALC ADJUSTMENTS · DESIGN PARAMS</Text>
                        <Text style={c.help}>Tweak shrink, width & wastage to re-cost this design without re-creating it. Shrink/width affect GSM & finished cost; wastage affects cost only. The Design Master is left unchanged.</Text>
                        <View style={c.twoCol}>
                            <View style={{ flex: 1 }}><Text style={c.subHdr}>WARP SHRINK</Text><Inp value={String(adjust.warp_shrink)} onChange={v => setAdjust(a => ({ ...a, warp_shrink: numeric(v, 0) }))} suffix="%" /></View>
                            <View style={{ flex: 1 }}><Text style={c.subHdr}>FINISH SHRINK</Text><Inp value={String(adjust.gf_shrink)} onChange={v => setAdjust(a => ({ ...a, gf_shrink: numeric(v, 0) }))} suffix="%" /></View>
                        </View>
                        <View style={{ marginTop: 10, width: '50%', paddingRight: 5 }}>
                            <Text style={c.subHdr}>FINISHED WIDTH</Text>
                            <Inp value={String(adjust.fin_width)} onChange={v => setAdjust(a => ({ ...a, fin_width: numeric(v, 0) }))} suffix={'"'} />
                        </View>
                        <View style={[c.twoCol, { marginTop: 10 }]}>
                            <View style={{ flex: 1 }}><Text style={c.subHdr}>WARP WASTAGE</Text><Inp value={String(adjust.warp_wastage)} onChange={v => setAdjust(a => ({ ...a, warp_wastage: numeric(v, 0) }))} suffix="%" /></View>
                            <View style={{ flex: 1 }}><Text style={c.subHdr}>WEFT WASTAGE</Text><Inp value={String(adjust.weft_wastage)} onChange={v => setAdjust(a => ({ ...a, weft_wastage: numeric(v, 0) }))} suffix="%" /></View>
                        </View>
                    </View>


                    {/* Results · Claude client parity */}
                    {computing && <ActivityIndicator color={T.copper} style={{ marginVertical: 16 }} />}
                    {result && !computing && (
                        <>
                            <TouchableOpacity style={c.previewBtn} onPress={() => setPreviewOpen(true)}>
                                <Text style={c.previewTxt}>↧ Preview & export cost sheet</Text>
                            </TouchableOpacity>

                            <View style={c.kpiRow}>
                                <View style={[c.kpiCard, c.greigeCard]}>
                                    <Text style={c.kpiLabel}>GREIGE</Text>
                                    <Text style={c.kpiValue}>{r2(result.snap_greige_price)}<Text style={c.kpiUnit}>/m</Text></Text>
                                    <Text style={c.kpiSub}>{r2(result.snap_greige_kg)}/kg</Text>
                                </View>
                                <View style={[c.kpiCard, c.finishedCard]}>
                                    <Text style={c.kpiLabel}>FINISHED</Text>
                                    <Text style={[c.kpiValue, { color: T.green }]}>{result.snap_has_fin ? r2(result.snap_final_cost) : '—'}<Text style={c.kpiUnit}>{result.snap_has_fin ? '/m' : ''}</Text></Text>
                                    <Text style={c.kpiSub}>{result.snap_has_fin ? `${r2(result.snap_finished_kg || 0)}/kg` : 'No finishing'}</Text>
                                </View>
                            </View>

                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>COST BREAK-UP · PER METRE GREIGE</Text>
                                <View style={c.breakBar}>
                                    <View style={[c.breakRm, { flex: Math.max(0.001, Number(result.snap_rm_pct || 0)) }]} />
                                    <View style={[c.breakWeave, { flex: Math.max(0.001, Number(result.snap_weave_pct || 0)) }]} />
                                </View>
                                <View style={c.breakLegend}>
                                    <Text style={c.breakRmText}>■ RM {pct(result.snap_rm_pct)} · {r2(result.snap_rm)}</Text>
                                    <Text style={c.breakWeaveText}>■ Weaving {pct(result.snap_weave_pct)} · {r2(result.snap_weaving_cost)}</Text>
                                </View>
                            </View>

                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>WARP vs WEFT · YARN COST / METRE GREIGE</Text>
                                <View style={c.costTableHead}>
                                    <Text style={[c.costTh, { flex: 1 }]}> </Text>
                                    <Text style={c.costTh}>YARN</Text>
                                    <Text style={c.costTh}>WASTAGE</Text>
                                    <Text style={c.costTh}>SUBTOTAL</Text>
                                </View>
                                <CostCompareRow label="Warp" yarn={Number((result as any).warp_cost || 0)} waste={Number((result as any).warp_waste_cost || 0)} />
                                <CostCompareRow label="Weft" yarn={Number((result as any).weft_cost || 0)} waste={Number((result as any).weft_waste_cost || 0)} />
                                {Number((result as any).selvedge_cost || 0) > 0 && (
                                    <CostCompareRow label="Selvedge" yarn={Number((result as any).selvedge_cost || 0)} waste={0} />
                                )}
                                <View style={c.divider} />
                                <ResRow label="Total yarn cost" value={r2(result.snap_rm)} highlight />
                                <View style={c.contribRow}>
                                    <Text style={c.contribRm}>RM contribution {pct(result.snap_rm_pct)}</Text>
                                    <Text style={c.contribWeave}>Weaving {pct(result.snap_weave_pct)}</Text>
                                </View>
                            </View>

                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>BUILD-UP</Text>
                                <ResRow label="Raw material" value={r2(result.snap_rm)} />
                                <ResRow label={`Weaving (${Number(result.snap_ppi_table || 0)} picks)`} value={r2(result.snap_weaving_cost)} />
                                <ResRow label="Greige mfg cost" value={r2(result.snap_greige_mfg)} highlight />
                                <ResRow label="Greige brokerage" value={r2(result.snap_greige_brok_amt)} />
                                <ResRow label="Greige price" value={r2(result.snap_greige_price)} highlight />
                                {result.snap_has_fin && (
                                    <>
                                        <ResRow label="Shrinkage impact" value={r2(result.shrink_impact)} />
                                        <ResRow label="Dyeing / processing" value={r2(Number((result as any).dye_proc_amount || 0))} />
                                        <ResRow label="Finished brokerage" value={r2(Number((result as any).fin_brok_amt || 0))} />
                                        <ResRow label="Cutting / packing" value={r2(Number((result as any).cut_pack || 0))} />
                                        <ResRow label="Finished price" value={r2(result.snap_final_cost)} highlight />
                                    </>
                                )}
                            </View>

                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>PRODUCTION</Text>
                                <ResRow label="PPI (loom)" value={`${result.snap_ppi_loom}`} />
                                <ResRow label="PPI (table)" value={`${result.snap_ppi_table}`} />
                                <ResRow label="Greige Width" value={`${Number(result.greige_width || 0).toFixed(1)}″`} />
                                <ResRow label="GSM (greige)" value={`${Math.round((result.snap_greige_glm / (result.greige_width || 1)) * 100)}`} />
                                <ResRow label="Prod/Day" value={`${Number(result.snap_prod_day || 0).toFixed(1)} m`} />
                            </View>

                            <View style={c.resultCard}>
                                <Text style={c.sHdr}>LOOM KPI</Text>
                                <View style={c.twoCol}>
                                    <View style={c.loomKpiBox}>
                                        <Text style={c.kpiLabel}>PRODUCTION / DAY</Text>
                                        <Text style={c.loomKpiValue}>{Number(result.snap_prod_day || 0).toFixed(0)} m</Text>
                                    </View>
                                    <View style={c.loomKpiBox}>
                                        <Text style={c.kpiLabel}>CONVERSION / DAY</Text>
                                        <Text style={c.loomKpiValue}>{r0(Number((result as any).snap_per_day_conversion || 0))}</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={[c.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                                <Text style={c.saveTxt}>{saving ? 'Saving…' : 'Save costing'}</Text>
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
function CostCompareRow({ label, yarn, waste }: { label: string; yarn: number; waste: number }) {
    return (
        <View style={c.costCompareRow}>
            <Text style={[c.costTd, { flex: 1, textAlign: 'left', fontWeight: '800', color: T.ink }]}>{label}</Text>
            <Text style={c.costTd}>{r2(yarn)}</Text>
            <Text style={c.costTd}>{r2(waste)}</Text>
            <Text style={[c.costTd, { fontWeight: '900', color: T.ink }]}>{r2(yarn + waste)}</Text>
        </View>
    );
}

const c = StyleSheet.create({
    prefillBanner: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.copper + '55', borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 12 },
    prefillTitle: { color: T.ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
    prefillText: { color: T.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
    freshLink: { marginTop: 9, alignSelf: 'flex-start', paddingVertical: 3 },
    freshLinkText: { color: T.copper, fontSize: 10, fontWeight: '900' },
    freshModeBanner: { backgroundColor: T.copper + '0D', borderRadius: 12, borderWidth: 1, borderColor: T.copper + '44', padding: 12, marginBottom: 12 },
    freshModeTitle: { color: T.copper, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    section: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
    sHdr: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    subHdr: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    yarnIdentity: { width: 130 },
    yarnTypeLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
    yarnLabel: { fontSize: 11.5, fontWeight: '700', color: T.ink },
    tierInputRow: { flexDirection: 'row', gap: 8 },
    tierInputCell: { flex: 1 },
    tierInputLabel: { fontSize: 8, fontWeight: '900', color: T.muted, letterSpacing: 0.4, marginBottom: 5 },
    tierResultRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    tierResultCard: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, padding: 9 },
    tierResultCode: { fontSize: 11, fontWeight: '900', color: T.ink },
    tierResultRate: { fontSize: 8.5, color: T.muted, marginTop: 2 },
    tierResultCost: { fontSize: 10, fontWeight: '900', color: T.copper, marginTop: 6 },
    autoTierNote: { marginTop: 10, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, padding: 10 },
    autoTierTitle: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
    autoTierText: { fontSize: 9, color: T.muted, lineHeight: 14, marginTop: 4 },
    tierEmpty: { fontSize: 10, color: T.muted, paddingVertical: 8 },
    colourwayTierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 9 },
    colourwayTierName: { fontSize: 11.5, fontWeight: '800', color: T.ink },
    colourwayTierCost: { fontSize: 9.5, color: T.copper, fontWeight: '700', marginTop: 2 },
    tierButtons: { flexDirection: 'row', gap: 5 },
    tierButton: { width: 30, height: 30, borderRadius: 7, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
    tierButtonActive: { backgroundColor: T.ink, borderColor: T.ink },
    tierButtonDisabled: { opacity: 0.35 },
    tierButtonText: { fontSize: 10, fontWeight: '900', color: T.ink },
    tierButtonTextActive: { color: '#fff' },
    tierButtonTextDisabled: { color: T.muted },
    resultCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    divider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
    previewBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8, marginBottom: 8 },
    previewTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 2, marginBottom: 8 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
    greigeCard: { backgroundColor: '#EEF3F6', borderColor: '#C8D5DE' },
    finishedCard: { backgroundColor: '#F0F4EE', borderColor: '#CCD8C8' },
    breakBar: { height: 10, flexDirection: 'row', borderRadius: 5, overflow: 'hidden', backgroundColor: T.sub },
    breakRm: { backgroundColor: T.copper },
    breakWeave: { backgroundColor: '#355E95' },
    breakLegend: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 7 },
    breakRmText: { color: T.copper, fontSize: 9, fontWeight: '800' },
    breakWeaveText: { color: '#355E95', fontSize: 9, fontWeight: '800', textAlign: 'right' },
    costTableHead: { flexDirection: 'row', paddingBottom: 5 },
    costTh: { width: 78, textAlign: 'right', color: T.muted, fontSize: 8, fontWeight: '800' },
    costCompareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    costTd: { width: 78, textAlign: 'right', color: T.muted, fontSize: 10.5 },
    contribRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    contribRm: { color: T.copper, fontSize: 9, fontWeight: '800' },
    contribWeave: { color: '#355E95', fontSize: 9, fontWeight: '800' },
    loomKpiBox: { flex: 1, backgroundColor: T.sub, borderRadius: 8, padding: 10 },
    loomKpiValue: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
    reopenBanner: {
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: T.copper + '55',
        borderRadius: 11,
        backgroundColor: T.copper + '10',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    reopenTitle: {
        color: T.copper,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    reopenSub: {
        marginTop: 3,
        color: T.ink,
        fontSize: 11,
        fontWeight: '700',
    },
    reopenHint: {
        marginTop: 3,
        color: T.muted,
        fontSize: 9.5,
        lineHeight: 13,
    },
    reopenDismiss: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.surface,
    },
    help: { fontSize: 9.5, color: T.muted, lineHeight: 14, marginTop: -4, marginBottom: 10 },
    twoCol: { flexDirection: 'row', gap: 10 },
    infoCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 12 },
    infoTitle: { fontSize: 9, fontWeight: '800', color: T.ink, letterSpacing: 0.4, marginBottom: 4 },
    infoText: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    kpiCard: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12 },
    kpiLabel: { fontSize: 8.5, color: T.muted, fontWeight: '800', letterSpacing: 0.5 },
    kpiValue: { fontSize: 18, color: T.ink, fontWeight: '900', marginTop: 5 },
    kpiUnit: { fontSize: 9, color: T.muted, fontWeight: '600' },
    kpiSub: { fontSize: 9.5, color: T.muted, marginTop: 3 },
    reopenDismissText: {
        color: T.muted,
        fontSize: 20,
        lineHeight: 22,
        fontWeight: '700',
    },
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — HISTORY
// ═══════════════════════════════════════════════════════════════
type HistoryRecord = {
    id: string;
    created_at?: string | null;
    snap_final_cost?: number | string | null;
    snap_rm?: number | string | null;
    snap_weaving_cost?: number | string | null;
    snap_greige_price?: number | string | null;
    snap_finished_price?: number | string | null;
    snap_has_fin?: boolean | number | null;
    snap_rm_pct?: number | string | null;
    snap_weave_pct?: number | string | null;
    scenario_name?: string | null;
    tier_code?: string | null;
};

type HistoryGroup = {
    md_id: string;
    code: string;
    category?: string | null;
    type?: 'YD' | 'PD' | string | null;
    count?: number | string | null;
    latest_cost?: number | string | null;
    latest_at?: string | null;
    records?: HistoryRecord[];
};

const HISTORY_FILTER_ALL = 'All';

const historyNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const historyDateLabel = (value?: string | null): string => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
    });
};

const historyDateTimeLabel = (value?: string | null): string => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 16);
    }

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

function HistorySparkline({
    records,
    selectedRecordId,
    onPointPress,
    width = 250,
    height = 62,
}: {
    records: HistoryRecord[];
    selectedRecordId?: string | null;
    onPointPress: (record: HistoryRecord) => void;
    width?: number;
    height?: number;
}) {
    const ordered = useMemo(
        () =>
            [...records]
                .filter(record =>
                    Number.isFinite(Number(record.snap_final_cost))
                )
                .sort((a, b) => {
                    const left = new Date(a.created_at || 0).getTime();
                    const right = new Date(b.created_at || 0).getTime();
                    return left - right;
                }),
        [records],
    );

    const values = ordered.map(record =>
        historyNumber(record.snap_final_cost)
    );

    if (values.length < 2) {
        return (
            <View style={[hs.noTrendBox, { height }]}>
                {ordered.length === 1 ? (
                    <TouchableOpacity
                        activeOpacity={0.75}
                        style={hs.singlePointButton}
                        onPress={() => onPointPress(ordered[0])}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <View
                            style={[
                                hs.sparkDot,
                                hs.sparkDotSelected,
                            ]}
                        />
                        <Text style={hs.noTrendText}>
                            Tap the point to view this costing.
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={hs.noTrendText}>
                        No costing points available.
                    </Text>
                )}
            </View>
        );
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const horizontalPadding = 14;
    const verticalPadding = 10;
    const usableWidth = width - horizontalPadding * 2;
    const usableHeight = height - verticalPadding * 2;

    const points = values.map((value, index) => ({
        record: ordered[index],
        x:
            horizontalPadding +
            (index / Math.max(values.length - 1, 1)) * usableWidth,
        y:
            verticalPadding +
            (1 - (value - min) / range) * usableHeight,
    }));

    return (
        <View style={[hs.sparklineWrap, { width, height }]}>
            {points.slice(0, -1).map((point, index) => {
                const next = points[index + 1];
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                    <View
                        key={`line-${point.record.id}`}
                        pointerEvents="none"
                        style={[
                            hs.sparkLine,
                            {
                                width: length,
                                left: point.x,
                                top: point.y,
                                transform: [{ rotateZ: `${angle}deg` }],
                            },
                        ]}
                    />
                );
            })}

            {points.map(point => {
                const selected =
                    selectedRecordId === point.record.id;

                return (
                    <TouchableOpacity
                        key={`point-${point.record.id}`}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Costing ${historyDateLabel(
                            point.record.created_at
                        )}, ₹${historyNumber(
                            point.record.snap_final_cost
                        ).toFixed(2)} per metre`}
                        onPress={() => onPointPress(point.record)}
                        hitSlop={{
                            top: 14,
                            bottom: 14,
                            left: 14,
                            right: 14,
                        }}
                        style={[
                            hs.sparkPointButton,
                            {
                                left: point.x - 12,
                                top: point.y - 12,
                            },
                        ]}
                    >
                        <View
                            style={[
                                hs.sparkDot,
                                selected && hs.sparkDotSelected,
                            ]}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}


// ═══════════════════════════════════════════════════════════════
// TEMP / NEW COSTING
//
// Client requirement:
// - cost a tentative design before a Main Design exists
// - choose PD or YD
// - master yarn OR manual yarn per row
// - multiple warp / weft rows
// - optional selvedge
// - same frozen formulas as production CostingEngine
// - local saved-temp history; DOES NOT create/modify a Design Master
//
// Why local persistence:
// Temp/New is intentionally pre-master. Persisting it in AsyncStorage keeps
// tentative work separate from production costing_records and prevents a
// temporary calculation from polluting design/costing history.
// ═══════════════════════════════════════════════════════════════

type TempDyeRoute = 'PD' | 'YD';
type TempYarnSource = 'master' | 'manual';

type TempYarnRow = {
    id: string;
    source: TempYarnSource;
    yarn?: YarnMaster | null;
    manualName: string;
    sys: 'Ne' | 'Lea' | 'Den' | 'Dtx';
    cnt: string;
    basis: string;       // EPI for warp / PPI for weft
    price: string;
    dye: string;
    sizing: boolean;
    sizingRate: string;
};

type TempSelvedge = {
    enabled: boolean;
    source: TempYarnSource;
    yarn?: YarnMaster | null;
    manualName: string;
    sys: 'Ne' | 'Lea' | 'Den' | 'Dtx';
    cnt: string;
    ends: string;        // production engine rule: TOTAL ends
    price: string;
    dyed: boolean;
    dye: string;
};

type TempParams = {
    weavingRate: string;
    rpm: string;
    eff: string;
    greigeBrok: string;
    dyeingProc: string;
    finishedBrok: string;
    cutPack: string;
};

type TempDraft = {
    type: TempDyeRoute | null;
    name: string;
    reedSpace: string;
    warpShrink: string;
    greigeWidth: string;     // blank = auto
    finWidth: string;
    gfShrink: string;
    warpWaste: string;
    weftWaste: string;
    warp: TempYarnRow[];
    weft: TempYarnRow[];
    selvedge: TempSelvedge;
    params: TempParams;
};

type TempComputedRow = {
    id: string;
    name: string;
    grams_per_metre: number;
    kg_per_metre: number;
    price: number;
    dye_cost: number;
    sizing_cost: number;
    rate: number;
    cost: number;
    basis: number;
};

type TempComputed = {
    warp_rows: TempComputedRow[];
    weft_rows: TempComputedRow[];
    selvedge_row: TempComputedRow | null;

    warp_cost: number;
    weft_cost: number;
    selvedge_cost: number;
    warp_waste_cost: number;
    weft_waste_cost: number;
    waste_cost: number;

    snap_rm: number;
    snap_weaving_cost: number;
    snap_greige_mfg: number;
    snap_greige_brok_amt: number;
    snap_greige_price: number;
    snap_greige_kg: number;
    snap_greige_glm: number;

    greige_width: number;
    snap_ppi_loom: number;
    snap_ppi_table: number;
    snap_prod_day: number;
    snap_per_day_conversion: number;
    snap_rm_pct: number;
    snap_weave_pct: number;

    snap_has_fin: boolean;
    shrink_impact: number;
    dye_proc_amount: number;
    fin_brok_amt: number;
    cut_pack: number;
    snap_finished_price: number | null;
    snap_finished_kg: number | null;
    snap_final_cost: number;
};

type SavedTempCosting = {
    id: string;
    saved_at: string;
    draft: TempDraft;
    result: TempComputed;
};

const TEMP_STORAGE_KEY = 'sudamo_costing_temp_new_v1';

const tempNum = (value: any): number => {
    const n = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
};

const tempNonNegative = (value: any): number => {
    const n = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

const tempPct = (value: any, max = 100): number => {
    return Math.min(max, tempNonNegative(value));
};

const tempGpm = (sys: string, count: any): number => {
    const c = tempNum(count);
    if (c <= 0) return 0;

    switch (String(sys || '').toLowerCase()) {
        case 'lea':
            return 1.6535 / c;
        case 'ne':
            return 0.5905 / c;
        case 'den':
            return c / 9000;
        case 'dtx':
            return c / 10000;
        default:
            return 0;
    }
};

const tempRowGpm = (row: TempYarnRow | TempSelvedge): number => {
    if (row.source === 'master' && row.yarn) {
        return tempGpm(String(row.yarn.sys || ''), row.yarn.cnt);
    }
    return tempGpm(row.sys, row.cnt);
};

const tempRowName = (row: TempYarnRow | TempSelvedge): string => {
    if (row.source === 'master' && row.yarn) {
        return String(row.yarn.name || row.yarn.mi_id || 'Master yarn');
    }
    return String(row.manualName || 'Manual yarn').trim() || 'Manual yarn';
};

let tempRowSequence = 1;
const newTempRow = (): TempYarnRow => ({
    id: `tmp-yarn-${Date.now()}-${tempRowSequence++}`,
    source: 'master',
    yarn: null,
    manualName: '',
    sys: 'Ne',
    cnt: '',
    basis: '',
    price: '',
    dye: '',
    sizing: false,
    sizingRate: '',
});

const blankTempDraft = (): TempDraft => ({
    type: null,
    name: '',
    reedSpace: '64',
    warpShrink: '6',
    greigeWidth: '',
    finWidth: '58',
    gfShrink: '5',
    warpWaste: '0',
    weftWaste: '6',
    warp: [],
    weft: [],
    selvedge: {
        enabled: false,
        source: 'master',
        yarn: null,
        manualName: '',
        sys: 'Den',
        cnt: '',
        ends: '',
        price: '',
        dyed: false,
        dye: '',
    },
    params: {
        weavingRate: '0.45',
        rpm: '400',
        eff: '85',
        greigeBrok: '2',
        dyeingProc: '40',
        finishedBrok: '3',
        cutPack: '10',
    },
});

/**
 * TEMP ENGINE — mirrors the frozen rules in App\Services\CostingEngine.
 *
 * Deliberate parity points:
 * - warp grams = EPI × reed space × GPM
 * - PPI table = PPI loom + 2
 * - weft uses table/loom PPI factor
 * - warp/weft wastage adds COST ONLY
 * - selvedge uses TOTAL ENDS and is excluded from body GLM
 * - YD = base + dye; PD ignores per-yarn dye
 * - sizing is warp-only ₹/kg
 * - finished cost starts from GREIGE MFG, not greige selling price
 */
function computeTemporaryCosting(d: TempDraft): TempComputed | null {
    if (!d.type) return null;

    const reedSpace = tempNum(d.reedSpace);
    if (reedSpace <= 0 || d.warp.length === 0 || d.weft.length === 0) return null;

    const warpShrink = tempPct(d.warpShrink, 99.99);
    const greigeWidthInput = tempNum(d.greigeWidth);
    const greigeWidth = greigeWidthInput > 0
        ? greigeWidthInput
        : reedSpace * (1 - warpShrink / 100);

    if (greigeWidth <= 0) return null;

    const validWarp = d.warp.every(r => tempRowGpm(r) > 0 && tempNum(r.basis) > 0);
    const validWeft = d.weft.every(r => tempRowGpm(r) > 0 && tempNum(r.basis) > 0);
    if (!validWarp || !validWeft) return null;

    const isYD = d.type === 'YD';
    const ppiLoom = d.weft.reduce((sum, r) => sum + tempNum(r.basis), 0);
    const ppiTable = ppiLoom > 0 ? ppiLoom + 2 : 0;
    const weftFactor = ppiLoom > 0 ? ppiTable / ppiLoom : 1;

    const warpRows: TempComputedRow[] = d.warp.map(r => {
        const gpm = tempRowGpm(r);
        const epi = tempNum(r.basis);
        const grams = epi * reedSpace * gpm;
        const kg = grams / 1000;
        const price = tempNonNegative(r.price);
        const dye = isYD ? tempNonNegative(r.dye) : 0;
        const sizing = r.sizing ? tempNonNegative(r.sizingRate) : 0;
        const rate = price + dye + sizing;
        return {
            id: r.id,
            name: tempRowName(r),
            grams_per_metre: grams,
            kg_per_metre: kg,
            price,
            dye_cost: dye,
            sizing_cost: sizing,
            rate,
            cost: kg * rate,
            basis: epi,
        };
    });

    const weftRows: TempComputedRow[] = d.weft.map(r => {
        const gpm = tempRowGpm(r);
        const ppi = tempNum(r.basis);
        const grams = ppi * weftFactor * greigeWidth * gpm;
        const kg = grams / 1000;
        const price = tempNonNegative(r.price);
        const dye = isYD ? tempNonNegative(r.dye) : 0;
        const rate = price + dye;
        return {
            id: r.id,
            name: tempRowName(r),
            grams_per_metre: grams,
            kg_per_metre: kg,
            price,
            dye_cost: dye,
            sizing_cost: 0,
            rate,
            cost: kg * rate,
            basis: ppi,
        };
    });

    let selvedgeRow: TempComputedRow | null = null;
    if (d.selvedge.enabled) {
        const gpm = tempRowGpm(d.selvedge);
        const ends = tempNum(d.selvedge.ends);
        if (gpm > 0 && ends > 0) {
            const grams = ends * gpm; // TOTAL ends: exact production engine rule
            const kg = grams / 1000;
            const price = tempNonNegative(d.selvedge.price);
            const dye = isYD && d.selvedge.dyed
                ? tempNonNegative(d.selvedge.dye)
                : 0;
            const rate = price + dye;
            selvedgeRow = {
                id: 'temp-selvedge',
                name: tempRowName(d.selvedge),
                grams_per_metre: grams,
                kg_per_metre: kg,
                price,
                dye_cost: dye,
                sizing_cost: 0,
                rate,
                cost: kg * rate,
                basis: ends,
            };
        }
    }

    const warpCost = warpRows.reduce((s, r) => s + r.cost, 0);
    const weftCost = weftRows.reduce((s, r) => s + r.cost, 0);
    const selvedgeCost = selvedgeRow?.cost || 0;

    const warpWasteCost = warpCost * tempPct(d.warpWaste) / 100;
    const weftWasteCost = weftCost * tempPct(d.weftWaste) / 100;
    const wasteCost = warpWasteCost + weftWasteCost;

    const rawMaterial = warpCost + weftCost + selvedgeCost + wasteCost;
    const weavingCost = tempNonNegative(d.params.weavingRate) * ppiTable;
    const greigeMfg = rawMaterial + weavingCost;

    const greigeBrokAmt = greigeMfg * tempPct(d.params.greigeBrok) / 100;
    const greigePrice = greigeMfg + greigeBrokAmt;

    // Selvedge excluded from body GLM exactly like production CostingEngine.
    const greigeGLM =
        warpRows.reduce((s, r) => s + r.grams_per_metre, 0)
        + weftRows.reduce((s, r) => s + r.grams_per_metre, 0);

    const greigeKg = greigeGLM > 0
        ? greigePrice / (greigeGLM / 1000)
        : 0;

    const rpm = tempNonNegative(d.params.rpm);
    const eff = tempPct(d.params.eff) / 100;
    const prodDay = ppiLoom > 0
        ? (rpm * 24 * 60 * eff) / (39.37 * ppiLoom)
        : 0;
    const perDayConversion = prodDay * weavingCost;

    const rmPct = greigeMfg > 0 ? rawMaterial / greigeMfg * 100 : 0;
    const weavePct = greigeMfg > 0 ? weavingCost / greigeMfg * 100 : 0;

    const finWidth = tempNum(d.finWidth);
    const gfShrink = tempPct(d.gfShrink, 99.99);
    const hasFin = finWidth > 0;

    let finishedPrice: number | null = null;
    let finishedKg: number | null = null;
    let shrinkImpact = 0;
    let dyeingProc = 0;
    let finBrokAmt = 0;
    let cutPack = 0;

    if (hasFin) {
        const finishFactor = 1 - gfShrink / 100;
        if (finishFactor <= 0) return null;

        const finishedBase = greigeMfg / finishFactor;
        shrinkImpact = finishedBase - greigeMfg;
        dyeingProc = tempNonNegative(d.params.dyeingProc);
        const subtotal = finishedBase + dyeingProc;
        finBrokAmt = subtotal * tempPct(d.params.finishedBrok) / 100;
        cutPack = tempNonNegative(d.params.cutPack);
        finishedPrice = subtotal + finBrokAmt + cutPack;

        const finishedGLM = greigeGLM / finishFactor;
        finishedKg = finishedGLM > 0
            ? finishedPrice / (finishedGLM / 1000)
            : 0;
    }

    return {
        warp_rows: warpRows,
        weft_rows: weftRows,
        selvedge_row: selvedgeRow,

        warp_cost: warpCost,
        weft_cost: weftCost,
        selvedge_cost: selvedgeCost,
        warp_waste_cost: warpWasteCost,
        weft_waste_cost: weftWasteCost,
        waste_cost: wasteCost,

        snap_rm: rawMaterial,
        snap_weaving_cost: weavingCost,
        snap_greige_mfg: greigeMfg,
        snap_greige_brok_amt: greigeBrokAmt,
        snap_greige_price: greigePrice,
        snap_greige_kg: greigeKg,
        snap_greige_glm: greigeGLM,

        greige_width: greigeWidth,
        snap_ppi_loom: ppiLoom,
        snap_ppi_table: ppiTable,
        snap_prod_day: prodDay,
        snap_per_day_conversion: perDayConversion,
        snap_rm_pct: rmPct,
        snap_weave_pct: weavePct,

        snap_has_fin: hasFin,
        shrink_impact: shrinkImpact,
        dye_proc_amount: dyeingProc,
        fin_brok_amt: finBrokAmt,
        cut_pack: cutPack,
        snap_finished_price: finishedPrice,
        snap_finished_kg: finishedKg,
        snap_final_cost: finishedPrice ?? greigePrice,
    };
}

function TempMasterYarnPicker({
    visible,
    title,
    onClose,
    onSelect,
}: {
    visible: boolean;
    title: string;
    onClose: () => void;
    onSelect: (y: YarnMaster) => void;
}) {
    const [stage, setStage] = useState<'main' | 'items'>('main');
    const [search, setSearch] = useState('');
    const [mainRows, setMainRows] = useState<any[]>([]);
    const [itemRows, setItemRows] = useState<YarnMaster[]>([]);
    const [selectedMain, setSelectedMain] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const seq = React.useRef(0);

    const reset = useCallback(() => {
        seq.current += 1;
        setStage('main');
        setSearch('');
        setMainRows([]);
        setItemRows([]);
        setSelectedMain(null);
        setLoading(false);
        setError('');
    }, []);

    const close = useCallback(() => {
        reset();
        onClose();
    }, [onClose, reset]);

    const loadMain = useCallback(async (term: string) => {
        if (!visible || stage !== 'main') return;
        const id = ++seq.current;
        setLoading(true);
        setError('');
        try {
            const res: any = await (DesignAPI.yarns as any)({
                mode: 'main',
                limit: 100,
                search: term.trim() || undefined,
            });
            if (id !== seq.current) return;
            if (res?.data?.success !== true) {
                throw new Error(res?.data?.message || 'Unable to load yarn master.');
            }
            setMainRows(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (e: any) {
            if (id !== seq.current) return;
            setMainRows([]);
            setError(String(e?.response?.data?.message || e?.message || 'Unable to load yarn master.'));
        } finally {
            if (id === seq.current) setLoading(false);
        }
    }, [stage, visible]);

    const loadItems = useCallback(async (main: any, term = '') => {
        const id = ++seq.current;
        setLoading(true);
        setError('');
        try {
            const res: any = await (DesignAPI.yarns as any)({
                mode: 'items',
                main_yarn_code: main?.main_yarn_code || main?.m_itm_code,
                limit: 100,
                search: term.trim() || undefined,
            });
            if (id !== seq.current) return;
            if (res?.data?.success !== true) {
                throw new Error(res?.data?.message || 'Unable to load yarn variants.');
            }
            setItemRows(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (e: any) {
            if (id !== seq.current) return;
            setItemRows([]);
            setError(String(e?.response?.data?.message || e?.message || 'Unable to load yarn variants.'));
        } finally {
            if (id === seq.current) setLoading(false);
        }
    }, []);

    /*
     * Reset the picker ONLY when the modal visibility changes.
     *
     * Production bug fixed:
     * loadMain() depends on `stage`. The previous effect also depended on
     * loadMain(), so selecting a Main Yarn changed stage -> 'items', changed
     * the loadMain callback identity, re-ran this effect, called reset(), and
     * immediately sent the user back to the Main Yarn help again.
     *
     * The search/loading effect below is already responsible for fetching
     * the correct list for the current stage, so this effect must never
     * depend on loadMain/loadItems/stage.
     */
    useEffect(() => {
        if (!visible) return;
        reset();
    }, [visible, reset]);

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => {
            if (stage === 'main') {
                void loadMain(search);
            } else if (selectedMain) {
                void loadItems(selectedMain, search);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [search, stage, selectedMain, visible, loadMain, loadItems]);

    const chooseMain = (row: any) => {
        const direct = row?.direct_item;

        /*
         * Some Main Yarn results already resolve to one selectable item.
         * In that case commit it immediately and close the help.
         */
        if (direct && direct.mi_id) {
            onSelect(direct as YarnMaster);
            close();
            return;
        }

        /*
         * For a Main Yarn with variants, switch to the item/blend stage.
         * Do NOT call loadItems() here as well: the stage/search effect below
         * performs exactly one request. This avoids duplicate requests and
         * makes the modal transition deterministic.
         */
        seq.current += 1;
        setSelectedMain(row);
        setItemRows([]);
        setSearch('');
        setStage('items');
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <View style={tm.modalBackdrop}>
                <View style={tm.modalCard}>
                    <View style={tm.modalHeader}>
                        {stage === 'items' && (
                            <TouchableOpacity
                                onPress={() => {
                                    seq.current += 1;
                                    setStage('main');
                                    setSelectedMain(null);
                                    setSearch('');
                                    setItemRows([]);
                                }}
                                style={tm.backBtn}
                            >
                                <Text style={tm.backBtnTxt}>‹</Text>
                            </TouchableOpacity>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={tm.modalTitle}>{title}</Text>
                            <Text style={tm.modalSub}>
                                {stage === 'main'
                                    ? 'Select Main Yarn'
                                    : `${selectedMain?.main_yarn_code || ''} · select item / blend`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={close}>
                            <Text style={tm.closeTxt}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={stage === 'main' ? 'Search yarn…' : 'Search item / blend…'}
                        placeholderTextColor={T.muted}
                        style={tm.search}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />

                    {loading && <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} />}
                    {!!error && <Text style={tm.error}>{error}</Text>}

                    {!loading && (
                        <FlatList
                            data={stage === 'main' ? mainRows : itemRows}
                            keyExtractor={(item: any, index) =>
                                String(
                                    stage === 'main'
                                        ? item?.main_yarn_code || item?.m_itm_code || index
                                        : item?.itm_code || item?.mi_id || index
                                )
                            }
                            style={{ maxHeight: 420 }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }: any) => (
                                <TouchableOpacity
                                    style={tm.pickRow}
                                    onPress={() => {
                                        if (stage === 'main') {
                                            chooseMain(item);
                                        } else {
                                            onSelect(item as YarnMaster);
                                            close();
                                        }
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={tm.pickName}>
                                            {item?.name || item?.main_yarn_code || item?.mi_id}
                                        </Text>
                                        <Text style={tm.pickSub}>
                                            {stage === 'main'
                                                ? `Main ${item?.main_yarn_code || item?.m_itm_code || ''}`
                                                : `Item ${item?.itm_code || item?.mi_id || ''} · ${item?.sys || '—'} ${item?.cnt || ''} · ₹${Number(item?.price || 0).toFixed(2)}/kg`}
                                        </Text>
                                    </View>
                                    <Text style={tm.pickArrow}>›</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={tm.empty}>No yarn found</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

function TempYarnEditor({
    title,
    direction,
    rows,
    type,
    onChange,
    onPickMaster,
}: {
    title: string;
    direction: 'warp' | 'weft';
    rows: TempYarnRow[];
    type: TempDyeRoute;
    onChange: (rows: TempYarnRow[]) => void;
    onPickMaster: (index: number) => void;
}) {
    const update = (index: number, patch: Partial<TempYarnRow>) => {
        onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
    };

    return (
        <View style={tm.card}>
            <Text style={tm.sectionCap}>
                {title} · rate per row{type === 'YD' ? ' (+ dye)' : ''}
            </Text>

            {rows.map((row, index) => {
                const gpm = tempRowGpm(row);
                return (
                    <View key={row.id} style={tm.yarnCard}>
                        <View style={tm.rowTop}>
                            <View style={tm.segment}>
                                <TouchableOpacity
                                    style={[tm.segmentBtn, row.source === 'master' && tm.segmentBtnActive]}
                                    onPress={() => update(index, { source: 'master' })}
                                >
                                    <Text style={[tm.segmentTxt, row.source === 'master' && tm.segmentTxtActive]}>
                                        Master
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[tm.segmentBtn, row.source === 'manual' && tm.segmentBtnCopper]}
                                    onPress={() => update(index, { source: 'manual', yarn: null })}
                                >
                                    <Text style={[tm.segmentTxt, row.source === 'manual' && tm.segmentTxtActive]}>
                                        Manual
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => onChange(rows.filter((_, i) => i !== index))}
                                style={tm.deleteBtn}
                            >
                                <Text style={tm.deleteTxt}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {row.source === 'master' ? (
                            <TouchableOpacity style={tm.masterTrigger} onPress={() => onPickMaster(index)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={row.yarn ? tm.masterName : tm.masterPh}>
                                        {row.yarn
                                            ? `${row.yarn.name} · ${row.yarn.mi_id}`
                                            : '— select master yarn —'}
                                    </Text>
                                    {!!row.yarn && (
                                        <Text style={tm.masterSub}>
                                            {row.yarn.sys} {row.yarn.cnt} · ₹{Number(row.yarn.price || 0).toFixed(2)}/kg
                                        </Text>
                                    )}
                                </View>
                                <Text style={tm.pickArrow}>›</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ gap: 7 }}>
                                <TextInput
                                    value={row.manualName}
                                    onChangeText={v => update(index, { manualName: v })}
                                    placeholder="Yarn name (free text)"
                                    placeholderTextColor={T.muted}
                                    style={tm.textField}
                                />
                                <View style={tm.twoCol}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={tm.miniLabel}>COUNT SYSTEM</Text>
                                        <View style={tm.sysRow}>
                                            {(['Ne', 'Lea', 'Den', 'Dtx'] as const).map(sys => (
                                                <TouchableOpacity
                                                    key={sys}
                                                    style={[tm.sysChip, row.sys === sys && tm.sysChipActive]}
                                                    onPress={() => update(index, { sys })}
                                                >
                                                    <Text style={[tm.sysTxt, row.sys === sys && tm.sysTxtActive]}>
                                                        {sys}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={{ width: 112 }}>
                                        <Text style={tm.miniLabel}>COUNT</Text>
                                        <Inp value={row.cnt} onChange={v => update(index, { cnt: v })} />
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={[tm.inlineInputs, { marginTop: 8 }]}>
                            <View style={tm.inlineCell}>
                                <Text style={tm.miniLabel}>{direction === 'warp' ? 'EPI' : 'PPI'}</Text>
                                <Inp value={row.basis} onChange={v => update(index, { basis: v })} />
                            </View>

                            <View style={tm.inlineCell}>
                                <Text style={tm.miniLabel}>₹ / KG</Text>
                                <Inp value={row.price} onChange={v => update(index, { price: v })} />
                            </View>

                            {type === 'YD' && (
                                <View style={tm.inlineCell}>
                                    <Text style={tm.miniLabel}>DYE ₹ / KG</Text>
                                    <Inp value={row.dye} onChange={v => update(index, { dye: v })} />
                                </View>
                            )}
                        </View>

                        {direction === 'warp' && (
                            <View style={{ marginTop: 8 }}>
                                <TouchableOpacity
                                    style={[tm.toggle, row.sizing && tm.toggleActive]}
                                    onPress={() => update(index, { sizing: !row.sizing })}
                                >
                                    <Text style={[tm.toggleTxt, row.sizing && tm.toggleTxtActive]}>
                                        {row.sizing ? '✓ Sizing applied' : 'Sizing'}
                                    </Text>
                                </TouchableOpacity>

                                {row.sizing && (
                                    <View style={{ marginTop: 7 }}>
                                        <Text style={tm.miniLabel}>SIZING ₹ / KG</Text>
                                        <Inp
                                            value={row.sizingRate}
                                            onChange={v => update(index, { sizingRate: v })}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={[tm.gpmHint, gpm <= 0 && { color: '#B7791F' }]}>
                            {gpm > 0
                                ? `Engineering GPM ${gpm.toFixed(6)}`
                                : row.source === 'master'
                                    ? 'Select a master yarn'
                                    : 'Enter a valid count'}
                        </Text>
                    </View>
                );
            })}

            <TouchableOpacity
                style={tm.addBtn}
                onPress={() => onChange([...rows, newTempRow()])}
            >
                <Text style={tm.addBtnTxt}>+ Add {direction} yarn</Text>
            </TouchableOpacity>
        </View>
    );
}

function TempCostingTab() {
    const [draft, setDraft] = useState<TempDraft>(() => blankTempDraft());
    const [saved, setSaved] = useState<SavedTempCosting[]>([]);
    const [picker, setPicker] = useState<{ kind: 'warp' | 'weft' | 'selvedge'; index?: number } | null>(null);
    const [savingTemp, setSavingTemp] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(TEMP_STORAGE_KEY)
            .then(raw => {
                if (!raw) return;
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) setSaved(parsed);
                } catch {
                    // Ignore old/corrupt temporary local data.
                }
            })
            .catch(() => {});
    }, []);

    const persistSaved = useCallback(async (rows: SavedTempCosting[]) => {
        setSaved(rows);
        try {
            await AsyncStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(rows.slice(0, 50)));
        } catch (e: any) {
            Alert.alert('Temporary costing', e?.message || 'Unable to save temporary costing locally.');
        }
    }, []);

    const result = useMemo(() => computeTemporaryCosting(draft), [draft]);

    const startRoute = (type: TempDyeRoute) => {
        const next = blankTempDraft();
        next.type = type;
        next.warp = [newTempRow()];
        next.weft = [newTempRow()];
        setDraft(next);
    };

    const updateDraft = (patch: Partial<TempDraft>) => {
        setDraft(current => ({ ...current, ...patch }));
    };

    const updateParams = (key: keyof TempParams, value: string) => {
        setDraft(current => ({
            ...current,
            params: { ...current.params, [key]: value },
        }));
    };

    const applyPickedYarn = (yarn: YarnMaster) => {
        if (!picker) return;

        if (picker.kind === 'warp' || picker.kind === 'weft') {
            const rows = picker.kind === 'warp' ? draft.warp : draft.weft;
            const index = picker.index ?? -1;
            if (index < 0 || index >= rows.length) return;

            const next = rows.map((row, i) => i === index
                ? {
                    ...row,
                    source: 'master' as const,
                    yarn,
                    price: row.price !== '' ? row.price : String(Number(yarn.price || 0)),
                }
                : row
            );

            if (picker.kind === 'warp') updateDraft({ warp: next });
            else updateDraft({ weft: next });
        } else {
            updateDraft({
                selvedge: {
                    ...draft.selvedge,
                    source: 'master',
                    yarn,
                    price: draft.selvedge.price !== ''
                        ? draft.selvedge.price
                        : String(Number(yarn.price || 0)),
                },
            });
        }
    };

    const saveTemp = async () => {
        if (!result) {
            Alert.alert(
                'Temporary costing',
                'Enter Reed Space and at least one valid Warp and Weft yarn before saving.'
            );
            return;
        }

        setSavingTemp(true);
        try {
            const now = new Date();
            const rec: SavedTempCosting = {
                id: `TC-${now.getTime()}`,
                saved_at: now.toISOString(),
                draft: JSON.parse(JSON.stringify(draft)),
                result: JSON.parse(JSON.stringify(result)),
            };
            await persistSaved([rec, ...saved]);
            Alert.alert('Temporary costing', 'Temporary costing saved on this device.');
        } finally {
            setSavingTemp(false);
        }
    };

    const shareTemp = async () => {
        if (!result) return;

        const lines = [
            'TEMPORARY FABRIC COSTING',
            `${draft.name || 'New design'} · ${draft.type}`,
            `Reed: ${Number(draft.reedSpace || 0).toFixed(2)}"`,
            `Greige width: ${result.greige_width.toFixed(2)}"`,
            `PPI loom/table: ${result.snap_ppi_loom.toFixed(2)} / ${result.snap_ppi_table.toFixed(2)}`,
            '',
            `Raw material: ${r2(result.snap_rm)}`,
            `Weaving: ${r2(result.snap_weaving_cost)}`,
            `Greige: ${r2(result.snap_greige_price)}/m`,
            result.snap_has_fin ? `Finished: ${r2(result.snap_final_cost)}/m` : '',
            '',
            'Tentative pre-master estimate.',
        ].filter(Boolean);

        try {
            await Share.share({ message: lines.join('\n') });
        } catch (e: any) {
            Alert.alert('Share Error', e?.message || 'Unable to share temporary costing.');
        }
    };

    if (!draft.type) {
        return (
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={tm.card}>
                    <Text style={tm.heroTitle}>Temporary costing</Text>
                    <Text style={tm.heroText}>
                        Tentative costing for a new design before masters exist — same production
                        formulas as main costing. Yarns can be picked from ERP Yarn Master or entered
                        manually. Start with the dye route:
                    </Text>

                    <View style={tm.routeRow}>
                        <TouchableOpacity style={[tm.routeBtn, { borderColor: T.nav }]} onPress={() => startRoute('PD')}>
                            <Text style={[tm.routeTitle, { color: T.nav }]}>Piece Dyed</Text>
                            <Text style={tm.routeSub}>dye at fabric stage</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[tm.routeBtn, { borderColor: '#7B3FA0' }]} onPress={() => startRoute('YD')}>
                            <Text style={[tm.routeTitle, { color: '#7B3FA0' }]}>Yarn Dyed</Text>
                            <Text style={tm.routeSub}>per-yarn dye rates</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {saved.length > 0 && (
                    <View style={tm.card}>
                        <Text style={tm.sectionCap}>SAVED TEMP COSTINGS ({saved.length})</Text>
                        {saved.map(rec => (
                            <View key={rec.id} style={tm.savedRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={tm.savedTitle} numberOfLines={1}>
                                        {rec.draft.name || `${rec.draft.type} · reed ${rec.draft.reedSpace}"`}
                                    </Text>
                                    <Text style={tm.savedSub}>
                                        {rec.saved_at.slice(0, 10)} · {rec.draft.type} ·
                                        {' '}Greige {r2(rec.result.snap_greige_price)}
                                        {rec.result.snap_has_fin ? ` · Fin ${r2(rec.result.snap_final_cost)}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={tm.savedAction}
                                    onPress={() => setDraft(JSON.parse(JSON.stringify(rec.draft)))}
                                >
                                    <Text style={tm.savedActionTxt}>Open</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={tm.savedDelete}
                                    onPress={() => void persistSaved(saved.filter(x => x.id !== rec.id))}
                                >
                                    <Text style={tm.deleteTxt}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    }

    const autoGreige =
        tempNum(draft.reedSpace) > 0
            ? tempNum(draft.reedSpace) * (1 - tempPct(draft.warpShrink, 99.99) / 100)
            : 0;

    return (
        <>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={tm.topLine}>
                    <View style={[tm.typeBadge, { borderColor: draft.type === 'YD' ? '#7B3FA0' : T.nav }]}>
                        <Text style={{ color: draft.type === 'YD' ? '#7B3FA0' : T.nav, fontWeight: '800', fontSize: 11 }}>
                            {draft.type}
                        </Text>
                    </View>

                    <TextInput
                        value={draft.name}
                        onChangeText={v => updateDraft({ name: v })}
                        placeholder="Working name (optional)"
                        placeholderTextColor={T.muted}
                        style={[tm.textField, { flex: 1 }]}
                    />

                    <TouchableOpacity
                        style={tm.restartBtn}
                        onPress={() => setDraft(blankTempDraft())}
                    >
                        <Text style={tm.restartTxt}>↺ Restart</Text>
                    </TouchableOpacity>
                </View>

                <View style={tm.card}>
                    <Text style={tm.sectionCap}>CONSTRUCTION</Text>

                    <View style={tm.twoCol}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>REED SPACE</Text>
                            <Inp value={draft.reedSpace} onChange={v => updateDraft({ reedSpace: v })} suffix={'"'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>WARP SHRINK</Text>
                            <Inp value={draft.warpShrink} onChange={v => updateDraft({ warpShrink: v })} suffix="%" />
                        </View>
                    </View>

                    <View style={{ marginTop: 10 }}>
                        <Text style={tm.miniLabel}>GREIGE WIDTH</Text>
                        <Text style={tm.helper}>
                            {draft.greigeWidth !== ''
                                ? 'manual override'
                                : 'auto = reed × (1 − warp shrink)'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Inp
                                    value={draft.greigeWidth !== '' ? draft.greigeWidth : (autoGreige > 0 ? String(Number(autoGreige.toFixed(2))) : '')}
                                    onChange={v => updateDraft({ greigeWidth: v })}
                                    suffix={'"'}
                                />
                            </View>
                            {draft.greigeWidth !== '' && (
                                <TouchableOpacity style={tm.autoBtn} onPress={() => updateDraft({ greigeWidth: '' })}>
                                    <Text style={tm.autoBtnTxt}>↺ auto</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={[tm.twoCol, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>FINISHED WIDTH</Text>
                            <Inp value={draft.finWidth} onChange={v => updateDraft({ finWidth: v })} suffix={'"'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>FINISH SHRINK</Text>
                            <Inp value={draft.gfShrink} onChange={v => updateDraft({ gfShrink: v })} suffix="%" />
                        </View>
                    </View>

                    <View style={[tm.twoCol, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>WARP WASTAGE</Text>
                            <Inp value={draft.warpWaste} onChange={v => updateDraft({ warpWaste: v })} suffix="%" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>WEFT WASTAGE</Text>
                            <Inp value={draft.weftWaste} onChange={v => updateDraft({ weftWaste: v })} suffix="%" />
                        </View>
                    </View>
                </View>

                <TempYarnEditor
                    title="WARP YARNS"
                    direction="warp"
                    rows={draft.warp}
                    type={draft.type}
                    onChange={rows => updateDraft({ warp: rows })}
                    onPickMaster={index => setPicker({ kind: 'warp', index })}
                />

                <TempYarnEditor
                    title="WEFT YARNS"
                    direction="weft"
                    rows={draft.weft}
                    type={draft.type}
                    onChange={rows => updateDraft({ weft: rows })}
                    onPickMaster={index => setPicker({ kind: 'weft', index })}
                />

                <View style={tm.card}>
                    <Text style={tm.sectionCap}>SELVEDGE · optional, cost only</Text>

                    {!draft.selvedge.enabled ? (
                        <TouchableOpacity
                            style={tm.addBtn}
                            onPress={() => updateDraft({
                                selvedge: { ...draft.selvedge, enabled: true },
                            })}
                        >
                            <Text style={tm.addBtnTxt}>+ Add selvedge</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <View style={tm.rowTop}>
                                <View style={tm.segment}>
                                    <TouchableOpacity
                                        style={[tm.segmentBtn, draft.selvedge.source === 'master' && tm.segmentBtnActive]}
                                        onPress={() => updateDraft({
                                            selvedge: { ...draft.selvedge, source: 'master' },
                                        })}
                                    >
                                        <Text style={[tm.segmentTxt, draft.selvedge.source === 'master' && tm.segmentTxtActive]}>
                                            Master
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[tm.segmentBtn, draft.selvedge.source === 'manual' && tm.segmentBtnCopper]}
                                        onPress={() => updateDraft({
                                            selvedge: { ...draft.selvedge, source: 'manual', yarn: null },
                                        })}
                                    >
                                        <Text style={[tm.segmentTxt, draft.selvedge.source === 'manual' && tm.segmentTxtActive]}>
                                            Manual
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={tm.deleteBtn}
                                    onPress={() => updateDraft({
                                        selvedge: { ...draft.selvedge, enabled: false },
                                    })}
                                >
                                    <Text style={tm.deleteTxt}>×</Text>
                                </TouchableOpacity>
                            </View>

                            {draft.selvedge.source === 'master' ? (
                                <TouchableOpacity style={tm.masterTrigger} onPress={() => setPicker({ kind: 'selvedge' })}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={draft.selvedge.yarn ? tm.masterName : tm.masterPh}>
                                            {draft.selvedge.yarn
                                                ? `${draft.selvedge.yarn.name} · ${draft.selvedge.yarn.mi_id}`
                                                : '— select selvedge yarn —'}
                                        </Text>
                                        {!!draft.selvedge.yarn && (
                                            <Text style={tm.masterSub}>
                                                {draft.selvedge.yarn.sys} {draft.selvedge.yarn.cnt}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={tm.pickArrow}>›</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    <TextInput
                                        value={draft.selvedge.manualName}
                                        onChangeText={v => updateDraft({
                                            selvedge: { ...draft.selvedge, manualName: v },
                                        })}
                                        placeholder="Selvedge yarn name"
                                        placeholderTextColor={T.muted}
                                        style={tm.textField}
                                    />
                                    <View style={tm.twoCol}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={tm.miniLabel}>SYSTEM</Text>
                                            <View style={tm.sysRow}>
                                                {(['Ne', 'Lea', 'Den', 'Dtx'] as const).map(sys => (
                                                    <TouchableOpacity
                                                        key={sys}
                                                        style={[tm.sysChip, draft.selvedge.sys === sys && tm.sysChipActive]}
                                                        onPress={() => updateDraft({
                                                            selvedge: { ...draft.selvedge, sys },
                                                        })}
                                                    >
                                                        <Text style={[tm.sysTxt, draft.selvedge.sys === sys && tm.sysTxtActive]}>
                                                            {sys}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                        <View style={{ width: 112 }}>
                                            <Text style={tm.miniLabel}>COUNT</Text>
                                            <Inp
                                                value={draft.selvedge.cnt}
                                                onChange={v => updateDraft({
                                                    selvedge: { ...draft.selvedge, cnt: v },
                                                })}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View style={[tm.inlineInputs, { marginTop: 8 }]}>
                                <View style={tm.inlineCell}>
                                    <Text style={tm.miniLabel}>TOTAL ENDS</Text>
                                    <Inp
                                        value={draft.selvedge.ends}
                                        onChange={v => updateDraft({
                                            selvedge: { ...draft.selvedge, ends: v },
                                        })}
                                    />
                                </View>
                                <View style={tm.inlineCell}>
                                    <Text style={tm.miniLabel}>₹ / KG</Text>
                                    <Inp
                                        value={draft.selvedge.price}
                                        onChange={v => updateDraft({
                                            selvedge: { ...draft.selvedge, price: v },
                                        })}
                                    />
                                </View>
                            </View>

                            {draft.type === 'YD' && (
                                <View style={{ marginTop: 8 }}>
                                    <TouchableOpacity
                                        style={[tm.toggle, draft.selvedge.dyed && tm.togglePurple]}
                                        onPress={() => updateDraft({
                                            selvedge: { ...draft.selvedge, dyed: !draft.selvedge.dyed },
                                        })}
                                    >
                                        <Text style={[tm.toggleTxt, draft.selvedge.dyed && tm.toggleTxtActive]}>
                                            {draft.selvedge.dyed ? '✓ Dyed selvedge' : 'Dyed?'}
                                        </Text>
                                    </TouchableOpacity>
                                    {draft.selvedge.dyed && (
                                        <View style={{ marginTop: 7 }}>
                                            <Text style={tm.miniLabel}>DYE ₹ / KG</Text>
                                            <Inp
                                                value={draft.selvedge.dye}
                                                onChange={v => updateDraft({
                                                    selvedge: { ...draft.selvedge, dye: v },
                                                })}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={tm.card}>
                    <Text style={tm.sectionCap}>CONVERSION & FINISHING</Text>

                    <Text style={tm.miniLabel}>WEAVING RATE · ₹ per pick (× PPI table)</Text>
                    <Inp value={draft.params.weavingRate} onChange={v => updateParams('weavingRate', v)} suffix="₹/pick" />

                    <View style={[tm.twoCol, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>LOOM RPM</Text>
                            <Inp value={draft.params.rpm} onChange={v => updateParams('rpm', v)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>EFFICIENCY</Text>
                            <Inp value={draft.params.eff} onChange={v => updateParams('eff', v)} suffix="%" />
                        </View>
                    </View>

                    <View style={[tm.twoCol, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>GREIGE BROKERAGE</Text>
                            <Inp value={draft.params.greigeBrok} onChange={v => updateParams('greigeBrok', v)} suffix="%" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>DYE / PROC</Text>
                            <Inp value={draft.params.dyeingProc} onChange={v => updateParams('dyeingProc', v)} suffix="₹/m" />
                        </View>
                    </View>

                    <View style={[tm.twoCol, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>FINISHED BROKERAGE</Text>
                            <Inp value={draft.params.finishedBrok} onChange={v => updateParams('finishedBrok', v)} suffix="%" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={tm.miniLabel}>CUT / PACK</Text>
                            <Inp value={draft.params.cutPack} onChange={v => updateParams('cutPack', v)} suffix="₹/m" />
                        </View>
                    </View>
                </View>

                {!result ? (
                    <View style={[tm.card, { borderLeftWidth: 4, borderLeftColor: '#B7791F' }]}>
                        <Text style={tm.helperStrong}>
                            Enter Reed Space and at least one valid Warp & Weft yarn
                            (Master picked, or Manual with a count) to see the tentative costing.
                        </Text>
                    </View>
                ) : (
                    <View style={[tm.card, { borderWidth: 2, borderColor: T.nav }]}>
                        <Text style={tm.sectionCap}>TENTATIVE COSTING · same frozen formulas as main module</Text>
                        <Text style={tm.summaryLine}>
                            Greige width <Text style={tm.summaryStrong}>{result.greige_width.toFixed(2)}"</Text>
                            {' · '}GLM <Text style={tm.summaryStrong}>{result.snap_greige_glm.toFixed(2)} g</Text>
                            {' · '}PPI table <Text style={tm.summaryStrong}>{result.snap_ppi_table.toFixed(2)}</Text>
                        </Text>

                        <ResRow label="Warp yarn" value={r2(result.warp_cost)} />
                        <ResRow label="Weft yarn" value={r2(result.weft_cost)} />
                        {result.selvedge_cost > 0 && <ResRow label="Selvedge" value={r2(result.selvedge_cost)} />}
                        {result.waste_cost > 0 && <ResRow label="Wastage" value={r2(result.waste_cost)} />}
                        <View style={tm.divider} />
                        <ResRow label="Raw material" value={r2(result.snap_rm)} highlight />
                        <ResRow label={`Weaving (${result.snap_ppi_table.toFixed(0)} picks)`} value={r2(result.snap_weaving_cost)} />
                        <ResRow label="Greige brokerage" value={r2(result.snap_greige_brok_amt)} />

                        <View style={tm.priceRow}>
                            <View>
                                <Text style={tm.priceCap}>GREIGE</Text>
                                <Text style={tm.bigPrice}>{r2(result.snap_greige_price)}<Text style={tm.perM}>/m</Text></Text>
                                <Text style={tm.kgPrice}>{r2(result.snap_greige_kg)}/kg</Text>
                            </View>
                            {result.snap_has_fin && (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={tm.priceCap}>FINISHED</Text>
                                    <Text style={[tm.bigPrice, { color: T.copper }]}>{r2(result.snap_final_cost)}<Text style={tm.perM}>/m</Text></Text>
                                    {!!result.snap_finished_kg && <Text style={tm.kgPrice}>{r2(result.snap_finished_kg)}/kg</Text>}
                                </View>
                            )}
                        </View>

                        <View style={tm.kpiRow}>
                            <View style={tm.kpiBox}>
                                <Text style={tm.kpiCap}>PRODUCTION / DAY</Text>
                                <Text style={tm.kpiVal}>{Math.round(result.snap_prod_day)} m</Text>
                            </View>
                            <View style={tm.kpiBox}>
                                <Text style={tm.kpiCap}>CONVERSION / DAY</Text>
                                <Text style={tm.kpiVal}>{r0(result.snap_per_day_conversion)}</Text>
                            </View>
                        </View>

                        <View style={tm.actionRow}>
                            <TouchableOpacity
                                style={[tm.primaryBtn, { backgroundColor: T.nav }]}
                                onPress={() => void saveTemp()}
                                disabled={savingTemp}
                            >
                                {savingTemp
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={tm.primaryBtnTxt}>Save temp costing</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={tm.outlineBtn} onPress={() => void shareTemp()}>
                                <Text style={tm.outlineBtnTxt}>Copy / WhatsApp</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            <TempMasterYarnPicker
                visible={picker !== null}
                title={
                    picker?.kind === 'warp'
                        ? 'Select warp yarn'
                        : picker?.kind === 'weft'
                            ? 'Select weft yarn'
                            : 'Select selvedge yarn'
                }
                onClose={() => setPicker(null)}
                onSelect={yarn => {
                    applyPickedYarn(yarn);
                    setPicker(null);
                }}
            />

        </>
    );
}

const tm = StyleSheet.create({
    card: {
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        marginBottom: 10,
    },
    heroTitle: { fontSize: 17, fontWeight: '800', color: T.ink, marginBottom: 5 },
    heroText: { fontSize: 12, color: T.muted, lineHeight: 18, marginBottom: 13 },
    routeRow: { flexDirection: 'row', gap: 10 },
    routeBtn: { flex: 1, minHeight: 88, borderWidth: 2, borderRadius: 11, alignItems: 'center', justifyContent: 'center', padding: 10 },
    routeTitle: { fontSize: 15, fontWeight: '800' },
    routeSub: { fontSize: 10, color: T.muted, marginTop: 3, textAlign: 'center' },

    topLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
    typeBadge: { borderWidth: 1.5, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 7 },
    restartBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 10 },
    restartTxt: { fontSize: 10, fontWeight: '700', color: T.muted },

    sectionCap: { fontSize: 9, fontWeight: '800', color: T.ink, letterSpacing: 0.6, marginBottom: 10 },
    miniLabel: { fontSize: 8.5, fontWeight: '700', color: T.muted, letterSpacing: 0.4, marginBottom: 5 },
    helper: { fontSize: 9.5, color: T.muted, marginTop: -2, marginBottom: 5 },
    helperStrong: { fontSize: 11.5, color: T.muted, lineHeight: 17 },
    twoCol: { flexDirection: 'row', gap: 10 },
    textField: { minHeight: 46, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 9, paddingHorizontal: 12, fontSize: 14, color: T.ink },

    yarnCard: { backgroundColor: T.sub, borderRadius: 10, padding: 10, marginBottom: 8 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
    segment: { flexDirection: 'row', gap: 5 },
    segmentBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
    segmentBtnActive: { backgroundColor: T.nav, borderColor: T.nav },
    segmentBtnCopper: { backgroundColor: T.copper, borderColor: T.copper },
    segmentTxt: { fontSize: 9.5, fontWeight: '800', color: T.muted },
    segmentTxtActive: { color: '#fff' },
    deleteBtn: { paddingHorizontal: 7, paddingVertical: 2 },
    deleteTxt: { fontSize: 20, color: '#A94442', fontWeight: '600' },

    masterTrigger: { minHeight: 48, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
    masterName: { fontSize: 12.5, fontWeight: '700', color: T.ink },
    masterPh: { fontSize: 12.5, color: T.muted },
    masterSub: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    inlineInputs: { flexDirection: 'row', gap: 7 },
    inlineCell: { flex: 1 },
    gpmHint: { marginTop: 7, fontSize: 9, color: T.muted },

    addBtn: { minHeight: 45, borderWidth: 1.5, borderColor: T.copper, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    addBtnTxt: { color: T.copper, fontWeight: '800', fontSize: 12 },
    toggle: { alignSelf: 'flex-start', borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
    toggleActive: { backgroundColor: T.copper, borderColor: T.copper },
    togglePurple: { backgroundColor: '#7B3FA0', borderColor: '#7B3FA0' },
    toggleTxt: { fontSize: 9.5, fontWeight: '800', color: T.muted },
    toggleTxtActive: { color: '#fff' },
    sysRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    sysChip: { borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 6 },
    sysChipActive: { backgroundColor: T.nav, borderColor: T.nav },
    sysTxt: { fontSize: 9.5, fontWeight: '700', color: T.muted },
    sysTxtActive: { color: '#fff' },

    autoBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 12 },
    autoBtnTxt: { fontSize: 9.5, color: T.muted, fontWeight: '700' },

    divider: { height: 1, backgroundColor: T.border, marginVertical: 6 },
    summaryLine: { fontSize: 10.5, color: T.muted, lineHeight: 16, marginBottom: 8 },
    summaryStrong: { color: T.ink, fontWeight: '700' },
    priceRow: { borderTopWidth: 1, borderTopColor: T.border, marginTop: 6, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    priceCap: { fontSize: 8.5, color: T.muted, fontWeight: '800', letterSpacing: 0.5 },
    bigPrice: { fontSize: 19, fontWeight: '800', color: T.nav, marginTop: 2 },
    perM: { fontSize: 9, color: T.muted },
    kgPrice: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    kpiRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
    kpiBox: { flex: 1, backgroundColor: T.sub, borderRadius: 8, padding: 9 },
    kpiCap: { fontSize: 7.5, fontWeight: '700', color: T.muted, letterSpacing: 0.4 },
    kpiVal: { marginTop: 3, fontSize: 12, fontWeight: '800', color: T.ink },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    primaryBtn: { flex: 1, minHeight: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    primaryBtnTxt: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
    outlineBtn: { flex: 1, minHeight: 48, borderRadius: 9, borderWidth: 1.5, borderColor: T.nav, alignItems: 'center', justifyContent: 'center' },
    outlineBtnTxt: { color: T.nav, fontSize: 12.5, fontWeight: '800' },

    savedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.border },
    savedTitle: { fontSize: 12, fontWeight: '700', color: T.ink },
    savedSub: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    savedAction: { borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
    savedActionTxt: { fontSize: 9.5, fontWeight: '700', color: T.ink },
    savedDelete: { padding: 5 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
    modalCard: { backgroundColor: T.surface, borderRadius: 14, padding: 14, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
    modalSub: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    closeTxt: { fontSize: 24, color: T.muted },
    backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    backBtnTxt: { fontSize: 28, color: T.ink },
    search: { minHeight: 44, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, borderRadius: 9, paddingHorizontal: 11, color: T.ink, marginBottom: 8 },
    error: { color: '#A94442', fontSize: 10.5, marginBottom: 8 },
    pickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    pickName: { fontSize: 12.5, fontWeight: '700', color: T.ink },
    pickSub: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    pickArrow: { fontSize: 20, color: T.muted },
    empty: { padding: 18, textAlign: 'center', color: T.muted },
});


function HistoryTab({
    refreshKey,
    onOpenCosting,
}: {
    refreshKey: number;
    onOpenCosting: (costingId: string) => void;
}) {
    const [groups, setGroups] = useState<HistoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(HISTORY_FILTER_ALL);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [chartWidth, setChartWidth] = useState(250);
    const [selectedPoint, setSelectedPoint] = useState<{
        mdId: string;
        record: HistoryRecord;
    } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await CostingAPI.history({
                page: 1,
                per_page: 100,
                records_per_design: 20,
            });

            const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
            setGroups(rows);
        } catch (e: any) {
            console.log('history error', e?.response?.data || e);

            Alert.alert(
                'History Error',
                e?.response?.data?.message ||
                e?.message ||
                'Unable to load costing history',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        void load();
    }, [load, refreshKey]);

    const categories = useMemo(() => {
        const values = groups
            .map(group => String(group.category || '').trim())
            .filter(Boolean);

        return [
            HISTORY_FILTER_ALL,
            ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
        ];
    }, [groups]);

    useEffect(() => {
        if (category !== HISTORY_FILTER_ALL && !categories.includes(category)) {
            setCategory(HISTORY_FILTER_ALL);
        }
    }, [categories, category]);

    const filteredGroups = useMemo(() => {
        const query = search.trim().toLowerCase();

        return groups.filter(group => {
            const matchesCategory =
                category === HISTORY_FILTER_ALL ||
                String(group.category || '').trim() === category;

            if (!matchesCategory) return false;
            if (!query) return true;

            return [
                group.code,
                group.category,
                group.type,
                group.md_id,
            ].some(value =>
                String(value || '').toLowerCase().includes(query),
            );
        });
    }, [groups, search, category]);

    const toggleExpanded = (mdId: string) => {
        setExpandedId(current => (current === mdId ? null : mdId));
    };

    if (loading) {
        return (
            <View style={s.center}>
                <ActivityIndicator color={T.copper} />
                <Text style={hs.loadingText}>Loading costing history…</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={filteredGroups}
            keyExtractor={group => group.md_id}
            contentContainerStyle={hs.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        void load();
                    }}
                />
            }
            ListHeaderComponent={
                <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={hs.filterRow}
                    >
                        {categories.map(item => {
                            const active = category === item;

                            return (
                                <TouchableOpacity
                                    key={item}
                                    activeOpacity={0.75}
                                    style={[
                                        hs.filterChip,
                                        active && hs.filterChipActive,
                                    ]}
                                    onPress={() => setCategory(item)}
                                >
                                    <Text
                                        style={[
                                            hs.filterChipText,
                                            active && hs.filterChipTextActive,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={hs.searchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search design..."
                            placeholderTextColor={T.muted}
                            style={hs.searchInput}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>
            }
            renderItem={({ item: group }) => {
                const records = Array.isArray(group.records) ? group.records : [];
                const orderedRecords = [...records].sort((a, b) => {
                    const left = new Date(a.created_at || 0).getTime();
                    const right = new Date(b.created_at || 0).getTime();
                    return left - right;
                });

                const latestRecord = orderedRecords[orderedRecords.length - 1];
                const previousRecord = orderedRecords[orderedRecords.length - 2];

                const latestCost = historyNumber(
                    group.latest_cost ?? latestRecord?.snap_final_cost,
                );
                const previousCost = historyNumber(previousRecord?.snap_final_cost);

                const delta =
                    previousRecord && previousCost !== 0
                        ? ((latestCost - previousCost) / previousCost) * 100
                        : null;

                const expanded = expandedId === group.md_id;
                const earliestDate = orderedRecords[0]?.created_at;
                const latestDate =
                    group.latest_at || latestRecord?.created_at || null;

                return (
                    <View style={hs.card}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => toggleExpanded(group.md_id)}
                        >
                            <View style={hs.cardHeader}>
                                <View style={hs.cardTitleArea}>
                                    <View style={hs.codeRow}>
                                        <Text style={hs.code}>{group.code}</Text>

                                        <View
                                            style={[
                                                hs.typeBadge,
                                                {
                                                    backgroundColor:
                                                        group.type === 'YD'
                                                            ? T.yd + '20'
                                                            : T.pd + '20',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    hs.typeBadgeText,
                                                    {
                                                        color:
                                                            group.type === 'YD'
                                                                ? T.yd
                                                                : T.pd,
                                                    },
                                                ]}
                                            >
                                                {group.type || '—'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={hs.categoryText}>
                                        {group.category || 'Uncategorised'} ·{' '}
                                        {historyNumber(group.count || records.length)} costing
                                        {historyNumber(group.count || records.length) === 1
                                            ? ''
                                            : 's'}
                                    </Text>
                                </View>

                                <View style={hs.latestArea}>
                                    <Text style={hs.latestCost}>₹{latestCost.toFixed(2)}</Text>
                                    <Text style={hs.perMetre}>/m</Text>

                                    {delta !== null ? (
                                        <Text
                                            style={[
                                                hs.delta,
                                                {
                                                    color:
                                                        delta > 0
                                                            ? T.red
                                                            : delta < 0
                                                                ? T.green
                                                                : T.muted,
                                                },
                                            ]}
                                        >
                                            {delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : ''}
                                            {Math.abs(delta).toFixed(1)}%
                                        </Text>
                                    ) : null}
                                </View>

                                <Text style={hs.chevron}>{expanded ? '⌄' : '›'}</Text>
                            </View>

                            <View
                                style={hs.chartArea}
                                onLayout={event => {
                                    const width = Math.max(
                                        180,
                                        event.nativeEvent.layout.width,
                                    );
                                    setChartWidth(width);
                                }}
                            >
                                <HistorySparkline
                                    records={orderedRecords}
                                    selectedRecordId={
                                        selectedPoint?.mdId === group.md_id
                                            ? selectedPoint.record.id
                                            : null
                                    }
                                    onPointPress={record => {
                                        setSelectedPoint({
                                            mdId: group.md_id,
                                            record,
                                        });
                                        setExpandedId(group.md_id);
                                    }}
                                    width={chartWidth}
                                    height={62}
                                />
                            </View>

                            <View style={hs.dateRow}>
                                <Text style={hs.dateText}>
                                    {historyDateLabel(earliestDate)}
                                </Text>
                                <Text style={hs.dateText}>
                                    {historyDateLabel(latestDate)}
                                </Text>
                            </View>

                            {selectedPoint?.mdId === group.md_id ? (
                                <View style={hs.pointDetail}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={hs.pointDetailDate}>
                                            {historyDateTimeLabel(
                                                selectedPoint.record.created_at
                                            )}
                                        </Text>
                                        <Text style={hs.pointDetailCost}>
                                            ₹
                                            {historyNumber(
                                                selectedPoint.record
                                                    .snap_final_cost
                                            ).toFixed(2)}
                                            /m
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        style={hs.openButton}
                                        onPress={() =>
                                            onOpenCosting(
                                                selectedPoint.record.id
                                            )
                                        }
                                    >
                                        <Text style={hs.openButtonText}>
                                            Open
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </TouchableOpacity>

                        {expanded ? (
                            <View style={hs.expandedSection}>
                                <Text style={hs.expandedTitle}>COSTING REVISIONS</Text>

                                {[...records]
                                    .sort((a, b) => {
                                        const left = new Date(a.created_at || 0).getTime();
                                        const right = new Date(b.created_at || 0).getTime();
                                        return right - left;
                                    })
                                    .map((record, index) => {
                                        const finalCost = historyNumber(
                                            record.snap_final_cost,
                                        );
                                        const isLatest = index === 0;

                                        return (
                                            <View
                                                key={record.id}
                                                style={[
                                                    hs.revisionRow,
                                                    isLatest && hs.latestRevisionRow,
                                                ]}
                                            >
                                                <View style={hs.revisionMain}>
                                                    <View style={hs.revisionDateRow}>
                                                        <Text style={hs.revisionDate}>
                                                            {historyDateTimeLabel(record.created_at)}
                                                        </Text>

                                                        {isLatest ? (
                                                            <View style={hs.latestBadge}>
                                                                <Text style={hs.latestBadgeText}>
                                                                    LATEST
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    <Text style={hs.revisionSub}>
                                                        RM ₹
                                                        {historyNumber(
                                                            record.snap_rm,
                                                        ).toFixed(2)}
                                                        {' · '}Weaving ₹
                                                        {historyNumber(
                                                            record.snap_weaving_cost,
                                                        ).toFixed(2)}
                                                    </Text>
                                                </View>

                                                <View style={hs.revisionCostArea}>
                                                    <Text
                                                        style={[
                                                            hs.revisionCost,
                                                            isLatest && {
                                                                color: T.copper,
                                                            },
                                                        ]}
                                                    >
                                                        ₹{finalCost.toFixed(2)}
                                                    </Text>

                                                    <Text style={hs.revisionPerMetre}>
                                                        /m
                                                    </Text>
                                                </View>

                                                <TouchableOpacity
                                                    activeOpacity={0.75}
                                                    style={hs.revisionOpenButton}
                                                    onPress={() =>
                                                        onOpenCosting(record.id)
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            hs.revisionOpenText
                                                        }
                                                    >
                                                        Open
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                            </View>
                        ) : null}
                    </View>
                );
            }}
            ListEmptyComponent={
                <View style={hs.emptyWrap}>
                    <Text style={hs.emptyTitle}>No costing history found</Text>
                    <Text style={hs.emptyText}>
                        Save a costing or adjust the current search/filter.
                    </Text>
                </View>
            }
        />
    );
}

const hs = StyleSheet.create({
    listContent: {
        paddingHorizontal: 14,
        paddingBottom: 36,
    },

    filterRow: {
        gap: 8,
        paddingTop: 12,
        paddingBottom: 10,
    },

    filterChip: {
        minHeight: 32,
        paddingHorizontal: 14,
        borderRadius: 17,
        backgroundColor: T.sub,
        alignItems: 'center',
        justifyContent: 'center',
    },

    filterChipActive: {
        backgroundColor: T.ink,
    },

    filterChipText: {
        color: T.muted,
        fontSize: 11,
        fontWeight: '700',
    },

    filterChipTextActive: {
        color: '#FFFFFF',
    },

    searchWrap: {
        marginBottom: 12,
    },

    searchInput: {
        minHeight: 46,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 11,
        backgroundColor: T.surface,
        color: T.ink,
        fontSize: 13,
    },

    loadingText: {
        marginTop: 10,
        color: T.muted,
        fontSize: 12,
    },

    card: {
        marginBottom: 12,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 13,
        backgroundColor: T.surface,
        overflow: 'hidden',
    },

    cardHeader: {
        paddingHorizontal: 13,
        paddingTop: 13,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    cardTitleArea: {
        flex: 1,
        paddingRight: 10,
    },

    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },

    code: {
        color: T.ink,
        fontSize: 15,
        fontWeight: '900',
    },

    typeBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 5,
    },

    typeBadgeText: {
        fontSize: 9,
        fontWeight: '900',
    },

    categoryText: {
        marginTop: 3,
        color: T.muted,
        fontSize: 10.5,
    },

    latestArea: {
        alignItems: 'flex-end',
    },

    latestCost: {
        color: T.green,
        fontSize: 16,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },

    perMetre: {
        marginTop: -1,
        color: T.muted,
        fontSize: 8.5,
    },

    delta: {
        marginTop: 3,
        fontSize: 9,
        fontWeight: '800',
    },

    chevron: {
        width: 18,
        marginLeft: 6,
        color: T.muted,
        fontSize: 20,
        textAlign: 'right',
    },

    chartArea: {
        minHeight: 58,
        marginHorizontal: 13,
        marginTop: 6,
        overflow: 'hidden',
    },

    sparklineWrap: {
        position: 'relative',
    },

    sparkLine: {
        position: 'absolute',
        height: 2,
        borderRadius: 1,
        backgroundColor: T.copper,
        transformOrigin: 'left center',
    },

    sparkDot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: T.copper,
    },

    noTrendBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    noTrendText: {
        color: T.muted,
        fontSize: 10,
    },

    dateRow: {
        paddingHorizontal: 13,
        paddingBottom: 11,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    dateText: {
        color: T.muted,
        fontSize: 8.5,
    },

    expandedSection: {
        paddingHorizontal: 13,
        paddingTop: 10,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: T.border,
        backgroundColor: T.bg,
    },

    expandedTitle: {
        marginBottom: 7,
        color: T.muted,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.6,
    },

    revisionRow: {
        minHeight: 52,
        paddingHorizontal: 9,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },

    latestRevisionRow: {
        backgroundColor: T.copper + '10',
    },

    revisionMain: {
        flex: 1,
        paddingRight: 10,
    },

    revisionDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },

    revisionDate: {
        color: T.ink,
        fontSize: 11,
        fontWeight: '700',
    },

    latestBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: T.copper + '20',
    },

    latestBadgeText: {
        color: T.copper,
        fontSize: 8,
        fontWeight: '900',
    },

    revisionSub: {
        marginTop: 3,
        color: T.muted,
        fontSize: 9.5,
    },

    revisionCostArea: {
        alignItems: 'flex-end',
    },

    revisionCost: {
        color: T.ink,
        fontSize: 13,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },

    revisionPerMetre: {
        color: T.muted,
        fontSize: 8,
    },

    emptyWrap: {
        paddingVertical: 48,
        alignItems: 'center',
    },

    emptyTitle: {
        color: T.ink,
        fontSize: 14,
        fontWeight: '800',
    },

    emptyText: {
        marginTop: 5,
        color: T.muted,
        fontSize: 11,
        textAlign: 'center',
    },
    sparkPointButton: {
        position: 'absolute',
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },

    sparkDotSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: T.surface,
        backgroundColor: T.copper,
    },

    singlePointButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    pointDetail: {
        marginHorizontal: 13,
        marginBottom: 12,
        paddingHorizontal: 11,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: T.copper + '55',
        borderRadius: 9,
        backgroundColor: T.copper + '0D',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    pointDetailDate: {
        color: T.muted,
        fontSize: 9.5,
    },

    pointDetailCost: {
        marginTop: 2,
        color: T.ink,
        fontSize: 13,
        fontWeight: '900',
    },

    openButton: {
        minWidth: 68,
        minHeight: 34,
        paddingHorizontal: 13,
        borderRadius: 17,
        backgroundColor: T.copper + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },

    openButtonText: {
        color: T.copper,
        fontSize: 10.5,
        fontWeight: '900',
    },

    revisionOpenButton: {
        minWidth: 58,
        minHeight: 31,
        marginLeft: 10,
        paddingHorizontal: 11,
        borderRadius: 16,
        backgroundColor: T.copper + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },

    revisionOpenText: {
        color: T.copper,
        fontSize: 9.5,
        fontWeight: '900',
    },

});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — VARIANCE
// ═══════════════════════════════════════════════════════════════
function VarianceTab() {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [mdId, setMdId] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [designLoading, setDesignLoading] = useState(true);
    const [search, setSearch] = useState('');
    // useEffect(() => {
    //     DesignAPI.list().then(r => setDesigns(r.data.data)).catch(() => { });
    // }, []);

    useEffect(() => {
        DesignAPI.list()
            .then(r => setDesigns(r.data.data))
            .catch(() => { })
            .finally(() => setDesignLoading(false));
    }, []);

    const filteredDesigns = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return designs;

        return designs.filter(d =>
            (d.code || '').toLowerCase().includes(q) ||
            (d.category || '').toLowerCase().includes(q)
        );
    }, [designs, search]);

    const load = async (id: string) => {
        setMdId(id);
        setLoading(true);
        setData(null);

        try {
            const res = await CostingAPI.variance({
                md_id: id,
            });

            setData(res.data.data);
            console.log(
                'variance res',
                res.data
            );
        } catch (e: any) {
            console.log(
                'variance error',
                e?.response?.data || e
            );

            Alert.alert(
                'Error',
                e?.response?.data?.message ||
                e?.message ||
                'Unable to load variance'
            );
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
                {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {designs?.map(d => (
                        <TouchableOpacity key={d.id} onPress={() => load(d.id)}
                            style={[v.chip, mdId === d.id && v.chipActive]}>
                            <Text style={[v.chipTxt, mdId === d.id && { color: '#fff' }]}>{d.code}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView> */}
                <View style={{ marginTop: 8 }}>
                    <TouchableOpacity
                        style={dp.trigger}
                        activeOpacity={0.7}
                        onPress={() => setOpen(o => !o)}
                    >
                        <Text
                            style={[
                                dp.triggerTxt,
                                !mdId && { color: T.muted, fontWeight: '400' },
                            ]}
                        >
                            {mdId
                                ? designs.find(x => x.id === mdId)?.code
                                : 'Select Design'}
                        </Text>

                        <Text style={{ color: T.muted }}>
                            {open ? '▲' : '▼'}
                        </Text>
                    </TouchableOpacity>

                    {open && (
                        <View style={dp.sheet}>
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search design..."
                                placeholderTextColor={T.muted}
                                style={dp.search}
                                autoFocus
                            />
                            <ScrollView
                                style={{ maxHeight: 220 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {designLoading ? (
                                    <View
                                        style={{
                                            padding: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <ActivityIndicator color={T.copper} />
                                        <Text
                                            style={{
                                                marginTop: 8,
                                                color: T.muted,
                                                fontSize: 12,
                                            }}
                                        >
                                            Loading designs...
                                        </Text>
                                    </View>
                                ) : designs.length === 0 ? (
                                    <View
                                        style={{
                                            padding: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: T.muted,
                                                fontSize: 12,
                                            }}
                                        >
                                            No designs found
                                        </Text>
                                    </View>
                                ) : (
                                    filteredDesigns.map(d => {
                                        const selected = mdId === d.id;

                                        return (
                                            <TouchableOpacity
                                                key={d.id}
                                                style={[
                                                    dp.row,
                                                    selected && {
                                                        backgroundColor: T.sub,
                                                    },
                                                ]}
                                                onPress={() => {
                                                    setOpen(false);
                                                    load(d.id);
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        flex: 1,
                                                        fontSize: 14,
                                                        fontWeight: selected ? '700' : '500',
                                                        color: selected ? T.copper : T.ink,
                                                    }}
                                                >
                                                    {d.code}
                                                </Text>

                                                {selected && (
                                                    <Text
                                                        style={{
                                                            color: T.copper,
                                                            fontSize: 16,
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        ✓
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>
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
    const [reopenRequest, setReopenRequest] =
        useState<ReopenCostingRequest | null>(null);

    // FIX: this screen used to render its own hand-rolled header (same bug
    // as Designs/Orders/Permission Manager — see app/new/(tabs)/_layout.tsx).
    // No subtitle/right-side content needed here, so nothing further to wire
    // through headerExtras — just removing the duplicate.
    return (
        <View style={{ flex: 1, backgroundColor: T.bg }}>
            <TabBar active={tab} onChange={setTab} />

            <View style={{ flex: 1 }}>
                {tab === 'Costing' && (
                    <CostingTab
                        reopenRequest={reopenRequest}
                        freshMode={false}
                        onSaved={() => setHistRefreshKey(k => k + 1)}
                    />
                )}
                {tab === 'Temp / New' && <TempCostingTab />}
                {tab === 'History' && (
                    <HistoryTab
                        refreshKey={histRefreshKey}
                        onOpenCosting={costingId => {
                            setReopenRequest({
                                costingId,
                                requestKey: Date.now(),
                            });
                            setTab('Costing');
                        }}
                    />
                )}
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
