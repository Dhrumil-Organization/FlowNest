// FILE: src/components/WarehouseNEW/model.ts
// Pure helpers of the Warehouse module — copied 1:1 (same rules, same field
// fallbacks, same order) from the legacy files:
//   Warehouse/WarehouseCriteriaScreen.tsx      (financial year)
//   Warehouse/WarehouseAssignScreen.tsx        (keyOf / searchable — also used by Transfer)
//   Warehouse/WarehouseViewScreen.tsx          (searchable for the read-only list)
//   Warehouse/components/WarehouseCard.tsx     (capacity / occupancy / used % maths)
//   Warehouse/components/CartonCard.tsx        (carton card texts)
//   Warehouse/WarehouseQRScanner.tsx + WarehouseQRCameraScanner.tsx
//                                              (QR parsing + stock-row matching; both
//                                               legacy files carry the same copy)
// Legacy dead helpers that were defined but never called (normalizeScan,
// isCsvToCsvMatch, isOldToCsvMatch, isOldToOldMatch) are not ported.

export type Row = Record<string, any>;

export type Mode = 'ASSIGN' | 'VIEW' | 'TRANSFER';

/** Criteria form — the object legacy passed as `route.params.criteria`. */
export type CriteriaForm = {
  prpgroup: string;
  prpcode: any;
  strcode: any;
  itemMode: string;
  mergeMode: string;
  gradeMode: string;
  shadeMode: string;
  stockType: string;
  yearno?: any;
};

export const INITIAL_FORM: CriteriaForm = {
  prpgroup: 'Yarn Division',
  prpcode: '',
  strcode: '',
  itemMode: 'ALL',
  mergeMode: 'ALL',
  gradeMode: 'ALL',
  shadeMode: 'ALL',
  stockType: 'ALL',
};

/** Legacy <Picker> items of "Stock Type" (label / value). */
export const STOCK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'P', label: 'Partly' },
  { value: 'F', label: 'Full' },
  { value: 'E', label: 'Empty' },
];

/** Financial year starts in April; returns the last two digits of the ending year. */
export const getCurrentFinancialYear = (): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
  return financialYear.toString().substring(2);
};

/* ------------------------------------------------------------------ */
/* Carton list (Assign / Transfer / View)                              */
/* ------------------------------------------------------------------ */

/** Selection key used by Assign + Transfer (legacy keyOf). */
export const keyOf = (item: Row): string =>
  String(
    item?.cartonNo ||
      item?.cartno ||
      item?.CartNo ||
      item?.carcode ||
      item?.CarCode ||
      item?._scanCartonKey ||
      `${item?.uid || item?.UId || ''}_${item?.vouno || ''}_${item?.psrno || item?.srno || item?.SrNo || ''}`,
  );

/** Search haystack of Assign + Transfer (legacy multi-line template, same fields). */
export const searchable = (item: Row): string =>
  `
  ${item?.cartonNo || ''}
  ${item?.cartno || ''}
  ${item?.ItmName || ''}
  ${item?.itemName || ''}
  ${item?.ShdName || ''}
  ${item?.GrdName || ''}
  ${item?.MerName || ''}
  ${item?.vouNo || ''}
  ${item?.vouno || ''}
  ${item?.PackingNo || ''}
`.toLowerCase();

/** Search haystack of the View screen (legacy single-line template). */
export const searchableView = (item: Row): string =>
  `${item?.cartonNo || ''} ${item?.cartno || ''} ${item?.ItmName || ''} ${item?.itemName || ''} ${item?.ShdName || ''} ${item?.GrdName || ''} ${item?.MerName || ''} ${item?.vouNo || ''} ${item?.vouno || ''} ${item?.PackingNo || ''}`.toLowerCase();

export const cartonNoOf = (item: Row): string => item?.cartonNo || item?.cartno || item?.CartNo || '-';
export const cartonPackingOf = (item: Row): string => item?.PackingNo || item?.vouno || item?.vouNo || '-';
export const cartonItemOf = (item: Row): string => item?.ItmName || item?.itemName || '-';
export const cartonGradeOf = (item: Row): string => item?.GrdName || item?.gradeName || '-';

/** "Location" header value on Assign / Transfer / View. */
export const locationTitle = (location: Row): string => location?.locationName || location?.location;
/** "Capacity" header value: `${used || occupancy || 0} / ${capacity || 0}`. */
export const locationCapacityText = (location: Row): string =>
  `${location?.used || location?.occupancy || 0} / ${location?.capacity || 0}`;

