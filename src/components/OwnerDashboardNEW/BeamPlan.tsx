// FILE: src/components/OwnerDashboardNEW/BeamPlan.tsx
// NEW tab "Beam Plan".
//   GET /api/getbeamplan?prpcode=SIP&yearno=27&mode=BEAM|PRODORDER   (api.ts -> getBeamPlan)
//   summary -> upar ke 5 cards   |   data -> grid (web) / cards (mobile)
//
// Do views:  By beam  |  By production order      (har view ka data pehli baar chunne par load hota hai)
// Filters :  All | Only with unplanned   +   search
// WEB   : grid (MiniTable)         MOBILE : cards, filter/search bar upar chipka rehta hai (sticky)
// Sirf DISPLAY: koi number yahan calculate nahi hota, sab SP se aata hai. Qty kahin round nahi hoti.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { CONTENT_MAX, IconBtn, SearchBox } from '../erpUi';
import { getBeamPlan, type BeamPlanApiRow, type BeamPlanSummaryApi } from './api';
import { FONT, FONT_HEAD } from './fonts';
import { Card, MiniTable, StateBox, type Col } from './OrderTracker';
import { PRP_CODE, stageYearNo } from './prodOrderModel';

type Props = { token: string; API: string; refreshTick?: number; onBusyChange?: (busy: boolean) => void };

type ViewKey = 'beam' | 'po';
type Chip = { label: string; qty: number; flag: boolean };
type Row = {
  key: string;
  title: string; // BeamNo  /  DsnCode
  sub: string; // machines joined (beam view)
  machines: string[]; // every machine this beam ran on
  planned: Chip[];
  made: Chip[];
  plannedQty: number;
  madeQty: number;
  asPlanned: number;
  unplanned: number;
  notMade: number;
  unplannedPct: number;
  hasUnplanned: boolean;
  search: string;
};
type Summary = { planned: number; made: number; asPlanned: number; unplanned: number; notMade: number; asPlannedPct: number; unplannedPct: number };
type Bucket = { summary: Summary; rows: Row[] };

