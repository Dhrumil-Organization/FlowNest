// FILE: src/features/support/components/StorageView.tsx
// STORAGE (IT admin) — what everybody uploaded and where the space goes, and permanent deletes:
//   People    usage per person (chat + ticket files) -> see their files / delete everything
//   Files     every file, newest or biggest first, filter by person / type / name / age,
//             select many -> deleted from the server disk AND the database
//   Chats     every chat with size and messages -> remove a whole chat for good
//   Clean-up  unfinished uploads, cancelled tickets, old files / old chat, a ticket by number
import { T } from '@/src/theme';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fileUrl, SupportCall } from '../api';
import { fileLook, fmtBytes, openLink } from '../files';
import { ago } from '../model';
import { Avatar, Btn, Empty, Input, Segmented, toast, useLayout } from './ui';

type Summary = {
  chat: { files: number; bytes: number }; tickets: { files: number; bytes: number }; deleted_tickets_files: { files: number; bytes: number };
  unfinished_uploads_bytes: number; disk: { free: number; total: number }; max_upload_mb: number;
  people: { key: string; kind: 'it' | 'client'; id: number; name: string; chat_files: number; chat_bytes: number; ticket_files: number; ticket_bytes: number; bytes: number; last_at: string | null }[];
};
type FileRow = { source: 'chat' | 'ticket'; id: number; name: string; size: number; mime: string; type: string; by: { key: string; name: string }; where: string; ref: any; created_at: string; url: string | null; download_url: string | null };
type RoomRow = { id: number; kind: string; name: string; members: number; messages: number; bytes: number; last_at: string | null; archived: boolean };

export function confirmAlert(title: string, message: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    let yes = false;
    void AppAlert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: action, style: 'destructive', onPress: () => { yes = true; } }]).then(() => resolve(yes));
  });
}

export function StorageView({ api, base, onOpenTicket }: { api: SupportCall; base: string; onOpenTicket: (id: number) => void }) {
  const [tab, setTab] = useState<'people' | 'files' | 'chats' | 'clean'>('people');
  const [sum, setSum] = useState<Summary | null>(null);
  const [err, setErr] = useState('');
  const [userFilter, setUserFilter] = useState<{ key: string; name: string } | null>(null);
  const loadSum = useCallback(() => api<Summary>('admin.storage').then((r) => { setSum(r); setErr(''); }).catch((e) => setErr(e?.message || 'Could not load.')), [api]);
  useEffect(() => { void loadSum(); }, [loadSum]);
  const used = sum ? sum.chat.bytes + sum.tickets.bytes : 0;
  const diskPct = sum && sum.disk.total ? 1 - sum.disk.free / sum.disk.total : 0;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 60 }}>
      {err && !sum ? <Empty icon="error-outline" title="Could not load" text={err} /> : null}
      {sum ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Tile icon="forum" color={T.blue} label="Chat files" value={fmtBytes(sum.chat.bytes)} sub={`${sum.chat.files.toLocaleString()} files`} />
          <Tile icon="confirmation-number" color={T.copper} label="Ticket files" value={fmtBytes(sum.tickets.bytes)} sub={`${sum.tickets.files.toLocaleString()} files`} />
          <Tile icon="delete-sweep" color={T.amber} label="In deleted tickets" value={fmtBytes(sum.deleted_tickets_files.bytes)} sub={`${sum.deleted_tickets_files.files} files — Clean-up`} />
          <Tile icon="cloud-off" color={T.muted} label="Unfinished uploads" value={fmtBytes(sum.unfinished_uploads_bytes)} />
          <View style={[s.tile, { minWidth: 200 }]}>
            <Icon name="storage" size={20} color={diskPct > 0.9 ? T.red : T.green} />
            <View style={{ flex: 1 }}>
              <Text style={[s.tileNum, { color: diskPct > 0.9 ? T.red : T.ink }]}>{fmtBytes(sum.disk.free)} free</Text>
              <View style={s.track}><View style={[s.fill, { width: `${Math.round(diskPct * 100)}%` as any, backgroundColor: diskPct > 0.9 ? T.red : diskPct > 0.75 ? T.amber : T.green }]} /></View>
              <Text style={s.tileSub}>of {fmtBytes(sum.disk.total)} · Support uses {fmtBytes(used)}</Text>
            </View>
          </View>
        </ScrollView>
      ) : !err ? <ActivityIndicator color={T.copper} /> : null}

      <Segmented value={tab} onChange={setTab} scroll options={[
        { value: 'people', label: 'People', icon: 'people' }, { value: 'files', label: 'Files', icon: 'insert-drive-file' },
        { value: 'chats', label: 'Chats', icon: 'forum' }, { value: 'clean', label: 'Clean-up', icon: 'cleaning-services' },
      ]} />

      {tab === 'people' && sum ? <People sum={sum} api={api} onChanged={loadSum} onFiles={(p) => { setUserFilter(p); setTab('files'); }} /> : null}
      {tab === 'files' ? <Files api={api} base={base} user={userFilter} onClearUser={() => setUserFilter(null)} onChanged={loadSum} onOpenTicket={onOpenTicket} /> : null}
      {tab === 'chats' ? <Chats api={api} onChanged={loadSum} /> : null}
      {tab === 'clean' ? <Clean api={api} onChanged={loadSum} onOpenTicket={onOpenTicket} /> : null}
    </ScrollView>
  );
}