/* ------------------------------------------------------------------ */
/* Dashboard location card (legacy WarehouseCard)                      */
/* ------------------------------------------------------------------ */

export type LocationStats = {
  capacity: number;
  locationName: string;
  locationIn: number;
  occupancy: number;
  usedPercent: number;
  isFull: boolean;
  isEmpty: boolean;
  progress: number;
  footer: string;
};

export const locationStats = (item: Row): LocationStats => {
  const capacity = Number(item.capacity || item.Capacity || item.cap || 0);
  const locationName = item.location || item.locationName || item.Location || item.LocationName || '-';
  const locationIn = Number(item.locationin || item.LocationIn || item.used || item.Used || item.occupancy || 0);
  const occupancy = Number(item.occupancy || item.Occupancy || locationIn || 0);
  const usedPercent = Number(
    item.occup_perc ||
      item.occupPerc ||
      item.occupancy_perc ||
      item.OccupPerc ||
      (capacity > 0 ? (occupancy / capacity) * 100 : 0),
  );
  const isFull = usedPercent >= 100;
  const isEmpty = usedPercent <= 0;
  const progress = Math.min(Math.max(usedPercent, 0), 100);
  return {
    capacity,
    locationName,
    locationIn,
    occupancy,
    usedPercent,
    isFull,
    isEmpty,
    progress,
    footer: `${occupancy.toFixed(0)}/${capacity}`,
  };
};

/** Dashboard search: any value of the row contains the text. */
export const filterLocations = (locations: Row[], search: string): Row[] => {
  if (!search?.trim()) return locations;
  const searchText = search.toLowerCase();
  return locations.filter((item) =>
    Object.values(item || {}).some((value) => String(value || '').toLowerCase().includes(searchText)),
  );
};

/* ------------------------------------------------------------------ */
/* QR parsing + matching (hardware scanner and camera scanner)         */
/* ------------------------------------------------------------------ */

export const cleanScannerValue = (value: any): string =>
  String(value || '')
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/\t/g, '')
    .trim();

const normalizeNumberText = (val: any): string => {
  const s = String(val ?? '').trim();
  if (s === '') return '';
  const num = Number(s);
  if (Number.isNaN(num)) return s.toUpperCase();
  return num.toString();
};

