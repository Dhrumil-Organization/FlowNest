// FILE: src/features/support/components/TeamView.tsx
// TEAM — the IT Desk as a tool to manage the internal IT team, person-wise.
//   • any period (Day · Month · Year · Range · All) — the same bar as History
//   • team totals: members, cards, done, actual / estimated hours, time vs estimate, on time, overdue now
//   • one row per person: cards, done %, open now, overdue now, est / actual hours, time vs estimate,
//     on-time %, active days, hours per day and a small day-by-day chart — sortable
//   • tap a person: his numbers, hours per day chart, his open work right now, his History / Excel
//   • Team Excel: Team summary + Timesheet (person × day) + Work by person
// The IT admin sees everybody; a member sees only his own report. Live: refreshes quietly.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SupportCall } from '../api';
import { useItDesk } from '../itStore';
import {
  fmtMinutes, fmtYmd, MONTHS_FULL, onTimeColor, periodLabel, STATUSES, statusOf, TeamBucket, TeamPerson, TeamReport, Ticket, toYmd, tveColor, ymdToDate,
} from '../model';
import { PeriodBar } from './PeriodBar';
import { Avatar, Btn, Empty, Panel, Segmented, StatusPill, useLayout } from './ui';

type Sort = 'spent' | 'done' | 'open' | 'overdue' | 'name';

type Props = {
  api: SupportCall;
  onExport: () => void;
  exporting?: boolean;
  onPersonExcel: (p: TeamPerson) => void;
  onPersonHistory: (p: TeamPerson) => void;
  onOpenCard: (t: Ticket) => void;
  /** a ticket is open on top (the person panel steps aside and comes back after) */
  cardOpen?: boolean;
};

const h = (m: number) => fmtMinutes(m) || '0h';
const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

