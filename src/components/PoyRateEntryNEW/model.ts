// FILE: src/components/PoyRateEntryNEW/model.ts
// Pure helpers for POY Rate Entry — every rule copied 1:1 from the legacy
// src/components/PoyRateEntry/index.tsx (getters, date format, search keys,
// keypad reducer, quick-rate chips).

export type PoyItem = Record<string, any>;

export const RUPEE = '₹';
export const DASH = '—';

/** Quick-rate chips shown in the legacy editor. */
export const QUICK_RATES = ['250', '270', '295', '320'];

/** Legacy keypad layout (the '+' and '-' keys are shown but do nothing). */
export const KEYPAD = ['1', '2', '3', 'back', '4', '5', '6', '+', '7', '8', '9', '-', '.', '0', 'done'];

export const getItemSrNo = (item: any) => item?.RSrNo ?? item?.SrNo ?? item?.srno;

export const getItemRate = (item: any) => item?.Rate ?? item?.rate ?? '';

export const getItemUom = (item: any) => item?.UOM || item?.uom || 'KGS';

export const isDone = (item: any) => Number(getItemRate(item) || 0) > 0;

/** Legacy: a 0 / empty rate opens the editor with an empty amount. */
export const amountFromItem = (item: any): string => {
  const rate = getItemRate(item);
  return Number(rate || 0) === 0 ? '' : rate.toString();
};

/** Legacy `formatDate` — used both for display and for the `appfrom` query param. */
export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const pad2 = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Legacy `handleSearch` filter (same fields, same order, case-insensitive). */
export const filterItems = (list: PoyItem[], text: string): PoyItem[] => {
  if (!text.trim()) return list;
  const search = text.toLowerCase();
  return list.filter(item =>
    item?.SrNo?.toString()?.toLowerCase()?.includes(search) ||
    item?.PrpCode?.toLowerCase()?.includes(search) ||
    item?.StrCode?.toLowerCase()?.includes(search) ||
    item?.ItmCode?.toLowerCase()?.includes(search) ||
    item?.ItmName?.toLowerCase()?.includes(search) ||
    item?.ShtName?.toLowerCase()?.includes(search) ||
    item?.UOM?.toLowerCase()?.includes(search) ||
    item?.AppFrom?.toString()?.toLowerCase()?.includes(search) ||
    item?.Rate?.toString()?.toLowerCase()?.includes(search),
  );
};

/**
 * Legacy `handleKeyPress` as a pure reducer. Returns the new amount, or
 * `null` for keys that do not change it ('done', '+', '-', a 2nd '.').
 * Quirks kept: '.' ignores the 8-char limit; '' or '0' + digit -> digit.
 */
export const applyKey = (prev: string, key: string): string | null => {
  if (key === 'back') return prev.length > 1 ? prev.slice(0, -1) : '';
  if (key === 'done') return null;
  if (key === '.') {
    if (prev.includes('.')) return null;
    return prev ? `${prev}.` : '0.';
  }
  if (key === '+' || key === '-') return null;
  if (prev.length >= 8) return prev;
  if (prev === '' || prev === '0') return key;
  return `${prev}${key}`;
};

/**
 * Web-only typed input: replays the typed characters through the same
 * keypad reducer so the typed value obeys exactly the keypad rules.
 */
export const sanitizeTyped = (text: string): string => {
  let out = '';
  for (const ch of String(text || '')) {
    if (!/[0-9.]/.test(ch)) continue;
    const next = applyKey(out, ch);
    if (next !== null) out = next;
  }
  return out;
};
