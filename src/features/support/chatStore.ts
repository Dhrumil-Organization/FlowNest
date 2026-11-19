// FILE: src/features/support/chatStore.ts
// Chat state for the IT Desk AND the Raise-ticket screen (same server, same store):
//   rooms     with unread, last message, read positions of the others (✓ / ✓✓ / Seen by N)
//   messages  per room, paged 40 at a time (oldest -> newest), so a room with millions stays light
//   sending   the message shows at once; every file is its own job (progress, retry only failed)
//   live      WebSocket says "room X changed" -> sync() fetches new + edited + read marks in ONE call.
//             Without WebSocket pulse() runs every 1–3 s (admin setting): one tiny call that
//             returns [room, last id, change no.] — only rooms that changed are synced.
//   search    Bloom filter per room answers "no match" without asking the server
import { create } from 'zustand';
import type { SupportCall } from './api';
import { Bloom, searchWords } from './bloom';
import { DEFAULT_LIMITS, Job, Limits, newJobs, PickedFile, UploadCfg, uploadJobs } from './files';

export type Person = { key?: string; kind: 'it' | 'client'; id: number; name: string; color: string; sub?: string };
export type ChatFile = { id: number; name: string; path: string; mime: string; size: number; width: number; height: number; image: boolean; url: string; download_url: string };
export type ChatMessage = {
  id: number; room_id: number; user: Person & { key: string }; mine: boolean; kind: 'text' | 'system'; can_edit?: boolean; forwarded?: boolean;
  body: string; deleted: boolean; reply_to: { id: number; user_name: string; text: string } | null;
  files: ChatFile[]; file_count: number; file_bytes: number; folder: string; zip_url: string | null; edited_at: string | null; created_at: string;
};
export type ChatRoom = {
  id: number; kind: 'team' | 'group' | 'direct' | 'help'; name: string; sub: string; color: string;
  other: Person | null; members: Person[]; member_count: number; is_member: boolean; can_manage: boolean;
  last: { id: number; user_key: string; user_name: string; text: string } | null; last_at: string; last_read_id: number; unread: number;
  reads: { key: string; name: string; last_read_id: number }[]; rev: number; last_message_id: number; bloom_ver: number;
};
export type Pending = {
  key: string; room_id: number; body: string; files: PickedFile[]; jobs: Job[]; folder: string;
  reply_to: ChatMessage['reply_to']; error: string; stage: 'uploading' | 'sending' | 'error'; created_at: string;
};
export type Incoming = { room_id: number; room_name: string; kind: ChatRoom['kind']; user_name: string; text: string; count: number; color: string; other: Person | null; at: number; last_id: number };
type RoomMsgs = { ids: number[]; moreOlder: boolean; loadingOlder: boolean; loaded: boolean; error: string; syncAt: string; reads: Record<string, number>; rev: number };
const emptyRoom = (): RoomMsgs => ({ ids: [], moreOlder: false, loadingOlder: false, loaded: false, error: '', syncAt: '', reads: {}, rev: -1 });

