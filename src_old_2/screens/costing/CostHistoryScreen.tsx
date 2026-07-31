import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { T } from '../../theme';
import { useAppStore } from '../../stores/AppStore';
import { SubScreenHeader } from '../../components/layout/SubScreenHeader';
import { TypeBadge } from '../../components/domain/TypeBadge';

export function CostHistoryScreen() {
    const router   = useRouter();
    const costings = useAppStore(s => s.costings);
    const mains    = useAppStore(s => s.mains);

    const grouped = mains.map(m => {
        const recs = [...costings.filter(c => c.mdId === m.id)]
            .sort((a, b) => b.ts.localeCompare(a.ts));
        return { m, recs, latest: recs[0] };
    }).filter(g => g.recs.length > 0)
      .sort((a, b) => (b.latest?.ts ?? '').localeCompare(a.latest?.ts ?? ''));

    return (
        <View style={{ flex: 1, backgroundColor: T.bg }}>
            <SubScreenHeader backLabel="Costing" title="Cost History" />
            <FlatList
                data={grouped}
                keyExtractor={g => g.m.id}
                contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                renderItem={({ item: g }) => (
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.code}>{g.m.code}</Text>
                                    <TypeBadge type={g.m.type} />
                                </View>
                                <Text style={styles.sub}>
                                    {g.recs.length} costing{g.recs.length > 1 ? 's' : ''}
                                </Text>
                            </View>
                            {g.latest && (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.costAmt}>₹{Math.round(g.latest.snap.finalCost)} /m</Text>
                                    <Text style={styles.costDate}>{g.latest.ts.slice(0, 10)}</Text>
                                </View>
                            )}
                        </View>

                        {g.recs.slice(0, 3).map(r => (
                            <View key={r.id} style={styles.recRow}>
                                <Text style={styles.recDate}>{r.ts.slice(0, 10)}</Text>
                                <Text style={styles.recAmt}>₹{Math.round(r.snap.finalCost)} /m</Text>
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/new/(tabs)/costing', params: { mdId: r.mdId } })}
                                    style={styles.reopenBtn}
                                >
                                    <Text style={styles.reopenText}>Reopen</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.empty}>No costings yet. Go to Costing to create one.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card:       { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    header:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    code:       { fontSize: 15, fontWeight: '800', color: T.ink },
    sub:        { fontSize: 10.5, color: T.muted, marginTop: 2 },
    costAmt:    { fontSize: 15, fontWeight: '800', color: T.green },
    costDate:   { fontSize: 9.5, color: T.muted, marginTop: 2 },
    recRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.sub },
    recDate:    { flex: 1, fontSize: 11, color: T.muted },
    recAmt:     { fontSize: 12.5, fontWeight: '700', color: T.ink },
    reopenBtn:  { marginLeft: 12, backgroundColor: T.copper + '1E', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
    reopenText: { fontSize: 11, fontWeight: '700', color: T.copper },
    empty:      { textAlign: 'center', color: T.muted, padding: 40, fontSize: 13 },
});
