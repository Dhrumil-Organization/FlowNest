// FILE: src/screens/outwardScanSticker/model.ts
// Outward Scan Sticker — types, the per-taka quantity rules and the save payload.
// The rules are the SAME as GreyScanInwardController (backend) so what the screen shows is what gets saved:
//   entered = Σ lines (main line + "add to taka" lines, each with its own shade)
//   shortage ticked  OR  entered ≥ balance  ->  shortage = balance − entered (negative = excess), taka closes
//   entered < balance, not ticked            ->  balance − entered stays pending on the job outward

export const MAX_EXCESS_FACTOR_DEFAULT = 2;

export type Opt = { value: string; label: string; searchText?: string };

export type Party = { code: string; name: string; pieces: number; bal: number; last_out: string; in_master?: boolean };
export type Grn = {
  key: string; uid: string; srno: number; grno: string; grdate: string; parcode: string; acccode: string; accname: string;
  docno: string; docdate: string; dptcode: string; trpcode: string; vehno: string; qty: number; pcs: number; itmname: string; status: string;
};
export type Meta = {
  prpcode: string; yearno: string; grey_store: string; grey_store_name: string; fy_from: string; fy_to: string; today: string;
  require_grn: boolean; max_excess_factor: number;
  /** Entry Type is fixed on the server (GST) — not chosen on the screen */
  ent_type?: { code: string; name: string } | null; ent_type_error?: string;
  ent_types: { code: string; name: string }[]; departments?: { code: string; name: string }[]; job_accounts: { code: string; name: string }[]; parties: Party[];
};

/** an outward piece (GRYOutD2) as the server sends it */
export type Piece = {
  key: string; outuid: string; outsrno: number; outsubsr: number; takano: string; bal: number; outqty?: number;
  outno: string; outdate: string; parcode?: string; parname?: string; jobtype?: string; dptcode?: string; dptname?: string;
  stktype?: string; itmcode: string; itmname: string; dsncode: string; dsnname: string; lotno: string; shdcode?: string; shdname?: string;
};

export type Line = { id: string; shdcode: string; shdname: string; qty: string; remark: string };
/** stale: set when the server says the taka was received elsewhere after it was scanned here */
export type Entry = Piece & { lines: Line[]; shortage: boolean; addedAt: number; stale?: 'used' | 'changed'; note?: string };
export type StaleRow = { key: string; status?: 'ok' | 'changed' | 'used' | 'missing' | 'party'; bal: number; seen: number | null; inwno?: string; inwdate?: string; user?: string; takano?: string };

export type Header = {
  inwdate: string; billno: string; billdate: string; strsr: string; remark: string;
  acccode: string; enttype: string; dptcode: string; gruid: string; grsrno: string;
};

export type BrowseRow = {
  uid: string; inwno: string; inwdate: string; parcode: string; parname: string; billno: string;
  takas: number; qty: number; sht: number; remark: string; shade: string; shades: number; lock: string;
  source?: string; modified?: boolean;
};

export type ShowData = {
  uid: string; lock: string; source?: string; updated?: string;
  header: {
    inwno: string; inwdate: string; parcode: string; parname: string; acccode: string; accname: string; enttype: string; entname: string;
    strsr: string; billno: string; billdate: string; remark: string; jobtype: string; dptcode: string; dptname: string; stktype: string;
    nettaka: number; netqty: number; gruid: string; grsrno: string; grn: { uid: string; srno: number; grno: string; grdate: string } | null;
  };
  pieces: (Piece & { entered: number; sht: number; kwt: number; outbal_now: number; shortage: boolean; lines: { shdcode: string; shdname: string; qty: number; remark: string }[] })[];
};

/* ------------------------------ numbers ------------------------------ */

export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;
export const num = (s: string | number | null | undefined): number => {
  const v = typeof s === 'number' ? s : parseFloat(String(s ?? '').replace(/,/g, '').trim());
  return Number.isFinite(v) ? v : 0;
};
/** 3 decimals with Indian grouping */
export const q3 = (n: number) => {
  const v = r3(n);
  const neg = v < 0;
  const [w, f] = Math.abs(v).toFixed(3).split('.');
  let head = w.length > 3 ? w.slice(0, -3) : '';
  const tail = w.length > 3 ? w.slice(-3) : w;
  const parts: string[] = [];
  while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
  if (head) parts.unshift(head);
  return (neg ? '-' : '') + [...parts, tail].join(',') + '.' + f;
};
/** a qty the user typed: digits with at most 3 decimals */
export const qtyOk = (s: string) => /^\d{0,7}(\.\d{0,3})?$/.test(String(s).trim()) && num(s) > 0;
export const cleanQty = (s: string) => {
  let t = s.replace(/[^0-9.]/g, '');
  const i = t.indexOf('.');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '').slice(0, 3);
  return t.slice(0, 11);
};

/* ------------------------------ dates ------------------------------ */

export const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isoToDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
};
export const dateToIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dmy = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s || '—';
};
export const addDays = (iso: string, days: number) => {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + days);
  return dateToIso(d);
};

/* ------------------------------ per taka ------------------------------ */

export type Calc = {
  entered: number; bal: number; sht: number; remain: number; closes: boolean;
  status: 'empty' | 'full' | 'shortage' | 'excess' | 'partial'; over: boolean;
};

export function calcEntry(e: Pick<Entry, 'bal' | 'lines' | 'shortage'>, maxFactor = MAX_EXCESS_FACTOR_DEFAULT): Calc {
  const entered = r3(e.lines.reduce((s, l) => s + num(l.qty), 0));
  const bal = r3(e.bal);
  if (entered <= 0) return { entered: 0, bal, sht: 0, remain: bal, closes: false, status: 'empty', over: false };
  const closes = e.shortage || entered >= bal - 0.0005;
  const sht = closes ? r3(bal - entered) : 0;
  const remain = closes ? 0 : r3(bal - entered);
  const status: Calc['status'] = !closes ? 'partial' : sht > 0.0005 ? 'shortage' : sht < -0.0005 ? 'excess' : 'full';
  return { entered, bal, sht, remain, closes, status, over: entered > bal * maxFactor + 0.0005 };
}

