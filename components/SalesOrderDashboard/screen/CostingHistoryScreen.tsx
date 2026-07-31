import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CostingAPI } from '@/common/API/client';
import { T } from '@/common/utils/theme';

type HistoryRecord = {
    id: string;
    md_id: string;
    code?: string;
    category?: string;
    type?: 'YD' | 'PD';
    sub_design_id?: string | null;
    colourway_code?: string | null;
    tier_code?: 'LOW' | 'MID' | 'HIGH';
    tier_name?: string;
    scenario_name?: string | null;
    created_at?: string;
    final_cost?: number;
    snap_final_cost?: number;
    rm_pct?: number;
    weave_pct?: number;
};

type HistoryGroup = {
    md_id: string;
    code?: string;
    category?: string;
    type?: 'YD' | 'PD';
    count?: number;
    latest_cost?: number;
    latest_at?: string;
    records?: HistoryRecord[];
};

const money = (value?: number) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const dateText = (value?: string) => value ? value.slice(0, 10) : '—';
const tierLetter = (tier?: string) => tier === 'LOW' ? 'L' : tier === 'HIGH' ? 'H' : 'M';

function normaliseGroups(payload: unknown): HistoryGroup[] {
    const rows = Array.isArray(payload) ? payload : [];
    if (!rows.length) return [];

    const first = rows[0] as any;
    if (Array.isArray(first?.records)) {
        return rows as HistoryGroup[];
    }

    const map = new Map<string, HistoryGroup>();
    (rows as HistoryRecord[]).forEach(record => {
        const key = String(record.md_id || 'UNKNOWN');
        const group = map.get(key) || {
            md_id: key,
            code: record.code,
            category: record.category,
            type: record.type,
            records: [],
        };
        group.records!.push(record);
        map.set(key, group);
    });

    return Array.from(map.values()).map(group => {
        const records = [...(group.records || [])].sort((a, b) =>
            String(b.created_at || '').localeCompare(String(a.created_at || ''))
        );
        return {
            ...group,
            records,
            count: records.length,
            latest_cost: Number(records[0]?.final_cost ?? records[0]?.snap_final_cost ?? 0),
            latest_at: records[0]?.created_at,
        };
    });
}

export function CostingHistoryScreen() {
    const navigation = useNavigation<any>();
    const [groups, setGroups] = useState<HistoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        try {
            const response = await CostingAPI.history();
            setGroups(normaliseGroups(response.data.data));
        } catch (error: any) {
            Alert.alert('Costing history', error?.response?.data?.message || error?.message || 'Unable to load costing history.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter(group => {
            const groupText = `${group.code || ''} ${group.category || ''} ${group.type || ''}`.toLowerCase();
            const recordMatch = (group.records || []).some(record =>
                `${record.colourway_code || ''} ${record.tier_name || ''} ${record.scenario_name || ''}`.toLowerCase().includes(q)
            );
            return groupText.includes(q) || recordMatch;
        });
    }, [groups, search]);

    const reopen = (record: HistoryRecord) => {
        navigation.navigate('Costing', {
            screen: 'CostingMain',
            params: { costingId: record.id },
        });
    };

    if (loading) {
        return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={T.copper} /></View></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
                <Text style={styles.title}>Costing History</Text>
            </View>

            <View style={styles.searchWrap}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search design, colourway or tier…"
                    placeholderTextColor={T.muted}
                    style={styles.search}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.md_id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                ListEmptyComponent={<Text style={styles.empty}>No saved costing records found.</Text>}
                renderItem={({ item: group }) => {
                    const records = group.records || [];
                    const isExpanded = expanded[group.md_id] ?? true;
                    const latest = records[0];
                    const latestCost = Number(group.latest_cost ?? latest?.final_cost ?? latest?.snap_final_cost ?? 0);

                    return (
                        <View style={styles.card}>
                            <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={() => setExpanded(old => ({ ...old, [group.md_id]: !isExpanded }))}
                                style={styles.groupHeader}
                            >
                                <View style={{ flex: 1 }}>
                                    <View style={styles.titleRow}>
                                        <Text style={styles.code}>{group.code || group.md_id}</Text>
                                        {!!group.type && <View style={styles.typeBadge}><Text style={styles.typeText}>{group.type}</Text></View>}
                                    </View>
                                    <Text style={styles.sub}>{group.category || 'Design'} · {group.count ?? records.length} costing(s)</Text>
                                </View>
                                <View style={styles.latestBox}>
                                    <Text style={styles.latestCost}>{money(latestCost)} /m</Text>
                                    <Text style={styles.latestDate}>{dateText(group.latest_at || latest?.created_at)}</Text>
                                </View>
                                <Text style={styles.chevron}>{isExpanded ? '▴' : '▾'}</Text>
                            </TouchableOpacity>

                            {isExpanded && records.map(record => {
                                const finalCost = Number(record.final_cost ?? record.snap_final_cost ?? 0);
                                return (
                                    <View key={record.id} style={styles.recordRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.recordTitleRow}>
                                                <Text style={styles.recordDate}>{dateText(record.created_at)}</Text>
                                                {!!record.colourway_code && <Text style={styles.colourway}>{record.colourway_code}</Text>}
                                                <View style={styles.tierBadge}><Text style={styles.tierText}>{tierLetter(record.tier_code)}</Text></View>
                                            </View>
                                            <Text style={styles.recordMeta}>
                                                {record.tier_name || 'Standard'}{record.scenario_name ? ` · ${record.scenario_name}` : ''}
                                            </Text>
                                        </View>
                                        <View style={styles.metricBox}>
                                            <Text style={styles.recordCost}>{money(finalCost)}</Text>
                                            <Text style={styles.percentText}>RM {Math.round(Number(record.rm_pct || 0))}% · W {Math.round(Number(record.weave_pct || 0))}%</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => reopen(record)} style={styles.reopenBtn}>
                                            <Text style={styles.reopenText}>Reopen</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    searchWrap: { padding: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: T.ink, fontSize: 13 },
    list: { padding: 14, paddingBottom: 36 },
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
    groupHeader: { flexDirection: 'row', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    code: { fontSize: 15, fontWeight: '800', color: T.ink },
    typeBadge: { backgroundColor: T.copper + '18', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    typeText: { fontSize: 10, fontWeight: '800', color: T.copper },
    sub: { fontSize: 10.5, color: T.muted, marginTop: 3 },
    latestBox: { alignItems: 'flex-end', marginLeft: 10 },
    latestCost: { fontSize: 14, fontWeight: '800', color: T.green },
    latestDate: { fontSize: 9.5, color: T.muted, marginTop: 2 },
    chevron: { marginLeft: 10, color: T.muted },
    recordRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10, marginTop: 10 },
    recordTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recordDate: { fontSize: 11, fontWeight: '700', color: T.ink },
    colourway: { fontSize: 10, color: T.copper, fontWeight: '800' },
    tierBadge: { minWidth: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: T.ink },
    tierText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    recordMeta: { fontSize: 9.5, color: T.muted, marginTop: 3 },
    metricBox: { alignItems: 'flex-end', marginHorizontal: 10 },
    recordCost: { fontSize: 12.5, fontWeight: '800', color: T.ink },
    percentText: { fontSize: 9, color: T.muted, marginTop: 2 },
    reopenBtn: { backgroundColor: T.copper + '1E', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
    reopenText: { fontSize: 11, fontWeight: '800', color: T.copper },
    empty: { textAlign: 'center', color: T.muted, padding: 40, fontSize: 13 },
});

export default CostingHistoryScreen;
