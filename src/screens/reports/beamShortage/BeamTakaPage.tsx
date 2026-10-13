// FILE: src/screens/reports/beamShortage/BeamTakaPage.tsx
// Reports → Beam Shortage → (design › beam | beam › design) → TAKA-WISE CHECKING
//
//   ‹ Rib Stop 145                       (or ‹ Beam B-1041 — back to the page it came from)
//   Beam B-1041 · Rib Stop 145
//   [Takas] [Checked m] [Not graded]
//   GRADE-WISE SUMMARY        TAKAS  METRES  SHARE      (tap a grade -> list only its takas)
//   A  ██████████              80   8,150.0  91.1%
//   B  █                        5     540.0   6.0%
//   Not graded                  3     256.0   2.9%
//   TOTAL                      88   8,946.0   100%
//   [⌕ taka no. / checker / grade]
//   TAKA · DATE · CHECKER              METRES  GRADE
//   T27104  12 Sep 26 · S1 · Ramesh      105.0    A        (tap -> full details of the entry)
//   TOTAL
//
// Read-only. Data: BeamShortageService.takas -> POST /reports/beam_shortage/takas

import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BeamShortageService } from './beamShortageApi';
import { BeamLine } from './beamShortageModel';
import {
  EMPTY_TAKAS,
  filterTakas,
  GradeGroup,
  gradeSummary,
  NO_GRADE,
  normalizeTakas,
  TakaData,
  TakaEntry,
  TakaFilter,
} from './beamTakaModel';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const W = { mtr: 64, grade: 46 };
const G = { takas: 44, mtr: 72, share: 52 }; // grade-wise summary columns
const m1 = (v: number) => (Math.round((v || 0) * 10) / 10).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtD = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}` : '—';
};

type Props = {
  line: BeamLine;
  backLabel: string;
  onBack: () => void;
  prptype: string;
  prpcode: string;
};

export default function BeamTakaPage({ line, backLabel, onBack, prptype, prpcode }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const narrow = width < 420;

  const [data, setData] = useState<TakaData>(EMPTY_TAKAS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TakaFilter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (pull = false) => {
    const id = ++reqId.current;
    if (pull) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const body = {
        prptype,
        prpcode,
        yearno: line.yearNo,
        beamuid: line.beamUId,
        dsncode: line.dsnCode, // '' = the "Design not linked" line
      };
      const response: any = await BeamShortageService.takas(body, line.produced);
      if (id !== reqId.current) return;
      const b = response?.data;
      if (b && typeof b === 'object' && !Array.isArray(b) && (b.success === false || b.status === false)) {
        throw new Error(b.message || 'Unable to load taka entries.');
      }
      setData(normalizeTakas(response));
    } catch (err: any) {
      if (id !== reqId.current) return;
      setData(EMPTY_TAKAS);
      setError(err?.response?.data?.message || err?.message || 'Unable to load taka entries.');
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [prptype, prpcode, line.yearNo, line.beamUId, line.dsnCode, line.produced]);

  useEffect(() => { void load(); }, [load]);

  const grades = useMemo(() => gradeSummary(data.takas), [data]);
  const shown = useMemo(() => filterTakas(data.takas, filter, q), [data, filter, q]);
  const picked = grades.find((g) => g.key === filter);
  const shownQty = useMemo(() => shown.reduce((a, t) => a + t.qty, 0), [shown]);
  const S = data.summary;
  const diff = Math.round((S.qty - line.produced) * 100) / 100;
  const tableMin = narrow ? 380 : undefined;

  const head = [line.machine, line.gaitDate ? `gaited ${fmtD(line.gaitDate)}` : '', line.doneDate ? `last piece ${fmtD(line.doneDate)}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={st.page}
      contentContainerStyle={[st.body, wide && st.bodyWide]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.copper} colors={[T.copper]} />}
    >
      <View>
        <TouchableOpacity onPress={onBack} hitSlop={HIT}><Text style={st.back}>‹ {backLabel}</Text></TouchableOpacity>
        <Text style={st.title}>Beam {line.beamNo} · {line.dsnName}</Text>
        <Text style={st.sub}>
          {head ? `${head} — ` : ''}taka-wise checking entries. Tap a taka for its full details.
        </Text>
      </View>

      <View style={st.stats}>
        <Stat label="Takas" value={String(S.takas)} />
        <Stat label="Checked" value={`${m1(S.qty)} m`} />
        <Stat label="Not graded" value={String(S.notGraded)} color={S.notGraded > 0 ? T.amber : T.green} />
      </View>

      {!loading && !error && S.takas > 0 && (
        <Text style={[st.note, Math.abs(diff) >= 0.05 && { color: T.red, fontWeight: '700' }]}>
          {Math.abs(diff) < 0.05
            ? `Checked metres match the ${m1(line.produced)} m produced on this beam line.`
            : `Checked metres differ from the ${m1(line.produced)} m produced on this line by ${m1(diff)} m — the report may have been loaded before newer entries.`}
        </Text>
      )}

      {!loading && !error && grades.length > 0 && (
        <GradeSummary
          grades={grades}
          totalTakas={S.takas}
          totalQty={S.qty}
          selected={filter}
          onPick={(key) => setFilter((f) => (f === key ? 'all' : key))}
        />
      )}

      <View style={st.filters}>
        <View style={st.search}>
          <Text style={st.searchIcon}>⌕</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="taka no. / checker / grade"
            placeholderTextColor={T.muted}
            autoCorrect={false}
            autoCapitalize="none"
            style={[st.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
        </View>
      </View>

      {picked && (
        <View style={st.scopeRow}>
          <Text style={st.scope}>
            Showing <Text style={st.scopeBold}>{picked.key === NO_GRADE ? 'not graded' : `grade ${picked.label}`}</Text> takas only
          </Text>
          <TouchableOpacity onPress={() => setFilter('all')} hitSlop={HIT}><Text style={st.link}>show all</Text></TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator color={T.copper} size="small" />}
      {!!error && (
        <TouchableOpacity onPress={() => load()} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      <HScroll on={!!tableMin}>
        <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
          <View style={[st.row, { paddingVertical: 8 }]}>
            <Text style={[st.first, st.head]}>TAKA · DATE · CHECKER</Text>
            <Text style={[st.num, st.head, { width: W.mtr }]}>METRES</Text>
            <Text style={[st.num, st.head, { width: W.grade }]}>GRADE</Text>
          </View>
          {!loading && !error && shown.length === 0 && (
            <Text style={st.emptyRow}>
              {S.takas === 0 ? 'No checking entries found for this beam and design.' : 'No taka matches this filter.'}
            </Text>
          )}
          {shown.map((t) => (
            <TakaRow key={t.key} t={t} open={open === t.key} onPress={() => setOpen((o) => (o === t.key ? null : t.key))} />
          ))}
          {shown.length > 0 && (
            <View style={[st.row, st.totalRow]}>
              <Text style={[st.first, st.totalLabel]}>TOTAL · {shown.length} taka{shown.length !== 1 ? 's' : ''}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.mtr }]}>{m1(shownQty)}</Text>
              <Text style={[st.num, { width: W.grade }]} />
            </View>
          )}
        </View>
      </HScroll>

      <Text style={st.footer}>
        Grade-wise share is of the checked metres. NOT GRADED = the checking entry has no grade (GRADE column blank). Samples and mending takas are tagged and counted in the metres,
        same as the shortage report.
      </Text>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

function TakaRow({ t, open, onPress }: { t: TakaEntry; open: boolean; onPress: () => void }) {
  const meta = [fmtD(t.chkDate), t.shift ? `S${t.shift}` : '', t.chkName || (t.chkCode ? `#${t.chkCode}` : '')].filter(Boolean).join(' · ');
  return (
    <View style={st.line}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        <View style={st.row}>
          <View style={st.first}>
            <Text style={[st.mono, st.takaNo]} numberOfLines={1}>{t.takaNo || '—'} {open ? '▾' : '›'}</Text>
            <Text style={st.meta} numberOfLines={1}>{meta}</Text>
            <Tags t={t} />
          </View>
          <Text style={[st.num, st.mono, { width: W.mtr }]}>{m1(t.qty)}</Text>
          <Text style={[st.num, st.bold, { width: W.grade }]} numberOfLines={1}>{t.graded ? t.grdName || t.grdCode : '—'}</Text>
        </View>
      </TouchableOpacity>
      {open && <TakaDetail t={t} />}
    </View>
  );
}

function Tags({ t }: { t: TakaEntry }) {
  const tags: [string, string, string][] = [];
  if (!t.graded) tags.push(['NOT GRADED', '#8a5a00', '#FCF1DC']);
  if (t.isMending) tags.push(['MENDING', T.purple, '#F1E8F5']);
  if (t.isSample) tags.push(['SAMPLE', T.blue, '#E6ECF5']);
  if (t.isLastTaka) tags.push(['LAST TAKA', T.yd, '#E3EEF5']);
  if (!tags.length) return null;
  return (
    <View style={st.tags}>
      {tags.map(([l, c, bg]) => <Text key={l} style={[st.tag, { color: c, backgroundColor: bg }]}>{l}</Text>)}
    </View>
  );
}

function TakaDetail({ t }: { t: TakaEntry }) {
  const facts: [string, string][] = [
    ['Checking date', fmtD(t.chkDate)],
    ['Shift', t.shift || '—'],
    ['Checker', [t.chkName, t.chkCode ? `#${t.chkCode}` : ''].filter(Boolean).join(' ') || '—'],
    ['Metres', m1(t.qty)],
    ['Weight', t.wt ? `${t.wt} kg` : '—'],
    ['Avg wt / 100 m', t.avgWt ? String(t.avgWt) : '—'],
    ['Grade', t.graded ? [t.grdName, `(${t.grdCode})`].filter(Boolean).join(' ') : '—'],
    ['Weaver', t.wvrName || '—'],
    ['Supervisor', t.supName || '—'],
    ['Operator', t.oprName || '—'],
    ['Machine', t.machine || '—'],
    ['Entered on', [fmtD(t.entryDate), t.entryTime].filter((x) => x && x !== '—').join(' ') || '—'],
    ['Prod. order', t.orderNo || '—'],
    ['Track id', t.trackId || '—'],
    ['Remarks', [t.remarks, t.remarkC, t.remarkD].filter(Boolean).join(' · ') || '—'],
  ];
  return (
    <View style={st.detail}>
      <View style={st.facts}>
        {facts.map(([k, v]) => (
          <View key={k} style={st.fact}>
            <Text style={st.factK}>{k}</Text>
            <Text style={st.factV}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Grade-wise summary of the beam × design: takas · metres · share of metres. Tap a grade to filter the list. */
function GradeSummary({
  grades, totalTakas, totalQty, selected, onPick,
}: {
  grades: GradeGroup[];
  totalTakas: number;
  totalQty: number;
  selected: string;
  onPick: (key: string) => void;
}) {
  return (
    <View style={[st.card, { paddingVertical: 4 }]}>
      <View style={[st.row, { paddingVertical: 8 }]}>
        <Text style={[st.first, st.head]}>GRADE-WISE SUMMARY</Text>
        <Text style={[st.num, st.head, { width: G.takas }]}>TAKAS</Text>
        <Text style={[st.num, st.head, { width: G.mtr }]}>METRES</Text>
        <Text style={[st.num, st.head, { width: G.share }]}>SHARE</Text>
      </View>
      {grades.map((g) => {
        const on = selected === g.key;
        const none = g.key === NO_GRADE;
        const tone = none ? T.amber : T.copper;
        return (
          <TouchableOpacity
            key={g.key}
            onPress={() => onPick(g.key)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${g.label}: ${g.takas} takas, ${m1(g.qty)} metres`}
          >
            <View style={[st.row, st.gradeLine, on && st.gradeLineOn]}>
              <View style={st.first}>
                <Text style={[st.gradeName, { color: none ? T.amber : T.ink }]} numberOfLines={1}>
                  {none ? 'Not graded' : `Grade ${g.label}`}{on ? '  ✓' : ''}
                </Text>
                <View style={st.barTrack}>
                  <View style={[st.barFill, { width: `${Math.max(g.share, 1.5)}%`, backgroundColor: tone }]} />
                </View>
              </View>
              <Text style={[st.num, st.mono, { width: G.takas }]}>{g.takas}</Text>
              <Text style={[st.num, st.mono, { width: G.mtr }]}>{m1(g.qty)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: G.share, color: tone }]}>{g.share.toFixed(1)}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={[st.row, st.totalRow]}>
        <Text style={[st.first, st.totalLabel]}>TOTAL · {grades.filter((g) => g.key !== NO_GRADE).length} grade{grades.filter((g) => g.key !== NO_GRADE).length !== 1 ? 's' : ''}</Text>
        <Text style={[st.num, st.mono, st.bold, { width: G.takas }]}>{totalTakas}</Text>
        <Text style={[st.num, st.mono, st.bold, { width: G.mtr }]}>{m1(totalQty)}</Text>
        <Text style={[st.num, st.mono, st.bold, { width: G.share }]}>100%</Text>
      </View>
      <Text style={st.gradeHint}>Tap a grade to list only its takas; tap again to show all.</Text>
    </View>
  );
}

function Stat({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statValue, st.mono, !!color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.statLabel}>{l}</Text>
    </View>
  );
}

function HScroll({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {children}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  body: { padding: 12, paddingBottom: 40, gap: 10 },
  bodyWide: { maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16 },
  mono: { fontFamily: MONO },
  bold: { fontWeight: '800' },

  back: { color: T.copper, fontWeight: '800', fontSize: 12.5 },
  title: { fontSize: 19, fontWeight: '800', color: T.ink, marginTop: 4 },
  sub: { fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 16 },
  note: { fontSize: 10, color: T.muted, lineHeight: 14 },

  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: T.ink },
  statLabel: { fontSize: 7.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  filters: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  scope: { fontSize: 10.5, color: T.muted },
  scopeBold: { color: T.ink, fontWeight: '800' },
  link: { fontSize: 9.5, fontWeight: '800', color: T.copper },

  gradeLine: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.alt, borderLeftWidth: 3, borderLeftColor: 'transparent', paddingLeft: 10 },
  gradeLineOn: { backgroundColor: '#F8EFE6', borderLeftColor: T.copper },
  gradeName: { fontSize: 11.5, fontWeight: '800' },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: T.alt, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  gradeHint: { fontSize: 9, color: T.muted, paddingHorizontal: 13, paddingTop: 6, paddingBottom: 4 },
  search: {
    flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8,
  },
  searchIcon: { color: T.muted, fontSize: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 11, paddingVertical: 6, color: T.ink },

  errorBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 9 },
  errorText: { color: T.red, fontSize: 11.5, fontWeight: '700' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 13 },
  line: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.alt },
  totalRow: { borderTopWidth: 2, borderTopColor: T.border, backgroundColor: T.sub, paddingVertical: 10 },
  totalLabel: { fontSize: 11, fontWeight: '800', color: T.ink },
  head: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  first: { flex: 1, minWidth: 0 },
  num: { textAlign: 'right', fontSize: 11, color: T.ink },
  takaNo: { fontSize: 11.5, fontWeight: '800', color: T.copper },
  meta: { fontSize: 9.5, color: T.muted, marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  tag: { fontSize: 8, fontWeight: '900', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  emptyRow: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },

  detail: { marginTop: 8, marginHorizontal: 13, padding: 10, backgroundColor: T.sub, borderRadius: 9, gap: 8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  fact: { width: '50%', paddingRight: 8 },
  factK: { fontSize: 8, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  factV: { fontSize: 10.5, color: T.ink, marginTop: 1 },

  footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
});
