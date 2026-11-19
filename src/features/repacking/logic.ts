// FILE: src/features/repacking/logic.ts
// Pure Repacking rules (KnitPrdRepackRepository):
//  - Repacking is written on the issue's own POYProd row (as the desktop): ONE repacked item (header)
//    for the whole issue, defaulted from the issue's first RD1 item; item / merge / grade / shade can change
//  - taka meters / pcs may not go above the issue's (RD2 Qty); weight may differ (re-weighed)
//  - Auto: the issue's cartons are filled in (meters / weight fixed), the user renames them
//  - Manual: cartons are typed like the desktop taka grid: Taka No, Piece, CalcOn, Meters, Gross, Tare → Weight
//  - POYProdD1.NetWt = meters (MTR) / pcs (KGS) = "Meters" column; CarWt = weight
import { isFutureDMY, isValidDMY, newKey, REMARK_MAX, toNum, todayDMY } from '../repackingIssue/logic';
import type {
  CalcOn, IssueCarton, IssueDetail, IssueItem, IssueSummary, Opt, RepackContext, RepackDefaults, RepackMasters,
  RpCarton, RpForm, RpHeader, RpItem,
} from './types';

export { REMARK_MAX };
export type Errors = Record<string, string>;
type Row = Record<string, any>;

/** allowed difference between cartons and the issue item */
export const EPS = 0.005;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
const lower = (r: Row | null | undefined): Row => {
  const o: Row = {};
  Object.keys(r ?? {}).forEach(k => { o[k.toLowerCase()] = (r as Row)[k]; });
  return o;
};
const opt = (code: any, name: any): Opt | null => {
  const c = str(code);
  return !c || c === '0' ? null : { code: c, name: str(name) || c };
};
const calc = (v: any, fallback: CalcOn = 'MTR'): CalcOn => {
  const s = str(v).toUpperCase();
  return s === 'KGS' ? 'KGS' : s === 'MTR' ? 'MTR' : fallback;
};
/** dd-mm-yyyy from dd/mm/yyyy, dd-mm-yyyy or yyyymmdd */
export const toDMY = (v: any): string => {
  const s = str(v);
  if (/^\d{8}$/.test(s)) return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  return m ? `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[3]}` : s;
};

/* ------------------------------------------------------------------ */
/* weights                                                            */
/* ------------------------------------------------------------------ */

export interface CartonCalc {
  meters: number;
  gross: number;
  tare: number;
  weight: number;
  /** meters (MTR) / pcs (KGS) — POYProdD1.NetWt */
  qty: number;
}

/** Auto (issue carton): weight fixed, gross = weight + tare. Manual: weight = gross − tare. */
export function calcCarton(c: RpCarton): CartonCalc {
  const meters = r3(toNum(c.meters));
  const tare = r3(toNum(c.tareWt));
  let gross: number;
  let weight: number;
  if (c.origCartNo !== undefined) {
    weight = r3(toNum(c.weight));
    gross = r3(weight + tare);
  } else {
    gross = r3(toNum(c.grossWt));
    weight = r3(gross - tare);
  }
  return { meters, gross, tare, weight, qty: meters };
}

export function itemTotals(it: RpItem) {
  return it.cartons.reduce(
    (a, c) => {
      const k = calcCarton(c);
      return {
        pcs: a.pcs + 1,
        meters: r3(a.meters + k.meters),
        gross: r3(a.gross + k.gross),
        tare: r3(a.tare + k.tare),
        weight: r3(a.weight + k.weight),
        qty: r3(a.qty + k.qty),
      };
    },
    { pcs: 0, meters: 0, gross: 0, tare: 0, weight: 0, qty: 0 }
  );
}

export function formTotals(f: RpForm) {
  return f.items.reduce(
    (a, it) => {
      const t = itemTotals(it);
      return { items: a.items + 1, pcs: a.pcs + t.pcs, qty: r3(a.qty + t.qty), weight: r3(a.weight + t.weight) };
    },
    { items: 0, pcs: 0, qty: 0, weight: 0 }
  );
}

/** what is left to enter for an item */
export const balanceOf = (it: RpItem) => {
  const t = itemTotals(it);
  return { qty: r3(it.issQty - t.qty), weight: r3(it.issWt - t.weight) };
};

