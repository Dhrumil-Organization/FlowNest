// FILE: src/components/SalesChallanPackingSlipNEW/rules.ts
// Pure rules of the packing slip — no React, no HTTP. Ported 1:1 from the web
// (SalesChallanPackingSlip.js, PendingOrderSelect.js, CartonDetail.js, AllPartyDataSCPS.js).
//
// Fixes vs the web (do NOT reintroduce):
//   • Balance cartons after removing a carton = TotCarton − scanned (web set it to the scanned count).
//   • A QR string that is not valid JSON no longer crashes the scanner (web JSON.parse threw).
//   • Assign qty is checked when the field is left, and the old value comes back with the
//     reason shown under the field (web: sweetalert + silent revert).
import type { Row } from './api';

/* ------------------------------ helpers ------------------------------ */

export const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
export const blank = (v: any) => str(v) === '';
export const pick = (row: Row | null | undefined, ...keys: string[]) => {
  for (const k of keys) {
    const v = str(row?.[k]);
    if (v) return v;
  }
  return '';
};
export const n3 = (v: any) => {
  const x = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(x) ? parseFloat(x.toFixed(3)) : 0;
};
export const qty = (v: any) =>
  n3(v).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const sum = (rows: Row[] | undefined, key: string) => (rows || []).reduce((s, r) => s + n3(r?.[key]), 0);
/** utils/comman getmaxsrno */
export const maxSr = (rows: Row[] | undefined, key: string) =>
  (rows || []).reduce((m, r) => Math.max(m, parseInt(r?.[key], 10) || 0), 0);
export const splitTypes = (v: any): string[] => {
  const list = Array.isArray(v) ? v : String(v ?? '').split(',');
  return Array.from(new Set(list.map((s) => String(s).trim()).filter(Boolean)));
};

/* ------------------------------ date ------------------------------ */

