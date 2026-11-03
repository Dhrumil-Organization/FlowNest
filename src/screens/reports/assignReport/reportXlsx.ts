// FILE: src/screens/reports/assignReport/reportXlsx.ts
// Assign Report → the Excel file: a real, styled .xlsx (no library), one sheet laid out like the screen grid:
//   report name · setting + dates · rows + filters · generated
//   navy header row (frozen, with Excel filter buttons when not grouped)
//   rows: banded, coloured like the screen, numbers as REAL numbers with the column's decimals
//   group lines (merged across) · sub total lines · grand TOTAL line
// The zip / xml helpers come from the Visitors Report writer (src/components/VisitorsReportNEW/xlsxLite.ts).
// The preview (ReportExportPreview.tsx) draws the same XSheet, so the preview is the file.
import { colName, toBase64, utf8, zipStore } from '@/src/components/VisitorsReportNEW/xlsxLite';
import {
  buildLines, excelTotal, excelValue, ExportInput, metaLines, solidHex, subLabel, totalDigits, totalLabel,
} from './reportExportModel';
import { cellTint } from './assignReportModel';

/** one cell look */
export type XStyle = {
  b?: boolean; sz?: number; fg?: string; bg?: string;
  h?: 'left' | 'center' | 'right'; v?: 'top' | 'center';
  /** decimals of a number (undefined = as it is) */
  d?: number;
  border?: boolean; wrap?: boolean; indent?: number;
};
export type XCell = { v: string | number; s: XStyle };
export type XSheet = {
  name: string;
  /** widths in Excel characters */
  cols: number[];
  rows: XCell[][];
  heights: Record<number, number>;
  /** 1-based row of the header (rows up to it stay visible) */
  freezeRow: number;
  filter?: string;
  merges: string[];
  /** 0-based index of the header row in rows */
  headIndex: number;
};

export const XC = {
  ink: '1A1514', navy: '0D1B2A', copper: 'C87533', muted: '6B655F', white: 'FFFFFF',
  band: 'F8F5F1', line: 'D9D3CC', group: 'FBF0E4', sub: 'F0EDE8', total: '0D1B2A',
};

/* ------------------------------- the sheet -------------------------------- */

