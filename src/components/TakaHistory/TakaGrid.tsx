// FILE: src/components/TakaHistory/TakaGrid.tsx
// Grid (table) view of the takas. Every detail that the journey page shows in its summary is a column here.
// Tap a row = expand it: the journey is loaded with the SAME call as the detail page (getTaka) - once per taka,
// then cached. "Open" opens the full journey page. Rows come from the list's endless paging (same as cards).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTaka } from './api';
import { fmtQty, processColor, type TakaDetailData, type TakaRow } from './model';

type Col = { key: string; label: string; w: number; num?: boolean; get: (t: TakaRow) => string; color?: (t: TakaRow) => string };

const COLS: Col[] = [
  { key: 'taka_no', label: 'Taka no', w: 90, get: (t) => t.taka_no || '—' },
  { key: 'property', label: 'Property', w: 80, get: (t) => t.property || '' },
  { key: 'design', label: 'Design', w: 190, get: (t) => t.design || '' },
  { key: 'shade', label: 'Shade', w: 120, get: (t) => t.shade || '' },
  { key: 'inward_from', label: 'Inward from', w: 110, get: (t) => t.inward_from || '' },
  { key: 'inward_qty', label: 'Inward', w: 90, num: true, get: (t) => fmtQty(t.inward_qty) },
  { key: 'inward_date', label: 'Inward date', w: 100, get: (t) => t.inward_date || '' },
  { key: 'steps', label: 'Steps', w: 60, num: true, get: (t) => String(t.steps ?? '') },
  { key: 'total_sales', label: 'Sales', w: 90, num: true, get: (t) => fmtQty(t.total_sales), color: () => T.green },
  { key: 'closing', label: 'Closing', w: 90, num: true, get: (t) => fmtQty(t.closing), color: (t) => (t.closing !== 0 ? T.nav : T.muted) },
  { key: 'at_job_worker', label: 'At job', w: 90, num: true, get: (t) => fmtQty(t.at_job_worker), color: (t) => (t.at_job_worker !== 0 ? T.amber : T.muted) },
  { key: 'location', label: 'Current location', w: 170, get: (t) => t.location || '' },
  { key: 'since', label: 'Since', w: 95, get: (t) => t.since || '' },
];
const EXP_W = 34;
const OPEN_W = 64;
const TABLE_W = EXP_W + OPEN_W + COLS.reduce((a, c) => a + c.w, 0);

type Cache = Record<string, { loading?: boolean; error?: string; data?: TakaDetailData }>;
type Props = { token: string; API: string; runId: number; items: TakaRow[]; onOpen: (t: TakaRow) => void };