/* ------------------------------------------------------------------ */
/* new form / items from the issue                                    */
/* ------------------------------------------------------------------ */

export const emptyHeader = (): RpHeader => ({
  vouDate: todayDMY(), vouPrefix: '', vouNo: '', vouSuffix: '', remark: '', party: null, department: null, auto: false,
});

export const emptyForm = (): RpForm => ({ header: emptyHeader(), issue: null, items: [] });

const pickOpt = (list: Opt[], code: string): Opt | null => {
  if (!code) return null;
  return list.find(o => o.code === code) ?? { code, name: code };
};

/** defaults from GENDefaultsO POY 27 */
export function itemDefaults(m: RepackMasters | null): Pick<RpItem, 'prodType' | 'packType' | 'checker'> {
  const d = m?.defaults;
  return {
    prodType: d?.prodType ? pickOpt(m!.prodTypes, d.prodType) : null,
    packType: d?.packType || 'NEX',
    checker: d?.chkCode ? pickOpt(m!.checkers, d.chkCode) : null,
  };
}

/**
 * next taka no. after the last one: trailing number + 1, same width (TEST10001 → TEST10002, A-099 → A-100).
 * Skips numbers already used. No trailing digits → ''.
 */
export function nextTakaNo(prev: string, used: Set<string> = new Set()): string {
  const m = /^(.*?)(\d+)$/.exec(prev.trim().toUpperCase());
  if (!m) return '';
  // decimal string + 1 (no Number / BigInt: taka numbers can be longer than 15 digits)
  const inc = (d: string) => {
    const a = d.split('');
    let i = a.length - 1;
    while (i >= 0 && a[i] === '9') { a[i] = '0'; i--; }
    if (i < 0) return `1${a.join('')}`;
    a[i] = String(Number(a[i]) + 1);
    return a.join('');
  };
  let digits = m[2];
  for (let n = 0; n < 1000; n++) {
    digits = inc(digits);
    const cand = `${m[1]}${digits}`;
    if (!used.has(cand)) return cand;
  }
  return '';
}

/**
 * taka numbers for `count` cartons starting at `start` (TEST10001, TEST10002, …), skipping numbers in `used`.
 * null when start doesn't end with a number.
 */
export function takaSeries(start: string, count: number, used: Set<string> = new Set()): string[] | null {
  const first = start.trim().toUpperCase();
  if (!/\d$/.test(first)) return null;
  const out: string[] = [];
  const taken = new Set(used);
  let cur = taken.has(first) ? nextTakaNo(first, taken) : first;
  for (let i = 0; i < count; i++) {
    if (!cur) return null;
    out.push(cur);
    taken.add(cur);
    cur = nextTakaNo(cur, taken);
  }
  return out;
}

/** renumber every not-used carton of the items from `start`, item after item */
export function renumberItems(items: RpItem[], start: string): RpItem[] | null {
  const locked = new Set(items.flatMap(it => it.cartons.filter(c => c.used).map(c => c.cartNo.trim().toUpperCase())));
  const count = items.reduce((a, it) => a + it.cartons.filter(c => !c.used).length, 0);
  const names = takaSeries(start, count, locked);
  if (!names) return null;
  let k = 0;
  return items.map(it => ({ ...it, cartons: it.cartons.map(c => (c.used ? c : { ...c, cartNo: names[k++] })) }));
}

export function newCarton(calcOn: CalcOn, last?: RpCarton): RpCarton {
  return {
    key: newKey('c'), cartNo: last ? nextTakaNo(last.cartNo) : '', piece: last?.piece || 'A', calcOn: last?.calcOn ?? calcOn,
    meters: (last?.calcOn ?? calcOn) === 'KGS' ? '1' : '', grossWt: '', tareWt: last?.tareWt ?? '', weight: '', operator: last?.operator ?? null, shift: last?.shift ?? '',
  };
}

