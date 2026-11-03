// FILE: src/components/YarnSalesOrderNEW/model.ts
// Pure helpers of the Yarn Sales Order module — no React, no HTTP, no storage.
// Every function here is a 1:1 port of the legacy rule it names, so the numbers,
// row merging and the save payload stay exactly as the legacy screens produce them.
//
// Legacy sources (components/YarnSalesOrder/):
//   index.tsx              browse dates / financial year / SO no + date fallbacks
//   PartyListScreen.tsx    selectParty() party shape
//   OrderSummaryScreen.tsx num, reSrNo, row merge, convertD1ToOrderItems, totals,
//                          validateBeforeSave, buildMainPayload, buildD1Payload
//   SalesOrderItemList / GradeList / ShadeList   "replace only" row edits
//   SalesOrderDetails.tsx  onSave() row building, stock payload

export type Row = Record<string, any>;

/** What the browse screen hands to every following step (legacy router params). */
export type OrderCtx = {
  prpcode: any;
  strcode: any;
  /** As legacy passes it on: '2026-2027' or '27' — always reduced with yy() before an API call. */
  yearno: any;
};

export type OrderMode = 'ADD' | 'EDIT' | 'VIEW';

/* ------------------------------------------------------------------ */
/* Numbers / text                                                      */
/* ------------------------------------------------------------------ */

/** Legacy num(): parseFloat without thousands separators, NaN -> 0. */
export const num = (v: any): number => {
  const n = parseFloat(String(v || 0).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

/** Legacy money(): en-IN with exactly 2 decimals. */
export const money = (value: any): string =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Legacy fmt(): fixed decimals as a string. */
export const fmt = (value: any, dec = 2): string => num(value).toFixed(dec);

export const toText = (v: any): string => String(v || '').trim();

/** Legacy `yearno ? yearno.slice(-2) : ''` (used before every API call). */
export const yy = (yearno: any): string => (yearno ? String(yearno).slice(-2) : '');

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** yyyymmdd — the browse filter date format. */
export const ymd = (d: Date): string => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;

export const todayYmd = (): string => ymd(new Date());

/** dd-mm-yyyy — the display / SO date format. */
export const dmy = (d: Date): string => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;

/** Legacy year list: this calendar year and the 4 before it, as 'YYYY-YYYY+1'. */
export const buildYearOptions = (now: Date = new Date()): string[] => {
  const y = now.getFullYear();
  const arr: string[] = [];
  for (let i = 0; i < 5; i++) arr.push(`${y - i}-${y - i + 1}`);
  return arr;
};

/** Legacy getFinancialYearDates(): 1 Apr -> today (current FY) or 31 Mar (other years). */
export const financialYearDates = (financialYear: string, today: Date = new Date()): { from: Date; to: Date } | null => {
  if (!financialYear) return null;
  const years = financialYear.split('-');
  const startYear = parseInt(years[0], 10);
  const endYear = parseInt(years[1], 10);
  const fyStartDate = new Date(startYear, 3, 1);
  const fyEndDate = new Date(endYear, 2, 31);
  const currentYear = today.getFullYear();
  const currentFinancialYear =
    today.getMonth() >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  if (financialYear === currentFinancialYear) return { from: fyStartDate, to: today };
  return { from: fyStartDate, to: fyEndDate };
};

/** Parses a legacy 'dd-mm-yyyy' SO date; null when it is not in that shape. */
const parseDmy = (text: any): Date | null => {
  if (!text) return null;
  const parts = String(text).split('-');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
};

/**
 * Legacy Delivery Date effect: SO date (or today) + delivery days.
 * Returns null when legacy leaves the current value untouched (blank / non numeric days).
 */
export const deliveryDateFor = (ddays: any, soDate: any): string | null => {
  if (ddays === '' || ddays === null || ddays === undefined) return null;
  const days = Number(ddays);
  if (isNaN(days)) return null;
  const baseDate = parseDmy(soDate) || new Date();
  baseDate.setDate(baseDate.getDate() + days);
  return dmy(baseDate);
};

/** Legacy Due Date effect: SO date (or today when missing / invalid) + party due days. */
export const dueDateFor = (dueDay: any, soDate: any): string | null => {
  const dueDays = Number(dueDay || 0);
  if (isNaN(dueDays)) return null;
  let baseDate = parseDmy(soDate);
  if (!baseDate || isNaN(baseDate.getTime())) baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + dueDays);
  return dmy(baseDate);
};

/**
 * Due Date picked by hand -> Due Days (whole days from the SO date, or today for a
 * new order). Returns null when the picked date is before that base date.
 */
export const dueDaysFor = (picked: Date, soDate: any): number | null => {
  let base = parseDmy(soDate);
  if (!base || isNaN(base.getTime())) base = new Date();
  const a = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());
  const b = Date.UTC(picked.getFullYear(), picked.getMonth(), picked.getDate());
  const days = Math.round((b - a) / 86400000);
  return days < 0 ? null : days;
};

/* ------------------------------------------------------------------ */
/* Browse list                                                         */
/* ------------------------------------------------------------------ */

export const getSODate = (item: Row) =>
  item.SODateDisplay ||
  item.SODtDisplay ||
  item.OrderDateDisplay ||
  item.SODate ||
  item.SODt ||
  item.OrderDate ||
  '-';

export const getSONo = (item: Row) => item.SONo || item.SO_No || item.OrderNo || item.PONo || '-';

export const isAuthorised = (item: Row) => item.AuthStatus === 'Authorised';

/** Legacy client-side filter that runs on top of the server search. */
export const filterOrders = (orders: Row[], search: string): Row[] => {
  const searchText = String(search || '').toLowerCase();
  return orders.filter(
    (item) =>
      String(getSONo(item)).toLowerCase().includes(searchText) ||
      String(item?.ParName || '').toLowerCase().includes(searchText) ||
      String(item?.ParCode || '').toLowerCase().includes(searchText) ||
      String(getSODate(item)).toLowerCase().includes(searchText),
  );
};

