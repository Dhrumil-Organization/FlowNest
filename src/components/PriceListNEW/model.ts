// FILE: src/components/PriceListNEW/model.ts
// Pure helpers for the Price List matrix — same rules as legacy PriceList.
import type { PriceRow } from './api';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
];

export const monthNoOf = (m: number) => String(m + 1).padStart(2, '0');

export type DateCol = { rawDate: string; day: string; month: string; year: string };

/** Unique PLDate values in data order (legacy: no sorting). */
export function buildDateColumns(rows: PriceRow[]): DateCol[] {
  const unique = [...new Set(rows.map((x) => x.PLDate))];
  return unique.map((date: string) => {
    const d = String(date ?? '');
    const year = d.substring(0, 4);
    const month = d.substring(4, 6);
    const day = d.substring(6, 8);
    return { rawDate: date, day, month: (MONTHS[Number(month) - 1] || '').substring(0, 3), year };
  });
}

/** Legacy search: ItmName, ItmCode, PLRate, PLDate (case-insensitive contains). */
export function filterRows(rows: PriceRow[], search: string): PriceRow[] {
  const txt = search.trim().toLowerCase();
  if (!txt) return rows;
  return rows.filter((x) => {
    const s = `
            ${x.ItmName || ''}
            ${x.ItmCode || ''}
            ${x.PLRate || ''}
            ${x.PLDate || ''}
        `.toLowerCase();
    return s.includes(txt);
  });
}

export type UniqueItem = { ItmCode: string; ItmName: string; Status: any };

/** First occurrence per ItmCode (legacy uniqueItems). */
export function buildUniqueItems(rows: PriceRow[]): UniqueItem[] {
  const map = new Map<string, UniqueItem>();
  rows.forEach((item) => {
    if (!map.has(item.ItmCode)) {
      map.set(item.ItmCode, { ItmCode: item.ItmCode, ItmName: item.ItmName, Status: item.Status });
    }
  });
  return Array.from(map.values());
}

export const cellKey = (itemCode: string, date: string) => `${itemCode}_${date}`;

export function buildRateMap(rows: PriceRow[]): Record<string, PriceRow> {
  const map: Record<string, PriceRow> = {};
  rows.forEach((item) => { map[cellKey(item.ItmCode, item.PLDate)] = item; });
  return map;
}

export type RateKind = 'missing' | 'normal' | 'same' | 'lower' | 'higher';

/** Legacy getRateStyle, returning a kind instead of a style. */
export function rateKind(rateMap: Record<string, PriceRow>, dateCols: DateCol[], itemCode: string, currentDate: string): RateKind {
  const currentRate = Number(rateMap[cellKey(itemCode, currentDate)]?.PLRate || 0);
  if (currentRate === 0) return 'missing';

  const rates = dateCols
    .map((col) => Number(rateMap[cellKey(itemCode, col.rawDate)]?.PLRate || 0))
    .filter((rate) => rate > 0);

  if (rates.length <= 1) return 'normal';

  const duplicateCount = rates.filter((r) => r === currentRate).length;
  if (duplicateCount > 1) return 'same';

  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  if (currentRate === minRate) return 'lower';
  if (currentRate === maxRate) return 'higher';
  return 'normal';
}

/** Legacy "Status === '0'" check (string compare, kept). */
export const isUnmapped = (item: UniqueItem) => item.Status === '0';

export const UNMAPPED_MSG = 'One or more recipe items are not mapped in the POY Rate Item List.';
