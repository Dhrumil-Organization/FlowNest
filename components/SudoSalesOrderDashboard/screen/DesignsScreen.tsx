// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/DesignsScreen.tsx
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, FlatList, TextInput,
    TouchableOpacity, StyleSheet, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../../common/utils/theme';
import { DesignAPI, type Design, type SubDesign, type YarnMaster } from '../../../common/API/client';

const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

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
    bar:         { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    inner:       { paddingHorizontal: 12 },
    tab:         { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive:   { borderBottomColor: T.copper },
    label:       { fontSize: 13, fontWeight: '600', color: T.muted },
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

// ═══════════════════════════════════════════════════════════════
// TAB 1 — CATALOG
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ onSelectDesign }: { onSelectDesign: (d: Design) => void }) {
    const [designs, setDesigns]               = useState<Design[]>([]);
    const [loading, setLoading]               = useState(true);
    const [refreshing, setRefreshing]         = useState(false);
    const [filter, setFilter]                 = useState('All');
    const [search, setSearch]                 = useState('');
    const [expandedId, setExpandedId]         = useState<string | null>(null);
    const [expandedDetail, setExpandedDetail] = useState<Design | null>(null);
    const [detailLoading, setDetailLoading]   = useState(false);
    const [currentPage, setCurrentPage]       = useState(1);
    const [totalPages, setTotalPages]         = useState(1);
    const [total, setTotal]                   = useState(0);

    const load = useCallback(async (page = 1) => {
        try {
            const res = await DesignAPI.list({
                category: filter !== 'All' ? filter : undefined,
                search:   search || undefined,
                page,
                limit:    50,
            });
            // backend returns { success, data: { data:[], total, page, total_pages } }
            const envelope = res.data.data as any;
            const rows: Design[] = Array.isArray(envelope)
                ? envelope
                : (envelope?.data ?? []);
            const tp  = envelope?.total_pages ?? 1;
            const tot = envelope?.total       ?? rows.length;

            setDesigns(prev => page === 1 ? rows : [...prev, ...rows]);
            setTotalPages(tp);
            setTotal(tot);
            setCurrentPage(page);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, search]);

    useEffect(() => { load(1); }, [filter]);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => load(1), 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleExpand = async (d: Design) => {
        if (expandedId === d.id) {
            setExpandedId(null);
            setExpandedDetail(null);
            return;
        }
        setExpandedId(d.id);
        setExpandedDetail(d);       // show list data instantly
        setDetailLoading(true);
        try {
            const res = await DesignAPI.get(d.id);
            setExpandedDetail(res.data.data);
        } catch {
            // keep list data
        } finally {
            setDetailLoading(false);
        }
    };

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <View style={{ flex: 1 }}>
            {/* Filter chips */}
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

            {/* Search */}
            <View style={ct.searchWrap}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search design…"
                    placeholderTextColor={T.muted}
                    style={ct.search}
                />
            </View>

            <FlatList
                data={designs}
                keyExtractor={d => d.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); load(1); }} />
                }
                renderItem={({ item: d }) => {
                    const expanded = expandedId === d.id;
                    const detail   = expanded ? expandedDetail : null;
                    return (
                        <View>
                            {/* Row */}
                            <TouchableOpacity style={ct.row} activeOpacity={0.7}
                                onPress={() => handleExpand(d)}>
                                <Swatch design={d} size={44} />
                                <View style={ct.rowInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={ct.rowCode}>{d.code}</Text>
                                        <TypeBadge type={d.type} />
                                    </View>
                                    <Text style={ct.rowSub}>
                                        {SHORT(d.category)} · {d.epi_total}×{d.ppi_total} · {d.cw_count} cw
                                    </Text>
                                </View>
                                <View style={ct.rowRight}>
                                    <Text style={ct.rowPrice}>{d.latest_cost ? r0(d.latest_cost) : '—'}</Text>
                                    <Text style={ct.rowPriceSub}>per m</Text>
                                </View>
                                <Text style={[ct.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
                            </TouchableOpacity>

                            {/* Inline expand */}
                            {expanded && (
                                <View style={ct.expandBox}>
                                    {detailLoading && !expandedDetail?.warp_yarns?.length ? (
                                        <ActivityIndicator color={T.copper} style={{ paddingVertical: 16 }} />
                                    ) : detail ? (
                                        <>
                                            {/* Weave */}
                                            {!!detail.weave && (
                                                <Text style={ct.expandWeave}>
                                                    {detail.weave}{detail.note ? ` · ${detail.note}` : ''}
                                                </Text>
                                            )}

                                            {/* Yarns */}
                                            {((detail.warp_yarns?.length ?? 0) > 0 || (detail.weft_yarns?.length ?? 0) > 0) && (
                                                <>
                                                    <Text style={ct.expandSec}>YARNS</Text>
                                                    {detail.warp_yarns?.map((y, i) => (
                                                        <View key={`w${i}`} style={ct.yarnRow}>
                                                            <View style={ct.yarnBadgeWarp}>
                                                                <Text style={ct.yarnBadgeTxt}>WARP</Text>
                                                            </View>
                                                            <Text style={ct.yarnName}>
                                                                {y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}
                                                            </Text>
                                                            <Text style={ct.yarnEpi}>{y.epi} EPI</Text>
                                                        </View>
                                                    ))}
                                                    {detail.weft_yarns?.map((y, i) => (
                                                        <View key={`f${i}`} style={ct.yarnRow}>
                                                            <View style={ct.yarnBadgeWeft}>
                                                                <Text style={ct.yarnBadgeTxt}>WEFT</Text>
                                                            </View>
                                                            <Text style={ct.yarnName}>
                                                                {y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}
                                                            </Text>
                                                            <Text style={ct.yarnEpi}>{y.ppi} PPI</Text>
                                                        </View>
                                                    ))}
                                                </>
                                            )}

                                            {/* Reed Space + Total Ends dark card */}
                                            {!!detail.reed_space && (
                                                <View style={ct.statsRow}>
                                                    <View style={ct.statBox}>
                                                        <Text style={ct.statLabel}>REED SPACE · BASIS</Text>
                                                        <Text style={ct.statVal}>{detail.reed_space}"</Text>
                                                    </View>
                                                    <View style={ct.statBox}>
                                                        <Text style={ct.statLabel}>TOTAL ENDS</Text>
                                                        <Text style={ct.statVal}>
                                                            {detail.epi_total && detail.reed_space
                                                                ? Math.round(detail.epi_total * detail.reed_space).toLocaleString('en-IN')
                                                                : '—'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Construction table */}
                                            {!!detail.epi_total && (
                                                <>
                                                    <Text style={[ct.expandSec, { marginTop: 10 }]}>
                                                        ↑EPI {detail.epi_total} × ↑PPI {detail.ppi_total} (on loom)
                                                    </Text>
                                                    <View style={ct.constructTable}>
                                                        {[
                                                            ['CONSTRUCTION', 'LOOM', 'GREIGE', 'FINISHED'],
                                                            ['EPI',    String(detail.epi_total ?? '—'), '—', '—'],
                                                            ['PPI',    String(detail.ppi_total ?? '—'), '—', '—'],
                                                            ['Width"', String(detail.reed_space ?? '—'), '—', detail.fin_width ? String(detail.fin_width) : '—'],
                                                        ].map((row, ri) => (
                                                            <View key={ri} style={[ct.tableRow, ri === 0 && ct.tableHeader]}>
                                                                {row.map((cell, ci) => (
                                                                    <Text key={ci} style={[
                                                                        ct.tableCell,
                                                                        ri === 0 && ct.tableCellHdr,
                                                                        ci === 0 && ct.tableCellLabel,
                                                                    ]}>{cell}</Text>
                                                                ))}
                                                            </View>
                                                        ))}
                                                    </View>
                                                </>
                                            )}

                                            {/* Latest cost */}
                                            {!!detail.latest_cost && (
                                                <Text style={ct.latestCost}>
                                                    Latest cost · {r0(detail.latest_cost)}/m
                                                </Text>
                                            )}

                                            {/* Open in Design tab */}
                                            <TouchableOpacity style={ct.openBtn}
                                                onPress={() => onSelectDesign(detail)}>
                                                <Text style={ct.openBtnTxt}>Edit in Design tab →</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    );
                }}
                ItemSeparatorComponent={() => <View style={ct.sep} />}
                ListEmptyComponent={<Text style={s.empty}>No designs found</Text>}
                ListFooterComponent={
                    currentPage < totalPages
                        ? <TouchableOpacity onPress={() => load(currentPage + 1)}
                            style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ color: T.copper, fontWeight: '700' }}>
                                Load More ({total - designs.length} remaining)
                            </Text>
                          </TouchableOpacity>
                        : null
                }
            />
        </View>
    );
}

const ct = StyleSheet.create({
    chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: T.sub },
    chipActive:     { backgroundColor: T.ink },
    chipTxt:        { fontSize: 12, fontWeight: '600', color: T.muted },
    chipTxtActive:  { color: '#fff' },
    searchWrap:     { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search:         { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.surface, gap: 10 },
    rowInfo:        { flex: 1 },
    rowCode:        { fontSize: 15, fontWeight: '700', color: T.ink },
    rowSub:         { fontSize: 11, color: T.muted, marginTop: 2 },
    rowRight:       { alignItems: 'flex-end' },
    rowPrice:       { fontSize: 14, fontWeight: '800', color: T.copper },
    rowPriceSub:    { fontSize: 9, color: T.muted },
    chevron:        { fontSize: 18, color: T.muted },
    sep:            { height: 1, backgroundColor: T.border, marginLeft: 68 },
    // expand
    expandBox:      { backgroundColor: T.bg, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    expandWeave:    { fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 8 },
    expandSec:      { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    yarnRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    yarnBadgeWarp:  { backgroundColor: T.yd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeWeft:  { backgroundColor: T.pd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeTxt:   { fontSize: 9, fontWeight: '800', color: T.muted },
    yarnName:       { flex: 1, fontSize: 12, fontWeight: '600', color: T.ink },
    yarnEpi:        { fontSize: 12, fontWeight: '700', color: T.copper },
    statsRow:       { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 4 },
    statBox:        { flex: 1, backgroundColor: T.nav, borderRadius: 8, padding: 10 },
    statLabel:      { fontSize: 9, color: '#8899AA', fontWeight: '600', letterSpacing: 0.4 },
    statVal:        { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
    constructTable: { marginTop: 4, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    tableRow:       { flexDirection: 'row', backgroundColor: T.surface },
    tableHeader:    { backgroundColor: T.sub },
    tableCell:      { flex: 1, fontSize: 11, color: T.ink, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right' },
    tableCellHdr:   { fontSize: 9, fontWeight: '700', color: T.muted, textAlign: 'right' },
    tableCellLabel: { textAlign: 'left', fontWeight: '600' },
    latestCost:     { marginTop: 10, fontSize: 13, color: T.copper, fontWeight: '700' },
    openBtn:        { marginTop: 10, alignSelf: 'flex-end' },
    openBtnTxt:     { fontSize: 12, color: T.copper, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — DESIGN (create / edit form)
// ═══════════════════════════════════════════════════════════════
function DesignTab({ design, onRefresh }: { design: Design | null; onRefresh: () => void }) {
    const [allYarns, setAllYarns] = useState<YarnMaster[]>([]);
    const [saving, setSaving]     = useState(false);
    const [form, setForm]         = useState<any>({
        code: '', category: 'Linen Shirting', type: 'YD',
        weave: '', reed_space: 64, warp_shrink: 6,
        warp_yarns: [], weft_yarns: [],
        width_basis: 'reed',
    });

    useEffect(() => {
        DesignAPI.yarns().then(r => setAllYarns(r.data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (design) setForm({ ...design, width_basis: 'reed' });
        else setForm({ code: '', category: 'Linen Shirting', type: 'YD', weave: '', reed_space: 64, warp_shrink: 6, warp_yarns: [], weft_yarns: [], width_basis: 'reed' });
    }, [design?.id]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const save = async () => {
        setSaving(true);
        try {
            if (design?.id) {
                await DesignAPI.update(design.id, form);
            } else {
                await DesignAPI.create(form);
            }
            Alert.alert('Saved', 'Design saved successfully');
            onRefresh();
        } catch (e: any) {
            Alert.alert('Error', e.message);
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
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

            <Text style={fm.label}>DESIGN CODE</Text>
            <TextInput value={form.code ?? ''} onChangeText={v => set('code', v)}
                placeholder="e.g. Cambridge" placeholderTextColor={T.muted} style={fm.input} />

            <Text style={fm.label}>CATEGORY</Text>
            <View style={fm.chipRow}>
                {[['Shirting', 'Linen Shirting'], ['Sportswear', 'Sportswear'], ['Suiting', 'Linen Suiting']].map(([label, val]) => (
                    <Chip key={val} label={label} active={form.category === val} onPress={() => set('category', val)} />
                ))}
            </View>

            <Text style={fm.label}>DYE TYPE</Text>
            <View style={fm.chipRow}>
                <Chip label="Yarn Dyed"  active={form.type === 'YD'} onPress={() => set('type', 'YD')} />
                <Chip label="Piece Dyed" active={form.type === 'PD'} onPress={() => set('type', 'PD')} />
            </View>

            <Text style={fm.label}>WEAVE / STRUCTURE</Text>
            <TextInput value={form.weave ?? ''} onChangeText={v => set('weave', v)}
                placeholder="e.g. Dobby — fine dobby" placeholderTextColor={T.muted} style={fm.input} />

            <Text style={fm.label}>WIDTH BASIS</Text>
            <Text style={fm.hint}>how you enter the warp width</Text>
            <View style={fm.chipRow}>
                <Chip label="Reed space"   active={form.width_basis === 'reed'}   onPress={() => set('width_basis', 'reed')} />
                <Chip label="Greige width" active={form.width_basis === 'greige'} onPress={() => set('width_basis', 'greige')} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                    <Text style={fm.label}>REED SPACE</Text>
                    <View style={fm.inputRow}>
                        <TextInput value={String(form.reed_space ?? '')}
                            onChangeText={v => set('reed_space', parseFloat(v) || 0)}
                            keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                        <Text style={fm.unit}>"</Text>
                    </View>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={fm.label}>WARP SHRINK</Text>
                    <View style={fm.inputRow}>
                        <TextInput value={String(form.warp_shrink ?? '')}
                            onChangeText={v => set('warp_shrink', parseFloat(v) || 0)}
                            keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                        <Text style={fm.unit}>%</Text>
                    </View>
                </View>
            </View>

            <Text style={fm.label}>WARP YARNS</Text>
            {(form.warp_yarns ?? []).map((y: any, i: number) => (
                <View key={i} style={fm.yarnRow}>
                    <Text style={fm.yarnName}>{y.name} · {y.epi} EPI</Text>
                    <TouchableOpacity onPress={() => set('warp_yarns', form.warp_yarns.filter((_: any, j: number) => j !== i))}>
                        <Text style={{ color: T.pd, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity style={fm.addBtn} onPress={() => {
                const y = allYarns[0];
                if (y) set('warp_yarns', [...(form.warp_yarns ?? []), { mi_id: y.mi_id, name: y.name, sys: y.sys, cnt: y.cnt, base_price: y.price, epi: 60, blend_ratio: null }]);
            }}>
                <Text style={fm.addBtnTxt}>+ Add warp yarn</Text>
            </TouchableOpacity>

            <Text style={fm.label}>WEFT YARNS</Text>
            {(form.weft_yarns ?? []).map((y: any, i: number) => (
                <View key={i} style={fm.yarnRow}>
                    <Text style={fm.yarnName}>{y.name} · {y.ppi} PPI</Text>
                    <TouchableOpacity onPress={() => set('weft_yarns', form.weft_yarns.filter((_: any, j: number) => j !== i))}>
                        <Text style={{ color: T.pd, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity style={fm.addBtn} onPress={() => {
                const y = allYarns[0];
                if (y) set('weft_yarns', [...(form.weft_yarns ?? []), { mi_id: y.mi_id, name: y.name, sys: y.sys, cnt: y.cnt, base_price: y.price, ppi: 52, blend_ratio: null }]);
            }}>
                <Text style={fm.addBtnTxt}>+ Add weft yarn</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[fm.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={fm.saveTxt}>{saving ? 'Saving…' : design ? 'Save Changes' : 'Create Design'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
const fm = StyleSheet.create({
    label:        { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    hint:         { fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 6 },
    input:        { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unit:         { fontSize: 14, color: T.muted, fontWeight: '600' },
    chipRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: T.sub },
    chipActive:   { backgroundColor: T.ink },
    chipTxt:      { fontSize: 13, fontWeight: '600', color: T.muted },
    chipTxtActive:{ color: '#fff' },
    yarnRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
    yarnName:     { fontSize: 13, fontWeight: '600', color: T.ink },
    addBtn:       { borderWidth: 1.5, borderColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
    addBtnTxt:    { fontSize: 14, fontWeight: '700', color: T.copper },
    saveBtn:      { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    saveTxt:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — COLOURWAY
// ═══════════════════════════════════════════════════════════════
function ColourwayTab({ design }: { design: Design | null }) {
    const [subs, setSubs]       = useState<SubDesign[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!design) return;
        setLoading(true);
        DesignAPI.colourways(design.id)
            .then(r => setSubs(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [design?.id]);

    if (!design) return <View style={s.center}><Text style={s.empty}>Select a design from Catalog</Text></View>;
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: T.ink, marginBottom: 12 }}>
                {design.code} — Colourways ({subs.length})
            </Text>
            {subs.length === 0 && <Text style={s.empty}>No colourways yet</Text>}
            {subs.map(sub => (
                <View key={sub.id} style={cw.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={cw.code}>{sub.code}</Text>
                        {sub.commercial_name && <Text style={cw.comName}>{sub.commercial_name}</Text>}
                    </View>
                    {sub.warp_patterns?.length > 0 && (
                        <>
                            <Text style={cw.pHdr}>WARP PATTERN</Text>
                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                                {sub.warp_patterns.map((p, i) => (
                                    <View key={i} style={cw.patBand}>
                                        <View style={[cw.patSwatch, { backgroundColor: p.hex ?? '#888' }]} />
                                        <Text style={cw.patLabel}>{p.color_name} × {p.thread_count}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                    {sub.weft_patterns?.length > 0 && (
                        <>
                            <Text style={[cw.pHdr, { marginTop: 8 }]}>WEFT PATTERN</Text>
                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                                {sub.weft_patterns.map((p, i) => (
                                    <View key={i} style={cw.patBand}>
                                        <View style={[cw.patSwatch, { backgroundColor: p.hex ?? '#888' }]} />
                                        <Text style={cw.patLabel}>{p.color_name} × {p.thread_count}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}
const cw = StyleSheet.create({
    card:      { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    code:      { fontSize: 14, fontWeight: '700', color: T.ink },
    comName:   { fontSize: 12, color: T.muted, fontStyle: 'italic' },
    pHdr:      { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    patBand:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    patSwatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: T.border },
    patLabel:  { fontSize: 11, color: T.ink },
});

// ═══════════════════════════════════════════════════════════════
// TAB 4 — YARNS
// ═══════════════════════════════════════════════════════════════
function YarnsTab() {
    const [yarns, setYarns]       = useState<YarnMaster[]>([]);
    const [loading, setLoading]   = useState(true);
    const [filter, setFilter]     = useState<'all'|'Lea'|'Ne'|'Den'>('all');

    useEffect(() => {
        DesignAPI.yarns()
            .then(r => setYarns(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() =>
        filter === 'all' ? yarns : yarns.filter(y => y.sys === filter), [yarns, filter]);

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {(['all','Lea','Ne','Den'] as const).map(f => (
                        <TouchableOpacity key={f} onPress={() => setFilter(f)}
                            style={[ct.chip, filter === f && ct.chipActive]}>
                            <Text style={[ct.chipTxt, filter === f && ct.chipTxtActive]}>
                                {f === 'all' ? 'All' : f === 'Lea' ? 'Linen (Lea)' : f === 'Ne' ? 'Cotton (Ne)' : 'Polyester (Den)'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={y => y.mi_id}
                contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
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
    row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    badge:    { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    name:     { fontSize: 13, fontWeight: '700', color: T.ink },
    sub:      { fontSize: 11, color: T.muted, marginTop: 2 },
    price:    { fontSize: 13, fontWeight: '700', color: T.copper },
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
        const allYarns = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
        const unique   = [...new Set(allYarns.map(y => y.mi_id))];
        Promise.all(unique.map(miId =>
            DesignAPI.yarnDyeing(miId).then(r => ({ miId, data: r.data.data }))
        ))
        .then(results => {
            const map: Record<string, any> = {};
            results.forEach(r => { map[r.miId] = r.data; });
            setDyeData(map);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [design?.id]);

    if (!design) return <View style={s.center}><Text style={s.empty}>Select a design from Catalog</Text></View>;
    if (design.type === 'PD') return (
        <View style={s.center}>
            <Text style={s.empty}>Piece-dyed design — dyeing costs are per meter, not per yarn</Text>
        </View>
    );
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    const allYarns = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
    const unique   = allYarns.filter((y, i, arr) => arr.findIndex(x => x.mi_id === y.mi_id) === i);

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                Dyeing cost history for {design.code} yarns (YD)
            </Text>
            {unique.map(y => {
                const d = dyeData[y.mi_id];
                return (
                    <View key={y.mi_id} style={dy.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={dy.name}>{y.name}</Text>
                            <Text style={dy.avg}>Avg ₹{d?.average ?? 0}/kg</Text>
                        </View>
                        {d?.recent?.length > 0 ? (
                            d.recent.map((r: any, i: number) => (
                                <View key={i} style={dy.row}>
                                    <Text style={dy.rowDate}>{r.created_at?.slice(0, 10)}</Text>
                                    <Text style={dy.rowCode}>{r.code}</Text>
                                    <Text style={dy.rowAmt}>₹{r.dye_cost}/kg</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={s.empty}>No dyeing history yet</Text>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}
const dy = StyleSheet.create({
    card:    { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    name:    { fontSize: 13, fontWeight: '700', color: T.ink },
    avg:     { fontSize: 13, fontWeight: '700', color: T.green },
    row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.sub },
    rowDate: { flex: 1, fontSize: 11, color: T.muted },
    rowCode: { fontSize: 11, color: T.ink, marginRight: 8 },
    rowAmt:  { fontSize: 12, fontWeight: '700', color: T.copper },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export function DesignsScreen() {
    const [tab, setTab]                 = useState<Tab>('Catalog');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail]     = useState<Design | null>(null);

    const handleSelectDesign = async (d: Design) => {
        setSelected(d);
        setDetail(d);
        try {
            const res = await DesignAPI.get(d.id);
            setDetail(res.data.data);
        } catch {
            // keep d as fallback
        }
        setTab('Design');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
            <View style={hdr.wrap}>
                <Text style={hdr.brand}>MADHUSUDHAN FABRICS</Text>
                <Text style={hdr.title}>Designs</Text>
                {selectedDesign && (
                    <Text style={hdr.sub}>Selected: {selectedDesign.code}</Text>
                )}
            </View>
            <TabBar active={tab} onChange={setTab} />
            <View style={{ flex: 1 }}>
                {tab === 'Catalog'   && <CatalogTab onSelectDesign={handleSelectDesign} />}
                {tab === 'Design'    && <DesignTab design={detailDesign} onRefresh={() => selectedDesign && handleSelectDesign(selectedDesign)} />}
                {tab === 'Colourway' && <ColourwayTab design={detailDesign} />}
                {tab === 'Yarns'     && <YarnsTab />}
                {tab === 'Dyeing'    && <DyeingTab design={detailDesign} />}
            </View>
        </SafeAreaView>
    );
}

const hdr = StyleSheet.create({
    wrap:  { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#8899AA', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub:   { fontSize: 11, color: '#8899AA', marginTop: 2 },
});

const s = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty:  { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default DesignsScreen;
