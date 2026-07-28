import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../../theme';
import type { CostingRecord, MainDesign, FabricType } from '../../types';

/** Mobile port of the web `MarginNote` — shows expected margin for an
 *  order line based on the latest saved costing of the chosen design. */

const rupee0 = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function marginInfo(
    costings: CostingRecord[],
    mdId: string,
    fabricType: FabricType,
    price: number,
) {
    if (!mdId || !(price > 0)) return null;
    const recs = costings
        .filter(c => c.mdId === mdId)
        .sort((a, b) => b.ts.localeCompare(a.ts));
    if (!recs.length) return null;
    const snap = recs[0].snap;
    const costM = fabricType === 'finished' && snap.hasFin ? snap.finishedPrice : snap.greigePrice;
    if (!(costM > 0)) return null;
    const margin = price - costM;
    const marginPct = (margin / price) * 100;
    return { costM, margin, marginPct, ts: recs[0].ts };
}

interface Props {
    costings: CostingRecord[];
    mains: MainDesign[];
    mdId: string;
    fabricType: FabricType;
    price: number;
}

export function MarginNote({ costings, mdId, fabricType, price }: Props) {
    const m = marginInfo(costings, mdId, fabricType, price);
    if (!m) return null;
    const good = m.margin >= 0;
    return (
        <View style={styles.box}>
            <View style={styles.row}>
                <View style={styles.left}>
                    <Text style={styles.label}>EXPECTED MARGIN</Text>
                    <Text style={styles.sub}>
                        Cost {rupee0(m.costM)}/m · Rate {rupee0(price)}/m · {fabricType}
                    </Text>
                </View>
                <View style={styles.right}>
                    <Text style={[styles.amt, { color: good ? T.green : T.red }]}>
                        {good ? '+' : ''}{rupee0(m.margin)}/m
                    </Text>
                    <Text style={[styles.pct, { color: good ? T.green : T.red }]}>
                        {good ? '+' : ''}{r1(m.marginPct)}%
                    </Text>
                </View>
            </View>
            <Text style={styles.foot}>Based on costing dated {m.ts.slice(0, 10)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    box: { backgroundColor: T.sub, borderRadius: 9, padding: 11, marginTop: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    left: { flex: 1 },
    label: { fontSize: 9, color: T.muted, fontWeight: '700', letterSpacing: 0.6 },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    right: { alignItems: 'flex-end' },
    amt: { fontSize: 15, fontWeight: '800', fontFamily: 'Courier' },
    pct: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    foot: { fontSize: 9, color: T.muted, marginTop: 7 },
});
