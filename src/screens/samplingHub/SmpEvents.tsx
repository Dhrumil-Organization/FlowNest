// FILE: src/screens/samplingHub/SmpEvents.tsx
// Event movements of the Sampling Hub — samples taken to the event of the Event module (GET api/getevent, the same call
// the Event & property screen makes, so both always show the same event) and brought back from it.
//
//   Taken to event (OUT)   pick the event + who carries the samples once, then scan sticker after
//                          sticker (camera stays open / scanner gun) — each scan is recorded at once.
//                          The login user is saved as the one who scanned it.
//   Back from event (IN)   pick the event they come back from (or "the event it is at"), scan again — the API finds
//                          the same sample's open "Taken to event" and links the IN to it. A sample that is not at
//                          that event is refused, so OUT and IN always stay matched.
//   Reconciliation         per event: taken · back · still at the event (with who carries what).
import { SamplingHubAPI } from '@/src/api/legacyClient';
import { useErpSession } from '@/src/core/session/erpSession';
import axios from 'axios';
import QrScanSheet from '@/src/components/StockVerificationNEW/QrScanSheet';
import { Opt, SelectField } from '@/src/components/StockVerificationNEW/ui';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../yarnHub/yarnHubModel';
import {
  allowedPurposes, dateFull, dateShort, errText, EventsData, EventSummary, eventSummaries, Move, normalizeEvents, parseSampleId,
  Person, plural, Sample, SMP_TYPE, SmpState, unwrap,
} from './samplingHubModel';
import { Empty, Head, MF, SampleRow, Seg, StatCard, st as P, Widget } from './SmpParts';

type Ctx = { prptype: string; yearno: string; prpcode?: string };

/* ------------------------------ events + people (one load per group) ------------------------------ */
/** the event EXACTLY as the Event module reads it: GET {API}/api/getevent?prptype=<group>&yearno=<year> */
export async function fetchModuleEvents(API: string, token: string, ctx: Ctx) {
  const res = await axios.get(`${String(API || '').replace(/\/+$/, '')}/api/getevent`, {
    params: { prptype: ctx.prptype, yearno: ctx.yearno },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 60000,
  });
  const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
  return rows
    .map((r: any) => ({ id: String(r?.EventId ?? '').trim(), name: String(r?.EventName ?? '').trim(), status: 'Active', active: true, created: '' }))
    .filter((e: any) => e.id)
    .map((e: any) => ({ ...e, name: e.name || 'Event ' + e.id }));
}
const cache: Record<string, EventsData & { at: number }> = {};
const EVENT_TTL = 2 * 60000;   // the Event module may switch its event: read api/getevent again after 2 minutes
/** rev: bumped by the screen's Refresh → read again now */
export function useSmpEvents(ctx: Ctx, enabled = true, rev = 0) {
  const { session } = useErpSession();
  const API = session?.API || '';
  const token = session?.token || '';
  const key = ctx.prptype + '|' + ctx.yearno;
  const [data, setData] = useState<EventsData | null>(cache[key] || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (force = false) => {
    if (!ctx.prptype) return;
    if (cache[key] && !force && Date.now() - cache[key].at < EVENT_TTL) { setData(cache[key]); return; }
    setLoading(true); setError('');
    try {
      // event: the Event module's own api/getevent · people (who carries it) + setup state: sampling_hub/events
      const [events, rest] = await Promise.all([fetchModuleEvents(API, token, ctx), SamplingHubAPI.events(ctx).then(unwrap)]);
      const d = normalizeEvents({ ...rest, events, default: events[0]?.id || '' });
      cache[key] = { ...d, at: Date.now() }; setData(d);
    } catch (e: any) {
      setError(errText(e, 'Could not load the events.'));
    } finally {
      setLoading(false);
    }
  }, [ctx, key, API, token]);
  useEffect(() => { if (enabled && API && token) void load(); }, [enabled, load, API, token]);
  const firstRev = useRef(rev);
  useEffect(() => { if (rev !== firstRev.current && enabled && API && token) void load(true); }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, error, reload: () => load(true) };
}

