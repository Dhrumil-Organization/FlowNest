// FILE: src/features/repackingIssue/repoMapping.ts
// Pure mapping between KnitPrdRepackIssueRepository rows and the form.
//
// Server rules this follows (KnitPrdRepackIssueRepository):
//  - add_data / modify_data copy EVERY POYProd / POYProdRD1 / POYProdRD2 column from the payload
//    ($obj->{$key} = $payload[$key]) → a missing key is a PHP "Undefined index" error.
//    So rows are always built on top of a template row (show_data uid=0) or the loaded row (edit).
//  - nested d1 / d2 rows are NOT lower-cased by the server → keys must be lowercase here.
//  - show_data returns pdate as dd-mm-yyyy and vouno split into month / vouno / suffix.
import { newKey, toNum } from './logic';
import {
  CartonRow, LookupOption, RepackContext, RepackForm, RepackItem, RepackListRow, StockType
} from './types';

export type Row = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Column names that are not certain in POYProd / POYProdRD1 / RD2.     */
/* The first name that exists in the template row is used.            */
/* TODO(viral): trim to the real column once confirmed.                */
/* ------------------------------------------------------------------ */
export const COLS = {
  // POYProd.StkType varchar(3), POYProd.DptCode varchar(3) (sp_help POYProd)
  stockType: ['stktype'],
  department: ['dptcode'],
  denier: ['denier', 'den'],
  // POYProdRD1: totpcs / totqty / totwt (item Pieces / Qty / Wt)
  pieces: ['totpcs', 'pcs', 'qtypcs', 'nopcs', 'pieces'],
  itemQty: ['totqty', 'qty'],
  itemWt: ['totwt', 'wt'],
  uom: ['amtcalc', 'uom'],
  cartNo: ['cartno', 'cartonno', 'cartnno', 'barcode'],
} as const;

/** Stock Type as stored in POYProd.StkType: I = In House, P = Process House (confirmed) */
export const STOCK_TYPE_DB: Record<StockType, string> = { IN_HOUSE: 'I', PROCESS_HOUSE: 'P' };

const lower = (r: Row | null | undefined): Row => {
  const o: Row = {};
  Object.keys(r ?? {}).forEach(k => { o[k.toLowerCase()] = (r as Row)[k]; });
  return o;
};

const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

/** first candidate column that exists in the row */
export const colOf = (row: Row, names: readonly string[]) => names.find(n => n in row);

const read = (row: Row, names: readonly string[]) => {
  const k = colOf(row, names);
  return k ? str(row[k]) : '';
};

/** sets the first candidate column present in the template; if none exists, the first name (extra keys are ignored by the server) */
const write = (row: Row, names: readonly string[], value: any) => {
  row[colOf(row, names) ?? names[0]] = value;
};

const opt = (code: any, name: any): LookupOption | null => {
  const c = str(code);
  if (!c || c === '0') return null;
  return { code: c, name: str(name) || c };
};

/** dd-mm-yyyy from 'dd-mm-yyyy' | 'dd/mm/yyyy' | yyyymmdd */
export const toDMY = (v: any): string => {
  const s = str(v);
  if (/^\d{8}$/.test(s)) return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[3]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return s;
};

const stockTypeFrom = (v: string): StockType | null => {
  const s = v.toUpperCase();
  if (!s) return null;
  if (s === STOCK_TYPE_DB.IN_HOUSE || s === 'IN_HOUSE' || s === '1' || s.startsWith('IN')) return 'IN_HOUSE';
  if (s === STOCK_TYPE_DB.PROCESS_HOUSE || s === 'PROCESS_HOUSE' || s === '2' || s.startsWith('PRO')) return 'PROCESS_HOUSE';
  return null;
};

