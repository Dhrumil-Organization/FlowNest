// FILE: src/components/VisitorsReportNEW/reportSheets.ts
// The Excel workbook of the Visitors Report as plain data (SheetSpec):
//   1. Register    — one row per visit, coloured status, frozen header, filter
//   2. Visitors    — one row per person
//   3. Day-wise    — totals of every day of the period
//   4. Month-wise  — totals of the 12 months of the year
//   5. Year-wise   — totals of every year
//   6. Summary     — KPI block + purpose / whom to meet / company tables
// xlsxLite.ts turns this into the .xlsx file and ExportPreview.tsx draws the
// very same data on screen, so preview = file.
import {
  displayName, fmtDate, fmtDuration, fmtTime, GENDERS, labelOf, PURPOSES, statusOf, stayMinutes,
} from '../VisitorsNEW/model';
import { ExportInput, STATUS_TEXT } from './exportModel';
import { PeriodRow, Slice, sumPeriods } from './reportModel';
import { c, Cell, colName, SheetSpec, StyleKey } from './xlsxLite';

type Col<T> = { title: string; width: number; kind?: 'text' | 'strong' | 'num' | 'center' | 'status'; value: (row: T, index: number) => string | number };

const yesNo = (v: string) => (v === 'Y' ? 'Yes' : v === 'N' ? 'No' : '');

/** Title block (4 rows) + header row + banded data rows (+ optional TOTAL row). */
function tableSheet<T>(
  name: string, input: ExportInput, subtitle: string, cols: Col<T>[], data: T[],
  opts?: { status?: (row: T) => 'inside' | 'out' | 'overstay'; total?: (string | number)[]; empty?: string },
): SheetSpec {
  const blank = (n: number): Cell[] => Array.from({ length: n }, () => c('', 'blank'));
  const pad = (first: Cell): Cell[] => [first, ...blank(cols.length - 1)];
  const meta = [`Period: ${input.period}`, input.filtersText ? `Filters: ${input.filtersText}` : '', `Generated ${fmtDate(input.now)} ${fmtTime(input.now)} by ${input.generatedBy}`]
    .filter(Boolean).join('   |   ');
  const rows: Cell[][] = [
    pad(c(input.company, 'eyebrow')),
    pad(c(`${input.title} — ${subtitle}`, 'title')),
    pad(c(meta, 'meta')),
    blank(cols.length),
    cols.map((col) => c(col.title, col.kind === 'num' ? 'headRight' : 'head')),
  ];
  data.forEach((row, i) => {
    const alt = i % 2 === 1;
    rows.push(cols.map((col) => {
      const v = col.value(row, i);
      let s: StyleKey;
      if (col.kind === 'status' && opts?.status) {
        const st = opts.status(row);
        s = st === 'inside' ? 'stInside' : st === 'overstay' ? 'stOver' : 'stOut';
      } else if (col.kind === 'num') s = alt ? 'numAlt' : 'num';
      else if (col.kind === 'center') s = alt ? 'centerAlt' : 'center';
      else if (col.kind === 'strong') s = alt ? 'strongAlt' : 'strong';
      else s = alt ? 'cellAlt' : 'cell';
      return c(v, s);
    }));
  });
  if (!data.length) rows.push(pad(c(opts?.empty || 'Nothing in this period.', 'cell')));
  const lastData = rows.length;
  if (opts?.total && data.length) rows.push(opts.total.map((v, i) => c(v, i === 0 ? 'kLabel' : 'kValue')));
  const last = colName(cols.length - 1);
  const span = `${colName(Math.min(cols.length - 1, 9))}`;
  return {
    name,
    cols: cols.map((col) => col.width),
    rows,
    heights: { 1: 26, 4: 22 },
    freezeRow: 5,
    filter: `A5:${last}${Math.max(5, lastData)}`,
    merges: [`A1:${span}1`, `A2:${span}2`, `A3:${span}3`],
  };
}

