// FILE: src/features/support/screens/ClientApp.tsx
// RAISE TICKET — for every FlowNest user with the "Raise ticket" right.
//   • a problem in any FlowNest / Mill Hub screen, or a new feature / change request
//   • the screen the user came from is captured as a screenshot and its module is preselected
//   • more pictures from the gallery / camera; module chosen from the user's own modules
//   • "My tickets": live status (Raised → In progress → Testing → Resolved), who is working on it,
//     the IT team's replies and resolution, chat with the IT team, re-open if still not fixed
//   • period (this month / last month / this year …) and Excel of the user's own tickets
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clientApi, SupportCall } from '../api';
import { useTicketDraft } from '../capture';
import { downloadMyTickets } from '../download';
import { ago, inPeriod, Period, periodFor, periodParams, shiftPeriod, STATUSES, Ticket, typeOf } from '../model';
import { ExportChoice, ExportDialog } from '../components/ExportDialog';
import { moduleForRoute, moduleOptions } from '../modules';
import { LiveStatus, LiveSync } from '../realtime';
import { Shell } from '../components/Shell';
import { TicketDetailView } from '../components/TicketDetail';
import { FormPicture, TicketForm } from '../components/TicketForm';
import { Avatar, Btn, Empty, Input, Panel, Segmented, Select, StatusPill, toast, useLayout } from '../components/ui';

type PeriodKey = 'all' | 'month' | 'last_month' | 'year' | 'last_year';
const periodOf = (k: PeriodKey): Period => {
  if (k === 'month') return periodFor('month');
  if (k === 'last_month') return shiftPeriod(periodFor('month'), -1);
  if (k === 'year') return periodFor('year');
  if (k === 'last_year') return shiftPeriod(periodFor('year'), -1);
  return periodFor('all');
};

type Props = {
  base: string;
  bearer: string;
  property: string;
  canAccess: (path: string) => boolean;
  startNew?: boolean;
  onExit: () => void;
};

type Tab = 'open' | 'done' | 'all';

