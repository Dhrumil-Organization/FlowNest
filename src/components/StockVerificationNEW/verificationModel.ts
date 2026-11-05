// FILE: src/components/StockVerificationNEW/verificationModel.ts
// Pure logic shared by the NEW Yarn Stock Verification and Fabric Stock
// Verification screens. Everything here is a 1:1 port of the legacy screens
// (components/YarnStockVerification + components/FabricStockVerification):
// same endpoints, same payload keys, same status codes, same QR formats.
// Only difference: prptype is passed in (dynamic) instead of hard-coded 'S'.

export type Row = Record<string, any>;
export type Kind = 'yarn' | 'fabric';

export type VerifyConfig = {
  kind: Kind;
  title: string;
  txntype: 'yarnStockVerification' | 'fabricStockVerification';
  endpoints: { load: string; update: string; insert: string };
  verifiedMsg: string;
  unit: string; // 'Carton' | 'Taka'
  unitNo: string; // 'Carton no.' | 'Taka / Roll No.'
  wtLabel: string; // 'Wt' | 'System Meter'
  wtUnit: string; // 'kg' | 'm'
  manualTitle: string;
  searchPlaceholder: string;
};

export const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());
export const num = (v: any) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const fmt3 = (v: any) =>
  Number(num(v)).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** yyyymmdd → dd/mm/yyyy (legacy convDate; 0 / blank → ''). */
