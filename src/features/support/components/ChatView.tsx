// FILE: src/features/support/components/ChatView.tsx
// CHAT — the same screen in the IT Desk and in Raise ticket (FlowNest users).
//   • rooms: IT Team (IT only) · IT Help (a user + the whole IT team) · groups · direct chats
//   • text, reply, edit (the word "edited" shows) / delete, pictures, any files, a whole folder
//     (web) — "Download all" gives one zip with the folders inside
//   • every file uploads as its own job with its own progress; retry sends only what failed
//   • ✓ sent · ✓✓ seen (direct / help) · "Seen by N" (groups) — like WhatsApp
//   • live: WebSocket, or a 1–3 s pulse when the WebSocket is down (set by the IT admin)
//   • older messages load 40 at a time while scrolling up (millions of messages stay smooth)
//   • search in every chat you can read — Bloom filter answers "no match" instantly
//   • validations (size, type, count, empty folder) come in the app's common alert
//   • the composer stays above the keyboard (phones, tablets, iOS Safari) like WhatsApp
//   • paste a copied picture / file (Ctrl+V, or "Paste" on phones), drag & drop files (web)
//   • copy a message, forward it (with its files) to other chats / groups
import { T } from '@/src/theme';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fileUrl } from '../api';
import { ChatFile, ChatMessage, ChatRoom, Pending, Person, useChat } from '../chatStore';
import { canPickFolder, checkFiles, clipboardHasImage, copyText, fileLook, fmtBytes, fromWebFiles, openLink, PickedFile, pasteFromClipboard, pickFiles, pickFolder, pickPhotos, takePicture } from '../files';
import { useKeyboardInset } from '../keyboard';
import { ago, fmtWhen, toYmd, ymdToDate } from '../model';
import type { LiveStatus } from '../realtime';
import { Viewer } from './Pictures';
import { Avatar, Btn, Dialog, Empty, Field, IconBtn, Input, toast, useLayout } from './ui';

type Props = {
  base: string;
  live: LiveStatus;
  /** IT admin: oversight of groups, delete any message, manage any group */
  admin?: boolean;
  /** may start groups (Settings) */
  canGroup?: boolean;
  title?: string;
};

