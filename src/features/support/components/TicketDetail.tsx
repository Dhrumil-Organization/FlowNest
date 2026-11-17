// FILE: src/features/support/components/TicketDetail.tsx
// One ticket / task: details, pictures, the full timeline (comments + status changes) and the
// reply box. Used by the IT Desk (all actions, internal notes) and by Raise ticket (the user's
// own ticket: reply, add pictures, re-open). Refreshes itself when the ticket changes live.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { fileUrl, SupportCall } from '../api';
import type { ModuleOption } from '../modules';
import { Attachment, Comment, devSideOf, fmtMinutes, fmtWhen, fmtYmd, isOverdue, ItUser, Status, statusOf, STATUSES, Ticket, TicketDetail as TD } from '../model';
import { DoneDialog } from './DoneDialog';
import { AddPictures, Thumbs } from './Pictures';
import { TicketForm } from './TicketForm';
import { Avatar, Btn, Dialog, Empty, Input, Opt, PriorityPill, Select, StatusPill, toast, TypePill, useLayout } from './ui';

type Props = {
  realm: 'it' | 'client';
  api: SupportCall;
  base: string;
  id: number;
  rev?: number; // newest known revision of this card (live) -> reload when it grows
  me?: ItUser | null;
  users?: ItUser[];
  modules: ModuleOption[];
  onChanged?: (t: Ticket) => void;
  onDeleted?: (id: number) => void;
  onClose: () => void;
  onRequestResolve?: (t: Ticket, status: Status) => void;
  /** IT Desk: Done needs the actual time (server setting) */
  actualTimeRequired?: boolean;
};

type Full = TD & { timeline: Comment[]; pictures: Attachment[] };