export const splitScanParts = (value: any): string[] => {
  let cleanValue = cleanScannerValue(value);
  if (!cleanValue) return [];
  cleanValue = cleanValue
    .replace(/\\"/g, '"')
    .replace(/\\+/g, '')
    .replace(/^\s*"+|"+\s*$/g, '')
    .replace(/^\s*\{|\}\s*$/g, '')
    .trim();

  const separator = cleanValue.includes('~') ? '~' : ',';

  return cleanValue
    .split(separator)
    .map((x) =>
      String(x || '')
        .replace(/^"+|"+$/g, '')
        .replace(/^\{|\}$/g, '')
        .trim(),
    )
    .filter((x) => x !== '')
    .map(normalizeNumberText);
};

export const normalizeCart = (value: any): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

export const sameCart = (a: any, b: any): boolean => {
  const c1 = normalizeCart(a);
  const c2 = normalizeCart(b);
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  return c1 === `O${c2}` || c2 === `O${c1}`;
};

export const getCartonKey = (item: Row): string =>
  normalizeCart(
    item?.cartonNo ||
      item?.cartno ||
      item?.CartNo ||
      item?.carcode ||
      item?.CarCode ||
      item?.cartno1 ||
      item?.CartNo1 ||
      item?.uid ||
      item?.UId ||
      '',
  );

type QrIdentity = { itm: string; mer: string; grd: string; shd: string; cart: string };

// Stable business identity used by both OLD ("~") and NEW (",") warehouse QR labels.
const parseQrIdentity = (value: any): QrIdentity | null => {
  const parts = splitScanParts(value);
  if (!parts.length) return null;
  const old = cleanScannerValue(value).includes('~');
  if (old) {
    if (parts.length < 7) return null;
    return { itm: parts[0], mer: parts[1], grd: parts[2], shd: parts[3], cart: normalizeCart(parts[6]) };
  }
  if (parts.length < 16) return null;
  return { itm: parts[0], mer: parts[6], grd: parts[4], shd: parts[2], cart: normalizeCart(parts[15]) };
};

const qrIdentityKey = (q: QrIdentity | null): string => (q ? `${q.itm}|${q.mer}|${q.grd}|${q.shd}` : '');

const getStockCartNo = (row: Row): string =>
  normalizeCart(row?.cartonNo || row?.cartno || row?.CartNo || row?.cartno1 || row?.CartNo1 || '');

export const getStockRowKey = (row: Row): string => {
  const uid = row?.ZUId ?? row?.zuid ?? row?.ZUID;
  const sr = row?.ZSrNo ?? row?.zsrno ?? row?.ZSRNO;
  const sub = row?.ZSubSr ?? row?.zsubsr ?? row?.ZSUBSR;
  if (uid !== undefined && uid !== null && sr !== undefined && sr !== null && sub !== undefined && sub !== null) {
    return `STOCK:${uid}|${sr}|${sub}`;
  }
  return getCartonKey(row);
};

type QrIndexEntry = { row: Row; qr: QrIdentity | null; stockKey: string };
export type QrIndex = Map<string, QrIndexEntry[]>;

export const addQrIndexRow = (index: QrIndex, row: Row, qrValue: any) => {
  const q = parseQrIdentity(qrValue);
  const key = qrIdentityKey(q);
  if (!key) return;
  const list = index.get(key) || [];
  const stockKey = getStockRowKey(row);
  if (!list.some((x) => x.stockKey === stockKey)) {
    list.push({ row, qr: q, stockKey });
    index.set(key, list);
  }
};

/** Adds the row under scancode, scancode1 and the un-escaped scancode1 (legacy order). */
export const indexCartonRow = (index: QrIndex, row: Row) => {
  if (row?.scancode) addQrIndexRow(index, row, row.scancode);
  if (row?.scancode1) {
    addQrIndexRow(index, row, row.scancode1);
    addQrIndexRow(index, row, String(row.scancode1).replace(/\\"/g, '"'));
  }
};

export const findIndexedQrMatch = (index: QrIndex, scannedValue: any): { row: Row | null; ambiguous: boolean } => {
  const scannedQr = parseQrIdentity(scannedValue);
  const key = qrIdentityKey(scannedQr);
  if (!key || !scannedQr?.cart) return { row: null, ambiguous: false };
  const candidates = index.get(key) || [];
  if (!candidates.length) return { row: null, ambiguous: false };

  const exact: QrIndexEntry[] = [];
  const fallback: QrIndexEntry[] = [];
  for (const c of candidates) {
    const stockCart = getStockCartNo(c.row) || c.qr?.cart || '';
    if (!stockCart) continue;
    if (stockCart === scannedQr.cart) exact.push(c);
    else if (sameCart(stockCart, scannedQr.cart)) fallback.push(c);
  }
  const chosen = exact.length ? exact : fallback;
  const unique: QrIndexEntry[] = [];
  const seen = new Set<string>();
  for (const c of chosen) {
    if (!seen.has(c.stockKey)) {
      seen.add(c.stockKey);
      unique.push(c);
    }
  }
  return unique.length === 1 ? { row: unique[0].row, ambiguous: false } : { row: null, ambiguous: unique.length > 1 };
};

export const getCartonName = (item: Row): string =>
  item?.cartonNo || item?.cartno || item?.CartNo || item?.carcode || item?.CarCode || item?.uid || item?.UId || '';

/* ------------------------------------------------------------------ */
/* Scanner status                                                      */
/* ------------------------------------------------------------------ */

export type ScanStatusType = 'ready' | 'success' | 'duplicate' | 'error';
export type ScanStatus = { type: ScanStatusType; title: string; message: string };

export const READY_STATUS: ScanStatus = {
  type: 'ready',
  title: 'Ready to Scan',
  message: 'Align carton QR inside the frame',
};
export const NEXT_STATUS: ScanStatus = {
  type: 'ready',
  title: 'Ready for Next Scan',
  message: 'Scan another carton QR',
};

/** Params the legacy scanner screens received via route.params. */
export type ScanParams = {
  mode: 'ASSIGN' | 'TRANSFER';
  cartons: Row[];
  selected: Record<string, Row>;
  onScanResult: (rows: Row[]) => void;
};

/** Params the legacy Assign / Transfer / View screens received via route.params. */
export type LocationParams = { criteria: CriteriaForm; location: Row; mode: Mode };