export type BrowseFilters = {
  prpcode: string;
  yearno: string;
  strcode: string;
  fromdate: string;
  todate: string;
  show_authorized: boolean;
};

export const defaultFilters = (): BrowseFilters => ({
  prpcode: '',
  yearno: '',
  strcode: '',
  fromdate: todayYmd(),
  todate: todayYmd(),
  show_authorized: false,
});

/* ------------------------------------------------------------------ */
/* Party                                                               */
/* ------------------------------------------------------------------ */

/** Legacy filter: party code or name contains the text. */
export const filterParties = (parties: Row[], search: string): Row[] => {
  const s = String(search || '').toLowerCase();
  return parties.filter(
    (item) =>
      String(item.acccode ?? '').toLowerCase().includes(s) ||
      String(item.accountname ?? '').toLowerCase().includes(s),
  );
};

/*
 * Party object — two separate addresses (Oct 2026), same as the web Sales Order:
 *   Billing  -> FAMSO.QtyKgs = FAMACCDA.SrNo (a row NUMBER). SP_FAMSOS rebuilds the text
 *               from that row as BADDRESS and the print shows it. Party object: QtyKgs +
 *               BillText (that row's text). New order: the party's DDefault = 1 row.
 *               Changed ONLY by "Change billing address". Party master fields Address /
 *               City / State / Cnty / Zip are the master address (shown when BillText is
 *               not known).
 *   Delivery -> FAMSO.DAdd / DCity / DState / DCnty / DZip (TEXT, no row number kept).
 *               Changed ONLY by "Change delivery address" — it never touches QtyKgs.
 *   (Bug fixed: a delivery pick used to set QtyKgs too, so the print showed the consignee
 *    as the party's billing address — order 510020407.)
 */

/**
 * Billing address text of a party-master row: its BAddress column.
 * Falls back to Address only when the response has no BAddress key at all (older API).
 */
export const masterBillingAddress = (party: Row): string =>
  party && Object.prototype.hasOwnProperty.call(party, 'BAddress') ? String(party.BAddress ?? '') : String(party?.Address ?? '');

/** Billing address fields of a party-master row (/api/accountbasic). */
export const billingFromMaster = (party: Row): Row => ({
  Address: masterBillingAddress(party),
  City: party?.City || '',
  State: party?.State || '',
  Cnty: party?.Cnty || '',
  Zip: party?.Zip || '',
});

/** Copy the billing address of a party-master row onto a party object (delivery fields untouched). */
export const withBillingAddress = (party: Row, master: Row): Row => ({
  ...party,
  ...billingFromMaster(master),
  // an order saved without the address SrNo (older app builds) gets it from the master
  QtyKgs: party?.QtyKgs || partyAddressSrNo(master),
});

/** Zip as shown: blank for '', '0' and legacy rows where the City was saved as DZip. */
export const cleanZip = (zip: any, city?: any): string => {
  const z = String(zip ?? '').trim();
  if (z === '' || z === '0') return '';
  if (city && z.toLowerCase() === String(city).trim().toLowerCase()) return '';
  return z;
};

/** "City, State, Country - Zip" (blank parts skipped). */
export const placeLine = (city: any, state: any, cnty: any, zip: any): string => {
  const place = [city, state, cnty].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ');
  const z = cleanZip(zip);
  return [place, z].filter(Boolean).join(' - ');
};

/** Address SrNo of a party-master row (/api/accountbasic `SrNo`); '' when it has none. */
export const partyAddressSrNo = (party: Row): string => {
  const v = party?.SrNo ?? party?.srno ?? party?.AddSrNo;
  return num(v) > 0 ? String(parseInt(String(v), 10)) : '';
};

/** Legacy selectParty(): the party object every later screen works with. */
export const buildSelectedParty = (party: Row, executives: Row[]): Row => {
  const executiveData = executives.find((item) => String(item.Code) === String(party.sexe));
  const billing = billingFromMaster(party);
  return {
    ParCode: party.acccode,
    ParName: party.accountname,
    ...billing,
    SExe: party.sexe || '',
    SExeName: party.SExeName || executiveData?.SalesExecutive || '',
    BAccCode: party.brkAcc || '',
    BAccName: party.brkname || '',
    DueDay: party.crday || '',
    // delivery address starts as the party master Address (legacy DAdd source)
    DAdd: party.Address || billing.Address,
    DCity: billing.City,
    DState: billing.State,
    DCnty: billing.Cnty,
    DZip: billing.Zip,
    // Web Sales Order (AllPartyData19) sets QtyKgs = party SrNo on party pick: it is the
    // party address SrNo the print looks up (FAMACCDA) for the M/S billing address.
    // Without it the order was saved with QtyKgs 0 and the print showed only the name.
    // SummaryStep then replaces it with the party's DDefault = 1 row (applyBillingAddress).
    QtyKgs: partyAddressSrNo(party),
    BillText: '',
    // party group — mobappsave writes GrpCode '' when the app does not send it
    GrpCode: party.GrpCode ?? '',
  };
};

/**
 * Legacy mobappshow -> party shown on the summary.
 * Delivery fields come from the order (DAdd ...). Billing fields are taken from `main` only
 * when the server sends them; SummaryStep then fills them from the party master.
 */
export const partyFromMain = (main: Row): Row => {
  const dCity = main.DCity || main.Station || '';
  return {
    ParCode: main.ParCode || '',
    ParName: main.ParName || '',
    SExe: main.SExe || '',
    SExeName: main.SExeName || '',
    Address: main.BAddress || main.BADDRESS || main.address || main.Address || '',
    City: main.city || main.City || '',
    State: main.state || main.State || '',
    Cnty: main.cnty || main.Cnty || '',
    Zip: main.zip || main.Zip || '',
    BAccCode: main.BAccCode || '',
    BAccName: main.BAccName || '',
    DueDay: main.DueDay || '',
    DueDate: main.DueDate || '',
    DAdd: main.DAdd || '',
    DCity: dCity,
    DState: main.DState || '',
    DCnty: main.DCnty || '',
    // legacy saved the City as DZip — not shown as a zip
    DZip: cleanZip(main.DZip, dCity),
    // BILLING address row (FAMACCDA SrNo -> BADDRESS) — goes back unchanged unless the
    // user changes the billing address
    QtyKgs: num(main.QtyKgs) > 0 ? String(parseInt(String(main.QtyKgs), 10)) : '',
    BillText: num(main.QtyKgs) > 0 ? String(main.BADDRESS || main.BAddress || '').replace(/\r\n|\r|\n/g, ', ').trim() : '',
    GrpCode: main.GrpCode ?? '',
  };
};