/** Day-wise / month-wise / year-wise sheet. */
function periodSheet(name: string, input: ExportInput, subtitle: string, first: string, data: PeriodRow[]): SheetSpec {
  const t = sumPeriods(data);
  return tableSheet<PeriodRow>(name, input, subtitle, [
    { title: first, width: 24, kind: 'strong', value: (r) => r.label },
    { title: 'Visits', width: 11, kind: 'num', value: (r) => r.visits },
    { title: 'Persons', width: 11, kind: 'num', value: (r) => r.persons },
    { title: 'Unique visitors', width: 15, kind: 'num', value: (r) => r.unique },
    { title: 'Went out', width: 11, kind: 'num', value: (r) => r.out },
    { title: 'Still inside', width: 12, kind: 'num', value: (r) => r.inside },
    { title: 'Average stay', width: 14, kind: 'center', value: (r) => (r.out ? fmtDuration(r.avgStay) : '') },
    { title: 'Average stay (min)', width: 16, kind: 'num', value: (r) => (r.out ? r.avgStay : '') },
  ], data, {
    // unique visitors cannot be added up across rows (one person can come on many days)
    total: ['TOTAL', t.visits, t.persons, '', t.out, t.inside, t.out ? fmtDuration(t.avgStay) : '', t.out ? t.avgStay : ''],
    empty: 'No visits.',
  });
}

