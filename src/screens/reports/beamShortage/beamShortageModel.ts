// FILE: src/screens/reports/beamShortage/beamShortageModel.ts
// Reports → Beam Shortage — pure data rules (no React, no API).
//
// ERP Designing rules this file implements:
//   * Only COMPLETED beams count — a beam whose last taka (islasttaka = 1) is
//     entered. A row that explicitly says it is not last-taka-done is dropped.
//   * Shortage belongs to the BEAM (warped − produced). Production is per
//     design, so when one beam ran more than one design its shortage is
//     distributed over those designs in the ratio of their produced metres.
//   * Warped of a design line = produced + its share of shortage, so
//     warped − produced = shortage holds at every level (line, design, total).
//   * Shortage % = shortage ÷ warped × 100, always re-derived from the summed
//     metres (never an average of percentages).
//
// The backend may answer in any of these shapes — all are accepted:
//   A) { designs: [...], beams|details: [...] }      summary + detail lists
//   B) { designs: [{ ..., beams: [...] }] }          detail nested per design
//   C) [ ...rows ] / { data: [...] }                 flat rows, one per beam × design
// Detail rows may already carry the distributed figures (warped / produced /
// shortage) or the raw query columns (warplen / productionmtr / balmtr) — in
// the raw case the distribution is done here with the same rule.

export type BeamLine = {
  key: string;
  designKey: string;
  dsnCode: string;
  dsnName: string;
  item: string;
  type: string; // 'YD' | 'PD' | '' (only when the backend sends it)
  beamNo: string;
  machine: string;
  warpDate: string; // YYYY-MM-DD or ''
  gaitDate: string;
  doneDate: string; // last-taka / close date when sent, else ''
  status: string;
  warped: number;
  produced: number;
  shortage: number;
  /** true when this beam's shortage was split over more than one design */
  shared: boolean;
};

export type DesignRow = {
  designKey: string;
  dsnCode: string;
  dsnName: string;
  item: string;
  type: string;
  beams: number;
  warped: number;
  produced: number;
  shortage: number;
  pct: number;
  /** false when the backend sent only a summary row (no beam detail) */
  hasDetail: boolean;
};

export type Totals = { beams: number; warped: number; produced: number; shortage: number; pct: number };

export type SortKey = 'short' | 'pct' | 'code';
export type SortState = { k: SortKey; dir: 'asc' | 'desc' };

export type BeamShortageData = { lines: BeamLine[]; summaryOnly: DesignRow[] };

/* -------------------------------------------------------------------------- */
/*  small helpers                                                              */
/* -------------------------------------------------------------------------- */

export const num = (value: any) => {
  if (typeof value === 'string') value = value.replace(/,/g, '').trim();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const pctOf = (shortage: number, warped: number) => (warped > 0 ? (shortage / warped) * 100 : 0);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Accepts YYYY-MM-DD, YYYYMMDD, DD-MM-YYYY, DD/MM/YYYY; returns YYYY-MM-DD or ''. */
export const parseAnyDate = (value: any): string => {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  return '';
};

/** Indian financial year start (1 Apr) of a date. */
export const fyStartOf = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
};

export const fyEndOf = (fyStart: string) => `${Number(fyStart.slice(0, 4)) + 1}-03-31`;

export const fyLabel = (fyStart: string) => {
  const y = Number(fyStart.slice(0, 4));
  return `FY ${String(y).slice(2)}-${String(y + 1).slice(2)}`;
};

/**
 * ERP year no. of the financial year a date falls in.
 * The session carries the year no. of the logged-in year (e.g. 27 for
 * FY 2026-27); every earlier/later financial year is one less/more.
 * `sessionFyStart` is the 1-Apr date of the session's year — taken from the
 * session's year name when it can be read, else from today's date.
 */
export const yearNoFor = (iso: string, sessionYearNo: string | number, sessionFyStart: string) => {
  const base = Number(sessionYearNo);
  if (!Number.isFinite(base)) return sessionYearNo;
  const diff = Number(fyStartOf(iso).slice(0, 4)) - Number(sessionFyStart.slice(0, 4));
  return base + diff;
};

