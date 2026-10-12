// FILE: src/components/SalesOrderEntryNEW/model.ts
// Pure rules of the Sales Order Entry module — no React, no HTTP.
// Every function here is copied from the Legacy screen
// components/SalesOrderNew/index.tsx (same expressions, same key order in the
// payloads) so the server receives exactly what Legacy sends.

export type Row = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Number / date helpers (Legacy top-of-file helpers)                  */
/* ------------------------------------------------------------------ */

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtDisplay = (d: any) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};

export const ymd = (d: any) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
};

export const money = (v: any) =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseNum = (v: any) => Number(String(v || '0').replace(/,/g, ''));

export const moneyShort = (v: any) => {
  const n = parseNum(v);
  return n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
};

export const fmt = (v: any, dec = 2) => Number(v || 0).toFixed(dec);

export const currentFyNo = () => {
  const d = new Date();
  const endYear = d.getMonth() >= 3 ? d.getFullYear() + 1 : d.getFullYear();
  return String(endYear % 100).padStart(2, '0');
};

export const parseErpDate = (value: any): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 8) {
    const startsWithYear = Number(digits.slice(0, 4)) >= 1900;
    const year = startsWithYear ? Number(digits.slice(0, 4)) : Number(digits.slice(4, 8));
    const month = startsWithYear ? Number(digits.slice(4, 6)) : Number(digits.slice(2, 4));
    const day = startsWithYear ? Number(digits.slice(6, 8)) : Number(digits.slice(0, 2));
    const parsed = new Date(year, month - 1, day);

    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return parsed;
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const decimalInput = (value: any) => {
  const cleaned = String(value || '').replace(/[^0-9.]/g, '');
  const [whole, ...fraction] = cleaned.split('.');
  return fraction.length ? `${whole}.${fraction.join('')}` : whole;
};

/** Tracking / Summary helpers. */
export const num = (v: any) => Number(v) || 0;
export const fmtIN = (v: any) => Math.round(num(v)).toLocaleString('en-IN');

/** Legacy year picker: this calendar year and the 4 before it ("2026-2027", ...). */
export const buildYearOptions = () => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => `${y - i}-${y - i + 1}`);
};

