// FILE: src/features/beamInOut/logic.ts
// Pure logic for Beam Outward / Inward: amounts, tax detail, validation, payload ⇄ form.
import { newKey, todayDMY, isValidDMY } from '../repackingIssue/logic';
import type { BeamContext, BeamForm, BeamHeader, BeamMaster, BeamRow, BeamTxn, InwardLink, Opt, OutwardBeam, TaxLine } from './types';

type Row = Record<string, any>;

export const REMARK_MAX = 50;
export const DADD_MAX = 200;
export const EPS = 0.0005;
/** voucher suffix filled in on a new voucher (editable) */
export const DEFAULT_SUFFIX = 'BM';

export const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
export const fmt2 = (n: number) => r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQ = (n: number) => r3(n).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const str = (v: unknown) => String(v ?? '').trim();

export const lower = (r: any): Row => {
  const o: Row = {};
  if (r && typeof r === 'object') Object.keys(r).forEach(k => { o[k.toLowerCase()] = r[k]; });
  return o;
};

export const txnTitle = (t: BeamTxn) => (t === 'beam_inward' ? 'Beam Inward' : 'Beam Outward');

/* ------------------------------------------------------------------ */
/* empty form                                                          */
/* ------------------------------------------------------------------ */

export const emptyHeader = (): BeamHeader => ({
  vouDate: todayDMY(),
  vouNo: '',
  suffix: DEFAULT_SUFFIX,
  account: null,
  group: null,
  entType: null,
  party: null,
  address: '',
  delAddress: '',
  department: null,
  authBy: null,
  remark: '',
});

export const emptyForm = (txn: BeamTxn): BeamForm => ({ txn, header: emptyHeader(), rows: [], tax: [], taxAcc: [], sameState: null });

export const rowFromMaster = (b: BeamMaster, prev?: BeamRow): BeamRow => ({
  key: newKey('b'),
  beamCode: b.beamCode,
  beamName: b.beamName,
  beamSrNo: b.beamSrNo,
  beamNo: b.beamNo,
  weight: String(r3(b.weight)),
  qty: '1',
  rate: prev?.rate ?? '',
  info: prev?.info ?? '0',
  inward: null,
  remarks: ['', '', '', '', ''],
  inQty: 0,
  hsnCode: '',
});

/** Beam Inward: row from a Beam Outward line (linked, open qty, outward rate) */
export const rowFromOutward = (o: OutwardBeam): BeamRow => ({
  ...rowFromMaster(o.beam),
  qty: String(r3(o.link.balQty ?? 1)),
  rate: o.rate ? String(r2(o.rate)) : '',
  info: o.info,
  inward: o.link,
});

export const outwardFromRow = (raw: Row): OutwardBeam => {
  const r = lower(raw);
  return {
    beam: {
      beamCode: num(r.beamcode),
      beamName: str(r.beamname),
      beamSrNo: num(r.beamsrno),
      beamNo: str(r.beamsr),
      diameter: '',
      weight: num(r.wt),
      isOut: true,
    },
    link: { uid: num(r.outuid), srNo: num(r.outsrno), tranType: -10, no: str(r.rono), date: str(r.rodate), balQty: num(r.balqty) },
    rate: num(r.rate),
    info: num(r.status) === 1 ? '1' : '0',
  };
};

/** Inward No. is needed for every Beam Inward row, and for Process House beams going out */
export const inwardRequired = (txn: BeamTxn, r: BeamRow) => txn === 'beam_inward' || r.info === '1';

/* ------------------------------------------------------------------ */
/* amounts                                                             */
/* ------------------------------------------------------------------ */

export const rowAmount = (r: BeamRow) => r2(num(r.qty) * num(r.rate));

export const rowTotals = (rows: BeamRow[]) => ({
  beams: rows.length,
  qty: r3(rows.reduce((s, r) => s + num(r.qty), 0)),
  weight: r3(rows.reduce((s, r) => s + num(r.weight), 0)),
  gross: r2(rows.reduce((s, r) => s + rowAmount(r), 0)),
});