function Tile({ icon, color, label, value, sub }: { icon: string; color: string; label: string; value: string | number; sub?: string }) {
  return (
    <View style={s.tile}>
      <Icon name={icon as any} size={20} color={color} />
      <View><Text style={[s.tileNum, { color }]}>{value}</Text><Text style={s.tileLabel}>{label}</Text>{sub ? <Text style={s.tileSub}>{sub}</Text> : null}</View>
    </View>
  );
}

function People({ sum, api, onChanged, onFiles }: { sum: Summary; api: SupportCall; onChanged: () => void; onFiles: (p: { key: string; name: string }) => void }) {
  const { phone } = useLayout();
  const [busy, setBusy] = useState('');
  const max = Math.max(1, ...sum.people.map((p) => p.bytes));
  const purge = async (p: Summary['people'][0], messages: boolean) => {
    const ok = await confirmAlert(messages ? `Delete everything of ${p.name}?` : `Delete all files of ${p.name}?`,
      messages ? `All ${p.chat_files + p.ticket_files} files AND all chat messages of ${p.name} are removed from the server and the database. This cannot be undone.`
        : `${p.chat_files + p.ticket_files} files (${fmtBytes(p.bytes)}) are removed from the server disk and the database. Messages stay without the files. This cannot be undone.`, 'Delete for good');
    if (!ok) return;
    setBusy(p.key);
    try {
      const r = await api<{ chat: { files: number; bytes: number }; tickets: { files: number; bytes: number }; messages: number }>('admin.person.purge', { key: p.key, messages: messages ? 1 : 0 }, { timeout: 300000 });
      toast(`Removed ${r.chat.files + r.tickets.files} files (${fmtBytes(r.chat.bytes + r.tickets.bytes)})${messages ? ` and ${r.messages} messages` : ''}`, 'ok');
      onChanged();
    } catch (e: any) { void AppAlert.alert('Could not delete', e?.message || 'Please try again.'); } finally { setBusy(''); }
  };
  if (!sum.people.length) return <Empty icon="cloud-done" title="Nothing uploaded yet" />;
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Who uploaded how much</Text>
      {sum.people.map((p) => (
        <View key={p.key} style={[s.tr, phone && { flexWrap: 'wrap' }]}>
          <Avatar name={p.name} id={p.id} size={30} />
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={s.name}>{p.name} <Text style={s.kind}>{p.kind === 'it' ? 'IT' : 'USER'}</Text></Text>
            <View style={s.track}><View style={[s.fill, { width: `${Math.max(2, Math.round((p.bytes / max) * 100))}%` as any, backgroundColor: T.blue }]} /></View>
            <Text style={s.muted}>Chat {fmtBytes(p.chat_bytes)} ({p.chat_files}) · Tickets {fmtBytes(p.ticket_bytes)} ({p.ticket_files}){p.last_at ? ` · last ${ago(p.last_at)}` : ''}</Text>
          </View>
          <Text style={[s.cell, { width: 80, textAlign: 'right' }]}>{fmtBytes(p.bytes)}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Btn small kind="ghost" title="Files" icon="folder-open" onPress={() => onFiles({ key: p.key, name: p.name })} />
            <Btn small kind="ghost" title="Delete files" icon="delete-outline" busy={busy === p.key} onPress={() => void purge(p, false)} />
            <Btn small kind="danger" title="All + messages" icon="delete-forever" onPress={() => void purge(p, true)} />
          </View>
        </View>
      ))}
    </View>
  );
}