export function buildSheet(input: ExportInput): XSheet {
  const cols = input.cols;
  const n = Math.max(1, cols.length);
  const last = colName(n - 1);
  const rows: XCell[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = {};
  const blank = (s: XStyle = {}): XCell => ({ v: '', s });
  const banner = (v: string, s: XStyle, ht?: number) => {
    const r = rows.length;
    rows.push([{ v, s }, ...Array.from({ length: n - 1 }, () => blank(s))]);
    if (n > 1) merges.push(`A${r + 1}:${last}${r + 1}`);
    if (ht) heights[r] = ht;
  };

  banner(input.reportName || 'Report', { b: true, sz: 15, fg: XC.navy, v: 'center' }, 24);
  metaLines(input).forEach((t) => banner(t, { sz: 9, fg: XC.muted, v: 'center' }));
  banner('', {});

  // header
  const headIndex = rows.length;
  rows.push(cols.map((c) => ({ v: c.header, s: { b: true, fg: XC.white, bg: XC.navy, h: c.align, v: 'center', border: true, wrap: true } })));
  heights[headIndex] = 30;

  const first = cols[0];
  const lines = buildLines(input);
  lines.forEach((ln) => {
    const r = rows.length;
    if (ln.kind === 'group') {
      banner(`${'    '.repeat(ln.depth)}${ln.label}   (${ln.count} row${ln.count !== 1 ? 's' : ''})`, { b: true, fg: XC.copper, bg: XC.group, border: true, v: 'center' }, 18);
      return;
    }
    if (ln.kind === 'row') {
      const rowBg = solidHex(ln.tint) || (ln.band ? XC.band : undefined);
      rows.push(cols.map((c) => {
        const v = excelValue(c, ln.row[c.name]);
        const tint = solidHex(cellTint(c, ln.row[c.name]));
        return { v, s: { bg: tint || rowBg, h: c.align, v: 'top', border: true, d: typeof v === 'number' && c.digits !== null ? c.digits : undefined, wrap: typeof v !== 'number' } };
      }));
      return;
    }
    const isTotal = ln.kind === 'total';
    const label = isTotal ? totalLabel(first, ln.count) : subLabel(first, ln.label);
    const look: XStyle = isTotal ? { b: true, fg: XC.white, bg: XC.total, border: true, v: 'center' } : { b: true, fg: XC.copper, bg: XC.sub, border: true, v: 'center' };
    rows.push(cols.map((c, i) => {
      if (i === 0 && label) return { v: label, s: { ...look, h: 'left' } };
      const v = excelTotal(c, ln.totals);
      return { v, s: { ...look, h: c.align, d: typeof v === 'number' ? totalDigits(c) : undefined } };
    }));
    heights[r] = 18;
  });

  const dataEnd = rows.length;
  return {
    name: (input.reportName || 'Report').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Report',
    cols: cols.map((c) => Math.max(8, Math.min(60, Math.round(c.width / 7)))),
    rows,
    heights,
    freezeRow: headIndex + 1,
    // Excel filter buttons only on a plain table (group lines would break the filter)
    filter: !input.groups.length && dataEnd > headIndex + 1 ? `A${headIndex + 1}:${last}${input.hasTotals && input.rows.length ? dataEnd - 1 : dataEnd}` : undefined,
    merges,
    headIndex,
  };
}

/** screen text of a cell of the sheet (preview) — the same format Excel shows */
export function previewText(cell: XCell): string {
  if (typeof cell.v === 'number') {
    const d = cell.s.d;
    return d !== undefined
      ? cell.v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
      : String(cell.v);
  }
  return String(cell.v ?? '');
}

/* --------------------------------- file ----------------------------------- */

const xmlEsc = (v: string) => v
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** the style table, filled while the sheet xml is written */
function styleBook() {
  const fonts: string[] = [];
  const fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    `<border>${['left', 'right', 'top', 'bottom'].map((s) => `<${s} style="thin"><color rgb="FF${XC.line}"/></${s}>`).join('')}<diagonal/></border>`,
  ];
  const fmts: string[] = [];
  const xfs: string[] = [];
  const fontIx = new Map<string, number>();
  const fillIx = new Map<string, number>();
  const fmtIx = new Map<number, number>();
  const xfIx = new Map<string, number>();

  const font = (s: XStyle) => {
    const k = `${s.b ? 1 : 0}|${s.sz || 10}|${s.fg || XC.ink}`;
    if (!fontIx.has(k)) {
      fontIx.set(k, fonts.length);
      fonts.push(`<font>${s.b ? '<b/>' : ''}<sz val="${s.sz || 10}"/><color rgb="FF${s.fg || XC.ink}"/><name val="Calibri"/></font>`);
    }
    return fontIx.get(k)!;
  };
  const fill = (bg?: string) => {
    if (!bg) return 0;
    if (!fillIx.has(bg)) {
      fillIx.set(bg, fills.length);
      fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${bg}"/><bgColor indexed="64"/></patternFill></fill>`);
    }
    return fillIx.get(bg)!;
  };
  const fmt = (d?: number) => {
    if (d === undefined) return 0;
    if (d === 0) return 3; // built-in #,##0
    if (d === 2) return 4; // built-in #,##0.00
    if (!fmtIx.has(d)) {
      const id = 164 + fmts.length;
      fmtIx.set(d, id);
      fmts.push(`<numFmt numFmtId="${id}" formatCode="#,##0.${'0'.repeat(Math.min(d, 10))}"/>`);
    }
    return fmtIx.get(d)!;
  };
  const xf = (s: XStyle) => {
    const k = JSON.stringify(s);
    if (!xfIx.has(k)) {
      const align = s.h || s.v || s.wrap || s.indent
        ? `<alignment${s.h ? ` horizontal="${s.h}"` : ''}${s.v ? ` vertical="${s.v}"` : ''}${s.wrap ? ' wrapText="1"' : ''}${s.indent ? ` indent="${s.indent}"` : ''}/>`
        : '';
      const nf = fmt(s.d);
      xfIx.set(k, xfs.length);
      xfs.push(`<xf numFmtId="${nf}" fontId="${font(s)}" fillId="${fill(s.bg)}" borderId="${s.border ? 1 : 0}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${nf ? ' applyNumberFormat="1"' : ''}${align ? ' applyAlignment="1"' : ''}>${align}</xf>`);
    }
    return xfIx.get(k)!;
  };
  xf({}); // style 0 = plain
  const xml = () => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + (fmts.length ? `<numFmts count="${fmts.length}">${fmts.join('')}</numFmts>` : '')
    + `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`
    + `<fills count="${fills.length}">${fills.join('')}</fills>`
    + `<borders count="${borders.length}">${borders.join('')}</borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
  return { xf, xml };
}

function sheetXml(sheet: XSheet, xf: (s: XStyle) => number): string {
  const cols = sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const rows = sheet.rows.map((row, r) => {
    const cells = row.map((cell, i) => {
      const ref = `${colName(i)}${r + 1}`;
      const s = xf(cell.s);
      if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return `<c r="${ref}" s="${s}"><v>${cell.v}</v></c>`;
      const text = String(cell.v ?? '');
      if (text === '') return `<c r="${ref}" s="${s}"/>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`;
    }).join('');
    const ht = sheet.heights[r];
    return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`;
  }).join('');
  const pane = `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>`;
  const merges = sheet.merges.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
    + `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews>`
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + `<cols>${cols}</cols>`
    + `<sheetData>${rows}</sheetData>`
    + (sheet.filter ? `<autoFilter ref="${sheet.filter}"/>` : '')
    + merges
    + '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
    + '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
    + '<headerFooter><oddFooter>&amp;L&amp;8&amp;A&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>'
    + '</worksheet>';
}

/** the finished .xlsx */
export function xlsxBytes(sheet: XSheet): Uint8Array {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const book = styleBook();
  const sheetData = sheetXml(sheet, book.xf); // fills the style table
  const name = xmlEsc(sheet.name);
  // repeat the header row on every printed page
  const titles = `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${name.replace(/'/g, "''")}'!$${sheet.freezeRow}:$${sheet.freezeRow}</definedName>`
    + '</definedNames>';
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: utf8(`${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        + '</Types>'),
    },
    {
      name: '_rels/.rels',
      data: utf8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>'),
    },
    {
      name: 'xl/workbook.xml',
      data: utf8(`${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
        + '<bookViews><workbookView activeTab="0"/></bookViews>'
        + `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>`
        + titles
        + '</workbook>'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: utf8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>'),
    },
    { name: 'xl/styles.xml', data: utf8(book.xml()) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(sheetData) },
  ]);
}

export { toBase64 };