export function TeamView({ api, onExport, exporting, onPersonExcel, onPersonHistory, onOpenCard, cardOpen }: Props) {
  const { phone, wide } = useLayout();
  const team = useItDesk((s) => s.team);
  const loading = useItDesk((s) => s.teamLoading);
  const error = useItDesk((s) => s.teamError);
  const period = useItDesk((s) => s.period);
  const setPeriod = useItDesk((s) => s.setPeriod);
  const loadTeam = useItDesk((s) => s.loadTeam);
  const [sort, setSort] = useState<Sort>('spent');
  const [openId, setOpenId] = useState<number | null>(null);
  const [resume, setResume] = useState<number | null>(null);
  // iOS cannot show two pop-ups at once: the person panel closes while a ticket is open, then returns
  useEffect(() => { if (!cardOpen && resume !== null) { setOpenId(resume); setResume(null); } }, [cardOpen, resume]);

  const people = useMemo(() => {
    const list = [...(team?.people || [])];
    const by: Record<Sort, (a: TeamPerson, b: TeamPerson) => number> = {
      spent: (a, b) => b.spent_min - a.spent_min || b.done - a.done,
      done: (a, b) => b.done - a.done || b.spent_min - a.spent_min,
      open: (a, b) => b.open_now - a.open_now,
      overdue: (a, b) => b.overdue_now - a.overdue_now || b.open_now - a.open_now,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort((a, b) => (a.id === 0 ? 1 : b.id === 0 ? -1 : by[sort](a, b)));
  }, [team, sort]);

  const keys = useMemo(() => allKeys(team), [team]);
  const person = openId !== null ? team?.people.find((p) => p.id === openId) || null : null;
  const t = team?.totals;
  const mine = team?.scope === 'me';

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 10 }} keyboardShouldPersistTaps="handled">
        <PeriodBar period={period} onChange={setPeriod} allLabel="All dates"
          right={<Btn small kind="success" title={phone ? 'Excel' : mine ? 'My Excel' : 'Team Excel'} icon="file-download" onPress={onExport} busy={exporting} />} />

        {mine ? <Text style={s.note}><Icon name="lock-outline" size={13} color={T.muted} /> Your own work report — the IT admin sees the whole team here.</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {!mine ? <Stat icon="groups" color={T.nav} label="Members" value={t ? t.members : '…'} /> : null}
          <Stat icon="layers" color={T.nav} label="Cards" value={t ? t.cards : '…'} />
          <Stat icon="task-alt" color={T.green} label="Done" value={t ? t.done : '…'} sub={t && t.cards ? `${Math.round((t.done * 100) / t.cards)}%` : undefined} />
          <Stat icon="schedule" color={T.purple} label="Actual hours" value={t ? h(t.spent_min) : '…'} />
          <Stat icon="timer" color={T.blue} label="Estimated" value={t ? h(t.est_min) : '…'} />
          <Stat icon="speed" color={tveColor(t ? t.time_vs_est : null)} label="Time vs estimate" value={t ? pct(t.time_vs_est) : '…'} />
          <Stat icon="event-available" color={onTimeColor(t ? t.on_time : null)} label="On time" value={t ? pct(t.on_time) : '…'} />
          <Stat icon="alarm" color={t && t.overdue_now ? T.red : T.muted} label="Overdue now" value={t ? t.overdue_now : '…'} />
        </ScrollView>

        {!mine ? (
          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Sort</Text>
            <Segmented value={sort} onChange={setSort} scroll options={[
              { value: 'spent', label: 'Hours' }, { value: 'done', label: 'Done' }, { value: 'open', label: 'Open now' }, { value: 'overdue', label: 'Overdue' }, { value: 'name', label: 'Name' },
            ]} />
          </View>
        ) : null}

        {error && !team ? <Empty icon="error-outline" title="Could not load" text={error} action={<Btn small kind="ghost" title="Retry" onPress={() => loadTeam()} />} /> : null}
        {!team && loading ? <ActivityIndicator color={T.copper} style={{ marginTop: 30 }} /> : null}

        {team && !phone ? (
          <View style={s.table}>
            <View style={[s.tr, s.th]}>
              <Text style={[s.thText, { flex: 2.2 }]}>Person</Text>
              <Text style={[s.thText, s.num]}>Cards</Text>
              <Text style={[s.thText, { width: 120 }]}>Done</Text>
              <Text style={[s.thText, s.num]}>Open now</Text>
              <Text style={[s.thText, s.num]}>Overdue</Text>
              <Text style={[s.thText, s.numW]}>Est / Actual</Text>
              <Text style={[s.thText, s.num]}>Time vs est</Text>
              <Text style={[s.thText, s.num]}>On time</Text>
              {wide ? <Text style={[s.thText, s.num]}>Days</Text> : null}
              {wide ? <Text style={[s.thText, s.num]}>Avg / day</Text> : null}
              {wide ? <Text style={[s.thText, { width: 150 }]}>Hours by {team.grain === 'day' ? 'day' : 'month'}</Text> : null}
            </View>
            {people.map((p) => (
              <Pressable key={p.id} onPress={() => setOpenId(p.id)} style={({ pressed, hovered }: any) => [s.tr, (pressed || hovered) && { backgroundColor: T.sub }]} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`}>
                <View style={[s.who, { flex: 2.2 }]}>
                  <Avatar name={p.name} id={p.id} color={p.color} size={30} />
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{p.name}{p.active ? '' : ' · off'}</Text>
                    <Text style={s.sub} numberOfLines={1}>{p.role === 'admin' ? 'IT admin' : p.role === 'none' ? 'not assigned to anybody' : `@${p.username}`} · {p.tasks} task{p.tasks === 1 ? '' : 's'} · {p.tickets} ticket{p.tickets === 1 ? '' : 's'}</Text>
                  </View>
                </View>
                <Text style={[s.cell, s.num]}>{p.cards}</Text>
                <View style={{ width: 120, gap: 3 }}>
                  <Text style={s.cellSm}>{p.done} / {p.cards}{p.cards ? ` · ${Math.round((p.done * 100) / p.cards)}%` : ''}</Text>
                  <Split p={p} />
                </View>
                <Text style={[s.cell, s.num]}>{p.open_now}</Text>
                <Text style={[s.cell, s.num, p.overdue_now ? { color: T.red } : { color: T.muted }]}>{p.overdue_now || '—'}</Text>
                <Text style={[s.cellSm, s.numW]}>{h(p.est_min)} / <Text style={{ fontWeight: '900', color: T.ink }}>{h(p.spent_min)}</Text></Text>
                <View style={s.num}><Badge v={p.time_vs_est} color={tveColor(p.time_vs_est)} /></View>
                <View style={s.num}><Badge v={p.on_time} color={onTimeColor(p.on_time)} /></View>
                {wide ? <Text style={[s.cell, s.num]}>{p.active_days}</Text> : null}
                {wide ? <Text style={[s.cellSm, s.num]}>{p.active_days ? h(p.avg_day_min) : '—'}</Text> : null}
                {wide ? <View style={{ width: 150 }}><MiniBars keys={keys} buckets={p.buckets} /></View> : null}
              </Pressable>
            ))}
            {!people.length ? <Empty icon="groups" title="No team members yet" text="The IT admin adds members from the Team panel (people icon in the top bar)." /> : null}
          </View>
        ) : null}

        {team && phone ? people.map((p) => (
          <Pressable key={p.id} onPress={() => setOpenId(p.id)} style={({ pressed }) => [s.card, pressed && { backgroundColor: T.sub }]}>
            <View style={s.who}>
              <Avatar name={p.name} id={p.id} color={p.color} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                <Text style={s.sub} numberOfLines={1}>{p.cards} cards · {p.done} done · {p.open_now} open now</Text>
              </View>
              {p.overdue_now ? <View style={s.over}><Text style={s.overText}>{p.overdue_now} overdue</Text></View> : null}
            </View>
            <Split p={p} />
            <View style={s.kpis}>
              <Kpi label="Actual" value={h(p.spent_min)} />
              <Kpi label="Est" value={h(p.est_min)} />
              <Kpi label="Time vs est" value={pct(p.time_vs_est)} color={tveColor(p.time_vs_est)} />
              <Kpi label="On time" value={pct(p.on_time)} color={onTimeColor(p.on_time)} />
            </View>
            <MiniBars keys={keys} buckets={p.buckets} />
          </Pressable>
        )) : null}

        {team ? (
          <Text style={s.legend}>
            Time vs estimate = actual ÷ estimated hours of done cards (100% = as planned). On time = done cards with a due date finished by that date.
            Open now / Overdue now are for today, whatever the period. Cards are counted by their work date in {periodLabel(period)}.
          </Text>
        ) : null}
      </ScrollView>

      <Panel visible={!!person} onClose={() => setOpenId(null)} title={person?.name || ''} subtitle={person ? `${periodLabel(period)} · ${person.role === 'admin' ? 'IT admin' : person.role === 'none' ? 'not assigned' : 'IT team member'}` : ''} width={600}>
        {person && team ? (
          <PersonDetail api={api} p={person} team={team} onOpenCard={(c) => { setResume(person.id); setOpenId(null); onOpenCard(c); }}
            onExcel={() => onPersonExcel(person)} onHistory={() => { setOpenId(null); onPersonHistory(person); }} />
        ) : null}
      </Panel>
    </View>
  );
}

/* ----------------------------- person detail ----------------------------- */

function PersonDetail({ api, p, team, onOpenCard, onExcel, onHistory }: { api: SupportCall; p: TeamPerson; team: TeamReport; onOpenCard: (t: Ticket) => void; onExcel: () => void; onHistory: () => void }) {
  const [open, setOpen] = useState<Ticket[] | null>(null);
  const keys = useMemo(() => allKeys(team), [team]);
  useEffect(() => {
    let alive = true;
    setOpen(null);
    api<{ items: Ticket[] }>('tickets.list', p.id ? { assignee: String(p.id), open: '1', sort: 'rev', limit: 40 } : { assignee: 'none', open: '1', sort: 'rev', limit: 40 })
      .then((r) => { if (alive) setOpen(r.items); })
      .catch(() => { if (alive) setOpen([]); });
    return () => { alive = false; };
  }, [api, p.id, p.open_now]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={s.grid}>
        <Tile label="Cards" value={p.cards} sub={`${p.tasks} task${p.tasks === 1 ? '' : 's'} · ${p.tickets} user ticket${p.tickets === 1 ? '' : 's'}`} />
        <Tile label="Done" value={p.done} sub={p.cards ? `${Math.round((p.done * 100) / p.cards)}% of the period` : undefined} color={T.green} />
        <Tile label="Actual hours" value={h(p.spent_min)} sub={`estimated ${h(p.est_min)}`} color={T.purple} />
        <Tile label="Time vs estimate" value={pct(p.time_vs_est)} sub={p.time_vs_est === null ? 'no done card with both times' : p.time_vs_est <= 100 ? 'within the estimate' : `${p.time_vs_est - 100}% over the estimate`} color={tveColor(p.time_vs_est)} />
        <Tile label="On time" value={pct(p.on_time)} sub={p.due_done ? `of ${p.due_done} done cards with a due date` : 'no done card with a due date'} color={onTimeColor(p.on_time)} />
        <Tile label="Active days" value={p.active_days} sub={p.active_days ? `${h(p.avg_day_min)} a day on average` : undefined} />
        <Tile label="Open now" value={p.open_now} sub={`${p.in_progress_now} in progress${p.oldest_open ? ` · oldest from ${fmtYmd(p.oldest_open)}` : ''}`} color={T.amber} />
        <Tile label="Overdue now" value={p.overdue_now} color={p.overdue_now ? T.red : T.muted} />
        {p.tickets_done ? <Tile label="User tickets resolved" value={p.tickets_done} sub={p.ticket_min !== null ? `${h(p.ticket_min)} on average from raised to resolved` : undefined} color={T.copper} /> : null}
      </View>

      <View>
        <Text style={s.section}>Status of the period's cards</Text>
        <Split p={p} big />
        <View style={s.legendRow}>
          {STATUSES.map((st) => <Text key={st.key} style={[s.legendItem, { color: st.color }]}>● {st.label} {p[st.key]}</Text>)}
        </View>
      </View>

      <View>
        <Text style={s.section}>Actual hours by {team.grain === 'day' ? 'day' : 'month'}</Text>
        <HourBars keys={keys} buckets={p.buckets} grain={team.grain} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn small kind="ghost" title="All work in History" icon="history" onPress={onHistory} />
        <Btn small kind="success" title="Excel of this person" icon="file-download" onPress={onExcel} />
      </View>

      <View>
        <Text style={s.section}>Open work right now {open ? `(${open.length}${open.length === 40 ? '+' : ''})` : ''}</Text>
        {open === null ? <ActivityIndicator color={T.copper} style={{ marginVertical: 12 }} /> : null}
        {open && !open.length ? <Text style={s.sub}>Nothing open — all clear.</Text> : null}
        {open?.map((t) => (
          <Pressable key={t.id} onPress={() => onOpenCard(t)} style={({ pressed }) => [s.openRow, { borderLeftColor: statusOf(t.status).color }, pressed && { backgroundColor: T.sub }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.openTitle} numberOfLines={1}>{t.no} · {t.title}</Text>
              <Text style={s.sub} numberOfLines={1}>{[t.module_label, t.kind === 'ticket' ? t.client?.name : '', t.due_date ? `due ${fmtYmd(t.due_date)}` : ''].filter(Boolean).join(' · ')}</Text>
            </View>
            <StatusPill status={t.status} small />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/* --------------------------------- bits --------------------------------- */

/** every day (or month) of the report, oldest first — days without work included */
function allKeys(team: TeamReport | null): number[] {
  if (!team) return [];
  if (team.grain === 'day' && team.from && team.to) {
    const out: number[] = [];
    const d = ymdToDate(team.from)!;
    const end = Math.min(team.to, toYmd(new Date()));
    while (toYmd(d) <= end && out.length < 62) { out.push(toYmd(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  return [...team.keys].sort((a, b) => a - b);
}

function Split({ p, big }: { p: TeamPerson; big?: boolean }) {
  const total = p.cards || 1;
  return (
    <View style={[s.split, big && { height: 12, borderRadius: 6 }]}>
      {p.cards ? STATUSES.map((st) => (p[st.key] ? <View key={st.key} style={{ flex: p[st.key] / total, backgroundColor: st.color }} /> : null)) : <View style={{ flex: 1, backgroundColor: T.border }} />}
    </View>
  );
}

function MiniBars({ keys, buckets }: { keys: number[]; buckets: TeamBucket[] }) {
  const map: Record<number, number> = {};
  buckets.forEach((b) => { map[b.key] = b.spent_min; });
  const shown = keys.slice(-31);
  const max = Math.max(60, ...shown.map((k) => map[k] || 0));
  return (
    <View style={s.mini}>
      {shown.map((k) => <View key={k} style={[s.miniBar, { height: `${Math.max(map[k] ? 8 : 3, ((map[k] || 0) / max) * 100)}%` as any, backgroundColor: map[k] ? T.purple : T.border }]} />)}
    </View>
  );
}

function HourBars({ keys, buckets, grain }: { keys: number[]; buckets: TeamBucket[]; grain: 'day' | 'month' }) {
  const [sel, setSel] = useState<number | null>(null);
  const map: Record<number, TeamBucket> = {};
  buckets.forEach((b) => { map[b.key] = b; });
  const max = Math.max(60, ...keys.map((k) => map[k]?.spent_min || 0));
  const label = (k: number) => {
    if (grain === 'month') return MONTHS_FULL[(k % 100) - 1]?.slice(0, 3) || '';
    return String(k % 100);
  };
  const cur = sel !== null ? map[sel] : null;
  const every = keys.length > 20 ? 5 : 1;
  if (!keys.length) return <Text style={s.sub}>No work in this period.</Text>;
  return (
    <View>
      <Text style={s.barInfo}>
        {sel !== null
          ? `${grain === 'day' ? fmtYmd(sel) : `${MONTHS_FULL[(sel % 100) - 1]} ${Math.floor(sel / 100)}`}: ${cur ? `${h(cur.spent_min)} actual · ${h(cur.est_min)} est · ${cur.n} cards · ${cur.done} done` : 'no work'}`
          : 'Tap a bar for the details'}
      </Text>
      <View style={s.bars}>
        {keys.map((k, i) => {
          const b = map[k];
          const v = b?.spent_min || 0;
          const on = sel === k;
          return (
            <TouchableOpacity key={k} style={s.barCol} onPress={() => setSel(on ? null : k)} accessibilityRole="button" accessibilityLabel={`${label(k)}: ${h(v)}`}>
              <View style={s.barTrack}>
                <View style={[s.bar, { height: `${Math.max(v ? 4 : 1.5, (v / max) * 100)}%` as any, backgroundColor: on ? T.copper : v ? T.purple : T.border }]} />
              </View>
              <Text style={[s.barLabel, on && { color: T.copper }]} numberOfLines={1}>{i % every === 0 || on ? label(k) : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.barScale}>top of the scale = {h(max)}</Text>
    </View>
  );
}

function Stat({ icon, color, label, value, sub }: { icon: string; color: string; label: string; value: string | number; sub?: string }) {
  return (
    <View style={s.stat}>
      <Icon name={icon as any} size={16} color={color} />
      <View>
        <Text style={[s.statNum, { color }]}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{sub ? <Text style={s.statSub}>  {sub}</Text> : null}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Tile({ label, value, sub, color = T.nav }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={[s.tileNum, { color }]}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
      {sub ? <Text style={s.tileSub} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

function Kpi({ label, value, color = T.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[s.kpiNum, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={s.kpiLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Badge({ v, color }: { v: number | null; color: string }) {
  if (v === null) return <Text style={[s.cellSm, { color: T.muted }]}>—</Text>;
  return <Text style={[s.badge, { color, backgroundColor: `${color}16` }]}>{v}%</Text>;
}

const s = StyleSheet.create({
  note: { fontSize: 12, fontWeight: '700', color: T.muted },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, minWidth: 112 },
  statNum: { fontSize: 16, fontWeight: '900' },
  statSub: { fontSize: 11, fontWeight: '800', color: T.muted },
  statLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sortLabel: { fontSize: 11, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  table: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  th: { backgroundColor: T.alt, paddingVertical: 8 },
  thText: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  num: { width: 76, textAlign: 'right', alignItems: 'flex-end' },
  numW: { width: 120, textAlign: 'right' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  name: { fontSize: 13.5, fontWeight: '900', color: T.ink },
  sub: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  cell: { fontSize: 13, fontWeight: '800', color: T.ink },
  cellSm: { fontSize: 12, fontWeight: '700', color: T.muted },
  badge: { fontSize: 11.5, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  split: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: T.border },
  mini: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 26 },
  miniBar: { flex: 1, borderRadius: 1.5, minWidth: 2 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10 },
  kpis: { flexDirection: 'row', gap: 8 },
  kpiNum: { fontSize: 14, fontWeight: '900' },
  kpiLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  over: { paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: `${T.red}14`, justifyContent: 'center' },
  overText: { fontSize: 11, fontWeight: '900', color: T.red },
  legend: { fontSize: 11.5, fontWeight: '600', color: T.muted, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%' as any, minWidth: 150, flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, gap: 2 },
  tileLabel: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  tileNum: { fontSize: 19, fontWeight: '900' },
  tileSub: { fontSize: 11, fontWeight: '700', color: T.muted },
  section: { fontSize: 12, fontWeight: '900', color: T.nav, marginBottom: 8, letterSpacing: 0.3 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  legendItem: { fontSize: 11.5, fontWeight: '800' },
  barInfo: { fontSize: 12, fontWeight: '800', color: T.nav, marginBottom: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 130 },
  barCol: { flex: 1, height: '100%' as any, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%' as any, justifyContent: 'flex-end' },
  bar: { width: '100%' as any, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, marginTop: 3, height: 13 },
  barScale: { fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 4, textAlign: 'right' },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginBottom: 6, borderRadius: 10, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, backgroundColor: T.surface },
  openTitle: { fontSize: 13, fontWeight: '800', color: T.ink },
});
