// FILE: src/features/support/itStore.ts
// IT Desk state: cards by id, the four board columns, the list view, counts, filters, users,
// the search Bloom filter and the live-update merge. Lazy loading everywhere (40 cards a page,
// keyset cursors) so 1 lakh+ cards never sit in memory at once.
//
// SMOOTH LIVE UPDATES (nothing blinks, no loaders for background work):
//   • live changes are collected for a moment and merged in ONE update (50 tickets at once = 1 render)
//   • a change that is older than / identical to what is on screen is ignored (echo of own save,
//     the same event through WebSocket + the changes feed)
//   • refreshing a column / list / history keeps the cards on screen until the new page arrives
//   • counts, tiles and the search index refresh quietly in the background
import { create } from 'zustand';
import type { SupportCall } from './api';
import { Bloom } from './bloom';
import { EMPTY_FILTERS, Filters, filtersToParams, inPeriod, ItUser, matchesFilters, Period, periodFor, periodParams, Status, STATUSES, TeamReport, Ticket } from './model';

const PAGE = 40;
type Col = { ids: number[]; cursor: string | null; more: boolean; loading: boolean; error: string; loaded: boolean };
const emptyCol = (): Col => ({ ids: [], cursor: null, more: false, loading: false, error: '', loaded: false });
const emptyCols = () => ({ todo: emptyCol(), in_progress: emptyCol(), review: emptyCol(), done: emptyCol() } as Record<Status, Col>);

export type Overview = { new_tickets: number; my_open: number; overdue: number; done_today: number; open_total: number };
export type Counts = Record<Status | 'total', number> & { done_all?: number };
export type View = 'board' | 'list' | 'history' | 'team' | 'chat' | 'activity' | 'settings' | 'storage' | 'server';
export type DayCount = { key: number; total: number; done: number; open: number; est_min: number; spent_min: number };
export type Stats = { total: number; done: number; open: number; tickets: number; est_min: number; spent_min: number; counts: Counts;
  people: { key: any; label: string; total: number; done: number; est_min: number; spent_min: number }[] };
/** board "Done" column shows only cards done in the last N days (0 = all); older ones are in History */
export const DONE_WINDOWS = [7, 30, 90, 0];

type State = {
  api: SupportCall | null;
  me: ItUser | null;
  users: ItUser[];
  meta: any;
  overview: Overview | null;
  tickets: Record<number, Ticket>;
  cols: Record<Status, Col>;
  list: Col;
  listSort: 'rev' | 'created';
  counts: Counts | null;
  filters: Filters;
  noMatch: boolean; // the Bloom filter answered "no card can match" -> nothing was asked from the server
  bloom: Bloom | null;
  bloomVer: number | null;
  bloomStale: boolean;
  gen: number; // bumps on every filter change; late answers of old filters are dropped
  view: View;
  doneDays: number;
  hist: Col;
  period: Period;
  histDays: Record<number, DayCount>; // exact count per day of the period (day headers)
  histMonths: DayCount[]; // year view: the 12 months
  histStats: Stats | null;
  team: TeamReport | null;
  teamLoading: boolean;
  teamError: string;

  init: (api: SupportCall, me: ItUser, users: ItUser[], meta: any, overview: Overview) => void;
  reset: () => void;
  setUsers: (users: ItUser[]) => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  reloadBoard: () => Promise<void>;
  loadColumn: (s: Status, reset?: boolean) => Promise<void>;
  loadList: (reset?: boolean) => Promise<void>;
  setListSort: (s: 'rev' | 'created') => void;
  refreshCounts: () => void;
  refreshOverview: () => void;
  applyTickets: (items: Ticket[]) => void;
  /** live changes: batched, then applyTickets */
  queueTickets: (items: Ticket[]) => void;
  moveLocal: (id: number, to: Status, index: number) => { before: number | null; after: number | null; undo: () => void };
  loadBloom: () => Promise<void>;
  markBloomStale: () => void;
  setView: (v: View) => void;
  setDoneDays: (n: number) => void;
  setPeriod: (p: Period) => void;
  loadHistory: (reset?: boolean) => Promise<void>;
  loadHistoryMeta: () => Promise<void>;
  /** Team tab (person-wise report); quiet = live refresh without any loader */
  loadTeam: (quiet?: boolean) => Promise<void>;
};

