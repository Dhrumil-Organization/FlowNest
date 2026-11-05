// FILE: src/screens/samplingHub/samplingHubModel.ts
// Types, normalizers and the movement-log rules of the Sampling Hub (same rules as SamplingHubController::replay
// and the ERP Designing artifact). Status / location / balance are NEVER stored — always read off the log.

export type SmpTypeKey = 'garment' | 'hanger' | 'booklet' | 'fabric' | 'swatch';
export type PurposeKey = 'dispatch' | 'show' | 'return' | 'internal' | 'consume' | 'split' | 'event_out' | 'event_in';

export const SMP_TYPES: { k: SmpTypeKey; lbl: string; pfx: string; icon: string; color: string; unit: string; photo: boolean; tracked: boolean | null }[] = [
  { k: 'garment', lbl: 'Garment', pfx: 'GAR', icon: 'checkroom', color: '#652880', unit: 'pc', photo: true, tracked: true },
  { k: 'hanger', lbl: 'Hanger', pfx: 'HNG', icon: 'dry-cleaning', color: '#3A568A', unit: 'pc', photo: false, tracked: true },
  { k: 'booklet', lbl: 'Booklet', pfx: 'BKL', icon: 'menu-book', color: '#C87533', unit: 'pc', photo: false, tracked: true },
  { k: 'fabric', lbl: 'Fabric sample', pfx: 'FAB', icon: 'texture', color: '#2A6044', unit: 'cutting', photo: false, tracked: null },
  { k: 'swatch', lbl: 'Swatch card', pfx: 'SWC', icon: 'style', color: '#1C567A', unit: 'card', photo: false, tracked: null },
];
export const SMP_TYPE = Object.fromEntries(SMP_TYPES.map((t) => [t.k, t])) as Record<SmpTypeKey, (typeof SMP_TYPES)[number]>;

export const PURPOSES: { k: PurposeKey; lbl: string; short: string; color: string; out: boolean; party: 'required' | 'optional' | 'none'; event?: boolean }[] = [
  { k: 'dispatch', lbl: 'Sent to customer', short: 'Dispatch', color: '#652880', out: true, party: 'required' },
  { k: 'show', lbl: 'Taken for showing', short: 'Showing', color: '#C87533', out: true, party: 'optional' },
  { k: 'return', lbl: 'Returned to inventory', short: 'Return', color: '#2A6044', out: false, party: 'none' },
  { k: 'internal', lbl: 'Internal use', short: 'Internal', color: '#3A568A', out: true, party: 'none' },
  { k: 'consume', lbl: 'Consumed / given away', short: 'Consumed', color: '#B23A2A', out: true, party: 'optional' },
  { k: 'split', lbl: 'Split into individual items', short: 'Split', color: '#9A9590', out: true, party: 'none' },
  // events of the Event module (api/getevent): scan → event + who carries it; scan again on the way back
  { k: 'event_out', lbl: 'Taken to event', short: 'Event out', color: '#0E7C86', out: true, party: 'none', event: true },
  { k: 'event_in', lbl: 'Back from event', short: 'Event in', color: '#3B7A3A', out: false, party: 'none', event: true },
];
export const PURPOSE = Object.fromEntries(PURPOSES.map((p) => [p.k, p])) as Record<PurposeKey, (typeof PURPOSES)[number]>;

export const GARMENTS = ['Shirt', 'Kurta', 'Trouser', 'Dress', 'Jacket', 'Top', 'Other'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];

export type Content = { md_id: string; design: string; category: string; sd_ids: string[]; colourways: string[] };
export type Sample = {
  id: string; uid: string; prpcode: string; type: SmpTypeKey; name: string; work_name: string; md_id: string; design: string; dsn_code: string; category: string; design_gone: boolean;
  sd_id: string; colourway: string; colour: string; garment: string; size: string; metres: number; range: string;
  qty: number; tracked: boolean; parent: string; note: string; created: string; by: string; by_id: string;
  edited_by: string; edited_at: string; contents: Content[]; photo: boolean;
};
export type Move = {
  id: number; no: string; sample: string; date: string; ts: string; purpose: PurposeKey; parcode: string; party: string;
  qty: number; note: string; by: string; by_id: string; edited_by: string;
  /** event movements: the event (Event module, api/getevent), who carries it, and (event_in) the event_out it closes; by = who scanned it */
  event_id: string; event: string; carrier_id: string; carrier: string; ref_move: number;
};
export type SmpEvent = { id: string; name: string; status: string; active: boolean; created: string };
export type Person = { id: string; name: string; exec: boolean };
export type EventsData = { ready: boolean; setup: string; events: SmpEvent[]; default: string; people: Person[]; me: { id: string; name: string } };
export type Rights = { view: boolean; add: boolean; edit: boolean; delete: boolean; move: boolean; print: boolean };
export type ListData = { prptype: string; today: string; me: { id: string; name: string }; rights: Rights; samples: Sample[]; moves: Move[] };
export type Design = { id: string; code: string; dsn_code: string; category: string; type: string; cw_count: number };
export type Customer = { code: string; name: string; city: string };
export type Colourway = { id: string; code: string; commercial: string; shade_code: string; colours: string[] };
export type Masters = { designs: Design[]; categories: string[]; customers: Customer[]; garments: string[]; sizes: string[] };