/* ------------------------------------------------------------------ */
/* browse_data (txntype prod_repacking_issue): one row per item → group */
/* ------------------------------------------------------------------ */
export function listFromBrowse(rows: Row[]): RepackListRow[] {
  const byUid = new Map<number, RepackListRow>();
  rows.map(lower).forEach(r => {
    const uid = Number(r.uid) || 0;
    if (!uid) return;
    let e = byUid.get(uid);
    if (!e) {
      const date = toDMY(r.pdate);
      const n = str(r.npdate);
      e = {
        uid,
        vouNo: str(r.vouno),
        date,
        dateKey: /^\d{8}$/.test(n) ? Number(n) : Number(date.split('-').reverse().join('')) || 0,
        items: [],
        remark: str(r.remark),
        isRepack: Number(r.isrepack) || 0,
      };
      byUid.set(uid, e);
    }
    const name = str(r.itmname) || (str(r.itmcode) !== '0' ? str(r.itmcode) : '');
    if (name) e.items.push({ name, merge: str(r.mername) });
  });
  return [...byUid.values()].sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
}

/* ------------------------------------------------------------------ */
/* show_data { main:[..], d1:[..], d2:[..] } → form                     */
/* ------------------------------------------------------------------ */
export function formFromShow(body: { main: Row[]; d1: Row[]; d2: Row[] }): RepackForm {
  const m = lower(body.main?.[0]);
  const d1 = (body.d1 ?? []).map(lower).filter(r => Number(r.srno) > 0);
  const d2 = (body.d2 ?? []).map(lower).filter(r => Number(r.srno) > 0);

  const items: RepackItem[] = d1
    .sort((a, b) => Number(a.srno) - Number(b.srno))
    .map((r, i) => {
      const cartons: CartonRow[] = d2
        .filter(c => Number(c.srno) === Number(r.srno))
        .sort((a, b) => Number(a.subsr ?? 0) - Number(b.subsr ?? 0))
        .map(c => ({
          key: newKey('c'),
          cartNo: read(c, COLS.cartNo),
          mtr: str(c.qty),
          wt: str(c.wt),
          source: { puid: Number(c.puid) || 0, psrno: Number(c.psrno) || 0, psubsr: Number(c.psubsr) || 0, trantype: Number(c.trantype) || 0 },
          raw: c,
        }));
      // saved cartons don't carry AmtCalc: work it out from the saved item Qty (totqty)
      // = sum of qty (MTR) or sum of wt (KGS)
      const totQty = toNum(read(r, COLS.itemQty));
      const sumQty = cartons.reduce((a, c) => a + toNum(c.mtr), 0);
      const sumWt = cartons.reduce((a, c) => a + toNum(c.wt), 0);
      const amt = Math.abs(totQty - sumQty) < 0.001 ? 'MTR' : Math.abs(totQty - sumWt) < 0.001 ? 'KGS' : '';
      if (amt) cartons.forEach(c => { c.source = { ...c.source!, amtCalc: amt }; });
      return {
        key: newKey('i'),
        srNo: i + 1,
        item: opt(r.itmcode, r.itmname),
        merge: opt(r.mercode, r.mername),
        grade: opt(r.grdcode, r.grdname),
        shade: opt(r.shdcode, r.shdname),
        denier: read(r, COLS.denier),
        uom: read(r, COLS.uom),
        pieces: read(r, COLS.pieces) || String(cartons.length || ''),
        qty: read(r, COLS.itemQty),
        wt: read(r, COLS.itemWt),
        cartons,
        raw: r,
      };
    });

  const dpt = read(m, COLS.department);
  return {
    header: {
      vouDate: toDMY(m.pdate),
      vouPrefix: str(m.month),
      vouNo: str(m.vouno),
      vouSuffix: str(m.suffix),
      remarks: str(m.remark),
      stockType: stockTypeFrom(read(m, COLS.stockType)),
      department: dpt && dpt !== '0' ? { code: dpt, name: dpt } : null,
      remark1: '',
      remark2: '',
      remark3: '',
    },
    items,
    meta: { uid: Number(m.uid) || 0, isRepack: Number(m.isrepack) || 0, rawMain: m },
  };
}

/* ------------------------------------------------------------------ */
/* form → add_data / modify_data payload                                */
/* ------------------------------------------------------------------ */
export interface RepoTemplate {
  main: Row;
  d1: Row;
  d2: Row;
}

