import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import React, { Fragment, useMemo, useState } from 'react';
import { T } from '../../theme';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

/* ── Port of the web ExpenseModule (read-only summary phase) ──────
   Heads: Electricity (daily units × ₹/unit) · Salary · Stores ·
   Maintenance · Other, split Rapier vs Waterjet, with ₹/pick and
   month-on-month history. Mirrors EXP_INIT / XPAST in the web app. */

const XC = { elec: '#3A568A', sal: '#9A4A10', store: '#2A6044', maint: '#652880', other: '#C98A1A' };

// June '26 daily entries (from web EXP_INIT)
const RATE = 7.67; // ₹ per unit
const DAILY_UNITS = [
    { d: '01-Jun', mwLooms: 2235, mwLuwa: 1657, sudLooms: 2604, sudLuwa: 913, wjetLooms: 1087, warping: 171, misc: 96 },
    { d: '02-Jun', mwLooms: 2274, mwLuwa: 1758, sudLooms: 2658, sudLuwa: 929, wjetLooms: 1135, warping: 164, misc: 92 },
    { d: '03-Jun', mwLooms: 2360, mwLuwa: 1755, sudLooms: 2544, sudLuwa: 1119, wjetLooms: 1208, warping: 168, misc: 90 },
    { d: '04-Jun', mwLooms: 2299, mwLuwa: 1755, sudLooms: 2701, sudLuwa: 1002, wjetLooms: 1111, warping: 172, misc: 94 },
];
const DAILY_SALARY = [
    { d: '01-Jun', rapier: 190112, wjet: 58049 },
    { d: '02-Jun', rapier: 184033, wjet: 55723 },
    { d: '03-Jun', rapier: 190945, wjet: 53869 },
    { d: '04-Jun', rapier: 192891, wjet: 60332 },
];
const STORES = { rapier: 33279.20, wjet: 23166.34 };
const PROD_CUR = { mwRapier: 19269, sudRapier: 23534, wjet: 15705 }; // metres MTD

// prior-month summaries (web XPAST + May real), pre-computed totals
const PAST_MONTHS = [
    { label: 'Jan \u201926', total: 11.92, perPickR: 0.62, perPickW: 0.58 },
    { label: 'Feb \u201926', total: 10.71, perPickR: 0.64, perPickW: 0.60 },
    { label: 'Mar \u201926', total: 11.99, perPickR: 0.62, perPickW: 0.58 },
    { label: 'Apr \u201926', total: 12.36, perPickR: 0.61, perPickW: 0.57 },
    { label: 'May \u201926', total: 12.55, perPickR: 0.60, perPickW: 0.56 },
];