const s = (v: any) => (v == null ? '' : String(v)).trim();
const n = (v: any) => { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

/** axios response / envelope → data; refuses HTML / text answers */
export function unwrap(response: any): any {
  const body = response && typeof response === 'object' && 'data' in response && 'status' in response && 'headers' in response ? response.data : response;
  if (typeof body === 'string') {
    const t = body.trim();
    throw new Error(t.startsWith('<') ? 'The server sent a web page instead of data — check the API route.' : t.slice(0, 200) || 'Empty answer from the server.');
  }
  if (body && typeof body === 'object' && body.success === false) throw new Error(body.message || 'Request failed.');
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}
export function errText(e: any, fallback: string): string {
  const d = e?.response?.data;
  if (d && typeof d === 'object' && d.message) return String(d.message);
  if (typeof d === 'string' && d.trim() && !d.trim().startsWith('<')) return d.trim().slice(0, 300);
  if (e?.response?.status) return `${fallback} (HTTP ${e.response.status})`;
  return e?.message || fallback;
}
/** 409 answers: { code: 'similar', similar: [...] } */
export const errCode = (e: any): string => s(e?.response?.data?.code);

export function normalizeList(raw: any): ListData {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.samples)) throw new Error('The server sent an unexpected answer for the Sampling Hub.');
  const r = raw.rights || {};
  return {
    prptype: s(raw.prptype),
    today: s(raw.today),
    me: { id: s(raw.me?.id), name: s(raw.me?.name) || 'User' },
    rights: { view: !!r.view, add: !!r.add, edit: !!r.edit, delete: !!r.delete, move: !!r.move, print: !!r.print },
    samples: arr(raw.samples).map((x: any): Sample => ({
      id: s(x.id), uid: s(x.uid), prpcode: s(x.prpcode), type: (SMP_TYPE[s(x.type) as SmpTypeKey] ? s(x.type) : 'garment') as SmpTypeKey, name: s(x.name), work_name: s(x.work_name), md_id: s(x.md_id),
      design: s(x.design), dsn_code: s(x.dsn_code), category: s(x.category), design_gone: !!x.design_gone, sd_id: s(x.sd_id),
      colourway: s(x.colourway), colour: s(x.colour), garment: s(x.garment), size: s(x.size), metres: n(x.metres), range: s(x.range),
      qty: Math.max(1, Math.round(n(x.qty)) || 1), tracked: !!x.tracked, parent: s(x.parent), note: s(x.note), created: s(x.created),
      by: s(x.by), by_id: s(x.by_id), edited_by: s(x.edited_by), edited_at: s(x.edited_at), photo: !!x.photo,
      contents: arr(x.contents).map((c: any) => ({ md_id: s(c.md_id), design: s(c.design), category: s(c.category), sd_ids: arr(c.sd_ids).map(s), colourways: arr(c.colourways).map(s) })),
    })),
    moves: arr(raw.moves).map((m: any): Move => ({
      id: Math.round(n(m.id)), no: s(m.no), sample: s(m.sample), date: s(m.date), ts: s(m.ts),
      purpose: (PURPOSE[s(m.purpose) as PurposeKey] ? s(m.purpose) : 'show') as PurposeKey, parcode: s(m.parcode), party: s(m.party),
      qty: Math.max(1, Math.round(n(m.qty)) || 1), note: s(m.note), by: s(m.by), by_id: s(m.by_id), edited_by: s(m.edited_by),
      event_id: s(m.event_id), event: s(m.event), carrier_id: s(m.carrier_id), carrier: s(m.carrier), ref_move: Math.round(n(m.ref_move)),
    })),
  };
}
export function normalizeMasters(raw: any): Masters {
  return {
    designs: arr(raw?.designs).map((d: any) => ({ id: s(d.id), code: s(d.code), dsn_code: s(d.dsn_code), category: s(d.category), type: s(d.type), cw_count: n(d.cw_count) })).filter((d) => d.id),
    categories: arr(raw?.categories).map(s).filter(Boolean),
    customers: arr(raw?.customers).map((c: any) => ({ code: s(c.code), name: s(c.name), city: s(c.city) })).filter((c) => c.code && c.name),
    garments: arr(raw?.garments).map(s).filter(Boolean).length ? arr(raw.garments).map(s) : GARMENTS,
    sizes: arr(raw?.sizes).map(s).filter(Boolean).length ? arr(raw.sizes).map(s) : SIZES,
  };
}
export function normalizeEvents(raw: any): EventsData {
  const ev = arr(raw?.events).map((e: any): SmpEvent => ({ id: s(e.id), name: s(e.name) || 'Event ' + s(e.id), status: s(e.status), active: !!e.active, created: s(e.created) })).filter((e) => e.id);
  return {
    ready: !!raw?.ready, setup: s(raw?.setup), events: ev, default: s(raw?.default) || ev.find((e) => e.active)?.id || '',
    people: arr(raw?.people).map((p: any): Person => ({ id: s(p.id), name: s(p.name), exec: !!p.exec })).filter((p) => p.id && p.name),
    me: { id: s(raw?.me?.id), name: s(raw?.me?.name) },
  };
}
export const normalizeColourways = (raw: any): Colourway[] =>
  arr(raw?.colourways).map((c: any) => ({ id: s(c.id), code: s(c.code), commercial: s(c.commercial), shade_code: s(c.shade_code), colours: arr(c.colours).map(s).filter(Boolean) })).filter((c) => c.id);

