// FILE: src/features/support/components/NoticeBell.tsx
// The BELL (IT Desk + Support): new tickets, replies, status changes, assignments, "added you to
// a group", IT admin broadcasts. Live (WebSocket / fast pulse). Tap -> opens the ticket / chat.
// Inside: turn on phone / browser notifications for this device; the IT admin sends broadcasts.
import { T } from '@/src/theme';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { create } from 'zustand';
import type { SupportCall } from '../api';
import { useChat } from '../chatStore';
import { ago } from '../model';
import { enablePush, pushState, PushState } from '../push';
import { Btn, Dialog, Field, Input, Panel, Segmented, toast } from './ui';

export type Notice = { id: string; type: string; title: string; body: string; link: { ticket_id?: number; room_id?: number; note_id?: number }; read: boolean; at: string; by?: string };

type NS = { unread: number; items: Notice[]; next: string | null; loaded: boolean; setUnread: (n: number) => void };
export const useNotices = create<NS>((set) => ({ unread: 0, items: [], next: null, loaded: false, setUnread: (n) => set({ unread: n }) }));

const ICON: Record<string, { icon: string; color: string }> = {
  ticket_new: { icon: 'mark-email-unread', color: T.copper }, ticket_raised: { icon: 'confirmation-number', color: T.blue },
  ticket_status: { icon: 'published-with-changes', color: T.green }, ticket_reply: { icon: 'chat', color: T.blue },
  ticket_reopened: { icon: 'replay', color: T.red }, assigned: { icon: 'assignment-ind', color: T.purple },
  group_added: { icon: 'group-add', color: T.blue }, broadcast: { icon: 'campaign', color: T.amber },
};

export function NoticeBell({ api, admin, onOpen }: { api: SupportCall; admin?: boolean; onOpen: (link: Notice['link']) => void }) {
  // bell = notifications + unread chat messages (every chat: direct, groups, IT Team, IT Help)
  const unread = useNotices((s) => s.unread) + useChat((s) => s.unread);
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={b.bell} accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}>
        <Icon name={unread ? 'notifications-active' : 'notifications-none'} size={21} color="#fff" />
        {unread ? <View style={b.badge}><Text style={b.badgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
      </TouchableOpacity>
      <Panel visible={open} onClose={() => setOpen(false)} title="Notifications" subtitle="Tickets, replies, groups and announcements" width={460}>
        {open ? <NoticeList api={api} admin={admin} onOpen={(l) => { setOpen(false); onOpen(l); }} /> : null}
      </Panel>
    </>
  );
}

export async function refreshNoticeCount(api: SupportCall) {
  try { const r = await api<{ unread: number; items: Notice[]; next: string | null }>('notices.list'); useNotices.setState({ unread: r.unread, items: r.items, next: r.next, loaded: true }); } catch { /* later */ }
}