const L = (n: number) => `₹${(n / 1e5).toFixed(2)}L`;
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export function ExpenseScreen() {
    const [showDaily, setShowDaily] = useState(false);

    const m = useMemo(() => {
        const u = DAILY_UNITS.reduce((a, r) => ({
            mwLooms: a.mwLooms + r.mwLooms, mwLuwa: a.mwLuwa + r.mwLuwa,
            sudLooms: a.sudLooms + r.sudLooms, sudLuwa: a.sudLuwa + r.sudLuwa,
            wjetLooms: a.wjetLooms + r.wjetLooms, warping: a.warping + r.warping, misc: a.misc + r.misc,
        }), { mwLooms: 0, mwLuwa: 0, sudLooms: 0, sudLuwa: 0, wjetLooms: 0, warping: 0, misc: 0 });

        const rapierUnits = u.mwLooms + u.mwLuwa + u.sudLooms + u.sudLuwa + (2 / 3) * (u.warping + u.misc);
        const wjetUnits = u.wjetLooms + (1 / 3) * (u.warping + u.misc);
        const elecR = rapierUnits * RATE;
        const elecW = wjetUnits * RATE;

        const sal = DAILY_SALARY.reduce((a, r) => ({ rapier: a.rapier + r.rapier, wjet: a.wjet + r.wjet }), { rapier: 0, wjet: 0 });

        const totR = elecR + sal.rapier + STORES.rapier;
        const totW = elecW + sal.wjet + STORES.wjet;
        const total = totR + totW;

        const prodR = PROD_CUR.mwRapier + PROD_CUR.sudRapier;
        const prodW = PROD_CUR.wjet;
        // avg picks/m ≈ 70 rapier, 67 wjet (from web picks data) → picks = m × ppi × 0.0254/in… simplified to ₹/m here
        const perMR = prodR > 0 ? totR / prodR : 0;
        const perMW = prodW > 0 ? totW / prodW : 0;

        return {
            u, elecR, elecW, elec: elecR + elecW,
            salR: sal.rapier, salW: sal.wjet, sal: sal.rapier + sal.wjet,
            storeR: STORES.rapier, storeW: STORES.wjet, store: STORES.rapier + STORES.wjet,
            totR, totW, total, perMR, perMW,
            days: DAILY_UNITS.length,
        };
    }, []);

    const HEADS = [
        { k: 'Electricity', v: m.elec, c: XC.elec },
        { k: 'Salary', v: m.sal, c: XC.sal },
        { k: 'Stores', v: m.store, c: XC.store },
        { k: 'Maintenance', v: 0, c: XC.maint },
        { k: 'Other', v: 0, c: XC.other },
    ];
    const headTotal = HEADS.reduce((s, h) => s + h.v, 0) || 1;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
            <ScreenHeader
                brand="EXPENSE — JUN '26"
                title="Plant Expenses"
                right={<Text style={styles.daysTag}>{m.days} days entered</Text>}
            />

            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
                {/* KPIs */}
                <View style={styles.row}>
                    <KpiCard label="Month Total" value={L(m.total)} sub={`${m.days} days`} dark />
                    <View style={styles.gap} />
                    <KpiCard label="Rapier ₹/m" value={`₹${m.perMR.toFixed(1)}`} sub={`${fmt(PROD_CUR.mwRapier + PROD_CUR.sudRapier)} m MTD`} color={T.copper} />
                    <View style={styles.gap} />
                    <KpiCard label="Waterjet ₹/m" value={`₹${m.perMW.toFixed(1)}`} sub={`${fmt(PROD_CUR.wjet)} m MTD`} color={T.blue} />
                </View>

                {/* Head-wise breakdown */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>BREAKDOWN BY HEAD</Text>
                    <View style={styles.stackBar}>
                        {HEADS.filter(h => h.v > 0).map(h => (
                            <View key={h.k} style={{ flex: h.v / headTotal, backgroundColor: h.c }} />
                        ))}
                    </View>
                    {HEADS.map(h => (
                        <View key={h.k} style={styles.headRow}>
                            <View style={[styles.dot, { backgroundColor: h.c }]} />
                            <Text style={styles.headLabel}>{h.k}</Text>
                            <Text style={styles.headPct}>{Math.round(h.v / headTotal * 100)}%</Text>
                            <Text style={[styles.headVal, { color: h.c }]}>{h.v > 0 ? L(h.v) : '—'}</Text>
                        </View>
                    ))}
                </Card>

                {/* Rapier vs Waterjet */}
                <View style={[styles.row, styles.mt12]}>
                    {[
                        { t: 'RAPIER DIVISION', tot: m.totR, e: m.elecR, s: m.salR, st: m.storeR, c: T.copper },
                        { t: 'WATERJET DIVISION', tot: m.totW, e: m.elecW, s: m.salW, st: m.storeW, c: T.blue },
                    ].map((d, i) => (
                        <Fragment key={d.t}>
                            {i > 0 && <View style={styles.gap} />}
                            <View style={[styles.divCard, { borderTopColor: d.c }]}>
                                <Text style={styles.divTitle}>{d.t}</Text>
                                <Text style={[styles.divTotal, { color: d.c }]}>{L(d.tot)}</Text>
                                <View style={styles.divLine}><Text style={styles.divK}>Electricity</Text><Text style={styles.divV}>{L(d.e)}</Text></View>
                                <View style={styles.divLine}><Text style={styles.divK}>Salary</Text><Text style={styles.divV}>{L(d.s)}</Text></View>
                                <View style={styles.divLine}><Text style={styles.divK}>Stores</Text><Text style={styles.divV}>{L(d.st)}</Text></View>
                            </View>
                        </Fragment>
                    ))}
                </View>

                {/* Daily units */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <TouchableOpacity onPress={() => setShowDaily(v => !v)} style={styles.toggleRow}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>DAILY ELECTRICITY UNITS</Text>
                        <Text style={styles.toggleArrow}>{showDaily ? '▾' : '▸'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.rateNote}>Rate ₹{RATE}/unit · Warping & misc split ⅔ rapier / ⅓ waterjet</Text>
                    {showDaily && (
                        <View style={{ marginTop: 8 }}>
                            <View style={[styles.uRow, styles.uHead]}>
                                <Text style={[styles.uCell, styles.uDay]}>Day</Text>
                                <Text style={styles.uCell}>MW Looms</Text>
                                <Text style={styles.uCell}>Sud Looms</Text>
                                <Text style={styles.uCell}>Wjet</Text>
                                <Text style={styles.uCell}>Total</Text>
                            </View>
                            {DAILY_UNITS.map(r => {
                                const tot = r.mwLooms + r.mwLuwa + r.sudLooms + r.sudLuwa + r.wjetLooms + r.warping + r.misc;
                                return (
                                    <View key={r.d} style={styles.uRow}>
                                        <Text style={[styles.uCell, styles.uDay]}>{r.d}</Text>
                                        <Text style={styles.uCell}>{fmt(r.mwLooms + r.mwLuwa)}</Text>
                                        <Text style={styles.uCell}>{fmt(r.sudLooms + r.sudLuwa)}</Text>
                                        <Text style={styles.uCell}>{fmt(r.wjetLooms)}</Text>
                                        <Text style={[styles.uCell, { fontWeight: '800' }]}>{fmt(tot)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </Card>

                {/* Month history */}
                <Card style={[styles.mt12, styles.cardPad]}>
                    <Text style={styles.sectionTitle}>MONTH HISTORY (TOTAL ₹L)</Text>
                    {(() => {
                        const max = Math.max(...PAST_MONTHS.map(p => p.total));
                        return PAST_MONTHS.map(p => (
                            <View key={p.label} style={styles.histRow}>
                                <Text style={styles.histLabel}>{p.label}</Text>
                                <View style={styles.histTrack}>
                                    <View style={[styles.histFill, { width: `${p.total / max * 100}%` }]} />
                                </View>
                                <Text style={styles.histVal}>₹{p.total.toFixed(1)}L</Text>
                            </View>
                        ));
                    })()}
                    <Text style={styles.rateNote}>
                        Jun MTD {L(m.total)} ({m.days} of 30 days). Daily entry & edit comes with the
                        data-entry roles in a later phase; figures here mirror the web Expense module.
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    daysTag: { fontSize: 11, fontWeight: '700', color: '#A9C0D4' },
    row: { flexDirection: 'row' },
    gap: { width: 10 },
    mt12: { marginTop: 12 },
    sectionTitle: { fontSize: 9, fontWeight: '800', color: T.nav, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    stackBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: T.alt, marginBottom: 10 },
    headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.sub, gap: 9 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    headLabel: { flex: 1, fontSize: 12, color: T.ink },
    headPct: { fontSize: 10.5, color: T.muted, width: 36, textAlign: 'right' },
    headVal: { fontSize: 12.5, fontWeight: '800', width: 70, textAlign: 'right' },
    divCard: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 12 },
    divTitle: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
    divTotal: { fontSize: 17, fontWeight: '800', marginTop: 3, marginBottom: 8 },
    divLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    divK: { fontSize: 10.5, color: T.muted },
    divV: { fontSize: 10.5, fontWeight: '700', color: T.ink },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleArrow: { fontSize: 13, color: T.copper, fontWeight: '800' },
    rateNote: { fontSize: 9.5, color: T.muted, marginTop: 6, lineHeight: 14 },
    uRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: T.sub },
    uHead: { borderBottomColor: T.border },
    uCell: { flex: 1, fontSize: 10, color: T.ink, textAlign: 'right' },
    uDay: { textAlign: 'left', fontWeight: '700', color: T.muted },
    histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
    histLabel: { width: 52, fontSize: 10.5, fontWeight: '700', color: T.muted },
    histTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: T.alt, overflow: 'hidden' },
    histFill: { height: 8, borderRadius: 4, backgroundColor: XC.elec },
    histVal: { width: 52, fontSize: 10.5, fontWeight: '800', color: T.ink, textAlign: 'right' },
    cardPad: { padding: 14 },
});
