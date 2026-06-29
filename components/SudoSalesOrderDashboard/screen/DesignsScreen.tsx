import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, FlatList, TextInput,
    TouchableOpacity, StyleSheet, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { T } from '../../../common/utils/theme';
import { DesignAPI, type Design, type SubDesign, type YarnMaster } from '../../../common/API/client';
import { Dropdown } from 'react-native-element-dropdown';
import axios from 'axios';
import { API } from "../../../common/API/dynamicAPI";

type CatalogTabProps = {
    token: string;
    onSelectDesign: (d: Design) => void;
};

interface Design {
    DsnCode: string;
    DsnName: string;
    ItmCode: string;
    ItmName: string;
    tag: string;
}


const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const TABS = ['Catalog', 'Design', 'Colourway', 'Yarns', 'Dyeing'] as const;
type Tab = typeof TABS[number];

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

function Swatch({ design, size = 44 }: { design: Design; size?: number }) {
    const patterns = design.warp_yarns?.map(y => ({
        color: '#000', hex: '#000',
    })) ?? [];
    const isGreige = design.type === 'PD';
    return (
        <View style={{
            width: size, height: size, borderRadius: 8, overflow: 'hidden',
            backgroundColor: isGreige ? '#D4C5A9' : (patterns[0]?.hex ?? '#1B2A4A'),
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: T.border,
        }}>
            {isGreige && (
                <Text style={{ fontSize: 8, color: '#888', fontWeight: '600' }}>GREIGE</Text>
            )}
        </View>
    );
}

function TypeBadge({ type }: { type: 'YD' | 'PD' }) {
    const isYD = type === 'YD';
    return (
        <View style={{ backgroundColor: isYD ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: isYD ? T.yd : T.pd }}>{type}</Text>
        </View>
    );
}

// function CatalogTab({ token, onSelectDesign }: { onSelectDesign: (d: Design) => void }) {
function CatalogTab({ token, onSelectDesign, }: CatalogTabProps) {
    const nav = useNavigation<any>();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    let cancelToken: any;
    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-platform': 'mob'
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    // const [design, setDesign] = useState(null);

    // const load = useCallback(async () => {
    //     try {
    //         const res = await DesignAPI.list({ category: filter !== 'All' ? filter : undefined, search });
    //         setDesigns(res.data.data);
    //     } catch (e: any) {
    //         Alert.alert('Error', e.message);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // }, [filter, search]);

    // const load = useCallback(async () => {
    //     try {
    //         const params = {
    //             // category: filter !== 'All' ? filter : undefined,
    //             prpcode: 'SIP',
    //             yearno: '27',
    //             strcode: '012',
    //             page: '',
    //             limit: '',
    //             txntype: 'sales_order',
    //             designbrand: '0',
    //             category: filter === 'All' ? 'All' : filter,
    //         };

    //         const response = await axios.get(
    //             `${API}/api/getdesign`,
    //             getRequestConfig({
    //                 params,
    //             })
    //         );
    //         console.log('response', params, response)
    //         const data = response?.data?.response?.data || [];
    //         setDesigns(data);
    //         setFilteredDesigns(data);

    //     } catch (error) {
    //         console.log("item API error:", error);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // }, [filter, search]);
const load = useCallback(async (page = 1) => {
    try {
        const res = await DesignAPI.list({
            category: filter !== 'All' ? filter : undefined,
            search:   search || undefined,
            page,
            limit:    50,
        });
        const result = res.data.data;           // paginated envelope
        const rows   = result.data ?? [];
        setDesigns(prev => page === 1 ? rows : [...prev, ...rows]);
        setFilteredDesigns(prev => page === 1 ? rows : [...prev, ...rows]);
        setTotalPages(result.total_pages ?? 1);
        setTotal(result.total ?? 0);
        setCurrentPage(page);
    } catch (e: any) {
        Alert.alert('Error', e.message);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
}, [filter, search]);
    useEffect(() => { load(); }, [filter]);

    // debounce search
    // useEffect(() => {
    //     const t = setTimeout(load, 400);
    //     return () => clearTimeout(t);
    // }, [search]);

    useEffect(() => {
        let data = [...designs];
        if (search.trim()) {
            data = data.filter(item =>
                item.DsnCode.toLowerCase().includes(search.toLowerCase()) ||
                item.DsnName.toLowerCase().includes(search.toLowerCase()) ||
                item.ItmName.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (filter !== "All") {
            data = data.filter(item =>
                item.ItmName.toLowerCase().includes(filter.toLowerCase())
            );
        }

        setFilteredDesigns(data);
    }, [search, filter, designs]);

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
                <TextInput value={search} onChangeText={setSearch}
                    placeholder="Search design…" placeholderTextColor={T.muted}
                    style={ct.search} />
            </View>
            <FlatList
                // data={designs}
                data={filteredDesigns}
                // keyExtractor={d => d.id}
                keyExtractor={(item) => item.DsnCode}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}

                // renderItem={({ item: d }) => (
                //     <TouchableOpacity style={ct.row}
                //         onPress={() => onSelectDesign(d)} activeOpacity={0.7}>
                //         <Swatch design={d} size={44} />
                //         <View style={ct.rowInfo}>
                //             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                //                 <Text style={ct.rowCode}>{d.code}</Text>
                //                 <TypeBadge type={d.type} />
                //             </View>
                //             <Text style={ct.rowSub}>
                //                 {SHORT(d.category)} · {d.epi_total}×{d.ppi_total} · {d.cw_count} cw
                //             </Text>
                //         </View>
                //         <View style={ct.rowRight}>
                //             <Text style={ct.rowPrice}>
                //                 {d.latest_cost ? r0(d.latest_cost) : '—'}
                //             </Text>
                //             <Text style={ct.rowPriceSub}>per m</Text>
                //         </View>
                //         <Text style={ct.chevron}>›</Text>
                //     </TouchableOpacity>
                // )}

                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={ct.row}
                        activeOpacity={0.7}
                        onPress={() => onSelectDesign(item)}
                    >
                        <Swatch design={item} size={44} />
                        <View style={ct.rowInfo}>
                            <Text style={ct.rowCode}>
                                {item.DsnCode}
                            </Text>
                            <Text style={ct.rowSub}>
                                {item.DsnName}
                            </Text>
                            <Text
                                style={{
                                    color: "#000",
                                    fontSize: 12,
                                    marginTop: 2
                                }}
                            >
                                {item.ItmName}
                            </Text>
                        </View>
                        <Text style={ct.chevron}>›</Text>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={ct.sep} />}
                ListEmptyComponent={<Text style={s.empty}>No designs found</Text>}
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
});