export const convDate = (v: any) => {
  const s = str(v);
  if (!s || s === '0' || s.length < 8) return '';
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

/** Legacy responses put lists in response.data.response.data, .data, or bare. */
export const pickList = (data: any): Row[] => {
  if (Array.isArray(data?.response?.data)) return data.response.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

/* ------------------------------ filter --------------------------------- */

export type FlagKey = 'autoNotFound' | 'autoFound' | 'autoForRepacking' | 'manual' | 'duplicate' | 'stockNotFound';

export const FLAGS: { key: FlagKey; label: string; color: string }[] = [
  { key: 'autoNotFound', label: 'Auto not found', color: '#FFFFFF' },
  { key: 'autoFound', label: 'Auto found', color: '#F1FA73' },
  { key: 'autoForRepacking', label: 'Auto for repacking', color: '#B59AE3' },
  { key: 'manual', label: 'Manual', color: '#98FAF3' },
  { key: 'duplicate', label: 'Duplicate', color: '#678F76' },
  { key: 'stockNotFound', label: 'Stock not found', color: '#DBA7D7' },
];

export const STOCK_TYPES = [
  { value: 'A', label: 'All' },
  { value: 'I', label: 'In house' },
  { value: 'P', label: 'Process house' },
];
/** Manual entry only allows I / P (legacy). */
export const ENTRY_STOCK_TYPES = STOCK_TYPES.filter((s) => s.value !== 'A');

export type Filter = {
  PrpCode: string;
  YearNo: string;
  StrCode: string;
  StkType: string;
  updateStock: '0' | '1';
} & Record<FlagKey, '0' | '1'>;

export const DEFAULT_FILTER: Filter = {
  PrpCode: '', YearNo: '', StrCode: '', StkType: 'I', updateStock: '1',
  autoNotFound: '1', autoFound: '1', autoForRepacking: '1', manual: '1', duplicate: '1', stockNotFound: '1',
};

export function validateFilter(f: Pick<Filter, 'PrpCode' | 'YearNo' | 'StrCode' | 'StkType'>): string | null {
  if (!str(f.PrpCode)) return 'Please select property';
  if (!str(f.YearNo)) return 'Please select year';
  if (!str(f.StrCode)) return 'Please select store';
  if (!str(f.StkType)) return 'Please select stock type';
  return null;
}

const flag = (v: any) => (str(v) === '' ? '0' : str(v));

/** Flags + context every legacy call carries. */
const common = (cfg: VerifyConfig, prptype: string, f: Filter, ctx?: { PrpCode: string; YearNo: string; StrCode: string }) => ({
  prptype,
  prpcodes: [ctx?.PrpCode ?? f.PrpCode],
  yearno: ctx?.YearNo ?? f.YearNo,
  strcode: ctx?.StrCode ?? f.StrCode,
  updateStock: f.updateStock,
  autoFound: flag(f.autoFound),
  manual: flag(f.manual),
  stockNotFound: flag(f.stockNotFound),
  autoNotFound: flag(f.autoNotFound),
  autoForRepacking: flag(f.autoForRepacking),
  duplicate: flag(f.duplicate),
  txntype: cfg.txntype,
});

/** POST /api/get_verify_manual_(fabric_)stock */
export const loadPayload = (cfg: VerifyConfig, prptype: string, f: Filter, ctx?: { PrpCode: string; YearNo: string; StrCode: string }) => ({
  ...common(cfg, prptype, f, ctx),
  stktype: str(f.StkType),
});

/** POST /api/update_verify_manual_(fabric_)stock */
export const updatePayload = (cfg: VerifyConfig, prptype: string, f: Filter, row: Row) => ({
  data: { getSelectedStockRow: { ...row, Chk: '1' } },
  ...common(cfg, prptype, f),
  isstockupdate: '1',
});

/** POST PRINTSTICKER */
export const printPayload = (cfg: VerifyConfig, f: Filter, row: Row) => ({
  data: [{ ...row, yearno: str(f.YearNo) || '99' }],
  IskgQty: 0,
  printype: 'Print',
  PrintFormat: 3,
  printerName: '',
  txntype: cfg.txntype,
});

/* ------------------------------ status --------------------------------- */

export type StatusKey = 'pending' | 'found' | 'manual' | 'repack' | 'notfound' | 'other';

export const STATUS_META: Record<StatusKey, { label: string; short: string; color: string; bg: string; border: string; icon: string }> = {
  pending: { label: 'TO VERIFY', short: 'To verify', color: '#087FA3', bg: '#EFF9FC', border: '#9ACFDE', icon: 'hourglass-empty' },
  found: { label: 'AUTO FOUND', short: 'Verified', color: '#9A7B00', bg: '#FFFBE6', border: '#E8D36B', icon: 'check-circle' },
  manual: { label: 'MANUAL', short: 'Manual', color: '#168A92', bg: '#F0FCFD', border: '#9DDDE1', icon: 'edit' },
  repack: { label: 'AUTO FOR REPACKING', short: 'Repacking', color: '#7652B5', bg: '#F7F2FF', border: '#C9B5EC', icon: 'inventory-2' },
  notfound: { label: 'STOCK NOT FOUND', short: 'Not found', color: '#B35D9E', bg: '#FFF4FB', border: '#D9A5CE', icon: 'error-outline' },
  other: { label: 'AUTO NOT FOUND', short: 'Auto not found', color: '#6D7880', bg: '#F6F7F8', border: '#D5DADE', icon: 'help-outline' },
};

export const STATUS_ORDER: StatusKey[] = ['pending', 'found', 'manual', 'repack', 'notfound', 'other'];

/** Same precedence as the legacy card (saved / '2' first). */
export function statusOf(row: Row, saved: Set<string>): StatusKey {
  const s = str(row?.Status);
  if (saved.has(str(row?.UId)) || s === '2') return 'found';
  if (s === '3') return 'repack';
  if (s === '5') return 'notfound';
  if (s === '0') return 'manual';
  if (s === '1') return 'pending';
  return 'other';
}
/** Legacy: Verify only when Status '1' and not saved; Print when '2' or saved. */
export const canVerify = (row: Row, saved: Set<string>) => str(row?.Status) === '1' && !saved.has(str(row?.UId));
export const canPrint = (row: Row, saved: Set<string>) => str(row?.Status) === '2' || saved.has(str(row?.UId));

/** Universal search across every field of the row (legacy). */
export function searchRows(rows: Row[], q: string): Row[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter((r) =>
    Object.values(r || {}).some((v) => v !== null && v !== undefined && typeof v !== 'object' && String(v).toLowerCase().includes(s)),
  );
}

/** Legacy manual-entry reload: inserted rows first, API rows without those cartons after. */
export function mergeInserted(inserted: Row[], fresh: Row[]): Row[] {
  if (!inserted.length) return fresh;
  const carts = new Set(inserted.map((r) => str(r.CartNo)));
  return inserted.concat(fresh.filter((r) => !carts.has(str(r.CartNo))));
}

export const rowKey = (r: Row, i: number) => `${str(r.UId) || 'x'}-${str(r.CartNo)}-${str(r.PSrNo)}-${str(r.PSubSr)}-${i}`;

/* ---------------------------- manual entry ----------------------------- */

export type Manual = {
  PrpCode: string; YearNo: string; StrCode: string;
  CartNo: string; Chees: string;
  ItmCode: string; MerCode: string; GrdCode: string; ShdCode: string; DsnCode: string;
  Denier: string; grsWt: string; netWt: string; StkType: string;
};

export const emptyManual = (ctx: Partial<Manual> = {}): Manual => ({
  PrpCode: '', YearNo: '', StrCode: '', CartNo: '', Chees: '',
  ItmCode: '', MerCode: '', GrdCode: '', ShdCode: '', DsnCode: '',
  Denier: '', grsWt: '', netWt: '', StkType: 'I', ...ctx,
});

export function validateManual(kind: Kind, m: Manual): string | null {
  if (!str(m.PrpCode)) return 'Please select property';
  if (!str(m.YearNo)) return 'Please select year';
  if (!str(m.StrCode)) return 'Please select store';
  if (kind === 'yarn') {
    if (!str(m.CartNo)) return 'Carton no. can not be blank or empty';
    if (num(m.Chees) <= 0) return 'Chees can not be blank or empty or 0';
    if (!str(m.ItmCode)) return 'Item can not be blank or empty';
    if (!str(m.MerCode)) return 'Merge can not be blank or empty';
    if (!str(m.GrdCode)) return 'Grade can not be blank or empty';
    if (!str(m.ShdCode)) return 'Shade can not be blank or empty';
    if (num(m.netWt) <= 0) return 'Net wt. can not be blank or empty or 0';
  } else {
    if (!str(m.CartNo)) return 'Taka / Roll No. can not be blank or empty';
    if (!str(m.ItmCode)) return 'Item can not be blank or empty';
    if (num(m.netWt) <= 0) return 'Physical meter can not be blank, empty or 0';
  }
  if (!str(m.StkType)) return 'Please select stock type';
  return null;
}

/** POST /api/insert_verify_manual_(fabric_)stock — exact legacy keys. */
export function insertPayload(cfg: VerifyConfig, prptype: string, m: Manual) {
  const base = { prptype, prpcodes: [m.PrpCode], yearno: m.YearNo, strcode: m.StrCode, CartNo: m.CartNo };
  if (cfg.kind === 'yarn') {
    return {
      ...base,
      Chees: m.Chees, ItmCode: m.ItmCode, MerCode: m.MerCode, GrdCode: m.GrdCode, ShdCode: m.ShdCode,
      Denier: m.Denier, GrsWt: m.grsWt, NetWt: m.netWt, StkType: m.StkType, txntype: cfg.txntype,
    };
  }
  // Fabric: one Physical Meter value goes in both GrsWt and NetWt (legacy).
  return {
    ...base,
    Chees: 0, ItmCode: m.ItmCode, MerCode: m.MerCode || '', GrdCode: m.GrdCode || '', ShdCode: m.ShdCode,
    Denier: '', DsnCode: m.DsnCode, GrsWt: m.netWt, NetWt: m.netWt, StkType: m.StkType, txntype: cfg.txntype,
  };
}

/** GET master dropdown params (legacy CartonAddDrawer). */
export const TTYPE = ['8', '3', '30', '2', '34', '83', '42'];
export function masterParams(cfg: VerifyConfig, m: Pick<Manual, 'PrpCode' | 'YearNo' | 'StrCode'>) {
  const ctx = { prpcode: m.PrpCode, yearno: m.YearNo, strcode: m.StrCode };
  return {
    itemdrop: { ...ctx, itemcode: '', itemname: '', isall: '1', txntype: cfg.txntype, billdate: '', ttype: TTYPE, fetch: '' },
    mergedrop: { ...ctx, itemcode: '', itemname: '', isall: 1, txntype: cfg.txntype, billdate: '' },
    gradedrop: { ...ctx, itemcode: '', itemname: '', isall: 1, txntype: cfg.txntype, billdate: '', ttype: TTYPE, fetch: 'grade' },
    shadedrop: { ...ctx, itemcode: '', itemname: '', isall: 1, txntype: cfg.txntype, billdate: '' },
    designdrop: { ...ctx, txntype: cfg.txntype, dsncode: '', dsnname: '' },
  };
}

/* --------------------------------- QR ---------------------------------- */

export type FabricQrData = {
  raw: string;
  PrpCode?: string; YearNo?: string;
  PUId?: string | number; PSrNo?: string | number; PSubSr?: string | number; TranType?: string | number;
  CartNo?: string; ItmCode?: string | number; DsnCode?: string | number; ShdCode?: string | number;
  Qty?: string | number; StkType?: string;
};

const valueOf = (obj: any, ...keys: string[]) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') return obj[k];
  return undefined;
};

/** Verification scan (legacy fabricQr.parseFabricQr). */
export function parseFabricQr(input: string): FabricQrData {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Empty QR code.');
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === 'object') {
      return {
        raw,
        PrpCode: valueOf(json, 'PrpCode', 'prpcode', 'prpCode'),
        YearNo: valueOf(json, 'YearNo', 'yearno', 'yearNo'),
        PUId: valueOf(json, 'PUId', 'puid', 'UId', 'uid'),
        PSrNo: valueOf(json, 'PSrNo', 'psrno', 'SrNo', 'srno'),
        PSubSr: valueOf(json, 'PSubSr', 'psubsr', 'SubSr', 'subsr'),
        TranType: valueOf(json, 'TranType', 'trantype'),
        CartNo: String(valueOf(json, 'CartNo', 'cartNo', 'TakaNo', 'takaNo', 'rollNo') ?? ''),
        ItmCode: valueOf(json, 'ItmCode', 'itmcode'),
        DsnCode: valueOf(json, 'DsnCode', 'dsncode'),
        ShdCode: valueOf(json, 'ShdCode', 'shdcode'),
        Qty: valueOf(json, 'Qty', 'qty', 'Wt', 'wt', 'NetWt', 'netWt', 'GrossWt', 'GrsWt'),
        StkType: valueOf(json, 'StkType', 'stktype'),
      };
    }
  } catch (_) { /* ERP ~ formats below */ }
  const parts = raw.split('~');
  // UID~SrNo~SubSr~TranType~TakaNo~ItmCode~DsnCode~Qty~
  if (parts.length >= 8 && /^\d+(?:\.0+)?$/.test(parts[0] || '') && parts[4] !== '') {
    return {
      raw, PUId: parts[0] || '', PSrNo: parts[1] || '', PSubSr: parts[2] || '', TranType: parts[3] || '',
      CartNo: parts[4] || '', ItmCode: parts[5] || '', DsnCode: parts[6] || '', Qty: parts[7] || '',
    };
  }
  return { raw, CartNo: raw };
}

