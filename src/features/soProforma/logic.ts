// FILE: src/features/soProforma/logic.ts
// Pure helpers for the Sales Order → Proforma split (no React, no API).
import { calcTax, gstKind, num, numberTaxLines, r2, r3 } from '../beamInOut/logic';
import type { TaxLine } from '../beamInOut/types';
import { isValidDMY, todayDMY } from '../repackingIssue/logic';
import type { PiContext, PiLine, Proforma, SalesOrder, SoLine } from './types';

export const EPS = 0.0005;
export const REMARK_MAX = 500;
/** quick split buttons on the proforma form (% of the ordered qty, capped at the balance) */
export const QUICK_PCT = [30, 50] as const;

/** "02/11/2026" | "02-11-2026" | "20261102" → "02-11-2026" */
export const toDMY = (v: unknown): string => {
  const s = String(v ?? '').trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  return m ? `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[3]}` : '';
};
/** "02-11-2026" → 20261102 */
export const dmyKey = (v: string): number => {
  const d = toDMY(v);
  return d ? Number(d.split('-').reverse().join('')) : 0;
};
export const addDays = (dmy: string, days: number): string => {
  if (!isValidDMY(dmy)) return '';
  const [dd, mm, yy] = dmy.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};

export const lineName = (l: Pick<SoLine, 'item' | 'design' | 'shade'>) =>
  [l.item, l.design, l.shade].map(s => s.trim()).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).join(' • ');

/* ------------------------------------------------------------------ */
/* Sales Order progress                                                */
/* ------------------------------------------------------------------ */

export function soTotals(so: Pick<SalesOrder, 'lines'>) {
  const ordered = r3(so.lines.reduce((s, l) => s + l.qty, 0));
  const done = r3(so.lines.reduce((s, l) => s + l.done, 0));
  const balance = r3(Math.max(0, ordered - done));
  return { ordered, done, balance, pct: ordered > 0 ? Math.min(100, Math.round((done / ordered) * 100)) : 0 };
}

export type SoStatus = 'none' | 'part' | 'full';
export const soStatus = (so: Pick<SalesOrder, 'lines'>): SoStatus => {
  const t = soTotals(so);
  if (t.done <= EPS) return 'none';
  return t.balance <= EPS ? 'full' : 'part';
};

/* ------------------------------------------------------------------ */
/* proforma form                                                       */
/* ------------------------------------------------------------------ */

export const lineBalance = (l: PiLine) => r3(Math.max(0, l.ordered - l.other));
export const lineAmount = (l: PiLine) => r2(r3(num(l.qty)) * l.rate);

/** lines of a new proforma: every SO line, qty empty */
export const linesFromSO = (so: SalesOrder): PiLine[] =>
  so.lines.map(l => ({
    soSrNo: l.srNo, itmCode: l.itmCode, dsnCode: l.dsnCode, shdCode: l.shdCode, name: lineName(l),
    ordered: l.qty, other: l.done, rate: l.rate, qty: '', hsn: '',
  }));

export const emptyProforma = (so: SalesOrder): Proforma => {
  const date = todayDMY();
  return { uid: 0, no: '', date, validTill: addDays(date, 15), remark: '', lines: linesFromSO(so), tax: [] };
};

/** pct → that % of the ordered qty (capped at the balance); 'balance' → whole balance; 'clear' → empty */
export function quickFill(lines: PiLine[], how: number | 'balance' | 'clear'): PiLine[] {
  return lines.map(l => {
    if (how === 'clear') return { ...l, qty: '' };
    const bal = lineBalance(l);
    const q = how === 'balance' ? bal : Math.min(bal, r3((l.ordered * how) / 100));
    return { ...l, qty: q > 0 ? String(q) : '' };
  });
}

export function piTotals(p: Pick<Proforma, 'lines' | 'tax'>, sameState: boolean | null) {
  const qty = r3(p.lines.reduce((s, l) => s + r3(num(l.qty)), 0));
  const gross = r2(p.lines.reduce((s, l) => s + lineAmount(l), 0));
  const tax = calcTax(gross, p.tax, sameState);
  const ordered = r3(p.lines.reduce((s, l) => s + l.ordered, 0));
  const other = r3(p.lines.reduce((s, l) => s + l.other, 0));
  return { qty, gross, tax, net: tax.net, ordered, other, after: r3(Math.max(0, ordered - other - qty)) };
}

export type Errors = Record<string, string>;