/**
 * Sales Party (second party, shown after the main party) = the ERP "Print Party".
 * FAMSO.PrintParty holds its account code and FAMSO.PrintAdd its billing address text
 * (same columns the web Sales Order saves in saveso / modifyso). PrintPartyName is the
 * FAMAcc name the backend may join in; when it does not, SummaryStep fills the name
 * from the party master.
 */
export const SALES_PARTY_KEYS = { code: 'PrintParty', name: 'PrintPartyName', address: 'PrintAdd' } as const;

/**
 * Address text saved in PrintAdd — same shape the web Sales Order builds
 * (SaleDlvAddressSelect.SetAdd): "Add, City, State, Zip".
 */
export const printAddressText = (party: Row | null): string => {
  if (!party) return '';
  const part = (v: any, comma: boolean) => {
    const t = toText(v);
    return t === '' ? '' : comma ? `${t},` : t;
  };
  return `${part(party.Address, true)} ${part(party.City, true)} ${part(party.State, true)} ${part(cleanZip(party.Zip), false)}`.trim();
};

/** Sales Party saved on an order (null when the order has none). */
/** Value of `key` in `row`, matching the key without case (the server may send SalesParCode / salesparcode / SALESPARCODE). */
const pickCI = (row: Row, key: string): any => {
  if (!row) return undefined;
  if (row[key] !== undefined) return row[key];
  const k = Object.keys(row).find((x) => x.toLowerCase() === key.toLowerCase());
  return k ? row[k] : undefined;
};

export const salesPartyFromMain = (main: Row): Row | null => {
  const code = pickCI(main, SALES_PARTY_KEYS.code);
  if (code === undefined || code === null || String(code).trim() === '' || String(code).trim() === '0') return null;
  return {
    ParCode: String(code).trim(),
    ParName: pickCI(main, SALES_PARTY_KEYS.name) || '',
    // saved PrintAdd shown until the party master fills the split billing fields
    Address: pickCI(main, SALES_PARTY_KEYS.address) || '',
  };
};

/** Sales Party picked from the party list: code, name and billing address. */
export const salesPartyFromPick = (party: Row): Row => ({
  ParCode: party?.ParCode,
  ParName: party?.ParName || '',
  Address: party?.Address || '',
  City: party?.City || '',
  State: party?.State || '',
  Cnty: party?.Cnty || '',
  Zip: party?.Zip || '',
});

/**
 * Sales Party of the order: only what the user picked. Not picked = blank
 * (it no longer defaults to the main party). `party` is kept for the call signature.
 */
export const effectiveSalesParty = (salesParty: Row | null, _party?: Row | null): Row | null =>
  salesParty?.ParCode ? salesParty : null;

/** "Select Delivery Address" search: address, city, state, country or zip contains the text. */
export const filterAddresses = (list: Row[], search: string): Row[] => {
  const s = String(search || '').trim().toLowerCase();
  if (!s) return list;
  return list.filter((a) =>
    [a?.DAdd, a?.DCity, a?.DState, a?.DCnty, a?.DZip].some((v) => String(v ?? '').toLowerCase().includes(s)),
  );
};

/** Sales executive picked on the order -> fields stored on the party object (SExe is what is saved). */
export const applyExecutive = (party: Row | null, exe: Row): Row => ({
  ...(party || {}),
  SExe: exe?.Code ?? '',
  SExeName: exe?.SalesExecutive || '',
});

/** "Change delivery address": ONLY the delivery fields (QtyKgs / billing is not touched). */
export const applyDeliveryAddress = (party: Row | null, address: Row): Row => ({
  ...(party || {}),
  DAdd: address?.DAdd || '',
  DCity: address?.DCity || '',
  DState: address?.DState || '',
  DCnty: address?.DCnty || '',
  DZip: cleanZip(address?.DZip),
});

/** Text of a /api/getaddress row, web format "DAdd, DCity, DState, DZip" ('0' parts skipped). */
export const addressRowText = (row: Row | null | undefined): string => {
  if (!row) return '';
  const part = (v: any) => {
    const t = toText(v);
    return t === '0' ? '' : t;
  };
  return [part(row.DAdd), part(row.DCity), part(row.DState), cleanZip(row.DZip)].filter(Boolean).join(', ');
};

/** "Change billing address" (or the default row on a new order): ONLY QtyKgs + its text. */
export const applyBillingAddress = (party: Row | null, address: Row): Row => ({
  ...(party || {}),
  QtyKgs: num(address?.SrNo) > 0 ? String(Math.round(num(address.SrNo))) : '',
  BillText: addressRowText(address),
});

/** Billing address text to show: the QtyKgs row text, else the party master address. */
export const billingTextOf = (party: Row | null): string =>
  toText(party?.BillText) || toText(party?.Address);

/**
 * Default billing row of a party from its /api/getaddress rows:
 *   1. the first DDefault = 1 row (lowest SrNo),
 *   2. else the row the party list pointed at (party SrNo / QtyKgs),
 *   3. else the row whose text is the party master address.
 * null when none fits (the user picks one by hand).
 */