const cmpPos = (a: Ticket, b: Ticket) => a.position - b.position || b.id - a.id;
const cmpRev = (a: Ticket, b: Ticket) => b.rev - a.rev;
const cmpCreated = (a: Ticket, b: Ticket) => b.id - a.id;
/** history: newest day first, inside a day in the order added (same as the server + Excel) */
const cmpDate = (a: Ticket, b: Ticket) => (b.work_date || 0) - (a.work_date || 0) || a.id - b.id;

/** put id into a sorted, loaded-from-the-top slice; past the end while more exist = not loaded yet -> left out */
function placeSorted(ids: number[], id: number, map: Record<number, Ticket>, cmp: (a: Ticket, b: Ticket) => number, more: boolean): number[] {
  const rest = ids.filter((x) => x !== id);
  const t = map[id];
  let i = rest.findIndex((x) => map[x] && cmp(t, map[x]) < 0);
  if (i < 0) {
    if (more) return rest;
    i = rest.length;
  }
  rest.splice(i, 0, id);
  return rest;
}

let countsTimer: any = null;
let overviewTimer: any = null;
let bloomTimer: any = null;
let histTimer: any = null;
let queueTimer: any = null;
let teamTimer: any = null;
let queued: Record<number, Ticket> = {};

/** same card, same revision, nothing to redraw? */
const sameCard = (a: Ticket, b: Ticket) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