export default function TakaGrid({ token, API, runId, items, onOpen }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [cache, setCache] = useState<Cache>({});
  const cacheRef = useRef<Cache>({});

  const put = (key: string, v: Cache[string]) => {
    cacheRef.current = { ...cacheRef.current, [key]: v };
    setCache(cacheRef.current);
  };

  const load = useCallback(
    (key: string) => {
      put(key, { loading: true });
      getTaka(API, token, runId, key)
        .then((data) => put(key, { data }))
        .catch((e: any) => put(key, { error: e?.message || 'Could not load the journey.' }));
    },
    [API, token, runId],
  );

  const toggle = (t: TakaRow) => {
    const willOpen = !open[t.key];
    setOpen((o) => ({ ...o, [t.key]: willOpen }));
    if (!willOpen) return;
    const cur = cacheRef.current[t.key];
    if (cur?.data || cur?.loading) return;
    load(t.key);
  };

  return (
    <View style={st.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={{ minWidth: TABLE_W, flexGrow: 1 }}>
        <View style={{ minWidth: TABLE_W, flexGrow: 1 }}>
          <View style={st.headRow}>
            <View style={{ width: EXP_W }} />
            {COLS.map((c) => (
              <Text key={c.key} style={[st.headCell, { width: c.w }, c.num && st.num]} numberOfLines={1}>
                {c.label}
              </Text>
            ))}
            <View style={{ width: OPEN_W }} />
          </View>

          {items.map((t, i) => {
            const isOpen = !!open[t.key];
            return (
              <View key={t.key}>
                {/* row = plain View; expand-tap and Open are SIBLING buttons (web: a button inside a button is invalid) */}
                <View style={[st.row, i % 2 === 1 && st.rowAlt, isOpen && st.rowOpen]}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => toggle(t)} style={st.rowMain} accessibilityRole="button">
                    <View style={{ width: EXP_W, alignItems: 'center' }}>
                      <Icon name={isOpen ? 'expand-more' : 'chevron-right'} size={20} color={T.muted} />
                    </View>
                    {COLS.map((c) => (
                      <Text
                        key={c.key}
                        numberOfLines={1}
                        style={[st.cell, { width: c.w }, c.num && st.num, c.key === 'taka_no' && st.takaNo, c.color ? { color: c.color(t) } : null]}
                      >
                        {c.get(t)}
                      </Text>
                    ))}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onOpen(t)} style={st.openBtn} accessibilityRole="button">
                    <Text style={st.openLink}>Open</Text>
                  </TouchableOpacity>
                </View>
                {isOpen ? <Journey t={t} st={cache[t.key]} retry={() => load(t.key)} /> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const J = { step: 34, process: 140, design: 220, shade: 130, qty: 100, date: 100 };

function Journey({ t, st: state, retry }: { t: TakaRow; st?: Cache[string]; retry: () => void }) {
  if (!state || state.loading) {
    return (
      <View style={st.jBox}>
        <ActivityIndicator color={T.copper} />
      </View>
    );
  }
  if (state.error || !state.data) {
    return (
      <View style={st.jBox}>
        <Text style={st.errText}>{state.error}</Text>
        <TouchableOpacity onPress={retry} style={{ marginTop: 6 }}>
          <Text style={st.openLink}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const taka = state.data.taka || t;
  const timeline = [
    { step: 0, process: taka.inward_from, design: taka.design, shade: taka.shade, qty: taka.inward_qty, date: taka.inward_date },
    ...state.data.steps,
  ];
  return (
    <View style={st.jBox}>
      <View style={st.jHead}>
        <Text style={[st.jH, { width: J.step }]}>#</Text>
        <Text style={[st.jH, { width: J.process }]}>Process</Text>
        <Text style={[st.jH, { width: J.design }]}>Design</Text>
        <Text style={[st.jH, { width: J.shade }]}>Shade</Text>
        <Text style={[st.jH, { width: J.qty }, st.num]}>Qty</Text>
        <Text style={[st.jH, { width: J.date }]}>Date</Text>
      </View>
      {timeline.map((s, i) => {
        const prev = timeline[i - 1];
        const changed = !!prev && (prev.shade !== s.shade || prev.design !== s.design) && s.shade !== 'Multiple';
        const color = processColor(s.process);
        return (
          <View key={`${s.step}-${i}`} style={st.jRow}>
            <Text style={[st.jCell, { width: J.step }]}>{i}</Text>
            <View style={{ width: J.process, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[st.dot, { backgroundColor: color }]} />
              <Text style={[st.jCell, { color, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                {s.process}
              </Text>
            </View>
            <Text style={[st.jCell, { width: J.design }]} numberOfLines={1}>{s.design}</Text>
            <Text style={[st.jCell, { width: J.shade }]} numberOfLines={1}>{s.shade || ''}</Text>
            <Text style={[st.jCell, { width: J.qty, fontWeight: '800' }, st.num]}>{fmtQty(s.qty)}</Text>
            <Text style={[st.jCell, { width: J.date }]}>{s.date || ''}</Text>
            {changed ? (
              <View style={st.badge}>
                <Text style={st.badgeText}>Design / shade changed</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginHorizontal: 5 },
  headRow: { flexDirection: 'row', alignItems: 'center', height: 38, backgroundColor: T.alt, borderBottomWidth: 1, borderBottomColor: T.border },
  headCell: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: T.muted, textTransform: 'uppercase', paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40, borderBottomWidth: 1, borderBottomColor: T.hair, backgroundColor: T.surface },
  rowAlt: { backgroundColor: T.sub },
  rowOpen: { backgroundColor: T.alt },
  rowMain: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  openBtn: { width: OPEN_W, minHeight: 40, justifyContent: 'center' },
  cell: { fontSize: 12.5, fontWeight: '600', color: T.ink, paddingHorizontal: 8 },
  takaNo: { fontWeight: '900', color: T.nav },
  num: { textAlign: 'right' },
  openLink: { fontSize: 12.5, fontWeight: '800', color: T.copper, paddingHorizontal: 8 },
  jBox: { paddingLeft: EXP_W, paddingRight: 12, paddingVertical: 8, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  jHead: { flexDirection: 'row', paddingVertical: 4 },
  jH: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: T.muted, textTransform: 'uppercase', paddingHorizontal: 6 },
  jRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.hair },
  jCell: { fontSize: 12.5, fontWeight: '600', color: T.ink, paddingHorizontal: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, marginLeft: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${T.amber}1A`, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: T.amber },
  errText: { fontSize: 12.5, fontWeight: '700', color: T.red },
});