/** Deterministic pastel used when a d1 row has no ShdColor (Legacy shadeColorFromName). */
export const shadeColorFromName = (name = '') => {
  const colors = ['#b5c4d0', '#d4a97a', '#8dab8e', '#c5b8d2', '#e8c97a', '#a8c4b8', '#d4b483', '#9fb8d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/* ------------------------------------------------------------------ */
/* New Order                                                           */
/* ------------------------------------------------------------------ */

export type Colourway = { shade: Row; qty: number; rate: number; amount: number };

/** Legacy addColourway(): the row added to the shade list. */
export const makeColourway = (shade: Row, qty: string, pricePerM: string): Colourway => {
  const amount = Number(qty) * Number(pricePerM || 0);
  return { shade: { ...shade }, qty: Number(qty), rate: Number(pricePerM || 0), amount };
};

export const colourwayTotals = (colourways: Colourway[]) => ({
  totalQty: Array.isArray(colourways) ? colourways.reduce((s, c) => s + Number(c.qty || 0), 0) : 0,
  totalAmt: Array.isArray(colourways) ? colourways.reduce((s, c) => s + Number(c.amount || 0), 0) : 0,
});

/** Legacy "VS LATEST COSTING" numbers. */
export const costingInfo = (latestCosting: Row | null, pricePerM: string) => {
  const costDiff =
    latestCosting && pricePerM
      ? Number(pricePerM) - Number(latestCosting.CostPerM || latestCosting.UnitRate || 0)
      : null;
  const costMonth = latestCosting?.Month || latestCosting?.SODate || '';
  const latestCost = latestCosting ? Number(latestCosting.CostPerM || latestCosting.UnitRate || 0) : 0;
  const marginPct = costDiff !== null && latestCost > 0 ? (costDiff / latestCost) * 100 : null;
  return { costDiff, costMonth, latestCost, marginPct };
};

/** Legacy submitOrder() validation — first failing message, or null. */
export const validateNewOrder = (s: {
  selectedProp: Row | null;
  selectedParty: Row | null;
  selectedDesign: Row | null;
  selectedItem: Row | null;
  pricePerM: string;
  deliveryDate: Date | null;
  colourways: Colourway[];
}): string | null => {
  if (!s.selectedProp?.PrpCode) return 'Select a property first';
  if (!s.selectedParty) return 'Select a customer';
  if (!s.selectedDesign) return 'Select a design';
  if (!s.selectedItem) return 'Select a fabric type';
  if (!s.pricePerM) return 'Enter price per metre';
  if (!s.deliveryDate) return 'Select expected delivery date';
  if (s.colourways.length === 0) return 'Add at least one shade';
  return null;
};

/** Legacy submitOrder() payload for POST /api/mobappsave (Mode ADD). */
export const buildNewOrderPayload = (s: {
  prpcode: string;
  yrno: string;
  selectedParty: Row;
  selectedExec: Row | null;
  selectedDesign: Row;
  selectedItem: Row;
  deliveryDate: Date | null;
  colourways: Colourway[];
  soType: number;
  fabricType: number;
  now?: Date;
}) => {
  const { prpcode, yrno, selectedParty, selectedExec, selectedDesign, selectedItem, deliveryDate, colourways, soType, fabricType } = s;
  const { totalAmt } = colourwayTotals(colourways);
  const now = s.now || new Date();

  const rows = colourways.map((c, i) => ({
    SrNo: i + 1,
    StrCode: '012',
    ItmCode: selectedDesign.ItmCode,
    MItmCode: selectedDesign.MItmCode || selectedDesign.ItmCode,
    ItmName: selectedDesign.ItmName,
    DsnCode: selectedItem.DsnCode,
    DsnName: selectedItem.DsnName,
    ShdCode: c.shade.ShdCode,
    ShdName: c.shade.ShdName || c.shade.ShadeName,
    Qty: fmt(c.qty, 3),
    QtyPcs: '0',
    UnitRate: fmt(c.rate, 5),
    Amount: fmt(c.amount),
    D1NetAmt: fmt(c.amount),
    Remark1: '', Remark2: '', Remark3: '', Remark4: '', Remark5: '',
    PkgQty: '1.000', PkgRate: '.00000', AmtCalc: 'U',
    MerCode: '0', GrdCode: '0',
    DisPer: '.00', DisAmt: '.00',
    CGSTPer: '.00', CGSTAmt: '.00',
    SGSTPer: '.00', SGSTAmt: '.00',
    IGSTPer: '.00', IGSTAmt: '.00',
    Denier: selectedDesign.Denier || '',
    UOM: selectedDesign.UOM || '',
    HsnCode: '', HSNName: '',
  }));

  return {
    Mode: 'ADD',
    UId: 0,
    main: {
      UId: 0,
      Mode: 'ADD',
      PrpCode: prpcode,
      StrCode: '012',
      YearNo: yrno,
      ParCode: selectedParty.acccode || selectedParty.ParCode,
      ParName: selectedParty.accountname || selectedParty.ParName,
      SExe: selectedExec?.Code || selectedExec?.ExecCode || selectedParty.sexe || '',
      SExeName: selectedExec?.SalesExecutive || selectedExec?.ExecName || selectedParty.SExeName || '',
      GrsAmt: fmt(totalAmt),
      DisAmt: '.00', NDisAmt: '.00', TDisAmt: '.00',
      TaxAmt: '.00', NTaxAmt: '.00', TTaxAmt: '.00', GSTAmt: '.00',
      NetAmt: fmt(totalAmt),
      D1NetAmt: fmt(totalAmt),
      Remark: '',
      DDays: deliveryDate
        ? String(Math.ceil((new Date(deliveryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : '',
      DAdd: selectedParty.Address || '',
      DCity: selectedParty.City || '',
      Station: selectedParty.City || '',
      Status: 'P',
      EntType: 'G2',
      TaxStru: '123',
      SONo: '', SODate: '',
      DueDate: ymd(deliveryDate),
      DueDay: selectedParty.crday || '',
      SOType: soType,
      FabricType: fabricType,
    },
    d1: rows,
    tax: [],
    exp: {},
  };
};

/** Legacy onSelectParty(): the executive taken from the party (or null). */
export const execFromParty = (party: Row): Row | null =>
  party.sexe || party.SExe
    ? { Code: party.sexe || party.SExe || '', SalesExecutive: party.SExeName || party.sexe || '', note: '' }
    : null;

/** Legacy executive picker rows: the criterion list, or the party's own executive. */
export const execPickerRows = (execList: Row[], selectedParty: Row | null): Row[] =>
  execList.length > 0
    ? execList
    : selectedParty?.SalesExecutive
      ? [{ Code: selectedParty.sexe || 'EX', ExecName: selectedParty.SalesExecutive, note: '' }]
      : [];

/* ------------------------------------------------------------------ */
/* Auth — edit / view of a sales order                                 */
/* ------------------------------------------------------------------ */

export type EditRow = Row & { _qty: string; _rate: string; _clientKey: string; _isNew: boolean; _originalIndex?: number };

/** Legacy AuthOrderModal: d1 rows -> editable rows. */
export const toEditRows = (record: Row): EditRow[] =>
  (Array.isArray(record.d1) ? record.d1 : []).map((row: Row, index: number) => ({
    ...row,
    _qty: String(parseNum(row.Qty) || ''),
    _rate: String(parseNum(row.UnitRate) || ''),
    _clientKey: `existing_${row.SrNo || 0}_${row.ItmCode || 0}_${row.DsnCode || 0}_${row.ShdCode || 0}`,
    _originalIndex: index,
    _isNew: false,
  }));

/** Legacy addItemCombination() validation — first failing [title, message], or null. */
export const validateCombination = (
  rows: EditRow[],
  addDesign: Row | null,
  addItem: Row | null,
  addShade: Row | null,
  addQty: string,
  addRate: string,
): [string, string] | null => {
  const qty = parseNum(addQty);
  const rate = parseNum(addRate);
  if (!addDesign) return ['Item required', 'Select an item.'];
  if (!addItem) return ['Design required', 'Select a design.'];
  if (!addShade) return ['Shade required', 'Select a shade.'];
  if (qty <= 0 || rate <= 0) return ['Quantity and rate required', 'Enter quantity and rate greater than zero.'];
  const duplicate = rows.some(
    (row) =>
      String(row.ItmCode || '') === String(addDesign.ItmCode || '') &&
      String(row.DsnCode || '') === String(addItem.DsnCode || '') &&
      String(row.ShdCode || '') === String(addShade.ShdCode || ''),
  );
  if (duplicate) {
    return ['Combination already exists', 'This item, design and shade combination is already present in the order.'];
  }
  return null;
};

/** Legacy addItemCombination(): the new d1 row (call validateCombination first). */
export const makeCombinationRow = (
  rows: EditRow[],
  editStrCode: string,
  addDesign: Row,
  addItem: Row,
  addShade: Row,
  addQty: string,
  addRate: string,
  nowMs: number = Date.now(),
): EditRow => {
  const qty = parseNum(addQty);
  const rate = parseNum(addRate);
  const nextSrNo = rows.reduce((highest, row) => Math.max(highest, Number(row.SrNo || 0)), 0) + 1;
  const amount = qty * rate;
  return {
    _clientKey: `new_${nowMs}_${nextSrNo}`,
    _isNew: true,
    SrNo: nextSrNo,
    StrCode: editStrCode,
    ItmCode: addDesign.ItmCode,
    MItmCode: addDesign.MItmCode || addDesign.ItmCode,
    ItmName: addDesign.ItmName,
    DsnCode: addItem.DsnCode,
    DsnName: addItem.DsnName,
    ShdCode: addShade.ShdCode,
    ShdName: addShade.ShdName || addShade.ShadeName,
    ShdColor: addShade.ShdColor || '',
    Qty: fmt(qty, 3),
    _qty: String(qty),
    QtyPcs: '0',
    SQty: fmt(qty, 3),
    SQtyPcs: '0',
    BQty: fmt(qty, 3),
    BQtyPcs: '0',
    UnitRate: fmt(rate, 5),
    _rate: String(rate),
    Amount: fmt(amount),
    D1NetAmt: fmt(amount),
    Remark1: '',
    Remark2: '',
    Remark3: '',
    Remark4: '',
    Remark5: '',
    PkgQty: '1.000',
    PkgRate: '.00000',
    AmtCalc: 'U',
    MerCode: '0',
    GrdCode: '0',
    DisPer: '.00',
    DisAmt: '.00',
    CGSTPer: '.00',
    CGSTAmt: '.00',
    SGSTPer: '.00',
    SGSTAmt: '.00',
    IGSTPer: '.00',
    IGSTAmt: '.00',
    Denier: addDesign.Denier || '',
    UOM: addDesign.UOM || '',
    HsnCode: addDesign.HsnCode || addDesign.HSNCode || '',
    HSNName: addDesign.HSNName || '',
  };
};

/** Legacy restoreRemovedRows(): removed rows back in their original order. */
export const restoreRows = (rows: EditRow[], removedRows: EditRow[]): EditRow[] =>
  [...rows, ...removedRows].sort((left, right) => {
    const leftIndex = Number.isFinite(left._originalIndex) ? (left._originalIndex as number) : Number.MAX_SAFE_INTEGER;
    const rightIndex = Number.isFinite(right._originalIndex) ? (right._originalIndex as number) : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

export const editTotals = (rows: EditRow[]) => ({
  totalQty: rows.reduce((sum, row) => sum + parseNum(row._qty), 0),
  totalAmount: rows.reduce((sum, row) => sum + parseNum(row._qty) * parseNum(row._rate), 0),
});

/** Legacy submit() validation — [title, message] or null. */
export const validateEdit = (rows: EditRow[]): [string, string] | null => {
  const invalidIndex = rows.findIndex((row) => parseNum(row._qty) <= 0 || parseNum(row._rate) <= 0);
  if (rows.length === 0) return ['Cannot update', 'This sales order does not contain any item rows.'];
  if (invalidIndex >= 0) {
    return ['Invalid quantity or rate', `Enter a quantity and rate greater than zero in item ${invalidIndex + 1}.`];
  }
  return null;
};

/** Legacy confirmation text shown before an update that deletes rows (null = no confirmation). */
export const editConfirmText = (rows: EditRow[], removedRows: EditRow[]): string | null => {
  if (removedRows.length === 0) return null;
  const addedCount = rows.filter((row) => row._isNew).length;
  const changeParts = [`${removedRows.length} existing D1 row${removedRows.length === 1 ? '' : 's'} will be deleted`];
  if (addedCount > 0) changeParts.push(`${addedCount} new row${addedCount === 1 ? '' : 's'} will be added`);
  return `${changeParts.join(' and ')}.`;
};

/** Legacy updateOrder() payload for POST /api/mobappsave (Mode EDIT). */
export const buildEditPayload = (item: Row, ctx: { prpcode: string; yearno: string }, edit: { dueDate: Date; remark: string; rows: EditRow[] }) => {
  const { dueDate, remark, rows } = edit;
  const totalAmount = rows.reduce((sum, row) => sum + parseNum(row._qty) * parseNum(row._rate), 0);
  const soDate = parseErpDate(item.NSODate || item.SODate);
  const deliveryDays = Math.max(0, Math.ceil((dueDate.getTime() - soDate.getTime()) / (1000 * 60 * 60 * 24)));

  const details = rows.map((row, index) => {
    const qty = parseNum(row._qty);
    const rate = parseNum(row._rate);
    const amount = qty * rate;
    const persistedRow = Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('_')));

    return {
      ...persistedRow,
      SrNo: row.SrNo || index + 1,
      StrCode: row.StrCode || item.StrCode || '012',
      Qty: fmt(qty, 3),
      UnitRate: fmt(rate, 5),
      Amount: fmt(amount),
      D1NetAmt: fmt(amount),
      SQty: row.SQty ?? fmt(qty, 3),
      BQty: row.BQty ?? fmt(qty, 3),
      QtyPcs: row.QtyPcs ?? '0',
      SQtyPcs: row.SQtyPcs ?? row.QtyPcs ?? '0',
      BQtyPcs: row.BQtyPcs ?? row.QtyPcs ?? '0',
    };
  });

  return {
    Mode: 'EDIT',
    UId: item.UId,
    main: {
      ...item,
      Mode: 'EDIT',
      UId: item.UId,
      PrpCode: item.PrpCode || ctx.prpcode,
      StrCode: item.StrCode || '012',
      YearNo: item.yearno || ctx.yearno || currentFyNo(),
      SExe: item.sexec || item.SExe || '',
      SODate: item.NSODate || ymd(soDate),
      DueDate: ymd(dueDate),
      DDays: String(deliveryDays),
      Remark: remark,
      GrsAmt: fmt(totalAmount),
      NetAmt: fmt(totalAmount),
      D1NetAmt: fmt(totalAmount),
    },
    d1: details,
    tax: [],
    exp: {},
  };
};

/** Legacy "Updated" message after a successful edit. */
export const updatedMessage = (rows: EditRow[], removedRows: EditRow[]) => {
  const addedCount = rows.filter((row) => row._isNew).length;
  const changeParts: string[] = [];
  if (removedRows.length > 0) changeParts.push(`${removedRows.length} row${removedRows.length === 1 ? '' : 's'} deleted`);
  if (addedCount > 0) changeParts.push(`${addedCount} row${addedCount === 1 ? '' : 's'} added`);
  return changeParts.length > 0
    ? `Sales order updated successfully: ${changeParts.join(' and ')}.`
    : 'Sales order updated successfully.';
};

/** Legacy approveOrder() query params for GET /api/authso. */
export const buildAuthParams = (item: Row, action: 'approve' | 'reject') => ({
  UId: item.UId,
  PrpCode: item.PrpCode,
  StrCode: item.StrCode || '012',
  ARemark: '',
  aremark: '',
  IsAuth: action === 'approve' ? 1 : 2,
  referrer: 'dashboard',
  txntype: 'sales_order',
  action: 'edit',
  GrpCode: item.GrpCode || '',
  SONo: item.SONo || '',
  PONo: item.PONo || '',
  NSODate: item.NSODate || '',
  SODate: item.SODate || '',
  PODate: item.PODate || '',
  ParCode: item.ParCode || '',
  ParName: item.ParName || '',
  DueDay: item.DueDay || '',
  DueDate: item.DueDate || '',
  BAccCode: item.BAccCode || '',
  BAccName: item.BAccName || '',
  EntType: item.EntType || '',
  EntryType: item.EntryType || '',
  NetAmt: item.NetAmt || '',
  Remark: item.Remark || '',
  Status: item.Status || '',
  AuthCode: item.AuthCode || '',
  AUsrCode: item.AUsrCode || '',
  ALastDate: item.ALastDate || '',
  ALastTime: item.ALastTime || '',
  AuthStatus: item.AuthStatus || '',
  AuthorisedBy: item.AuthorisedBy || '',
  yearno: item.yearno || '',
  yarnstrcode: item.yarnstrcode || '',
  greystrcode: item.greystrcode || '',
  chipsstrcode: item.chipsstrcode || '',
  AuthorisedDate: item.AuthorisedDate || '',
  PTYPE: item.PTYPE || '',
  CountOfItem: item.CountOfItem || '',
  mailsent: '',
  StoreName: item.StoreName || '',
  dduedate: item.dduedate || '',
  username: item.username || '',
  itemNameArray: '',
});

/** Auth card helpers (Legacy AuthTab). */
export const getDesignName = (item: Row) => item.d1?.[0]?.DsnName || '';
export const getTotalQty = (item: Row) =>
  !Array.isArray(item.d1) ? 0 : item.d1.reduce((s: number, r: Row) => s + parseNum(r.Qty), 0);
export const getRatePerM = (item: Row) => {
  const raw = item.d1?.[0]?.UnitRate;
  return raw ? String(raw).replace(/,/g, '') : '—';
};
export const getSoId = (item: Row) => {
  if (!item.NSODate || !item.SONo) return item.SONo || '—';
  return `SO-${item.NSODate}-${item.SONo}`;
};

/** Legacy financial-year start (1 Apr) used as the Auth "From" date. */
export const fyStart = (today = new Date()) => {
  const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return new Date(fy, 3, 1);
};

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

export const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'authorized', label: 'Authorized' },
  { key: 'partial', label: 'Partial' },
  { key: 'completed', label: 'Completed' },
] as const;

export type TrackStatus = 'completed' | 'partial' | 'authorized';

/** APC = shade placeholder awaiting colour confirmation (Legacy detection). */
export const isAPCShade = (sh: Row) =>
  sh?.IsAPC === 1 ||
  sh?.IsAPC === '1' ||
  String(sh?.ShdCode || '').toUpperCase() === 'APC' ||
  /^apc\b/i.test(String(sh?.ShdName || sh?.ShadeName || ''));

export const getShades = (item: Row): Row[] => item?.Items || item?.D1 || item?.d1 || [];
export const hasAPC = (item: Row) => getShades(item).some(isAPCShade);

export const getOrderStatus = (item: Row): TrackStatus => {
  const ordered = num(item.OrderQty ?? item.totmtr);
  const pending = num(item.PendingQty ?? item.pendingmtr);
  const dispatched = ordered - pending;
  if (ordered > 0 && dispatched >= ordered) return 'completed';
  if (dispatched > 0) return 'partial';
  return 'authorized';
};

/** Buttons depend on the ACTIVE FILTER CHIP (Legacy getCardActions). */
export const getCardActions = (filterKey: string, item: Row): string[] => {
  switch (filterKey) {
    case 'authorized':
      return hasAPC(item) ? ['dispatch', 'confirmAPC', 'job'] : ['dispatch', 'job'];
    case 'partial':
      return ['dispatch', 'job'];
    case 'completed':
    case 'all':
    default:
      return ['job'];
  }
};

export const trackingTotals = (orders: Row[]) => {
  const totalOrdered = orders.reduce((s, it) => s + num(it.OrderQty ?? it.totmtr), 0);
  const totalPending = orders.reduce((s, it) => s + num(it.PendingQty ?? it.pendingmtr), 0);
  const totalDispatched = totalOrdered - totalPending;
  const overallPct = totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0;
  return { totalOrdered, totalPending, totalDispatched, overallPct };
};

export const filterTracking = (orders: Row[], search: string, statusFilter: string) =>
  orders.filter((it) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (it.ParName || it.partyname || '').toLowerCase().includes(q) ||
      (it.DsnName || '').toLowerCase().includes(q) ||
      (it.SONo || it.SO_No || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || getOrderStatus(it) === statusFilter;
    return matchesSearch && matchesStatus;
  });

/** Legacy dispatch quantity input rule (digits, max 3 decimals). */
export const acceptDispatchQty = (text: string): string | null => {
  const cleaned = text.replace(/[^0-9.]/g, '');
  return /^\d*\.?\d{0,3}$/.test(cleaned) ? cleaned : null;
};

/** Legacy confirmDispatch() checks + body items. Returns an error text or the items. */
export const dispatchItems = (
  dispItem: Row,
  totalDispatchQty: string,
  dispChecked: Record<string, boolean>,
  dispQtys: Record<string, string>,
): { error: [string, string] } | { items: { ShdCode: any; Qty: number }[] } => {
  const pendingQty = Number(dispItem?.PendingQty ?? dispItem?.pendingmtr ?? 0);
  const enteredQty = Number(totalDispatchQty || 0);
  if (enteredQty > pendingQty) {
    return { error: ['Validation', `Dispatch Qty cannot exceed Pending Qty (${pendingQty.toFixed(3)} m)`] };
  }
  const items = getShades(dispItem)
    .filter((sh) => dispChecked[sh.ShdCode] && num(dispQtys[sh.ShdCode]) > 0)
    .map((sh) => ({ ShdCode: sh.ShdCode, Qty: num(dispQtys[sh.ShdCode]) }));
  if (items.length === 0) return { error: ['Required', 'Enter at least one dispatch quantity'] };
  return { items };
};

/** Legacy buildJobChartText(). */
export const buildJobChartText = (item: Row | null) => {
  if (!item) return '';
  const lines: string[] = [];
  lines.push('JOB CHART');
  lines.push(`REF: ${item.SONo || item.SO_No || ''}`);
  lines.push(`DESIGN: ${item.DsnName || ''}`);
  if (item.FabState || item.StageName) lines.push(`STAGE: ${item.FabState || item.StageName}`);
  lines.push('');
  lines.push('SHADE / COLOUR');
  getShades(item).forEach((sh) => {
    const qty = `${fmtIN(sh.OrderQty ?? sh.Qty)} m`;
    if (isAPCShade(sh)) lines.push(`APC — not confirmed  ${qty}`);
    else lines.push(`${sh.ShdName || sh.ShadeName}  ${qty}`);
  });
  const tot = getShades(item).reduce((s, sh) => s + num(sh.OrderQty ?? sh.Qty), 0);
  lines.push('');
  lines.push(`TOTAL: ${fmtIN(tot)} m`);
  return lines.join('\n');
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export type MonthOpt = { label: string; key: string; month: number; year: number };

/** This month and the 5 before it (Legacy MONTHS). */
export const buildMonths = (now = new Date()): MonthOpt[] => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthIndex = now.getMonth();
  let year = now.getFullYear();
  return Array.from({ length: 6 }, () => {
    const result = {
      label: `${names[monthIndex]} '${String(year).slice(-2)}`,
      key: `${String(monthIndex + 1).padStart(2, '0')}${year}`,
      month: monthIndex + 1,
      year,
    };
    monthIndex -= 1;
    if (monthIndex < 0) {
      monthIndex = 11;
      year -= 1;
    }
    return result;
  });
};

const normalized = (value: any) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

export const orderKey = (order: Row) =>
  String(order?.UId || `${order?.PrpCode || ''}-${order?.SONo || ''}-${order?.SODate || ''}`);

export const getOrderLines = (order: Row): Row[] =>
  Array.isArray(order?.d1) ? order.d1 : Array.isArray(order?.Items) ? order.Items : [];

export type StatusMeta = { label: string; tone: 'green' | 'amber' };

/** Legacy getStatusMeta() (colours mapped to NEW theme tones). */
export const getStatusMeta = (order: Row): StatusMeta => {
  const auth = normalized(order?.AuthStatus);
  const isAuth = String(order?.IsAuth ?? '') === '1';
  if (isAuth || auth === 'AUTHORISED' || auth === 'AUTHORIZED') return { label: 'Authorized', tone: 'green' };
  return { label: auth && auth !== 'PENDING' ? order.AuthStatus : 'Pending Auth', tone: 'amber' };
};

const lineMatchesDesign = (line: Row, designCode: string) => !designCode || String(line?.DsnCode ?? '') === String(designCode);
const orderMatchesParty = (order: Row, partyCode: string) => !partyCode || String(order?.ParCode ?? '') === String(partyCode);

export const smartMatchingLines = (order: Row, searchText: string, sourceLines: Row[] = getOrderLines(order)) => {
  const tokens = normalized(searchText).split(' ').map((x) => x.trim()).filter(Boolean);
  if (!tokens.length) return sourceLines;
  const orderHeader = normalized([order?.ParName, order?.ParCode, order?.SONo, order?.PONo, order?.SODate].filter(Boolean).join(' '));
  return sourceLines.filter((line) => {
    const lineHaystack = normalized(
      [line?.DsnName, line?.DsnCode, line?.ShdName, line?.ShadeName, line?.ShdCode, line?.ItmName, line?.ItmCode].filter(Boolean).join(' '),
    );
    const combined = `${orderHeader} ${lineHaystack}`.trim();
    return tokens.every((token) => combined.includes(token));
  });
};

const uniqueBy = <R,>(rows: R[], keyGetter: (r: R) => any) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = String(keyGetter(row) ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Defensive month guard on SODate "dd/mm/yyyy" (Legacy load()). */
export const keepMonth = (dataArray: any, mo: MonthOpt): Row[] =>
  (Array.isArray(dataArray) ? dataArray : []).filter((order: Row) => {
    if (!order?.SODate) return false;
    const parts = String(order.SODate).split('/').map(Number);
    if (parts.length !== 3) return false;
    return parts[1] === mo.month && parts[2] === mo.year;
  });

export type FacetOpt = { code: string; name: string; itemName?: string };

/** Party list respects selected DESIGN + search; Design list respects selected PARTY + search. */
export const summaryFacets = (summaryOrders: Row[], filterCust: string, filterDesign: string, smartSearch: string) => {
  const partyFacetOrders = summaryOrders.filter((order) => {
    const designLines = getOrderLines(order).filter((line) => lineMatchesDesign(line, filterDesign));
    return smartMatchingLines(order, smartSearch, designLines).length > 0;
  });
  const partyOptions: FacetOpt[] = uniqueBy(
    partyFacetOrders
      .map((order) => ({ code: String(order?.ParCode ?? ''), name: String(order?.ParName ?? '').trim() }))
      .filter((row) => row.code || row.name),
    (row) => row.code || normalized(row.name),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const designFacetOrders = summaryOrders.filter((order) => orderMatchesParty(order, filterCust));
  const designOptions: FacetOpt[] = uniqueBy(
    designFacetOrders
      .flatMap((order) =>
        smartMatchingLines(order, smartSearch).map((line) => ({
          code: String(line?.DsnCode ?? ''),
          name: String(line?.DsnName ?? '').trim(),
          itemName: String(line?.ItmName ?? '').trim(),
        })),
      )
      .filter((row) => row.code || row.name),
    (row) => row.code || normalized(row.name),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return { partyOptions, designOptions };
};

export type SumOrder = Row & { __lines: Row[]; __qty: number };

export const filterSummaryOrders = (summaryOrders: Row[], filterCust: string, filterDesign: string, smartSearch: string): SumOrder[] =>
  summaryOrders
    .filter((order) => orderMatchesParty(order, filterCust))
    .map((order) => {
      const designLines = getOrderLines(order).filter((line) => lineMatchesDesign(line, filterDesign));
      const lines = smartMatchingLines(order, smartSearch, designLines);
      return { ...order, __lines: lines, __qty: lines.reduce((sum, line) => sum + num(line?.Qty), 0) };
    })
    .filter((order) => order.__lines.length > 0);

export const aggregateShades = (lines: Row[]) => {
  const map: Record<string, Row> = {};
  lines.forEach((line) => {
    const key = String(line?.ShdCode || line?.ShdName || line?.ShadeName || 'NO_SHADE');
    if (!map[key]) {
      map[key] = { ShdCode: line?.ShdCode, ShdName: line?.ShdName || line?.ShadeName || '—', ShdColor: line?.ShdColor, TotalQty: 0 };
    }
    map[key].TotalQty += num(line?.Qty);
  });
  return Object.values(map);
};

export type SumGroup = {
  key: string;
  mode: 'design' | 'customer';
  title: string;
  code: string;
  subtitle: string;
  orders: SumOrder[];
  allLines: Row[];
  totalQty: number;
  shadeAgg: Row[];
  designCount: number;
  soCount: number;
};

/** Legacy groupedRows: design-wise or customer-wise, biggest quantity first. */
export const groupSummary = (filteredOrders: SumOrder[], groupMode: 'design' | 'customer'): SumGroup[] => {
  const map: Record<string, any> = {};

  if (groupMode === 'design') {
    filteredOrders.forEach((order) => {
      const byDesign: Record<string, Row[]> = {};
      order.__lines.forEach((line) => {
        const key = String(line?.DsnCode || line?.DsnName || 'NO_DESIGN');
        if (!byDesign[key]) byDesign[key] = [];
        byDesign[key].push(line);
      });
      Object.entries(byDesign).forEach(([key, lines]) => {
        const first = lines[0] || {};
        if (!map[key]) {
          map[key] = {
            key: `D:${key}`,
            mode: 'design',
            title: first.DsnName || 'Unnamed design',
            code: String(first.DsnCode || ''),
            subtitle: first.ItmName || '',
            orders: [],
            allLines: [],
          };
        }
        map[key].orders.push({ ...order, __lines: lines, __qty: lines.reduce((sum, line) => sum + num(line?.Qty), 0) });
        map[key].allLines.push(...lines);
      });
    });
  } else {
    filteredOrders.forEach((order) => {
      const key = String(order?.ParCode || order?.ParName || 'NO_PARTY');
      if (!map[key]) {
        map[key] = {
          key: `P:${key}`,
          mode: 'customer',
          title: order?.ParName || 'Unnamed customer',
          code: String(order?.ParCode || ''),
          subtitle: '',
          orders: [],
          allLines: [],
        };
      }
      map[key].orders.push(order);
      map[key].allLines.push(...order.__lines);
    });
  }

  return Object.values(map)
    .map((group: any) => {
      const distinctDesigns = uniqueBy(
        group.allLines.map((line: Row) => ({ code: String(line?.DsnCode ?? ''), name: String(line?.DsnName ?? '').trim() })),
        (row: any) => row.code || normalized(row.name),
      );
      const totalQty = group.orders.reduce((sum: number, order: SumOrder) => sum + num(order.__qty), 0);
      const shadeAgg = aggregateShades(group.allLines);
      return {
        ...group,
        totalQty,
        shadeAgg,
        designCount: distinctDesigns.length,
        soCount: new Set(group.orders.map(orderKey)).size,
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty);
};

/** Customer-wise SO body: its lines grouped by design (Legacy renderCustomerOrderContents). */
export const designsOfOrder = (order: SumOrder) => {
  const designMap: Record<string, { DsnCode: any; DsnName: string; ItmName: string; lines: Row[] }> = {};
  order.__lines.forEach((line) => {
    const key = String(line?.DsnCode || line?.DsnName || 'NO_DESIGN');
    if (!designMap[key]) {
      designMap[key] = { DsnCode: line?.DsnCode, DsnName: line?.DsnName || 'Unnamed design', ItmName: line?.ItmName || '', lines: [] };
    }
    designMap[key].lines.push(line);
  });
  return Object.values(designMap);
};
