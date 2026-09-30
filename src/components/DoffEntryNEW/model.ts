// FILE: src/components/DoffEntryNEW/model.ts
// Pure helpers for Doff Entry — every function is a 1:1 port of the legacy
// logic in src/components/DoffEntry/index.tsx (date formats, validations,
// tare/net calculation, merged "add" payload, edit/delete payload shapes).

export type Row = Record<string, any>;

export const TXNTYPE = 'mobile_doff_entry';

export const str = (v: any): string => (v === null || v === undefined ? '' : String(v));

/* ------------------------------- dates ---------------------------------- */

/** 'YYYYMMDD' → Date (null when not 8 chars). Legacy parseProductionDate. */
export const parseProductionDate = (proddate: any): Date | null => {
  if (!proddate || String(proddate).length !== 8) return null;
  const s = String(proddate);
  const year = parseInt(s.substring(0, 4), 10);
  const month = parseInt(s.substring(4, 6), 10) - 1;
  const day = parseInt(s.substring(6, 8), 10);
  return new Date(year, month, day);
};

/** 'YYYYMMDD' → 'DD/MM/YYYY' ('-' when not 8 chars). */
export const getDisplayDateFromYYYYMMDD = (dateStr: any): string => {
  if (!dateStr || String(dateStr).length !== 8) return '-';
  const s = String(dateStr);
  return `${s.substring(6, 8)}/${s.substring(4, 6)}/${s.substring(0, 4)}`;
};

/** Date → 'DD/MM/YYYY' (payload format for proddoffadd / END doff). */
export const formatDateDDMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

/** Date → 'HH.mm' (e.g. 17.00). */
export const formatTimeWithDot = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}.${minutes}`;
};

export const combineDateTime = (date: Date, time: Date): Date => {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
};

/** 'YYYYMMDD' → Date, today when invalid (legacy card picker helper). */
export const parseYYYYMMDD = (dateStr: any): Date => {
  if (!dateStr || String(dateStr).length !== 8) return new Date();
  const s = String(dateStr);
  return new Date(parseInt(s.substring(0, 4), 10), parseInt(s.substring(4, 6), 10) - 1, parseInt(s.substring(6, 8), 10));
};

/** Date → 'YYYYMMDD' (card edits are stored/sent in this format). */
export const formatDateYYYYMMDD = (date: Date): string => {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}${m}${d}`;
};

