// FILE: src/components/TakaHistory/TakaDetailScreen.tsx
// Step 3 — one taka: summary + the whole journey (every step, with a "Design / shade changed" badge).
import { S, T } from '@/src/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn } from '../erpUi';
import { getTaka } from './api';
import { fmtQty, processColor, type TakaDetailData } from './model';

type Props = { token: string; API: string; runId: number; takaKey: string; onLoaded?: (d: TakaDetailData) => void };

function Fig({ label, value, color = T.ink }: { label: string; value: number; color?: string }) {
  return (
    <View style={st.fig}>
      <Text style={st.figLabel}>{label}</Text>
      <Text style={[st.figValue, { color }]}>{fmtQty(value)}</Text>
    </View>
  );
}

export default function TakaDetailScreen({ token, API, runId, takaKey, onLoaded }: Props) {
  const [data, setData] = useState<TakaDetailData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await getTaka(API, token, runId, takaKey);
      if (id !== seq.current) return;
      setData(res);
      onLoaded?.(res);
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || 'Could not load the taka.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, runId, takaKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <View style={st.center}>
        {loading ? <ActivityIndicator color={T.copper} /> : null}
        {error ? (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
            <Btn label="Retry" icon="refresh" compact onPress={() => void load()} style={{ marginTop: 8 }} />
          </View>
        ) : null}
      </View>
    );
  }

  const { taka, steps } = data;

  // first "step" on the timeline is the inward itself
  const timeline = [
    { step: 0, process: taka.inward_from, design: taka.design, shade: taka.shade, qty: taka.inward_qty, date: taka.inward_date },
    ...steps,
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator>
      <View style={st.content}>
        <View style={st.summary}>
          <Text style={st.takaNo}>{taka.taka_no}</Text>
          <Text style={st.design}>
            {taka.design}
            {taka.shade ? `  ·  ${taka.shade}` : ''}
          </Text>
          <Text style={st.meta}>Property {taka.property}</Text>

          <View style={st.figures}>
            <Fig label="Inward" value={taka.inward_qty} />
            <Fig label="Total sales" value={taka.total_sales} color={T.green} />
            <Fig label="Closing" value={taka.closing} color={T.nav} />
            {taka.at_job_worker ? <Fig label="At job" value={taka.at_job_worker} color={T.amber} /> : null}
          </View>

          {taka.location ? (
            <Text style={st.location}>
              Now: {taka.location}
              {taka.since ? ` (since ${taka.since})` : ''}
            </Text>
          ) : null}
        </View>

        <Text style={st.section}>Journey</Text>
        <View>
          {timeline.map((s, i) => {
            const prev = timeline[i - 1];
            const changed = !!prev && (prev.shade !== s.shade || prev.design !== s.design) && s.shade !== 'Multiple';
            const dot = processColor(s.process);
            const last = i === timeline.length - 1;
            return (
              <View key={`${s.step}-${i}`} style={st.stepRow}>
                <View style={st.rail}>
                  <View style={[st.dot, { backgroundColor: dot }]} />
                  {!last ? <View style={st.line} /> : null}
                </View>
                <View style={st.stepBody}>
                  <View style={st.stepTop}>
                    <Text style={[st.process, { color: dot }]} numberOfLines={1}>
                      {s.process}
                    </Text>
                    <Text style={st.date}>{s.date}</Text>
                  </View>
                  <Text style={st.stepDesign}>
                    {s.design}
                    {s.shade ? `  ·  ${s.shade}` : ''}
                  </Text>
                  <View style={st.stepBottom}>
                    <Text style={st.qty}>{fmtQty(s.qty)}</Text>
                    {changed ? (
                      <View style={st.badge}>
                        <Text style={st.badgeText}>Design / shade changed</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: `${T.red}40`, backgroundColor: `${T.red}10`, alignItems: 'flex-start', maxWidth: 420 },
  errorText: { fontSize: 12.5, fontWeight: '700', color: T.red },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 12 },
  summary: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  takaNo: { fontSize: 22, fontWeight: '900', color: T.nav },
  design: { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 4 },
  meta: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 3 },
  figures: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 8, marginTop: 12 },
  fig: { minWidth: 0 },
  figLabel: { fontSize: 11, fontWeight: '600', color: T.muted },
  figValue: { fontSize: 16, fontWeight: '900', marginTop: 1 },
  location: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: T.muted, textTransform: 'uppercase', marginTop: 4 },
  stepRow: { flexDirection: 'row' },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 16 },
  line: { flex: 1, width: 2, backgroundColor: T.border, marginTop: 2 },
  stepBody: {
    flex: 1,
    minWidth: 0,
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  stepTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  process: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '900' },
  date: { fontSize: 12, fontWeight: '600', color: T.muted },
  stepDesign: { fontSize: 12.5, fontWeight: '600', color: T.ink, marginTop: 4 },
  stepBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  qty: { fontSize: 14, fontWeight: '800', color: T.ink },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${T.amber}1A` },
  badgeText: { fontSize: 11, fontWeight: '700', color: T.amber },
});
