// Pure helpers: numbers, dates, totals, validation and payload mapping.

import { CartonRow, RepackHeader, RepackItem } from './types';

let seq = 0;
export const newKey = (p = 'k') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export const toNum = (v: string | number | null | undefined): number => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const fmt3 = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** keeps only a valid decimal while typing (max 3 decimals) */
export const cleanDecimal = (v: string, decimals = 3) => {
  let s = v.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, decimals);
  return s;
};

export const cleanInt = (v: string) => v.replace(/[^0-9]/g, '');

export const todayDMY = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/** auto-inserts dashes while typing dd-mm-yyyy */
export const maskDMY = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};

export const isValidDMY = (v: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
  if (!m) return false;
  const [dd, mm, yy] = [+m[1], +m[2], +m[3]];
  const d = new Date(yy, mm - 1, dd);
  return d.getFullYear() === yy && d.getMonth() === mm - 1 && d.getDate() === dd;
};

export const isFutureDMY = (v: string) => {
  if (!isValidDMY(v)) return false;
  const [dd, mm, yy] = v.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d.getTime() > t.getTime();
};

/** AmtCalc of the carton's source inward ('' when not known) */
export const cartonUom = (c: CartonRow, fallback = ''): string =>
  String(c.source?.amtCalc || fallback || 'MTR').trim().toUpperCase();

/** a carton's share of the item Qty: inward in KGS → its weight, otherwise its qty */
export const cartonQty = (c: CartonRow, fallback = ''): number =>
  cartonUom(c, fallback) === 'KGS' ? toNum(c.wt) : toNum(c.mtr);

/** POYProd.Remark is varchar(50) */
export const REMARK_MAX = 50;

export const cartonTotals = (cartons: CartonRow[], fallbackUom = '') => ({
  count: cartons.length,
  /** sum of the cartons' own qty (POYProdRD2.qty) */
  mtr: cartons.reduce((s, c) => s + toNum(c.mtr), 0),
  wt: cartons.reduce((s, c) => s + toNum(c.wt), 0),
  /** item Qty (POYProdRD1.totqty): qty for MTR cartons + wt for KGS cartons */
  qty: cartons.reduce((s, c) => s + cartonQty(c, fallbackUom), 0)
});

export const formTotals = (items: RepackItem[]) =>
  items.reduce(
    (a, it) => ({
      items: a.items + 1,
      cartons: a.cartons + it.cartons.length,
      pcs: a.pcs + toNum(it.pieces),
      qty: a.qty + toNum(it.qty),
      wt: a.wt + toNum(it.wt)
    }),
    { items: 0, cartons: 0, pcs: 0, qty: 0, wt: 0 }
  );

export const emptyItem = (srNo: number): RepackItem => ({
  key: newKey('i'),
  srNo,
  item: null,
  merge: null,
  grade: null,
  shade: null,
  denier: '',
  uom: '',
  pieces: '',
  qty: '',
  wt: '',
  cartons: []
});

export const emptyHeader = (): RepackHeader => ({
  vouDate: todayDMY(),
  vouPrefix: '',
  vouNo: '',
  vouSuffix: '',
  remarks: '',
  stockType: null,
  department: null,
  remark1: '',
  remark2: '',
  remark3: ''
});

export type Errors = Record<string, string>;

export function validateHeader(h: RepackHeader): Errors {
  const e: Errors = {};
  if (!isValidDMY(h.vouDate)) e.vouDate = 'Enter a valid date (dd-mm-yyyy)';
  else if (isFutureDMY(h.vouDate)) e.vouDate = 'Date cannot be in the future';
  if (!h.vouNo.trim()) e.vouNo = 'Voucher no. is required';
  if (!h.stockType) e.stockType = 'Select stock type';
  if (!h.department) e.department = 'Select department';
  if (!h.remarks.trim()) e.remarks = 'Remarks are required';
  else if (h.remarks.trim().length > REMARK_MAX) e.remarks = `Remarks: max ${REMARK_MAX} characters`;
  return e;
}

export function validateItem(it: RepackItem): Errors {
  const e: Errors = {};
  if (!it.item) e.item = 'Item is required';
  if (!it.merge) e.merge = 'Merge is required';
  if (!it.grade) e.grade = 'Grade is required';
  if (!it.shade) e.shade = 'Shade is required';
  if (!it.denier.trim()) e.denier = 'Denier is required';
  if (toNum(it.pieces) <= 0) e.pieces = 'Pieces must be more than 0';
  if (toNum(it.qty) <= 0) e.qty = 'Qty must be more than 0';
  if (!it.cartons.length) e.cartons = 'Add at least one carton from stock';
  it.cartons.forEach((c, i) => {
    if (cartonQty(c, it.uom) <= 0) e[`carton_${i}`] = `Carton ${c.cartNo}: ${cartonUom(c, it.uom) === 'KGS' ? 'weight' : 'qty'} must be more than 0`;
  });
  return e;
}

/** carton numbers used in other items of the same voucher */
export const cartonsInOtherItems = (items: RepackItem[], exceptKey: string) => {
  const s = new Set<string>();
  items.forEach(it => {
    if (it.key !== exceptKey) it.cartons.forEach(c => s.add(c.cartNo.trim().toUpperCase()));
  });
  return s;
};