/** 'HH.mm' → Date today at that time (now when empty). */
export const formatTimeForPicker = (timeStr: any): Date => {
  if (!timeStr) return new Date();
  const [hours, minutes] = String(timeStr).split('.').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/** Card display helpers. */
export const getDisplayDate = (dateStr: any): string => {
  const s = str(dateStr);
  if (s && s.length === 8) return `${s.substring(6, 8)}/${s.substring(4, 6)}/${s.substring(0, 4)}`;
  return '-';
};
export const getDisplayTime = (timeStr: any): string => str(timeStr) || '--:--';

/** Legacy minDate / maxDate (Jan 1 this year … Dec 31 this year + 10). */
export const pickerBounds = () => {
  const y = new Date().getFullYear();
  return { minDate: new Date(y, 0, 1), maxDate: new Date(y + 10, 11, 31) };
};

/* ----------------------------- validations ------------------------------ */

export type Check = { valid: boolean; message: string };

/** START / END doff: combined date+time may not be before the R.C. (production) date. */
export const validateStartDateTime = (date: Date, time: Date, proddate: any): Check => {
  const productionDate = parseProductionDate(proddate);
  if (!productionDate) return { valid: true, message: '' };
  const selected = combineDateTime(date, time);
  if (selected < productionDate) {
    return {
      valid: false,
      message: `Date and time cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})`,
    };
  }
  return { valid: true, message: '' };
};

/** Card start/end date validation (strings in YYYYMMDD). */
export const validateDates = (startDateStr: any, endDateStr: any, proddate: any): Check => {
  if (!startDateStr && !endDateStr) return { valid: true, message: '' };
  if (!startDateStr) return { valid: true, message: '' };
  const productionDate = parseProductionDate(proddate);
  const startDate = parseYYYYMMDD(startDateStr);
  const endDate = endDateStr ? parseYYYYMMDD(endDateStr) : null;
  if (productionDate && startDate < productionDate) {
    return { valid: false, message: `Start date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})` };
  }
  if (endDate && endDate < startDate) {
    return { valid: false, message: 'End date must be after or equal to start date.' };
  }
  if (productionDate && endDate && endDate < productionDate) {
    return { valid: false, message: `End date cannot be earlier than the production date (${getDisplayDateFromYYYYMMDD(proddate)})` };
  }
  return { valid: true, message: '' };
};

/* ----------------------------- editable rows ---------------------------- */

export type Editable = Record<string, Row>;

export const doffKey = (item: Row, index: number): string | number => item?.uid || index;

/** Legacy "initialData" built every time proddoffshow/add/edit/delete returns rows. */
export const initEditable = (doffs: Row[]): Editable => {
  const out: Editable = {};
  doffs.forEach((item, index) => {
    const id = doffKey(item, index);
    out[id as any] = {
      startreading: item.startreading || '',
      endreading: item.endreading || '',
      startdate: item.startdate || '',
      starttime: item.starttime || '',
      enddate: item.enddate || '',
      endtime: item.endtime || '',
      totcones: item.totcones || '',
      totchees: item.totchees || '',
      totnetqty: item.totnetqty || '',
      tottareqty: item.tottareqty || '',
      totgrsqty: item.totgrsqty || '',
      islastdoff: item.islastdoff || '0',
    };
  });
  return out;
};

/**
 * Legacy handleFieldChange: Chees / Gross edits recompute
 *   Tare = Chees × coneweight,  Net = Gross − Tare   (stored with .toString()).
 * startdate / enddate edits are validated (returns the warning, state untouched).
 */
export const applyFieldChange = (
  editable: Editable, doffId: string | number, item: Row, field: string, value: any, proddate: any,
): { ok: true; next: Editable } | { ok: false; message: string } => {
  const current = editable[doffId as any] || {};
  const next: Editable = { ...editable, [doffId as any]: { ...current, [field]: value } };
  if (field === 'totchees' || field === 'totgrsqty') {
    const chees = parseFloat(next[doffId as any]?.totchees || item.totchees || 0);
    const grossWt = parseFloat(next[doffId as any]?.totgrsqty || item.totgrsqty || 0);
    const coneWeight = parseFloat(item.coneweight || 0);
    const tareWt = chees * coneWeight;
    next[doffId as any].tottareqty = tareWt.toString();
    const netWt = grossWt - tareWt;
    next[doffId as any].totnetqty = netWt.toString();
  }
  if (field === 'startdate' || field === 'enddate') {
    const s = next[doffId as any]?.startdate || item.startdate;
    const e = next[doffId as any]?.enddate || item.enddate;
    const v = validateDates(s, e, proddate);
    if (!v.valid) return { ok: false, message: v.message };
  }
  return { ok: true, next };
};

export const isOn = (v: any) => v === '1' || v === 1 || v === true;

/** Summary of loaded doffs (server values, not unsaved edits) — legacy calculateSums. */
export const calculateSums = (doffs: Row[]) => {
  const sums = { totcones: 0, totchees: 0, totgrsqty: 0, tottareqty: 0, totnetqty: 0 };
  doffs.forEach((item) => {
    sums.totcones += parseFloat(item.totcones || 0);
    sums.totnetqty += parseFloat(item.totnetqty || 0);
    sums.totchees += parseFloat(item.totchees || 0);
  });
  return sums;
};

/** Legacy hasLastDoff / isAnyEndEmpty / firstIncompleteDoff. */
export const doffFlags = (doffs: Row[]) => {
  if (!doffs.length) return { hasLastDoff: false, isAnyEndEmpty: false, firstIncomplete: null as Row | null };
  const hasLastDoff = doffs.some((i) => i.islastdoff === '1' || i.islastdoff === 1 || i.islastdoff === true);
  const isAnyEndEmpty = doffs.some((i) => !i.enddate || !i.endtime);
  const firstIncomplete = doffs.find((i) => !i.enddate || !i.endtime) || null;
  return { hasLastDoff, isAnyEndEmpty, firstIncomplete };
};

/* ------------------------------- payloads ------------------------------- */

/** Criteria part shared by every write: prpcode, yearno (last 2 chars of YearName), strcode, mercode, itmcode. */
export type Crit = { prpcode: string; yearno: string; strcode: string; mercode: string; itmcode: string };

/**
 * Legacy createMergedPayload(mainnew, selectedMachineRows): keys of mainnew[0]
 * win when they have a value; null/undefined ones fall back to the machine row
 * (keys matched case-insensitively); '' stays ''.
 */
export const createMergedPayload = (firstData: Row[] | null | undefined, secondData: Row[] | null | undefined): Row => {
  if (!firstData || !firstData[0]) return {};
  const firstObject = firstData[0];
  const secondObject = secondData && secondData[0] ? secondData[0] : {};
  const normalized: Row = {};
  for (const key in secondObject) normalized[key.toLowerCase()] = secondObject[key];
  const isNotNullOrUndefined = (v: any) => v !== null && v !== undefined;
  const hasActualValue = (v: any) => v !== null && v !== undefined && v !== '';
  const result: Row = {};
  for (const key in firstObject) {
    const firstValue = firstObject[key];
    const secondValue = normalized[key.toLowerCase()];
    if (hasActualValue(firstValue)) result[key] = firstValue;
    else if (!isNotNullOrUndefined(firstValue) && isNotNullOrUndefined(secondValue)) result[key] = secondValue;
    else if (firstValue === '') result[key] = firstValue;
    else result[key] = firstValue;
  }
  return result;
};

/** POST /api/proddoffadd body (START doff). */
export const buildAddPayload = (mainnew: Row[], machineRows: Row[], startDate: Date, startTime: Date, c: Crit): Row => {
  const merged = createMergedPayload(mainnew, machineRows);
  return {
    ...merged,
    startdate: formatDateDDMMYYYY(startDate),
    starttime: formatTimeWithDot(startTime),
    startdatetime: combineDateTime(startDate, startTime).toISOString(),
    shfcode: '0',
    d1: [],
    d2: [],
    prpcode: c.prpcode,
    yearno: c.yearno,
    strcode: c.strcode,
    mercode: c.mercode,
    itmcode: c.itmcode,
    txntype: TXNTYPE,
  };
};

/** POST /api/proddoffedit body for END doff (closes the first doff without end date/time). */
export const buildEndPayload = (doff: Row, endDate: Date, endTime: Date, c: Crit): Row => ({
  prpcode: c.prpcode,
  yearno: c.yearno,
  strcode: c.strcode,
  mercode: c.mercode,
  itmcode: c.itmcode,
  txntype: TXNTYPE,
  maccode: doff?.maccode,
  uid: doff?.uid,
  productionuid: doff?.productionuid,
  startdate: doff.startdate,
  starttime: doff.starttime,
  enddate: formatDateDDMMYYYY(endDate),
  endtime: formatTimeWithDot(endTime),
  startreading: doff.startreading,
  endreading: doff.endreading,
  totcones: doff.totchees, // legacy: tubes = chees
  totchees: doff.totchees,
  totnetqty: doff.totnetqty,
  totgrsqty: doff.totgrsqty,
  islastdoff: doff.islastdoff,
  tottareqty: doff.tottareqty,
  d1: [],
  d2: [],
  ...Object.fromEntries(Object.entries(doff).filter(([key]) => !['enddate', 'endtime', 'totcones', 'tottareqty'].includes(key))),
});

/** POST /api/proddoffedit body for card UPDATE (edited values fall back to the row). */
export const buildUpdatePayload = (item: Row, edited: Row, c: Crit): Row => ({
  prpcode: c.prpcode,
  yearno: c.yearno,
  strcode: c.strcode,
  mercode: c.mercode,
  itmcode: c.itmcode,
  txntype: TXNTYPE,
  maccode: item?.maccode,
  uid: item?.uid,
  productionuid: item?.productionuid,
  startdate: edited.startdate || item.startdate,
  starttime: edited.starttime || item.starttime,
  enddate: edited.enddate || item.enddate,
  endtime: edited.endtime || item.endtime,
  startreading: edited.startreading || item.startreading,
  endreading: edited.endreading || item.endreading,
  totcones: edited.totchees || item.totchees, // legacy: tubes = chees
  totchees: edited.totchees || item.totchees,
  totnetqty: edited.totnetqty || item.totnetqty,
  tottareqty: edited.tottareqty || item.tottareqty,
  totgrsqty: edited.totgrsqty || item.totgrsqty,
  islastdoff: edited.islastdoff || item.islastdoff,
  d1: [],
  d2: [],
  ...Object.fromEntries(
    Object.entries(item).filter(([key]) =>
      !['startdate', 'starttime', 'enddate', 'endtime', 'totcones', 'totchees', 'totnetqty', 'tottareqty', 'totgrsqty', 'islastdoff'].includes(key)),
  ),
});

/** Legacy UPDATE validation (only Chees / Gross Wt., note the else-if chain). */
export const validateUpdate = (item: Row, edited: Row): string | null => {
  if (edited.totchees === null || !edited.totchees || edited.totchees === '') {
    if (!item.totchees) return 'Please enter Chees';
  } else if (edited.totgrsqty === null || !edited.totgrsqty || edited.totgrsqty === '') {
    if (!item.totgrsqty) return 'Please enter Gross Wt.';
  }
  return null;
};

/** POST /api/proddoffdelete body. */
export const buildDeletePayload = (item: Row, c: Crit): Row => ({
  prpcode: c.prpcode,
  yearno: c.yearno,
  strcode: c.strcode,
  mercode: c.mercode,
  itmcode: c.itmcode,
  txntype: TXNTYPE,
  maccode: item?.maccode,
  uid: item?.uid,
  productionuid: item?.productionuid,
});

export const fmt = (v: any, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(d) : str(v);
};