export function TicketDetailView({ realm, api, base, id, rev, me, users = [], modules, onChanged, onDeleted, onClose, actualTimeRequired = true }: Props) {
  const { phone } = useLayout();
  const isIt = realm === 'it';
  const [t, setT] = useState<Full | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [resolveFor, setResolveFor] = useState<Status | null>(null);
  const [reopen, setReopen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const loadedRev = useRef(0);

  // the parent passes new callbacks on every render (live updates) — keep them in refs so the
  // ticket is NOT cleared and re-fetched each time something else on the board changes
  const onDeletedRef = useRef(onDeleted);
  onDeletedRef.current = onDeleted;
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setErr('');
    try {
      const r = await api<{ ticket: Full }>('tickets.get', { id });
      loadedRev.current = r.ticket.rev;
      setT(r.ticket);
    } catch (e: any) {
      if (!quiet) setErr(e?.message || 'Could not open the ticket.');
      if (e?.status === 404) onDeletedRef.current?.(id);
    }
  }, [api, id]);

  // a different ticket -> show its loader once; the same ticket refreshes silently in place
  useEffect(() => { setT(null); loadedRev.current = 0; void load(); }, [load]);
  useEffect(() => {
    if (rev && rev > loadedRev.current) {
      const tm = setTimeout(() => void load(true), 250);
      return () => clearTimeout(tm);
    }
    return undefined;
  }, [rev, load]);

  const comments: Comment[] = useMemo(() => (t && Array.isArray(t.timeline) ? t.timeline : []), [t]);
  const atts: Attachment[] = useMemo(() => (t && Array.isArray(t.pictures) ? t.pictures : []), [t]);

  const run = async (key: string, fn: () => Promise<any>, ok?: string) => {
    if (busy) return;
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast(ok, 'ok');
      return r;
    } catch (e: any) {
      toast(e?.message || 'Could not save.', 'err');
      return undefined;
    } finally {
      setBusy('');
    }
  };

  const afterTicket = (tk: any) => {
    if (!tk) return;
    // a full ticket carries the comment / picture LISTS; boards and lists keep only the counts
    const { timeline, pictures, ...card } = tk; // boards / lists keep the card only
    onChanged?.(card);
    void load(true);
  };

  const move = async (status: Status, resolution = '', spent = 0, asked = false) => {
    if (!t) return;
    if (status === t.status) return;
    const needNote = t.kind === 'ticket' && !t.resolution_note;
    const needTime = actualTimeRequired && !t.spent_min;
    if (status === 'done' && !asked && (needNote || needTime)) {
      setResolveFor(status);
      return;
    }
    const r = await run('move', () => api('tickets.move', { id, status, note: resolution, spent_min: spent || '' }), `Moved to ${statusOf(status).label}`);
    if (r) { setResolveFor(null); afterTicket(r.ticket); }
  };

  const assign = async (v: string) => {
    const r = await run('assign', () => api('tickets.update', { id, assignee_id: v || null }), v ? 'Assigned' : 'Unassigned');
    if (r) afterTicket(r.ticket);
  };

  const send = async () => {
    const body = reply.trim();
    if (!body) return;
    const r = await run('reply', () => api('tickets.comment', { id, body, internal: internal ? 1 : 0 }));
    if (r) {
      setReply('');
      setInternal(false);
      await load(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const upload = async (list: { uri: string; name: string }[]) => {
    for (const p of list) {
      const r = await run('upload', () => api('tickets.attach', { id, files: [{ name: p.name, data: p.uri }] }, { timeout: 120000 }));
      if (!r) break;
    }
    void load(true);
  };

  if (err) return <Empty icon="error-outline" title="Could not open" text={err} action={<Btn title="Retry" onPress={() => load()} small />} />;
  if (!t) return <View style={{ padding: 40 }}><ActivityIndicator color={T.copper} /></View>;

  if (editing) {
    return (
      <TicketForm
        actualTimeRequired={actualTimeRequired}
        realm={realm}
        initial={t}
        users={users}
        me={me}
        modules={modules}
        busy={busy === 'edit'}
        onCancel={() => setEditing(false)}
        onSubmit={async (v) => {
          const r = await run('edit', () => api('tickets.update', { id, ...v }), 'Saved');
          if (r) { setEditing(false); afterTicket(r.ticket); }
        }}
      />
    );
  }

  const rights = t.rights;
  const userOpts: Opt[] = [
    { value: '', label: 'Unassigned', icon: 'person-outline', color: T.muted },
    ...users.filter((u) => u.active || u.id === t.assignee?.id).map((u) => ({ value: String(u.id), label: u.name, sub: `@${u.username}`, avatar: { name: u.name, id: u.id, color: u.color } })),
  ];
  const pics = atts.map((a) => ({ key: String(a.id), uri: fileUrl(base, a.url), name: a.name, sub: a.by.name, removable: isIt ? (rights.edit || (a.by.kind === 'it' && a.by.id === me?.id)) : (a.by.kind === 'client' && t.status === 'todo') }));
  const meta: [string, React.ReactNode][] = [
    ['Status', isIt && rights.move ? (
      <Select value={t.status} options={STATUSES.map((s) => ({ value: s.key, label: s.label, icon: s.icon, color: s.color }))} onChange={(v) => move(v as Status)} title="Move to" searchable={false} />
    ) : <StatusPill status={t.status} client={!isIt} />],
    ['Assigned to', isIt && rights.edit ? (
      <Select value={t.assignee ? String(t.assignee.id) : ''} options={userOpts} onChange={assign} title="Assign to" icon="person" />
    ) : t.assignee ? (
      <View style={d.person}><Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={22} /><Text style={d.metaVal}>{t.assignee.name}</Text></View>
    ) : <Text style={[d.metaVal, { color: T.muted }]}>{isIt ? 'Unassigned' : 'Waiting for the IT team'}</Text>],
    ['Raised by', <Text key="r" style={d.metaVal}>{t.created_by.name}{t.client?.property ? ` · ${t.client.property.replace('_', ' / ')}` : ''}</Text>],
    ['Module', <Text key="m" style={d.metaVal}>{t.module_label || t.module || '—'}</Text>],
  ];
  if (isIt || t.work_date) meta.push(['Date', <Text key="w" style={d.metaVal}>{fmtYmd(t.work_date) || '—'}</Text>]);
  if (t.due_date) meta.push(['Due', <Text key="du" style={[d.metaVal, isOverdue(t) && { color: T.red }]}>{fmtYmd(t.due_date)}{isOverdue(t) ? ' · overdue' : ''}</Text>]);
  const side = devSideOf(t.dev_side);
  if (isIt) meta.push(['Dev side', <Text key="ds" style={[d.metaVal, side && { color: side.color }]}>{side ? side.label : '—'}</Text>]);
  if (isIt && t.est_min) meta.push(['Est time', <Text key="es" style={d.metaVal}>{fmtMinutes(t.est_min)}</Text>]);
  if (t.spent_min) meta.push([isIt ? 'Actual time' : 'Time spent', <Text key="sp" style={d.metaVal}>{fmtMinutes(t.spent_min)}</Text>]);
  if (t.labels.length) meta.push(['Labels', <View key="l" style={d.labels}>{t.labels.map((l) => <Text key={l} style={d.label}>{l}</Text>)}</View>]);
  meta.push(['Created', <Text key="c" style={d.metaVal}>{fmtWhen(t.created_at)}</Text>]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={d.wrap} keyboardShouldPersistTaps="handled">
        <View style={d.pills}>
          <TypePill type={t.type} />
          <PriorityPill p={t.priority} />
          {!isIt || !rights.move ? <StatusPill status={t.status} client={!isIt} /> : null}
          {t.kind === 'ticket' && isIt ? <View style={d.userTag}><Icon name="person" size={12} color={T.copper} /><Text style={d.userTagText}>Raised by a user</Text></View> : null}
        </View>
        <Text style={d.title}>{t.title}</Text>

        <View style={d.actions}>
          {rights.take && isIt && !t.assignee ? <Btn small title="Take it" icon="pan-tool" onPress={async () => { const r = await run('take', () => api('tickets.take', { id }), 'It is yours now'); if (r) afterTicket(r.ticket); }} busy={busy === 'take'} /> : null}
          {isIt && rights.move && t.status !== 'done' ? <Btn small kind="success" title={t.kind === 'ticket' ? 'Resolve' : 'Mark done'} icon="check-circle" onPress={() => move('done')} busy={busy === 'move'} /> : null}
          {rights.edit ? <Btn small kind="ghost" title="Edit" icon="edit" onPress={() => setEditing(true)} /> : null}
          {rights.reopen ? <Btn small kind="ghost" title="Still a problem? Re-open" icon="replay" onPress={() => { setReason(''); setReopen(true); }} /> : null}
          {rights.delete ? <Btn small kind="ghost" title={isIt ? 'Delete' : 'Cancel ticket'} icon="delete-outline" onPress={() => setConfirmDel(true)} /> : null}
        </View>

        <View style={[d.metaGrid, phone && { flexDirection: 'column' }]}>
          {meta.map(([k, v]) => (
            <View key={k} style={[d.metaCell, phone && { width: '100%' as any }]}>
              <Text style={d.metaKey}>{k}</Text>
              {typeof v === 'string' ? <Text style={d.metaVal}>{v}</Text> : v}
            </View>
          ))}
        </View>

        {t.resolution_note ? (
          <View style={d.resolution}>
            <View style={d.resHead}><Icon name="verified" size={18} color={T.green} /><Text style={d.resTitle}>{t.status === 'done' ? 'Resolved' : 'Last resolution'}{t.resolved_by ? ` by ${t.resolved_by.name}` : ''}</Text></View>
            <Text style={d.resText}>{t.resolution_note}</Text>
          </View>
        ) : null}

        <Text style={d.section}>Details</Text>
        <Text style={[d.body, !t.body && { color: T.muted }]}>{t.body || 'No details written.'}</Text>

        <Text style={d.section}>Pictures {atts.length ? `· ${atts.length}` : ''}</Text>
        <Thumbs pics={pics} size={phone ? 96 : 110} onRemove={async (key) => { const r = await run('rm', () => api('attachments.delete', { attachment_id: Number(key) }), 'Picture removed'); if (r) void load(true); }} />
        <View style={{ height: 8 }} />
        <AddPictures onAdd={upload} compact />
        {busy === 'upload' ? <Text style={d.hint}>Uploading…</Text> : null}

        <Text style={d.section}>Activity</Text>
        {comments.map((c) => <TimelineItem key={c.id} c={c} realm={realm} me={me} />)}
      </ScrollView>

      <View style={d.composer}>
        {isIt ? (
          <View style={d.internalRow}>
            <Switch value={internal} onValueChange={setInternal} trackColor={{ true: T.amber, false: T.border }} thumbColor="#fff" />
            <Icon name={internal ? 'lock' : 'public'} size={15} color={internal ? T.amber : T.muted} />
            <Text style={[d.internalText, internal && { color: T.amber }]}>{internal ? 'Internal note — only the IT team sees it' : t.kind === 'ticket' ? 'Reply — the user sees it' : 'Comment'}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input value={reply} onChangeText={setReply} placeholder={isIt ? (internal ? 'Note for the team…' : 'Write a reply…') : 'Write a message to the IT team…'} multiline compact style={{ maxHeight: 140 }} />
          </View>
          <Btn title="Send" icon="send" onPress={send} busy={busy === 'reply'} disabled={!reply.trim()} kind={internal ? 'dark' : 'primary'} />
        </View>
      </View>

      <DoneDialog ticket={resolveFor ? { ...t, has_resolution: !!t.resolution_note } : null} requireTime={actualTimeRequired} busy={busy === 'move'}
        onCancel={() => setResolveFor(null)} onConfirm={(v) => void move('done', v.note, v.spent_min, true)} />

      <Dialog visible={reopen} onClose={() => setReopen(false)} title="Re-open this ticket"
        footer={<><Btn title="Cancel" kind="ghost" onPress={() => setReopen(false)} /><Btn title="Re-open" icon="replay" busy={busy === 'reopen'} disabled={!reason.trim()} onPress={async () => { const r = await run('reopen', () => api('tickets.reopen', { id, reason: reason.trim() }), 'Sent back to the IT team'); if (r) { setReopen(false); afterTicket(r.ticket); } }} /></>}>
        <Input value={reason} onChangeText={setReason} placeholder="What is still not working?" multiline autoFocus />
      </Dialog>

      <Dialog visible={confirmDel} onClose={() => setConfirmDel(false)} title={isIt ? `Delete ${t.no}?` : 'Cancel this ticket?'}
        footer={<><Btn title="Keep" kind="ghost" onPress={() => setConfirmDel(false)} /><Btn title={isIt ? 'Delete' : 'Cancel ticket'} kind="danger" icon="delete" busy={busy === 'del'} onPress={async () => { const r = await run('del', () => api('tickets.delete', { id }), isIt ? 'Deleted' : 'Ticket cancelled'); if (r) { setConfirmDel(false); onDeleted?.(id); onClose(); } }} /></>}>
        <Text style={d.body}>{t.title}</Text>
      </Dialog>
    </View>
  );
}

const EVENT_ICON: Record<string, string> = { created: 'add-circle-outline', status: 'swap-horiz', assigned: 'person-add-alt', resolved: 'verified', reopened: 'replay', updated: 'edit', deleted: 'delete-outline' };

function TimelineItem({ c, realm, me }: { c: Comment; realm: 'it' | 'client'; me?: ItUser | null }) {
  if (c.kind === 'system') {
    return (
      <View style={d.event}>
        <View style={d.eventIcon}><Icon name={(EVENT_ICON[c.event] || 'info-outline') as any} size={14} color={c.event === 'resolved' ? T.green : T.muted} /></View>
        <Text style={d.eventText}><Text style={{ fontWeight: '900', color: T.ink }}>{c.author.name}</Text> {c.body}</Text>
        <Text style={d.eventTime}>{fmtWhen(c.created_at)}</Text>
      </View>
    );
  }
  const mine = (realm === 'it' && c.author.kind === 'it' && c.author.id === me?.id) || (realm === 'client' && c.author.kind === 'client');
  const fromIt = c.author.kind === 'it';
  return (
    <View style={[d.msg, c.internal && d.msgInternal, mine && { borderColor: `${T.copper}55` }]}>
      <View style={d.msgHead}>
        <Avatar name={c.author.name} id={c.author.id} size={24} />
        <Text style={d.msgName}>{c.author.name}</Text>
        {fromIt && realm === 'client' ? <Text style={d.itTag}>IT TEAM</Text> : null}
        {c.internal ? <View style={d.internalTag}><Icon name="lock" size={11} color={T.amber} /><Text style={d.internalTagText}>INTERNAL</Text></View> : null}
        <View style={{ flex: 1 }} />
        <Text style={d.eventTime}>{fmtWhen(c.created_at)}</Text>
      </View>
      <Text style={d.msgBody} selectable>{c.body}</Text>
    </View>
  );
}

const d = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 24 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  userTag: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: `${T.copper}14` },
  userTagText: { fontSize: 11, fontWeight: '800', color: T.copper },
  title: { fontSize: 19, fontWeight: '900', color: T.ink, marginTop: 10, lineHeight: 25 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 6 },
  metaCell: { width: '50%' as any, padding: 8, gap: 5 },
  metaKey: { fontSize: 10, fontWeight: '900', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  metaVal: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  person: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  label: { fontSize: 11, fontWeight: '800', color: T.yd, backgroundColor: `${T.yd}12`, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  resolution: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: `${T.green}10`, borderWidth: 1, borderColor: `${T.green}44` },
  resHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resTitle: { fontSize: 13, fontWeight: '900', color: T.green },
  resText: { fontSize: 13.5, color: T.ink, marginTop: 6, lineHeight: 19, fontWeight: '600' },
  section: { fontSize: 11, fontWeight: '900', color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: T.ink, lineHeight: 21, fontWeight: '500' },
  hint: { fontSize: 12, color: T.muted, fontWeight: '600' },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  eventIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  eventText: { flex: 1, fontSize: 12.5, color: T.muted, fontWeight: '600' },
  eventTime: { fontSize: 11, color: T.muted, fontWeight: '700' },
  msg: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 10, marginVertical: 5 },
  msgInternal: { backgroundColor: `${T.amber}0F`, borderColor: `${T.amber}55`, borderStyle: 'dashed' },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  msgName: { fontSize: 12.5, fontWeight: '900', color: T.nav },
  itTag: { fontSize: 9, fontWeight: '900', color: T.copper, backgroundColor: `${T.copper}14`, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  internalTag: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, height: 17, borderRadius: 4, backgroundColor: `${T.amber}1A` },
  internalTagText: { fontSize: 9, fontWeight: '900', color: T.amber },
  msgBody: { fontSize: 13.5, color: T.ink, marginTop: 7, lineHeight: 19, fontWeight: '500' },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface, gap: 6 },
  internalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  internalText: { fontSize: 12, fontWeight: '800', color: T.muted },
});