function NoticeList({ api, admin, onOpen }: { api: SupportCall; admin?: boolean; onOpen: (l: Notice['link']) => void }) {
  const { items, next, loaded, unread } = useNotices();
  const chats = useChat((s) => s.rooms).filter((r) => r.unread > 0);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const [bc, setBc] = useState(false);
  useEffect(() => { void refreshNoticeCount(api); void pushState().then(setPush); }, [api]);
  const more = async () => {
    if (!next || busy) return;
    setBusy(true);
    try { const r = await api<{ items: Notice[]; next: string | null }>('notices.list', { before: next }); useNotices.setState((s) => ({ items: [...s.items, ...r.items.filter((x) => !s.items.some((y) => y.id === x.id))], next: r.next })); } finally { setBusy(false); }
  };
  const tap = async (n: Notice) => {
    if (!n.read) {
      useNotices.setState((s) => ({ items: s.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)), unread: Math.max(0, s.unread - 1) }));
      void api<{ unread: number }>('notices.read', { ids: [n.id] }).then((r) => useNotices.setState({ unread: r.unread })).catch(() => {});
    }
    if (n.link.ticket_id || n.link.room_id || n.link.note_id) onOpen(n.link);
  };
  const allRead = async () => {
    useNotices.setState((s) => ({ items: s.items.map((x) => ({ ...x, read: true })), unread: 0 }));
    await api('notices.read', { all: 1 }).catch(() => {});
  };
  const turnOn = async () => {
    try {
      const st = await enablePush(api);
      setPush(st);
      if (st === 'on') toast('Notifications are on for this device', 'ok');
      else if (st === 'blocked') void AppAlert.alert('Notifications are blocked', 'Allow notifications for FlowNest in the browser / phone settings, then try again.');
      else if (st === 'unsupported') void AppAlert.alert('Not available here', 'This browser cannot show notifications. On iPhone, add FlowNest to the Home Screen first (Share → Add to Home Screen).');
    } catch (e: any) { void AppAlert.alert('Could not turn on notifications', e?.message || 'Please try again.'); }
  };
  return (
    <View style={{ flex: 1, gap: 10, padding: 12 }}>
      {push && push !== 'on' ? (
        <View style={b.pushBox}>
          <Icon name="notifications-off" size={20} color={T.amber} />
          <Text style={b.pushText}>{push === 'blocked' ? 'Notifications are blocked for this device.' : push === 'unsupported' ? 'This browser cannot show notifications.' : 'Get new tickets and messages even when FlowNest is closed.'}</Text>
          {push !== 'unsupported' ? <Btn small title="Turn on" icon="notifications-active" onPress={turnOn} /> : null}
        </View>
      ) : push === 'on' ? <Text style={b.muted}><Icon name="check-circle" size={12} color={T.green} /> Notifications are on for this device.</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[b.muted, { flex: 1 }]}>{unread ? `${unread} new` : 'All caught up'}</Text>
        {admin ? <Btn small kind="ghost" title="Broadcast" icon="campaign" onPress={() => setBc(true)} /> : null}
        {unread ? <Btn small kind="ghost" title="Mark all read" icon="done-all" onPress={allRead} /> : null}
      </View>
      {chats.length ? (
        <View style={b.chatBox}>
          <Text style={b.section}>UNREAD CHATS</Text>
          {chats.slice(0, 8).map((r) => (
            <Pressable key={r.id} onPress={() => onOpen({ room_id: r.id })} style={({ hovered }: any) => [b.row, b.rowNew, { marginBottom: 2 }, hovered && { backgroundColor: T.sub }]} accessibilityRole="button" accessibilityLabel={`${r.name}, ${r.unread} unread`}>
              <View style={[b.icon, { backgroundColor: `${T.blue}18` }]}><Icon name={(r.kind === 'direct' ? 'person' : r.kind === 'team' ? 'groups' : r.kind === 'help' ? 'support-agent' : 'workspaces') as any} size={18} color={T.blue} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[b.title, { fontWeight: '900' }]} numberOfLines={1}>{r.name}</Text>
                {r.last ? <Text style={b.body} numberOfLines={1}>{r.kind === 'direct' ? '' : `${r.last.user_name.split(' ')[0]}: `}{r.last.text}</Text> : null}
                <Text style={b.time}>{ago(r.last_at)}</Text>
              </View>
              <View style={b.chatCount}><Text style={b.chatCountText}>{r.unread > 99 ? '99+' : r.unread}</Text></View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!loaded ? <ActivityIndicator color={T.copper} /> : null}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        onEndReached={more}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={loaded ? <Text style={[b.muted, { textAlign: 'center', marginTop: 30 }]}>Nothing yet.</Text> : null}
        ListFooterComponent={busy ? <ActivityIndicator color={T.copper} /> : null}
        renderItem={({ item: n }) => {
          const look = ICON[n.type] || { icon: 'notifications', color: T.nav };
          return (
            <Pressable onPress={() => void tap(n)} style={({ hovered }: any) => [b.row, !n.read && b.rowNew, hovered && { backgroundColor: T.sub }]} accessibilityRole="button">
              <View style={[b.icon, { backgroundColor: `${look.color}18` }]}><Icon name={look.icon as any} size={18} color={look.color} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[b.title, !n.read && { fontWeight: '900' }]} numberOfLines={2}>{n.title}</Text>
                {n.body ? <Text style={b.body} numberOfLines={3}>{n.body}</Text> : null}
                <Text style={b.time}>{n.type === 'broadcast' && n.by ? `${n.by} · ` : ''}{ago(n.at)}</Text>
              </View>
              {!n.read ? <View style={b.dot} /> : null}
            </Pressable>
          );
        }}
      />
      {admin ? <BroadcastDialog visible={bc} onClose={() => setBc(false)} api={api} /> : null}
    </View>
  );
}

function BroadcastDialog({ visible, onClose, api }: { visible: boolean; onClose: () => void; api: SupportCall }) {
  const [aud, setAud] = useState<'all' | 'it' | 'client'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setTitle(''); setBody(''); setAud('all'); } }, [visible]);
  const send = async () => {
    if (!title.trim()) { void AppAlert.alert('Title', 'Write a short title.'); return; }
    setBusy(true);
    try {
      const r = await api<{ people: number }>('broadcast.send', { audience: aud, title: title.trim(), body: body.trim() });
      toast(`Sent to ${r.people.toLocaleString()} people`, 'ok');
      onClose();
      void refreshNoticeCount(api);
    } catch (e: any) { void AppAlert.alert('Could not send', e?.message || 'Please try again.'); } finally { setBusy(false); }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title="Broadcast" width={460}
      footer={<><Btn title="Cancel" kind="ghost" onPress={onClose} /><Btn title="Send to everybody" icon="campaign" busy={busy} disabled={!title.trim()} onPress={send} /></>}>
      <Segmented value={aud} onChange={setAud} options={[{ value: 'all', label: 'Everybody' }, { value: 'it', label: 'IT team' }, { value: 'client', label: 'FlowNest users' }]} />
      <Field label="Title"><Input value={title} onChangeText={setTitle} placeholder="e.g. Server maintenance tonight 10 pm" maxLength={200} /></Field>
      <Field label="Message"><Input value={body} onChangeText={setBody} placeholder="Details (optional)" multiline style={{ minHeight: 90 }} maxLength={1000} /></Field>
      <Text style={b.muted}>Shows in everybody's bell and comes as a phone / browser notification.</Text>
    </Dialog>
  );
}

const b = StyleSheet.create({
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: T.nav },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
  pushBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: `${T.amber}12`, borderWidth: 1, borderColor: `${T.amber}40`, flexWrap: 'wrap' },
  pushText: { flex: 1, minWidth: 160, fontSize: 12, fontWeight: '700', color: T.ink },
  muted: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 12, marginBottom: 4 },
  rowNew: { backgroundColor: `${T.blue}0C` },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '800', color: T.ink },
  body: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  time: { fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 4 },
  chatBox: { gap: 2 },
  section: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6, marginBottom: 2 },
  chatCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, alignSelf: 'center' },
  chatCountText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: T.blue, marginTop: 6 },
});
