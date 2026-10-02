// FILE: src/components/VisitorsReportNEW/exportModel.ts
// What every export of the Visitors Report (Excel, PDF, Print) is built from:
// exactly what is on screen — period, search, filters and sort order.
import { Visit } from '../VisitorsNEW/model';
import { Kpis, PeriodRow, Slice, VisitorRow } from './reportModel';

export type ExportInput = {
  title: string;        // "Visitors Report"
  company: string;      // "MADHUSUDHAN FABRICS"
  period: string;       // "01 Oct 2026 – 02 Oct 2026"
  filtersText: string;  // "Still inside · Meeting" or ''
  visits: Visit[];
  visitors: VisitorRow[];
  kpis: Kpis;
  purposes: Slice[];
  hosts: Slice[];
  companies: Slice[];
  /** Day-wise totals of the period, month-wise of `monthYear`, year-wise of every year (same search + filters). */
  dayRows: PeriodRow[];
  monthRows: PeriodRow[];
  yearRows: PeriodRow[];
  monthYear: number;
  generatedBy: string;
  now: Date;
};

export const STATUS_TEXT = { inside: 'Inside', out: 'Went out', overstay: 'Inside too long' } as const;

/** Same colours in the app, the Excel file, the PDF and the print-out (hex without #). */
export const BRAND = {
  navy: '0D1B2A', copper: 'C87533', ink: '1A1514', muted: '6B655F', line: 'E5E0DA', alt: 'F8F5F1',
  green: '2A6044', greenBg: 'E6F1EA', red: 'B23A2A', redBg: 'FCEDEA', greyBg: 'F0EDE8',
  blue: '1C567A', purple: '652880',
};

export const STATUS_COLOR = {
  inside: { fg: BRAND.green, bg: BRAND.greenBg },
  overstay: { fg: BRAND.red, bg: BRAND.redBg },
  out: { fg: BRAND.muted, bg: BRAND.greyBg },
} as const;

export const fileStamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;

/** The KPI tiles shown at the top of the PDF / print-out and in the Excel summary. */
export const kpiTiles = (k: Kpis, avgStayText: string): { label: string; value: string; sub: string; color: string }[] => [
  { label: 'VISITS', value: String(k.visits), sub: `${k.persons} persons`, color: BRAND.navy },
  { label: 'UNIQUE VISITORS', value: String(k.unique), sub: `${k.repeat} repeat`, color: BRAND.blue },
  { label: 'STILL INSIDE', value: String(k.inside), sub: 'not marked OUT', color: BRAND.green },
  { label: 'INSIDE TOO LONG', value: String(k.overstay), sub: 'over 8 h / overnight', color: BRAND.red },
  { label: 'AVERAGE STAY', value: avgStayText, sub: 'finished visits', color: BRAND.copper },
  { label: 'WITH PHOTOS', value: String(k.withPhoto), sub: `${k.photos} photos`, color: BRAND.purple },
];

/** Columns of the day-wise / month-wise / year-wise tables (screen, Excel, PDF, print). */
export const PERIOD_COLS: { key: 'visits' | 'persons' | 'unique' | 'out' | 'inside' | 'avgStay'; title: string }[] = [
  { key: 'visits', title: 'Visits' },
  { key: 'persons', title: 'Persons' },
  { key: 'unique', title: 'Unique visitors' },
  { key: 'out', title: 'Went out' },
  { key: 'inside', title: 'Still inside' },
  { key: 'avgStay', title: 'Average stay' },
];