export const pickDefaultAddress = (rows: Row[], party: Row | null): Row | null => {
  const list = (rows || []).filter((r) => num(r?.SrNo) > 0).sort((a, b) => num(a.SrNo) - num(b.SrNo));
  const def = list.find((r) => num(r?.DDefault) === 1);
  if (def) return def;
  const sr = num(party?.QtyKgs) || num(party?.SrNo);
  if (sr > 0) {
    const bySr = list.find((r) => num(r.SrNo) === sr);
    if (bySr) return bySr;
  }
  const masterAdd = toText(party?.Address).toUpperCase();
  if (masterAdd) {
    const byText = list.find((r) => toText(r.DAdd).toUpperCase() === masterAdd);
    if (byText) return byText;
  }
  return null;
};

export const initials = (name: any): string => {
  const words = String(name || '').trim().split(' ');
  let out = '';
  if (words.length >= 2) out = (words[0][0] || '') + (words[1][0] || '');
  else out = String(name || 'P').substring(0, 2);
  return out.toUpperCase();
};

/* ------------------------------------------------------------------ */
/* Order rows                                                          */
/* ------------------------------------------------------------------ */

export const createLineId = () => `LINE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const makeRowKey = (row: Row) => `${row.ItmCode}_${row.GrdCode}_${row.ShdCode}`;

export const reSrNo = (rows: Row[]): Row[] =>
  rows.map((row, index) => ({
    ...row,
    SrNo: index + 1,
    LineId: row.LineId || createLineId(),
  }));

/**
 * Legacy OrderSummaryScreen "completedRows" handler.
 *   isEdit  -> the incoming list replaces everything (only re-numbered).
 *   !isEdit -> incoming rows are appended; a row with a LineId that already
 *              exists replaces it, a row with the same Item + Grade + Shade is
 *              merged (Qty + Pcs added, Rate / Remark from the new row,
 *              Amount = new Qty * new Rate).
 */
export const mergeCompletedRows = (prev: Row[], incomingRows: Row[], isEdit: boolean): Row[] => {
  let next = [...prev];
  if (isEdit) {
    return reSrNo(incomingRows.map((row) => ({ ...row, LineId: row.LineId || createLineId() })));
  }
  incomingRows.forEach((rawRow) => {
    const newRow: Row = { ...rawRow, LineId: rawRow.LineId || createLineId() };

    const lineExists = next.findIndex((x) => String(x.LineId) === String(newRow.LineId));
    if (lineExists >= 0) {
      next[lineExists] = { ...newRow };
      return;
    }

    const existsIndex = next.findIndex((oldRow) => makeRowKey(oldRow) === makeRowKey(newRow));
    if (existsIndex >= 0) {
      const newQty = num(next[existsIndex].Qty) + num(newRow.Qty);
      const newPcs = num(next[existsIndex].Pcs) + num(newRow.Pcs);
      next[existsIndex] = {
        ...next[existsIndex],
        Qty: newQty,
        Pcs: newPcs,
        Rate: num(newRow.Rate),
        Amount: newQty * num(newRow.Rate),
        Remark: newRow.Remark || next[existsIndex].Remark || '',
      };
    } else {
      next.push(newRow);
    }
  });
  next = reSrNo(next);
  return next;
};

/**
 * What the summary shows after a picker flow returns its full working list.
 * Legacy opened a fresh summary screen (no rows) and fed the list through the
 * handler above, so the result is the merge of the list into an empty order.
 */
export const applyWorkingRows = (workingRows: Row[], isEdit: boolean): Row[] =>
  mergeCompletedRows([], workingRows, isEdit);

/** Legacy convertD1ToOrderItems(): saved detail rows -> screen rows (raw row kept for the save payload). */
export const convertD1ToOrderItems = (d1Rows: Row[]): Row[] =>
  (d1Rows || []).map((row, index) => ({
    LineId: `DB_${row.UId}_${row.SrNo || index + 1}`,

    SrNo: Number(row.SrNo || index + 1),
    UId: row.UId,
    StrCode: row.StrCode,

    ItmCode: String(row.ItmCode || ''),
    ItmName: row.ItmName || '',
    MItmCode: row.MItmCode || row.ItmCode || '',

    GrdCode: String(row.GrdCode || ''),
    GrdName: row.GrdName || '',

    ShdCode: String(row.ShdCode || ''),
    ShdName: row.ShdName || '',

    Qty: num(row.Qty),
    Pcs: num(row.QtyPcs),
    Rate: num(row.UnitRate),
    Amount: num(row.Amount),

    UOM: row.UOM || '',
    Denier: row.Denier || '',
    HsnCode: row.HsnCode || '',
    HSNName: row.HSNName || '',

    Remark: row.Remark1 || row.Remark || '',
    IsDyeing: row.IsDyeing || 0,

    Raw: row,
  }));

/** Legacy same-line test of the "replace item / grade / shade only" edits. */
const sameLine = (row: Row, oldRow: Row) =>
  String(row.LineId || '') === String(oldRow.LineId || '') || Number(row.SrNo || 0) === Number(oldRow.SrNo || 0);

/** Pencil on Item: only the item fields of that row change. */
export const replaceItemOnRow = (workingRows: Row[], oldRow: Row, item: Row): Row[] =>
  workingRows.map((row) => {
    if (!sameLine(row, oldRow)) return row;
    return {
      ...row,
      ItmCode: item.ItmCode,
      ItmName: item.ItmName,
      MItmCode: item.MItmCode || item.ItmCode,
      UOM: item.UOM || row.UOM || '',
      Denier: item.Denier || row.Denier || '',
      HsnCode: item.HsnCode || row.HsnCode || '',
    };
  });

/** Pencil on Grade: only the grade fields of that row change. */
export const replaceGradeOnRow = (workingRows: Row[], oldRow: Row, grade: Row): Row[] =>
  workingRows.map((row) => {
    if (!sameLine(row, oldRow)) return row;
    return {
      ...row,
      GrdCode: grade.GrdCode,
      GrdName: grade.GrdName || grade.GradeName || '',
    };
  });

/** Pencil on Shade: only the shade fields of that row change. */
export const replaceShadeOnRow = (workingRows: Row[], oldRow: Row, shade: Row | undefined): Row[] =>
  workingRows.map((row) => {
    if (!sameLine(row, oldRow)) return row;
    return {
      ...row,
      ShdCode: shade?.ShdCode,
      ShdName: shade?.ShdName || shade?.ShadeName || '',
    };
  });

/** Item picked on the item list -> what the grade / shade / details steps carry. */
export const selectedItemFromRow = (row: Row): Row => ({
  ItmCode: row.ItmCode,
  ItmName: row.ItmName,
  MItmCode: row.MItmCode || row.ItmCode,
  UOM: row.UOM || '',
  Denier: row.Denier || '',
  HsnCode: row.HsnCode || '',
  Raw: row,
});

/** Legacy AddNewItemScreen: a not-yet-created item travels with code '-1'. */
export const buildNewItem = (itemName: string, remark: string): Row => ({
  ItmCode: '-1',
  ItmName: itemName,
  MItmCode: '-1',
  UOM: '',
  Denier: '',
  HsnCode: '',
  Remark: remark,
});

/* ---- list filters with the "currently saved" entry pinned on top ---- */

const pinOld = (arr: Row[], code: any, keyOf: (r: Row) => any) =>
  arr.sort((a, b) => {
    if (String(keyOf(a)) === String(code)) return -1;
    if (String(keyOf(b)) === String(code)) return 1;
    return 0;
  });

export const filterItems = (items: Row[], search: string, editMode: boolean, oldRow: Row | null): Row[] => {
  const s = String(search || '').toLowerCase();
  let arr: Row[] = [...items];
  const pin = editMode && !!oldRow?.ItmCode;
  if (pin && !arr.some((item) => String(item.ItmCode) === String(oldRow!.ItmCode))) {
    arr.unshift({
      ItmCode: oldRow!.ItmCode,
      ItmName: oldRow!.ItmName,
      MItmCode: oldRow!.MItmCode || oldRow!.ItmCode,
      __oldSelected: true,
    });
  }
  arr = arr.filter((item) =>
    [item.ItmCode, item.ItmName, item.MItmCode, item.UOM, item.Denier, item.HsnCode]
      .map(toText)
      .join('\n')
      .toLowerCase()
      .includes(s),
  );
  return pin ? pinOld(arr, oldRow!.ItmCode, (r) => r.ItmCode) : arr;
};

export const filterGrades = (grades: Row[], search: string, editMode: boolean, oldRow: Row | null): Row[] => {
  const s = String(search || '').toLowerCase();
  let arr: Row[] = [...grades];
  const pin = editMode && !!oldRow?.GrdCode;
  if (pin && !arr.some((item) => String(item.GrdCode) === String(oldRow!.GrdCode))) {
    arr.unshift({
      GrdCode: oldRow!.GrdCode,
      GrdName: oldRow!.GrdName,
      GradeName: oldRow!.GrdName,
      __oldSelected: true,
    });
  }
  arr = arr.filter((item) =>
    [item.GrdCode, item.GrdName, item.GradeName].map(toText).join('\n').toLowerCase().includes(s),
  );
  return pin ? pinOld(arr, oldRow!.GrdCode, (r) => r.GrdCode) : arr;
};

/* ---- details step ---- */

/** Legacy amount on the details screen: Qty * Rate, 2 decimals (string). */
export const lineAmount = (qty: any, rate: any): string => (num(qty) * num(rate)).toFixed(2);

export type DetailsInput = {
  ctx: OrderCtx;
  mode: OrderMode;
  uid: any;
  selectedItem: Row;
  selectedGrade: Row;
  selectedShades: Row[];
  workingRows: Row[];
  qty: string;
  pcs: string;
  rate: string;
  remark: string;
  remark3: string;
  isDyeing: number;
};

/** Legacy field checks of "Add This Shade". Returns [title, message] or null when valid. */
export const validateDetails = (input: DetailsInput): [string, string] | null => {
  if (!input.selectedItem?.ItmCode) return ['Required', 'Item missing'];
  if (!input.selectedGrade?.GrdCode) return ['Required', 'Grade missing'];
  if (!input.selectedShades || input.selectedShades.length === 0) return ['Required', 'Please select shade'];
  if (num(input.qty) <= 0) return ['Required', 'Enter valid qty'];
  if (num(input.rate) <= 0) return ['Required', 'Enter valid rate'];
  return null;
};

/**
 * Legacy SalesOrderDetails.onSave() (add): one new row per selected shade, the
 * same Qty / Pcs / Rate / Remark on each. A shade whose Item + Grade + Shade is
 * already on the order is skipped (not added twice).
 */
export const addShadeRows = (input: DetailsInput): { rows: Row[]; lastRow: Row | null } => {
  const stableUid = Number(input.uid || 0);
  const stableMode = stableUid > 0 ? 'EDIT' : input.mode;
  const amount = lineAmount(input.qty, input.rate);
  const { selectedItem, selectedGrade, ctx } = input;

  const updatedRows = [...input.workingRows];
  let latestRow: Row | null = null;

  input.selectedShades.forEach((shadeItem) => {
    const newRow: Row = {
      LineId: createLineId(),
      UId: stableUid,
      Mode: stableMode,
      SrNo: updatedRows.length + 1,
      PrpCode: ctx.prpcode,
      StrCode: ctx.strcode,
      YearNo: ctx.yearno,
      ItmCode: selectedItem?.ItmCode || '',
      ItmName: selectedItem?.ItmName || '',
      Denier: selectedItem.Denier,
      UOM: selectedItem.UOM,
      HsnCode: selectedItem.HsnCode,
      MItmCode: selectedItem?.MItmCode || selectedItem?.ItmCode || '',
      GrdCode: selectedGrade?.GrdCode || '',
      GrdName: selectedGrade?.GrdName || '',
      ShdCode: shadeItem?.ShdCode || '',
      ShdName: shadeItem?.ShdName || shadeItem?.ShadeName || '',
      Qty: num(input.qty),
      Pcs: num(input.pcs),
      Rate: num(input.rate),
      Amount: num(amount),
      Remark: input.remark,
      Remark3: input.remark3,
      IsDyeing: input.isDyeing ? 1 : 0,
      RowKey: `${selectedItem?.ItmCode || ''}_${selectedGrade?.GrdCode || ''}_${shadeItem?.ShdCode || ''}`,
    };

    latestRow = newRow;

    const existsIndex = updatedRows.findIndex((x) => makeRowKey(x) === makeRowKey(newRow));
    if (existsIndex >= 0) return;
    updatedRows.push(newRow);
  });

  return { rows: updatedRows, lastRow: latestRow };
};

/**
 * Row menu > "Edit qty / rate": the same line keeps its item, grade, shade and
 * every saved field; only Qty, Pcs, Rate, Amount, Remark and Stock Sales change.
 */
export const updateRowDetails = (
  workingRows: Row[],
  oldRow: Row,
  values: { qty: string; pcs: string; rate: string; remark: string; remark3: string; isDyeing: number },
): { rows: Row[]; lastRow: Row } => {
  const amount = lineAmount(values.qty, values.rate);
  let lastRow: Row = oldRow;
  const rows = workingRows.map((row) => {
    if (String(row.LineId) !== String(oldRow.LineId)) return row;
    lastRow = {
      ...row,
      Qty: num(values.qty),
      Pcs: num(values.pcs),
      Rate: num(values.rate),
      Amount: num(amount),
      Remark: values.remark,
      Remark3: values.remark3,
      IsDyeing: values.isDyeing ? 1 : 0,
    };
    return lastRow;
  });
  return { rows, lastRow };
};

/**
 * Pencil on Qty / Pcs / Rate of a summary row: only that value changes, Amount is
 * recalculated (Qty x Rate, 2 decimals) — every other field of the row is kept.
 */
export const updateRowValue = (rows: Row[], lineId: any, field: 'Qty' | 'Pcs' | 'Rate', value: string): Row[] =>
  rows.map((row) => {
    if (String(row.LineId) !== String(lineId)) return row;
    const next: Row = { ...row, [field]: num(value) };
    next.Amount = num(lineAmount(next.Qty, next.Rate));
    return next;
  });

/** Search box on the order rows: item / grade / shade code or name, remark. */
export const filterOrderRows = (rows: Row[], search: string): Row[] => {
  const s = toText(search).toLowerCase();
  if (!s) return rows;
  return rows.filter((row) =>
    [row.ItmCode, row.ItmName, row.GrdCode, row.GrdName, row.ShdCode, row.ShdName, row.Denier, row.Remark]
      .map(toText)
      .join('\n')
      .toLowerCase()
      .includes(s),
  );
};

/** A row whose stock can be asked for (a not-yet-created item '-1' has none). */
export const canAskStock = (row: Row) =>
  !!row?.ItmCode && !!row?.GrdCode && !!row?.ShdCode && String(row.ItmCode) !== '-1';

/** Legacy get_so_current_stock body parts (d1 = rows being entered, selectedd1 = rows already on the order). */
export const buildStockLines = (
  selectedItem: Row | null,
  selectedGrade: Row | null,
  selectedShades: Row[],
  workingRows: Row[],
  oldRow: Row | null,
) => {
  const lastRow = workingRows?.length > 0 ? workingRows[workingRows.length - 1] : null;
  const lastSrNo = Number(lastRow?.SrNo || 0);

  const d1 = selectedShades.map((shadeItem, index) => ({
    srno: oldRow?.SrNo ? Number(oldRow?.SrNo) : lastSrNo + index + 1,
    itmcode: selectedItem?.ItmCode || oldRow?.ItmCode || '',
    grdcode: selectedGrade?.GrdCode || oldRow?.GrdCode || '',
    shdcode: shadeItem?.ShdCode || oldRow?.ShdCode || '',
  }));

  const selectedd1 =
    workingRows?.length > 0
      ? workingRows.map((row) => ({
          srno: row?.SrNo || 0,
          itmcode: row?.ItmCode || '',
          grdcode: row?.GrdCode || '',
          shdcode: row?.ShdCode || '',
        }))
      : [];

  return { d1, selectedd1 };
};

export const totalStockQty = (stockRows: Row[]): number =>
  (stockRows || []).reduce((sum, item) => sum + Number(item?.StkQty || 0), 0);

/* ------------------------------------------------------------------ */
/* Summary totals / validation / save payload                          */
/* ------------------------------------------------------------------ */

export type Totals = {
  itemCount: number;
  shadeCount: number;
  /** 3 decimals, string (legacy). */
  totalQty: string;
  totalPcs: number;
  /** 2 decimals, string (legacy). */
  totalAmount: string;
};

export const computeTotals = (rows: Row[]): Totals => {
  const totalQty = rows.reduce((s, x) => s + num(x.Qty), 0);
  const totalPcs = rows.reduce((s, x) => s + num(x.Pcs), 0);
  const totalAmount = rows.reduce((s, x) => s + num(x.Amount), 0);
  return {
    itemCount: rows.length,
    shadeCount: rows.length,
    totalQty: totalQty.toFixed(3),
    totalPcs,
    totalAmount: totalAmount.toFixed(2),
  };
};

/** Legacy header amounts (the Discount / Tax inputs are not shown, their loaded values still apply). */
export const computeAmounts = (totals: Totals, discount: any, tax: any) => {
  const discountAmt = num(discount);
  const taxPercent = num(tax);
  const taxableAmount = Number(totals.totalAmount) - discountAmt;
  const taxAmt = (taxableAmount * taxPercent) / 100;
  const grandTotal = taxableAmount + taxAmt;
  return { discountAmt, taxPercent, taxableAmount, taxAmt, grandTotal };
};

/**
 * Legacy validateBeforeSave(), with Due Days in place of Delivery Days.
 * Due Days must be a whole number >= 0 (0 = due on the SO date is allowed).
 * Returns [title, message] or null when the order can be saved.
 */
export const validateOrder = (party: Row | null, dueDays: any, rows: Row[]): [string, string] | null => {
  if (!party?.ParCode) return ['Required', 'Please select party.'];
  const dd = toText(dueDays);
  if (dd === '') return ['Required', 'Due Days cannot be blank.'];
  if (!/^\d+$/.test(dd)) return ['Invalid Due Days', 'Enter Due Days as a whole number.'];
  if (rows.length === 0) return ['Required', 'Please add at least one item.'];
  for (const row of rows) {
    if (!row.ItmCode || !row.GrdCode || !row.ShdCode) return ['Invalid Row', 'Item/design/shade missing.'];
    if (num(row.Qty) <= 0) return ['Invalid Qty', `${row.ItmName} - ${row.ShdName}`];
    if (num(row.Rate) <= 0) return ['Invalid Rate', `${row.ItmName} - ${row.ShdName}`];
  }
  return null;
};

export type SaveInput = {
  mode: OrderMode;
  uid: any;
  ctx: OrderCtx;
  party: Row | null;
  rows: Row[];
  discount: any;
  tax: any;
  remark: string;
  /** Due Days entered on the order (replaces the old Delivery Days input). */
  dueDays: any;
  dueDate: string;
  /** Sales Party picked after the main party (null = none, saved blank). */
  salesParty: Row | null;
  /** Free-text party reference saved in main.ParRef. */
  partyRef: string;
  /** mobappshow `main` of a saved order (null for a new order). */
  rawMain: Row | null;
  rawTax: Row[];
  rawExp: Row | null;
  rawExtra: Row;
};

/**
 * Entry type of a new order. >>> CONFIRM: must exist in FAMEType for the property
 * (SELECT EntType FROM FAMEType WHERE PrpCode = '...'). The web order 510000351 has 'G02';
 * mobappsave's own default 'G2' left mobile orders without TaxStru / EntName.
 */
export const DEFAULT_ENT_TYPE = 'G02';

/** Legacy buildMainPayload() — same keys, same value sources, same fallbacks. */
export const buildMainPayload = (input: SaveInput): { main: Row; newsoparty: Row[] } => {
  const { mode, uid, ctx, party: currentParty, remark, dueDays, partyRef } = input;
  const dueDayText = toText(dueDays);
  const salesParty = effectiveSalesParty(input.salesParty, currentParty);
  const totals = computeTotals(input.rows);
  const { discountAmt, taxAmt, grandTotal } = computeAmounts(totals, input.discount, input.tax);

  const base: Row = uid > 0 && input.rawMain ? { ...input.rawMain } : {};
  const yno = yy(ctx.yearno);

  const isNewParty = currentParty?.ParCode === '-1';
  const newsoparty: Row[] = [];
  if (isNewParty) {
    newsoparty.push({
      ParCode: currentParty?.ParCode || '-1',
      ParName: currentParty?.ParName || '',
      Address: currentParty?.Address || '',
      City: currentParty?.City || '',
      State: currentParty?.State || '',
      Cnty: currentParty?.Cnty || 'INDIA',
      Zip: currentParty?.Zip || '',
      Tel1: currentParty?.Tel1 || '',
      GSTIN: currentParty?.GSTIN || '',
      SExe: currentParty?.SExe || '',
      SExeName: currentParty?.SExeName || '',
      PrintName: currentParty?.PrintName || '',
      Remark: currentParty?.Remark || '',
    });
  }

  const main: Row = {
    ...base,

    UId: uid || base.UId || 0,
    Mode: mode,

    PrpCode: ctx.prpcode || base.PrpCode || '',
    StrCode: ctx.strcode || base.StrCode || '002',
    YearNo: yno || base.YearNo || '',

    ParCode: currentParty?.ParCode || base.ParCode || '',
    ParName: currentParty?.ParName || base.ParName || '',

    SExe: currentParty?.SExe || base.SExe || '',

    BAccCode: currentParty?.BAccCode || base?.BAccCode || '',
    BAccName: currentParty?.BAccName || base?.BAccName || '',
    DueDay: dueDayText !== '' ? dueDayText : base?.DueDay || '',
    DueDate: input.dueDate || base.DueDate || '',

    // blank when no Sales Party is picked (or it was cleared on a saved order)
    [SALES_PARTY_KEYS.code]: salesParty?.ParCode || '',
    [SALES_PARTY_KEYS.name]: salesParty?.ParName || '',
    // A saved order keeps its own PrintAdd (on the web it can be any delivery address of
    // the Print Party) as long as the same Print Party stays; a new / changed one gets
    // its master address.
    [SALES_PARTY_KEYS.address]: !salesParty?.ParCode
      ? ''
      : toText(base[SALES_PARTY_KEYS.code]) === toText(salesParty.ParCode) && toText(base[SALES_PARTY_KEYS.address]) !== ''
        ? base[SALES_PARTY_KEYS.address]
        : printAddressText(salesParty),

    GrsAmt: fmt(totals.totalAmount),
    DisAmt: fmt(discountAmt),
    NDisAmt: fmt(discountAmt),
    TDisAmt: fmt(discountAmt),

    TaxAmt: fmt(taxAmt),
    NTaxAmt: fmt(taxAmt),
    TTaxAmt: fmt(taxAmt),
    GSTAmt: fmt(taxAmt),

    NetAmt: fmt(grandTotal),
    D1NetAmt: fmt(totals.totalAmount) || '.00',

    Remark: remark || '',
    ParRef: partyRef || '',
    // Delivery Days is no longer entered: a saved order keeps its own value, a new one
    // sends '0' (never '' — DDays is numeric; the web leaves it 0 for Rayons).
    DDays: toText(base.DDays) !== '' ? base.DDays : '0',

    // party group (web: party GrpCode); mobappsave writes '' when it is missing
    GrpCode: toText(currentParty?.GrpCode) || base.GrpCode || '',

    // Delivery address (falls back to the billing address when none is set).
    DAdd: currentParty?.DAdd || currentParty?.Address || base.DAdd || '',
    DCity: currentParty?.DCity || currentParty?.City || base.DCity || '',
    DZip: currentParty ? cleanZip(currentParty.DZip) : base.DZip || '',
    DState: currentParty ? currentParty.DState || '' : base.DState || '',
    DCnty: currentParty ? currentParty.DCnty || '' : base.DCnty || '',
    Station: currentParty?.DCity || currentParty?.City || base.Station || '',

    Status: base.Status || 'P',
    // mobappsave falls back to 'G2' when this is blank; the web saves 'G02'.
    EntType: base.EntType || DEFAULT_ENT_TYPE,
    TaxStru: base.TaxStru || '',

    SONo: uid > 0 ? base.SONo : '',
    SODate: uid > 0 ? base.SODate : '',

    // BILLING address row (number). A delivery pick never changes it. 0 = none.
    QtyKgs: num(currentParty?.QtyKgs) > 0 ? Math.round(num(currentParty?.QtyKgs)) : Math.round(num(base.QtyKgs)),
  };

  return { main, newsoparty };
};

/** Legacy buildD1Payload() — detail rows plus the list of not-yet-created items (ItmCode '-1'). */
export const buildD1Payload = (input: SaveInput): { d1: Row[]; newsoitem: Row[] } => {
  const { uid, ctx } = input;
  const newsoitem: Row[] = [];
  const uniqueKeys = new Set<string>();

  const d1 = reSrNo(input.rows).map((row, index) => {
    const raw: Row = row.Raw || {};

    const isNewItem = row.ItmCode === '-1';
    if (isNewItem) {
      const key = `${row.LineId || index + 1}_${row.ItmCode}_${row.ItmName}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        newsoitem.push({
          SrNo: index + 1,
          ItmCode: row.ItmCode || '-1',
          ItmName: row.ItmName || '',
          MItmCode: row.MItmCode || '-1',
          UOM: row.UOM || '',
          Denier: row.Denier || '',
          HsnCode: row.HsnCode || '',
          Remark: row.Remark || '',
        });
      }
    }

    return {
      ...raw,

      UId: uid || raw.UId || 0,
      SrNo: index + 1,
      StrCode: row.StrCode || raw.StrCode || ctx.strcode || '002',

      ItmCode: row.ItmCode || '',
      MItmCode: row.MItmCode || raw.MItmCode || row.ItmCode || '',
      ItmName: row.ItmName || raw.ItmName || '',

      GrdCode: row.GrdCode || '',
      GrdName: row.GrdName || raw.GrdName || '',

      ShdCode: row.ShdCode || '',
      ShdName: row.ShdName || raw.ShdName || '',

      Denier: row.Denier || raw.Denier || '',
      UOM: row.UOM || raw.UOM || '',

      Qty: fmt(row.Qty, 3),
      QtyPcs: String(num(row.Pcs)),
      UnitRate: fmt(row.Rate, 5),
      Amount: fmt(row.Amount),

      Remark1: row.Remark || raw.Remark1 || '',
      Remark2: raw.Remark2 || '',
      Remark3: row.Remark3 ?? raw.Remark3 ?? '',
      Remark4: raw.Remark4 || '',
      Remark5: raw.Remark5 || '',

      PkgQty: raw.PkgQty || '1.000',
      PkgRate: raw.PkgRate || '.00000',
      AmtCalc: raw.AmtCalc || 'U',

      MerCode: raw.MerCode || '0',
      MerName: raw.MerName || '0',

      DisPer: raw.DisPer || '.00',
      DisAmt: raw.DisAmt || '.00',

      CGSTPer: raw.CGSTPer || '.00',
      CGSTAmt: raw.CGSTAmt || '.00',

      SGSTPer: raw.SGSTPer || '.00',
      SGSTAmt: raw.SGSTAmt || '.00',

      IGSTPer: raw.IGSTPer || '.00',
      IGSTAmt: raw.IGSTAmt || '.00',

      D1NetAmt: fmt(row.Amount) || '.00',

      HsnCode: row.HsnCode || raw.HsnCode || '',
      HSNName: row.HSNName || raw.HSNName || '',
      IsDyeing: row.IsDyeing || 0,
    };
  });

  return { d1, newsoitem };
};