const same = (a: any, b: any) => String(a ?? '').trim() === String(b ?? '').trim();

/** legacy fabricQr.findFabricStockRow */
export function findFabricStockRow(rows: Row[], qr: FabricQrData): Row | null {
  const source = Array.isArray(rows) ? rows : [];
  const cartNo = String(qr.CartNo ?? '').trim();
  if (!cartNo) return null;
  const ref = source.find((r) =>
    same(r?.CartNo, cartNo)
    && qr.PUId !== undefined && same(r?.PUId, qr.PUId)
    && qr.PSrNo !== undefined && same(r?.PSrNo, qr.PSrNo)
    && qr.PSubSr !== undefined && same(r?.PSubSr, qr.PSubSr)
    && qr.TranType !== undefined && same(r?.TranType, qr.TranType));
  if (ref) return ref;
  return source.find((r) => same(r?.CartNo, cartNo) && (!qr.PrpCode || same(r?.PrpCode, qr.PrpCode))) || null;
}

/** Legacy: already verified = Status '2', Chk 1, or saved in this session. */
export const isAlreadyVerified = (row: Row, saved: Set<string>) =>
  str(row?.Status) === '2' || Number(row?.Chk ?? 0) === 1 || saved.has(str(row?.UId));

/** Verification scan with no stock match → manual form prefill (legacy). */
export function manualFromVerifyQr(qr: FabricQrData, prev: Manual, f: Filter): Manual {
  const q = qr.Qty !== undefined && qr.Qty !== null ? String(qr.Qty) : '';
  return {
    ...prev,
    PrpCode: str(qr.PrpCode) || prev.PrpCode || f.PrpCode || '',
    YearNo: str(qr.YearNo) || prev.YearNo || f.YearNo || '',
    StrCode: prev.StrCode || f.StrCode || '012',
    CartNo: str(qr.CartNo),
    ItmCode: str(qr.ItmCode),
    DsnCode: str(qr.DsnCode),
    ShdCode: str(qr.ShdCode),
    Chees: '0',
    grsWt: q,
    netWt: q,
    StkType: str(qr.StkType) || prev.StkType || 'I',
  };
}