const WEB = Platform.OS === 'web';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toDate = (iso: string) => new Date(String(iso).replace(' ', 'T'));
const dayKey = (iso: string) => toYmd(toDate(iso));
const dayLabel = (k: number) => {
  const today = toYmd(new Date());
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (k === today) return 'Today';
  if (k === toYmd(y)) return 'Yesterday';
  const d = ymdToDate(k)!;
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
};
const hm = (iso: string) => { const d = toDate(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ROOM_LOOK: Record<string, { icon: string; color: string }> = {
  team: { icon: 'groups', color: T.copper }, help: { icon: 'support-agent', color: '#0B7285' }, group: { icon: 'workspaces', color: T.blue }, direct: { icon: 'person', color: T.blue },
};

function RoomIcon({ r, size = 40 }: { r: ChatRoom; size?: number }) {
  if ((r.kind === 'direct' || (r.kind === 'help' && r.other)) && r.other) return <Avatar name={r.other.name} id={r.other.id} color={r.other.color} size={size} />;
  const look = ROOM_LOOK[r.kind] || ROOM_LOOK.group;
  return <View style={[c.roomIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: look.color }]}><Icon name={look.icon as any} size={size * 0.52} color="#fff" /></View>;
}

export function ChatView({ base, live, admin = false, canGroup = false, title = 'Chat' }: Props) {
  const { phone } = useLayout();
  const rooms = useChat((s) => s.rooms);
  const roomsLoaded = useChat((s) => s.roomsLoaded);
  const roomsError = useChat((s) => s.roomsError);
  const activeId = useChat((s) => s.activeId);
  const meKey = useChat((s) => s.meKey);
  const open = useChat((s) => s.open);
  const [q, setQ] = useState('');
  const [newChat, setNewChat] = useState<'direct' | 'group' | null>(null);

  // "on screen": mounted + (web) the tab is visible -> only then messages count as read
  useEffect(() => {
    const d: any = WEB ? (globalThis as any).document : null;
    const upd = () => useChat.getState().setViewing(!d || d.visibilityState !== 'hidden');
    upd();
    d?.addEventListener?.('visibilitychange', upd);
    const sub = AppState.addEventListener('change', (s) => useChat.getState().setViewing(s === 'active' && (!d || d.visibilityState !== 'hidden')));
    return () => { d?.removeEventListener?.('visibilitychange', upd); sub.remove(); useChat.getState().setViewing(false); };
  }, []);

  useEffect(() => {
    const st = useChat.getState();
    void st.loadRooms();
    void st.loadBlooms();
    if (!phone && st.activeId === null) {
      const t = setTimeout(() => { const s2 = useChat.getState(); if (s2.activeId === null && s2.rooms[0]) void s2.open(s2.rooms[0].id); }, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const room = rooms.find((r) => r.id === activeId) || null;
  const showList = !phone || !room;
  const showRoom = !phone || !!room;
  const kb = useKeyboardInset();

  if (roomsError && !rooms.length) return <View style={c.wrap}><Empty icon="speaker-notes-off" title="Chat is not available" text={roomsError} /></View>;

  return (
    <View style={[c.wrap, kb.inset ? { paddingBottom: kb.inset } : null]} ref={kb.ref} collapsable={false}>
      {showList ? (
        <View style={[c.listPane, phone && { width: '100%' as any, borderRightWidth: 0 }]}>
          <View style={c.listHead}>
            <Text style={c.listTitle}>{title}</Text>
            {live !== 'live' ? <View style={c.fast}><Icon name="bolt" size={11} color={T.amber} /><Text style={c.fastText}>fast refresh</Text></View> : null}
            <View style={{ flex: 1 }} />
            <IconBtn icon="person-add-alt" label="New chat" onPress={() => setNewChat('direct')} />
            {canGroup ? <IconBtn icon="group-add" label="New group" onPress={() => setNewChat('group')} /> : null}
          </View>
          <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
            <Input value={q} onChangeText={setQ} placeholder="Search all chats…" icon="search" autoCorrect={false}
              onFocus={() => { if (Date.now() - useChat.getState().bloomsAt > 120000) void useChat.getState().loadBlooms(); }}
              right={q ? <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="Clear search"><Icon name="cancel" size={17} color={T.muted} /></TouchableOpacity> : null} />
          </View>
          {q.trim() ? <SearchResults q={q} onPick={(rid, mid) => { setQ(''); void open(rid, mid); }} /> : (
            <FlatList
              data={rooms}
              keyExtractor={(r) => String(r.id)}
              renderItem={({ item }) => <RoomRow r={item} on={item.id === activeId} meKey={meKey} onPress={() => void open(item.id)} />}
              ListEmptyComponent={roomsLoaded ? <Empty icon="forum" title="No chats yet" /> : <ActivityIndicator color={T.copper} style={{ marginTop: 30 }} />}
              contentContainerStyle={{ paddingBottom: 30 }}
            />
          )}
        </View>
      ) : null}
      {showRoom ? (
        <View style={{ flex: 1, minWidth: 0 }}>
          {room ? <RoomPane key={room.id} room={room} base={base} admin={admin} onBack={phone ? () => void open(null) : undefined} />
            : <Empty icon="forum" title="Pick a chat" text="Start a chat with the person icon — anybody in IT or FlowNest." />}
        </View>
      ) : null}
      <NewChatDialog kind={newChat} onClose={() => setNewChat(null)} />
    </View>
  );
}

/* ------------------------------- room list ------------------------------- */

function RoomRow({ r, on, meKey, onPress }: { r: ChatRoom; on: boolean; meKey: string; onPress: () => void }) {
  const mineLast = r.last && r.last.user_key === meKey;
  const seen = mineLast && r.reads.some((x) => x.last_read_id >= (r.last?.id || 0));
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }: any) => [c.room, on && c.roomOn, !on && (hovered || pressed) && { backgroundColor: T.sub }]} accessibilityRole="button" accessibilityLabel={`${r.name}${r.unread ? `, ${r.unread} unread` : ''}`}>
      <RoomIcon r={r} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[c.roomName, r.unread ? { fontWeight: '900' } : null]} numberOfLines={1}>{r.name}</Text>
          {!r.is_member ? <Icon name="visibility" size={13} color={T.muted} /> : null}
          <View style={{ flex: 1 }} />
          <Text style={[c.roomTime, r.unread ? { color: T.copper } : null]}>{r.last ? ago(r.last_at) : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {mineLast ? <Icon name={seen ? 'done-all' : 'done'} size={14} color={seen ? '#2F80ED' : T.muted} /> : null}
          <Text style={[c.roomLast, r.unread ? { color: T.ink, fontWeight: '800' } : null]} numberOfLines={1}>
            {r.last ? `${mineLast ? 'You' : r.kind === 'direct' ? '' : r.last.user_name.split(' ')[0]}${mineLast || r.kind !== 'direct' ? ': ' : ''}${r.last.text}` : r.sub || 'No messages yet'}
          </Text>
          {r.unread ? <View style={c.unread}><Text style={c.unreadText}>{r.unread > 99 ? '99+' : r.unread}</Text></View> : null}
        </View>
      </View>
    </Pressable>
  );
}

function SearchResults({ q, onPick }: { q: string; onPick: (roomId: number, msgId: number) => void }) {
  const api = useChat((s) => s.api);
  const mayFind = useChat((s) => s.mayFind);
  const [state, setState] = useState<{ loading: boolean; instant: boolean; items: (ChatMessage & { room_name: string })[] }>({ loading: true, instant: false, items: [] });
  useEffect(() => {
    let alive = true;
    if (!mayFind(q)) { setState({ loading: false, instant: true, items: [] }); return undefined; }
    setState((s) => ({ ...s, loading: true, instant: false }));
    const t = setTimeout(() => {
      api?.<{ results: (ChatMessage & { room_name: string })[] }>('chat.search', { q }).then((r) => { if (alive) setState({ loading: false, instant: false, items: r.results }); }).catch(() => alive && setState({ loading: false, instant: false, items: [] }));
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, api, mayFind]);
  if (state.loading) return <ActivityIndicator color={T.copper} style={{ marginTop: 20 }} />;
  if (!state.items.length) return <Empty icon="search-off" title="No match" text={state.instant ? 'Checked instantly — no chat has these words.' : undefined} />;
  return (
    <FlatList data={state.items} keyExtractor={(m) => String(m.id)} renderItem={({ item }) => (
      <Pressable onPress={() => onPick(item.room_id, item.id)} style={({ hovered }: any) => [c.result, hovered && { backgroundColor: T.sub }]}>
        <Text style={c.resultRoom} numberOfLines={1}>{item.room_name} · {item.user.name} · {ago(item.created_at)}</Text>
        <Text style={c.resultText} numberOfLines={2}>{item.body || item.files.map((f) => f.name).join(', ')}</Text>
      </Pressable>
    )} />
  );
}

/* --------------------------------- room ---------------------------------- */

type Row = { k: string; day?: number; msg?: ChatMessage; pend?: Pending; first?: boolean; newLine?: boolean };

/** who has read up to this message (everybody else in the room) */
function seenInfo(room: ChatRoom, reads: Record<string, number>, m: ChatMessage) {
  const list = room.reads.map((x) => ({ key: x.key, name: x.name, last: reads[x.key] ?? x.last_read_id }));
  const seenBy = list.filter((x) => x.last >= m.id);
  if (room.kind === 'direct') return { seen: seenBy.length > 0, all: seenBy.length > 0, n: seenBy.length, names: seenBy.map((x) => x.name) };
  if (room.kind === 'help') {
    // user side: seen when somebody from IT read it · IT side: seen when the user read it
    const target = list.filter((x) => (m.user.kind === 'client' ? x.key.startsWith('it:') : x.key.startsWith('client:')));
    const ok = target.filter((x) => x.last >= m.id);
    return { seen: ok.length > 0, all: ok.length > 0, n: ok.length, names: ok.map((x) => x.name) };
  }
  return { seen: seenBy.length > 0, all: list.length > 0 && seenBy.length === list.length, n: seenBy.length, names: seenBy.map((x) => x.name) };
}

function RoomPane({ room, base, admin, onBack }: { room: ChatRoom; base: string; admin: boolean; onBack?: () => void }) {
  const { phone } = useLayout();
  const byRoom = useChat((s) => s.byRoom[room.id]);
  const msgs = useChat((s) => s.msgs);
  const pending = useChat((s) => s.pending[room.id]);
  const focusId = useChat((s) => s.focusId);
  const loadOlder = useChat((s) => s.loadOlder);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [info, setInfo] = useState(false);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState<{ pics: { key: string; uri: string; name?: string }[]; index: number } | null>(null);
  const firstUnread = useRef(room.unread ? room.last_read_id : -1).current;
  const listRef = useRef<FlatList<Row>>(null);
  const reads = byRoom?.reads || {};
  const addRef = useRef<((l: PickedFile[]) => void) | null>(null);
  const paneRef = useRef<View>(null);
  const [dragging, setDragging] = useState(false);
  const [forward, setForward] = useState<ChatMessage | null>(null);

  // web: drop files anywhere on the chat
  useEffect(() => {
    if (!WEB) return undefined;
    const node: any = paneRef.current;
    if (!node?.addEventListener) return undefined;
    let depth = 0;
    const over = (e: any) => { if (e.dataTransfer?.types?.includes?.('Files')) { e.preventDefault(); } };
    const enter = (e: any) => { if (e.dataTransfer?.types?.includes?.('Files')) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = (e: any) => { e.preventDefault(); depth = 0; setDragging(false); const l = fromWebFiles(e.dataTransfer?.files); if (l.length) addRef.current?.(l); };
    node.addEventListener('dragover', over); node.addEventListener('dragenter', enter); node.addEventListener('dragleave', leave); node.addEventListener('drop', drop);
    return () => { node.removeEventListener('dragover', over); node.removeEventListener('dragenter', enter); node.removeEventListener('dragleave', leave); node.removeEventListener('drop', drop); };
  }, []);

  // newest first (inverted list), with day lines and the "new messages" line
  const rows: Row[] = useMemo(() => {
    const ids = byRoom?.ids || [];
    const out: Row[] = [];
    (pending || []).slice().reverse().forEach((p) => out.push({ k: `p${p.key}`, pend: p }));
    for (let i = ids.length - 1; i >= 0; i--) {
      const m = msgs[ids[i]];
      if (!m) continue;
      const older = i > 0 ? msgs[ids[i - 1]] : null;
      const sameDay = older && dayKey(older.created_at) === dayKey(m.created_at);
      const grouped = older && sameDay && older.user.key === m.user.key && older.kind === 'text' && m.kind === 'text' && toDate(m.created_at).getTime() - toDate(older.created_at).getTime() < 5 * 60000;
      out.push({ k: `m${m.id}`, msg: m, first: !grouped });
      if (firstUnread >= 0 && older && older.id <= firstUnread && m.id > firstUnread && !m.mine) out.push({ k: 'new', newLine: true });
      if (!sameDay) out.push({ k: `d${dayKey(m.created_at)}-${m.id}`, day: dayKey(m.created_at) });
    }
    return out;
  }, [byRoom?.ids, msgs, pending, firstUnread]);

  useEffect(() => {
    if (!focusId) return;
    const i = rows.findIndex((r) => r.msg?.id === focusId);
    if (i >= 0) setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 }), 300);
  }, [focusId, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPics = (files: ChatFile[], f: ChatFile) => {
    const pics = files.filter((x) => x.image).map((x) => ({ key: String(x.id), uri: fileUrl(base, x.url), name: x.name }));
    setViewer({ pics, index: Math.max(0, pics.findIndex((p) => p.key === String(f.id))) });
  };
  const sub = room.kind === 'group' && !room.is_member ? `${room.sub} · you see it as IT admin` : room.sub;

  return (
    <View style={{ flex: 1 }} ref={paneRef} collapsable={false}>
      {dragging ? <View style={c.dropZone} pointerEvents="none"><Icon name="file-upload" size={34} color={T.blue} /><Text style={c.dropText}>Drop files to send in {room.name}</Text></View> : null}
      <View style={c.roomHead}>
        {onBack ? <IconBtn icon="arrow-back" label="Back to chats" onPress={onBack} /> : null}
        <RoomIcon r={room} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={c.headName} numberOfLines={1}>{room.name}</Text>
          <Text style={c.headSub} numberOfLines={1}>{sub}</Text>
        </View>
        {room.kind !== 'direct' ? <IconBtn icon="info-outline" label="Members" onPress={() => setInfo(true)} /> : null}
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {byRoom?.error ? <Empty icon="error-outline" title="Could not open" text={byRoom.error} action={<Btn small kind="ghost" title="Retry" onPress={() => void useChat.getState().open(room.id)} />} /> : null}
        {!byRoom?.loaded && !byRoom?.error ? <ActivityIndicator color={T.copper} style={{ marginTop: 30 }} /> : null}
        {byRoom?.loaded && !rows.length ? (
          // outside the inverted list, so it is not shown upside down
          <Empty icon="chat-bubble-outline" title="No messages yet" text={room.kind === 'help' && !room.other ? 'Write your question — the whole IT team sees it.' : 'Say hello 👋'} />
        ) : null}
        {byRoom?.loaded && rows.length ? (
          <FlatList
            ref={listRef}
            inverted
            data={rows}
            keyExtractor={(r) => r.k}
            renderItem={({ item }) => (
              item.day ? <View style={c.day}><Text style={c.dayText}>{dayLabel(item.day)}</Text></View>
                : item.newLine ? <View style={c.newLine}><View style={c.newBar} /><Text style={c.newText}>New messages</Text><View style={c.newBar} /></View>
                  : item.pend ? <PendingBubble p={item.pend} />
                    : item.msg ? <Bubble m={item.msg} first={!!item.first} base={base} phone={phone} focus={item.msg.id === focusId} seen={item.msg.mine ? seenInfo(room, reads, item.msg) : null} group={room.kind === 'group' || room.kind === 'team'} onPics={showPics} onMenu={setMenuFor} onReply={setReply} />
                      : null
            )}
            onEndReached={() => { void loadOlder(room.id); }}
            onEndReachedThreshold={0.5}
            onScrollToIndexFailed={() => {}}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={11}
            removeClippedSubviews={!WEB}
            contentContainerStyle={{ paddingHorizontal: phone ? 8 : 16, paddingVertical: 10 }}
            ListFooterComponent={byRoom.loadingOlder ? <ActivityIndicator color={T.copper} style={{ marginVertical: 10 }} /> : !byRoom.moreOlder ? <Text style={c.start}>Start of {room.name}</Text> : <View style={{ height: 30 }} />}
          />
        ) : null}
      </View>

      <Composer room={room} reply={reply} onReplyDone={() => setReply(null)} editing={editing} onEditDone={() => setEditing(null)} addRef={addRef} />

      <Viewer pics={viewer?.pics || []} index={viewer ? viewer.index : null} onClose={() => setViewer(null)} onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))} />
      <MessageMenu m={menuFor} admin={admin} room={room} seen={menuFor?.mine ? seenInfo(room, reads, menuFor) : null} onClose={() => setMenuFor(null)} onReply={(m) => { setReply(m); setMenuFor(null); }} onEdit={(m) => { setEditing(m); setMenuFor(null); }} onForward={(m) => { setForward(m); setMenuFor(null); }} />
      <ForwardDialog m={forward} onClose={() => setForward(null)} />
      <RoomInfo visible={info} onClose={() => setInfo(false)} room={room} admin={admin} />
    </View>
  );
}

