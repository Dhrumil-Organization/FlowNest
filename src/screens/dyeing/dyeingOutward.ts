// FILE: src/screens/dyeing/dyeingOutward.ts
// Outward (challan) -> Lot No. link used by the Priority status sheet.
//
//   GET  /dyeing/outward_details?prptype&chartno&yearno
//        -> the chart's outward challan lines (the "help" list) AND the lot
//           nos already saved on them (rows with a lot no. = the table).
//   /dyeing/save_outward_details?prptype&chartno&yearno&uid&srno&lotno
//        -> add OR edit: saves `lotno` against ONE outward line (uid + srno).
//
// RESPONSE SHAPE (outward_details / outward_details_all / lotnos):
//   { "uuid": "370000208", "usrno": "2",      <- the OUTWARD (challan) line = GRYOutD1 UId + SrNo
//     "uid":  "370000635", "srno":  "1",      <- the SO line (OrderUId + OrderSrNo) — NOT the outward
//     "ChartNo": "CH-2-01", "ChartLotNo": "12345", "ChalNo": "00002854/A", "soshdcode": "5" }
//
// UNIQUE OUTWARD (on screen) = uuid + usrno: list keys, merge, "already taken
// in this shade" check, ChalNo lookup. The same uuid can come with several
// usrno (one challan, many lines) — every line is its own row.
// SAVE / REMOVE PAYLOAD: `uid` + `srno` are sent EXACTLY as the API's own
// `uid` / `srno` of the picked row (saveUid / saveSrNo) — NOT uuid / usrno.
// `soshdcode` = the SO shade the line / lot belongs to (shade-wise split).
// Old responses without `uuid` still read UId / SrNo as the outward.
//
// The response is read tolerantly (any wrapper, any casing, one merged list
// or separate "outwards" / "saved" lists) so the screen does not break if the
// backend renames a key. Everything the screen needs goes through
// `toOutwardRows` — if a field shows up empty, add its key name there.

import { num, parseAnyDate } from './dyeingModel';

export type OutwardRow = {
  key: string; // outward uid|srno|chart|shade — unique per row on screen
  uuid: string; // raw `uuid` from the API ('' when not sent)
  uid: string; // OUTWARD UId  (uuid, or UId on old responses) — sent as `uid`
  srno: string; // OUTWARD SrNo (usrno, or SrNo on old responses) — sent as `srno`
  soUid: string; // SO line UId (API `uid` when uuid is present)
  soSrNo: string; // SO line SrNo (API `srno` when uuid is present)
  saveUid: string; // API `uid` as received — sent as `uid` in save_outward_details / remove_lotno
  saveSrNo: string; // API `srno` as received — sent as `srno` in save_outward_details / remove_lotno
  challanNo: string; // shown as "Outward No." (ChalNo when the API has it, else UId/SrNo)
  hasChallan: boolean; // challanNo came from the API (not the UId/SrNo fallback)
  chartNo: string; // GRYOutD1.ChartNo of this outward line (save_outward_details needs it)
  date: string; // YYYY-MM-DD or ''
  qty: number | null;
  lotNo: string; // '' = no lot saved yet
  shdCode: string;
  shdName: string;
  mill: string;
  raw: any;
};

const pick = (row: any, keys: string[]): any => {
  if (!row || typeof row !== 'object') return undefined;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  // case-insensitive fallback
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const real = lower.get(k.toLowerCase());
    if (real && row[real] !== undefined && row[real] !== null && String(row[real]).trim() !== '') return row[real];
  }
  return undefined;
};

const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