/** Manual-entry QR (legacy fabric CartonAddDrawer.parseQrValue). */
export function parseManualQr(value: string): Row {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Empty QR value');
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === 'object') return json;
  } catch (_) { /* ~ formats */ }
  const p = raw.split('~');
  if (p.length >= 8 && p.length <= 9) {
    const w = p[7] || '';
    return { PUId: p[0] || '', PSrNo: p[1] || '', PSubSr: p[2] || '', TranType: p[3] || '', CartNo: p[4] || '', ItmCode: p[5] || '', DsnCode: p[6] || '', Wt: w, GrsWt: w, GrossWt: w, NetWt: w, netWt: w };
  }
  if (p.length === 16) {
    return { PUId: p[0] || '', PSrNo: p[1] || '', PSubSr: p[2] || '', TranType: p[3] || '', CartNo: p[4] || '', ItmCode: p[5] || '', ItmName: p[6] || '', MerCode: p[7] || '', MerName: p[8] || '', GrdCode: p[9] || '', GrdName: p[10] || '', ShdCode: p[11] || '', ShdName: p[12] || '', Wt: p[13] || '', Chees: p[14] || '', yearNo: p[15] || '' };
  }
  if (p.length >= 13) {
    return { PrpCode: p[0] || '', PUId: p[1] || '', PSrNo: p[2] || '', PSubSr: p[3] || '', TranType: p[4] || '', CartNo: p[5] || '', ItmCode: p[6] || '', MerCode: p[7] || '', GrdCode: p[8] || '', ShdCode: p[9] || '', Denier: p[10] || '', Wt: p[11] || '', Chees: p[12] || '', Rate: p[13] || '', yearNo: p[14] || '' };
  }
  if (p.length >= 11) {
    return { PUId: p[0] || '', PSrNo: p[1] || '', PSubSr: p[2] || '', TranType: p[3] || '', CartNo: p[4] || '', ItmCode: p[5] || '', MerCode: p[6] || '', GrdCode: p[7] || '', ShdCode: p[8] || '', Denier: p[9] || '', Wt: p[10] || '', Chees: '' };
  }
  return { CartNo: raw };
}