const TYPES = [{ v: '', l: 'All' }, { v: 'image', l: 'Pictures' }, { v: 'pdf', l: 'PDF' }, { v: 'excel', l: 'Excel' }, { v: 'word', l: 'Word' }, { v: 'video', l: 'Video' }, { v: 'zip', l: 'Zip' }, { v: 'other', l: 'Other' }];

function Files({ api, base, user, onClearUser, onChanged, onOpenTicket }: { api: SupportCall; base: string; user: { key: string; name: string } | null; onClearUser: () => void; onChanged: () => void; onOpenTicket: (id: number) => void }) {
  const { phone } = useLayout();
  const [source, setSource] = useState<'chat' | 'ticket'>('chat');
  const [type, setType] = useState('');
  const [sort, setSort] = useState<'date' | 'size'>('size');
  const [q, setQ] = useState('');
  const [older, setOlder] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: FileRow[]; total: number; bytes: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Record<string, FileRow>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    const ymd = older ? older.replace(/[^0-9]/g, '') : '';
    return api<{ items: FileRow[]; total: number; bytes: number; pages: number }>('admin.files', { source, type, sort, q, page, user: user?.key || '', older_than: ymd.length === 8 ? ymd : '', limit: 50 })
      .then(setData).catch((e) => AppAlert.alert('Could not load files', e?.message || '')).finally(() => setLoading(false));
  }, [api, source, type, sort, q, page, user, older]);
  useEffect(() => { const t = setTimeout(() => void load(), q ? 300 : 0); return () => clearTimeout(t); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); setSel({}); }, [source, type, sort, q, user, older]);
  const selected = Object.values(sel);
  const selBytes = selected.reduce((n, f) => n + f.size, 0);
  const del = async (rows: FileRow[]) => {
    if (!rows.length) return;
    const ok = await confirmAlert(`Delete ${rows.length} file${rows.length === 1 ? '' : 's'} for good?`, `${fmtBytes(rows.reduce((n, f) => n + f.size, 0))} is removed from the server disk and the database. Chat messages / ticket replies stay without the file. This cannot be undone.`, 'Delete for good');
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api<{ files: number; bytes: number; tickets: { files: number; bytes: number } }>('admin.files.delete', { items: rows.map((f) => ({ source: f.source, id: f.id })) }, { timeout: 300000 });
      toast(`Deleted ${r.files + r.tickets.files} files · ${fmtBytes(r.bytes + r.tickets.bytes)} freed`, 'ok');
      setSel({}); void load(); onChanged();
    } catch (e: any) { void AppAlert.alert('Could not delete', e?.message || 'Please try again.'); } finally { setBusy(false); }
  };
  const allOn = !!data?.items.length && data.items.every((f) => sel[`${f.source}:${f.id}`]);
  return (
    <View style={s.card}>
      <View style={[s.filters, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Segmented value={source} onChange={setSource} options={[{ value: 'chat', label: 'Chat files', icon: 'forum' }, { value: 'ticket', label: 'Ticket files', icon: 'confirmation-number' }]} />
        <Segmented value={sort} onChange={setSort} options={[{ value: 'size', label: 'Biggest', icon: 'sort' }, { value: 'date', label: 'Newest', icon: 'schedule' }]} />
        <View style={{ flex: 1, minWidth: 160 }}><Input value={q} onChangeText={setQ} placeholder="File name…" icon="search" compact /></View>
        <View style={{ width: phone ? '100%' as any : 150 }}><Input value={older} onChangeText={setOlder} placeholder="Older than YYYY-MM-DD" compact /></View>
      </View>
      <View style={s.chips}>
        {TYPES.map((t) => <Text key={t.v} onPress={() => setType(t.v)} style={[s.chip, type === t.v && s.chipOn]} accessibilityRole="button">{t.l}</Text>)}
        {user ? <TouchableOpacity onPress={onClearUser} style={[s.chip, s.chipOn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{user.name}</Text><Icon name="close" size={12} color="#fff" /></TouchableOpacity> : null}
      </View>
      <View style={s.selBar}>
        <TouchableOpacity onPress={() => setSel(allOn ? {} : Object.fromEntries((data?.items || []).map((f) => [`${f.source}:${f.id}`, f])))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="checkbox" accessibilityState={{ checked: allOn }}>
          <Icon name={allOn ? 'check-box' : 'check-box-outline-blank'} size={20} color={allOn ? T.copper : T.muted} />
          <Text style={s.muted}>{data ? `${data.total.toLocaleString()} files · ${fmtBytes(data.bytes)}` : '…'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {selected.length ? <Btn small kind="danger" icon="delete-forever" title={`Delete ${selected.length} · ${fmtBytes(selBytes)}`} busy={busy} onPress={() => void del(selected)} /> : null}
      </View>
      {loading && !data ? <ActivityIndicator color={T.copper} /> : null}
      {data && !data.items.length ? <Empty icon="cloud-done" title="No files" text="Nothing matches these filters." /> : null}
      {data?.items.map((f) => {
        const k = `${f.source}:${f.id}`;
        const on = !!sel[k];
        const look = fileLook(f.name, f.mime);
        return (
          <Pressable key={k} onPress={() => setSel((cur) => { const n = { ...cur }; if (on) delete n[k]; else n[k] = f; return n; })} style={({ hovered }: any) => [s.fileRow, on && { backgroundColor: `${T.copper}10` }, hovered && !on && { backgroundColor: T.sub }]}>
            <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={20} color={on ? T.copper : T.muted} />
            <View style={[s.fileIcon, { backgroundColor: `${look.color}18` }]}><Icon name={look.icon as any} size={17} color={look.color} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{f.name}</Text>
              <Text style={s.muted} numberOfLines={1}>{f.by.name} · {f.where} · {ago(f.created_at)}</Text>
            </View>
            <Text style={[s.cell, { width: 76, textAlign: 'right' }]}>{fmtBytes(f.size)}</Text>
            {f.download_url ? <TouchableOpacity onPress={() => openLink(fileUrl(base, f.download_url!))} accessibilityLabel={`Download ${f.name}`} style={s.iconBtn}><Icon name="file-download" size={18} color={T.blue} /></TouchableOpacity> : null}
            {f.ref?.ticket_id ? <TouchableOpacity onPress={() => onOpenTicket(f.ref.ticket_id)} accessibilityLabel="Open the ticket" style={s.iconBtn}><Icon name="open-in-new" size={17} color={T.muted} /></TouchableOpacity> : null}
            <TouchableOpacity onPress={() => void del([f])} accessibilityLabel={`Delete ${f.name}`} style={s.iconBtn}><Icon name="delete-outline" size={18} color={T.red} /></TouchableOpacity>
          </Pressable>
        );
      })}
      {data && data.pages > 1 ? (
        <View style={s.pager}>
          <Btn small kind="ghost" icon="chevron-left" title="Previous" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
          <Text style={s.muted}>Page {page} of {data.pages}</Text>
          <Btn small kind="ghost" icon="chevron-right" title="Next" disabled={page >= data.pages} onPress={() => setPage((p) => p + 1)} />
        </View>
      ) : null}
    </View>
  );
}

function Chats({ api, onChanged }: { api: SupportCall; onChanged: () => void }) {
  const [rooms, setRooms] = useState<RoomRow[] | null>(null);
  const [sort, setSort] = useState<'bytes' | 'messages' | 'last'>('bytes');
  const [busy, setBusy] = useState(0);
  const load = useCallback(() => api<{ rooms: RoomRow[] }>('admin.rooms', { sort }).then((r) => setRooms(r.rooms)).catch(() => {}), [api, sort]);
  useEffect(() => { void load(); }, [load]);
  const purge = async (r: RoomRow) => {
    const ok = await confirmAlert(r.kind === 'team' ? 'Empty the IT Team chat?' : `Delete "${r.name}" for good?`,
      `${r.messages.toLocaleString()} messages and ${fmtBytes(r.bytes)} of files are removed from the server and the database${r.kind === 'team' ? ' (the chat itself stays)' : ''}. This cannot be undone.`, 'Delete for good');
    if (!ok) return;
    setBusy(r.id);
    try {
      const x = await api<{ messages: number }>('admin.room.purge', { room_id: r.id }, { timeout: 300000 });
      toast(`Removed ${x.messages.toLocaleString()} messages`, 'ok'); void load(); onChanged();
    } catch (e: any) { void AppAlert.alert('Could not delete', e?.message || 'Please try again.'); } finally { setBusy(0); }
  };
  const KIND: Record<string, string> = { team: 'IT TEAM', help: 'HELP', group: 'GROUP', direct: 'DIRECT' };
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[s.cardTitle, { flex: 1, marginBottom: 0 }]}>Every chat</Text>
        <Segmented value={sort} onChange={setSort} options={[{ value: 'bytes', label: 'Size' }, { value: 'messages', label: 'Messages' }, { value: 'last', label: 'Recent' }]} />
      </View>
      {!rooms ? <ActivityIndicator color={T.copper} /> : null}
      {rooms?.map((r) => (
        <View key={r.id} style={s.tr}>
          <Text style={s.kind}>{KIND[r.kind] || r.kind}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{r.name || 'Chat'}{r.archived ? ' (removed)' : ''}</Text>
            <Text style={s.muted}>{r.messages.toLocaleString()} messages · {r.members} people{r.last_at ? ` · last ${ago(r.last_at)}` : ''}</Text>
          </View>
          <Text style={[s.cell, { width: 76, textAlign: 'right' }]}>{fmtBytes(r.bytes)}</Text>
          <Btn small kind="ghost" icon="delete-forever" title={r.kind === 'team' ? 'Empty' : 'Delete'} busy={busy === r.id} onPress={() => void purge(r)} />
        </View>
      ))}
    </View>
  );
}

function Clean({ api, onChanged, onOpenTicket }: { api: SupportCall; onChanged: () => void; onOpenTicket: (id: number) => void }) {
  const [busy, setBusy] = useState('');
  const [days, setDays] = useState('180');
  const [chatDays, setChatDays] = useState('365');
  const [tk, setTk] = useState('');
  const run = async (what: string, title: string, msg: string, extra: Record<string, any> = {}) => {
    if (!(await confirmAlert(title, msg, 'Yes, clean up'))) return;
    setBusy(what);
    try {
      const r = await api<any>('admin.cleanup', { what, ...extra }, { timeout: 600000 });
      const parts: string[] = [];
      if (r.removed !== undefined) parts.push(`${r.removed} removed`);
      if (r.tickets !== undefined && typeof r.tickets === 'number') parts.push(`${r.tickets} tickets · ${fmtBytes(r.bytes || 0)}`);
      if (r.messages !== undefined) parts.push(`${r.messages} messages`);
      if (r.chat) parts.push(`${r.chat.files + r.tickets.files} files · ${fmtBytes(r.chat.bytes + r.tickets.bytes)}`);
      toast(`Done — ${parts.join(', ') || 'nothing to remove'}`, 'ok');
      onChanged();
    } catch (e: any) { void AppAlert.alert('Clean-up failed', e?.message || 'Please try again.'); } finally { setBusy(''); }
  };
  const purgeTicket = async () => {
    const id = Number(tk.replace(/[^0-9]/g, ''));
    if (!id) { void AppAlert.alert('Ticket number', 'Enter a number like TK-1234 or 1234.'); return; }
    if (!(await confirmAlert(`Remove #${id} for good?`, 'The ticket / task, all its replies and files are removed from the server and the database. Everybody sees it disappear at once. This cannot be undone.', 'Remove for good'))) return;
    setBusy('tk');
    try { const r = await api<{ files: number; bytes: number }>('admin.ticket.purge', { id }); toast(`#${id} removed · ${r.files} files (${fmtBytes(r.bytes)})`, 'ok'); setTk(''); onChanged(); }
    catch (e: any) { void AppAlert.alert('Could not remove', e?.message || 'Please try again.'); } finally { setBusy(''); }
  };
  const Row = ({ icon, title, text, children }: { icon: string; title: string; text: string; children: React.ReactNode }) => (
    <View style={s.cleanRow}>
      <View style={s.cleanIcon}><Icon name={icon as any} size={19} color={T.copper} /></View>
      <View style={{ flex: 1, minWidth: 200 }}><Text style={s.name}>{title}</Text><Text style={s.muted}>{text}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{children}</View>
    </View>
  );
  return (
    <View style={s.card}>
      <Row icon="cloud-off" title="Unfinished uploads" text="Files that were never sent (closed app, cancelled). Safe any time.">
        <Btn small kind="ghost" title="Clean" busy={busy === 'uploads'} onPress={() => void run('uploads', 'Remove unfinished uploads?', 'Uploads older than one hour that were never attached are removed.')} />
      </Row>
      <Row icon="delete-sweep" title="Deleted / cancelled tickets" text="They are hidden already; this removes them, their replies and files for good.">
        <Btn small kind="ghost" title="Remove" busy={busy === 'deleted'} onPress={() => void run('deleted', 'Remove deleted tickets for good?', 'Every deleted or cancelled ticket / task is removed with its replies and files.')} />
      </Row>
      <Row icon="history" title="Old files" text="Chat + ticket files older than N days (messages and replies stay).">
        <View style={{ width: 70 }}><Input value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} compact keyboardType="number-pad" /></View>
        <Text style={s.muted}>days</Text>
        <Btn small kind="ghost" title="Remove" busy={busy === 'files_older'} onPress={() => void run('files_older', `Remove files older than ${days} days?`, 'They are removed from the server disk and the database.', { days: Number(days) || 0 })} />
      </Row>
      <Row icon="forum" title="Old chat" text="Every chat message older than N days (at least 7), with its files.">
        <View style={{ width: 70 }}><Input value={chatDays} onChangeText={(t) => setChatDays(t.replace(/[^0-9]/g, ''))} compact keyboardType="number-pad" /></View>
        <Text style={s.muted}>days</Text>
        <Btn small kind="ghost" title="Remove" busy={busy === 'chat_older'} onPress={() => void run('chat_older', `Remove chat older than ${chatDays} days?`, 'Messages and their files are removed for good from all chats.', { days: Number(chatDays) || 0 })} />
      </Row>
      <Row icon="confirmation-number" title="Remove one ticket for good" text="Any ticket or task by its number — replies and files too.">
        <View style={{ width: 110 }}><Input value={tk} onChangeText={setTk} placeholder="TK-1234" compact autoCapitalize="characters" /></View>
        {tk && Number(tk.replace(/[^0-9]/g, '')) ? <Btn small kind="ghost" title="Open" onPress={() => onOpenTicket(Number(tk.replace(/[^0-9]/g, '')))} /> : null}
        <Btn small kind="danger" title="Remove" busy={busy === 'tk'} onPress={() => void purgeTicket()} />
      </Row>
      <Row icon="vpn-key-off" title="Expired logins" text="IT Desk sessions that ended.">
        <Btn small kind="ghost" title="Clean" busy={busy === 'sessions'} onPress={() => void run('sessions', 'Remove expired logins?', 'Only sessions that already expired.')} />
      </Row>
      <Row icon="query-stats" title="Traffic counters" text="The per-minute counters of the Server page (kept 3 days).">
        <Btn small kind="ghost" title="Clear" busy={busy === 'traffic'} onPress={() => void run('traffic', 'Clear traffic counters?', 'The Server page starts counting again.')} />
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, minWidth: 140 },
  tileNum: { fontSize: 16, fontWeight: '900' },
  tileLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  tileSub: { fontSize: 10, fontWeight: '700', color: T.muted },
  track: { height: 5, borderRadius: 3, backgroundColor: T.alt, overflow: 'hidden', marginVertical: 3 },
  fill: { height: 5, borderRadius: 3 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 4 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: T.nav, marginBottom: 6 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  name: { fontSize: 13, fontWeight: '800', color: T.ink },
  kind: { fontSize: 9, fontWeight: '900', color: T.copper, letterSpacing: 0.5 },
  muted: { fontSize: 11, fontWeight: '700', color: T.muted },
  cell: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { fontSize: 11, fontWeight: '800', color: T.nav, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: T.alt, overflow: 'hidden' },
  chipOn: { backgroundColor: T.copper, color: '#fff' },
  selBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border, minHeight: 46 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: T.hair, borderRadius: 6 },
  fileIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 10 },
  cleanRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.hair, flexWrap: 'wrap' },
  cleanIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${T.copper}14`, alignItems: 'center', justifyContent: 'center' },
});