const UUID_KEYS = ['uuid', 'UUID', 'Uuid', 'UUId'];
const USRNO_KEYS = ['usrno', 'USrNo', 'uSrNo', 'USRNO', 'Usrno'];
const UID_KEYS = ['uid', 'UId', 'Uid', 'UID', 'OutwardUId', 'OutUId', 'outuid', 'VouUId', 'ChallanUId', 'DocUId'];
const SRNO_KEYS = ['srno', 'SrNo', 'Srno', 'SRNO', 'OutwardSrNo', 'OutSrNo', 'VouSrNo', 'LineNo'];
const CHALLAN_KEYS = [
  'ChalNo', 'chalno', 'OutwardNo', 'outwardno', 'ChallanNo', 'challanno', 'ChalanNo', 'chalanno', 'VouNo', 'vouno',
  'VoucherNo', 'DocNo', 'docno', 'BillNo', 'billno', 'OutNo', 'outno',
];
const DATE_KEYS = ['Date', 'date', 'OutwardDate', 'ChallanDate', 'VouDate', 'voudate', 'DocDate', 'BillDate'];
const QTY_KEYS = ['Qty', 'qty', 'Mtrs', 'mtrs', 'Meter', 'Meters', 'Quantity', 'NetQty', 'Pcs'];
const LOT_KEYS = ['ChartLotNo', 'chartlotno', 'LotNo', 'lotno', 'Lotno', 'LOTNO', 'DyeLotNo', 'MillLotNo'];
const CHART_KEYS = ['ChartNo', 'chartno', 'CHARTNO'];
const SHD_CODE_KEYS = ['soshdcode', 'SOShdCode', 'SoShdCode', 'ShdCode', 'shdcode', 'ShadeCode', 'shadecode'];
const SHD_NAME_KEYS = ['ShdName', 'shdname', 'ShadeName', 'shadename', 'Shade', 'shade'];
const MILL_KEYS = ['MillName', 'millname', 'Mill', 'PartyName', 'partyname', 'AccName', 'accname', 'ProcessHouse'];

/** Outward line identity: outward uid|srno. */
export const lineKeyOf = (r: { uid: string; srno: string }) => `${r.uid}|${r.srno}`;

const toRow = (raw: any): OutwardRow | null => {
  const uuid = str(pick(raw, UUID_KEYS));
  // uuid present -> outward = uuid + usrno, and uid / srno are the SO line
  const uid = uuid || str(pick(raw, UID_KEYS));
  const srno = uuid ? str(pick(raw, USRNO_KEYS)) : str(pick(raw, SRNO_KEYS));
  const soUid = uuid ? str(pick(raw, UID_KEYS)) : '';
  const soSrNo = uuid ? str(pick(raw, SRNO_KEYS)) : '';
  // payload values = the response's own uid / srno (old responses: same as uid / srno)
  const saveUid = str(pick(raw, UID_KEYS));
  const saveSrNo = str(pick(raw, SRNO_KEYS));
  const challanNo = str(pick(raw, CHALLAN_KEYS));
  if (!uid && !challanNo) return null;
  const qtyRaw = pick(raw, QTY_KEYS);
  const chartNo = str(pick(raw, CHART_KEYS));
  const shdCode = str(pick(raw, SHD_CODE_KEYS));
  return {
    key: `${uid}|${srno}|${chartNo}|${shdCode}`,
    uuid,
    uid,
    srno,
    soUid,
    soSrNo,
    saveUid,
    saveSrNo,
    challanNo: challanNo || (uid ? `${uid}${srno ? `/${srno}` : ''}` : ''),
    hasChallan: !!challanNo,
    chartNo,
    date: parseAnyDate(pick(raw, DATE_KEYS)),
    qty: qtyRaw !== undefined ? num(qtyRaw) : null,
    lotNo: str(pick(raw, LOT_KEYS)),
    shdCode,
    shdName: str(pick(raw, SHD_NAME_KEYS)),
    mill: str(pick(raw, MILL_KEYS)),
    raw,
  };
};

/** Every array of objects found in the response (one level into objects). */
const collectArrays = (node: any, depth = 0, out: any[][] = []): any[][] => {
  if (!node || depth > 4) return out;
  if (Array.isArray(node)) {
    if (node.some((x) => x && typeof x === 'object' && !Array.isArray(x))) out.push(node);
    return out;
  }
  if (typeof node === 'object') Object.values(node).forEach((v) => collectArrays(v, depth + 1, out));
  return out;
};

/**
 * Normalises the outward_details / outward_details_all / lotnos response.
 * Rows are merged on their key (outward uid + srno + chart + shade), so the
 * same line reached through two lists shows once, while every other line
 * (same uuid, different usrno) shows separately.
 */