export function ClientApp({ base, bearer, property, canAccess, startNew, onExit }: Props) {
  const { phone } = useLayout();
  const api: SupportCall = useMemo(() => clientApi(base, bearer, property), [base, bearer, property]);
  const draft = useTicketDraft();
  const modules = useMemo(() => moduleOptions(canAccess), [canAccess]);
  const preset = useMemo(() => moduleForRoute(draft.fromRoute, modules), [draft.fromRoute, modules]);

  const [boot, setBoot] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [bootMsg, setBootMsg] = useState('');
  const [live, setLive] = useState<LiveStatus>('connecting');
  const [items, setItems] = useState<Record<number, Ticket>>({});
  const [ids, setIds] = useState<number[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('open');
  const [pk, setPk] = useState<PeriodKey>('all');
  const period = useMemo(() => periodOf(pk), [pk]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState<Record<string, number> | null>(null);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState(!!startNew);
  const [pics, setPics] = useState<FormPicture[]>([]);
  const [sending, setSending] = useState(false);
  const sync = useRef<LiveSync | null>(null);
  const queued = useRef<Record<number, Ticket>>({});
  const flushTimer = useRef<any>(null);
  const reqGen = useRef(0);

  // screenshots captured from the header icon -> pictures of the new ticket
  useEffect(() => {
    if (!draft.shots.length) return;
    setPics((p) => {
      const have = new Set(p.map((x) => x.key));
      return [...p, ...draft.shots.filter((s) => !have.has(s.id)).map((s) => ({ key: s.id, uri: s.uri, name: s.name, sub: 'Screenshot' }))].slice(-8);
    });
  }, [draft.shots]);
  useEffect(() => { if (startNew) setForm(true); }, [startNew]);

  const statusParam = tab === 'open' ? 'todo,in_progress,review' : tab === 'done' ? 'done' : '';

  const load = async (reset: boolean) => {
    if (loading && !reset) return;
    const g = ++reqGen.current;
    setLoading(true);
    try {
      const r = await api<{ items: Ticket[]; next_cursor: string | null; rev: number; counts?: Record<string, number> }>('tickets.list', {
        status: statusParam, q, sort: 'rev', limit: 30, cursor: reset ? '' : cursor || '', counts: reset ? '1' : '', ...periodParams(period),
      });
      if (reset && r.counts && g === reqGen.current) setTotal(r.counts);
      if (g !== reqGen.current) return;
      setItems((m) => { const n = { ...m }; r.items.forEach((t) => { n[t.id] = t; }); return n; });
      setIds((cur) => (reset ? r.items.map((t) => t.id) : [...cur, ...r.items.map((t) => t.id).filter((id) => !cur.includes(id))]));
      setCursor(r.next_cursor);
      sync.current?.seen(r.rev);
    } catch (e: any) {
      if (g === reqGen.current) toast(e?.message || 'Could not load your tickets.', 'err');
    } finally {
      if (g === reqGen.current) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<{ realtime: any; rev: number }>('bootstrap');
        if (!alive) return;
        setBoot('ok');
        sync.current = new LiveSync({
          startRev: r.rev,
          getPass: async () => (await api<{ realtime: any }>('realtime')).realtime,
          fetchChanges: (since) => api('changes', { since }),
          // live changes: collected for a moment and merged in one update; older / identical
          // ones (echo of the user's own action) are ignored -> no flicker, no jumping list
          onTickets: (list) => {
            list.forEach((t) => { const q = queued.current[t.id]; if (!q || t.rev >= q.rev) queued.current[t.id] = t; });
            if (flushTimer.current) return;
            flushTimer.current = setTimeout(() => {
              const batch = Object.values(queued.current).sort((a, b) => a.rev - b.rev);
              queued.current = {};
              flushTimer.current = null;
              setItems((m) => {
                const fresh = batch.filter((t) => !m[t.id] || t.rev > m[t.id].rev || (t.rev === m[t.id].rev && JSON.stringify(t) !== JSON.stringify(m[t.id])));
                if (!fresh.length) return m;
                const n = { ...m };
                fresh.forEach((t) => { n[t.id] = t; });
                setIds((cur) => {
                  let next = cur;
                  for (const t of fresh) {
                    const was = next.indexOf(t.id);
                    if (t.deleted) { if (was >= 0) next = next.filter((x) => x !== t.id); continue; }
                    if (was === 0) continue;
                    next = [t.id, ...next.filter((x) => x !== t.id)];
                  }
                  return next;
                });
                return n;
              });
            }, 150);
          },
          onStatus: setLive,
        }).start();
      } catch (e: any) {
        if (!alive) return;
        setBootMsg(e?.message || 'Could not open.');
        setBoot(e?.status === 403 ? 'denied' : 'error');
      }
    })();
    return () => { alive = false; sync.current?.stop(); clearTimeout(flushTimer.current); flushTimer.current = null; queued.current = {}; };
  }, [api]);

  useEffect(() => {
    if (boot !== 'ok') return;
    const t = setTimeout(() => void load(true), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [boot, tab, q, pk]); // eslint-disable-line react-hooks/exhaustive-deps

  const doExport = async (c: ExportChoice) => {
    if (exporting) return;
    setExporting(true);
    try {
      const name = await downloadMyTickets(base, bearer, property, c.params);
      setExportOpen(false);
      toast(`Excel ready — ${name}`, 'ok');
    } catch (e: any) {
      toast(e?.message || 'Export failed.', 'err');
    } finally {
      setExporting(false);
    }
  };

  const shown = ids.filter((id) => {
    const t = items[id];
    if (!t || t.deleted) return false;
    if (!inPeriod(t, period)) return false;
    if (tab === 'open') return t.status !== 'done';
    if (tab === 'done') return t.status === 'done';
    return true;
  });

  const submit = async (v: Record<string, any>) => {
    if (sending) return;
    setSending(true);
    try {
      const r = await api<{ ticket: Ticket }>('tickets.create', { ...v, screen: draft.fromRoute || '' });
      let failed = 0;
      for (const p of pics) {
        try { await api('tickets.attach', { id: r.ticket.id, files: [{ name: p.name, data: p.uri }] }, { timeout: 120000 }); } catch { failed++; }
      }
      toast(failed ? `${r.ticket.no} raised — ${failed} picture(s) could not be uploaded` : `${r.ticket.no} raised — the IT team can see it now`, failed ? 'err' : 'ok');
      draft.clear();
      setPics([]);
      setForm(false);
      setTab('open');
      setItems((m) => ({ ...m, [r.ticket.id]: { ...r.ticket, attachments: pics.length - failed } }));
      setIds((cur) => [r.ticket.id, ...cur.filter((x) => x !== r.ticket.id)]);
      setOpenId(r.ticket.id);
    } catch (e: any) {
      toast(e?.message || 'Could not raise the ticket.', 'err');
    } finally {
      setSending(false);
    }
  };

  if (boot === 'loading') return <Shell title="Support" icon="confirmation-number" accent={T.blue} onBack={onExit}><ActivityIndicator color={T.copper} style={{ marginTop: 60 }} /></Shell>;
  if (boot !== 'ok') {
    return (
      <Shell title="Support" icon="confirmation-number" accent={T.blue} onBack={onExit}>
        <Empty icon={boot === 'denied' ? 'lock' : 'error-outline'} title={boot === 'denied' ? 'No right to raise tickets' : 'Could not open'} text={bootMsg} action={<Btn small kind="ghost" title="Back to FlowNest" onPress={onExit} />} />
      </Shell>
    );
  }

  const openCount = total ? total.todo + total.in_progress + total.review : 0;
  const doneCount = total ? total.done : 0;

  return (
    <Shell title="Support" subtitle="Report a problem or ask for something new — the IT team sees it live" icon="confirmation-number" accent={T.blue} live={live} onBack={onExit}
      right={!phone ? <Btn small title="Raise a ticket" icon="add" onPress={() => setForm(true)} /> : null}>
      <View style={[c.page, phone && { padding: 10 }]}>
        <View style={c.hero}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={c.heroTitle}>Something not working, or need something new?</Text>
            <Text style={c.heroText}>Tap the <Icon name="confirmation-number" size={13} color={T.blue} /> icon in the top bar on any screen — it takes a screenshot of that screen and opens a new ticket for it.</Text>
          </View>
          {phone ? <Btn small title="New" icon="add" onPress={() => setForm(true)} /> : null}
        </View>

        <View style={[c.bar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'open', label: `Open${openCount ? ` · ${openCount}` : ''}`, icon: 'pending-actions' },
            { value: 'done', label: `Resolved${doneCount ? ` · ${doneCount.toLocaleString('en-IN')}` : ''}`, icon: 'task-alt' },
            { value: 'all', label: 'All', icon: 'list' },
          ]} />
          <View style={[c.tools, phone && { width: '100%' as any }]}>
            <View style={{ width: phone ? undefined : 170, flex: phone ? 1 : undefined }}>
              <Select value={pk} onChange={(v) => setPk(v as PeriodKey)} title="Period" icon="date-range" searchable={false} options={[
                { value: 'all', label: 'All time' }, { value: 'month', label: 'This month' }, { value: 'last_month', label: 'Last month' },
                { value: 'year', label: 'This year' }, { value: 'last_year', label: 'Last year' },
              ]} />
            </View>
            <Btn small kind="success" title="Excel" icon="file-download" onPress={() => setExportOpen(true)} busy={exporting} />
          </View>
          <View style={{ flex: 1, minWidth: 200 }}><Input value={q} onChangeText={setQ} placeholder="Search my tickets…" icon="search" /></View>
        </View>

        <FlatList
          data={shown}
          keyExtractor={(id) => String(id)}
          renderItem={({ item }) => <MyTicket t={items[item]} onPress={() => setOpenId(item)} />}
          onEndReached={() => { if (cursor) void load(false); }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListFooterComponent={loading && (!shown.length || cursor) ? <ActivityIndicator color={T.copper} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={!loading ? (
            <Empty icon={tab === 'done' ? 'task-alt' : 'confirmation-number'} title={q ? 'No match' : tab === 'done' ? 'No resolved tickets yet' : 'No open tickets'}
              text={q ? undefined : 'When you raise a ticket you will see here, live, what the IT team is doing with it.'}
              action={!q ? <Btn small title="Raise a ticket" icon="add" onPress={() => setForm(true)} /> : undefined} />
          ) : null}
        />
      </View>

      <ExportDialog visible={exportOpen} onClose={() => setExportOpen(false)} onExport={doExport} busy={exporting} realm="client" current={pk === 'all' ? null : period} />

      <Panel visible={form} onClose={() => setForm(false)} title="Raise a ticket" subtitle={preset ? `From: ${preset.label}` : 'The IT team gets it immediately'} width={680}>
        {form ? (
          <TicketForm realm="client" modules={modules} presetModule={preset} pictures={pics}
            onPictures={(p) => { setPics(p); const keep = new Set(p.map((x) => x.key)); draft.shots.forEach((s) => { if (!keep.has(s.id)) draft.removeShot(s.id); }); }}
            busy={sending} onCancel={() => setForm(false)} onSubmit={submit} />
        ) : null}
      </Panel>

      <Panel visible={openId !== null} onClose={() => setOpenId(null)} title={openId ? items[openId]?.no || '' : ''} subtitle={openId ? items[openId]?.title : ''} width={640}>
        {openId !== null ? (
          <TicketDetailView realm="client" api={api} base={base} id={openId} rev={items[openId]?.rev} modules={modules}
            onChanged={(t) => setItems((m) => ({ ...m, [t.id]: t }))}
            onDeleted={(id) => setItems((m) => (m[id] ? { ...m, [id]: { ...m[id], deleted: true } } : m))}
            onClose={() => setOpenId(null)} />
        ) : null}
      </Panel>
    </Shell>
  );
}

function MyTicket({ t, onPress }: { t: Ticket; onPress: () => void }) {
  if (!t) return null;
  const ty = typeOf(t.type);
  const step = STATUSES.findIndex((s) => s.key === t.status);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [c.card, pressed && { backgroundColor: T.sub }]} accessibilityRole="button">
      <View style={c.row}>
        <Icon name={ty.icon as any} size={16} color={ty.color} />
        <Text style={c.no}>{t.no}</Text>
        <Text style={c.type}>{ty.label}</Text>
        <View style={{ flex: 1 }} />
        <StatusPill status={t.status} client small />
      </View>
      <Text style={c.title} numberOfLines={2}>{t.title}</Text>
      {t.module_label ? <Text style={c.meta} numberOfLines={1}>{t.module_label}</Text> : null}
      <View style={c.steps}>
        {STATUSES.map((s, i) => (
          <View key={s.key} style={c.stepWrap}>
            <View style={[c.step, { backgroundColor: i <= step ? s.color : T.border }]} />
            <Text style={[c.stepText, i === step && { color: s.color, fontWeight: '900' }]} numberOfLines={1}>{s.client}</Text>
          </View>
        ))}
      </View>
      <View style={c.row}>
        {t.assignee ? <><Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={20} /><Text style={c.meta}>{t.assignee.name} is on it</Text></> : <Text style={c.meta}>Waiting for the IT team</Text>}
        <View style={{ flex: 1 }} />
        {t.comments ? <View style={c.chip}><Icon name="chat-bubble-outline" size={12} color={T.muted} /><Text style={c.chipText}>{t.comments}</Text></View> : null}
        {t.attachments ? <View style={c.chip}><Icon name="image" size={12} color={T.muted} /><Text style={c.chipText}>{t.attachments}</Text></View> : null}
        <Text style={c.time}>{ago(t.updated_at)}</Text>
      </View>
    </Pressable>
  );
}

const c = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 10, width: '100%', maxWidth: 980, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: `${T.blue}0D`, borderWidth: 1, borderColor: `${T.blue}33` },
  heroTitle: { fontSize: 14.5, fontWeight: '900', color: T.nav },
  heroText: { fontSize: 12.5, color: T.ink, fontWeight: '600', marginTop: 3, lineHeight: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10, gap: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  no: { fontSize: 12, fontWeight: '900', color: T.muted },
  type: { fontSize: 11.5, fontWeight: '800', color: T.muted },
  title: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  meta: { fontSize: 12, color: T.muted, fontWeight: '700' },
  steps: { flexDirection: 'row', gap: 6, marginTop: 2 },
  stepWrap: { flex: 1, gap: 4 },
  step: { height: 5, borderRadius: 3 },
  stepText: { fontSize: 10, fontWeight: '700', color: T.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 20, paddingHorizontal: 6, borderRadius: 6, backgroundColor: T.alt },
  chipText: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  time: { fontSize: 11, color: T.muted, fontWeight: '700', marginLeft: 4 },
});