/** Apply a manual-entry QR to the form (legacy applyScannedQrToForm). */
export function applyManualQr(value: string, prev: Manual, f: Filter): Manual {
  const x: any = parseManualQr(value);
  const gross = x.GrsWt ?? x.GrossWt ?? x.grsWt ?? x.Wt ?? x.wt ?? '';
  const net = x.NetWt ?? x.netWt ?? x.NetWeight ?? x.GrsWt ?? x.GrossWt ?? x.Wt ?? x.wt ?? '';
  const chees = x.Chees ?? x.chees ?? '';
  return {
    ...prev,
    PrpCode: str(x.PrpCode || x.prpcode || x.prpCode) || prev.PrpCode || f.PrpCode || '',
    YearNo: str(x.YearNo || x.yearNo || x.yearno) || prev.YearNo || f.YearNo || '',
    StrCode: prev.StrCode || f.StrCode || '',
    CartNo: str(x.CartNo || x.cartNo || x.cartonNo),
    Chees: chees !== '' ? String(chees) : '',
    ItmCode: str(x.ItmCode || x.itmcode),
    MerCode: str(x.MerCode || x.mercode),
    GrdCode: str(x.GrdCode || x.grdcode),
    DsnCode: str(x.DsnCode || x.dsncode),
    ShdCode: str(x.ShdCode || x.shdcode),
    Denier: str(x.Denier || x.denier),
    grsWt: gross !== '' && gross !== null ? String(gross) : '',
    netWt: net !== '' && net !== null ? String(net) : '',
    StkType: str(x.StkType || x.stktype) || prev.StkType || 'I',
  };
}