export type Totals = { takas: number; lines: number; entered: number; shortage: number; excess: number; remain: number; bal: number };
export function totals(entries: Entry[], maxFactor?: number): Totals {
  const t: Totals = { takas: entries.length, lines: 0, entered: 0, shortage: 0, excess: 0, remain: 0, bal: 0 };
  entries.forEach((e) => {
    const c = calcEntry(e, maxFactor);
    t.lines += e.lines.length;
    t.entered += c.entered;
    t.bal += c.bal;
    if (c.sht > 0) t.shortage += c.sht;
    if (c.sht < 0) t.excess += -c.sht;
    t.remain += c.remain;
  });
  (['entered', 'shortage', 'excess', 'remain', 'bal'] as const).forEach((k) => { t[k] = r3(t[k]); });
  return t;
}

let seq = 0;
export const lineId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newEntry(p: Piece): Entry {
  return {
    ...p,
    shortage: false,
    addedAt: Date.now(),
    lines: [{ id: lineId(), shdcode: p.shdcode && p.shdcode !== '0' ? String(p.shdcode) : '', shdname: p.shdname || '', qty: '', remark: '' }],
  };
}

/* ------------------------------ validation ------------------------------ */

export type Problem = { key?: string; text: string };

export function validate(meta: Meta | null, party: string, h: Header, entries: Entry[]): Problem[] {
  const out: Problem[] = [];
  const maxF = meta?.max_excess_factor || MAX_EXCESS_FACTOR_DEFAULT;
  if (!party) out.push({ text: 'Select the party.' });
  if (meta?.require_grn && !h.gruid) out.push({ text: 'Select the G.R.N.' });
  if (!h.acccode) out.push({ text: 'Select the Job A/c.' });
  if (meta?.ent_type_error) out.push({ text: meta.ent_type_error });
  if (meta && meta.departments === undefined) out.push({ text: 'Department list not available — the server is running the old Outward Scan Sticker backend. Deploy GreyScanInwardController.php.' });
  else if (!h.dptcode || h.dptcode === '0') out.push({ text: 'Select the Department.' });
  if (!h.strsr.trim()) out.push({ text: 'Enter the Store No.' });
  if (!h.billno.trim()) out.push({ text: 'Enter the bill / challan no.' });
  if (!h.inwdate) out.push({ text: 'Inward date is required.' });
  if (h.inwdate && h.inwdate > isoToday()) out.push({ text: 'Inward date cannot be in the future.' });
  if (meta && h.inwdate && (h.inwdate < meta.fy_from || h.inwdate > meta.fy_to)) out.push({ text: `Inward date must be inside the year (${dmy(meta.fy_from)} – ${dmy(meta.fy_to)}).` });
  if (h.billdate && h.inwdate && h.billdate > h.inwdate) out.push({ text: 'Bill date cannot be after the inward date.' });
  if (!entries.length) out.push({ text: 'Scan at least one taka.' });
  entries.forEach((e) => {
    const tk = `Taka ${e.takano}`;
    if (e.stale === 'used') out.push({ key: e.key, text: `${tk}: already received in another inward — remove it.` });
    if (e.stale === 'changed') out.push({ key: e.key, text: `${tk}: balance changed to ${q3(e.bal)} — check the kg (edit it or tick Shortage).` });
    e.lines.forEach((l, i) => {
      const where = i ? `${tk} · add line ${i}` : tk;
      if (!qtyOk(l.qty)) out.push({ key: e.key, text: `${where}: enter the qty.` });
      if (!l.shdcode) out.push({ key: e.key, text: `${where}: select the shade.` });
    });
    const c = calcEntry(e, maxF);
    if (c.over) out.push({ key: e.key, text: `${tk}: ${q3(c.entered)} is more than ${maxF}× the balance ${q3(c.bal)}.` });
    if (e.outdate && h.inwdate && e.outdate > h.inwdate) out.push({ key: e.key, text: `${tk}: went out on ${dmy(e.outdate)}, after the inward date.` });
  });
  return out;
}

export function payload(uid: string, party: string, h: Header, entries: Entry[]) {
  return {
    uid: uid || '0',
    header: { ...h, parcode: party, strsr: h.strsr.trim(), billno: h.billno.trim(), remark: h.remark.trim() },
    pieces: entries.map((e) => ({
      outuid: e.outuid, outsrno: e.outsrno, outsubsr: e.outsubsr, shortage: e.shortage,
      bal: r3(e.bal), // the balance shown on this phone — the server refuses the save if it changed meanwhile
      lines: e.lines.map((l) => ({ shdcode: l.shdcode, qty: r3(num(l.qty)), remark: l.remark.trim() })),
    })),
  };
}

/** entries back from /show (modify) */
export function entriesFromShow(d: ShowData): Entry[] {
  return d.pieces.map((p, i) => ({
    ...p,
    addedAt: i,
    shortage: !!p.shortage,
    lines: p.lines.map((l) => ({ id: lineId(), shdcode: l.shdcode, shdname: l.shdname, qty: String(r3(l.qty)), remark: l.remark || '' })),
  }));
}

export function unwrap(response: any): any {
  const body = response && typeof response === 'object' && 'data' in response && 'status' in response && 'headers' in response ? response.data : response;
  if (body && typeof body === 'object' && body.success === false) throw new Error(body.message || 'Request failed.');
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export const errText = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