const PAGE = 40;
const CHIP_LIMIT_WEB = 6;
const CHIP_LIMIT_PHONE = 4;

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => String(v ?? '').trim();
/** exact quantity - never rounded (max 3 decimals = what the SP sends) */
const fmtQty = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtPct = (v: number) => `${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

/** 'label|qty|flag, label|qty|flag'  ->  chips   (purana 'label|qty' format bhi chalta hai) */
const parseChips = (raw: string): Chip[] =>
  raw
    ? raw.split(', ').map((part) => {
        const seg = part.split('|');
        if (seg.length < 2) return { label: part.trim(), qty: 0, flag: false };
        if (seg.length === 2) return { label: seg[0].trim(), qty: n(seg[1]), flag: false };
        const flag = seg.pop() === '1';
        const qty = n(seg.pop());
        return { label: seg.join('|').trim(), qty, flag };
      })
    : [];

/** '0' / '' = design code nahi hai -> sirf qty dikhao */
const chipText = (c: Chip) => {
  const l = c.label && c.label !== '0' ? c.label : '';
  return l ? `${l} · ${fmtQty(c.qty)}` : fmtQty(c.qty);
};

const toRow = (r: BeamPlanApiRow, view: ViewKey, i: number): Row => {
  const planned = parseChips(s(r.PlannedFor));
  const made = parseChips(s(r.MadeFor));
  const title = view === 'beam' ? s(r.BeamNo) || s(r.BeamUId) : s(r.DsnCode) || '—';
  const sub = view === 'beam' ? s(r.MachineName) : '';
  const machines = sub ? sub.split(',').map((x) => x.trim()).filter(Boolean) : [];
  return {
    key: `${view}|${view === 'beam' ? s(r.BeamUId) : s(r.DsnCode)}|${i}`,
    title,
    sub,
    machines,
    planned,
    made,
    plannedQty: n(r.PlannedQty),
    madeQty: n(r.MadeQty),
    asPlanned: n(r.AsPlannedQty),
    unplanned: n(r.UnplannedQty),
    notMade: n(r.NotMadeQty),
    unplannedPct: n(r.UnplannedPercent),
    hasUnplanned: n(r.HasUnplannedFlag) > 0 || n(r.UnplannedQty) > 0,
    search: [title, sub, ...planned.map((c) => c.label), ...made.map((c) => c.label)].filter((x) => x && x !== '0').join(' ').toLowerCase(),
  };
};

const toSummary = (x: BeamPlanSummaryApi): Summary => ({
  planned: n(x.TotalPlannedMtr),
  made: n(x.TotalMadeMtr),
  asPlanned: n(x.TotalAsPlannedMtr),
  unplanned: n(x.TotalUnplannedMtr),
  notMade: n(x.TotalNotMadeMtr),
  asPlannedPct: n(x.TotalAsPlannedPercent),
  unplannedPct: n(x.TotalUnplannedPercent),
});

const verdict = (r: Row): { text: string; color: string } =>
  r.madeQty <= 0
    ? { text: r.plannedQty > 0 ? 'Not made yet' : '—', color: T.muted }
    : r.unplanned > 0
      ? { text: `${fmtPct(r.unplannedPct)} unplanned`, color: T.copper }
      : { text: 'As planned', color: T.green };

/* ------------------------------ small parts ------------------------------ */

function PlanBar({ r, h = 8 }: { r: Row; h?: number }) {
  const total = r.asPlanned + r.unplanned + r.notMade;
  return (
    <View style={[st.bar, { height: h, borderRadius: h / 2 }]}>
      {total > 0 && r.asPlanned > 0 ? <View style={{ flex: r.asPlanned, backgroundColor: T.nav }} /> : null}
      {total > 0 && r.unplanned > 0 ? <View style={{ flex: r.unplanned, backgroundColor: T.copper }} /> : null}
      {total > 0 && r.notMade > 0 ? <View style={{ flex: r.notMade, backgroundColor: T.border }} /> : null}
    </View>
  );
}

function Chips({
  chips,
  kind,
  open,
  onToggle,
  limit,
  empty,
}: {
  chips: Chip[];
  kind: 'planned' | 'made';
  open: boolean;
  onToggle: () => void;
  limit: number;
  empty: string;
}) {
  if (chips.length === 0) return <Text style={st.none}>{empty}</Text>;
  const list = open ? chips : chips.slice(0, limit);
  const rest = chips.length - list.length;
  return (
    <View style={st.chips}>
      {list.map((c, i) => {
        const hot = kind === 'made' && c.flag;
        return (
          <View key={`${c.label}|${i}`} style={[st.chip, hot && st.chipHot]}>
            <Text style={[st.chipTx, hot && st.chipTxHot]} numberOfLines={1}>
              {chipText(c)}
            </Text>
          </View>
        );
      })}
      {chips.length > limit ? (
        <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={st.moreChip} accessibilityRole="button">
          <Text style={st.moreChipTx}>{open ? 'Show less' : `+${rest} more`}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** beam jin machines par chali - har machine ka alag chip, kuch kata nahi dikhta */
function Machines({ list, open, onToggle, limit }: { list: string[]; open: boolean; onToggle: () => void; limit: number }) {
  if (list.length === 0) return <Text style={st.none}>—</Text>;
  const shownList = open ? list : list.slice(0, limit);
  const rest = list.length - shownList.length;
  return (
    <View style={st.chips}>
      {shownList.map((m, i) => (
        <View key={`${m}|${i}`} style={st.macChip}>
          <Text style={st.macChipTx}>{m}</Text>
        </View>
      ))}
      {list.length > limit ? (
        <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={st.moreChip} accessibilityRole="button">
          <Text style={st.moreChipTx}>{open ? 'Show less' : `+${rest} more`}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Seg<K extends string>({ options, value, onChange, fill }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; fill?: boolean }) {
  return (
    <View style={[st.seg, fill && { alignSelf: 'stretch' }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            activeOpacity={0.85}
            onPress={() => onChange(o.key)}
            style={[st.segBtn, fill && { flex: 1 }, on && st.segBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[st.segTx, on && st.segTxOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Wrap({ children, sticky }: { children?: React.ReactNode; sticky?: boolean }) {
  return (
    <View style={[st.wrapOuter, sticky && st.wrapSticky]}>
      <View style={st.wrapInner}>{children}</View>
    </View>
  );
}

/* ------------------------------ screen ------------------------------ */

export default function BeamPlan({ token, API, refreshTick = 0, onBusyChange }: Props) {
  const { width: winW } = useWindowDimensions();
  const [w, setW] = useState(0);
  const phone = (w || winW) < 640;

  const [view, setView] = useState<ViewKey>('beam');
  const [onlyUnplanned, setOnlyUnplanned] = useState(false);
  const [query, setQuery] = useState('');
  const [store, setStore] = useState<Partial<Record<ViewKey, Bucket>>>({});
  const [pending, setPending] = useState<Record<ViewKey, boolean>>({ beam: false, po: false });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const seq = useRef<Record<ViewKey, number>>({ beam: 0, po: 0 });
  const lastTick = useRef(-1);

  const load = useCallback(
    async (v: ViewKey, silent = false) => {
      const id = ++seq.current[v];
      setPending((p) => ({ ...p, [v]: true }));
      if (silent) setRefreshing(true);
      setError('');
      try {
        const res = await getBeamPlan(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), mode: v === 'beam' ? 'BEAM' : 'PRODORDER' });
        if (id !== seq.current[v]) return;
        setStore((cur) => ({ ...cur, [v]: { summary: toSummary(res.summary), rows: res.data.map((r, i) => toRow(r, v, i)) } }));
      } catch (e: any) {
        if (id === seq.current[v]) setError(e?.message || 'Unable to load beam plan.');
      } finally {
        if (id === seq.current[v]) {
          setPending((p) => ({ ...p, [v]: false }));
          setRefreshing(false);
        }
      }
    },
    [API, token],
  );

  // tab har baar khulne par (refreshTick) reload; view badalne par us view ka data (agar abhi nahi hai) load
  useEffect(() => {
    if (lastTick.current !== refreshTick) {
      lastTick.current = refreshTick;
      setStore((cur) => ({ [view]: cur[view] }) as Partial<Record<ViewKey, Bucket>>); // dusre view ka purana data hata do
      void load(view, !!store[view]);
      return;
    }
    if (!store[view] && !pending[view]) void load(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick, view]);

  useEffect(() => {
    onBusyChange?.(pending.beam || pending.po);
  }, [pending, onBusyChange]);

  useEffect(() => {
    setShown(PAGE);
  }, [view, onlyUnplanned, query]);

  const cur = store[view];
  const rows = cur?.rows ?? [];
  const loading = pending[view] && !cur;
  const unplannedCount = useMemo(() => rows.filter((r) => r.hasUnplanned).length, [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (onlyUnplanned ? r.hasUnplanned : true) && (q ? r.search.includes(q) : true));
  }, [rows, onlyUnplanned, query]);
  const visible = filtered.slice(0, shown);
  const noun = view === 'beam' ? 'beam' : 'production order';
  const nouns = view === 'beam' ? 'beams' : 'production orders';
  const filterOn = onlyUnplanned || query.trim() !== '';
  const clearFilters = () => {
    setOnlyUnplanned(false);
    setQuery('');
  };
  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));
  const refresh = () => {
    setStore((c) => ({ [view]: c[view] }) as Partial<Record<ViewKey, Bucket>>);
    void load(view, true);
  };

  /* ------------------------------ web columns ------------------------------ */

  const cols = useMemo<Col<Row>[]>(() => {
    const num = (get: (r: Row) => number, strong?: boolean, color?: string): Col<Row>['render'] => (r) => (
      <Text style={[strong ? st.numStrong : st.num, color ? { color } : null]}>{fmtQty(get(r))}</Text>
    );
    const first: Col<Row> =
      view === 'beam'
        ? { key: 'beam', label: 'Beam', flex: 1, render: (r) => r.title }
        : { key: 'po', label: 'Production order', flex: 1.3, render: (r) => r.title };
    return [
      first,
      ...(view === 'beam' ? ([{ key: 'mac', label: 'Machine', flex: 1.3, render: (r: Row) => <Machines list={r.machines} open={!!expanded[`${r.key}|c`]} onToggle={() => toggle(`${r.key}|c`)} limit={3} /> }] as Col<Row>[]) : []),
      {
        key: 'pf',
        label: view === 'beam' ? 'Planned for' : 'Planned on beams',
        flex: 2.3,
        render: (r) => <Chips chips={r.planned} kind="planned" open={!!expanded[`${r.key}|p`]} onToggle={() => toggle(`${r.key}|p`)} limit={CHIP_LIMIT_WEB} empty="nothing planned" />,
      },
      {
        key: 'mf',
        label: view === 'beam' ? 'Actually made for' : 'Made on beams',
        flex: 2.3,
        render: (r) => <Chips chips={r.made} kind="made" open={!!expanded[`${r.key}|m`]} onToggle={() => toggle(`${r.key}|m`)} limit={CHIP_LIMIT_WEB} empty="nothing made" />,
      },
      { key: 'pl', label: 'Planned', flex: 0.9, align: 'right', render: num((r) => r.plannedQty) },
      { key: 'ma', label: 'Made', flex: 0.9, align: 'right', render: num((r) => r.madeQty) },
      { key: 'un', label: 'Unplanned', flex: 0.9, align: 'right', render: (r) => <Text style={[st.numStrong, r.unplanned > 0 && { color: T.copper }]}>{fmtQty(r.unplanned)}</Text> },
      { key: 'nm', label: 'Not made', flex: 0.9, align: 'right', render: num((r) => r.notMade) },
      {
        key: 'bar',
        label: 'Planned vs unplanned',
        flex: 1.7,
        render: (r) => {
          const v = verdict(r);
          return (
            <View style={{ gap: 5, width: '100%' }}>
              <PlanBar r={r} />
              <Text style={[st.verdict, { color: v.color }]} numberOfLines={1}>
                {v.text}
              </Text>
            </View>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, expanded]);

  /* ------------------------------ pieces ------------------------------ */

  const summaryCards = cur
    ? [
        { v: fmtQty(cur.summary.planned), l: 'Planned mtr', c: T.ink },
        { v: fmtQty(cur.summary.made), l: 'Actually made', c: T.ink },
        { v: fmtPct(cur.summary.asPlannedPct), l: `Made as planned (${fmtQty(cur.summary.asPlanned)} mtr)`, c: T.green },
        { v: fmtPct(cur.summary.unplannedPct), l: `Unplanned (${fmtQty(cur.summary.unplanned)} mtr)`, c: T.copper },
        { v: fmtQty(cur.summary.notMade), l: 'Planned but not made', c: T.ink },
      ]
    : [];

  const viewSeg = (
    <Seg<ViewKey>
      options={[
        { key: 'beam', label: 'By beam' },
        { key: 'po', label: 'By production order' },
      ]}
      value={view}
      onChange={setView}
      fill={phone}
    />
  );

  const search = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <SearchBox value={query} onChangeText={setQuery} placeholder={view === 'beam' ? 'Search beam, machine or design…' : 'Search production order or beam…'} />
    </View>
  );

  const card = (r: Row) => {
    const v = verdict(r);
    const kP = `${r.key}|p`;
    const kM = `${r.key}|m`;
    return (
      <View key={r.key} style={[st.pCard, r.hasUnplanned && st.pCardHot]}>
        <View style={st.pTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.pTitle} numberOfLines={1}>
              {r.title}
            </Text>
            {r.machines.length > 0 ? (
              <View style={st.macRow}>
                <Icon name="precision-manufacturing" size={14} color={T.muted} style={{ marginTop: 3 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Machines list={r.machines} open={!!expanded[`${r.key}|c`]} onToggle={() => toggle(`${r.key}|c`)} limit={3} />
                </View>
              </View>
            ) : null}
          </View>
          <View style={[st.verdictPill, { borderColor: `${v.color}55`, backgroundColor: `${v.color}14` }]}>
            <Text style={[st.verdictPillTx, { color: v.color }]} numberOfLines={1}>
              {v.text}
            </Text>
          </View>
        </View>

        <PlanBar r={r} h={9} />

        <View style={st.statRow}>
          <View style={st.stat}>
            <Text style={st.statNum}>{fmtQty(r.plannedQty)}</Text>
            <Text style={st.statLbl}>Planned</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{fmtQty(r.madeQty)}</Text>
            <Text style={st.statLbl}>Made</Text>
          </View>
          <View style={[st.stat, r.unplanned > 0 && st.statHot]}>
            <Text style={[st.statNum, r.unplanned > 0 && { color: T.copper }]}>{fmtQty(r.unplanned)}</Text>
            <Text style={st.statLbl}>Unplanned</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{fmtQty(r.notMade)}</Text>
            <Text style={st.statLbl}>Not made</Text>
          </View>
        </View>

        <View style={st.secBlock}>
          <Text style={st.secLbl}>{view === 'beam' ? 'PLANNED FOR' : 'PLANNED ON BEAMS'}</Text>
          <Chips chips={r.planned} kind="planned" open={!!expanded[kP]} onToggle={() => toggle(kP)} limit={CHIP_LIMIT_PHONE} empty="nothing planned" />
        </View>
        <View style={st.secBlock}>
          <Text style={st.secLbl}>{view === 'beam' ? 'ACTUALLY MADE FOR' : 'MADE ON BEAMS'}</Text>
          <Chips chips={r.made} kind="made" open={!!expanded[kM]} onToggle={() => toggle(kM)} limit={CHIP_LIMIT_PHONE} empty="nothing made" />
        </View>
      </View>
    );
  };

  const moreBtn =
    filtered.length > visible.length ? (
      <TouchableOpacity style={st.moreBtn} activeOpacity={0.8} onPress={() => setShown((x) => x + PAGE)}>
        <Text style={st.moreTx}>Show more ({filtered.length - visible.length} left)</Text>
      </TouchableOpacity>
    ) : null;

  const emptyBox = (
    <View style={st.emptyBox}>
      <Icon name="search-off" size={26} color={T.muted} />
      <Text style={st.emptyTx}>{rows.length === 0 ? `No ${nouns} found.` : `No ${nouns} match your filter.`}</Text>
      {filterOn ? (
        <TouchableOpacity style={st.clearBtn} onPress={clearFilters} activeOpacity={0.8}>
          <Text style={st.clearTx}>Clear filters</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  /* ------------------------------ render ------------------------------ */

  return (
    <View style={st.screen} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={phone ? [1] : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[T.copper]} tintColor={T.copper} />}
      >
        {/* 0 : heading + summary cards */}
        <Wrap>
          <View style={st.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.h1}>Beam plan</Text>
              <Text style={st.h1Sub}>
                Before weaving, each production order is planned on certain beams. If it is made on a different beam, that metre is unplanned.
              </Text>
            </View>
            <IconBtn icon="refresh" label="Refresh" onPress={refresh} loading={pending[view] || refreshing} tone="soft" color={T.copper} />
          </View>

          <StateBox loading={loading} error={error} onRetry={() => void load(view, !!cur)} />

          {cur ? (
            <>
              <View style={st.cards}>
                {summaryCards.map((c) => (
                  <View key={c.l} style={[st.sCard, { flexBasis: phone ? '47%' : 150 }]}>
                    <Text style={[st.sVal, { color: c.c }]} numberOfLines={1}>
                      {c.v}
                    </Text>
                    <Text style={st.sLbl} numberOfLines={2}>
                      {c.l}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={st.legend}>
                <View style={st.lgItem}>
                  <View style={[st.dot, { backgroundColor: T.nav }]} />
                  <Text style={st.lgTx}>As planned</Text>
                </View>
                <View style={st.lgItem}>
                  <View style={[st.dot, { backgroundColor: T.copper }]} />
                  <Text style={st.lgTx}>Unplanned</Text>
                </View>
                <View style={st.lgItem}>
                  <View style={[st.dot, { backgroundColor: T.border }]} />
                  <Text style={st.lgTx}>Planned, not made</Text>
                </View>
              </View>
            </>
          ) : null}
        </Wrap>

        {/* 1 : controls (phone par chipke rehte hain) - hamesha render hota hai taaki sticky index na hile */}
        <Wrap sticky={phone}>
          {phone ? (
            <View style={{ gap: 8 }}>
              {viewSeg}
              <View style={st.row}>
                {search}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setOnlyUnplanned((x) => !x)}
                  style={[st.togBtn, onlyUnplanned && st.togBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: onlyUnplanned }}
                >
                  <Icon name="warning-amber" size={16} color={onlyUnplanned ? '#fff' : T.copper} />
                  <Text style={[st.togTx, onlyUnplanned && { color: '#fff' }]} numberOfLines={1}>
                    Unplanned {unplannedCount}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[st.row, { marginTop: 4 }]}>
              {viewSeg}
              <Seg<'all' | 'un'>
                options={[
                  { key: 'all', label: `All ${rows.length}` },
                  { key: 'un', label: `Only with unplanned ${unplannedCount}` },
                ]}
                value={onlyUnplanned ? 'un' : 'all'}
                onChange={(k) => setOnlyUnplanned(k === 'un')}
              />
              {search}
            </View>
          )}
        </Wrap>

        {/* 2 : list */}
        <Wrap>
          {cur ? (
            phone ? (
              <View style={{ gap: 10 }}>
                <Text style={st.metaLine}>
                  {filterOn
                    ? `${filtered.length} of ${rows.length} ${nouns}${onlyUnplanned ? ' · only with unplanned' : ''}`
                    : `${rows.length} ${rows.length === 1 ? noun : nouns} · most unplanned first`}
                </Text>
                {filtered.length === 0 ? emptyBox : visible.map(card)}
                {moreBtn}
              </View>
            ) : (
              <Card
                title={view === 'beam' ? 'Beams' : 'Production orders'}
                meta={filterOn ? `${filtered.length} of ${rows.length} ${nouns}` : `${rows.length} ${nouns} · most unplanned first`}
              >
                {filtered.length === 0 ? (
                  emptyBox
                ) : (
                  <MiniTable columns={cols} rows={visible} rowKey={(r: Row) => r.key} minWidth={view === 'beam' ? 1240 : 1120} emptyText="Nothing to show." />
                )}
                {moreBtn}
              </Card>
            )
          ) : null}
        </Wrap>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 12, paddingBottom: 32 },
  wrapOuter: { paddingHorizontal: 12 },
  wrapSticky: { backgroundColor: T.bg, paddingVertical: 8, zIndex: 5, borderBottomWidth: 1, borderBottomColor: T.hair },
  wrapInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  h1: { fontFamily: FONT_HEAD, fontSize: 19, fontWeight: '900', color: T.nav },
  h1Sub: { fontFamily: FONT, fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'nowrap' },

  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sCard: { flexGrow: 1, minWidth: 0, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10 },
  sVal: { fontFamily: FONT_HEAD, fontSize: 20, fontWeight: '900' },
  sLbl: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 2 },
  lgItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 2 },
  lgTx: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: T.muted },

  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 3, gap: 3 },
  segBtn: { height: 32, paddingHorizontal: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: T.nav },
  segTx: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.muted },
  segTxOn: { color: '#fff' },

  togBtn: { height: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.copper}66`, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', gap: 5 },
  togBtnOn: { backgroundColor: T.copper, borderColor: T.copper },
  togTx: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: T.copper },

  metaLine: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: T.muted },

  num: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink, textAlign: 'right' },
  numStrong: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.ink, textAlign: 'right' },
  verdict: { fontFamily: FONT, fontSize: 12, fontWeight: '900' },
  none: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted, fontStyle: 'italic' },

  bar: { width: '100%', flexDirection: 'row', overflow: 'hidden', backgroundColor: `${T.border}88` },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  chip: { maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  chipHot: { backgroundColor: `${T.copper}14`, borderColor: T.copper },
  chipTx: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: T.nav },
  chipTxHot: { fontWeight: '900', color: T.copper },
  moreChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  moreChipTx: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.copper },

  pCard: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10 },
  pCardHot: { borderLeftWidth: 4, borderLeftColor: T.copper },
  pTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pTitle: { fontFamily: FONT_HEAD, fontSize: 16, fontWeight: '900', color: T.nav },
  macRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6 },
  macChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${T.nav}0F`, borderWidth: 1, borderColor: `${T.nav}33` },
  macChipTx: { fontFamily: FONT, fontSize: 11.5, fontWeight: '800', color: T.nav },
  verdictPill: { maxWidth: '55%', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  verdictPillTx: { fontFamily: FONT, fontSize: 11.5, fontWeight: '900' },
  statRow: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 6, paddingHorizontal: 7, borderRadius: 9, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  statHot: { backgroundColor: `${T.copper}12`, borderColor: `${T.copper}55` },
  statNum: { fontFamily: FONT, fontSize: 13, fontWeight: '900', color: T.ink },
  statLbl: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: T.muted, marginTop: 1 },
  secBlock: { gap: 5 },
  secLbl: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },

  moreBtn: { alignSelf: 'center', height: 38, paddingHorizontal: 18, borderRadius: 19, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  moreTx: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.copper },

  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16 },
  emptyTx: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'center' },
  clearBtn: { height: 34, paddingHorizontal: 16, borderRadius: 17, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  clearTx: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.copper },
});
