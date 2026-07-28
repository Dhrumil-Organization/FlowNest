import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import React from 'react';

import { T } from '../../theme';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

// Seed stock data (mirrors web app GFS_INIT / FFS_INIT)
const GREIGE_STOCK = [
    { code: 'Passat', qty: 1200, rsv: 300, rate: 196, da: 12 },
    { code: 'Oxford', qty: 900, rsv: 200, rate: 178, da: 8 },
    { code: 'Milano', qty: 600, rsv: 150, rate: 188, da: 18 },
    { code: 'Active Grid', qty: 800, rsv: 400, rate: 96, da: 6 },
    { code: 'Mesh Track', qty: 700, rsv: 200, rate: 55, da: 15 },
    { code: 'Monaco', qty: 400, rsv: 100, rate: 120, da: 30 },
];

const FIN_STOCK = [
    { code: 'Passat', shades: [{ s: 'Navy', qty: 320, rsv: 80 }, { s: 'Sky Blue', qty: 180, rsv: 0 }], rate: 262, da: 10 },
    { code: 'Oxford', shades: [{ s: 'Royal Blue', qty: 280, rsv: 100 }], rate: 175, da: 8 },
    { code: 'Active Grid', shades: [{ s: 'Black', qty: 600, rsv: 200 }], rate: 108, da: 5 },
];

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const money = (n: number) => n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`;

export function StockScreen() {
    const gfTotal = GREIGE_STOCK.reduce((s, v) => s + v.qty, 0);
    const gfVal = GREIGE_STOCK.reduce((s, v) => s + v.qty * v.rate, 0);
    const ffTotal = FIN_STOCK.reduce((s, v) => s + v.shades.reduce((a, sh) => a + sh.qty, 0), 0);
    const ffVal = FIN_STOCK.reduce((s, v) => s + v.shades.reduce((a, sh) => a + sh.qty, 0) * v.rate, 0);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
            <ScreenHeader brand="MADHUSUDHAN FABRICS" title="Stock" />
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
                {/* KPI */}
                <View style={styles.row}>
                    <KpiCard label="Greige" value={`${fmt(gfTotal)} m`} sub={money(gfVal)} color={T.yd} />
                    <View style={styles.gap} />
                    <KpiCard label="Finished" value={`${fmt(ffTotal)} m`} sub={money(ffVal)} color={T.green} />
                    <View style={styles.gap} />
                    <KpiCard label="Total Value" value={money(gfVal + ffVal)} sub="fabric stock" dark />
                </View>

                {/* Greige */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>GREIGE FABRIC</Text>
                    {GREIGE_STOCK.map(r => {
                        const avl = r.qty - r.rsv;
                        return (
                            <View key={r.code} style={styles.stockRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stockCode}>{r.code}</Text>
                                    <Text style={styles.stockSub}>
                                        {fmt(avl)} / {fmt(r.qty)} m available · {r.da}d old
                                    </Text>
                                    <ProgressBar pct={r.qty > 0 ? avl / r.qty * 100 : 0} color={T.yd} height={5} />
                                </View>
                                <Text style={styles.stockVal}>{money(r.qty * r.rate)}</Text>
                            </View>
                        );
                    })}
                </Card>

                {/* Finished */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>FINISHED FABRIC</Text>
                    {FIN_STOCK.map(r => {
                        const t = r.shades.reduce((a, s) => a + s.qty, 0);
                        const avl = r.shades.reduce((a, s) => a + (s.qty - s.rsv), 0);
                        return (
                            <View key={r.code} style={styles.stockRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stockCode}>{r.code}</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 4 }}>
                                        {r.shades.map(s => (
                                            <View key={s.s} style={styles.shadePill}>
                                                <Text style={styles.shadePillText}>{s.s} · {fmt(s.qty)}m</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={styles.stockSub}>{fmt(avl)} / {fmt(t)} m available</Text>
                                    <ProgressBar pct={t > 0 ? avl / t * 100 : 0} color={T.green} height={5} />
                                </View>
                                <Text style={styles.stockVal}>{money(t * r.rate)}</Text>
                            </View>
                        );
                    })}
                </Card>

                {/* Value flow */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>STOCK VALUE FLOW</Text>
                    {[
                        { l: 'Greige Fabric', v: gfVal, c: T.yd },
                        { l: 'Finished Fabric', v: ffVal, c: T.purple },
                    ].map(item => (
                        <View key={item.l} style={styles.flowRow}>
                            <View style={[styles.dot, { backgroundColor: item.c }]} />
                            <Text style={styles.flowLabel}>{item.l}</Text>
                            <Text style={[styles.flowVal, { color: item.c }]}>{money(item.v)}</Text>
                        </View>
                    ))}
                    <View style={styles.flowTotal}>
                        <Text style={styles.flowTotalLabel}>Total</Text>
                        <Text style={styles.flowTotalVal}>{money(gfVal + ffVal)}</Text>
                    </View>
                </Card>

                <Text style={styles.note}>
                    Stock figures are demo seed data. Live yarn / beam / roll level stock is part of
                    the full web Stock Hub and will sync here in a later phase.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row' },
    gap: { width: 10 },
    mt12: { marginTop: 12 },
    sectionTitle: { fontSize: 9, fontWeight: '800', color: T.nav, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    stockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.sub, gap: 10 },
    stockCode: { fontSize: 13, fontWeight: '700', color: T.ink },
    stockSub: { fontSize: 10.5, color: T.muted, marginVertical: 3 },
    stockVal: { fontSize: 12, fontWeight: '700', color: T.ink },
    shadePill: { backgroundColor: T.sub, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    shadePillText: { fontSize: 9.5, fontWeight: '700', color: T.muted },
    flowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.sub, gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    flowLabel: { flex: 1, fontSize: 12, color: T.ink },
    flowVal: { fontSize: 13, fontWeight: '700' },
    flowTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
    flowTotalLabel: { fontSize: 13, fontWeight: '800', color: T.ink },
    flowTotalVal: { fontSize: 16, fontWeight: '800', color: T.ink },
    note: { fontSize: 10, color: T.muted, marginTop: 14, lineHeight: 15, textAlign: 'center' },
    cardPad: { padding: 14 },
});