function Ticks({ seen, group }: { seen: { seen: boolean; all: boolean; n: number } | null; group: boolean }) {
  if (!seen) return null;
  if (group && seen.n > 0 && !seen.all) return <Text style={[c.time, { color: '#2F80ED' }]}> · Seen by {seen.n}</Text>;
  return <Icon name={seen.seen ? 'done-all' : 'done'} size={14} color={seen.seen ? '#2F80ED' : T.muted} style={{ marginLeft: 3 }} />;
}

function Bubble({ m, first, base, phone, focus, seen, group, onPics, onMenu, onReply }: {
  m: ChatMessage; first: boolean; base: string; phone: boolean; focus: boolean; seen: ReturnType<typeof seenInfo> | null; group: boolean;
  onPics: (files: ChatFile[], f: ChatFile) => void; onMenu: (m: ChatMessage) => void; onReply: (m: ChatMessage) => void;
}) {
  const [hover, setHover] = useState(false);
  if (m.kind === 'system') return <Text style={c.system}>{m.body} · {hm(m.created_at)}</Text>;
  const mine = m.mine;
  const pics = m.files.filter((f) => f.image);
  const docs = m.files.filter((f) => !f.image);
  return (
    <Pressable onLongPress={() => !m.deleted && onMenu(m)} delayLongPress={350} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={[c.msgRow, mine && { flexDirection: 'row-reverse' }, !first && { marginTop: 2 }]}>
      {!mine ? (first ? <Avatar name={m.user.name} id={m.user.id} color={m.user.color} size={30} /> : <View style={{ width: 30 }} />) : null}
      <View style={[c.bubble, mine ? c.mine : c.theirs, focus && { borderColor: T.amber, borderWidth: 2 }, { maxWidth: phone ? '84%' as any : '70%' as any }]}>
        {first && !mine ? <Text style={[c.author, { color: m.user.color }]}>{m.user.name}{m.user.kind === 'it' ? <Text style={c.itTag}>  IT</Text> : null}</Text> : null}
        {m.forwarded && !m.deleted ? <Text style={c.fwd}><Icon name="shortcut" size={12} color={T.muted} /> Forwarded</Text> : null}
        {m.reply_to ? (
          <View style={c.quote}><Text style={c.quoteName}>{m.reply_to.user_name}</Text><Text style={c.quoteText} numberOfLines={2}>{m.reply_to.text}</Text></View>
        ) : null}
        {m.deleted ? <Text style={c.deleted}><Icon name="block" size={12} color={T.muted} /> message deleted</Text> : null}
        {m.folder && m.file_count ? (
          <View style={c.folder}>
            <Icon name="folder" size={20} color={T.amber} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={c.folderName} numberOfLines={1}>{m.folder}</Text>
              <Text style={c.fileMeta}>{m.file_count} files · {fmtBytes(m.file_bytes)}</Text>
            </View>
          </View>
        ) : null}
        {pics.length ? (
          <View style={c.pics}>
            {pics.slice(0, 6).map((f, i) => (
              <Pressable key={f.id} onPress={() => onPics(m.files, f)} style={[c.pic, pics.length === 1 && { width: 220, height: Math.min(260, Math.max(120, 220 * ((f.height || 3) / (f.width || 4)))) }]} accessibilityLabel={`Open ${f.name}`}>
                <Image source={{ uri: fileUrl(base, f.url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {i === 5 && pics.length > 6 ? <View style={c.more}><Text style={c.moreText}>+{pics.length - 6}</Text></View> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        {docs.length ? <FileList files={docs} base={base} /> : null}
        {m.zip_url ? (
          <TouchableOpacity onPress={() => openLink(fileUrl(base, m.zip_url!))} style={c.zipBtn} accessibilityRole="button">
            <Icon name="folder-zip" size={15} color={T.blue} /><Text style={c.zipText}>Download all ({m.file_count}) as zip</Text>
          </TouchableOpacity>
        ) : null}
        {m.body ? <Text style={c.body} selectable>{m.body}</Text> : null}
        <View style={c.metaRow}>
          {m.edited_at && !m.deleted ? <Text style={c.edited}>edited</Text> : null}
          <Text style={c.time}>{hm(m.created_at)}</Text>
          {mine && !m.deleted ? <Ticks seen={seen} group={group} /> : null}
        </View>
      </View>
      {WEB && hover && !m.deleted ? (
        <View style={[c.tools, mine ? { marginRight: 4 } : { marginLeft: 4 }]}>
          <TouchableOpacity onPress={() => onReply(m)} style={c.tool} accessibilityLabel="Reply"><Icon name="reply" size={16} color={T.muted} /></TouchableOpacity>
          <TouchableOpacity onPress={() => onMenu(m)} style={c.tool} accessibilityLabel="More"><Icon name="more-horiz" size={16} color={T.muted} /></TouchableOpacity>
        </View>
      ) : null}
    </Pressable>
  );
}

function FileList({ files, base }: { files: ChatFile[]; base: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? files : files.slice(0, 5);
  return (
    <View style={{ gap: 4 }}>
      {shown.map((f) => {
        const look = fileLook(f.name, f.mime);
        return (
          <TouchableOpacity key={f.id} onPress={() => openLink(fileUrl(base, f.download_url))} style={c.file} accessibilityRole="button" accessibilityLabel={`Download ${f.name}`}>
            <View style={[c.fileIcon, { backgroundColor: `${look.color}18` }]}><Icon name={look.icon as any} size={18} color={look.color} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={c.fileName} numberOfLines={1}>{f.name}</Text>
              <Text style={c.fileMeta} numberOfLines={1}>{f.path && f.path !== f.name ? `${f.path.split('/').slice(0, -1).join(' / ')} · ` : ''}{look.label} · {fmtBytes(f.size)}</Text>
            </View>
            <Icon name="file-download" size={18} color={T.muted} />
          </TouchableOpacity>
        );
      })}
      {files.length > 5 && !all ? <TouchableOpacity onPress={() => setAll(true)}><Text style={c.showAll}>Show all {files.length} files</Text></TouchableOpacity> : null}
    </View>
  );
}

/** a message on its way: one row per file with its own progress (like WhatsApp) */
function PendingBubble({ p }: { p: Pending }) {
  const retry = useChat((s) => s.retry);
  const drop = useChat((s) => s.dropPending);
  const [all, setAll] = useState(false);
  const total = p.jobs.reduce((n, j) => n + (j.size || 1), 0) || 1;
  const pct = p.jobs.length ? p.jobs.reduce((n, j) => n + (j.size || 1) * j.progress, 0) / total : 0;
  const done = p.jobs.filter((j) => j.status === 'done').length;
  const failed = p.jobs.filter((j) => j.status === 'error').length;
  // uploading / failed first, then waiting, done last
  const order = { uploading: 0, error: 1, waiting: 2, done: 3 } as const;
  const sorted = p.jobs.slice().sort((a, b) => order[a.status] - order[b.status]);
  const shown = all ? sorted : sorted.slice(0, 4);
  return (
    <View style={[c.msgRow, { flexDirection: 'row-reverse' }]}>
      <View style={[c.bubble, c.mine, { maxWidth: '78%' as any, minWidth: 240 }]}>
        {p.jobs.length ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={p.folder ? 'folder' : 'attach-file'} size={15} color={p.folder ? T.amber : T.blue} />
              <Text style={[c.fileMeta, { flex: 1 }]} numberOfLines={1}>{p.folder ? `${p.folder} · ` : ''}{done}/{p.jobs.length} files · {fmtBytes(total)}</Text>
              <Text style={[c.fileMeta, { color: failed ? T.red : T.blue }]}>{Math.round(pct * 100)}%</Text>
            </View>
            <View style={c.progress}><View style={[c.progressBar, { width: `${Math.round(pct * 100)}%` as any }, failed ? { backgroundColor: T.red } : null]} /></View>
            {shown.map((j) => (
              <View key={j.key} style={c.job}>
                <Icon name={j.status === 'done' ? 'check-circle' : j.status === 'error' ? 'error' : j.status === 'uploading' ? 'cloud-upload' : 'schedule'} size={14}
                  color={j.status === 'done' ? T.green : j.status === 'error' ? T.red : j.status === 'uploading' ? T.blue : T.muted} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={c.jobName} numberOfLines={1}>{j.name}</Text>
                  {j.status === 'uploading' ? <View style={[c.progress, { height: 3, minWidth: 0 }]}><View style={[c.progressBar, { height: 3, width: `${Math.round(j.progress * 100)}%` as any }]} /></View> : null}
                  {j.status === 'error' ? <Text style={c.jobErr} numberOfLines={2}>{j.error.replace(`${j.name}: `, '')}</Text> : null}
                </View>
                <Text style={c.jobSize}>{j.status === 'uploading' ? `${Math.round(j.progress * 100)}%` : fmtBytes(j.size)}</Text>
              </View>
            ))}
            {p.jobs.length > 4 ? <TouchableOpacity onPress={() => setAll((x) => !x)}><Text style={c.showAll}>{all ? 'Show less' : `Show all ${p.jobs.length} files`}</Text></TouchableOpacity> : null}
          </>
        ) : null}
        {p.body ? <Text style={c.body}>{p.body}</Text> : null}
        {p.stage === 'error' ? (
          <View style={{ gap: 6 }}>
            <Text style={c.err}>{p.error}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small title={failed && failed < p.jobs.length ? `Retry ${failed} failed` : 'Retry'} icon="refresh" onPress={() => retry(p.room_id, p.key)} />
              <Btn small kind="ghost" title="Remove" onPress={() => drop(p.room_id, p.key)} />
            </View>
          </View>
        ) : (
          <View style={c.metaRow}>
            {p.stage === 'uploading' ? <TouchableOpacity onPress={() => drop(p.room_id, p.key)} accessibilityLabel="Cancel upload"><Text style={[c.time, { color: T.red }]}>Cancel  </Text></TouchableOpacity> : null}
            <Text style={c.time}>{p.stage === 'uploading' ? 'uploading…' : 'sending…'}</Text>
            <Icon name="schedule" size={13} color={T.muted} style={{ marginLeft: 3 }} />
          </View>
        )}
      </View>
    </View>
  );
}

/* ------------------------------- composer -------------------------------- */

function Composer({ room, reply, onReplyDone, editing, onEditDone, addRef }: { room: ChatRoom; reply: ChatMessage | null; onReplyDone: () => void; editing: ChatMessage | null; onEditDone: () => void; addRef?: React.MutableRefObject<((l: PickedFile[]) => void) | null> }) {
  const { phone } = useLayout();
  const send = useChat((s) => s.send);
  const edit = useChat((s) => s.edit);
  const limits = useChat((s) => s.limits);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [folder, setFolder] = useState('');
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => { if (editing) { setText(editing.body); inputRef.current?.focus(); } }, [editing]);
  useEffect(() => { if (reply) inputRef.current?.focus(); }, [reply]);

  const [canPaste, setCanPaste] = useState(WEB);
  useEffect(() => { if (addRef) addRef.current = (l) => add(l); });
  // web: Ctrl+V / ⌘V of a copied picture or file goes into the message
  useEffect(() => {
    if (!WEB) return undefined;
    const node: any = inputRef.current;
    if (!node?.addEventListener) return undefined;
    const onPaste = (e: any) => {
      const l = fromWebFiles(e.clipboardData?.files);
      if (l.length) { e.preventDefault(); add(l); }
    };
    node.addEventListener('paste', onPaste);
    return () => node.removeEventListener('paste', onPaste);
  });
  const add = (list: PickedFile[], fold = '') => {
    if (!list.length) return;
    // same file twice -> once
    const seen = new Set(files.map((f) => `${f.relPath || f.name}|${f.size}`));
    const fresh = list.filter((f) => { const k = `${f.relPath || f.name}|${f.size}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const { ok, problems } = checkFiles(fresh, limits, files.length);
    if (problems.length) void AppAlert.alert(ok.length ? 'Some files were left out' : 'Cannot attach', problems.join('\n\n'));
    if (!ok.length) return;
    setFiles((cur) => [...cur, ...ok]);
    if (fold) setFolder(fold);
  };
  const go = () => {
    const body = text.trim();
    if (editing) {
      if (!body && !editing.file_count) { void AppAlert.alert('Message is empty', 'Write something, or delete the message instead.'); return; }
      if (body === editing.body) { onEditDone(); setText(''); return; }
      setSaving(true);
      edit(editing.id, body).then(() => { onEditDone(); setText(''); }).catch((e) => AppAlert.alert('Could not edit', e?.message || 'Please try again.')).finally(() => setSaving(false));
      return;
    }
    if (!body && !files.length) return;
    if (body.length > 8000) { void AppAlert.alert('Message too long', `A message can be at most 8000 characters (now ${body.length}). Send it in parts or as a file.`); return; }
    void send(room.id, body, files, folder, reply);
    setText(''); setFiles([]); setFolder(''); onReplyDone();
  };
  const pick = async (fn: () => Promise<PickedFile[]>) => { setMenu(false); try { add(await fn()); } catch (e: any) { void AppAlert.alert('Could not pick files', e?.message || 'Please try again.'); } };
  const pickDir = async () => {
    setMenu(false);
    try {
      const r = await pickFolder();
      if (!r.files.length) { void AppAlert.alert('Folder is empty', 'This folder has no files to send (empty folders are skipped).'); return; }
      add(r.files, r.folder);
    } catch (e: any) { void AppAlert.alert('Could not read the folder', e?.message || 'Please try again.'); }
  };
  const total = files.reduce((n, f) => n + f.size, 0);
  const canSend = (!!text.trim() || !!files.length) && !saving;

  return (
    <View style={c.composer}>
      {reply || editing ? (
        <View style={c.replyBar}>
          <Icon name={editing ? 'edit' : 'reply'} size={16} color={T.blue} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={c.quoteName}>{editing ? 'Editing your message' : `Reply to ${reply!.user.name}`}</Text>
            <Text style={c.quoteText} numberOfLines={1}>{(editing || reply)!.body || 'file'}</Text>
          </View>
          <IconBtn icon="close" label="Cancel" onPress={() => { if (editing) { onEditDone(); setText(''); } else onReplyDone(); }} />
        </View>
      ) : null}
      {files.length ? (
        <View style={c.tray}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[c.trayHead, { flex: 1 }]}>{folder ? `📁 ${folder} · ` : ''}{files.length} file{files.length === 1 ? '' : 's'} · {fmtBytes(total)}</Text>
            <TouchableOpacity onPress={() => { setFiles([]); setFolder(''); }} accessibilityLabel="Remove all files"><Text style={[c.trayHead, { color: T.red }]}>Remove all</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {files.slice(0, 30).map((f) => {
              const look = fileLook(f.name, f.mime);
              return (
                <View key={f.key} style={c.chip}>
                  {f.uri && /^image\//.test(f.mime) ? <Image source={{ uri: f.uri }} style={c.chipImg} /> : <Icon name={look.icon as any} size={16} color={look.color} />}
                  <Text style={c.chipText} numberOfLines={1}>{f.relPath || f.name}</Text>
                  <Text style={c.chipSize}>{fmtBytes(f.size)}</Text>
                  <TouchableOpacity onPress={() => setFiles((cur) => { const n = cur.filter((x) => x.key !== f.key); if (!n.length) setFolder(''); return n; })} accessibilityLabel={`Remove ${f.name}`}><Icon name="close" size={14} color={T.muted} /></TouchableOpacity>
                </View>
              );
            })}
            {files.length > 30 ? <Text style={[c.chipText, { alignSelf: 'center' }]}>+{files.length - 30} more</Text> : null}
          </ScrollView>
        </View>
      ) : null}
      <View style={c.inputRow}>
        {!editing ? <IconBtn icon="attach-file" label="Attach files" onPress={() => { setMenu(true); if (!WEB) void clipboardHasImage().then(setCanPaste); }} /> : null}
        <View style={c.inputBox}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={room.kind === 'team' ? 'Message the IT team…' : room.kind === 'help' && !room.other ? 'Write to the IT team…' : `Message ${room.name}…`}
            placeholderTextColor={T.muted}
            multiline
            maxLength={8000}
            style={[c.input, WEB && ({ outlineStyle: 'none' } as any)]}
            onKeyPress={(e: any) => {
              if (WEB && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault(); go(); }
              if (WEB && e.nativeEvent.key === 'Escape' && (editing || reply)) { if (editing) { onEditDone(); setText(''); } else onReplyDone(); }
            }}
            accessibilityLabel="Message"
          />
        </View>
        <TouchableOpacity onPress={go} disabled={!canSend} style={[c.send, !canSend && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={editing ? 'Save' : 'Send'}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Icon name={editing ? 'check' : 'send'} size={19} color="#fff" />}
        </TouchableOpacity>
      </View>
      {WEB && !phone ? <Text style={c.hint}>Enter to send · Shift+Enter new line · Ctrl+V pastes pictures · up to {fmtBytes(limits.max_upload_mb * 1048576)} per file, {limits.max_files_per_message} files per message</Text> : null}
      <Dialog visible={menu} onClose={() => setMenu(false)} title="Attach" width={360}>
        <View style={{ gap: 8 }}>
          <Btn kind="ghost" title="Pictures" icon="photo-library" onPress={() => void pick(pickPhotos)} />
          {!WEB ? <Btn kind="ghost" title="Camera" icon="photo-camera" onPress={() => void pick(takePicture)} /> : null}
          <Btn kind="ghost" title="Files (PDF, Excel, video, zip …)" icon="attach-file" onPress={() => void pick(() => pickFiles(true))} />
          {canPickFolder ? <Btn kind="ghost" title="A whole folder" icon="folder" onPress={() => void pickDir()} /> : null}
          {canPaste ? <Btn kind="ghost" title="Paste copied picture / file" icon="content-paste" onPress={async () => {
            setMenu(false);
            try {
              const l = await pasteFromClipboard();
              if (!l.length) void AppAlert.alert('Nothing to paste', WEB ? 'Copy a picture or file first — or press Ctrl+V (⌘V) in the message box.' : 'Copy a picture first, then tap Paste.');
              else add(l);
            } catch (e: any) { void AppAlert.alert('Could not paste', WEB ? 'The browser did not allow reading the clipboard. Press Ctrl+V (⌘V) in the message box instead.' : (e?.message || 'Please try again.')); }
          }} /> : null}
          <Text style={c.fileMeta}>Up to {fmtBytes(limits.max_upload_mb * 1048576)} per file. Big files go up in pieces and continue after a network drop.</Text>
        </View>
      </Dialog>
    </View>
  );
}

/* ------------------------------ dialogs ------------------------------ */

function MessageMenu({ m, admin, room, seen, onClose, onReply, onEdit, onForward }: { m: ChatMessage | null; admin: boolean; room: ChatRoom; seen: ReturnType<typeof seenInfo> | null; onClose: () => void; onReply: (m: ChatMessage) => void; onEdit: (m: ChatMessage) => void; onForward: (m: ChatMessage) => void }) {
  const remove = useChat((s) => s.remove);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setConfirm(false); }, [m]);
  if (!m) return null;
  const canDelete = m.mine || admin;
  const canEdit = m.mine && m.kind === 'text' && (m.can_edit ?? true);
  return (
    <Dialog visible={!!m} onClose={onClose} title="Message" width={360}>
      <Text style={c.quoteText} numberOfLines={3}>{m.body || `${m.file_count} file(s)`}</Text>
      <Text style={[c.fileMeta, { marginBottom: 6 }]}>{m.user.name} · {fmtWhen(m.created_at)}{m.edited_at ? ` · edited ${fmtWhen(m.edited_at)}` : ''}</Text>
      {seen ? (
        <View style={c.seenBox}>
          <Icon name={seen.seen ? 'done-all' : 'done'} size={15} color={seen.seen ? '#2F80ED' : T.muted} />
          <Text style={c.fileMeta}>{seen.n ? `Seen by ${seen.names.slice(0, 8).join(', ')}${seen.names.length > 8 ? ` +${seen.names.length - 8}` : ''}` : 'Sent — not seen yet'}</Text>
        </View>
      ) : null}
      <View style={{ gap: 8, marginTop: 8 }}>
        <Btn kind="ghost" title="Reply" icon="reply" onPress={() => onReply(m)} />
        {m.body ? <Btn kind="ghost" title="Copy text" icon="content-copy" onPress={async () => { const ok = await copyText(m.body); toast(ok ? 'Copied' : 'Could not copy', ok ? 'ok' : 'err'); onClose(); }} /> : null}
        {m.kind === 'text' ? <Btn kind="ghost" title={m.file_count ? `Forward (with ${m.file_count} file${m.file_count === 1 ? '' : 's'})` : 'Forward'} icon="shortcut" onPress={() => onForward(m)} /> : null}
        {canEdit ? <Btn kind="ghost" title="Edit" icon="edit" onPress={() => onEdit(m)} /> : null}
        {m.mine && m.kind === 'text' && !canEdit ? <Text style={c.fileMeta}>The time to edit this message is over.</Text> : null}
        {canDelete ? (confirm
          ? <Btn kind="danger" title={m.file_count ? 'Yes, delete it (files removed from the server)' : 'Yes, delete it'} icon="delete" onPress={() => { remove(m.id).catch((e) => AppAlert.alert('Could not delete', e?.message || 'Please try again.')); onClose(); }} />
          : <Btn kind="ghost" title={m.mine ? 'Delete' : 'Delete (IT admin)'} icon="delete-outline" onPress={() => setConfirm(true)} />) : null}
      </View>
    </Dialog>
  );
}

/** forward a message to one or more chats */
function ForwardDialog({ m, onClose }: { m: ChatMessage | null; onClose: () => void }) {
  const api = useChat((s) => s.api);
  const rooms = useChat((s) => s.rooms);
  const [pick, setPick] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPick([]); setQ(''); setNote(''); }, [m]);
  if (!m) return null;
  const list = rooms.filter((r) => r.is_member || r.kind === 'team' || r.kind === 'help').filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const go = async () => {
    if (!pick.length) { void AppAlert.alert('Forward', 'Pick at least one chat.'); return; }
    setBusy(true);
    try {
      await api!('chat.forward', { message_id: m.id, room_ids: pick, note }, { timeout: 120000 });
      toast(`Forwarded to ${pick.length} chat${pick.length === 1 ? '' : 's'}`, 'ok');
      useChat.getState().refreshRooms(100);
      pick.forEach((id) => { if (useChat.getState().byRoom[id]?.loaded) void useChat.getState().sync(id); });
      onClose();
    } catch (e: any) { void AppAlert.alert('Could not forward', e?.message || 'Please try again.'); } finally { setBusy(false); }
  };
  return (
    <Dialog visible={!!m} onClose={onClose} title="Forward to…" width={440}
      footer={<><Btn title="Cancel" kind="ghost" onPress={onClose} /><Btn title={pick.length ? `Forward to ${pick.length}` : 'Forward'} icon="shortcut" busy={busy} disabled={!pick.length} onPress={go} /></>}>
      <View style={c.fwdPreview}>
        <Text style={c.quoteName}>{m.user.name}</Text>
        <Text style={c.quoteText} numberOfLines={2}>{m.body || (m.folder ? `📁 ${m.folder}` : `📎 ${m.file_count} file(s)`)}</Text>
        {m.file_count ? <Text style={c.fileMeta}>{m.file_count} file{m.file_count === 1 ? '' : 's'} · {fmtBytes(m.file_bytes)} — sent along</Text> : null}
      </View>
      <Input value={q} onChangeText={setQ} placeholder="Search chats…" icon="search" />
      <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 4, paddingVertical: 6 }}>
        {list.map((r) => {
          const on = pick.includes(r.id);
          return (
            <TouchableOpacity key={r.id} style={[c.person, on && { backgroundColor: `${T.copper}12`, borderColor: T.copper }]} onPress={() => setPick((cur) => (on ? cur.filter((x) => x !== r.id) : cur.length >= 20 ? cur : [...cur, r.id]))}>
              <RoomIcon r={r} size={30} />
              <View style={{ flex: 1 }}><Text style={c.roomName} numberOfLines={1}>{r.name}</Text><Text style={c.fileMeta} numberOfLines={1}>{r.sub}</Text></View>
              <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={20} color={on ? T.copper : T.muted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Input value={note} onChangeText={setNote} placeholder="Add a message (optional)" />
    </Dialog>
  );
}

/** search people (IT team + FlowNest users) */
function usePeople(q: string, enabled: boolean) {
  const api = useChat((s) => s.api);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !api) return undefined;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api<{ people: Person[] }>('chat.people', { q }).then((r) => { if (alive) setPeople(r.people); }).catch(() => {}).finally(() => alive && setLoading(false));
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [q, enabled, api]);
  return { people, loading };
}
const keyOf = (p: Person) => `${p.kind}:${p.id}`;

function PeopleList({ people, picked, onToggle, onPick, loading, exclude = [] }: { people: Person[]; picked?: string[]; onToggle?: (p: Person) => void; onPick?: (p: Person) => void; loading: boolean; exclude?: string[] }) {
  const list = people.filter((p) => !exclude.includes(keyOf(p)));
  const it = list.filter((p) => p.kind === 'it');
  const users = list.filter((p) => p.kind === 'client');
  const row = (p: Person) => {
    const on = !!picked?.includes(keyOf(p));
    return (
      <TouchableOpacity key={keyOf(p)} style={[c.person, on && { backgroundColor: `${T.copper}12`, borderColor: T.copper }]} onPress={() => (onToggle ? onToggle(p) : onPick?.(p))}>
        <Avatar name={p.name} id={p.id} color={p.color} size={30} />
        <View style={{ flex: 1 }}><Text style={c.roomName}>{p.name}</Text><Text style={c.fileMeta}>{p.sub || (p.kind === 'it' ? 'IT team' : 'FlowNest user')}</Text></View>
        {onToggle ? <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={20} color={on ? T.copper : T.muted} /> : <Icon name="chevron-right" size={20} color={T.muted} />}
      </TouchableOpacity>
    );
  };
  return (
    <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 4, paddingVertical: 6 }} keyboardShouldPersistTaps="handled">
      {loading && !list.length ? <ActivityIndicator color={T.copper} /> : null}
      {it.length ? <Text style={c.peopleHead}>IT TEAM</Text> : null}
      {it.map(row)}
      {users.length ? <Text style={c.peopleHead}>FLOWNEST USERS</Text> : null}
      {users.map(row)}
      {!loading && !list.length ? <Text style={c.fileMeta}>Nobody found. FlowNest users show here after they open Support once.</Text> : null}
    </ScrollView>
  );
}

function NewChatDialog({ kind, onClose }: { kind: 'direct' | 'group' | null; onClose: () => void }) {
  const api = useChat((s) => s.api);
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const { people, loading } = usePeople(q, !!kind);
  useEffect(() => { setName(''); setPicked([]); setQ(''); }, [kind]);
  const openRoom = async (roomId: number) => { await useChat.getState().loadRooms(); onClose(); void useChat.getState().open(roomId); };
  const startDirect = async (p: Person) => {
    try { await openRoom((await api!<{ room_id: number }>('chat.direct', { person: keyOf(p) })).room_id); }
    catch (e: any) { void AppAlert.alert('Could not start the chat', e?.message || 'Please try again.'); }
  };
  const makeGroup = async () => {
    if (!name.trim()) { void AppAlert.alert('Group name', 'Give the group a name.'); return; }
    if (!picked.length) { void AppAlert.alert('Members', 'Pick at least one person.'); return; }
    setBusy(true);
    try { await openRoom((await api!<{ room_id: number }>('chat.group.save', { name: name.trim(), members: picked.map(keyOf) })).room_id); }
    catch (e: any) { void AppAlert.alert('Could not make the group', e?.message || 'Please try again.'); } finally { setBusy(false); }
  };
  return (
    <Dialog visible={!!kind} onClose={onClose} title={kind === 'group' ? 'New group' : 'New chat'} width={440}
      footer={kind === 'group' ? <><Btn title="Cancel" kind="ghost" onPress={onClose} /><Btn title={`Create group${picked.length ? ` (${picked.length + 1})` : ''}`} icon="group-add" busy={busy} disabled={!name.trim() || !picked.length} onPress={makeGroup} /></> : undefined}>
      {kind === 'group' ? <Field label="Group name"><Input value={name} onChangeText={setName} placeholder="e.g. Packing floor, App release" maxLength={120} /></Field> : null}
      {kind === 'group' && picked.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
          {picked.map((p) => (
            <View key={keyOf(p)} style={c.chip}><Text style={c.chipText}>{p.name}</Text><TouchableOpacity onPress={() => setPicked((cur) => cur.filter((x) => keyOf(x) !== keyOf(p)))}><Icon name="close" size={14} color={T.muted} /></TouchableOpacity></View>
          ))}
        </ScrollView>
      ) : null}
      <Input value={q} onChangeText={setQ} placeholder="Search people by name…" icon="search" autoCorrect={false} />
      <PeopleList people={people} loading={loading} picked={kind === 'group' ? picked.map(keyOf) : undefined}
        onToggle={kind === 'group' ? (p) => setPicked((cur) => (cur.some((x) => keyOf(x) === keyOf(p)) ? cur.filter((x) => keyOf(x) !== keyOf(p)) : [...cur, p])) : undefined}
        onPick={kind === 'group' ? undefined : (p) => void startDirect(p)} />
    </Dialog>
  );
}

function RoomInfo({ visible, onClose, room, admin }: { visible: boolean; onClose: () => void; room: ChatRoom; admin: boolean }) {
  const api = useChat((s) => s.api);
  const meKey = useChat((s) => s.meKey);
  const manage = room.kind === 'group' && room.can_manage;
  const [name, setName] = useState(room.name);
  const [members, setMembers] = useState<Person[]>(room.members);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const { people, loading } = usePeople(q, visible && adding);
  useEffect(() => { if (visible) { setName(room.name); setMembers(room.members); setAdding(false); setQ(''); } }, [visible, room]);
  const save = async () => {
    setBusy(true);
    try { await api!('chat.group.save', { room_id: room.id, name, members: members.map(keyOf) }); await useChat.getState().loadRooms(); toast('Group saved', 'ok'); onClose(); }
    catch (e: any) { void AppAlert.alert('Could not save', e?.message || 'Please try again.'); } finally { setBusy(false); }
  };
  const archive = async () => {
    let yes = false;
    await AppAlert.alert('Remove this group?', 'Nobody will see it in the chat list any more.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { yes = true; } }]);
    if (!yes) return;
    try { await api!('chat.group.archive', { room_id: room.id }); await useChat.getState().loadRooms(); void useChat.getState().open(null); onClose(); }
    catch (e: any) { void AppAlert.alert('Could not remove', e?.message || 'Please try again.'); }
  };
  const leave = async () => {
    try { await api!('chat.group.leave', { room_id: room.id }); await useChat.getState().loadRooms(); void useChat.getState().open(null); onClose(); }
    catch (e: any) { void AppAlert.alert('Could not leave', e?.message || 'Please try again.'); }
  };
  const isMember = room.members.some((m) => keyOf(m) === meKey);
  return (
    <Dialog visible={visible} onClose={onClose} title={room.name} width={440}
      footer={manage ? <><Btn title="Remove group" kind="ghost" icon="archive" onPress={archive} /><Btn title="Save" icon="check" busy={busy} onPress={save} /></>
        : room.kind === 'group' && isMember ? <Btn title="Leave group" kind="ghost" icon="logout" onPress={leave} /> : undefined}>
      {manage ? <Field label="Group name"><Input value={name} onChangeText={setName} maxLength={120} /></Field> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[c.fileMeta, { flex: 1 }]}>{room.kind === 'team' ? 'Everybody in the IT Desk' : room.kind === 'help' ? 'The user + the whole IT team' : `${members.length} members`}{admin && !isMember && room.kind === 'group' ? ' · you manage it as IT admin' : ''}</Text>
        {manage ? <Btn small kind="ghost" icon={adding ? 'close' : 'person-add'} title={adding ? 'Done' : 'Add people'} onPress={() => setAdding((x) => !x)} /> : null}
      </View>
      {adding ? (
        <>
          <Input value={q} onChangeText={setQ} placeholder="Search people…" icon="search" autoCorrect={false} />
          <PeopleList people={people} loading={loading} exclude={members.map(keyOf)} onPick={(p) => setMembers((cur) => [...cur, p])} />
        </>
      ) : (
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 4, paddingVertical: 6 }}>
          {members.map((u) => (
            <View key={keyOf(u)} style={c.person}>
              <Avatar name={u.name} id={u.id} color={u.color} size={28} />
              <View style={{ flex: 1 }}><Text style={c.roomName}>{u.name}{keyOf(u) === meKey ? ' (you)' : ''}</Text><Text style={c.fileMeta}>{u.kind === 'it' ? 'IT team' : u.sub || 'FlowNest user'}</Text></View>
              {manage && keyOf(u) !== meKey ? <TouchableOpacity onPress={() => setMembers((cur) => cur.filter((x) => keyOf(x) !== keyOf(u)))} accessibilityLabel={`Remove ${u.name}`}><Icon name="remove-circle-outline" size={20} color={T.red} /></TouchableOpacity> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Dialog>
  );
}

const c = StyleSheet.create({
  fwd: { fontSize: 10.5, fontWeight: '800', fontStyle: 'italic', color: T.muted },
  fwdPreview: { padding: 10, borderRadius: 10, backgroundColor: T.alt, borderLeftWidth: 3, borderLeftColor: T.blue, gap: 2, marginBottom: 8 },
  dropZone: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: 'rgba(58,86,138,0.10)', borderWidth: 2, borderStyle: 'dashed', borderColor: T.blue, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dropText: { fontSize: 15, fontWeight: '900', color: T.blue },
  fast: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: `${T.amber}18`, marginLeft: 6 },
  fastText: { fontSize: 9.5, fontWeight: '900', color: T.amber },
  itTag: { fontSize: 9.5, fontWeight: '900', color: T.copper },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  edited: { fontSize: 10, fontWeight: '700', fontStyle: 'italic', color: T.muted },
  job: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  jobName: { fontSize: 11.5, fontWeight: '800', color: T.ink },
  jobErr: { fontSize: 10.5, fontWeight: '700', color: T.red },
  jobSize: { fontSize: 10.5, fontWeight: '700', color: T.muted, minWidth: 44, textAlign: 'right' },
  chipSize: { fontSize: 10, fontWeight: '700', color: T.muted },
  seenBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: T.alt },
  peopleHead: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6, marginTop: 6, marginBottom: 2 },
  wrap: { flex: 1, flexDirection: 'row', minHeight: 0, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  listPane: { width: 320, borderRightWidth: 1, borderRightColor: T.border, backgroundColor: T.surface },
  listHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 4 },
  listTitle: { fontSize: 16, fontWeight: '900', color: T.nav },
  room: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: 6, borderRadius: 12 },
  roomOn: { backgroundColor: `${T.copper}14` },
  roomIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 13.5, fontWeight: '800', color: T.ink, flexShrink: 1 },
  roomTime: { fontSize: 11, fontWeight: '700', color: T.muted },
  roomLast: { flex: 1, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  result: { paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  resultRoom: { fontSize: 11, fontWeight: '800', color: T.copper },
  resultText: { fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 2 },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  headName: { fontSize: 15, fontWeight: '900', color: T.nav },
  headSub: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  day: { alignItems: 'center', marginVertical: 10 },
  dayText: { fontSize: 11, fontWeight: '900', color: T.muted, backgroundColor: T.alt, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  newLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  newBar: { flex: 1, height: 1, backgroundColor: '#E5484D' },
  newText: { fontSize: 11, fontWeight: '900', color: '#E5484D' },
  start: { textAlign: 'center', fontSize: 11.5, fontWeight: '700', color: T.muted, marginVertical: 12 },
  system: { textAlign: 'center', fontSize: 11.5, fontWeight: '700', color: T.muted, marginVertical: 6 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  bubble: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7, gap: 5, borderWidth: 1 },
  mine: { backgroundColor: '#E6EEF9', borderColor: '#D3E0F2', borderBottomRightRadius: 4 },
  theirs: { backgroundColor: T.bg, borderColor: T.border, borderBottomLeftRadius: 4 },
  author: { fontSize: 12, fontWeight: '900' },
  body: { fontSize: 14, color: T.ink, lineHeight: 20 },
  deleted: { fontSize: 12.5, fontStyle: 'italic', color: T.muted },
  time: { fontSize: 10, fontWeight: '700', color: T.muted, alignSelf: 'flex-end' },
  quote: { borderLeftWidth: 3, borderLeftColor: T.blue, paddingLeft: 8, paddingVertical: 2, backgroundColor: 'rgba(58,86,138,0.06)', borderRadius: 4 },
  quoteName: { fontSize: 11.5, fontWeight: '900', color: T.blue },
  quoteText: { fontSize: 12, fontWeight: '600', color: T.muted },
  folder: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: `${T.amber}12` },
  folderName: { fontSize: 13, fontWeight: '900', color: T.ink },
  pics: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pic: { width: 108, height: 108, borderRadius: 10, overflow: 'hidden', backgroundColor: T.alt },
  more: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.55)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, minWidth: 220 },
  fileIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  fileMeta: { fontSize: 11, fontWeight: '700', color: T.muted },
  showAll: { fontSize: 12, fontWeight: '800', color: T.blue, paddingVertical: 4 },
  zipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  zipText: { fontSize: 12, fontWeight: '900', color: T.blue },
  tools: { flexDirection: 'row', gap: 2, alignSelf: 'center' },
  tool: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  progress: { height: 4, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden', minWidth: 160 },
  progressBar: { height: 4, backgroundColor: T.blue },
  err: { fontSize: 12, fontWeight: '800', color: T.red },
  composer: { borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8, gap: 6 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 10, backgroundColor: T.alt },
  tray: { gap: 6 },
  trayHead: { fontSize: 11.5, fontWeight: '800', color: T.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 32, borderRadius: 16, backgroundColor: T.alt, maxWidth: 220 },
  chipImg: { width: 22, height: 22, borderRadius: 4 },
  chipText: { fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  inputBox: { flex: 1, minHeight: 40, maxHeight: 140, borderRadius: 20, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg, paddingHorizontal: 14, justifyContent: 'center' },
  input: { fontSize: 14, color: T.ink, paddingVertical: 9, maxHeight: 130 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 10.5, fontWeight: '600', color: T.muted, textAlign: 'right' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
});
