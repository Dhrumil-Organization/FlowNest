// FILE: src/features/support/components/ActivityView.tsx
// ACTIVITY (IT admin): what is going on in the team, for any period.
//   • chat: messages, files shared, active people, messages per day, busiest chats
//     (direct chats: who ↔ who and how many — never their text)
//   • tickets: IT replies, internal notes, user messages, average first reply time
//   • tickets WAITING for an IT answer right now (tap to open), latest ticket conversations
//   • per person: chat messages, files, ticket replies, notes, tickets talked on, last login
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SupportCall } from '../api';
import { fmtBytes } from '../files';
import { useItDesk } from '../itStore';
import { ago, fmtMinutes, MONTHS_FULL, periodParams, toYmd, ymdToDate } from '../model';
import { PeriodBar } from './PeriodBar';
import { Avatar, Btn, Empty, useLayout } from './ui';

type Stats = {
  chat: { messages: number; files: number; bytes: number; people: number; per_day: { key: number; messages: number; files: number }[]; rooms: { id: number; kind: string; name: string; messages: number; files: number; last_at: string }[]; file_types: Record<string, number> };
  tickets: {
    it_replies: number; internal_notes: number; user_messages: number; raised: number; answered: number; first_reply_min: number | null;
    waiting: { id: number; no: string; title: string; user: string; assignee: string | null; status: string; since: string; never_answered: boolean }[];
    recent: { ticket_id: number; no: string; title: string; author: string; author_kind: string; internal: boolean; text: string; at: string }[];
    top_users: { name: string; tickets: number; open: number }[];
  };
  people: { id: number; name: string; color: string; role: string; active: boolean; last_login_at: string | null; messages: number; files: number; bytes: number; rooms: number; last_message_at: string | null; ticket_replies: number; internal_notes: number; tickets_talked: number }[];
};

