// FILE: src/components/TakaHistory/TakaCard.tsx
// One taka in the list. Tap = open its journey.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fmtQty, type TakaRow } from './model';

function Figure({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={st.figure}>
      <Text style={st.figLabel}>{label}</Text>
      <Text style={[st.figValue, { color }]} numberOfLines={1}>
        {fmtQty(value)}
      </Text>
    </View>
  );
}

export default function TakaCard({ taka, onPress }: { taka: TakaRow; onPress: () => void }) {
  const inStock = taka.closing !== 0;
  const atJob = taka.at_job_worker !== 0;

  return (
    <TouchableOpacity activeOpacity={0.8} style={st.card} onPress={onPress} accessibilityRole="button">
      <View style={st.top}>
        <Text style={st.takaNo} numberOfLines={1}>
          {taka.taka_no || '—'}
        </Text>
        <View style={st.pill}>
          <Text style={st.pillText}>{taka.property}</Text>
        </View>
      </View>

      <Text style={st.design} numberOfLines={1}>
        {taka.design}
        {taka.shade ? <Text style={st.shade}>  ·  {taka.shade}</Text> : null}
      </Text>
      <Text style={st.meta} numberOfLines={2}>
        {taka.inward_from} {fmtQty(taka.inward_qty)} on {taka.inward_date} · {taka.steps} steps
      </Text>

      <View style={st.figures}>
        <Figure label="Sales" value={taka.total_sales} color={T.green} />
        <Figure label="Closing" value={taka.closing} color={inStock ? T.nav : T.muted} />
        {atJob ? <Figure label="At job" value={taka.at_job_worker} color={T.amber} /> : null}
      </View>

      <View style={st.foot}>
        <Text style={st.location} numberOfLines={1}>
          {taka.location ? `${taka.location}${taka.since ? ` since ${taka.since}` : ''}` : ' '}
        </Text>
        <Icon name="chevron-right" size={20} color={T.muted} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  takaNo: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '900', color: T.nav },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  pillText: { fontSize: 11, fontWeight: '800', color: T.nav },
  design: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 6 },
  shade: { color: T.muted, fontWeight: '600' },
  meta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 3 },
  figures: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 6, marginTop: 10 },
  figure: { minWidth: 0 },
  figLabel: { fontSize: 11, fontWeight: '600', color: T.muted },
  figValue: { fontSize: 15, fontWeight: '900', marginTop: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },
  location: { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '600', color: T.muted },
});
