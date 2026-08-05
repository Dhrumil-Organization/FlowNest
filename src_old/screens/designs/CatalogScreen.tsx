import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { T } from '../../theme';
import { useAppStore } from '../../stores/AppStore';
import { TypeBadge } from '../../components/domain/TypeBadge';
import { SwatchView } from '../../components/domain/SwatchView';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

const CATS = ['All', 'Linen Shirting', 'Sportswear', 'Linen Suiting'];
const shortCat = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;

export function CatalogScreen() {
    const router = useRouter();
    const mains = useAppStore(s => s.mains);
    const subs = useAppStore(s => s.subs);
    const costings = useAppStore(s => s.costings);

    const [cat, setCat] = useState('All');
    const [q, setQ] = useState('');

    const filtered = useMemo(() => mains.filter(m =>
        (cat === 'All' || m.category === cat) &&
        (!q || m.code.toLowerCase().includes(q.toLowerCase()))
    ), [mains, cat, q]);

    const costOf = (mdId: string) => {
        const recs = costings.filter(c => c.mdId === mdId);
        return recs.length ? [...recs].sort((a, b) => b.ts.localeCompare(a.ts))[0] : null;
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScreenHeader brand="MADHUSUDHAN FABRICS" title="Design Catalog" />
            {/* Category filter */}
            <View style={styles.chips}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CATS.map(c => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setCat(c)}
                            style={[styles.chip, cat === c && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, cat === c && styles.chipTextActive]}>
                                {shortCat(c)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search design code…"
                    placeholderTextColor={T.muted}
                    style={styles.search}
                />
            </View>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/new/(tabs)/designs/new')}
                activeOpacity={0.85}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <FlatList
                data={filtered}
                keyExtractor={m => m.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                renderItem={({ item: m }) => {
                    const cws = subs.filter(s => s.mdId === m.id);
                    const rec = costOf(m.id);
                    const firstCw = cws[0];
                    return (
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => router.push({ pathname: '/new/(tabs)/designs/detail', params: { mdId: m.id } })}
                            activeOpacity={0.8}
                        >
                            {firstCw ? (
                                <SwatchView sub={firstCw} size={46} />
                            ) : (
                                <View style={[styles.swatch, { backgroundColor: m.type === 'YD' ? '#E6EFF6' : '#F8EDE6' }]}>
                                    <Text style={styles.swatchText}>{m.type}</Text>
                                </View>
                            )}
                            <View style={styles.info}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.code}>{m.code}</Text>
                                    <TypeBadge type={m.type} />
                                </View>
                                <Text style={styles.sub}>
                                    {shortCat(m.category)} · {m.warpYarns.reduce((a, y) => a + y.epi, 0)}×{m.weftYarns.reduce((a, y) => a + y.ppi, 0)} · {cws.length} cw
                                </Text>
                            </View>
                            {rec && (
                                <View style={styles.costBlock}>
                                    <Text style={styles.costAmt}>₹{Math.round(rec.snap.finalCost)}</Text>
                                    <Text style={styles.costLabel}>per m</Text>
                                </View>
                            )}
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <Text style={styles.empty}>No designs match your filter.</Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    chips: { flexDirection: 'row', padding: 10, paddingHorizontal: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    chip: { marginRight: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.nav },
    chipText: { fontSize: 11, fontWeight: '700', color: T.muted },
    chipTextActive: { color: '#fff' },
    searchWrap: { padding: 10, paddingHorizontal: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 9, padding: 11, fontSize: 14, color: T.ink },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border, gap: 10 },
    swatch: { width: 46, height: 46, borderRadius: 8, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    swatchText: { fontSize: 9, fontWeight: '800', color: T.muted },
    info: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    code: { fontSize: 14, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    costBlock: { alignItems: 'flex-end' },
    costAmt: { fontSize: 13, fontWeight: '700', color: T.green },
    costLabel: { fontSize: 9, color: T.muted },
    arrow: { fontSize: 18, color: T.muted },
    empty: { textAlign: 'center', color: T.muted, padding: 40, fontSize: 13 },
    fab: { position: 'absolute', bottom: 24, right: 20, zIndex: 10, width: 54, height: 54, borderRadius: 27, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8 },
    fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});