/** "2026-2027" / "2026-27" / "26-27" -> "2026-04-01"; '' when unreadable. */
export const fyStartFromYearName = (yearName: string): string => {
  const m = String(yearName || '').match(/(\d{4}|\d{2})\s*[-/–]\s*(\d{4}|\d{2})/);
  if (!m) return '';
  let y = Number(m[1]);
  if (y < 100) y += 2000;
  return y >= 2000 && y <= 2100 ? `${y}-04-01` : '';
};

/* -------------------------------------------------------------------------- */
/*  tolerant field access                                                      */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

const lower = (row: any): Row => {
  const out: Row = {};
  if (row && typeof row === 'object') {
    for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k];
  }
  return out;
};

const has = (row: Row, names: string[]) => names.some((n) => row[n] !== undefined && row[n] !== null && row[n] !== '');
const pick = (row: Row, names: string[]) => {
  for (const n of names) if (row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  return undefined;
};
const str = (row: Row, names: string[]) => String(pick(row, names) ?? '').trim();

const F = {
  dsnCode: ['dsncode', 'designcode', 'dsn_code', 'design_code'],
  dsnName: ['dsnname', 'designname', 'dsn_name', 'design_name', 'design'],
  item: ['itmname', 'itemname', 'itm_name', 'item_name', 'category', 'itmcode'],
  type: ['dsntype', 'designtype', 'dyetype', 'type'],
  beamNo: ['beamno', 'beam_no', 'mainbeam', 'beam'],
  beamId: ['beamuid', 'beam_uid', 'buid'],
  machine: ['macname', 'machinename', 'mac_name', 'machine', 'maccode'],
  warpDate: ['nwarpingdate', 'warpingdate', 'warpdate'],
  gaitDate: ['ngaittingdate', 'gaittingdate', 'gaitingdate'],
  doneDate: ['nlasttakadate', 'lasttakadate', 'nlpcsdate', 'lpcsdate', 'closedate', 'beamfalldate', 'falldate', 'completedate'],
  status: ['status'],
  yearNo: ['yearno', 'year_no'],
  lastTaka: ['islasttakadone', 'islasttaka'],
  // already-distributed figures
  warped: ['warpedmtr', 'warpedqty', 'warped_mtr', 'warped_qty', 'warped', 'warpmtr'],
  produced: ['producemtr', 'producedmtr', 'productionmtr', 'producedqty', 'productionqty', 'prodmtr', 'produced', 'production'],
  shortage: ['shortagemtr', 'shortageqty', 'shortage_mtr', 'shortage_qty', 'shortage', 'shortmtr', 'shortqty'],
  // raw query columns (beam level)
  warpLen: ['warplen', 'warp_len'],
  balMtr: ['balmtr', 'bal_mtr'],
  beams: ['beams', 'beamcount', 'nobeams', 'noofbeams', 'totalbeams'],
};

const isArr = Array.isArray;

/* -------------------------------------------------------------------------- */
/*  response -> lines                                                          */
/* -------------------------------------------------------------------------- */

const designKeyOf = (r: Row) => str(r, F.dsnCode) || str(r, F.dsnName) || '—';

const typeOf = (r: Row) => {
  const t = str(r, F.type).toUpperCase();
  if (!t) return '';
  if (t === 'YD' || t.startsWith('YARN')) return 'YD';
  if (t === 'PD' || t.startsWith('PIECE')) return 'PD';
  return '';
};

/** One raw detail row (beam × design), numbers not yet reconciled. */
type Draft = {
  r: Row;
  beamKey: string;
  produced: number;
  explicitShort: number | null;
  explicitWarped: number | null;
  warpLen: number | null;
  balMtr: number | null;
};

const toDraft = (raw: any, parent?: Row): Draft | null => {
  const own = lower(raw);
  if (!Object.keys(own).length) return null;
  // nested detail rows inherit the design identity of their parent
  const r: Row = parent ? { ...parent, ...own } : own;
  if (has(own, F.lastTaka) && num(pick(own, F.lastTaka)) <= 0) return null; // not a completed beam
  const beamNo = str(r, F.beamNo);
  if (!beamNo && !has(r, F.beamId)) return null;
  return {
    r,
    beamKey: `${str(r, F.yearNo)}|${str(r, F.beamId) || beamNo}`,
    produced: num(pick(own, F.produced)),
    explicitShort: has(own, F.shortage) ? num(pick(own, F.shortage)) : null,
    explicitWarped: has(own, F.warped) ? num(pick(own, F.warped)) : null,
    warpLen: has(own, F.warpLen) ? num(pick(own, F.warpLen)) : null,
    balMtr: has(own, F.balMtr) ? num(pick(own, F.balMtr)) : null,
  };
};

const finishLine = (d: Draft, warped: number, shortage: number, shared: boolean, i: number): BeamLine => {
  const r = d.r;
  const designKey = designKeyOf(r);
  return {
    key: `${d.beamKey}|${designKey}|${i}`,
    designKey,
    dsnCode: str(r, F.dsnCode),
    dsnName: str(r, F.dsnName) || str(r, F.dsnCode) || '—',
    item: str(r, F.item),
    type: typeOf(r),
    beamNo: str(r, F.beamNo) || str(r, F.beamId),
    machine: str(r, F.machine),
    warpDate: parseAnyDate(pick(r, F.warpDate)),
    gaitDate: parseAnyDate(pick(r, F.gaitDate)),
    doneDate: parseAnyDate(pick(r, F.doneDate)),
    status: str(r, F.status),
    warped: round2(warped),
    produced: round2(d.produced),
    shortage: round2(shortage),
    shared,
  };
};

/**
 * Reconcile the detail rows of ONE beam.
 *  - rows that already carry a distributed shortage are trusted as sent
 *    (warped = sent warped, else produced + shortage);
 *  - raw rows share the beam's shortage (balmtr, else warplen − Σ produced)
 *    in the ratio of produced metres; the last row takes the rounding remainder
 *    so the parts always add up to the beam's shortage exactly.
 */
const reconcileBeam = (rows: Draft[], out: BeamLine[]) => {
  const explicit = rows.filter((d) => d.explicitShort !== null);
  const raw = rows.filter((d) => d.explicitShort === null);
  const designs = new Set(rows.map((d) => designKeyOf(d.r)));
  const shared = designs.size > 1;

  explicit.forEach((d) => {
    const sh = d.explicitShort as number;
    const warped = d.explicitWarped !== null ? d.explicitWarped : d.produced + sh;
    out.push(finishLine(d, warped, sh, shared, out.length));
  });

  if (!raw.length) return;
  const totalProd = raw.reduce((a, d) => a + d.produced, 0);
  const warpLen = raw.find((d) => d.warpLen !== null)?.warpLen ?? null;
  const balMtr = raw.find((d) => d.balMtr !== null)?.balMtr ?? null;
  const beamShort = balMtr !== null ? balMtr : warpLen !== null ? warpLen - totalProd : 0;

  let given = 0;
  raw.forEach((d, i) => {
    const last = i === raw.length - 1;
    const share = last
      ? beamShort - given
      : totalProd > 0
        ? round2((beamShort * d.produced) / totalProd)
        : round2(beamShort / raw.length);
    given += share;
    out.push(finishLine(d, d.produced + share, share, shared, out.length));
  });
};

const toSummaryRow = (raw: any): DesignRow | null => {
  const r = lower(raw);
  if (!Object.keys(r).length) return null;
  if (!has(r, F.dsnCode) && !has(r, F.dsnName)) return null;
  const produced = num(pick(r, F.produced));
  const shortage = num(pick(r, F.shortage));
  const warped = has(r, F.warped) ? num(pick(r, F.warped)) : produced + shortage;
  return {
    designKey: designKeyOf(r),
    dsnCode: str(r, F.dsnCode),
    dsnName: str(r, F.dsnName) || str(r, F.dsnCode) || '—',
    item: str(r, F.item),
    type: typeOf(r),
    beams: num(pick(r, F.beams)),
    warped: round2(warped),
    produced: round2(produced),
    shortage: round2(shortage),
    pct: pctOf(shortage, warped),
    hasDetail: false,
  };
};

const firstArray = (obj: any, names: string[]): any[] | null => {
  if (!obj || typeof obj !== 'object') return null;
  const map = lower(obj);
  for (const n of names) if (isArr(map[n])) return map[n];
  return null;
};

const DETAIL_KEYS = ['beams', 'details', 'detail', 'beamdetails', 'beam_details', 'rows', 'lines', 'records'];
const SUMMARY_KEYS = ['designs', 'summary', 'designsummary', 'design_summary', 'designwise'];

/** Strip the usual wrappers ({data}, {response}, {success,data}) down to the payload. */
export const unwrapPayload = (response: any): any => {
  let body: any = response?.data ?? response;
  for (let i = 0; i < 4; i += 1) {
    if (isArr(body) || !body || typeof body !== 'object') break;
    if (firstArray(body, SUMMARY_KEYS) || firstArray(body, DETAIL_KEYS)) break;
    const next = body.response ?? body.data ?? body.result;
    if (next === undefined || next === null || typeof next !== 'object') break;
    body = next;
  }
  return body;
};

export const normalizeBeamShortage = (response: any): BeamShortageData => {
  const body = unwrapPayload(response);
  const drafts: Draft[] = [];
  const summaryRows: DesignRow[] = [];

  const takeDetail = (list: any[], parent?: Row) => {
    list.forEach((raw) => {
      const d = toDraft(raw, parent);
      if (d) drafts.push(d);
    });
  };

  if (isArr(body)) {
    // flat rows — each either a detail row, or a design with nested detail
    body.forEach((raw: any) => {
      const nested = firstArray(raw, DETAIL_KEYS);
      if (nested) {
        const parent = lower(raw);
        DETAIL_KEYS.forEach((k) => delete parent[k]);
        const before = drafts.length;
        takeDetail(nested, parent);
        if (drafts.length === before) { const s = toSummaryRow(raw); if (s) summaryRows.push(s); }
        return;
      }
      const d = toDraft(raw);
      if (d) drafts.push(d);
      else { const s = toSummaryRow(raw); if (s) summaryRows.push(s); }
    });
  } else if (body && typeof body === 'object') {
    const summary = firstArray(body, SUMMARY_KEYS) || [];
    const detail = firstArray(body, DETAIL_KEYS) || [];
    takeDetail(detail);
    summary.forEach((raw: any) => {
      const nested = firstArray(raw, DETAIL_KEYS);
      if (nested) {
        const parent = lower(raw);
        DETAIL_KEYS.forEach((k) => delete parent[k]);
        takeDetail(nested, parent);
      }
      const s = toSummaryRow(raw);
      if (s) summaryRows.push(s);
    });
  }

  // reconcile beam by beam (keeps the first-seen order)
  const byBeam = new Map<string, Draft[]>();
  drafts.forEach((d) => {
    const list = byBeam.get(d.beamKey);
    if (list) list.push(d); else byBeam.set(d.beamKey, [d]);
  });
  const lines: BeamLine[] = [];
  byBeam.forEach((rows) => reconcileBeam(rows, lines));

  // a design the backend summarised but sent no beam rows for is still shown
  const detailed = new Set(lines.map((l) => l.designKey));
  const summaryOnly = summaryRows.filter((s) => !detailed.has(s.designKey));

  // detail rows often omit item / type — borrow them from the summary row
  if (summaryRows.length) {
    const meta = new Map(summaryRows.map((s) => [s.designKey, s]));
    lines.forEach((l) => {
      const m = meta.get(l.designKey);
      if (!m) return;
      if (!l.item) l.item = m.item;
      if (!l.type) l.type = m.type;
      if ((l.dsnName === '—' || l.dsnName === l.dsnCode) && m.dsnName) l.dsnName = m.dsnName;
    });
  }

  return { lines, summaryOnly };
};

/* -------------------------------------------------------------------------- */
/*  filters, aggregation, sort                                                 */
/* -------------------------------------------------------------------------- */

export type Filters = { item: string; type: string; machine: string; q: string };
export const NO_FILTERS: Filters = { item: 'ALL', type: 'ALL', machine: 'ALL', q: '' };

const matchQ = (q: string, ...values: string[]) => {
  const needle = q.trim().toLowerCase();
  return !needle || values.some((v) => String(v || '').toLowerCase().includes(needle));
};

export const filterLines = (lines: BeamLine[], f: Filters) =>
  lines.filter((l) =>
    (f.item === 'ALL' || l.item === f.item) &&
    (f.type === 'ALL' || l.type === f.type) &&
    (f.machine === 'ALL' || l.machine === f.machine) &&
    matchQ(f.q, l.dsnName, l.dsnCode, l.beamNo));

export const filterSummaryOnly = (rows: DesignRow[], f: Filters) =>
  // summary-only rows have no beam / machine, so a machine filter excludes them
  rows.filter((r) =>
    f.machine === 'ALL' &&
    (f.item === 'ALL' || r.item === f.item) &&
    (f.type === 'ALL' || r.type === f.type) &&
    matchQ(f.q, r.dsnName, r.dsnCode));

export const totalsOf = (rows: { warped: number; produced: number; shortage: number }[], beams: number): Totals => {
  const warped = round2(rows.reduce((a, r) => a + r.warped, 0));
  const produced = round2(rows.reduce((a, r) => a + r.produced, 0));
  const shortage = round2(rows.reduce((a, r) => a + r.shortage, 0));
  return { beams, warped, produced, shortage, pct: pctOf(shortage, warped) };
};

const beamCount = (lines: BeamLine[]) => new Set(lines.map((l) => l.key.split('|').slice(0, 2).join('|'))).size;

export const buildDesignRows = (lines: BeamLine[], summaryOnly: DesignRow[], sort: SortState): DesignRow[] => {
  const by = new Map<string, BeamLine[]>();
  lines.forEach((l) => {
    const list = by.get(l.designKey);
    if (list) list.push(l); else by.set(l.designKey, [l]);
  });
  const rows: DesignRow[] = [];
  by.forEach((list, designKey) => {
    const t = totalsOf(list, beamCount(list));
    const head = list[0];
    rows.push({
      designKey,
      dsnCode: head.dsnCode,
      dsnName: head.dsnName,
      item: list.find((l) => l.item)?.item || '',
      type: list.find((l) => l.type)?.type || '',
      beams: t.beams,
      warped: t.warped,
      produced: t.produced,
      shortage: t.shortage,
      pct: t.pct,
      hasDetail: true,
    });
  });
  rows.push(...summaryOnly);

  const dir = sort.dir === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    if (sort.k === 'code') return dir * a.dsnName.localeCompare(b.dsnName, undefined, { numeric: true });
    const d = sort.k === 'pct' ? a.pct - b.pct : a.shortage - b.shortage;
    return d !== 0 ? dir * d : a.dsnName.localeCompare(b.dsnName, undefined, { numeric: true });
  });
};