export function buildSheets(input: ExportInput): SheetSpec[] {
  const now = input.now;

  const register = tableSheet('Register', input, 'Register', [
    { title: 'Sr.', width: 6, kind: 'num', value: (_v, i) => i + 1 },
    { title: 'Pass no.', width: 15, kind: 'strong', value: (v) => v.visitNo },
    { title: 'Date', width: 13, value: (v) => fmtDate(v.inAt) },
    { title: 'In', width: 10, kind: 'center', value: (v) => fmtTime(v.inAt) },
    { title: 'Out', width: 10, kind: 'center', value: (v) => (v.outAt ? fmtTime(v.outAt) : '') },
    { title: 'Out date', width: 13, value: (v) => (v.outAt ? fmtDate(v.outAt) : '') },
    { title: 'Stay', width: 10, kind: 'center', value: (v) => fmtDuration(stayMinutes(v, now)) },
    { title: 'Stay (min)', width: 10, kind: 'num', value: (v) => stayMinutes(v, now) },
    { title: 'Status', width: 16, kind: 'status', value: (v) => STATUS_TEXT[statusOf(v, now)] },
    { title: 'Name', width: 24, kind: 'strong', value: (v) => displayName(v) },
    { title: 'Mobile', width: 13, value: (v) => v.mobile },
    { title: 'Company', width: 28, value: (v) => v.company },
    { title: 'Purpose', width: 20, value: (v) => labelOf(PURPOSES, v.purpose) },
    { title: 'Work details', width: 28, value: (v) => v.purposeNote },
    { title: 'To meet', width: 22, value: (v) => v.hostName },
    { title: 'Appointment', width: 12, kind: 'center', value: (v) => yesNo(v.appointment) },
    { title: 'Came together', width: 10, kind: 'num', value: (v) => v.groupSize },
    { title: 'Others along', width: 10, kind: 'num', value: (v) => v.extraPersons },
    { title: 'Photos', width: 8, kind: 'num', value: (v) => v.photos.length },
    { title: 'Note', width: 26, value: (v) => v.remarks },
    { title: 'Note while leaving', width: 24, value: (v) => v.outRemark },
    { title: 'Designation', width: 18, value: (v) => v.designation },
    { title: 'Second mobile', width: 13, value: (v) => v.altMobile },
    { title: 'Gender', width: 9, value: (v) => labelOf(GENDERS, v.gender) },
    { title: 'Entry by', width: 18, value: (v) => v.createdBy },
    { title: 'OUT marked by', width: 18, value: (v) => v.checkedOutBy },
    // links open the photos once they are on the server (http…)
    { title: 'Photo links', width: 50, value: (v) => v.photos.filter((p) => /^https?:/i.test(p.uri)).map((p) => p.uri).join('\n') },
  ], input.visits, { status: (v) => statusOf(v, now) });

  const visitors = tableSheet('Visitors', input, 'Visitors', [
    { title: 'Sr.', width: 6, kind: 'num', value: (_r, i) => i + 1 },
    { title: 'Name', width: 26, kind: 'strong', value: (r) => r.name },
    { title: 'Mobile', width: 13, value: (r) => r.mobile },
    { title: 'Company', width: 30, value: (r) => r.company },
    { title: 'Visits', width: 9, kind: 'num', value: (r) => r.count },
    { title: 'First visit', width: 13, value: (r) => fmtDate(r.firstInAt) },
    { title: 'Last visit', width: 13, value: (r) => fmtDate(r.lastInAt) },
    { title: 'Average stay', width: 12, kind: 'center', value: (r) => fmtDuration(r.avgStay) },
    { title: 'Total time', width: 12, kind: 'center', value: (r) => fmtDuration(r.totalStay) },
    { title: 'Total (min)', width: 11, kind: 'num', value: (r) => r.totalStay },
    { title: 'Inside now', width: 12, kind: 'status', value: (r) => (r.insideNow ? 'Inside' : '') },
  ], input.visitors, { status: (r) => (r.insideNow ? 'inside' : 'out') });
  // "Inside now" is coloured only when the person is inside
  visitors.rows.forEach((row, i) => {
    if (i < 5) return;
    const cell = row[row.length - 1];
    if (cell && cell.v === '') cell.s = (i - 5) % 2 === 1 ? 'centerAlt' : 'center';
  });

  const dayWise = periodSheet('Day-wise', input, 'Day-wise', 'Day', input.dayRows);
  const monthWise = periodSheet('Month-wise', input, `Month-wise ${input.monthYear}`, 'Month', input.monthRows);
  const yearWise = periodSheet('Year-wise', input, 'Year-wise (all years)', 'Year', input.yearRows);

  /* ------------------------------- Summary ------------------------------- */
  const k = input.kpis;
  const b = (): Cell => c('', 'blank');
  const rows: Cell[][] = [
    [c(input.company, 'eyebrow'), b(), b()],
    [c(`${input.title} — Summary`, 'title'), b(), b()],
    [c(`Period: ${input.period}`, 'meta'), b(), b()],
    [c(input.filtersText ? `Filters: ${input.filtersText}` : 'Filters: none', 'meta'), b(), b()],
    [c(`Generated ${fmtDate(input.now)} ${fmtTime(input.now)} by ${input.generatedBy}`, 'meta'), b(), b()],
    [b(), b(), b()],
    [c('Key numbers', 'section'), c('', 'section'), c('', 'section')],
  ];
  const kpi = (label: string, value: string | number) => rows.push([c(label, 'kLabel'), c(value, 'kValue'), b()]);
  kpi('Total visits', k.visits);
  kpi('Total persons (with those who came along)', k.persons);
  kpi('Unique visitors', k.unique);
  kpi('Repeat visitors', k.repeat);
  kpi('Still inside', k.inside);
  kpi('Inside too long', k.overstay);
  kpi('Average stay', fmtDuration(k.avgStay));
  kpi('Visits with photo', k.withPhoto);
  kpi('Photos in total', k.photos);
  const block = (title: string, list: Slice[]) => {
    rows.push([b(), b(), b()]);
    rows.push([c(title, 'section'), c('', 'section'), c('', 'section')]);
    rows.push([c(title, 'head'), c('Visits', 'headRight'), c('%', 'headRight')]);
    list.forEach((s, i) => {
      const alt = i % 2 === 1;
      rows.push([c(s.label, alt ? 'cellAlt' : 'cell'), c(s.count, alt ? 'numAlt' : 'num'), c(Number(s.pct.toFixed(1)), alt ? 'numAlt' : 'num')]);
    });
    if (!list.length) rows.push([c('No data', 'cell'), c('', 'cell'), c('', 'cell')]);
  };
  block('Purpose of visit', input.purposes);
  block('Whom they came to meet', input.hosts);
  block('Top companies', input.companies);

  const summary: SheetSpec = { name: 'Summary', cols: [38, 14, 9], rows, heights: { 1: 26 }, merges: ['A1:C1', 'A2:C2', 'A3:C3', 'A4:C4', 'A5:C5'] };
  return [register, visitors, dayWise, monthWise, yearWise, summary];
}