export const today = () => {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};
/** "22102026" → "22-10-2026" while typing (web react-input-mask 99-99-9999). */
export const maskDate = (t: string) => {
  const d = (t || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};
export const isDate = (s: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
  if (!m) return false;
  const dt = new Date(+m[3], +m[2] - 1, +m[1]);
  return dt.getFullYear() === +m[3] && dt.getMonth() === +m[2] - 1 && dt.getDate() === +m[1];
};

/* ------------------------------ party (AllPartyDataSCPS) ------------------------------ */

/** A row of the party help list (accountbasic) as the picker shows it. */
export const partyRowView = (r: Row) => ({
  code: pick(r, 'acccode'),
  name: pick(r, 'accountname', 'accname'),
  city: pick(r, 'City'),
  gstin: pick(r, 'GSTIN'),
  mh: pick(r, 'MHName'),
  sh: pick(r, 'SHName'),
  address: pick(r, 'Address'),
});

/** Index the master once and remove duplicate rows caused by accountbasic joins.
 * FAMAcc.AccCode uniquely identifies a party within the active property.
 */
export type PartySearchEntry = { row: Row; terms: string };
export const indexPartyRows = (rows: Row[]): PartySearchEntry[] => {
  const seen = new Set<string>();
  const result: PartySearchEntry[] = [];
  for (const r of rows) {
    const code = pick(r, 'acccode', 'AccCode', 'ParCode');
    const name = pick(r, 'accountname', 'accname', 'AccName', 'ParName');
    const gstin = pick(r, 'GSTIN', 'gstin');
    const key = code ? `code:${code.toLocaleLowerCase()}` : `name:${name.toLocaleLowerCase()}:${gstin.toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Avoid common ledger head / address matches which produce irrelevant results.
    // These fields remain visible in each row but do not influence matching.
    result.push({
      row: r,
      terms: [name, code, pick(r, 'City', 'city', 'DCity'), gstin]
        .join(' ').toLocaleLowerCase(),
    });
  }
  return result;
};

/** Every search word must be present in this party's own name/code/city/GSTIN. */
export const filterPartyRows = (entries: PartySearchEntry[], query: string): PartySearchEntry[] => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return entries;
  return entries.filter((e) => terms.every((word) => e.terms.includes(word)));
};

/** Every form field AllPartyDataSCPS clears (clearBoxDueDay). */
export const PARTY_CLEAR: Row = {
  ParCode: '', ParName: '', PrintParty: '', PrintPartyName: '', BADDRESS: '', BAccCode: '', BAccName: '',
  city: '', state: '', State: '', cnty: '', DueDay: '', DueDate: '', DAdd: '', PrintAdd: '', DCity: '',
  DState: '', DCnty: '', DZip: '', DlvAcc: '', DelParName: '', GSTIN: '', AddSrNo: '', QtyKgs: '',
  partystate: '', GrpCode: '', address: '', TanNo: '', PanNo: '', acchist: '', sexe: '',
};

/**
 * AllPartyDataSCPS.fetchPartyDetail, branch hasDueDay = 1 (what this screen passes):
 * the form fields filled from the accountget row.
 */
export function partyFields(r: Row): Row {
  const addr = [r.Address, r.City, r.State, r.Cnty, r.Zip].map((x) => x ?? '').join(', ');
  return {
    ParCode: r.acccode,
    ParName: r.accname,
    BADDRESS: addr,
    BAccCode: str(r.brkAcc),
    BAccName: str(r.brkname),
    city: r.City, state: r.State, State: r.State, cnty: r.Cnty,
    DAdd: r.Address, DCity: r.City, DState: r.State, DCnty: r.Cnty, DZip: r.Zip, zip: r.Zip,
    DueDay: r.crday,
    AddSrNo: r.SrNo,
    QtyKgs: r.SrNo,
    GSTIN: r.GSTIN,
    DlvAcc: r.acccode,
    DelParName: r.accname,
    partystate: r.State,
    GrpCode: r.GrpCode,
    address: addr,
    PanNo: r.PanNo,
    TanNo: '',
    sexe: blank(r.sexe) ? '' : r.sexe,
    PrintParty: '',
    PrintPartyName: '',
    PrintAdd: '',
  };
}

/** Web: after the party, pending orders open for these property types (store ≠ '0'). */
export const opensPendingOrders = (prpType: string, strcode: string) =>
  strcode !== '0' && ['R', 'U', 'I', 'T', 'S', 'K'].includes(prpType);

/* ------------------------------ pending order → d1 ------------------------------ */

export const pendingKey = (d: Row) => `${d.UID}|${d.SRNO}|${d.ITMCODE}`;
export const d1Key = (r: Row) => `${r.SOUId}|${r.SOSrNo}|${r.ItmCode}`;

/** PendingOrderSelect.handleSelectAllData — one d1 row per chosen pending order line. */
export function orderToD1(d: Row, srNo: number, uid: any, withPrintParty: boolean): Row {
  const pkgrate = d.AMTCALC === 'P' && d.PKGRATE > 0 && d.PKGRATE < 0 ? d.PKGRATE : d.UNITRATE;
  const row: Row = {
    Amount: '0.00', AmtCalc: d.AMTCALC, BPkgQty: '0', BQty: d.BQTY, BQtyKgs: d.BQtyKgs, BQtyPcs: '0',
    BAccCode: d.BACCCODE, BAccName: d.BACCNAME, CGSTAmt: null, CGSTPer: null, D1NetAmt: null,
    Denier: d.DENIER, DisAmt: d.DISAMT, DisPer: d.DISPER, DsnCode: d.DSNCODE, DsnName: d.DSNNAME,
    EAccCode: null, EAccName: null, ExAmount: null, ExRate: null, FIFOAmt: null, FIFORate: null,
    GSTGrpCode: d.GSTGRPCODE, GrdCode: d.GRDCODE, GrdName: d.GRDNAME, HsnName: d.HSNNAME, HsnCode: d.HSNNAME,
    IGSTAmt: null, IGSTPer: null, ItmCode: d.ITMCODE, ItmName: d.ITMNAME, MItmCode: d.MITMCODE,
    MakeName: null, MerCode: d.MERCODE, MerName: d.MERNAME, Model: null, PayRate: pkgrate, PkgAmt: null,
    PkgQty: null, PkgRate: d.PKGRATE, QltCode: null, QltName: null, Qty: '0', QtyKgs: '0', QtyPcs: '0',
    RPkgQty: '0', RQty: '0', RQtyPcs: '0',
    Remark1: d.REMARK1, Remark2: d.REMARK2, Remark3: d.REMARK3, Remark4: d.REMARK4, Remark5: d.REMARK5,
    SClose: null, SGSTAmt: null, SGSTPer: null, SOBQty: d.BQTY, SOBQtyKgs: d.BQtyKgs, SOFlag: 'N',
    SOIsDyeing: d.ISDYEING, SOItmCode: d.ITMCODE, SOPkgQty: d.PKGQTY, SOQty: d.QTY, SOQtyPcs: d.QTYPCS,
    SOSPkgQty: d.SPKGQTY, SOSQty: d.SQTY, SOSQtyPcs: d.SQTYPCS, SOSrNo: d.SRNO, SOStatus: d.STATUS,
    SOStrCode: null, SOUId: d.UID, SOWt: null, SONo: d.SONO, SPending: '0', ShdCode: d.SHDCODE,
    ShdName: d.SHDNAME, SQty: d.SQTY, SrNo: srNo, Status: null, StrCode: d.STRCODE, TotChees: null,
    UId: uid, UOM: d.UOM, UnitRate: d.UNITRATE, BADDRESS: d.SO_ADDRESS, DAdd: d.SO_DADDRESS,
    DCity: d.SO_DCITY, DCnty: d.SO_DCNTY, DState: d.SO_DSTATE, DZip: d.SO_DZIP, URowId: d.UROWID,
    IsDlvStatus: d.ISDLV, DueDay: d.DueDay, DueDate: d.DueDate,
  };
  // PendingOrderSelect copies the print party; PendingOrderSingleSelect (assign right) does not.
  if (withPrintParty) Object.assign(row, { PrintPartyName: d.PrintPartyName, PrintParty: d.PrintParty, PrintAdd: d.PrintAdd });
  return row;
}

/* ------------------------------ assign qty · save ------------------------------ */

/** onEditD2Complete. Empty = not assigned (allowed). Returns the reason or ''. */
export function assignQtyIssue(row: Row, value: string): string {
  if (blank(value)) return '';
  if (!/^\d*(?:[.,]\d*)?$/.test(value)) return 'Enter a number.';
  const v = n3(value);
  if (v === 0) return ''; // 0 = not assigned (get_pack_current_stock sends AssQty 0 for every lot)
  if (v < 0) return 'Cannot be negative.';
  if (v > n3(row.BQty)) return `More than balance qty ${qty(row.BQty)}.`;
  if (v > n3(row.StkQty)) return `More than stock ${qty(row.StkQty)}.`;
  return '';
}
export const maxAssign = (row: Row) => Math.min(n3(row.BQty), n3(row.StkQty));
export const canAssign = (row: Row, mode: string) => mode === 'add' || String(row.D1Flag) === '0';

/** handleSaveClick / handleSaveCartons — same checks, same order. */
export function saveIssue(f: Row, stock: Row[]): string {
  if (!stock.some((r) => !blank(r.SrNo))) return 'Serial number needs to be set in each order line.';
  const over = groupStock(stock).find((g) => groupIssue(g));
  if (over) return `SO ${over.head.SONo} · ${over.head.ItmName}: ${groupIssue(over)}`;
  if (blank(f.ChalNo)) return 'Please add packing number.';
  if (blank(f.ParCode) || n3(f.ParCode) === 0) return 'Please choose the party.';
  if (!stock.some((r) => n3(r.AssQty) > 0)) return 'Assign qty in at least one line.';
  return '';
}

/* ------------------------------ cartons (CartonDetail) ------------------------------ */

export const normQr = (v: any) => (v ? String(v).replace(/(^,)|(,$)/g, '') : '');
const cleanQr = (v: any) => (v ? String(v).trim().replace(/\r?\n|\r/g, '') : '');
const dec3 = (s: string, sep: string) => s.split(sep).map((v) => (v === '' || isNaN(v as any) ? v : Number(v).toFixed(3))).join(sep);

export type ScanResult = { status: 'added' | 'duplicate' | 'notfound' | 'locked' | 'mismatch' | 'overqty'; carton?: Row; source?: Row; message: string };

/** One stock carton (getcartondetail row) as the list shows it. */
export const cartonView = (r: Row) => ({
  no: str(r.cartno),
  qty: n3(r.qty),
  chees: str(r.chees),
  location: str(r.WarehouseLoction ?? r.WarehouseLocation ?? r.Location),
  prodType: str(r.ProdType),
  grade: str(r.GrdName),
  tran: str(r.TranName),
  lot: str(r.LotNo),
  locked: String(r.lock ?? '0').trim() === '1',
  lockReason: str(r.lockreason),
});

/**
 * fetchQrScanData. Two label formats:
 *   "{a,b,…}" → carton no. at index 15, compared with qrcodestring1 (last 4 parts ignored)
 *   "a~b~…"   → carton no. at index 6,  compared with qrcodestring  (last 4 parts ignored)
 */
export function matchCarton(raw: string, p: { list: Row[]; scanned: Row[]; others: Row[]; srNo: any; uid: any; limit?: number }): ScanResult {
  const code = normQr(raw);
  if (!code) return { status: 'notfound', message: 'Empty scan.' };
  const dup = (cartNo: any) =>
    p.scanned.find((c) => String(c.CartNo) === String(cartNo)) || p.others.find((c) => String(c.CartNo) === String(cartNo));
  let found: Row | undefined;

  if (code.includes('{') && code.includes('}')) {
    let parts: any[];
    try { parts = JSON.parse(code.replace('{', '[').replace('}', ']')); } catch { parts = code.replace(/[{}]/g, '').split(','); }
    const d = dup(parts[15]);
    if (d) return { status: 'duplicate', message: `Carton ${parts[15]} is already on Sr ${d.SrNo} / Sub ${d.SubSr}.` };
    const target = cleanQr(dec3(code, ','));
    found = p.list.find((el) => el.qrcodestring1 && cleanQr(dec3('{' + String(el.qrcodestring1).split(',').slice(0, -4).join(',') + '}', ',')) === target);
  }
  if (!found && code.split('~').length - 1 > 5) {
    const parts = code.split('~');
    const d = dup(parts[6]);
    if (d) return { status: 'duplicate', message: `Carton ${parts[6]} is already on Sr ${d.SrNo} / Sub ${d.SubSr}.` };
    const target = cleanQr(dec3(code, '~'));
    found = p.list.find((el) => el.qrcodestring && cleanQr(dec3(String(el.qrcodestring).split('~').slice(0, -4).join('~'), '~')) === target);
  }
  if (!found) return { status: 'notfound', message: 'This label is not in stock for this item, merge, grade and shade.' };
  return pickCarton(found, p);
}

/**
 * The checks after a stock carton is identified — shared by a scan and a manual pick from the list:
 * locked (lock = 1) → refused; already on this or another line → duplicate; else the D2 carton row.
 */
export function pickCarton(found: Row, p: { scanned: Row[]; others: Row[]; srNo: any; uid: any; limit?: number }): ScanResult {
  const d = p.scanned.find((c) => String(c.CartNo) === String(found.cartno)) || p.others.find((c) => String(c.CartNo) === String(found.cartno));
  if (d) return { status: 'duplicate', source: found, message: `Carton ${found.cartno} is already on Sr ${d.SrNo} / Sub ${d.SubSr}.` };
  if (String(found.lock ?? '0').trim() === '1') {
    return { status: 'locked', source: found, message: `Carton ${found.cartno} is locked${found.lockreason ? `: ${found.lockreason}` : ''}.` };
  }
  // Qty limit (web CartonSelect finalTotal): selected qty of this line + this carton must stay within
  // balance qty + extra qty % (getsetchallan extraqtyper) of the order qty.
  if (p.limit !== undefined) {
    const next = n3(sum(p.scanned, 'QtyWt') + n3(found.qty));
    if (next > n3(p.limit)) {
      return { status: 'overqty', source: found, message: `Selected Qty ${qty(next)} cannot be more than Ordered Qty (${qty(p.limit)}). Carton ${found.cartno} (${qty(found.qty)}) not added.` };
    }
  }
  const carton: Row = {
    Amount: null, BalMtr: null, CartNo: found.cartno, Chees: found.chees, DispNo: null, DispSubSr: null,
    EntType: found.TranType, LotNo: found.LotNo, OrgBalMtr: found.qty, ParcelNo: null, ProdType: found.ProdType,
    ProSrNo: found.ZSrNo, ProSubSr: found.ZSubSr, ProUId: found.ZUId, QtyWt: found.qty, Rate: '0', SalRet: '0',
    SpColor: found.SpColor, SpName: '', SRetMtr: '0', SrNo: p.srNo, Status: null, SubSr: maxSr(p.scanned, 'SubSr') + 1,
    TakaBalMtr: found.qty, TakaMtr: found.qty, UId: p.uid, Wt: found.qty,
  };
  return { status: 'added', carton, source: found, message: `${carton.CartNo} · ${qty(carton.QtyWt)}${cartonView(found).location ? ` · ${cartonView(found).location}` : ''}` };
}

/** handleItemOk — total ≤ balance qty and no carton twice (ProSrNo|ProSubSr|ProUId|CartNo|EntType). */
export function cartonsIssue(row: Row, scanned: Row[], others: Row[], limit?: number): string {
  const total = sum(scanned, 'QtyWt');
  const max = limit === undefined ? n3(row.BQty) : n3(limit);
  if (n3(total) > max) return `Scanned ${qty(total)} is more than ${limit === undefined ? 'balance' : 'allowed'} qty ${qty(max)}. Remove a carton.`;
  const seen = new Set<string>();
  for (const c of [...others, ...scanned]) {
    const k = `${c.ProSrNo}|${c.ProSubSr}|${c.ProUId}|${c.CartNo}|${c.EntType}`;
    if (seen.has(k)) return `Carton ${c.CartNo} (Sr ${c.SrNo} / Sub ${c.SubSr}) is there twice.`;
    seen.add(k);
  }
  return '';
}

/** Order qty (SOQty) of the order line a stock / carton row belongs to — web `SelectedRowSoQty` (d1 row's SOQty). */
export const orderQtyOf = (row: Row | null | undefined, d1: Row[] | undefined): number => {
  if (!row) return 0;
  const hit = (d1 || []).find((r) => d1Key(r) === d1Key(row));
  return n3(hit?.SOQty ?? row.SOQty);
};

/**
 * Most qty that may be selected as cartons for one line (web ItemDetail totalSoQtyToSale):
 *   balance qty (BQty) + order qty (SOQty) × extraqtyper / 100      — extraqtyper from getsetchallan.
 */
export const cartonLimit = (row: Row, orderQty: number, extraPer: number): number =>
  n3(n3(row.BQty) + (n3(orderQty) * n3(extraPer)) / 100);

export const cartonsOf = (d2: Row[] | undefined, srNo: any) =>
  (d2 || []).filter((c) => parseInt(c.SrNo, 10) === parseInt(srNo, 10));

/* ------------------------------ allocation by order line ------------------------------ */

/**
 * get_pack_current_stock returns one row per stock lot (merge) for each order line, and every
 * row repeats the order line's balance (BQty). Grouped back per order line, the screen can show
 * "balance → assigned → left" once, with that line's lots under it.
 */
export type LotRef = { row: Row; index: number };
export type OrderGroup = {
  key: string; head: Row; lots: LotRef[];
  balance: number; stock: number; assigned: number; left: number; used: number;
};

export const groupKey = (r: Row) =>
  [str(r.SOUId) || str(r.SONo), str(r.SOSrNo), str(r.ItmCode), str(r.GrdCode), str(r.ShdCode)].join('|');

export function groupStock(stock: Row[]): OrderGroup[] {
  const map = new Map<string, OrderGroup>();
  stock.forEach((row, index) => {
    const k = groupKey(row);
    let g = map.get(k);
    if (!g) { g = { key: k, head: row, lots: [], balance: n3(row.BQty), stock: 0, assigned: 0, left: 0, used: 0 }; map.set(k, g); }
    g.lots.push({ row, index });
    g.balance = Math.max(g.balance, n3(row.BQty));
    g.stock += n3(row.StkQty);
    g.assigned += n3(row.AssQty);
    if (n3(row.AssQty) > 0) g.used += 1;
  });
  return [...map.values()].map((g) => ({
    ...g,
    stock: n3(g.stock), assigned: n3(g.assigned), left: n3(g.balance - g.assigned),
    // most stock first — the lot that can fill the order fastest is on top
    lots: [...g.lots].sort((a, b) => n3(b.row.StkQty) - n3(a.row.StkQty)),
  }));
}

/** Over-assigned order line → reason, else ''. (The web summed AssQty per ItmCode+SOUId for this check.) */
export const groupIssue = (g: OrderGroup) =>
  g.assigned > g.balance ? `Assigned ${qty(g.assigned)} is more than the order balance ${qty(g.balance)}. Reduce by ${qty(g.assigned - g.balance)}.` : '';

/**
 * Auto-fill: keep what is already typed, then take whole lots, largest stock first,
 * until the order balance is met (last lot partly). Returns index → qty for changed lots.
 */
export function autoFill(g: OrderGroup, editable: (r: Row) => boolean): Record<number, string> {
  let left = n3(g.balance - g.assigned);
  const out: Record<number, string> = {};
  for (const { row, index } of g.lots) {
    if (left <= 0) break;
    if (!editable(row) || n3(row.AssQty) > 0) continue;
    const take = Math.min(n3(row.StkQty), left);
    if (take <= 0) continue;
    out[index] = take.toFixed(3);
    left = n3(left - take);
  }
  return out;
}

/* ------------------------------ browse ------------------------------ */

/** Browse dates come as DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD(…). → 'YYYY-MM-DD' or ''. */
export function isoOf(v: any): string {
  const t = str(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})[-/.](\d{2})[-/.](\d{4})/.exec(t);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
export const prettyDate = (v: any) => {
  const iso = isoOf(v);
  if (!iso) return str(v);
  const [y, mo, d] = iso.split('-');
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+mo - 1]} ${y}`;
};

/** One card per packing slip (browse rows are per slip line). */
export type SlipCard = { uid: string; no: string; date: string; iso: string; party: string; orders: string[]; lines: number; qty: number; raw: Row };
export function groupSlips(rows: Row[]): SlipCard[] {
  const map = new Map<string, SlipCard>();
  for (const r of rows) {
    const uid = str(r.UId);
    if (!uid) continue;
    let c = map.get(uid);
    if (!c) { c = { uid, no: str(r.ChalNo), date: str(r.ChalDate), iso: isoOf(r.ChalDate), party: str(r.ParName), orders: [], lines: 0, qty: 0, raw: r }; map.set(uid, c); }
    const so = str(r.SONo);
    if (so && !c.orders.includes(so)) c.orders.push(so);
    c.lines += 1;
    c.qty += n3(r.BQty);
  }
  return [...map.values()];
}
