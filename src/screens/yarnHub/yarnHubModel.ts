// FILE: src/screens/yarnHub/yarnHubModel.ts
// Yarn Hub — data model + the ERP Designing artifact's constants and rules (YmsHub / ymsStats), unchanged:
//   categories  Linen / Cotton / Polyester (single fibre) · Blends (2+ fibres) · Other fibres
//   order       score = used kg × 10 + designs, then stock kg, then name
//   designs     a design counts once per yarn even when it uses it in warp AND weft
//   sub items   only blended yarns have them (their blend ratios)
// Source: POST /api/yarn_hub/summary and /api/yarn_hub/item (YarnHubController).

/* ------------------------------ artifact palette ------------------------------ */
export const C = {
  mut: '#7C746C',
  faint: '#9A9590',
  hair: '#EFEAE4',
  prod: '#652880',
  bill: '#3A568A',
  owner: '#0D1B2A',
  bd: '#E5E0DA',
  ink: '#1A1514',
  card: '#FFFFFF',
} as const;

export type CatKey = 'Linen' | 'Cotton' | 'Polyester' | 'Blends' | 'Other';
export const YMS_CATS: { k: CatKey; lbl: string; icon: string; color: string }[] = [
  { k: 'Linen', lbl: 'Linen', icon: '🌾', color: '#2A6044' },
  { k: 'Cotton', lbl: 'Cotton', icon: '☁', color: '#3A568A' },
  { k: 'Polyester', lbl: 'Polyester', icon: '◈', color: '#652880' },
  { k: 'Blends', lbl: 'Blends', icon: '⧉', color: '#C87533' },
  { k: 'Other', lbl: 'Other fibres', icon: '◌', color: '#5A5A5A' },
];

export const FIBER_CODE: Record<string, string> = {
  Cotton: 'CO', Linen: 'LI', Viscose: 'VI', Polyester: 'PO', Elastomultiester: 'EM', Nylon: 'NY', Modal: 'MO',
  Tencel: 'TN', Acrylic: 'AC', Wool: 'WL', Silk: 'SK', Bamboo: 'BM', Spandex: 'SX',
};
export const FIBER_COL: Record<string, string> = {
  Linen: '#A8895E', Cotton: '#D9CBB2', Polyester: '#5A7D8C', Viscose: '#B49AC4', Nylon: '#7C9CB0', Modal: '#CBB89C',
  Tencel: '#9FB8A6', Acrylic: '#C49A9A', Wool: '#A88E72', Silk: '#E2D2AE', Bamboo: '#A6C094', Spandex: '#9192A6',
  Elastomultiester: '#3F9C8F',
};
export const YMS_SUP_COLORS = ['#C87533', '#3A568A', '#2A6044', '#7A5AA0', '#9A6B12', '#B5587A', '#2F7F8F', '#5A5A5A'];

/** ERP fibre names come in any case ("COTTON", "Poly Ester") — map to the artifact's names where they match. */
const KNOWN = Object.keys(FIBER_CODE);
export const fibreName = (raw: string): string => {
  const n = String(raw || '').trim();
  const l = n.toLowerCase().replace(/[^a-z]/g, '');
  const hit = KNOWN.find((k) => k.toLowerCase() === l);
  if (hit) return hit;
  if (l.startsWith('poly')) return 'Polyester';
  if (l.includes('elastomulti')) return 'Elastomultiester';
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : n;
};
export const ymsFibreShort = (f: string) => (f === 'Polyester' ? 'Poly' : f === 'Elastomultiester' ? 'EME' : f);
export const fibreCol = (f: string) => FIBER_COL[f] || '#B5B0AA';