function DesignTab({ design, onRefresh }: { design: Design | null; onRefresh: () => void }) {
    const [allYarns, setAllYarns] = useState<YarnMaster[]>([]);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Partial<Design>>({});

    useEffect(() => {
        DesignAPI.yarns().then(r => setAllYarns(r.data.data)).catch(() => { });
    }, []);

    useEffect(() => {
        if (design) setForm(design);
    }, [design?.id]);

    if (!design) return (
        <View style={s.center}>
            <Text style={s.empty}>Select a design from Catalog</Text>
        </View>
    );

    const save = async () => {
        setSaving(true);
        try {
            await DesignAPI.update(design.id, form);
            Alert.alert('Saved', 'Design updated successfully');
            onRefresh();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const Row = ({ label, value }: { label: string; value: string }) => (
        <View style={dt.row}>
            <Text style={dt.label}>{label}</Text>
            <Text style={dt.value}>{value}</Text>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            {/* Header */}
            <View style={dt.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Swatch design={design} size={52} />
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={dt.code}>{design.code}</Text>
                            <TypeBadge type={design.type} />
                        </View>
                        <Text style={dt.cat}>{design.category}</Text>
                    </View>
                </View>
                {design.weave && <Text style={dt.weave}>{design.weave}</Text>}
                {design.note && <Text style={dt.note}>{design.note}</Text>}
            </View>

            {/* Construction */}
            <Text style={dt.sectionHdr}>CONSTRUCTION</Text>
            <View style={dt.card}>
                <Row label="Reed Space" value={`${design.reed_space}″`} />
                <Row label="Warp Shrink" value={`${design.warp_shrink}%`} />
                <Row label="Fin Width" value={design.fin_width ? `${design.fin_width}″` : '—'} />
                <Row label="G→F Shrink" value={`${design.gf_shrink}%`} />
                <Row label="Finish Lock" value={design.finish_locked ? 'Yes' : 'No'} />
            </View>

            {/* Warp yarns */}
            <Text style={dt.sectionHdr}>WARP YARNS</Text>
            <View style={dt.card}>
                {design.warp_yarns.map((y, i) => (
                    <View key={i} style={[dt.yarnRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.border, marginTop: 8, paddingTop: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={dt.yarnName}>{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                            <Text style={dt.yarnSub}>{y.sys} · {y.cnt} count</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={dt.yarnEpi}>{y.epi} EPI</Text>
                            <Text style={dt.yarnPrice}>₹{y.base_price}/kg</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Weft yarns */}
            <Text style={dt.sectionHdr}>WEFT YARNS</Text>
            <View style={dt.card}>
                {design.weft_yarns.map((y, i) => (
                    <View key={i} style={[dt.yarnRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.border, marginTop: 8, paddingTop: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={dt.yarnName}>{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                            <Text style={dt.yarnSub}>{y.sys} · {y.cnt} count</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={dt.yarnEpi}>{y.ppi} PPI</Text>
                            <Text style={dt.yarnPrice}>₹{y.base_price}/kg</Text>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={[dt.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                <Text style={dt.saveTxt}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
const dt = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
    code: { fontSize: 18, fontWeight: '800', color: T.ink },
    cat: { fontSize: 12, color: T.muted, marginTop: 2 },
    weave: { fontSize: 12, color: T.muted, fontStyle: 'italic' },
    note: { fontSize: 12, color: T.muted, marginTop: 6 },
    sectionHdr: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    label: { fontSize: 12, color: T.muted },
    value: { fontSize: 12, fontWeight: '600', color: T.ink },
    yarnRow: { flexDirection: 'row', alignItems: 'flex-start' },
    yarnName: { fontSize: 13, fontWeight: '700', color: T.ink },
    yarnSub: { fontSize: 11, color: T.muted, marginTop: 2 },
    yarnEpi: { fontSize: 13, fontWeight: '700', color: T.copper },
    yarnPrice: { fontSize: 11, color: T.muted, marginTop: 2 },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
    saveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});


function ColourwayTab({ design }: { design: Design | null }) {
    const [subs, setSubs] = useState<SubDesign[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!design) return;
        setLoading(true);
        DesignAPI.colourways(design.id)
            .then(r => setSubs(r.data.data))
            .catch(() => { })
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
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    code: { fontSize: 14, fontWeight: '700', color: T.ink },
    comName: { fontSize: 12, color: T.muted, fontStyle: 'italic' },
    pHdr: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    patBand: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    patSwatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: T.border },
    patLabel: { fontSize: 11, color: T.ink },
});


function YarnsTab() {
    const [yarns, setYarns] = useState<YarnMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'Lea' | 'Ne' | 'Den'>('all');

    useEffect(() => {
        DesignAPI.yarns()
            .then(r => setYarns(r.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() =>
        filter === 'all' ? yarns : yarns.filter(y => y.sys === filter), [yarns, filter]);

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {(['all', 'Lea', 'Ne', 'Den'] as const).map(f => (
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
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    badge: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    price: { fontSize: 13, fontWeight: '700', color: T.copper },
});


function DyeingTab({ design }: { design: Design | null }) {
    const [dyeData, setDyeData] = useState<Record<string, { average: number; recent: any[] }>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!design) return;
        setLoading(true);
        const allYarns = [...design.warp_yarns, ...design.weft_yarns];
        const unique = [...new Set(allYarns.map(y => y.mi_id))];
        Promise.all(unique.map(miId =>
            DesignAPI.yarnDyeing(miId).then(r => ({ miId, data: r.data.data }))
        ))
            .then(results => {
                const map: Record<string, any> = {};
                results.forEach(r => { map[r.miId] = r.data; });
                setDyeData(map);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [design?.id]);

    if (!design) return <View style={s.center}><Text style={s.empty}>Select a design from Catalog</Text></View>;
    if (design.type === 'PD') return (
        <View style={s.center}>
            <Text style={s.empty}>Piece-dyed design — dyeing costs are per meter, not per yarn</Text>
        </View>
    );
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    const allYarns = [...design.warp_yarns, ...design.weft_yarns];
    const unique = allYarns.filter((y, i, arr) => arr.findIndex(x => x.mi_id === y.mi_id) === i);

    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                Dyeing cost history from past costings for {design.code} yarns (YD)
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
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    avg: { fontSize: 13, fontWeight: '700', color: T.green },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.sub },
    rowDate: { flex: 1, fontSize: 11, color: T.muted },
    rowCode: { fontSize: 11, color: T.ink, marginRight: 8 },
    rowAmt: { fontSize: 12, fontWeight: '700', color: T.copper },
});


export function DesignsScreen({ token }: any) {
    const [tab, setTab] = useState<Tab>('Catalog');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail] = useState<Design | null>(null);

    const handleSelectDesign = async (d: Design) => {
        setSelected(d);
        // fetch full detail for Design/Colourway/Dyeing tabs
        try {
            const res = await DesignAPI.get(d.id);
            setDetail(res.data.data);
        } catch {
            setDetail(d);
        }
        setTab('Design');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
            {/* Header */}
            <View style={hdr.wrap}>
                <View>
                    <Text style={hdr.brand}>MADHUSUDHAN FABRICS</Text>
                    <Text style={hdr.title}>Designs</Text>
                    {selectedDesign && (
                        <Text style={hdr.sub}>Selected: {selectedDesign.code}</Text>
                    )}
                </View>
            </View>

            <TabBar active={tab} onChange={setTab} />

            <View style={{ flex: 1 }}>
                {tab === 'Catalog' && <CatalogTab token={token} onSelectDesign={handleSelectDesign} />}
                {tab === 'Design' && <DesignTab design={detailDesign} onRefresh={() => selectedDesign && handleSelectDesign(selectedDesign)} />}
                {tab === 'Colourway' && <ColourwayTab design={detailDesign} />}
                {tab === 'Yarns' && <YarnsTab />}
                {tab === 'Dyeing' && <DyeingTab design={detailDesign} />}
            </View>
        </SafeAreaView>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12, height: 70 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub: { fontSize: 11, color: '#000', marginTop: 2 },
});

const s = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty: { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default DesignsScreen;