export const toOutwardRows = (response: any): OutwardRow[] => {
  const body = response?.data ?? response;
  const merged = new Map<string, OutwardRow>();
  collectArrays(body).forEach((list) => {
    list.forEach((raw) => {
      const row = toRow(raw);
      if (!row) return;
      const prev = merged.get(row.key);
      if (!prev) {
        merged.set(row.key, row);
        return;
      }
      merged.set(row.key, {
        ...prev,
        uuid: prev.uuid || row.uuid,
        soUid: prev.soUid || row.soUid,
        soSrNo: prev.soSrNo || row.soSrNo,
        saveUid: prev.saveUid || row.saveUid,
        saveSrNo: prev.saveSrNo || row.saveSrNo,
        challanNo: !prev.hasChallan && row.hasChallan ? row.challanNo : prev.challanNo,
        hasChallan: prev.hasChallan || row.hasChallan,
        chartNo: prev.chartNo || row.chartNo,
        date: prev.date || row.date,
        qty: prev.qty ?? row.qty,
        lotNo: row.lotNo || prev.lotNo,
        shdCode: prev.shdCode || row.shdCode,
        shdName: prev.shdName || row.shdName,
        mill: prev.mill || row.mill,
      });
    });
  });
  return Array.from(merged.values());
};

/** Same outward line? outward uid (uuid) + srno (usrno), + chart when both know it. */
export const sameOutward = (a: OutwardRow, b: OutwardRow) => {
  if (!a.uid || !b.uid) return false;
  if (a.uid !== b.uid || a.srno !== b.srno) return false;
  return !a.chartNo || !b.chartNo || a.chartNo === b.chartNo;
};

/** Does this row belong to the given shade? (no shade info on the row = undecided -> null) */
export const rowShadeMatch = (row: OutwardRow, shade: { ShdCode: string; ShdName: string }): boolean | null => {
  if (row.shdCode) return normShadeKey(row.shdCode) === normShadeKey(shade.ShdCode);
  if (row.shdName) return normShadeKey(row.shdName) === normShadeKey(shade.ShdName);
  return null;
};
const normShadeKey = (v: any) => String(v ?? '').trim().toUpperCase();

/** Response of save_outward_details: explicit false = failed, otherwise 2xx = saved. */
export const outwardSaveOk = (response: any) => {
  const body = response?.data ?? response;
  if (body === false) return false;
  if (body && typeof body === 'object') {
    if (body.status === false || body.success === false || body.response === false) return false;
    if (typeof body.status === 'string' && /fail|error/i.test(body.status)) return false;
  }
  const code = response?.status;
  return code === undefined || (code >= 200 && code < 300);
};

const normShade = (v: string) => v.trim().toUpperCase();

/**
 * Splits the chart's outward rows by colour. A row goes to a colour when its
 * ShdCode / ShdName matches; rows without shade info go to the colour when
 * the chart has only one colour, otherwise to `unmatched` (shown once at
 * chart level).
 */
export const groupOutwardsByShade = (
  rows: OutwardRow[],
  shades: { ShdCode: string; ShdName: string; OrderSrNo: number }[],
): { byShade: Record<string, OutwardRow[]>; unmatched: OutwardRow[] } => {
  const byShade: Record<string, OutwardRow[]> = {};
  const unmatched: OutwardRow[] = [];
  const keyOf = (s: { ShdCode: string; ShdName: string; OrderSrNo: number }) => `${s.ShdCode || s.ShdName}::${s.OrderSrNo}`;
  shades.forEach((s) => { byShade[keyOf(s)] = []; });

  rows.forEach((row) => {
    let hit = row.shdCode
      ? shades.find((s) => normShade(s.ShdCode) === normShade(row.shdCode))
      : undefined;
    if (!hit && row.shdName) hit = shades.find((s) => normShade(s.ShdName) === normShade(row.shdName));
    if (!hit && !row.shdCode && !row.shdName && shades.length === 1) hit = shades[0];
    if (hit) byShade[keyOf(hit)].push(row);
    else unmatched.push(row);
  });
  return { byShade, unmatched };
};

/** 2026-09-29 -> 29/09/26 (chip date on the timeline). */
export const chipDate = (value: any) => {
  const iso = parseAnyDate(value);
  if (!iso) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
};