/* ------------------------------ movement log → status ------------------------------ */
export type StCode = 'in' | 'out' | 'use' | 'sent' | 'event' | 'gone';
export type SmpState = {
  code: StCode; label: string; where: string; last: Move | null; color: string; bal: number; out: number; sent: number;
  /** tracked item at an event: that event + its event_out; batch: quantity still at each event */
  event_id: string; event: string; atEvents: Record<string, number>; eventNames: Record<string, string>;
};

export const movesOf = (moves: Move[], id: string) =>
  moves.filter((m) => m.sample === id).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

export function smpState(sm: Sample, moves: Move[]): SmpState {
  const ms = movesOf(moves, sm.id);
  const last = ms[ms.length - 1] || null;
  const names: Record<string, string> = {};
  ms.forEach((m) => { if (m.purpose === 'event_out' && m.event_id) names[m.event_id] = m.event || m.event_id; });
  if (!sm.tracked) {
    let bal = sm.qty, outQ = 0, sent = 0;
    const at: Record<string, number> = {};
    ms.forEach((m) => {
      if (m.purpose === 'return' || m.purpose === 'event_in') { bal += m.qty; outQ -= m.qty; } else { bal -= m.qty; outQ += m.qty; }
      if (m.purpose === 'dispatch') sent += m.qty;
      if (m.purpose === 'event_out' && m.event_id) at[m.event_id] = (at[m.event_id] || 0) + m.qty;
      if (m.purpose === 'event_in' && m.event_id) { at[m.event_id] = (at[m.event_id] || 0) - m.qty; if (at[m.event_id] <= 0) delete at[m.event_id]; }
    });
    bal = Math.max(0, bal);
    const evN = Object.values(at).reduce((t, x) => t + x, 0);
    return {
      code: bal > 0 ? 'in' : 'gone', label: bal > 0 ? 'In inventory' : 'Fully issued',
      where: 'Sampling store' + (evN ? ` · ${evN} at event${Object.keys(at).length > 1 ? 's' : ''}` : ''), bal, out: Math.max(0, outQ), sent, last,
      color: bal > 0 ? '#2A6044' : '#9A9590', event_id: '', event: '', atEvents: at, eventNames: names,
    };
  }
  const base = { last, out: 0, sent: 0, event_id: '', event: '', atEvents: {} as Record<string, number>, eventNames: names };
  if (last && last.purpose === 'event_in') return { ...base, code: 'in', label: 'In inventory', where: 'Sampling store · back from ' + (last.event || 'event'), color: '#2A6044', bal: 1 };
  if (last && last.purpose === 'event_out') {
    return { ...base, code: 'event', label: 'At event · ' + (last.event || last.event_id), where: (last.event || 'event') + (last.carrier ? ' · with ' + last.carrier : ''),
      color: '#0E7C86', bal: 0, event_id: last.event_id, event: last.event || last.event_id, atEvents: { [last.event_id]: 1 } };
  }
  if (!last || last.purpose === 'return') return { ...base, code: 'in', label: 'In inventory', where: 'Sampling store', color: '#2A6044', bal: 1 };
  if (last.purpose === 'dispatch') return { ...base, code: 'sent', label: 'Sent to ' + (last.party || 'customer'), where: last.party || 'customer', color: '#652880', bal: 0 };
  if (last.purpose === 'show') return { ...base, code: 'out', label: 'Out with ' + last.by, where: last.by + (last.party ? ' · ' + last.party : ''), color: '#C87533', bal: 0 };
  if (last.purpose === 'internal') return { ...base, code: 'use', label: 'In use · ' + last.by, where: last.by, color: '#3A568A', bal: 0 };
  if (last.purpose === 'split') return { ...base, code: 'gone', label: 'Split into items', where: '—', color: '#9A9590', bal: 0 };
  return { ...base, code: 'gone', label: 'Consumed', where: last.party || last.by, color: '#B23A2A', bal: 0 };
}