export function ActivityView({ api, onOpenTicket }: { api: SupportCall; onOpenTicket: (id: number) => void }) {
  const { wide, phone } = useLayout();
  const period = useItDesk((s) => s.period);
  const setPeriod = useItDesk((s) => s.setPeriod);
  const [st, setSt] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = (quiet: boolean) => {
      if (!quiet) setBusy(true);
      api<Stats>('activity', periodParams(period)).then((r) => { if (alive) { setSt(r); setErr(''); } }).catch((e) => alive && setErr(e?.message || 'Could not load.')).finally(() => alive && setBusy(false));
    };
    load(false);
    const t = setInterval(() => load(true), 30000);
    return () => { alive = false; clearInterval(t); };
  }, [api, period]);

  const days = (() => {
    if (!st) return [];
    const map: Record<number, number> = {};
    st.chat.per_day.forEach((d) => { map[d.key] = d.messages; });
    if (period.mode === 'all' || !period.from) return st.chat.per_day.map((d) => ({ key: d.key, v: d.messages }));
    const out: { key: number; v: number }[] = [];
    const d = ymdToDate(period.from)!;
    const end = Math.min(period.to, toYmd(new Date()));
    while (toYmd(d) <= end && out.length < 370) { out.push({ key: toYmd(d), v: map[toYmd(d)] || 0 }); d.setDate(d.getDate() + 1); }
    return out;
  })();
  const max = Math.max(5, ...days.map((d) => d.v));

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 60 }}>
      <PeriodBar period={period} onChange={setPeriod} allLabel="All dates" />
      {err && !st ? <Empty icon="error-outline" title="Could not load" text={err} /> : null}
      {!st && busy ? <ActivityIndicator color={T.copper} style={{ marginTop: 30 }} /> : null}
      {st ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Tile icon="forum" color={T.blue} label="Chat messages" value={st.chat.messages} />
            <Tile icon="attach-file" color={T.purple} label="Files shared" value={st.chat.files} sub={fmtBytes(st.chat.bytes)} />
            <Tile icon="groups" color={T.nav} label="People chatting" value={st.chat.people} />
            <Tile icon="reply" color={T.green} label="IT replies to users" value={st.tickets.it_replies} />
            <Tile icon="lock" color={T.amber} label="Internal notes" value={st.tickets.internal_notes} />
            <Tile icon="person" color={T.copper} label="User messages" value={st.tickets.user_messages} />
            <Tile icon="timer" color={T.blue} label="First reply (avg)" value={st.tickets.first_reply_min === null ? '—' : fmtMinutes(st.tickets.first_reply_min) || '0m'} sub={`${st.tickets.answered} of ${st.tickets.raised} tickets answered`} />
            <Tile icon="hourglass-top" color={st.tickets.waiting.length ? T.red : T.muted} label="Waiting for IT now" value={st.tickets.waiting.length} />
          </ScrollView>

          <Card title={`Chat messages per day`}>
            {days.length ? (
              <View style={a.bars}>
                {days.map((d, i) => (
                  <View key={d.key} style={a.barCol}>
                    <View style={a.barTrack}><View style={[a.bar, { height: `${Math.max(d.v ? 4 : 1.5, (d.v / max) * 100)}%` as any, backgroundColor: d.v ? T.blue : T.border }]} /></View>
                    <Text style={a.barLabel} numberOfLines={1}>{days.length <= 31 ? (i % (days.length > 20 ? 5 : 1) === 0 ? String(d.key % 100) : '') : (d.key % 100 === 1 ? MONTHS_FULL[Math.floor((d.key % 10000) / 100) - 1].slice(0, 3) : '')}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={a.muted}>No messages in this period.</Text>}
          </Card>

          <View style={[a.cols, !wide && { flexDirection: 'column' }]}>
            <Card title="People" style={wide ? { flex: 1.4 } : undefined}>
              {!phone ? (
                <View style={[a.tr, a.th]}>
                  <Text style={[a.thText, { flex: 1.6 }]}>Person</Text>
                  <Text style={[a.thText, a.n]}>Chat</Text>
                  <Text style={[a.thText, a.n]}>Files</Text>
                  <Text style={[a.thText, a.n]}>Replies</Text>
                  <Text style={[a.thText, a.n]}>Notes</Text>
                  <Text style={[a.thText, a.n]}>Tickets</Text>
                  <Text style={[a.thText, { width: 90, textAlign: 'right' }]}>Last login</Text>
                </View>
              ) : null}
              {st.people.map((p) => (
                <View key={p.id} style={[a.tr, phone && { flexWrap: 'wrap', rowGap: 4 }]}>
                  <View style={[a.who, phone ? { width: '100%' as any } : { flex: 1.6 }]}>
                    <Avatar name={p.name} id={p.id} color={p.color} size={28} />
                    <View style={{ minWidth: 0, flex: 1 }}>
                      <Text style={a.name} numberOfLines={1}>{p.name}{p.active ? '' : ' · off'}</Text>
                      <Text style={a.muted} numberOfLines={1}>{p.last_message_at ? `last message ${ago(p.last_message_at)}` : 'no chat in this period'}</Text>
                    </View>
                  </View>
                  {phone ? <Text style={[a.muted, { paddingLeft: 36 }]}>{p.messages} chat · {p.files} files · {p.ticket_replies} replies · {p.internal_notes} notes · {p.tickets_talked} tickets</Text> : (
                    <>
                      <Text style={[a.cell, a.n]}>{p.messages}</Text>
                      <Text style={[a.cell, a.n]}>{p.files}</Text>
                      <Text style={[a.cell, a.n]}>{p.ticket_replies}</Text>
                      <Text style={[a.cell, a.n]}>{p.internal_notes}</Text>
                      <Text style={[a.cell, a.n]}>{p.tickets_talked}</Text>
                      <Text style={[a.muted, { width: 90, textAlign: 'right' }]}>{p.last_login_at ? ago(p.last_login_at) : '—'}</Text>
                    </>
                  )}
                </View>
              ))}
            </Card>
            <Card title={`Waiting for an IT answer (${st.tickets.waiting.length})`} style={wide ? { flex: 1 } : undefined}>
              {!st.tickets.waiting.length ? <Text style={a.muted}>All user tickets are answered. 👍</Text> : null}
              {st.tickets.waiting.map((w) => (
                <Pressable key={w.id} onPress={() => onOpenTicket(w.id)} style={({ hovered }: any) => [a.wait, hovered && { backgroundColor: T.sub }]}>
                  <Icon name={w.never_answered ? 'mark-email-unread' : 'chat'} size={17} color={w.never_answered ? T.red : T.amber} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={a.name} numberOfLines={1}>{w.no} · {w.title}</Text>
                    <Text style={a.muted} numberOfLines={1}>{w.user} · {w.never_answered ? 'no reply yet' : 'user replied'} · waiting {ago(w.since).replace(' ago', '')}{w.assignee ? ` · ${w.assignee}` : ' · unassigned'}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>

          <View style={[a.cols, !wide && { flexDirection: 'column' }]}>
            <Card title="Latest ticket conversations" style={wide ? { flex: 1.4 } : undefined}>
              {!st.tickets.recent.length ? <Text style={a.muted}>No ticket messages in this period.</Text> : null}
              {st.tickets.recent.map((r, i) => (
                <Pressable key={i} onPress={() => onOpenTicket(r.ticket_id)} style={({ hovered }: any) => [a.conv, hovered && { backgroundColor: T.sub }]}>
                  <View style={[a.kind, { backgroundColor: r.internal ? `${T.amber}22` : r.author_kind === 'client' ? `${T.copper}1A` : `${T.green}1A` }]}>
                    <Text style={[a.kindText, { color: r.internal ? T.amber : r.author_kind === 'client' ? T.copper : T.green }]}>{r.internal ? 'NOTE' : r.author_kind === 'client' ? 'USER' : 'IT'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={a.name} numberOfLines={1}>{r.author} · <Text style={a.muted}>{r.no} {r.title}</Text></Text>
                    <Text style={a.convText} numberOfLines={2}>{r.text}</Text>
                    {phone ? <Text style={a.muted}>{ago(r.at)}</Text> : null}
                  </View>
                  {!phone ? <Text style={a.muted}>{ago(r.at)}</Text> : null}
                </Pressable>
              ))}
            </Card>
            <View style={[{ gap: 12 }, wide ? { flex: 1 } : null]}>
              <Card title="Busiest chats">
                {!st.chat.rooms.length ? <Text style={a.muted}>No chat in this period.</Text> : null}
                {st.chat.rooms.slice(0, 12).map((r) => (
                  <View key={r.id} style={a.roomRow}>
                    <Icon name={r.kind === 'team' ? 'groups' : r.kind === 'group' ? 'workspaces' : 'person'} size={16} color={T.muted} />
                    <Text style={[a.name, { flex: 1 }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={a.cell}>{r.messages}</Text>
                    <Text style={a.muted}>{r.files ? ` · ${r.files} files` : ''}</Text>
                  </View>
                ))}
                <Text style={[a.muted, { marginTop: 6 }]}>Direct chats show only who and how many — never the messages.</Text>
              </Card>
              <Card title="Files shared by type">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(st.chat.file_types).map(([k, v]) => <Text key={k} style={a.type}>{k} {v}</Text>)}
                </View>
              </Card>
              <Card title="Users raising most tickets">
                {!st.tickets.top_users.length ? <Text style={a.muted}>No tickets raised in this period.</Text> : null}
                {st.tickets.top_users.map((u) => (
                  <View key={u.name} style={a.roomRow}><Text style={[a.name, { flex: 1 }]} numberOfLines={1}>{u.name}</Text><Text style={a.cell}>{u.tickets}</Text><Text style={a.muted}>{u.open ? ` · ${u.open} open` : ''}</Text></View>
                ))}
              </Card>
            </View>
          </View>
        </>
      ) : null}
      {st ? <Btn small kind="ghost" title="Refresh" icon="refresh" onPress={() => setPeriod({ ...period })} style={{ alignSelf: 'flex-start' }} /> : null}
    </ScrollView>
  );
}

function Tile({ icon, color, label, value, sub }: { icon: string; color: string; label: string; value: string | number; sub?: string }) {
  return (
    <View style={a.tile}>
      <Icon name={icon as any} size={17} color={color} />
      <View>
        <Text style={[a.tileNum, { color }]}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
        <Text style={a.tileLabel}>{label}</Text>
        {sub ? <Text style={a.tileSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[a.card, style]}>
      <Text style={a.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const a = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, minWidth: 130 },
  tileNum: { fontSize: 17, fontWeight: '900' },
  tileLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  tileSub: { fontSize: 10, fontWeight: '700', color: T.muted },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 4 },
  cardTitle: { fontSize: 12.5, fontWeight: '900', color: T.nav, marginBottom: 6 },
  cols: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 110 },
  barCol: { flex: 1, height: '100%' as any, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%' as any, justifyContent: 'flex-end' },
  bar: { width: '100%' as any, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barLabel: { fontSize: 9, fontWeight: '800', color: T.muted, height: 12, marginTop: 2 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  th: { paddingVertical: 4 },
  thText: { fontSize: 10.5, fontWeight: '900', color: T.muted },
  n: { width: 54, textAlign: 'right' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  name: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  muted: { fontSize: 11, fontWeight: '700', color: T.muted },
  cell: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  wait: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8 },
  conv: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  convText: { fontSize: 12, fontWeight: '600', color: T.ink },
  kind: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  kindText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  type: { fontSize: 11.5, fontWeight: '800', color: T.nav, backgroundColor: T.alt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
