import React, { useMemo } from 'react';

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { T } from '../../theme';
import { useAppStore } from '../../stores/AppStore';
import { Card } from '../../components/ui/Card';
import { SubScreenHeader } from '../../components/layout/SubScreenHeader';
import { TypeBadge } from '../../components/domain/TypeBadge';
import { SwatchView } from '../../components/domain/SwatchView';

export function DesignDetailScreen() {
    const router = useRouter();
    const { mdId } = useLocalSearchParams<{ mdId: string }>();
    const mains = useAppStore(s => s.mains);
    const subs = useAppStore(s => s.subs);
    const costings = useAppStore(s => s.costings);

    const design = mains.find(m => m.id === mdId);
    const cwList = subs.filter(s => s.mdId === mdId);
    const rec = useMemo(() => {
        const recs = costings.filter(c => c.mdId === mdId);
        return recs.length ? [...recs].sort((a, b) => b.ts.localeCompare(a.ts))[0] : null;
    }, [costings, mdId]);

    if (!design) return null;

    const sumEpi = design.warpYarns.reduce((a, y) => a + y.epi, 0);
    const sumPpi = design.weftYarns.reduce((a, y) => a + y.ppi, 0);

    return (
        <View style={styles.safe}>
            <SubScreenHeader backLabel="Designs" title="Design" />
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.heroLeft}>
                        <View style={styles.titleRow}>
                            <Text style={styles.code}>{design.code}</Text>
                            <TypeBadge type={design.type} />
                        </View>
                        <Text style={styles.weave}>{design.weave}</Text>
                        {design.note ? <Text style={styles.note}>{design.note}</Text> : null}
                    </View>
                </View>

                {/* Specs */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>CONSTRUCTION</Text>
                    <View style={styles.specGrid}>
                        {[
                            ['EPI', String(sumEpi)],
                            ['PPI', String(sumPpi)],
                            ['Reed', `${design.reedSpace}"`],
                            ['Fin. Width', `${design.finWidth}"`],
                            ['Warp Shrink', `${design.warpShrink}%`],
                            ['Fin. Shrink', `${design.gfShrink}%`],
                        ].map(([l, v]) => (
                            <View key={l} style={styles.specCell}>
                                <Text style={styles.specLabel}>{l}</Text>
                                <Text style={styles.specValue}>{v}</Text>
                            </View>
                        ))}
                    </View>
                </Card>

                {/* Yarns */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>YARNS</Text>
                    {design.warpYarns.map((y, i) => (
                        <View key={`w${i}`} style={styles.yarnRow}>
                            <Text style={[styles.yarnDir, { color: T.yd }]}>WARP</Text>
                            <Text style={styles.yarnName}>{y.miId}{y.br ? ` ${y.br}` : ''}</Text>
                            <Text style={styles.yarnEpi}>{y.epi} EPI</Text>
                        </View>
                    ))}
                    {design.weftYarns.map((y, i) => (
                        <View key={`f${i}`} style={styles.yarnRow}>
                            <Text style={[styles.yarnDir, { color: T.pd }]}>WEFT</Text>
                            <Text style={styles.yarnName}>{y.miId}{y.br ? ` ${y.br}` : ''}</Text>
                            <Text style={styles.yarnEpi}>{y.ppi} PPI</Text>
                        </View>
                    ))}
                </Card>

                {/* Latest costing */}
                {rec && (
                    <View style={[styles.costBanner, styles.mt12]}>
                        <Text style={styles.costLabel}>Latest cost</Text>
                        <Text style={styles.costAmt}>₹{Math.round(rec.snap.finalCost)} /m</Text>
                    </View>
                )}

                {/* Colourways */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <View style={styles.cwHeader}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>COLOURWAYS ({cwList.length})</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/new/(tabs)/designs/colourway', params: { mdId } })}>
                            <Text style={styles.addCw}>+ Add</Text>
                        </TouchableOpacity>
                    </View>
                    {cwList.map(cw => (
                        <View key={cw.id} style={styles.cwRow}>
                            <SwatchView sub={cw} size={32} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cwCode}>{cw.code}</Text>
                                {cw.commercialName ? (
                                    <Text style={styles.cwSub}>Shade: {cw.commercialName}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))}
                    {cwList.length === 0 && (
                        <Text style={styles.emptyText}>No colourways yet.</Text>
                    )}
                </Card>

                <TouchableOpacity
                    style={styles.costBtn}
                    onPress={() => router.push({ pathname: '/new/(tabs)/costing', params: { mdId } })}
                >
                    <Text style={styles.costBtnText}>Cost this design →</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    scroll: { padding: 14 },
    hero: { flexDirection: 'row', backgroundColor: T.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border },
    heroLeft: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    code: { fontSize: 22, fontWeight: '800', color: T.ink },
    weave: { fontSize: 12, color: T.muted, marginTop: 4 },
    note: { fontSize: 11.5, color: T.muted, marginTop: 4, lineHeight: 16 },
    mt12: { marginTop: 12 },
    sectionTitle: { fontSize: 9, fontWeight: '800', color: T.nav, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    specCell: { width: '30%', backgroundColor: T.sub, borderRadius: 8, padding: 10 },
    specLabel: { fontSize: 8.5, color: T.muted, fontWeight: '700', textTransform: 'uppercase' },
    specValue: { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 2 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.sub },
    yarnDir: { fontSize: 8, fontWeight: '800', width: 36, letterSpacing: 0.5 },
    yarnName: { flex: 1, fontSize: 12.5, color: T.ink },
    yarnEpi: { fontSize: 11, color: T.muted },
    costBanner: { backgroundColor: '#EBF1ED', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    costLabel: { fontSize: 10.5, fontWeight: '700', color: T.green },
    costAmt: { fontSize: 16, fontWeight: '800', color: T.green },
    cwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    addCw: { fontSize: 11, fontWeight: '700', color: T.copper },
    cwRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.sub },
    cwCode: { fontSize: 12.5, fontWeight: '700', color: T.ink },
    cwSub: { fontSize: 10, color: T.muted },
    emptyText: { fontSize: 12, color: T.muted, paddingVertical: 8 },
    costBtn: { marginTop: 16, backgroundColor: T.nav, borderRadius: 10, padding: 14, alignItems: 'center' },
    costBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    cardPad: { padding: 14 },
});