const GST_RE = /\b([CSI])GST\b/i;
export const gstKind = (t: Pick<TaxLine, 'taxName'>): 'C' | 'S' | 'I' | null => {
  const m = t.taxName.match(GST_RE);
  return m ? (m[1].toUpperCase() as 'C' | 'S' | 'I') : null;
};

/** GST line that does not apply to this party: IGST when the states are the same, CGST / SGST when they differ */
export const taxLineOff = (t: TaxLine, sameState: boolean | null) => {
  const k = gstKind(t);
  if (!k || sameState === null) return false;
  return sameState ? k === 'I' : k !== 'I';
};

/** like cleanDecimal, but a leading '-' is kept (Round Off / Add-Less can be negative, as on the web) */
export const cleanSignedDecimal = (v: string, decimals = 2) => {
  const neg = v.trim().startsWith('-');
  let s = v.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, decimals);
  return neg ? `-${s}` : s;
};

export interface TaxCalcLine extends TaxLine {
  amount: number; // amount as shown: '-' lines positive; a typed amount on a '+' line may be negative
  signed: number; // amount with the sign of taxMode
  calculated: number; // running total after this line ("Calculated")
  off: boolean;
}

/**
 * Tax Detail exactly like the web / desktop (TaxCal is not used):
 *  - each line's % is on the running total above it (line 1 on the Gross);
 *  - GST lines that follow each other (CGST → SGST) share the base of the first one;
 *  - a typed amount (manual) is used as is; '-' lines reduce the total;
 *  - GST lines that don't apply to the party (by taxacc) are 0 and locked.
 * Header split as the web: TaxAmt = '+' lines with an account, NTaxAmt = '+' without,
 * DisAmt / NDisAmt = '-' lines with / without an account (stored negative, like the web).
 */
export function calcTax(gross: number, lines: TaxLine[], sameState: boolean | null = null) {
  let running = r2(gross);
  let gstBase = running;
  let firstGstBase: number | null = null;
  let prevGst = false;
  const sum = { tax: 0, ntax: 0, dis: 0, ndis: 0, gst: 0 };
  const out: TaxCalcLine[] = [...lines]
    .sort((a, b) => a.taxSr - b.taxSr)
    .map(t => {
      const off = taxLineOff(t, sameState);
      const isGst = !!gstKind(t);
      if (isGst && !prevGst) gstBase = running;
      if (isGst && firstGstBase === null) firstGstBase = gstBase;
      const base = isGst ? gstBase : running;
      prevGst = isGst;
      // '-' line: always subtracts (like the web: -abs); '+' line: a typed amount keeps its sign (Round Off -0.40)
      const raw = off ? 0 : t.manual ? r2(num(t.amt)) : r2((base * num(t.per)) / 100);
      const amount = t.taxMode === '-' ? Math.abs(raw) : raw;
      const signed = t.taxMode === '-' ? -amount : amount;
      running = r2(running + signed);
      const acc = !!t.accCode;
      if (t.taxMode === '-') acc ? (sum.dis = r2(sum.dis + signed)) : (sum.ndis = r2(sum.ndis + signed));
      else acc ? (sum.tax = r2(sum.tax + signed)) : (sum.ntax = r2(sum.ntax + signed));
      if (isGst) sum.gst = r2(sum.gst + signed);
      return { ...t, amount, signed, calculated: running, off };
    });
  return {
    lines: out,
    gross: r2(gross),
    taxAmt: sum.tax,
    nTaxAmt: sum.ntax,
    disAmt: sum.dis,
    nDisAmt: sum.ndis,
    gst: sum.gst,
    /** all '-' lines as a positive figure (shown as "Less") */
    less: r2(-(sum.dis + sum.ndis)),
    /** value the GST lines were worked out on (gross ± lines above them) */
    gstBase: firstGstBase ?? r2(gross),
    net: running,
  };
}

