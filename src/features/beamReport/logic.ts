// FILE: src/features/beamReport/logic.ts
// Beam Outward / Inward report rows, totals and CSV.

type Row = Record<string, any>;

export type ReportKind = 'outward' | 'inward';

export interface OutRow {
  key: string;
  vouNo: string;
  date: string;
  dateKey: number;
  party: string;
  beamNo: string;
  beamName: string;
  qty: number;
  rate: number;
  amount: number;
  inQty: number;
  pendQty: number;
  info: string;
  gatePass: string;
  inwards: string;
  daysOut: number;
}

export interface InRow {
  key: string;
  vouNo: string;
  date: string;
  dateKey: number;
  party: string;
  beamNo: string;
  beamName: string;
  qty: number;
  rate: number;
  amount: number;
  info: string;
  refType: string;
  refNo: string;
  refDate: string;
  daysOut: number | null;
}

const lower = (r: any): Row => {
  const o: Row = {};
  if (r && typeof r === 'object') Object.keys(r).forEach(k => { o[k.toLowerCase()] = r[k]; });
  return o;
};
const num = (v: unknown) => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : 0; };
const str = (v: unknown) => String(v ?? '').trim();
const dkey = (d: string, n?: unknown) => (/^\d{8}$/.test(String(n ?? '')) ? Number(n) : Number(d.split(/[-/]/).reverse().join('')) || 0);
const infoOf = (s: unknown) => (num(s) === 1 ? 'Process House' : 'In House');

export const outRowFrom = (raw: Row): OutRow => {
  const r = lower(raw);
  const date = str(r.rodate);
  return {
    key: `${num(r.uid)}-${num(r.srno)}`, vouNo: str(r.rono), date, dateKey: dkey(date, r.nrodate), party: str(r.parname) || str(r.parcode),
    beamNo: str(r.beamsr) || `#${num(r.beamsrno)}`, beamName: str(r.beamname), qty: num(r.qty), rate: num(r.rate), amount: num(r.amount),
    inQty: num(r.inqty), pendQty: num(r.pendqty), info: infoOf(r.status), gatePass: str(r.gatepassno), inwards: str(r.inwards), daysOut: num(r.daysout),
  };
};

export const inRowFrom = (raw: Row): InRow => {
  const r = lower(raw);
  const date = str(r.rodate);
  return {
    key: `${num(r.uid)}-${num(r.srno)}`, vouNo: str(r.rono), date, dateKey: dkey(date, r.nrodate), party: str(r.parname) || str(r.parcode),
    beamNo: str(r.beamsr) || `#${num(r.beamsrno)}`, beamName: str(r.beamname), qty: num(r.qty), rate: num(r.rate), amount: num(r.amount),
    info: infoOf(r.status), refType: str(r.reftype), refNo: str(r.refno), refDate: str(r.refdate),
    daysOut: r.daysout === null || r.daysout === undefined || r.daysout === '' ? null : num(r.daysout),
  };
};

export const outTotals = (rows: OutRow[]) => ({
  lines: rows.length,
  vouchers: new Set(rows.map(r => r.vouNo)).size,
  qty: rows.reduce((s, r) => s + r.qty, 0),
  received: rows.reduce((s, r) => s + r.inQty, 0),
  pending: rows.reduce((s, r) => s + r.pendQty, 0),
  pendingBeams: rows.filter(r => r.pendQty > 0.0005).length,
  amount: rows.reduce((s, r) => s + r.amount, 0),
});

export const inTotals = (rows: InRow[]) => ({
  lines: rows.length,
  vouchers: new Set(rows.map(r => r.vouNo)).size,
  qty: rows.reduce((s, r) => s + r.qty, 0),
  linked: rows.filter(r => r.refType === 'Beam Outward').length,
  avgDays: (() => {
    const d = rows.map(r => r.daysOut).filter((x): x is number => x !== null);
    return d.length ? Math.round(d.reduce((s, x) => s + x, 0) / d.length) : 0;
  })(),
  amount: rows.reduce((s, r) => s + r.amount, 0),
});

const cell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(kind: ReportKind, rows: (OutRow | InRow)[]): string {
  if (kind === 'outward') {
    const head = ['Vou No', 'Date', 'Party', 'Beam No', 'Beam', 'Beam Info', 'Qty', 'Received', 'Pending', 'Rate', 'Amount', 'Gate Pass', 'Inward(s)', 'Days Out'];
    const body = (rows as OutRow[]).map(r => [r.vouNo, r.date, r.party, r.beamNo, r.beamName, r.info, r.qty, r.inQty, r.pendQty, r.rate, r.amount, r.gatePass, r.inwards, r.daysOut]);
    return [head, ...body].map(l => l.map(cell).join(',')).join('\n');
  }
  const head = ['Vou No', 'Date', 'Party', 'Beam No', 'Beam', 'Beam Info', 'Qty', 'Rate', 'Amount', 'Against', 'Ref No', 'Ref Date', 'Days Out'];
  const body = (rows as InRow[]).map(r => [r.vouNo, r.date, r.party, r.beamNo, r.beamName, r.info, r.qty, r.rate, r.amount, r.refType, r.refNo, r.refDate, r.daysOut ?? '']);
  return [head, ...body].map(l => l.map(cell).join(',')).join('\n');
}