export class MissingCartonSourceError extends Error {}

/**
 * @param tpl   show_data uid=0 template rows (all columns, null values) — main.uid is the new UId for add
 * @param form  edited form; form.meta (from show_data uid) → modify
 */
export function buildRepoPayload(tpl: RepoTemplate, ctx: RepackContext, form: RepackForm, txntype: string): Row {
  const editing = !!form.meta?.uid;
  const h = form.header;
  const blank = (r: Row) => Object.fromEntries(Object.keys(r).map(k => [k, null]));

  const main: Row = { ...lower(tpl.main), ...(editing ? form.meta!.rawMain : {}) };
  const uid = editing ? form.meta!.uid : Number(main.uid) || 0;
  if (!uid) throw new Error('New UId not returned by the server (show_data).');

  Object.assign(main, {
    uid,
    prpcode: ctx.prpCode,
    yearno: ctx.yearNo,
    strcode: ctx.strCode,
    pdate: h.vouDate,
    month: editing ? h.vouPrefix : '',
    vouno: h.vouNo,
    suffix: editing ? h.vouSuffix : '',
    remark: h.remarks.trim(),
    enttype: 'R',
    isrepack: form.meta?.isRepack ?? 0,
    txntype,
  });
  // own MAX series: server re-checks and re-assigns the number when it is taken (add only)
  if (!editing) main.vouseries = 'max';
  write(main, COLS.stockType, h.stockType ? STOCK_TYPE_DB[h.stockType] : null);
  write(main, COLS.department, h.department?.code ?? null);

  const d1Tpl = blank(lower(tpl.d1));
  const d2Tpl = blank(lower(tpl.d2));
  const missing: string[] = [];

  const d1 = form.items.map((it, i) => {
    const r: Row = { ...d1Tpl, ...(it.raw ?? {}) };
    Object.assign(r, {
      uid,
      srno: i + 1,
      strcode: it.raw?.strcode ?? ctx.strCode,
      itmcode: it.item?.code ?? '',
      mercode: it.merge?.code ?? '',
      grdcode: it.grade?.code ?? '',
      shdcode: it.shade?.code ?? '',
    });
    write(r, COLS.itemQty, +toNum(it.qty).toFixed(3));
    write(r, COLS.itemWt, +toNum(it.wt).toFixed(3));
    if ('prpcode' in r) r.prpcode = ctx.prpCode;
    write(r, COLS.denier, it.denier.trim());
    write(r, COLS.pieces, toNum(it.pieces));
    if (colOf(r, ['amtcalc'])) r.amtcalc = it.uom;
    // display-only columns from the show_data join
    ['itmname', 'mername', 'grdname', 'shdname', 'uom'].forEach(k => { if (!(k in d1Tpl)) delete r[k]; });
    return r;
  });

  const d2 = form.items.flatMap((it, i) =>
    it.cartons.map((c, j) => {
      if (!c.source || (!c.source.puid && !c.source.trantype)) missing.push(c.cartNo);
      const r: Row = { ...d2Tpl, ...(c.raw ?? {}) };
      Object.assign(r, {
        uid,
        srno: i + 1,
        qty: +toNum(c.mtr).toFixed(3),
        wt: +toNum(c.wt).toFixed(3),
        puid: c.source?.puid ?? 0,
        psrno: c.source?.psrno ?? 0,
        psubsr: c.source?.psubsr ?? 0,
        trantype: c.source?.trantype ?? 0,
      });
      if ('subsr' in r) r.subsr = j + 1;
      r.chees = 0; // POYProdRD2.Chees is NOT NULL; Repacking Issue has no chees
      if ('prpcode' in r) r.prpcode = ctx.prpCode;
      write(r, COLS.cartNo, c.cartNo.trim());
      return r;
    })
  );

  if (missing.length) {
    throw new MissingCartonSourceError(
      `Stock reference not found for carton(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}.\n` +
      'Scan or re-enter the carton so it is checked against stock.'
    );
  }
  return { ...main, d1, d2 };
}