type State = {
  api: SupportCall | null;
  upload: UploadCfg | null;
  realm: 'it' | 'client';
  meKey: string;
  limits: Limits;
  rooms: ChatRoom[];
  roomsLoaded: boolean;
  roomsError: string;
  unread: number;
  activeId: number | null;
  msgs: Record<number, ChatMessage>;
  byRoom: Record<number, RoomMsgs>;
  pending: Record<number, Pending[]>;
  blooms: Record<number, { ver: number; bloom: Bloom; lastId: number }>;
  bloomsAt: number;
  focusId: number | null;
  /** last pulse numbers per room: [last id, change no.] */
  marks: Record<number, [number, number]>;
  /** the chat screen is on screen right now (a room counts as "read" only then) */
  viewing: boolean;
  /** new messages from others that the person is not looking at -> in-app banner */
  incoming: Incoming[];
  setViewing: (v: boolean) => void;
  dismissIncoming: (roomId?: number) => void;
  init: (api: SupportCall, upload: UploadCfg, meKey: string, realm: 'it' | 'client') => void;
  setLimits: (l: Partial<Limits>) => void;
  reset: () => void;
  loadRooms: () => Promise<void>;
  refreshRooms: (ms?: number) => void;
  open: (roomId: number | null, aroundId?: number) => Promise<void>;
  loadOlder: (roomId: number) => Promise<void>;
  sync: (roomId: number) => Promise<void>;
  markRead: (roomId: number) => void;
  send: (roomId: number, body: string, files: PickedFile[], folder: string, replyTo: ChatMessage | null) => Promise<void>;
  retry: (roomId: number, key: string) => void;
  dropPending: (roomId: number, key: string) => void;
  edit: (id: number, body: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  onEvent: (ev: any) => void;
  pulse: () => Promise<{ rev: number; settings: string; notices?: number } | null>;
  loadBlooms: () => Promise<void>;
  mayFind: (q: string, roomId?: number | null) => boolean;
};

let roomsTimer: any = null;
let readTimer: any = null;
const syncBusy: Record<number, boolean> = {};
const syncAgain: Record<number, boolean> = {};
let pulseBusy = false;
const aborts: Record<string, AbortController> = {};

const mergeIds = (a: number[], b: number[]) => {
  if (!b.length) return a;
  const set = new Set(a);
  const out = a.slice();
  b.forEach((id) => { if (!set.has(id)) { out.push(id); set.add(id); } });
  return out.sort((x, y) => x - y);
};

export const useChat = create<State>((set, get) => ({
  api: null,
  upload: null,
  realm: 'it',
  meKey: '',
  limits: DEFAULT_LIMITS,
  rooms: [],
  roomsLoaded: false,
  roomsError: '',
  unread: 0,
  activeId: null,
  msgs: {},
  byRoom: {},
  pending: {},
  blooms: {},
  bloomsAt: 0,
  focusId: null,
  marks: {},
  viewing: false,
  incoming: [],

  setViewing: (v) => {
    set({ viewing: v });
    markViewed();
    const id = get().activeId;
    if (v && id) { get().markRead(id); get().dismissIncoming(id); }
  },
  dismissIncoming: (roomId) => set((s) => ({ incoming: roomId ? s.incoming.filter((x) => x.room_id !== roomId) : [] })),

  init: (api, upload, meKey, realm) => set({ api, upload, meKey, realm }),
  setLimits: (l) => set((s) => ({ limits: { ...s.limits, ...l } })),
  reset: () => {
    Object.values(aborts).forEach((a) => a.abort());
    set({ api: null, upload: null, rooms: [], roomsLoaded: false, roomsError: '', unread: 0, activeId: null, msgs: {}, byRoom: {}, pending: {}, blooms: {}, focusId: null, marks: {}, incoming: [], viewing: false });
    markViewed();
  },

  loadRooms: async () => {
    const { api } = get();
    if (!api) return;
    try {
      const r = await api<{ rooms: ChatRoom[]; unread: number; me: string }>('chat.rooms');
      // a room is "being read" only while the chat screen is on screen with that room open
      const active = get().viewing ? get().activeId : null;
      const rooms = r.rooms.map((x) => (x.id === active ? { ...x, unread: 0 } : x));
      // new messages from somebody else in a chat the person is not looking at -> banner
      const prev = get().rooms;
      if (get().roomsLoaded && prev.length) {
        const me = r.me || get().meKey;
        const before: Record<number, number> = {};
        prev.forEach((x) => { before[x.id] = x.last?.id || 0; });
        const fresh: Incoming[] = [];
        rooms.forEach((x) => {
          if (!x.last || x.id === active || x.last.user_key === me) return;
          const was = before[x.id];
          if (was !== undefined && x.last.id <= was) return;
          if (was === undefined && !x.unread) return;
          fresh.push({ room_id: x.id, room_name: x.name, kind: x.kind, user_name: x.last.user_name, text: x.last.text, count: Math.max(1, x.unread), color: x.color, other: x.other, at: Date.now(), last_id: x.last.id });
        });
        if (fresh.length) set((s) => ({ incoming: [...s.incoming.filter((i) => !fresh.some((f) => f.room_id === i.room_id)), ...fresh].slice(-5) }));
      }
      const marks: Record<number, [number, number]> = { ...get().marks };
      rooms.forEach((x) => { if (!marks[x.id]) marks[x.id] = [x.last_message_id, x.rev]; });
      set({ rooms, unread: rooms.reduce((n, x) => n + x.unread, 0), roomsLoaded: true, roomsError: '', marks, meKey: r.me || get().meKey });
    } catch (e: any) {
      set({ roomsLoaded: true, roomsError: e?.status === 403 ? (e?.message || 'Chat is switched off.') : get().roomsError });
    }
  },
  refreshRooms: (ms = 250) => {
    clearTimeout(roomsTimer);
    roomsTimer = setTimeout(() => { void get().loadRooms(); }, ms);
  },

  open: async (roomId, aroundId) => {
    set({ activeId: roomId, focusId: aroundId || null });
    markViewed();
    if (roomId === null) return;
    get().dismissIncoming(roomId);
    const { api } = get();
    if (!api) return;
    const cur = get().byRoom[roomId];
    if (cur?.loaded && !aroundId) { void get().sync(roomId); get().markRead(roomId); return; }
    set((s) => ({ byRoom: { ...s.byRoom, [roomId]: { ...(s.byRoom[roomId] || emptyRoom()), loadingOlder: true, error: '' } } }));
    try {
      const r = await api<{ messages: ChatMessage[]; more_older: boolean; server_time: string }>('chat.messages', aroundId ? { room_id: roomId, around_id: aroundId, limit: 60 } : { room_id: roomId });
      set((s) => {
        const msgs = { ...s.msgs };
        r.messages.forEach((m) => { msgs[m.id] = m; });
        const prev = s.byRoom[roomId] || emptyRoom();
        return { msgs, byRoom: { ...s.byRoom, [roomId]: { ...prev, ids: r.messages.map((m) => m.id), moreOlder: !!r.more_older, loadingOlder: false, loaded: true, error: '', syncAt: r.server_time } } };
      });
      void get().sync(roomId); // read marks (+ newer messages after a search jump)
      get().markRead(roomId);
    } catch (e: any) {
      set((s) => ({ byRoom: { ...s.byRoom, [roomId]: { ...(s.byRoom[roomId] || emptyRoom()), loadingOlder: false, error: e?.message || 'Could not open the chat.' } } }));
    }
  },

  /** scroll up: 40 older messages (keyset — as fast at message 1 as at message 1,000,000) */
  loadOlder: async (roomId) => {
    const { api, byRoom } = get();
    const cur = byRoom[roomId];
    if (!api || !cur || !cur.moreOlder || cur.loadingOlder || !cur.ids.length) return;
    set((s) => ({ byRoom: { ...s.byRoom, [roomId]: { ...cur, loadingOlder: true } } }));
    try {
      const r = await api<{ messages: ChatMessage[]; more_older: boolean }>('chat.messages', { room_id: roomId, before_id: cur.ids[0] });
      set((s) => {
        const msgs = { ...s.msgs };
        r.messages.forEach((m) => { msgs[m.id] = m; });
        const now = s.byRoom[roomId];
        return { msgs, byRoom: { ...s.byRoom, [roomId]: { ...now, ids: mergeIds(now.ids, r.messages.map((m) => m.id)), moreOlder: !!r.more_older, loadingOlder: false } } };
      });
    } catch {
      set((s) => ({ byRoom: { ...s.byRoom, [roomId]: { ...s.byRoom[roomId], loadingOlder: false } } }));
    }
  },

  /** new + edited/deleted messages + read marks of an open room, in one call */
  sync: async (roomId) => {
    const { api } = get();
    const cur = get().byRoom[roomId];
    if (!api || !cur?.loaded) return;
    if (syncBusy[roomId]) { syncAgain[roomId] = true; return; }
    syncBusy[roomId] = true;
    try {
      for (let round = 0; round < 10; round++) {
        const now = get().byRoom[roomId];
        const after = now.ids.length ? now.ids[now.ids.length - 1] : 0;
        const r = await api<{ messages: ChatMessage[]; changed: ChatMessage[]; more_newer: boolean; reads: { key: string; last_read_id: number }[]; rev: number; server_time: string }>(
          'chat.sync', { room_id: roomId, after_id: after, since: now.syncAt || '' });
        set((s) => {
          const msgs = { ...s.msgs };
          r.messages.forEach((m) => { msgs[m.id] = m; });
          r.changed.forEach((m) => { msgs[m.id] = m; });
          const n = s.byRoom[roomId];
          const reads: Record<string, number> = {};
          r.reads.forEach((x) => { reads[x.key] = x.last_read_id; });
          // a message sent from this device may already be in the list
          return { msgs, byRoom: { ...s.byRoom, [roomId]: { ...n, ids: mergeIds(n.ids, r.messages.map((m) => m.id)), reads, rev: r.rev, syncAt: r.server_time } } };
        });
        if (!r.more_newer) break;
      }
      if (get().activeId === roomId && get().viewing) get().markRead(roomId);
    } catch { /* the next event / pulse tries again */ } finally {
      syncBusy[roomId] = false;
      if (syncAgain[roomId]) { syncAgain[roomId] = false; void get().sync(roomId); }
    }
  },

  markRead: (roomId) => {
    if (!get().viewing) return; // not on screen -> stays unread (accurate counts)
    const ids = get().byRoom[roomId]?.ids || [];
    const last = ids.length ? ids[ids.length - 1] : 0;
    const room = get().rooms.find((r) => r.id === roomId);
    set((s) => {
      const rooms = s.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0, last_read_id: Math.max(r.last_read_id, last) } : r));
      return { rooms, unread: rooms.reduce((n, r) => n + r.unread, 0) };
    });
    if (!last || (room && room.last_read_id >= last)) return;
    clearTimeout(readTimer);
    readTimer = setTimeout(() => { void get().api?.('chat.read', { room_id: roomId, last_id: last }).catch(() => {}); }, 400);
  },

  send: async (roomId, body, files, folder, replyTo) => {
    const key = Math.random().toString(36).slice(2);
    const p: Pending = {
      key, room_id: roomId, body, files, jobs: newJobs(files), folder,
      reply_to: replyTo ? { id: replyTo.id, user_name: replyTo.user.name, text: (replyTo.body || '📎 file').slice(0, 120) } : null,
      error: '', stage: files.length ? 'uploading' : 'sending', created_at: new Date().toISOString(),
    };
    set((s) => ({ pending: { ...s.pending, [roomId]: [...(s.pending[roomId] || []), p] } }));
    await runPending(roomId, key);
  },
  retry: (roomId, key) => {
    set((s) => ({ pending: { ...s.pending, [roomId]: (s.pending[roomId] || []).map((q) => (q.key === key ? { ...q, error: '', stage: q.jobs.some((j) => j.status !== 'done') ? 'uploading' : 'sending' } : q)) } }));
    void runPending(roomId, key);
  },
  dropPending: (roomId, key) => {
    aborts[key]?.abort();
    set((s) => ({ pending: { ...s.pending, [roomId]: (s.pending[roomId] || []).filter((q) => q.key !== key) } }));
  },

  edit: async (id, body) => {
    const r = await get().api!<{ message: ChatMessage }>('chat.edit', { message_id: id, body });
    set((s) => ({ msgs: { ...s.msgs, [id]: r.message } }));
    get().refreshRooms();
  },
  remove: async (id) => {
    await get().api!('chat.delete', { message_id: id });
    set((s) => (s.msgs[id] ? { msgs: { ...s.msgs, [id]: { ...s.msgs[id], deleted: true, body: '', files: [], file_count: 0, folder: '', zip_url: null, edited_at: null } } } : {}));
    get().refreshRooms();
  },

  onEvent: (ev) => {
    if (!ev) return;
    if (ev.type === 'settings') return;
    if (ev.type !== 'chat') return;
    const roomId = Number(ev.room_id);
    const known = get().rooms.some((r) => r.id === roomId);
    if (ev.what !== 'read' || !known) get().refreshRooms(ev.what === 'message' ? 120 : 400);
    if (ev.what === 'purge' || ev.what === 'rooms') {
      // messages were removed for good -> reload the room from the newest page
      if (get().byRoom[roomId]) set((s) => { const b = { ...s.byRoom }; delete b[roomId]; return { byRoom: b }; });
      if (get().activeId === roomId) void get().open(roomId);
      return;
    }
    if (get().byRoom[roomId]?.loaded) void get().sync(roomId);
    else if (ev.what === 'read') {
      // ticks in the chat list: a cheap list refresh
      get().refreshRooms(600);
    }
  },

  /** heartbeat without WebSocket: sync just the rooms whose numbers moved */
  pulse: async () => {
    const { api } = get();
    if (!api || pulseBusy) return null;
    pulseBusy = true;
    try {
      const r = await api<{ rooms: [number, number, number][]; rev: number; settings: string; notices?: number }>('chat.pulse', {}, { timeout: 10000 });
      const marks = get().marks;
      const next: Record<number, [number, number]> = {};
      let listChanged = r.rooms.length !== Object.keys(marks).length;
      r.rooms.forEach(([id, last, rev]) => {
        next[id] = [last, rev];
        const m = marks[id];
        if (!m || m[0] !== last || m[1] !== rev) {
          listChanged = true;
          if (get().byRoom[id]?.loaded) void get().sync(id);
        }
      });
      set({ marks: next });
      if (listChanged) get().refreshRooms(50);
      return { rev: r.rev, settings: r.settings, notices: r.notices };
    } catch {
      return null;
    } finally {
      pulseBusy = false;
    }
  },

  loadBlooms: async () => {
    const { api, blooms } = get();
    if (!api) return;
    try {
      const known: Record<number, number> = {};
      Object.keys(blooms).forEach((k) => { known[Number(k)] = blooms[Number(k)].ver; });
      const r = await api<{ blooms: any[] }>('chat.blooms', { known: JSON.stringify(known) }, { timeout: 60000 });
      const lastOf: Record<number, number> = {};
      get().rooms.forEach((x) => { lastOf[x.id] = x.last?.id || 0; });
      const next: Record<number, { ver: number; bloom: Bloom; lastId: number }> = {};
      r.blooms.forEach((b) => {
        if (b.unchanged && blooms[b.room_id]) next[b.room_id] = { ...blooms[b.room_id], lastId: lastOf[b.room_id] || 0 };
        else if (b.bits) next[b.room_id] = { ver: b.ver, bloom: Bloom.fromPayload(b), lastId: lastOf[b.room_id] || 0 };
      });
      set({ blooms: next, bloomsAt: Date.now() });
    } catch { /* search still works through the server */ }
  },

  /** false = no room can contain these words (answered instantly, nothing asked from the server) */
  mayFind: (q, roomId) => {
    const words = searchWords(q);
    if (!words.length) return false;
    const { blooms, rooms } = get();
    const ids = roomId ? [roomId] : rooms.map((r) => r.id);
    for (const id of ids) {
      const b = blooms[id];
      if (!b) return true;
      const room = rooms.find((r) => r.id === id);
      if (room?.last && room.last.id > b.lastId) return true;
      if (b.bloom.mayMatch(q)) return true;
    }
    if (Date.now() - get().bloomsAt > 120000) void get().loadBlooms();
    return false;
  },
}));