/** purposes the movement form offers for the sample's current state (artifact rule; the API checks the whole log) */
export const atEventQty = (st: SmpState) => Object.values(st.atEvents).reduce((t, x) => t + x, 0);
export function allowedPurposes(sm: Sample, st: SmpState): PurposeKey[] {
  const all: PurposeKey[] = ['dispatch', 'show', 'return', 'internal', 'consume', 'event_out', 'event_in'];
  if (!sm.tracked) {
    const atEv = atEventQty(st);
    return all.filter((p) => (p === 'return' ? st.out - atEv > 0 : p === 'event_in' ? atEv > 0 : st.bal > 0));
  }
  if (st.code === 'gone') return [];
  if (st.code === 'in') return all.filter((p) => p !== 'return' && p !== 'event_in');
  // at an event: only "Back from event" (or given to a customer there) — never a plain return
  if (st.code === 'event') return ['event_in', 'dispatch', 'consume'];
  return ['return', 'dispatch', 'consume'];
}
export function defaultPurpose(sm: Sample, st: SmpState): PurposeKey {
  const a = allowedPurposes(sm, st);
  if (st.code === 'event' && a.includes('event_in')) return 'event_in';
  if ((st.code === 'out' || st.code === 'use') && a.includes('return')) return 'return';
  return a[0] || 'dispatch';
}