export const useItDesk = create<State>((set, get) => ({
  api: null,
  me: null,
  users: [],
  meta: null,
  overview: null,
  tickets: {},
  cols: emptyCols(),
  list: emptyCol(),
  listSort: 'rev',
  counts: null,
  filters: { ...EMPTY_FILTERS },
  noMatch: false,
  bloom: null,
  bloomVer: null,
  bloomStale: true,
  gen: 0,
  view: 'board',
  doneDays: 7,
  hist: emptyCol(),
  period: periodFor('month'),
  histDays: {},
  histMonths: [],
  histStats: null,
  team: null,
  teamLoading: false,
  teamError: '',

  init: (api, me, users, meta, overview) => set({ api, me, users, meta, overview }),
  reset: () => { clearTimeout(queueTimer); queueTimer = null; queued = {}; set({ api: null, me: null, users: [], tickets: {}, cols: emptyCols(), list: emptyCol(), hist: emptyCol(), histDays: {}, histMonths: [], histStats: null, counts: null, filters: { ...EMPTY_FILTERS }, bloom: null, bloomVer: null, bloomStale: true, overview: null, noMatch: false }); },
  setUsers: (users) => set({ users }),

  setFilters: (patch) => {
    set((s) => ({ filters: { ...s.filters, ...patch }, gen: s.gen + 1 }));
  },
  clearFilters: () => set((s) => ({ filters: { ...EMPTY_FILTERS }, gen: s.gen + 1 })),

  reloadBoard: async () => {
    const s = get();
    const q = s.filters.q.trim();
    // instant "no match" from the Bloom filter (only while it is fresh)
    if (q && s.bloom && !s.bloomStale && !s.bloom.mayMatch(q)) {
      set({ noMatch: true, cols: Object.fromEntries(STATUSES.map((x) => [x.key, { ...emptyCol(), loaded: true }])) as any, counts: { todo: 0, in_progress: 0, review: 0, done: 0, total: 0 } });
      return;
    }
    // keep the cards on screen while the new pages load (no flash of an empty board)
    set({ noMatch: false });
    await Promise.all(STATUSES.map((x) => get().loadColumn(x.key, true)));
  },

  loadColumn: async (status, reset = false) => {
    const { api, filters, gen } = get();
    if (!api) return;
    const col = get().cols[status];
    if ((col.loading && !reset) || (!reset && col.loaded && !col.more)) return;
    set((s) => ({ cols: { ...s.cols, [status]: { ...s.cols[status], loading: true, error: '' } } }));
    try {
      const r = await api<{ items: Ticket[]; next_cursor: string | null; counts?: Counts; rev: number }>('tickets.list', {
        ...filtersToParams(filters), status, sort: 'position', limit: PAGE, cursor: reset ? '' : col.cursor || '', counts: status === 'todo' && reset ? '1' : '',
        done_days: get().doneDays ? String(get().doneDays) : '',
      });
      if (get().gen !== gen) return;
      set((s) => {
        const tickets = { ...s.tickets };
        r.items.forEach((t) => { tickets[t.id] = t; });
        const base = reset ? [] : s.cols[status].ids;
        const ids = [...base, ...r.items.map((t) => t.id).filter((id) => !base.includes(id))];
        return {
          tickets,
          cols: { ...s.cols, [status]: { ids, cursor: r.next_cursor, more: !!r.next_cursor, loading: false, error: '', loaded: true } },
          counts: r.counts ? r.counts : s.counts,
        };
      });
    } catch (e: any) {
      if (get().gen !== gen) return;
      set((s) => ({ cols: { ...s.cols, [status]: { ...s.cols[status], loading: false, error: e?.message || 'Could not load.' } } }));
    }
  },

  loadList: async (reset = false) => {
    const { api, filters, gen, listSort, bloom, bloomStale } = get();
    if (!api) return;
    const q = filters.q.trim();
    if (reset && q && bloom && !bloomStale && !bloom.mayMatch(q)) {
      set({ noMatch: true, list: { ...emptyCol(), loaded: true } });
      return;
    }
    const cur = get().list;
    if ((cur.loading && !reset) || (!reset && cur.loaded && !cur.more)) return;
    set((s) => ({ noMatch: false, list: { ...s.list, loading: true, error: '' } }));
    try {
      const r = await api<{ items: Ticket[]; next_cursor: string | null; counts?: Counts }>('tickets.list', {
        ...filtersToParams(filters), sort: listSort, limit: PAGE, cursor: reset ? '' : cur.cursor || '', counts: reset ? '1' : '',
      });
      if (get().gen !== gen || get().listSort !== listSort) return;
      set((s) => {
        const tickets = { ...s.tickets };
        r.items.forEach((t) => { tickets[t.id] = t; });
        const base = reset ? [] : s.list.ids;
        return {
          tickets,
          list: { ids: [...base, ...r.items.map((t) => t.id).filter((id) => !base.includes(id))], cursor: r.next_cursor, more: !!r.next_cursor, loading: false, error: '', loaded: true },
          counts: r.counts || s.counts,
        };
      });
    } catch (e: any) {
      if (get().gen !== gen) return;
      set((s) => ({ list: { ...s.list, loading: false, error: e?.message || 'Could not load.' } }));
    }
  },

  setListSort: (listSort) => set((s) => ({ listSort, gen: s.gen + 1 })),

  refreshCounts: () => {
    clearTimeout(countsTimer);
    countsTimer = setTimeout(async () => {
      const { api, filters, view, doneDays } = get();
      if (!api) return;
      try {
        const r = await api<{ counts: Counts }>('tickets.counts', { ...filtersToParams(filters), done_days: view === 'board' && doneDays ? String(doneDays) : '' });
        set({ counts: r.counts });
      } catch { /* keep the old numbers */ }
    }, 700);
  },

  refreshOverview: () => {
    clearTimeout(overviewTimer);
    overviewTimer = setTimeout(async () => {
      const { api } = get();
      if (!api) return;
      try { set({ overview: await api<Overview>('overview') }); } catch { /* ignore */ }
    }, 900);
  },

  /** live changes (WebSocket / changes feed / own saves) merged into every loaded view */
  applyTickets: (incoming) => {
    const cur = get().tickets;
    const items = incoming.filter((t) => {
      const ex = cur[t.id];
      if (!ex) return true;
      if (t.rev < ex.rev) return false; // older news than what is on screen
      if (t.rev === ex.rev && sameCard(t, ex)) return false; // nothing changed (echo)
      return true;
    });
    if (!items.length) return;
    set((s) => {
      const tickets = { ...s.tickets };
      const cols = { ...s.cols } as Record<Status, Col>;
      let list = s.list;
      let hist = s.hist;
      const doneSince = s.doneDays ? Date.now() - s.doneDays * 86400000 : 0;
      for (const t of items) {
        tickets[t.id] = t;
        const ok = matchesFilters(t, s.filters, s.me);
        const onBoard = ok && !(t.status === 'done' && doneSince && t.resolved_at && new Date(t.resolved_at).getTime() < doneSince);
        if (hist.loaded) {
          if (ok && !s.noMatch && inPeriod(t, s.period)) hist = { ...hist, ids: placeSorted(hist.ids, t.id, tickets, cmpDate, hist.more) };
          else if (hist.ids.includes(t.id)) hist = { ...hist, ids: hist.ids.filter((x) => x !== t.id) };
        }
        for (const st of STATUSES) {
          const c = cols[st.key];
          if (!c.loaded) continue;
          if (onBoard && t.status === st.key && !s.noMatch) cols[st.key] = { ...c, ids: placeSorted(c.ids, t.id, tickets, cmpPos, c.more) };
          else if (c.ids.includes(t.id)) cols[st.key] = { ...c, ids: c.ids.filter((x) => x !== t.id) };
        }
        if (list.loaded) {
          if (ok && !s.noMatch) list = { ...list, ids: placeSorted(list.ids, t.id, tickets, s.listSort === 'rev' ? cmpRev : cmpCreated, list.more) };
          else if (list.ids.includes(t.id)) list = { ...list, ids: list.ids.filter((x) => x !== t.id) };
        }
      }
      return { tickets, cols, list, hist };
    });
    get().refreshCounts();
    get().refreshOverview();
    get().markBloomStale();
    if (get().view === 'history') {
      clearTimeout(histTimer);
      histTimer = setTimeout(() => { void get().loadHistoryMeta(); }, 900);
    }
    if (get().view === 'team') {
      clearTimeout(teamTimer);
      teamTimer = setTimeout(() => { void get().loadTeam(true); }, 1500);
    }
  },

  queueTickets: (items) => {
    for (const t of items) {
      const q = queued[t.id];
      if (!q || t.rev >= q.rev) queued[t.id] = t;
    }
    if (queueTimer) return;
    queueTimer = setTimeout(() => {
      const batch = Object.values(queued);
      queued = {};
      queueTimer = null;
      get().applyTickets(batch);
    }, 120);
  },

  /** optimistic drag result; returns the neighbours for the server + an undo */
  moveLocal: (id, to, index) => {
    const before = get();
    const snapshot = { cols: before.cols, tickets: before.tickets };
    const t = before.tickets[id];
    const cols = { ...before.cols } as Record<Status, Col>;
    STATUSES.forEach((s) => { if (cols[s.key].ids.includes(id)) cols[s.key] = { ...cols[s.key], ids: cols[s.key].ids.filter((x) => x !== id) }; });
    const target = [...cols[to].ids];
    const i = Math.max(0, Math.min(index, target.length));
    target.splice(i, 0, id);
    cols[to] = { ...cols[to], ids: target };
    const above = i > 0 ? target[i - 1] : null;
    const below = i < target.length - 1 ? target[i + 1] : null;
    // a temporary position between the neighbours so the live merge keeps the same order
    const pa = above != null ? before.tickets[above]?.position : null;
    const pb = below != null ? before.tickets[below]?.position : null;
    const pos = pa != null && pb != null ? (pa + pb) / 2 : pa != null ? pa + 1024 : pb != null ? pb - 1024 : 0;
    set({ cols, tickets: { ...before.tickets, [id]: { ...t, status: to, position: pos } } });
    return { before: above, after: below, undo: () => set(snapshot) };
  },

  loadBloom: async () => {
    const { api, bloomVer } = get();
    if (!api) return;
    try {
      const r = await api<any>('bloom', { ver: bloomVer ?? '' }, { timeout: 60000 });
      if (r.unchanged) set({ bloomStale: false });
      else if (r.bits) set({ bloom: Bloom.fromPayload(r), bloomVer: r.ver, bloomStale: false });
    } catch { /* search still works through the server */ }
  },

  markBloomStale: () => {
    // while stale, searches simply go to the server (always correct); the new index is fetched
    // once things are quiet for a while — not after every single change
    if (!get().bloomStale) set({ bloomStale: true });
    clearTimeout(bloomTimer);
    bloomTimer = setTimeout(() => { void get().loadBloom(); }, 20000);
  },

  setView: (view) => set({ view }),
  setDoneDays: (doneDays) => set((s) => ({ doneDays, gen: s.gen + 1 })),
  setPeriod: (period) => set((s) => ({ period, gen: s.gen + 1 })),

  /** History: every card of the period (filters too), newest day first — 40 at a time */
  loadHistory: async (reset = false) => {
    const { api, filters, gen, period, bloom, bloomStale } = get();
    if (!api) return;
    const q = filters.q.trim();
    if (reset && q && bloom && !bloomStale && !bloom.mayMatch(q)) {
      set({ noMatch: true, hist: { ...emptyCol(), loaded: true }, histDays: {}, histStats: null });
      return;
    }
    const cur = get().hist;
    if ((cur.loading && !reset) || (!reset && cur.loaded && !cur.more)) return;
    set((s) => ({ noMatch: false, hist: { ...s.hist, loading: true, error: '' } }));
    if (reset) void get().loadHistoryMeta();
    try {
      const r = await api<{ items: Ticket[]; next_cursor: string | null }>('tickets.list', {
        ...filtersToParams(filters), from: '', to: '', ...periodParams(period), sort: 'date', limit: PAGE, cursor: reset ? '' : cur.cursor || '',
      });
      if (get().gen !== gen) return;
      set((s) => {
        const tickets = { ...s.tickets };
        r.items.forEach((t) => { tickets[t.id] = t; });
        const base = reset ? [] : s.hist.ids;
        return { tickets, hist: { ids: [...base, ...r.items.map((t) => t.id).filter((id) => !base.includes(id))], cursor: r.next_cursor, more: !!r.next_cursor, loading: false, error: '', loaded: true } };
      });
    } catch (e: any) {
      if (get().gen !== gen) return;
      set((s) => ({ hist: { ...s.hist, loading: false, error: e?.message || 'Could not load.' } }));
    }
  },

  loadTeam: async (quiet = false) => {
    const { api, filters, gen, period } = get();
    if (!api) return;
    if (!quiet) set({ teamLoading: true, teamError: '' });
    try {
      // person-wise: who it is assigned to is the report itself, so the assignee / search filters are left out
      const { assignee, q, ...f } = filtersToParams(filters) as any;
      void assignee; void q;
      const r = await api<TeamReport>('team.report', { ...f, from: '', to: '', ...periodParams(period) });
      if (get().gen !== gen && !quiet) return;
      set({ team: r, teamLoading: false, teamError: '' });
    } catch (e: any) {
      if (!quiet) set({ teamLoading: false, teamError: e?.message || 'Could not load the team report.' });
    }
  },

  /** totals of the period + exact count of each day (+ the 12 months in year view) */
  loadHistoryMeta: async () => {
    const { api, filters, gen, period } = get();
    if (!api) return;
    const base = { ...filtersToParams(filters), from: '', to: '', ...periodParams(period) };
    const year = Math.floor((period.from || Number(`${new Date().getFullYear()}0101`)) / 10000);
    try {
      const [st, days, months] = await Promise.all([
        api<Stats>('tickets.stats', base),
        period.mode === 'all' ? Promise.resolve({ items: [] as DayCount[] }) : api<{ items: DayCount[] }>('tickets.periods', { ...base, group: 'day' }),
        period.mode === 'year' ? api<{ items: DayCount[] }>('tickets.periods', { ...base, group: 'month', year: String(year) }) : Promise.resolve({ items: [] as DayCount[] }),
      ]);
      if (get().gen !== gen) return;
      const map: Record<number, DayCount> = {};
      days.items.forEach((d) => { map[d.key] = d; });
      set({ histStats: st, histDays: map, histMonths: months.items });
    } catch { /* the list still works */ }
  },
}));