/* ------------------------------ who carries it ------------------------------ */
export type Carrier = { code: string; name: string };
export function CarrierField({ label, people, value, onChange, loading, required }: {
  label: string; people: Person[]; value: Carrier; onChange: (c: Carrier) => void; loading?: boolean; required?: boolean;
}) {
  const [typing, setTyping] = useState(!!value.name && !value.code);
  const opts: Opt[] = people.map((p) => ({ value: p.id, label: p.name + (p.exec ? ' · sales executive' : ''), searchText: p.name }));
  if (value.code && !people.some((p) => p.id === value.code)) opts.unshift({ value: value.code, label: value.name || value.code });
  return typing ? (
    <View>
      <Text style={e.lbl}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TextInput value={value.name} onChangeText={(v) => onChange({ code: '', name: v.slice(0, 150) })} placeholder="Name of the person" style={[e.inp, { flex: 1 }]} accessibilityLabel={label} autoFocus />
        <Pressable onPress={() => { setTyping(false); onChange({ code: '', name: '' }); }} style={e.ghost} accessibilityLabel="Back to the list"><Icon name="close" size={16} color={T.muted} /></Pressable>
      </View>
    </View>
  ) : (
    <View>
      <SelectField label={label} required={required} value={value.code} options={opts} loading={loading} placeholder="Select person"
        onChange={(v) => onChange({ code: v, name: people.find((p) => p.id === v)?.name || '' })} />
      <Text onPress={() => { setTyping(true); onChange({ code: '', name: '' }); }} style={[e.hint, { color: T.nav, fontWeight: '700' }]}>Someone not in the list…</Text>
    </View>
  );
}
/** default carrier = the login user (the executive scanning usually carries the samples himself) */
export const meCarrier = (d: EventsData | null, me: { id: string; name: string }): Carrier => {
  const p = d?.people.find((x) => x.id === me.id);
  return p ? { code: p.id, name: p.name } : { code: '', name: me.name || '' };
};