/** problems the web checked on OK (CGST = SGST, no GST of the wrong kind, no blank / tiny amounts) */
export function validateTax(lines: TaxLine[], sameState: boolean | null): string | null {
  const c = lines.find(t => gstKind(t) === 'C' && !taxLineOff(t, sameState));
  const s = lines.find(t => gstKind(t) === 'S' && !taxLineOff(t, sameState));
  if (c && s) {
    if (!c.manual && !s.manual && num(c.per) !== num(s.per)) return 'CGST and SGST % must be the same.';
    if (c.manual !== s.manual || (c.manual && num(c.amt) !== num(s.amt))) return 'CGST and SGST must be the same.';
  }
  for (const t of lines) {
    if (taxLineOff(t, sameState)) continue;
    if (num(t.per) < 0) return `${t.taxName}: % can not be negative.`;
    if (t.accCode && t.manual && num(t.amt) !== 0 && Math.abs(num(t.amt)) < 0.01) return `${t.taxName}: amount is too small.`;
  }
  return null;
}

/** GST % per kind from the tax lines (for the FAMBOutD1 CGST / SGST / IGST columns) */
export function gstRates(lines: TaxLine[], sameState: boolean | null) {
  const out = { C: 0, S: 0, I: 0 };
  lines.forEach(t => {
    const k = gstKind(t);
    if (k && !taxLineOff(t, sameState) && !t.manual) out[k] = num(t.per);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

export type Errors = Record<string, string>;

export function validateHeader(f: BeamForm): Errors {
  const h = f.header;
  const e: Errors = {};
  if (!isValidDMY(h.vouDate)) e.vouDate = 'Enter the voucher date';
  if (!h.account) e.account = 'Select the account';
  if (!h.group) e.group = 'Select the group';
  if (!h.entType) e.entType = 'Select the entry type';
  if (!h.party) e.party = 'Select the party';
  if (!h.department) e.department = 'Select the department';
  if (!h.delAddress.trim()) e.delAddress = 'Enter the delivery address';
  if (h.delAddress.length > DADD_MAX) e.delAddress = `Max ${DADD_MAX} characters`;
  if (h.remark.length > REMARK_MAX) e.remark = `Max ${REMARK_MAX} characters`;
  if (!f.rows.length) e.rows = 'Add at least one beam';
  return e;
}

export function validateRow(txn: BeamTxn, r: BeamRow): string | null {
  if (num(r.qty) <= 0) return 'Qty must be more than 0';
  if (num(r.rate) < 0) return 'Rate can not be negative';
  if (num(r.weight) < 0) return 'Weight can not be negative';
  if (inwardRequired(txn, r) && !r.inward) return 'Select the Inward No.';
  if (r.inward?.tranType === -10 && r.inward.balQty !== undefined && num(r.qty) > r.inward.balQty + EPS)
    return `Qty is more than open on ${r.inward.no} (${fmtQ(r.inward.balQty)})`;
  if (r.remarks.some(x => x.length > REMARK_MAX)) return `Remarks: max ${REMARK_MAX} characters`;
  return null;
}

export function validateForm(f: BeamForm): Errors {
  const e = validateHeader(f);
  f.rows.forEach((r, i) => {
    const m = validateRow(f.txn, r);
    if (m) e[`row${i}`] = `Beam ${r.beamNo || i + 1}: ${m}`;
  });
  return e;
}

/* ------------------------------------------------------------------ */
/* payload (web beam_inward_outward_crud format)                       */
/* ------------------------------------------------------------------ */

export function buildPayload(ctx: BeamContext, f: BeamForm, action: 'add_data' | 'modify_data'): Row {
  const h = f.header;
  const totals = rowTotals(f.rows);
  const t = calcTax(totals.gross, f.tax, f.sameState);
  const g = gstRates(f.tax, f.sameState);

  // GST per beam row on its share of the GST base, last row takes the rounding difference
  const ratio = totals.gross ? t.gstBase / totals.gross : 0;
  const gstOf = (k: 'C' | 'S' | 'I') => r2(t.lines.filter(l => gstKind(l) === k && !l.off).reduce((x, l) => x + l.amount, 0));
  const head = { C: gstOf('C'), S: gstOf('S'), I: gstOf('I') };
  const done = { C: 0, S: 0, I: 0 };
  const share = (k: 'C' | 'S' | 'I', amount: number, last: boolean) => {
    const v = last ? r2(head[k] - done[k]) : r2((amount * ratio * g[k]) / 100);
    done[k] = r2(done[k] + v);
    return v;
  };

  const d1 = f.rows.map((r, i) => {
    const amount = rowAmount(r);
    const last = i === f.rows.length - 1;
    const c = share('C', amount, last);
    const s = share('S', amount, last);
    const ig = share('I', amount, last);
    return {
      UId: f.meta?.uid ?? 0,
      SrNo: i + 1,
      BeamCode: r.beamCode,
      BeamSrNo: r.beamSrNo,
      Qty: r3(num(r.qty)),
      Rate: r2(num(r.rate)),
      Amount: amount,
      InwUId: r.inward?.uid ?? 0,
      InwSrNo: r.inward?.srNo ?? 0,
      Trantype: r.inward?.tranType ?? 0,
      Remark1: r.remarks[0].trim(),
      Remark2: r.remarks[1].trim(),
      Remark3: r.remarks[2].trim(),
      Remark4: r.remarks[3].trim(),
      Remark5: r.remarks[4].trim(),
      Status: Number(r.info),
      CGSTPer: g.C, CGSTAmt: c,
      SGSTPer: g.S, SGSTAmt: s,
      IGSTPer: g.I, IGSTAmt: ig,
      D1NetAmt: r2(amount + c + s + ig),
      HsnCode: r.hsnCode,
    };
  });

  const tax = t.lines.map(l => ({
    UId: f.meta?.uid ?? 0,
    TaxStru: num(l.taxStru),
    TaxSr: l.taxSr,
    TaxMode: l.taxMode,
    TaxType: l.taxType,
    AccCode: l.accCode,
    TaxCode: l.taxCode,
    TaxName: l.taxName,
    TaxPer: l.off || l.manual ? 0 : r2(num(l.per)),
    TaxAmt: l.signed, // signed, like the web
    NetTax: 0,
    BalAmt: 0,
  }));

  return {
    action,
    txntype: f.txn,
    prpcode: ctx.prpCode,
    yearno: ctx.yearNo,
    PrpCode: ctx.prpCode,
    YearNo: ctx.yearNo,
    UId: f.meta?.uid ?? 0,
    RONo: f.autoVouNo ? '' : h.vouNo.trim(),
    suffix: h.suffix.trim(),
    RODate: h.vouDate,
    AccCode: h.account?.code ?? '',
    GrpCode: h.group?.code ?? '',
    EntType: h.entType?.code ?? '',
    ParCode: h.party?.code ?? '',
    DptCode: h.department?.code ?? '',
    AuthBy: h.authBy?.code ?? '',
    DAdd: h.delAddress.trim(),
    Remark: h.remark.trim(),
    GrsAmt: t.gross,
    TaxAmt: t.taxAmt,
    NTaxAmt: t.nTaxAmt,
    DisAmt: t.disAmt,
    NDisAmt: t.nDisAmt,
    GSTAmt: t.gst,
    NetAmt: t.net,
    d1,
    tax,
  };
}

/* ------------------------------------------------------------------ */
/* rows from the server                                                */
/* ------------------------------------------------------------------ */

export const masterFromRow = (raw: Row): BeamMaster => {
  const r = lower(raw);
  return {
    beamCode: num(r.beamcode),
    beamName: str(r.beamname),
    beamSrNo: num(r.srno),
    beamNo: str(r.beamsr),
    diameter: str(r.diameter),
    weight: num(r.wt),
    isOut: num(r.isout) === 1,
  };
};

export const inwardFromRow = (raw: Row): InwardLink => {
  const r = lower(raw);
  return {
    uid: num(r.uid),
    srNo: num(r.srno),
    tranType: num(r.trantype),
    no: str(r.rono),
    date: str(r.rodate),
    balQty: r.balqty !== undefined ? num(r.balqty) : undefined,
  };
};

/** TaxSr must be unique (it keys the lines): if it is missing or repeated, number the lines in the order received */
export const numberTaxLines = (lines: TaxLine[]): TaxLine[] => {
  const srs = lines.map(l => l.taxSr);
  const ok = srs.every(n => n > 0) && new Set(srs).size === srs.length;
  return ok ? [...lines].sort((a, b) => a.taxSr - b.taxSr) : lines.map((l, i) => ({ ...l, taxSr: i + 1 }));
};

export const taxLineFromRow = (raw: Row): TaxLine => {
  const r = lower(raw);
  const per = num(r.taxper);
  const amt = num(r.taxamt);
  return {
    taxStru: str(r.taxstru),
    taxSr: num(r.taxsr ?? r.srno ?? r.sr),
    taxMode: str(r.taxmode) === '-' ? '-' : '+',
    taxType: str(r.taxtype),
    accCode: str(r.acccode),
    taxCode: str(r.taxcode),
    taxName: str(r.taxname),
    taxCal: num(r.taxcal),
    per: per ? String(per) : '',
    amt: amt ? String(str(r.taxmode) === '-' ? Math.abs(amt) : amt) : '',
    manual: !per && amt !== 0,
  };
};

const opt = (code: unknown, name: unknown): Opt | null => (str(code) ? { code: str(code), name: str(name) || str(code) } : null);

/** show_data {main, d1, tax, taxacc} → form */
export function formFromShow(txn: BeamTxn, body: Row): BeamForm {
  const m = lower((body.main ?? [])[0]);
  const rows: BeamRow[] = (body.d1 ?? []).map((raw: Row): BeamRow => {
    const r = lower(raw);
    const tt = num(r.trantype);
    return {
      key: newKey('b'),
      beamCode: num(r.beamcode),
      beamName: str(r.beamname),
      beamSrNo: num(r.beamsrno),
      beamNo: str(r.beamsno),
      weight: String(r3(num(r.wt))),
      qty: String(r3(num(r.qty))),
      rate: String(r2(num(r.rate))),
      info: num(r.status) === 1 ? '1' : '0',
      inward: tt !== 0 && num(r.inwuid) ? { uid: num(r.inwuid), srNo: num(r.inwsrno), tranType: tt, no: str(r.inwardno), date: str(r.inwarddate) } : null,
      remarks: [str(r.remark1), str(r.remark2), str(r.remark3), str(r.remark4), str(r.remark5)],
      inQty: num(r.inqty),
      hsnCode: str(r.hsncode),
    };
  });
  const tax = numberTaxLines((body.tax ?? []).map(taxLineFromRow));
  const parts = [str(m.month), str(m.rono)].filter(Boolean);
  return {
    txn,
    header: {
      vouDate: str(m.rodate),
      vouNo: parts[parts.length - 1] ?? '',
      suffix: str(m.suffix),
      account: opt(m.acccode, m.accname),
      group: opt(m.grpcode, m.grpcode),
      entType: opt(m.enttype, m.enttype),
      party: opt(m.parcode, m.parname),
      address: '',
      delAddress: str(m.dadd),
      department: opt(m.dptcode, m.dptname),
      authBy: opt(m.authby, m.authby),
      remark: str(m.remark),
    },
    rows,
    tax,
    taxAcc: (body.taxacc ?? []).map((x: unknown) => str(x)).filter(Boolean),
    sameState: body.samestate === null || body.samestate === undefined || body.samestate === '' ? null : num(body.samestate) === 1,
    meta: { uid: num(m.uid), received: num(m.received) || rows.filter(r => r.inQty > 0).length, gatePassNo: str(m.gatepassno) },
  };
}