export function validateProforma(p: Proforma): Errors {
  const e: Errors = {};
  if (!isValidDMY(p.date)) e.date = 'Enter the date as dd-mm-yyyy.';
  if (p.validTill && !isValidDMY(p.validTill)) e.validTill = 'Enter the date as dd-mm-yyyy.';
  else if (p.validTill && isValidDMY(p.date) && dmyKey(p.validTill) < dmyKey(p.date)) e.validTill = 'Valid till is before the date.';
  if (p.remark.length > REMARK_MAX) e.remark = `Max ${REMARK_MAX} characters.`;
  let any = false;
  p.lines.forEach(l => {
    const q = r3(num(l.qty));
    if (q < 0) e[`q${l.soSrNo}`] = 'Qty can not be negative.';
    else if (q > lineBalance(l) + EPS) e[`q${l.soSrNo}`] = `Only ${lineBalance(l).toFixed(3)} left.`;
    if (q > 0) any = true;
  });
  if (!any) e.lines = 'Enter the qty of at least one line.';
  return e;
}

export function buildPayload(ctx: PiContext, so: SalesOrder, p: Proforma, sameState: boolean | null) {
  const t = piTotals(p, sameState);
  return {
    prpcode: ctx.prpCode,
    yearno: ctx.yearNo,
    uid: p.uid,
    pidate: p.date,
    validdate: p.validTill,
    souid: so.uid,
    sono: so.soNo,
    sodate: toDMY(so.soDate),
    parcode: so.parCode,
    enttype: so.entType,
    remark: p.remark.trim(),
    d1: p.lines
      .filter(l => r3(num(l.qty)) > 0)
      .map(l => ({
        SOSrNo: l.soSrNo, ItmCode: l.itmCode, DsnCode: l.dsnCode, ShdCode: l.shdCode, ItmName: l.name,
        Qty: r3(num(l.qty)), Rate: l.rate, OrdQty: l.ordered, HsnCode: l.hsn,
      })),
    tax: t.tax.lines
      .filter(l => !l.off)
      .map(l => ({
        TaxStru: num(l.taxStru), TaxSr: l.taxSr, TaxMode: l.taxMode, TaxType: l.taxType, AccCode: l.accCode,
        TaxCode: l.taxCode, TaxName: l.taxName, TaxPer: l.manual ? 0 : r2(num(l.per)), TaxAmt: l.signed,
      })),
  };
}

/**
 * which GST applies, from the GST account list gettaxtable returns (`taxacc`, as the web):
 * CGST / SGST account listed → same state; IGST account listed → other state; nothing to go by → null
 */
export function sameStateFromTaxAcc(lines: TaxLine[], taxAcc: string[]): boolean | null {
  if (!taxAcc.length) return null;
  const listed = (k: 'C' | 'S' | 'I') => lines.some(l => gstKind(l) === k && !!l.accCode && taxAcc.includes(l.accCode));
  if (listed('C') || listed('S')) return true;
  if (listed('I')) return false;
  return null;
}

/** the full structure with the values of a saved proforma (edit / view): every line shows, saved % / amounts filled in */
export function mergeSavedTax(structure: TaxLine[], saved: TaxLine[]): TaxLine[] {
  if (!structure.length) return saved;
  const used = new Set<TaxLine>();
  const merged = structure.map(t => {
    const s = saved.find(x => !used.has(x) && x.taxSr === t.taxSr && x.taxName === t.taxName) ?? saved.find(x => !used.has(x) && x.taxName === t.taxName);
    if (!s) return { ...t, per: '', amt: '', manual: false };
    used.add(s);
    return { ...t, per: s.per, amt: s.amt, manual: s.manual };
  });
  // a saved line the structure no longer has stays, so the totals do not change
  saved.filter(x => !used.has(x)).forEach(x => merged.push(x));
  return numberTaxLines(merged);
}

/** tax lines of the Entry Type with the % of the previous proforma (matched by TaxSr / name) */
export function mergeTaxDefaults(structure: TaxLine[], previous: TaxLine[]): TaxLine[] {
  if (!previous.length) return structure;
  return structure.map(t => {
    const p = previous.find(x => x.taxSr === t.taxSr && x.taxName === t.taxName) ?? previous.find(x => x.taxName === t.taxName);
    // a typed amount (round off) belongs to that proforma only — carry the % only
    return p && !p.manual && num(p.per) ? { ...t, per: p.per, manual: false, amt: '' } : t;
  });
}

/* ------------------------------------------------------------------ */
/* amount in words (Indian system)                                     */
/* ------------------------------------------------------------------ */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const three = (n: number) => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? two(rest) : ''].filter(Boolean).join(' ');
};

export function amountInWords(amount: number): string {
  const neg = amount < 0;
  const v = Math.abs(r2(amount));
  let rupees = Math.floor(v);
  const paise = Math.round((v - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${crore >= 100 ? three(Math.floor(crore / 100)) + ' Hundred ' : ''}${two(crore % 100)} Crore`.replace(/\s+/g, ' ').trim());
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rupees) parts.push(three(rupees));
  const words = parts.join(' ') || 'Zero';
  return `${neg ? 'Minus ' : ''}Rupees ${words}${paise ? ` and ${two(paise)} Paise` : ''} Only`;
}