/* ------------------------------------ types ------------------------------------ */
export type YarnSub = { id: string; label: string; ratio: (number | null)[]; ratioKey: string; stockKg: number };
export type YarnDesign = { id: string; code: string; category: string; side: 'warp' | 'weft'; val: number | null; br: string };
export type YarnLatest = { rate: number; party: string; date: string } | null;
export type YarnItem = {
  id: string;
  mainItem: string;
  count: number;
  countType: string;
  ply: number;
  den: number;
  kind: 'spun' | 'filament';
  filType: string;
  lustre: string;
  other: string;
  blend: string[];
  cat: { k: CatKey; sub: string };
  subs: YarnSub[];
  stockKg: number;
  usedKg: number;
  usedMonthKg: number;
  creelKg: number;
  weftKg: number;
  lastUsed: string;
  nDesigns: number;
  designs: YarnDesign[];
  latest: YarnLatest;
  score: number;
};
export type YarnHubDiag = { rows?: Record<string, number>; errors?: Record<string, string>; prpcodes?: string[]; databases?: string[]; last_issue_date?: string; issue_stores?: string[]; generated_at?: string };
export type YarnHubData = { items: YarnItem[]; month: string; diag: YarnHubDiag | null };

/** what each server source returned — shown only when the hub is empty or a source failed */
export const diagLines = (d: YarnHubDiag | null): string[] => {
  if (!d) return [];
  const out: string[] = [];
  if (d.generated_at) out.push('Built ' + d.generated_at + ' (server keeps it 10 min — tap ↻ Refresh for live data)');
  if (d.databases?.length) out.push('DB: ' + d.databases.join(' · '));
  if (d.rows && Object.keys(d.rows).length) out.push('Rows: ' + Object.entries(d.rows).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (d.issue_stores?.length || d.last_issue_date) out.push('Issues: store ' + (d.issue_stores || []).join(',') + ' · last issue ' + (d.last_issue_date || '—'));
  Object.entries(d.errors || {}).forEach(([k, v]) => out.push(`${k}: ${v}`));
  return out;
};

export type CartonRow = { cartno: string; itmcode: string; itmname: string; mername: string; grdname: string; shdname: string; chees: number; wt: number };
export type IssueRow = {
  kind: 'issue' | 'return'; uid: string; no: string; date: string; issno?: string; creelid: string; machine: string;
  design: string; beamno: string; itmcode: string; kg: number;
};
export type PricePoint = { date: string; inwno: string; party: string; parcode: string; itmcode: string; qty: number; rate: number };
export type YarnDetail = { cartons: CartonRow[]; creel: IssueRow[]; weft: IssueRow[]; prices: PricePoint[] };

/* ---------------------------------- normalize ---------------------------------- */
const num = (v: any) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};
const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
const CAT_KEYS: CatKey[] = ['Linen', 'Cotton', 'Polyester', 'Blends', 'Other'];