/* ------------------------------ events ------------------------------ */
export type EventSummary = {
  id: string; name: string; out: number; back: number; given: number; pending: { s: Sample; qty: number; carrier: string; since: string }[];
  moves: Move[]; carriers: string[]; last: string;
};
/** per event: what was taken, what came back, what is still there (status read off the log, same as the API) */
export function eventSummaries(samples: Sample[], moves: Move[]): EventSummary[] {
  const map: Record<string, EventSummary> = {};
  const get = (id: string, name: string) => (map[id] = map[id] || { id, name: name || id, out: 0, back: 0, given: 0, pending: [], moves: [], carriers: [], last: '' });
  moves.forEach((m) => {
    if (m.purpose !== 'event_out' && m.purpose !== 'event_in') return;
    const e = get(m.event_id, m.event);
    if (m.event && (e.name === e.id || !e.name)) e.name = m.event;
    e.moves.push(m);
    if (m.purpose === 'event_out') e.out += m.qty; else e.back += m.qty;
    if (m.carrier && !e.carriers.includes(m.carrier)) e.carriers.push(m.carrier);
    if (m.date > e.last) e.last = m.date;
  });
  samples.forEach((sm) => {
    const st = smpState(sm, moves);
    Object.entries(st.atEvents).forEach(([id, q]) => {
      if (!map[id] || q <= 0) return;
      const lastOut = movesOf(moves, sm.id).filter((m) => m.purpose === 'event_out' && m.event_id === id).slice(-1)[0];
      map[id].pending.push({ s: sm, qty: q, carrier: lastOut?.carrier || '', since: lastOut?.date || '' });
    });
  });
  Object.values(map).forEach((e) => {
    e.given = Math.max(0, e.out - e.back - e.pending.reduce((t, p) => t + p.qty, 0));   // dispatched / consumed at the event
    e.moves.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    e.pending.sort((a, b) => a.s.id.localeCompare(b.s.id));
  });
  return Object.values(map).sort((a, b) => b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
}

/* ------------------------------ names / categories ------------------------------ */
export function autoName(d: { type: SmpTypeKey; design: string; colourway: string; colour: string; garment: string; size: string; metres: string | number; range: string; nContents: number }): string {
  const j = (p: any[]) => p.map((x) => s(x)).filter(Boolean).join(' · ');
  const col = d.colourway || d.colour;
  const m = n(d.metres);
  if (d.type === 'garment') return j([d.garment || 'Garment', d.design, col, d.size]);
  if (d.type === 'hanger') return j(['Hanger', d.design, col]);
  if (d.type === 'booklet') return j(['Booklet', d.range, d.nContents ? d.nContents + ' sample' + (d.nContents !== 1 ? 's' : '') : '']);
  if (d.type === 'fabric') return j(['Fabric sample', d.design, col, m ? `${+m.toFixed(2)} m` : '']);
  return j(['Swatch card', d.design, col]);
}
/** a sample's item categories, read from its designs (a booklet carries every category of its designs) */
export function catsOf(sm: Sample): string[] {
  const out: string[] = [];
  const add = (c: string) => { if (c && !out.includes(c)) out.push(c); };
  if (sm.type === 'booklet' && sm.contents.length) sm.contents.forEach((c) => add(c.category));
  else add(sm.category);
  return out;
}
export function designIds(sm: Sample): string[] {
  return sm.type === 'booklet' && sm.contents.length ? [...new Set(sm.contents.map((c) => c.md_id).filter(Boolean))] : sm.md_id ? [sm.md_id] : [];
}
export function designLabel(sm: Sample): string {
  if (sm.type === 'booklet' && sm.contents.length) return [...new Set(sm.contents.map((c) => c.design || c.md_id))].join(' + ');
  return sm.design || '—';
}
export function colourLabel(sm: Sample): string {
  return sm.colourway || sm.colour || '';
}

/** word-start search over ID, name, design, colourway, category, range */
export function matches(text: string, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9.\-]+/g, ' ');
  return words.every((w) => t.includes(' ' + w) || t.includes('-' + w));
}
export const searchText = (sm: Sample) =>
  [sm.id, sm.id.replace('-', ''), sm.name, designLabel(sm), sm.dsn_code, colourLabel(sm), sm.range, ...catsOf(sm), ...sm.contents.flatMap((c) => c.colourways)].join(' ');

/**
 * what a scan / typed code means: a Sample No. (GAR-0001 · gar0001 · " HNG-12 "), the printed sticker QR
 * ({"prpcode":..,"beamno":"GAR-0001","takano":"GAR-0001",..} — takano is used) or an older sticker
 * (PRPCODE~UID~1~0~44~GAR-0001 — the Sample No. part is used). Else null.
 */
export function parseSampleId(raw: string): string | null {
  let t = String(raw || '');
  if (t.trim().startsWith('{')) {
    try {
      const j = JSON.parse(t.trim());
      t = String(j?.takano || j?.beamno || j?.printid || '');
    } catch {
      return null;
    }
  }
  if (t.includes('~')) {
    const hit = t.split('~').map((x) => x.trim().toUpperCase()).find((x) => /^(GAR|HNG|BKL|FAB|SWC)-\d{1,8}$/.test(x));
    if (!hit) return null;
    t = hit;
  }
  t = t.toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{3})-?(\d{1,8})$/.exec(t);
  if (!m || !SMP_TYPES.some((x) => x.pfx === m[1])) return null;
  return m[1] + '-' + m[2].padStart(4, '0');
}

/* ------------------------------ dates ------------------------------ */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateFull = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]} ${MON[+m[2] - 1]} ${m[1]}` : iso || '—'; };
export const dateShort = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]} ${MON[+m[2] - 1]}` : iso || '—'; };
export const addDays = (iso: string, d: number) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
export const isoToday = () => { const d = new Date(); const p = (x: number) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const plural = (k: number, w: string) => `${k} ${w}${k !== 1 ? 's' : ''}`;