/** which chat is on screen (the phone's notification handler skips pushes for exactly that chat) */
function markViewed() {
  const st = useChat.getState();
  (globalThis as any).__supportViewingRoom = st.viewing && st.activeId ? st.activeId : null;
}

/** upload the files of a waiting message (only those not done yet), then send it */
async function runPending(roomId: number, key: string) {
  const st = useChat.getState();
  const find = () => (useChat.getState().pending[roomId] || []).find((q) => q.key === key);
  const patch = (x: Partial<Pending> | ((p: Pending) => Partial<Pending>)) => useChat.setState((s) => ({
    pending: { ...s.pending, [roomId]: (s.pending[roomId] || []).map((q) => (q.key === key ? { ...q, ...(typeof x === 'function' ? x(q) : x) } : q)) },
  }));
  const p = find();
  if (!p || !st.api) return;
  let tokens: string[] = [];
  if (p.files.length) {
    if (!st.upload) { patch({ stage: 'error', error: 'Files cannot be sent from here.' }); return; }
    const ac = new AbortController();
    aborts[key] = ac;
    const jobs = p.jobs.map((j) => ({ ...j }));
    // progress updates are batched (~8 per second) so a folder of 200 files stays smooth
    let queued: Record<string, Partial<Job>> = {};
    let flushT: any = null;
    const flush = () => { flushT = null; const q = queued; queued = {}; patch((cur) => ({ jobs: cur.jobs.map((j) => (q[j.key] ? { ...j, ...q[j.key] } : j)) })); };
    const r = await uploadJobs(st.upload, p.files, jobs, (k, x) => {
      queued[k] = { ...(queued[k] || {}), ...x };
      if (x.status === 'done' || x.status === 'error') { clearTimeout(flushT); flush(); } else if (!flushT) flushT = setTimeout(flush, 120);
    }, ac.signal);
    clearTimeout(flushT); flush();
    delete aborts[key];
    if (!find()) return; // removed while uploading
    if (r.failed) {
      patch({ stage: 'error', error: r.failed === p.files.length ? 'Upload failed.' : `${r.failed} of ${p.files.length} files failed — retry sends only those.` });
      return;
    }
    tokens = r.tokens;
  }
  patch({ stage: 'sending' });
  const cur = find()!;
  try {
    const r = await st.api<{ message: ChatMessage }>('chat.send', { room_id: roomId, body: cur.body, files: tokens, folder: cur.folder, reply_to: cur.reply_to?.id || '' }, { timeout: 120000 });
    useChat.setState((s) => {
      const now = s.byRoom[roomId] || { ...emptyRoom(), loaded: true };
      return {
        msgs: { ...s.msgs, [r.message.id]: r.message },
        byRoom: { ...s.byRoom, [roomId]: { ...now, ids: mergeIds(now.ids, [r.message.id]) } },
        pending: { ...s.pending, [roomId]: (s.pending[roomId] || []).filter((q) => q.key !== key) },
        marks: s.marks[roomId] ? { ...s.marks, [roomId]: [r.message.id, s.marks[roomId][1]] } : s.marks,
        rooms: s.rooms.map((x) => (x.id === roomId ? { ...x, last: { id: r.message.id, user_key: s.meKey, user_name: r.message.user.name, text: r.message.body || (r.message.file_count ? `📎 ${r.message.file_count} file${r.message.file_count === 1 ? '' : 's'}` : '') }, last_at: r.message.created_at, last_read_id: r.message.id, last_message_id: r.message.id } : x)),
      };
    });
    useChat.getState().refreshRooms(800);
  } catch (e: any) {
    patch({ stage: 'error', error: e?.message || 'Not sent — check the connection.' });
  }
}