export const grandTotal = (rows: DesignRow[], lines: BeamLine[]): Totals =>
  // beams are counted once even when a beam ran two designs
  totalsOf(rows, beamCount(lines) + rows.filter((r) => !r.hasDetail).reduce((a, r) => a + r.beams, 0));

export const linesOfDesign = (lines: BeamLine[], designKey: string) =>
  lines
    .filter((l) => l.designKey === designKey)
    .sort((a, b) => (b.doneDate || b.warpDate).localeCompare(a.doneDate || a.warpDate) || a.beamNo.localeCompare(b.beamNo, undefined, { numeric: true }));

export const optionsOf = (lines: BeamLine[], summaryOnly: DesignRow[], field: 'item' | 'machine') => {
  const set = new Set<string>();
  lines.forEach((l) => { if (l[field]) set.add(l[field]); });
  if (field === 'item') summaryOnly.forEach((r) => { if (r.item) set.add(r.item); });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

export const hasTypes = (lines: BeamLine[], summaryOnly: DesignRow[]) =>
  lines.some((l) => l.type) || summaryOnly.some((r) => r.type);

/* -------------------------------------------------------------------------- */
/*  beam-first view (flip of the design list): beam -> its designs             */
/* -------------------------------------------------------------------------- */

export type BeamRow = {
  beamKey: string;
  beamNo: string;
  /** distinct machines the beam ran on, in first-seen order */
  machine: string;
  warpDate: string;
  doneDate: string;
  status: string;
  /** design lines of this beam (after the filters) */
  designs: number;
  /** design name when the beam ran one design, else '' */
  dsnName: string;
  item: string;
  type: string;
  warped: number;
  produced: number;
  shortage: number;
  pct: number;
};

/** Year no. + beam id — the same identity the beam count uses. */
export const beamKeyOf = (l: BeamLine) => l.key.split('|').slice(0, 2).join('|');

const joinDistinct = (values: string[]) => Array.from(new Set(values.filter(Boolean))).join(', ');

/**
 * Lines the beam-first list is built from. Item / type / machine filters work
 * line by line (exactly as in the design list, so both views total the same);
 * the text search picks whole BEAMS — a beam is kept with all its designs when
 * its beam no. or any of its designs matches, so the row always equals its
 * detail page.
 */
export const filterLinesForBeams = (lines: BeamLine[], f: Filters) => {
  const base = filterLines(lines, { ...f, q: '' });
  if (!f.q.trim()) return base;
  const hit = new Set<string>();
  base.forEach((l) => { if (matchQ(f.q, l.dsnName, l.dsnCode, l.beamNo)) hit.add(beamKeyOf(l)); });
  return base.filter((l) => hit.has(beamKeyOf(l)));
};

export const buildBeamRows = (lines: BeamLine[], sort: SortState): BeamRow[] => {
  const by = new Map<string, BeamLine[]>();
  lines.forEach((l) => {
    const k = beamKeyOf(l);
    const list = by.get(k);
    if (list) list.push(l); else by.set(k, [l]);
  });
  const rows: BeamRow[] = [];
  by.forEach((list, beamKey) => {
    const t = totalsOf(list, 1);
    const head = list[0];
    const designs = new Set(list.map((l) => l.designKey)).size;
    rows.push({
      beamKey,
      beamNo: head.beamNo,
      machine: joinDistinct(list.map((l) => l.machine)),
      warpDate: list.find((l) => l.warpDate)?.warpDate || '',
      doneDate: list.reduce((a, l) => (l.doneDate > a ? l.doneDate : a), ''),
      status: list.some((l) => /running/i.test(l.status)) ? 'Running' : head.status,
      designs,
      dsnName: designs === 1 ? head.dsnName : '',
      item: joinDistinct(list.map((l) => l.item)),
      type: designs === 1 ? head.type : '',
      warped: t.warped,
      produced: t.produced,
      shortage: t.shortage,
      pct: t.pct,
    });
  });

  const dir = sort.dir === 'asc' ? 1 : -1;
  const byNo = (a: BeamRow, b: BeamRow) => a.beamNo.localeCompare(b.beamNo, undefined, { numeric: true }) || a.beamKey.localeCompare(b.beamKey);
  return rows.sort((a, b) => {
    if (sort.k === 'code') return dir * byNo(a, b);
    const d = sort.k === 'pct' ? a.pct - b.pct : a.shortage - b.shortage;
    return d !== 0 ? dir * d : byNo(a, b);
  });
};

/** Design lines of one beam, biggest production first. */
export const linesOfBeam = (lines: BeamLine[], beamKey: string) =>
  lines
    .filter((l) => beamKeyOf(l) === beamKey)
    .sort((a, b) => b.produced - a.produced || a.dsnName.localeCompare(b.dsnName, undefined, { numeric: true }));
