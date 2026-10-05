import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { buildOrderYarnRequirement } from './productionYarnRequirement';

type Props = {
    lines: any[];
    greigeMetres: number | null;
    loading?: boolean;
    error?: string;
};
const quantity = (value: number, decimals = 3) => value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
});

export default function ProductionYarnRequirement({ lines, greigeMetres, loading = false, error = '' }: Props) {
    const requirement = useMemo(() => buildOrderYarnRequirement(lines, greigeMetres), [lines, greigeMetres]);
    return <View style={s.card}>
        <Text style={s.title}>YARN REQUIRED FOR THIS ORDER</Text>
        <Text style={s.basis}>{greigeMetres !== null
            ? `Based on ${quantity(greigeMetres)} m greige production.`
            : 'The saved PO greige quantity is unavailable.'}</Text>
        {loading ? <View style={s.loading}><ActivityIndicator size="small" color="#2C614A" /><Text style={s.note}>Loading saved yarn consumption...</Text></View>
            : <>
                {!!error && <Text style={s.warning}>{error}</Text>}
                {!requirement.complete && !error && greigeMetres !== null && <Text style={s.warning}>Saved warp/weft consumption is incomplete or invalid. Total yarn requirement is unavailable.</Text>}
                {requirement.rows.length > 0 && <>
                    <View style={s.row}>
                        <Text style={[s.label, s.yarn]}>YARN / USE</Text>
                        <Text style={[s.label, s.number]}>g/m</Text>
                        <Text style={[s.label, s.number]}>REQUIRED kg</Text>
                    </View>
                    {requirement.rows.map((row: any) => <View key={row.rowKey} style={s.row}>
                        <View style={s.yarn}>
                            <Text style={s.name}>{row.name || row.YarnName || 'Yarn name unavailable'}</Text>
                            <Text style={s.use}>{row.yarn_type || 'Unspecified'}{row.blend_ratio ? ` · ${row.blend_ratio}` : ''}</Text>
                        </View>
                        <Text style={s.number}>{row.gramsPerMetre === null ? 'Unavailable' : quantity(row.gramsPerMetre, 4)}</Text>
                        <Text style={[s.number, s.required]}>{row.requiredKg === null ? 'Unavailable' : quantity(row.requiredKg)}</Text>
                    </View>)}
                </>}
                {requirement.complete && <View style={s.totals}>
                    {['warp', 'weft', ...(requirement.rows.some((row: any) => row.yarn_type === 'selvedge') ? ['selvedge'] : []), 'overall'].map(type => <View key={type} style={s.total}>
                        <Text style={s.label}>{type === 'overall' ? 'TOTAL YARN' : type.toUpperCase()}</Text>
                        <Text style={s.required}>{quantity(requirement.totals![type])} kg</Text>
                    </View>)}
                </View>}
                <Text style={s.note}>Required kg = greige metres × saved g/m ÷ 1,000. Costing allowances are not added again. Planning requirement.</Text>
            </>}
    </View>;
}
const s = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 12, padding: 12, marginTop: 10 },
    title: { fontSize: 11, fontWeight: '800', color: '#17324A' },
    basis: { fontSize: 11, color: '#5F6B7A', marginTop: 6, marginBottom: 8 },
    loading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    warning: { color: '#92400E', backgroundColor: '#FFF8EC', padding: 10, borderRadius: 6, fontSize: 11, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EDF0F4', paddingVertical: 9 },
    yarn: { flex: 1, paddingRight: 8 },
    name: { fontSize: 11, fontWeight: '700', color: '#172033' },
    use: { fontSize: 10, color: '#718096', textTransform: 'capitalize', marginTop: 3 },
    label: { fontSize: 9, color: '#718096', fontWeight: '700' },
    number: { width: 92, textAlign: 'right', fontSize: 11, color: '#172033' },
    required: { fontSize: 12, fontWeight: '800', color: '#2C614A' },
    totals: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, backgroundColor: '#F4F8F6', borderRadius: 8, padding: 8 },
    total: { minWidth: 110, flex: 1, padding: 5 },
    note: { fontSize: 10, color: '#718096', marginTop: 8, lineHeight: 15 }
});