/** Laravel { success, data } inside axios' response — returns `data` or throws the server message. */
export function unwrap(response: any): any {
  const body = response && typeof response === 'object' && 'data' in response && !('items' in response) ? response.data : response;
  if (body && typeof body === 'object' && (body.success === false || body.status === false)) {
    throw new Error(body.message || 'Request failed.');
  }
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

/** Same rule as ymsCatOf — used only when the server did not send a category. */
export const ymsCatOf = (blend: string[]): { k: CatKey; sub: string } => {
  if (blend.length >= 2) return { k: 'Blends', sub: blend.map(ymsFibreShort).join(' ') };
  const f = blend[0];
  if (f === 'Linen' || f === 'Cotton' || f === 'Polyester') return { k: f, sub: f };
  return { k: 'Other', sub: f || '—' };
};

export function normalizeSummary(raw: any): YarnHubData {
  const d = raw || {};
  const items: YarnItem[] = (Array.isArray(d.items) ? d.items : []).map((r: any) => {
    const blend: string[] = (Array.isArray(r.fibres) ? r.fibres : []).map((f: any) => fibreName(f?.name)).filter(Boolean);
    const fallback = ymsCatOf(blend);
    const k: CatKey = CAT_KEYS.includes(r.category) ? r.category : fallback.k;
    const sub = k === 'Blends' ? blend.map(ymsFibreShort).join(' ') : k === 'Other' ? str(r.catsub) || fallback.sub : k;
    const designs: YarnDesign[] = (Array.isArray(r.designs) ? r.designs : []).map((x: any) => ({
      id: str(x.id),
      code: str(x.code),
      category: str(x.category),
      side: x.side === 'weft' ? 'weft' : 'warp',
      val: x.val === null || x.val === undefined || x.val === '' ? null : num(x.val),
      br: str(x.br),
    }));
    const usedKg = num(r.usedkg);
    const nDesigns = r.ndesigns !== undefined ? num(r.ndesigns) : new Set(designs.map((z) => z.id)).size;
    const latest = r.latest && num(r.latest.rate) > 0 ? { rate: num(r.latest.rate), party: str(r.latest.party) || '—', date: str(r.latest.date) } : null;
    return {
      id: str(r.itmcode),
      mainItem: str(r.name),
      count: num(r.count),
      countType: str(r.counttype),
      ply: num(r.ply) || 1,
      den: num(r.denier),
      kind: r.yarntype === 'filament' ? 'filament' : 'spun',
      filType: str(r.type),
      lustre: str(r.lustre),
      other: str(r.other),
      blend,
      cat: { k, sub },
      subs: (Array.isArray(r.subs) ? r.subs : []).map((s: any) => ({
        id: str(s.itmcode),
        label: str(s.name),
        ratio: (Array.isArray(s.ratio) ? s.ratio : []).map((x: any) => (x === null || x === undefined || x === '' ? null : num(x))),
        ratioKey: str(s.ratiokey),
        stockKg: num(s.stockkg),
      })),
      stockKg: num(r.stockkg),
      usedKg,
      usedMonthKg: num(r.usedmonthkg),
      creelKg: num(r.creelkg),
      weftKg: num(r.weftkg),
      lastUsed: str(r.lastused),
      nDesigns,
      designs,
      latest,
      score: usedKg * 10 + nDesigns,
    };
  });
  return { items, month: str(d.month) || new Date().toISOString().slice(0, 7), diag: d.diag && typeof d.diag === 'object' ? d.diag : null };
}

export function normalizeDetail(raw: any): YarnDetail {
  const d = raw || {};
  const issue = (x: any): IssueRow => ({
    kind: x.kind === 'return' ? 'return' : 'issue',
    uid: str(x.uid),
    no: str(x.no),
    date: str(x.date),
    issno: str(x.issno),
    creelid: str(x.creelid),
    machine: str(x.machine),
    design: str(x.design),
    beamno: str(x.beamno),
    itmcode: str(x.itmcode),
    kg: num(x.kg),
  });
  return {
    cartons: (Array.isArray(d.cartons) ? d.cartons : []).map((x: any) => ({
      cartno: str(x.cartno), itmcode: str(x.itmcode), itmname: str(x.itmname), mername: str(x.mername),
      grdname: str(x.grdname), shdname: str(x.shdname), chees: num(x.chees), wt: num(x.wt),
    })),
    creel: (Array.isArray(d.creel) ? d.creel : []).map(issue),
    weft: (Array.isArray(d.weft) ? d.weft : []).map(issue),
    prices: (Array.isArray(d.prices) ? d.prices : [])
      .map((x: any) => ({ date: str(x.date), inwno: str(x.inwno), party: str(x.party) || '—', parcode: str(x.parcode), itmcode: str(x.itmcode), qty: num(x.qty), rate: num(x.rate) }))
      .filter((p: PricePoint) => p.rate > 0 && p.date),
  };
}

/* ------------------------------- artifact helpers ------------------------------- */
export const isBlend = (it: YarnItem) => it.blend.length >= 2;
export const blendSubs = (it: YarnItem) => (isBlend(it) ? it.subs : []);

export const byScore = (a: YarnItem, b: YarnItem) =>
  b.score - a.score || b.stockKg - a.stockKg || a.mainItem.localeCompare(b.mainItem);

export const fmtKg = (n: number) =>
  Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + ' t' : (Math.round((+n || 0) * 10) / 10).toLocaleString('en-IN') + ' kg';
export const ymsKg = (n: number) => (Math.round((+n || 0) * 10) / 10).toLocaleString('en-IN') + ' kg';
/** the exact kg behind a tonne figure (1 t = 1,000 kg) — '' when the figure is already shown in kg */
export const kgExact = (n: number) => (Math.abs(+n || 0) >= 1e3 ? Math.round(+n || 0).toLocaleString('en-IN') + ' kg' : '');
export const rateLbl = (it: YarnItem) => (it.latest ? '₹' + it.latest.rate.toLocaleString('en-IN') : '—');

const fmtNum = (n: number) => (Math.round(n * 100) / 100).toString();
export const structure = (it: YarnItem) =>
  [
    it.count && it.countType ? `${fmtNum(it.count)}/${it.ply || 1} ${it.countType}` : '',
    it.blend.map((f) => FIBER_CODE[f] || f).join('-'),
    it.den ? Math.round(it.den) + ' den' : '',
  ].filter(Boolean).join(' · ');

export const splitLbl = (sub: YarnSub, it: YarnItem) =>
  sub.ratio.length ? it.blend.map((f, i) => ymsFibreShort(f) + ' ' + (sub.ratio[i] != null ? sub.ratio[i] + '%' : '—')).join(' · ') : 'ratio not set';

export const totals = (list: YarnItem[]) => ({
  n: list.length,
  stock: list.reduce((a, x) => a + x.stockKg, 0),
  used: list.reduce((a, x) => a + x.usedMonthKg, 0),
  designs: new Set(list.flatMap((x) => x.designs.map((d) => d.id))).size,
});

export const catShort = (c: string) => (c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10" -> "Oct 26" */
export const monthLabel = (ym: string) => (ym && ym.length >= 7 ? `${MONTHS[Number(ym.slice(5, 7)) - 1] || ''} ${ym.slice(2, 4)}` : ym);
/** "2026-10-04" -> "04 Oct" */
export const ymsDateLbl = (d: string) => (d && d.length >= 10 ? `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1] || ''}` : d || '—');
/** "2026-10-04" -> "04 Oct 2026" */
export const ymsDateFull = (d: string) => (d && d.length >= 10 ? `${ymsDateLbl(d)} ${d.slice(0, 4)}` : d || '—');

/** Search text of a yarn: code, name, blend name, sub items (same as the artifact). */
export const searchText = (it: YarnItem) =>
  (it.id + ' ' + it.mainItem + ' ' + it.cat.sub + ' ' + blendSubs(it).map((s) => s.id + ' ' + s.label).join(' ')).toLowerCase();

/* -------------------------- price trend (party-wise) -------------------------- */
export type Supplier = { mill: string; color: string; key: string };
/** parties in order of first appearance, each with a fixed colour (ymsSuppliers) */
export const ymsSuppliers = (points: PricePoint[]): Supplier[] => {
  const seen: string[] = [];
  points.forEach((p) => {
    if (!seen.includes(p.party)) seen.push(p.party);
  });
  return seen.map((mill, i) => ({ mill, color: YMS_SUP_COLORS[i % YMS_SUP_COLORS.length], key: 's' + i }));
};
export type ChartRow = { date: string; d: string; full: string; vals: Record<string, number>; meta: Record<string, PricePoint> };
/** one row per date so parties buying on the same day line up; a second entry by the same party on one day gets its own row */
export const chartRows = (points: PricePoint[], sups: Supplier[]): ChartRow[] => {
  const skOf: Record<string, string> = {};
  sups.forEach((s) => (skOf[s.mill] = s.key));
  const rows: ChartRow[] = [];
  const byDate: Record<string, ChartRow> = {};
  points.forEach((p) => {
    const key = skOf[p.party];
    let row = byDate[p.date];
    if (!row || row.vals[key] != null) {
      row = { date: p.date, d: ymsDateLbl(p.date), full: ymsDateFull(p.date), vals: {}, meta: {} };
      rows.push(row);
      byDate[p.date] = row;
    }
    row.vals[key] = p.rate;
    row.meta[key] = p;
  });
  return rows;
};