/** all issue cartons as new taka named "<old>." (Auto Entry); meters / pcs = RD2 Qty, weight = RD2 Wt */
export const autoCartons = (issue: IssueDetail): RpCarton[] =>
  issue.cartons.map(c => ({
    key: newKey('c'),
    cartNo: `${c.cartNo}.`,
    origCartNo: c.cartNo,
    issSrNo: c.srNo,
    issSubSr: c.subSr,
    piece: 'A',
    calcOn: c.calcOn,
    meters: String(c.qty),
    tareWt: '0',
    weight: String(c.wt),
    grossWt: '',
    operator: null,
    shift: '',
  }));

/** issue totals the taka are checked against: meters / pcs = sum of RD2 Qty, weight = sum of RD2 Wt */
export const issueTotals = (issue: IssueDetail) => ({
  qty: r3(issue.cartons.reduce((a, c) => a + c.qty, 0)),
  wt: r3(issue.cartons.reduce((a, c) => a + c.wt, 0)),
});

/** the ONE repacked item (header), defaulted from the issue's first RD1 item; Auto also fills all taka */
export function itemsFromIssue(issue: IssueDetail, m: RepackMasters | null, auto: boolean): RpItem[] {
  const ii = issue.items[0];
  const t = issueTotals(issue);
  return [{
    key: newKey('i'),
    srNo: 1,
    issSrNo: ii?.srNo,
    issQty: t.qty,
    issWt: t.wt,
    calcOn: ii?.calcOn ?? 'MTR',
    item: ii?.item ?? null,
    merge: ii?.merge ?? null,
    grade: ii?.grade ?? null,
    shade: ii?.shade ?? null,
    denier: ii?.denier ?? '',
    ...itemDefaults(m),
    cartons: auto ? autoCartons(issue) : [],
  }];
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

export function validateHeader(f: RpForm): Errors {
  const e: Errors = {};
  const h = f.header;
  if (!f.issue) e.issue = 'Select a Repacking Issue';
  if (!isValidDMY(h.vouDate)) e.vouDate = 'Enter a valid date';
  else if (isFutureDMY(h.vouDate)) e.vouDate = 'Date cannot be in the future';
  if (h.remark.trim().length > REMARK_MAX) e.remark = `Max ${REMARK_MAX} characters`;
  if (!f.items.length) e.items = 'Select a Repacking Issue';
  return e;
}

export function validateCarton(c: RpCarton): string | null {
  const k = calcCarton(c);
  const n = c.cartNo.trim().toUpperCase();
  if (!n) return 'Taka / carton no. is required';
  if (c.origCartNo && n === c.origCartNo.trim().toUpperCase()) return `${n}: give it a new number`;
  if (k.meters <= 0) return `${n}: ${c.calcOn === 'KGS' ? 'pcs' : 'meters'} must be more than 0`;
  if (k.tare < 0) return `${n}: tare can't be negative`;
  if (k.weight <= 0) return `${n}: weight must be more than 0 (gross ${k.gross} − tare ${k.tare})`;
  return null;
}

export function validateItem(it: RpItem, usedElsewhere: Set<string>): Errors {
  const e: Errors = {};
  if (!it.item) e.item = 'Item is required';
  if (!it.merge) e.merge = 'Merge is required';
  if (!it.grade) e.grade = 'Grade is required';
  if (!it.shade) e.shade = 'Shade is required';
  if (!it.prodType) e.prodType = 'Packing type is required';
  if (!it.packType) e.packType = 'Type is required';
  if (!it.cartons.length) e.cartons = 'Add at least one carton';
  const seen = new Set<string>();
  it.cartons.forEach((c, i) => {
    const n = c.cartNo.trim().toUpperCase();
    const err = validateCarton(c) ?? (seen.has(n) || usedElsewhere.has(n) ? `${n} is entered twice` : null);
    if (err) e[`c${i}`] = err;
    seen.add(n);
  });
  const t = itemTotals(it);
  if (t.qty > it.issQty + EPS) e.qtyOver = `Meters / pcs ${t.qty.toFixed(3)} is more than the issue (${it.issQty.toFixed(3)})`;
  return e;
}

/** items whose taka don't match the issue: meters / pcs short, or weight different */
export const shortItems = (f: RpForm) =>
  f.items.filter(it => {
    const b = balanceOf(it);
    return b.qty > EPS || Math.abs(b.weight) > EPS;
  });

/** carton numbers used by other items of the voucher */
export const cartonsInOtherItems = (items: RpItem[], exceptKey: string) => {
  const s = new Set<string>();
  items.forEach(it => { if (it.key !== exceptKey) it.cartons.forEach(c => s.add(c.cartNo.trim().toUpperCase())); });
  return s;
};

/* ------------------------------------------------------------------ */
/* server rows → model                                                 */
/* ------------------------------------------------------------------ */

export function issueSummaryFrom(row: Row): IssueSummary {
  const r = lower(row);
  return {
    uid: Number(r.uid) || 0,
    vouNo: str(r.vouno),
    date: toDMY(r.pdate),
    remark: str(r.remark),
    dptCode: str(r.dptcode),
    stkType: str(r.stktype),
    items: Number(r.items) || 0,
    cartons: Number(r.cartons) || 0,
    totPcs: toNum(r.totpcs),
    totQty: toNum(r.totqty),
    totWt: toNum(r.totwt),
    itmName: str(r.itmname),
    merName: str(r.mername),
  };
}

export function issueDetailFrom(body: { main: Row; d1: Row[]; d2: Row[] }): IssueDetail {
  const m = lower(body.main);
  const d2 = (body.d2 ?? []).map(lower);
  const items: IssueItem[] = (body.d1 ?? []).map(lower).map(r => {
    const srNo = Number(r.srno) || 0;
    const totQty = toNum(r.totqty);
    // AmtCalc of the issue item: saved Qty = meters total (MTR) or weight total (KGS)
    const own = d2.filter(c => Number(c.srno) === srNo);
    const sumQty = own.reduce((a, c) => a + toNum(c.qty), 0);
    const sumWt = own.reduce((a, c) => a + toNum(c.wt), 0);
    const calcOn: CalcOn = calc(r.amtcalc, Math.abs(totQty - sumQty) < EPS ? 'MTR' : Math.abs(totQty - sumWt) < EPS ? 'KGS' : 'MTR');
    return {
      srNo,
      item: opt(r.itmcode, r.itmname),
      merge: opt(r.mercode, r.mername),
      grade: opt(r.grdcode, r.grdname),
      shade: opt(r.shdcode, r.shdname),
      denier: str(r.denier),
      totPcs: toNum(r.totpcs),
      totQty,
      totWt: toNum(r.totwt),
      calcOn,
    };
  });
  const calcOf = (srNo: number) => items.find(i => i.srNo === srNo)?.calcOn ?? 'MTR';
  const cartons: IssueCarton[] = d2.map(r => ({
    srNo: Number(r.srno) || 0,
    subSr: Number(r.subsr) || 0,
    cartNo: str(r.cartno),
    qty: toNum(r.qty),
    wt: toNum(r.wt),
    chees: toNum(r.chees),
    calcOn: calc(r.amtcalc, calcOf(Number(r.srno) || 0)),
  }));
  return {
    summary: {
      ...issueSummaryFrom(m),
      items: items.length,
      cartons: cartons.length,
      totPcs: items.reduce((a, i) => a + i.totPcs, 0),
      totQty: items.reduce((a, i) => a + i.totQty, 0),
      totWt: items.reduce((a, i) => a + i.totWt, 0),
      itmName: items[0]?.item?.name ?? '',
      merName: items[0]?.merge?.name ?? '',
    },
    items,
    cartons,
  };
}

export const defaultsFrom = (d: Row | undefined): RepackDefaults => {
  const r = lower(d);
  return { packType: str(r.packtype), prodType: str(r.prodtype), chkCode: str(r.chkcode), carCode: str(r.carcode) };
};

/** show_data { header, main[], d1[], issue{main,d1,d2} } → form. Knit POYProdD1: NetWt = meters, CarWt = weight */
export function formFromShow(body: Row, m: RepackMasters | null): RpForm {
  const h = lower(body.header);
  const issue = issueDetailFrom(lower(body.issue) as any);
  const auto = Number(h.autoentry) === 1;
  const rows: Row[] = (body.main ?? []).map(lower);
  const d1: Row[] = (body.d1 ?? []).map(lower);

  const t = issueTotals(issue);
  const items: RpItem[] = rows.slice(0, 1).map((r): RpItem => {
    const ii = issue.items[0];
    const own = d1.sort((a, b) => Number(a.srno) - Number(b.srno));
    const cartons = own.map((c, j): RpCarton => {
      const src = auto ? issue.cartons[j] : undefined;
      const weight = toNum(c.carwt);
      const gross = toNum(c.grosswt);
      const tare = c.tarewt !== undefined && c.tarewt !== null ? toNum(c.tarewt) : r3(gross - weight);
      return {
        key: newKey('c'),
        cartNo: str(c.cartno),
        piece: str(c.cartype) || str(c.pkggrd) || 'A',
        operator: str(c.oprcode) ? pickOpt(m?.checkers ?? [], str(c.oprcode)) : null,
        shift: Number(c.shfcode) > 0 ? String(Number(c.shfcode)) : '',
        calcOn: calc(c.amtcalc, ii?.calcOn ?? 'MTR'),
        meters: String(toNum(c.netwt)),
        grossWt: String(gross),
        tareWt: String(tare),
        weight: String(weight),
        used: Number(c.used) === 1,
        ...(src ? { origCartNo: src.cartNo, issSrNo: src.srNo, issSubSr: src.subSr } : {}),
      };
    });
    const chk = str(own[0]?.chkcode);
    return {
      key: newKey('i'),
      srNo: 1,
      issSrNo: ii?.srNo,
      issQty: t.qty,
      issWt: t.wt,
      calcOn: ii?.calcOn ?? 'MTR',
      item: opt(r.itmcode, r.itmname),
      merge: opt(r.mercode, r.mername),
      grade: opt(r.grdcode, r.grdname),
      shade: opt(r.shdcode, r.shdname),
      denier: str(r.denier),
      prodType: r.prodtype && str(r.prodtype) !== '*' ? pickOpt(m?.prodTypes ?? [], str(r.prodtype)) : null,
      packType: str(r.packtype) || 'NEX',
      checker: chk ? pickOpt(m?.checkers ?? [], chk) : null,
      cartons,
    };
  });

  const p = lower(h.party);
  return {
    header: {
      vouDate: toDMY(h.pdate),
      vouPrefix: str(h.month),
      vouNo: str(h.vouno),
      vouSuffix: str(h.suffix),
      remark: str(h.remark),
      party: h.party ? opt(p.code, p.name) : null,
      department: str(h.dptcode) ? { code: str(h.dptcode), name: str(h.dptcode) } : null,
      auto,
    },
    issue,
    items,
    meta: { uid: Number(rows[0]?.uid) || Number(h.issuid) || 0, used: Number(h.used) || 0 },
  };
}

/* ------------------------------------------------------------------ */
/* form → payload                                                      */
/* ------------------------------------------------------------------ */

export function buildPayload(ctx: RepackContext, f: RpForm, txntype: string): Row {
  return {
    prpcode: ctx.prpCode,
    yearno: ctx.yearNo,
    strcode: ctx.strCode,
    txntype,
    uid: f.meta?.uid ?? 0,
    issuid: f.issue?.summary.uid ?? 0,
    pdate: f.header.vouDate,
    remark: f.header.remark.trim(),
    parcode: f.header.party?.code ?? '',
    dptcode: f.header.department?.code ?? '',
    autoentry: f.header.auto ? 1 : 0,
    items: f.items.map((it, i) => ({
      srno: i + 1,
      issrno: it.issSrNo ?? 0,
      itmcode: it.item?.code ?? '',
      mercode: it.merge?.code ?? '',
      grdcode: it.grade?.code ?? '',
      shdcode: it.shade?.code ?? '',
      denier: it.denier.trim(),
      prodtype: it.prodType?.code ?? '',
      packtype: it.packType,
      chkcode: it.checker?.code ?? '',
      cartons: it.cartons.map(c => {
        const k = calcCarton(c);
        return {
          cartno: c.cartNo.trim().toUpperCase(),
          piece: c.piece,
          calcon: c.calcOn,
          meters: k.meters,
          grosswt: k.gross,
          tarewt: k.tare,
          weight: k.weight,
          oprcode: c.operator?.code ?? '',
          shfcode: Number(c.shift) || 0,
          issrno: c.issSrNo ?? 0,
          issubsr: c.issSubSr ?? 0,
        };
      }),
    })),
  };
}