/** Legacy saveOrder() body for POST /api/mobappsave (key order kept). */
export const buildSavePayload = (input: SaveInput): Row => {
  const { main, newsoparty } = buildMainPayload(input);
  const { d1, newsoitem } = buildD1Payload(input);
  const { uid } = input;
  return {
    Mode: input.mode,
    UId: uid || 0,
    main,
    d1,
    tax: uid > 0 && Array.isArray(input.rawTax) ? input.rawTax.map((t) => ({ ...t })) : [],
    exp: uid > 0 && input.rawExp ? { ...input.rawExp } : {},
    newsoitem,
    newsoparty,
    extra: input.rawExtra,
  };
};

/** Legacy mobappshow response -> the pieces the summary keeps. Returns null when no order came back. */
export const parseOrderResponse = (resData: any) => {
  const data = resData?.response || resData?.data || resData || {};
  const main: Row = Array.isArray(data?.main) ? data.main[0] || {} : data?.main || {};
  const d1: Row[] = Array.isArray(data?.d1) ? data.d1 : [];
  if (!main?.UId) return null;
  return {
    main,
    rows: reSrNo(convertD1ToOrderItems(d1)),
    rawTax: (Array.isArray(data?.tax) ? data.tax : []) as Row[],
    rawExp: (Array.isArray(data?.exp) ? data.exp[0] || null : data?.exp || null) as Row | null,
    rawExtra: {
      taxacc: data?.taxacc || [],
      crlimit: data?.crlimit || [],
      prpdetail: data?.prpdetail || [],
      lockdata: data?.lockdata || null,
      modulerights: data?.modulerights || [],
      defshdcode: data?.defshdcode || '',
    } as Row,
    discount: String(num(main.DisAmt || main.TDisAmt || main.NDisAmt || 0)),
    tax: String(num(main.TaxPercent || main.TaxPer || 0)),
    party: partyFromMain(main),
    salesParty: salesPartyFromMain(main),
  };
};

export const saveTimestamp = (): string =>
  new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