/* ------------------------------ scan panel ------------------------------ */
type LogRow = { k: number; id: string; ok: boolean; msg: string; at: string };
export function EventScanPanel({ mode, ctx, byId, moves, stOf, me, today, onAnswer, onOpen, rev = 0, onRefresh }: {
  mode: 'event_out' | 'event_in'; ctx: Ctx; byId: Record<string, Sample>; moves: Move[]; stOf: (s: Sample) => SmpState;
  me: { id: string; name: string }; today: string; onAnswer: (d: any) => void; onOpen: (id: string) => void;
  rev?: number; onRefresh?: () => void;
}) {
  const ev = useSmpEvents(ctx, true, rev);
  // every scan is checked against the LATEST data (the answer of the previous scan), not the data of when it was shot
  const live = useRef({ byId, stOf });
  live.current = { byId, stOf };
  const out = mode === 'event_out';
  const [eventId, setEventId] = useState('');
  const [inEvent, setInEvent] = useState('');            // IN: '' = the event the sample is at
  const [carrier, setCarrier] = useState<Carrier>({ code: '', name: '' });
  const [back, setBack] = useState<Carrier>({ code: '', name: '' });
  const [qty, setQty] = useState('1');
  const [txt, setTxt] = useState('');
  const [log, setLog] = useState<LogRow[]>([]);
  const [cam, setCam] = useState(false);
  const [rearm, setRearm] = useState(0);
  const [busy, setBusy] = useState(false);
  const chain = useRef(Promise.resolve());
  const seq = useRef(0);
  const gun = useRef<TextInput>(null);

  // defaults once the events are in: newest active event (the Event module's default), carrier = me
  useEffect(() => {
    if (!ev.data) return;
    // the Event module's event changed → follow it (a sample already out stays linked to its own event)
    setEventId((cur) => (cur && ev.data!.events.some((x) => x.id === cur) ? cur : ev.data!.default));
    setCarrier((cur) => (cur.name ? cur : meCarrier(ev.data, me)));
    setBack((cur) => (cur.name ? cur : meCarrier(ev.data, me)));
  }, [ev.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLog([]); setTxt(''); }, [mode]);
  useEffect(() => { if (Platform.OS === 'web') { const t = setTimeout(() => gun.current?.focus?.(), 150); return () => clearTimeout(t); } }, [mode]);

  const events = ev.data?.events || [];
  const summaries = useMemo(() => eventSummaries(Object.values(byId), moves), [byId, moves]);
  const sumOf = (id: string) => summaries.find((x) => x.id === id);
  const evName = (id: string) => events.find((x) => x.id === id)?.name || sumOf(id)?.name || id;
  const outOpts: Opt[] = events.filter((x) => x.active).map((x) => ({ value: x.id, label: x.name, searchText: x.name + ' ' + x.id }));
  // IN: events that still have samples out first, then the rest
  const inOpts: Opt[] = useMemo(() => {
    const ids = [...summaries.filter((x) => x.pending.length).map((x) => x.id), ...events.map((x) => x.id)];
    return [...new Set(ids)].map((id) => { const s = sumOf(id); return { value: id, label: evName(id) + (s && s.pending.length ? ` · ${s.pending.length} still out` : ''), searchText: evName(id) }; });
  }, [summaries, events]); // eslint-disable-line react-hooks/exhaustive-deps
  const selEvent = out ? eventId : inEvent;
  const who = out ? carrier : back;
  const ready = !!ev.data?.ready && (out ? !!eventId && !!carrier.name.trim() : true) && +qty >= 1;
  const missing = !ev.data ? 'Loading the events…' : !ev.data.ready ? ev.data.setup : out && !eventId ? 'Select the event.' : out && !carrier.name.trim() ? 'Select who carries the samples.' : '';

  const add = (r: Omit<LogRow, 'k' | 'at'>) => {
    const d = new Date();
    setLog((l) => [{ ...r, k: ++seq.current, at: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }, ...l].slice(0, 200));
  };
  const lastMsg = log[0] ? (log[0].ok ? '✓ ' : '✗ ') + log[0].msg : out ? `Taking to ${evName(eventId) || '—'}` : 'Back from event';

  /** one scan → checked here first (fast, same rules as the API), then recorded by the API */
  const record = (raw: string) => {
    const t = String(raw || '').trim();
    if (!t) return;
    chain.current = chain.current.then(async () => {
      const id = parseSampleId(t);
      if (!id) { add({ id: t.slice(0, 20), ok: false, msg: `“${t.slice(0, 30)}” is not a sample sticker.` }); return; }
      const sm = live.current.byId[id];
      if (!sm) { add({ id, ok: false, msg: `No sample ${id} in your group.` }); return; }
      if (!ready) { add({ id, ok: false, msg: missing || 'Fill the details above first.' }); return; }
      const st = live.current.stOf(sm);
      const allowed = allowedPurposes(sm, st);
      if (!allowed.includes(mode)) {
        const why = out
          ? st.code === 'event' ? `already at ${st.event}` : `cannot go to an event — ${st.label.toLowerCase()}`
          : sm.tracked ? `not at any event — ${st.label.toLowerCase()}` : 'nothing of this batch is at an event';
        add({ id, ok: false, msg: `${id} ${why}.` }); return;
      }
      if (!out && inEvent) {
        if (sm.tracked && st.event_id !== inEvent) { add({ id, ok: false, msg: `${id} was taken to ${st.event}, not to ${evName(inEvent)}.` }); return; }
        if (!sm.tracked && !st.atEvents[inEvent]) { add({ id, ok: false, msg: `Nothing of batch ${id} is at ${evName(inEvent)}.` }); return; }
      }
      const q = sm.tracked ? 1 : Math.max(1, Math.round(+qty) || 1);
      setBusy(true);
      try {
        const r = await SamplingHubAPI.moveSave({
          ...ctx, sample: id, purpose: mode, date: today, qty: q, note: '',
          event_id: out ? eventId : inEvent, carrier_code: who.code, carrier: who.code ? '' : who.name.trim(),
        });
        const d = unwrap(r);
        onAnswer(d);
        add({ id, ok: true, msg: String(r?.data?.message || 'Recorded.').replace(/^Recorded · /, '') });
      } catch (e: any) {
        add({ id, ok: false, msg: errText(e, 'Could not record.') });
      } finally {
        setBusy(false);
        setRearm((x) => x + 1);
      }
    });
  };

  const sel = selEvent ? sumOf(selEvent) : null;
  const okN = log.filter((x) => x.ok).length;
  const badN = log.length - okN;
  return (
    <>
      <View style={[P.card, { borderTopWidth: 3, borderTopColor: out ? '#0E7C86' : '#3B7A3A' }]} testID="event-scan">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[e.h1, { flex: 1 }]}>{out ? 'Taken to event' : 'Back from event'}</Text>
          <Text onPress={() => (onRefresh ? onRefresh() : void ev.reload())} style={P.link} accessibilityRole="button" accessibilityLabel="Refresh event and samples">{ev.loading ? 'Refreshing…' : '↻ Refresh'}</Text>
        </View>
        <Text style={[P.note, { marginBottom: 6 }]}>
          {out
            ? 'Pick the event and who carries the samples — then scan every sticker. Each scan is recorded at once; you are saved as the one who scanned it.'
            : 'Scan the same stickers on the way back. The ERP finds each sample’s “Taken to event” and closes it — a sample that was not taken to this event is refused.'}
        </Text>
        {ev.error ? <Text style={e.err}>{ev.error} <Text onPress={ev.reload} style={P.link}>Try again</Text></Text> : null}
        {ev.data && !ev.data.ready ? <Text style={e.err}>{ev.data.setup}</Text> : null}
        {out ? (
          <SelectField label="Event" required value={eventId} options={outOpts} loading={ev.loading && !ev.data} onRefresh={ev.reload}
            placeholder={ev.data && !outOpts.length ? 'No active event in the Event module (api/getevent)' : 'Select event'} onChange={setEventId} />
        ) : (
          <SelectField label="Coming back from" value={inEvent} options={inOpts} loading={ev.loading && !ev.data} clearable onRefresh={ev.reload}
            placeholder="The event each sample is at" onChange={setInEvent} />
        )}
        <CarrierField label={out ? 'Carried by' : 'Brought back by'} required={out} people={ev.data?.people || []} value={who} loading={ev.loading && !ev.data}
          onChange={out ? setCarrier : setBack} />
        <View style={[e.wrap, { alignItems: 'flex-end' }]}>
          <View style={{ flexBasis: 110 }}>
            <Text style={e.lbl}>QTY · BATCH QR</Text>
            <TextInput value={qty} onChangeText={(v) => setQty(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" style={[e.inp, { fontFamily: MF }]} accessibilityLabel="Quantity for a batch sticker" />
          </View>
          <View style={{ flexBasis: 110 }}>
            <Text style={e.lbl}>DATE</Text>
            <Text style={[e.inp, { color: T.muted }]}>{dateShort(today)}</Text>
          </View>
        </View>
        <Text style={e.hint}>Scanned by <Text style={{ fontWeight: '800', color: C.ink }}>{me.name}</Text> · individual items move 1 each; a batch sticker moves the quantity above.</Text>
        {missing ? <Text style={[e.hint, { color: T.copper }]}>{missing}</Text> : null}
        <Pressable onPress={() => setCam(true)} disabled={!ready} style={[e.cam, { backgroundColor: ready ? (out ? '#0E7C86' : '#3B7A3A') : T.alt }]} accessibilityRole="button" accessibilityLabel="Scan stickers with camera">
          <Icon name="qr-code-scanner" size={22} color="#fff" /><Text style={e.camT}>Scan stickers (camera)</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput ref={gun} value={txt} onChangeText={setTxt} onSubmitEditing={() => { record(txt); setTxt(''); }} blurOnSubmit={false}
            autoCapitalize="characters" autoCorrect={false} placeholder="Scanner gun / type ID e.g. GAR-0001" style={e.gun} accessibilityLabel="Scanner or Sample ID" returnKeyType="go" />
          <Pressable onPress={() => { record(txt); setTxt(''); }} style={e.go} accessibilityRole="button" accessibilityLabel="Record"><Text style={e.camT}>{busy ? '…' : 'Record'}</Text></Pressable>
        </View>
      </View>

      {log.length ? (
        <View style={P.card} testID="event-log">
          <Head t={`THIS SESSION · ${okN} RECORDED${badN ? ` · ${badN} REFUSED` : ''}`} right={busy ? <ActivityIndicator size="small" color={T.nav} /> : <Text onPress={() => setLog([])} style={P.link}>Clear</Text>} />
          {log.map((r) => (
            <Pressable key={r.k} onPress={byId[r.id] ? () => onOpen(r.id) : undefined} style={e.logRow}>
              <Icon name={r.ok ? 'check-circle' : 'cancel'} size={18} color={r.ok ? T.green : T.red} />
              <Text style={e.logId}>{r.id}</Text>
              <Text style={[e.logMsg, !r.ok && { color: T.red }]} numberOfLines={2}>{r.msg}</Text>
              <Text style={e.logAt}>{r.at}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {sel ? <EventCard ev={sel} onOpen={onOpen} /> : selEvent ? <View style={P.card}><Empty t={`Nothing taken to ${evName(selEvent)} yet.`} /></View> : null}

      <QrScanSheet
        visible={cam}
        title={out ? 'Taken to event' : 'Back from event'}
        subtitle={lastMsg}
        footer={`${okN} recorded${badN ? ` · ${badN} refused` : ''} — keep scanning, close when done.`}
        manualPlaceholder="Sample ID e.g. GAR-0001"
        webCamera
        rearm={rearm}
        onClose={() => setCam(false)}
        onScanned={(v) => record(v)}
      />
    </>
  );
}

/* ------------------------------ one event: taken · back · still there ------------------------------ */
export function EventCard({ ev, onOpen, full }: { ev: EventSummary; onOpen: (id: string) => void; full?: boolean }) {
  const still = ev.pending.reduce((t, p) => t + p.qty, 0);
  return (
    <View style={P.card} testID="event-card">
      <Text style={e.h1}>{ev.name}</Text>
      <Text style={P.note}>{ev.carriers.length ? 'Carried by ' + ev.carriers.join(', ') + ' · ' : ''}last movement {dateFull(ev.last)}</Text>
      <View style={[e.wrap, { marginTop: 10 }]}>
        <StatCard label="Taken" value={String(ev.out)} color="#0E7C86" />
        <StatCard label="Back" value={String(ev.back)} color="#3B7A3A" />
        <StatCard label="Still at event" value={String(still)} color={still ? T.copper : C.mut} />
        {ev.given ? <StatCard label="Given / sent there" value={String(ev.given)} color="#652880" /> : null}
      </View>
      <Head t={still ? `STILL AT THE EVENT · ${plural(ev.pending.length, 'sample')}` : 'EVERYTHING IS BACK'} />
      {ev.pending.map((p) => (
        <Pressable key={p.s.id} onPress={() => onOpen(p.s.id)} style={P.row} accessibilityRole="button" accessibilityLabel={`Sample ${p.s.id}`}>
          <Icon name={SMP_TYPE[p.s.type].icon as any} size={18} color={SMP_TYPE[p.s.type].color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={P.mvTitle} numberOfLines={1}><Text style={{ fontFamily: MF }}>{p.s.id} </Text>{p.s.name}</Text>
            <Text style={P.rowSub} numberOfLines={1}>{p.carrier ? 'with ' + p.carrier + ' · ' : ''}since {dateShort(p.since)}{!p.s.tracked ? ` · ${p.qty} ${SMP_TYPE[p.s.type].unit}${p.qty !== 1 ? 's' : ''}` : ''}</Text>
          </View>
        </Pressable>
      ))}
      {!still ? <Empty t="No sample of this event is outstanding." /> : null}
      {full ? (
        <>
          <Head t={`MOVEMENTS · ${ev.moves.length}`} />
          {ev.moves.map((m) => (
            <Pressable key={m.id} onPress={() => onOpen(m.sample)} style={P.row}>
              <View style={[P.pBadge, { backgroundColor: m.purpose === 'event_out' ? '#0E7C86' : '#3B7A3A' }]}><Text style={P.pBadgeT}>{m.purpose === 'event_out' ? 'OUT' : 'IN'}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={P.mvTitle} numberOfLines={1}><Text style={{ fontFamily: MF }}>{m.sample}</Text>{m.qty > 1 ? ` · ${m.qty}` : ''}</Text>
                <Text style={P.rowSub} numberOfLines={2}>{dateShort(m.date)} · scanned by {m.by}{m.carrier ? (m.purpose === 'event_out' ? ' · carried by ' : ' · brought back by ') + m.carrier : ''}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** dashboard: events with samples out first */
export function EventsWidget({ samples, moves, onEvent }: { samples: Sample[]; moves: Move[]; onEvent: (id: string) => void }) {
  const list = useMemo(() => eventSummaries(samples, moves), [samples, moves]);
  if (!list.length) return null;
  const open = list.filter((x) => x.pending.length);
  const rows = [...open, ...list.filter((x) => !x.pending.length)].slice(0, 6);
  return (
    <Widget icon="event" title={`Events · ${open.length ? plural(open.reduce((t, x) => t + x.pending.length, 0), 'sample') + ' still out' : 'all back'}`} accent="#0E7C86">
      {rows.map((x) => {
        const still = x.pending.reduce((t, p) => t + p.qty, 0);
        return (
          <Pressable key={x.id} onPress={() => onEvent(x.id)} style={P.row} accessibilityRole="button" accessibilityLabel={x.name}>
            <Icon name="event" size={16} color="#0E7C86" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={e.gT} numberOfLines={1}>{x.name}</Text>
              <Text style={P.rowSub} numberOfLines={1}>{x.out} taken · {x.back} back{x.carriers.length ? ' · ' + x.carriers.join(', ') : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}><Text style={[e.gN, { color: still ? T.copper : C.mut }]}>{still}</Text><Text style={P.subL}>still out</Text></View>
          </Pressable>
        );
      })}
    </Widget>
  );
}

const e = StyleSheet.create({
  h1: { fontSize: 15, fontWeight: '800', color: C.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lbl: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 10.5, color: T.muted, marginTop: 4 },
  err: { color: T.red, fontSize: 12, fontWeight: '600', marginVertical: 4 },
  inp: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, color: T.ink, backgroundColor: '#fff' },
  ghost: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#fff', justifyContent: 'center' },
  cam: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13, marginTop: 12 },
  camT: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  gun: { flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, fontFamily: MF, color: T.ink, backgroundColor: '#fff' },
  go: { paddingHorizontal: 18, borderRadius: 9, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: T.hair },
  logId: { fontFamily: MF, fontWeight: '800', fontSize: 12, color: C.ink, minWidth: 72 },
  logMsg: { flex: 1, fontSize: 11.5, color: C.ink },
  logAt: { fontFamily: MF, fontSize: 10, color: C.mut },
  gT: { fontWeight: '700', fontSize: 12.5, color: C.ink },
  gN: { fontFamily: MF, fontWeight: '800', fontSize: 13 },
});
