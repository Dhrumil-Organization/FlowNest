// FILE: src/components/OutstandingDaysRequestNEW/model.ts
// Pure helpers of the Outstanding Days Request screen, copied 1:1 from the
// legacy components/OutstandingDaysRequest/index.tsx (no API, no state).
import type { Row } from './api';

export type Action = 'accept' | 'reject';

/** Legacy search: any value of the row contains the query (case-insensitive). */
export function filterRows<R extends Row>(rows: R[], query: string): R[] {
  if (!query) return rows;
  return rows.filter((i) =>
    Object.values(i).some((v) => String(v).toLowerCase().includes(query.toLowerCase())),
  );
}

/** Legacy formatToIndianCurrency: keeps DIGITS ONLY (so '.', '-' are dropped), en-IN grouping. */
export const formatToIndianCurrency = (value: string | number) => {
  const numericValue = typeof value === 'string'
    ? value.replace(/[^0-9]/g, '')
    : String(value).replace(/[^0-9]/g, '');
  const num = parseInt(numericValue, 10) || 0;
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

/** The number formatToIndianCurrency displays (used only for the KPI totals so they add up to the cards). */
export const digitsValue = (value: any) => parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10) || 0;

/** Legacy `parseInt(v, 10)` shown in a <Text>. Fix vs legacy: a missing value rendered "NaN"; show '—'. */
export const intText = (v: any) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? '—' : String(n);
};

/** Value shown in the "Requested OS Days" input (legacy: the edit if any, else parseInt(limit2).toString()).
 *  Fix vs legacy: a missing limit2 rendered "NaN" in the input; show it empty (display only). */
export const requestedInputValue = (edited: any, limit2: any) => {
  if (edited !== undefined) return edited;
  const n = parseInt(limit2, 10);
  return isNaN(n) ? '' : n.toString();
};

/** Legacy handleConfirmAction payloads (key order kept: ...card, limit2, limit3, isauth, referrer, txntype, action). */
export function buildEditPayload(selectedItem: Row, editedLimit2: any, action: Action | string | null): Row {
  const updatedItemAccept = {
    ...selectedItem,
    limit2: parseInt(editedLimit2 || selectedItem.limit2, 10).toString(),
    limit3: parseInt(editedLimit2 || selectedItem.limit2, 10).toString(),
    isauth: 1,
    referrer: 'dashboard',
    txntype: 'outstandingdaysrequest',
    action: 'edit',
  };
  const updatedItemReject = {
    ...selectedItem,
    limit2: parseInt(selectedItem.limit2, 10).toString(),
    limit3: parseInt(editedLimit2 || selectedItem.limit2, 10).toString(),
    isauth: 2,
    referrer: 'dashboard',
    txntype: 'outstandingdaysrequest',
    action: 'edit',
  };
  return action === 'accept' ? updatedItemAccept : updatedItemReject;
}

/** Legacy handleValidation (accept only). Returns the alert message, or null when valid. */
export function validateEdit(updatedItem: Row, action: Action | string | null): string | null {
  if (action === 'accept') {
    const numericNewLimit2 = parseInt(updatedItem.limit2, 10);
    if (isNaN(numericNewLimit2)) {
      return 'Requested OS Days cannot be empty or invalid for Party Name: ' + updatedItem.parname;
    } else if (numericNewLimit2 === 0) {
      return 'Requested OS Days cannot be 0 for Party Name: ' + updatedItem.parname;
    } else if (numericNewLimit2 < 0) {
      return 'Requested OS Days cannot be negative for Party Name: ' + updatedItem.parname;
    }
  }
  return null;
}

/* ------------------------------ bills ------------------------------ */

/** Legacy bill field label: split on capitals / underscores, capitalise each word. */
export const formatLabel = (key: string) =>
  key
    .split(/(?=[A-Z])|_/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const isNumeric = (val: any) => !isNaN(parseFloat(val)) && isFinite(val);

/** Legacy bill value: osdays / diffdays -> floor; other numeric -> formatToIndianCurrency; else as is. */
export const billDisplayValue = (key: string, value: any) => {
  const shouldSkipFormatting = key.toLowerCase() === 'osdays' || key.toLowerCase() === 'diffdays';
  if (shouldSkipFormatting) {
    const numericValue = parseFloat(String(value));
    return !isNaN(numericValue) ? Math.floor(numericValue).toString() : String(value);
  }
  return isNumeric(value) ? formatToIndianCurrency(String(value)) : String(value);
};
