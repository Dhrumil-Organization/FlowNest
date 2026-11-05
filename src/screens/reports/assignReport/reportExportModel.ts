// FILE: src/screens/reports/assignReport/reportExportModel.ts
// Assign Report → Excel / PDF export of EXACTLY what the screen shows after "Load report":
//   - the columns shown (hidden columns only when "+n hidden" is switched on)
//   - the rows after search + column filters, in the screen's sort order
//   - the report's groups (when "Group" is on) with their sub totals, then the grand TOTAL
//   - the same numbers (column decimals), row colours (BStatus / BSrNo) and status colours
// Always written as a grid (table), also when the screen is on "Cards".
// Folded groups are written open — a file always carries every row of the result.
//
// The Excel file (reportXlsx.ts), the PDF (reportPdf.ts) and the previews are all made from buildLines() below,
// so the preview, the file and the screen always agree.
import { cellText, cellTint, Col, Group, Row, rowTint, Totals, totalText } from './assignReportModel';

export type ExportInput = {
  reportName: string;
  settingName: string;
  /** e.g. ["From date 01-10-2026", "To date 31-10-2026"] */
  criteria: string[];
  /** e.g. ["Search: abc", "Party contains xyz", "Sorted by Amount (high → low)"] — empty when nothing applied */
  applied: string[];
  cols: Col[];
  rows: Row[];
  /** [] = not grouped */
  groups: Group[];
  totals: Totals;
  hasTotals: boolean;
  /** rows the report returned before search / filters */
  totalRows: number;
  now: Date;
};

export type Line =
  | { kind: 'group'; depth: number; label: string; count: number }
  | { kind: 'row'; row: Row; band: boolean; tint: string | null }
  | { kind: 'sub'; depth: number; label: string; totals: Totals }
  | { kind: 'total'; count: number; totals: Totals };

/** every line of the grid in screen order (groups open) */
export function buildLines(input: ExportInput): Line[] {
  const out: Line[] = [];
  let n = 0;
  const pushRow = (r: Row) => { out.push({ kind: 'row', row: r, band: n % 2 === 1, tint: rowTint(r) }); n += 1; };
  if (!input.groups.length) input.rows.forEach(pushRow);
  else {
    const walk = (gs: Group[], depth: number) => {
      gs.forEach((g) => {
        out.push({ kind: 'group', depth, label: g.label, count: g.rows.length });
        n = 0;
        if (g.children) walk(g.children, depth + 1);
        else g.rows.forEach(pushRow);
        if (input.hasTotals) out.push({ kind: 'sub', depth, label: g.label, totals: g.totals });
      });
    };
    walk(input.groups, 0);
  }
  if (input.hasTotals && input.rows.length) out.push({ kind: 'total', count: input.rows.length, totals: input.totals });
  return out;
}

/** a number column? (numbers are written as real numbers in Excel) */
export const isNumCol = (c: Col) => c.digits !== null || c.numeric;

/** the cell as Excel gets it: a number for number columns, else the screen text */
export function excelValue(c: Col, v: any): string | number {
  if (v === null || v === undefined || v === '') return '';
  if (isNumCol(c)) {
    const s = typeof v === 'number' ? v : String(v).replace(/,/g, '').trim();
    const n = typeof s === 'number' ? s : (/^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN);
    if (Number.isFinite(n)) return c.digits !== null ? Number(n.toFixed(c.digits)) : n;
  }
  return cellText(c, v);
}

/** a total cell as Excel gets it (number), '' when the column has no total */
export function excelTotal(c: Col, t: Totals): string | number {
  if (c.total === null || !(c.name in t)) return '';
  if (c.total === 0) return t[c.name];
  const d = c.digits !== null ? c.digits : 2;
  return Number(t[c.name].toFixed(d));
}

/** decimals Excel shows for a total cell */
export const totalDigits = (c: Col) => (c.total === 0 ? 0 : c.digits !== null ? c.digits : 2);

/** label of the first cell of a sub total / total line (screen: only when the first column has no total) */
export const subLabel = (first: Col | undefined, label: string) => (first && first.total === null ? `Sub total · ${label}` : '');
export const totalLabel = (first: Col | undefined, count: number) => (first && first.total === null ? `TOTAL · ${count} row${count !== 1 ? 's' : ''}` : '');

export { cellText, cellTint, totalText };

/** a screen colour (#rgb / #rrggbb / #rrggbbaa) as a solid 6-digit hex on white — for Excel and PDF */
export function solidHex(c: string | null | undefined): string | null {
  if (!c) return null;
  let h = c.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  const mix = (i: number) => Math.round(parseInt(h.slice(i, i + 2), 16) * a + 255 * (1 - a)).toString(16).padStart(2, '0');
  return (mix(0) + mix(2) + mix(4)).toUpperCase();
}

const two = (n: number) => String(n).padStart(2, '0');
export const stamp = (d: Date) => `${two(d.getDate())}-${two(d.getMonth() + 1)}-${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
export const fileBase = (input: ExportInput) => {
  const d = input.now;
  const name = `${input.reportName} ${input.settingName}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || 'Report';
  return `${name}_${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}_${two(d.getHours())}${two(d.getMinutes())}`;
};

/** the lines under the title: setting · criteria, then what was applied, then rows */
export function metaLines(input: ExportInput): string[] {
  const a = [input.settingName ? `Setting: ${input.settingName}` : '', ...input.criteria].filter(Boolean).join('   ·   ');
  const rowsNote = input.rows.length === input.totalRows ? `${input.rows.length} rows` : `${input.rows.length} of ${input.totalRows} rows`;
  const b = [rowsNote, ...input.applied].join('   ·   ');
  return [a, b, `Generated ${stamp(input.now)}`].filter(Boolean);
}
