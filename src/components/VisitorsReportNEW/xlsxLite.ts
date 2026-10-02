// FILE: src/components/VisitorsReportNEW/xlsxLite.ts
// A small writer for REAL, STYLED .xlsx files (no library).
// The `xlsx` package used elsewhere in the app cannot write colours, fonts or
// borders, so the Visitors Report builds its workbook here instead:
// coloured header rows, banded rows, coloured status cells, column widths,
// frozen header, auto-filter and merged title rows.
//
// A workbook is described with plain data (SheetSpec) — the same data is drawn
// by the in-app preview (ExportPreview.tsx), so the preview and the downloaded
// file always match.
//
// An .xlsx file is a ZIP of XML files; the ZIP here is written "stored"
// (not compressed), which every spreadsheet app opens.

/* --------------------------------- styles -------------------------------- */

/** Every look a cell can have. Add a key here + one line in XFS below. */
export type StyleKey =
  | 'eyebrow' | 'title' | 'meta'
  | 'head' | 'headRight'
  | 'cell' | 'cellAlt' | 'strong' | 'strongAlt' | 'num' | 'numAlt' | 'center' | 'centerAlt'
  | 'stInside' | 'stOver' | 'stOut'
  | 'section' | 'kLabel' | 'kValue' | 'blank';

/** Colours used by the file AND by the preview (hex without #). */
export const XL = {
  ink: '1A1514', navy: '0D1B2A', copper: 'C87533', muted: '6B655F', white: 'FFFFFF',
  alt: 'F8F5F1', line: 'E5E0DA', green: '2A6044', greenBg: 'E6F1EA', red: 'B23A2A', redBg: 'FCEDEA',
  greyBg: 'F0EDE8', copperBg: 'FBF3EA',
};

const FONTS = [
  `<font><sz val="10"/><color rgb="FF${XL.ink}"/><name val="Calibri"/></font>`,                 // 0 normal
  `<font><b/><sz val="10"/><color rgb="FF${XL.ink}"/><name val="Calibri"/></font>`,             // 1 bold
  `<font><b/><sz val="16"/><color rgb="FF${XL.navy}"/><name val="Calibri"/></font>`,            // 2 title
  `<font><b/><sz val="10"/><color rgb="FF${XL.white}"/><name val="Calibri"/></font>`,           // 3 white bold
  `<font><b/><sz val="9"/><color rgb="FF${XL.copper}"/><name val="Calibri"/></font>`,           // 4 eyebrow
  `<font><sz val="9"/><color rgb="FF${XL.muted}"/><name val="Calibri"/></font>`,                // 5 muted
  `<font><b/><sz val="10"/><color rgb="FF${XL.green}"/><name val="Calibri"/></font>`,           // 6 green
  `<font><b/><sz val="10"/><color rgb="FF${XL.red}"/><name val="Calibri"/></font>`,             // 7 red
  `<font><b/><sz val="10"/><color rgb="FF${XL.muted}"/><name val="Calibri"/></font>`,           // 8 grey bold
  `<font><b/><sz val="13"/><color rgb="FF${XL.navy}"/><name val="Calibri"/></font>`,            // 9 kpi value
];
const fill = (rgb: string) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
const FILLS = [
  '<fill><patternFill patternType="none"/></fill>',     // 0
  '<fill><patternFill patternType="gray125"/></fill>',  // 1 (reserved by Excel)
  fill(XL.navy),      // 2
  fill(XL.alt),       // 3
  fill(XL.greenBg),   // 4
  fill(XL.redBg),     // 5
  fill(XL.greyBg),    // 6
  fill(XL.copper),    // 7
  fill(XL.copperBg),  // 8
];
const side = (n: string) => `<${n} style="thin"><color rgb="FF${XL.line}"/></${n}>`;
const BORDERS = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  `<border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border>`,
];

type Xf = { font: number; fill: number; border: number; h?: 'left' | 'center' | 'right'; v?: 'top' | 'center'; wrap?: boolean };
const XFS: Record<StyleKey, Xf> = {
  blank: { font: 0, fill: 0, border: 0 },
  eyebrow: { font: 4, fill: 0, border: 0, v: 'center' },
  title: { font: 2, fill: 0, border: 0, v: 'center' },
  meta: { font: 5, fill: 0, border: 0, v: 'center' },
  head: { font: 3, fill: 2, border: 1, h: 'left', v: 'center', wrap: true },
  headRight: { font: 3, fill: 2, border: 1, h: 'right', v: 'center', wrap: true },
  cell: { font: 0, fill: 0, border: 1, v: 'top', wrap: true },
  cellAlt: { font: 0, fill: 3, border: 1, v: 'top', wrap: true },
  strong: { font: 1, fill: 0, border: 1, v: 'top', wrap: true },
  strongAlt: { font: 1, fill: 3, border: 1, v: 'top', wrap: true },
  num: { font: 0, fill: 0, border: 1, h: 'right', v: 'top' },
  numAlt: { font: 0, fill: 3, border: 1, h: 'right', v: 'top' },
  center: { font: 0, fill: 0, border: 1, h: 'center', v: 'top' },
  centerAlt: { font: 0, fill: 3, border: 1, h: 'center', v: 'top' },
  stInside: { font: 6, fill: 4, border: 1, h: 'center', v: 'top' },
  stOver: { font: 7, fill: 5, border: 1, h: 'center', v: 'top' },
  stOut: { font: 8, fill: 6, border: 1, h: 'center', v: 'top' },
  section: { font: 3, fill: 7, border: 1, v: 'center' },
  kLabel: { font: 1, fill: 8, border: 1, v: 'center' },
  kValue: { font: 9, fill: 8, border: 1, h: 'right', v: 'center' },
};
const STYLE_KEYS = Object.keys(XFS) as StyleKey[];
const xfId = (k: StyleKey) => STYLE_KEYS.indexOf(k);

/** What the preview needs to draw a cell the same way as the file. */
export function previewStyle(k: StyleKey): { bg: string; color: string; bold: boolean; size: number; align: 'left' | 'center' | 'right'; border: boolean } {
  const xf = XFS[k];
  const fontColor = [XL.ink, XL.ink, XL.navy, XL.white, XL.copper, XL.muted, XL.green, XL.red, XL.muted, XL.navy][xf.font];
  const fontSize = [10, 10, 16, 10, 9, 9, 10, 10, 10, 13][xf.font];
  const bg = ['', '', XL.navy, XL.alt, XL.greenBg, XL.redBg, XL.greyBg, XL.copper, XL.copperBg][xf.fill];
  return { bg: bg ? `#${bg}` : 'transparent', color: `#${fontColor}`, bold: xf.font !== 0 && xf.font !== 5, size: fontSize, align: xf.h || 'left', border: xf.border === 1 };
}

/* ---------------------------------- model -------------------------------- */

export type Cell = { v: string | number; s: StyleKey };
export type SheetSpec = {
  name: string;
  /** Column widths in characters. */
  cols: number[];
  rows: Cell[][];
  /** Row heights in points for some rows (0-based row index). */
  heights?: Record<number, number>;
  /** Rows above and including this 1-based row stay visible while scrolling. */
  freezeRow?: number;
  /** e.g. "A5:R120" */
  filter?: string;
  /** e.g. ["A1:H1"] */
  merges?: string[];
};

export const c = (v: string | number, s: StyleKey): Cell => ({ v, s });

/** 0 → A, 26 → AA */
export const colName = (i: number): string => {
  let n = i + 1;
  let out = '';
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
};

/* ----------------------------------- xml --------------------------------- */

const xmlEsc = (v: string) => v
  // characters XML 1.0 does not allow
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sheetXml(sheet: SheetSpec): string {
  const cols = sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const rows = sheet.rows.map((row, r) => {
    const cells = row.map((cell, i) => {
      const ref = `${colName(i)}${r + 1}`;
      const s = xfId(cell.s);
      if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return `<c r="${ref}" s="${s}"><v>${cell.v}</v></c>`;
      const text = String(cell.v ?? '');
      if (text === '') return `<c r="${ref}" s="${s}"/>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`;
    }).join('');
    const ht = sheet.heights?.[r];
    return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`;
  }).join('');
  const pane = sheet.freezeRow
    ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>`
    : '';
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews>`
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + `<cols>${cols}</cols>`
    + `<sheetData>${rows}</sheetData>`
    + (sheet.filter ? `<autoFilter ref="${sheet.filter}"/>` : '')
    + merges
    + '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>'
    + '<pageSetup orientation="landscape" paperSize="9" fitToHeight="0"/>'
    + '</worksheet>';
}

function stylesXml(): string {
  const xfs = STYLE_KEYS.map((k) => {
    const x = XFS[k];
    const align = x.h || x.v || x.wrap
      ? `<alignment${x.h ? ` horizontal="${x.h}"` : ''}${x.v ? ` vertical="${x.v}"` : ''}${x.wrap ? ' wrapText="1"' : ''}/>`
      : '';
    return `<xf numFmtId="0" fontId="${x.font}" fillId="${x.fill}" borderId="${x.border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${align ? ' applyAlignment="1"' : ''}>${align}</xf>`;
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>`
    + `<fills count="${FILLS.length}">${FILLS.join('')}</fills>`
    + `<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${STYLE_KEYS.length}">${xfs}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
}

/* ----------------------------------- zip --------------------------------- */

export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00); i += 1; }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return Uint8Array.from(out);
}

let crcTable: number[] | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n += 1) {
      let x = n;
      for (let k = 0; k < 8; k += 1) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
      crcTable.push(x >>> 0);
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP with "stored" entries. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

  files.forEach((file) => {
    const name = utf8(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;
    // 0x0800 = file name is UTF-8; fixed date 2026-01-01 00:00
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x5c21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)];
    const local = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...common]);
    parts.push(local, name, file.data);
    central.push(Uint8Array.from([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + size;
  });

  const centralSize = central.reduce((s, p) => s + p.length, 0);
  const end = Uint8Array.from([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let at = 0;
  all.forEach((p) => { out.set(p, at); at += p.length; });
  return out;
}

/** Bytes → base64 (for saving the file on Android / iOS). */
export function toBase64(bytes: Uint8Array): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const d = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += A[a >> 2] + A[((a & 3) << 4) | (b >> 4)] + (i + 1 < bytes.length ? A[((b & 15) << 2) | (d >> 6)] : '=') + (i + 2 < bytes.length ? A[d & 63] : '=');
  }
  return out;
}

/** base64 → bytes (photos kept as data: URIs). */
export function fromBase64(b64: string): Uint8Array {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let at = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (A.indexOf(clean[i]) << 18) | (A.indexOf(clean[i + 1]) << 12) | ((A.indexOf(clean[i + 2]) & 63) << 6) | (A.indexOf(clean[i + 3]) & 63);
    out[at++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length) out[at++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length) out[at++] = n & 0xff;
  }
  return out.subarray(0, at);
}

/* --------------------------------- workbook ------------------------------ */

/** The finished .xlsx file as bytes. */
export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const safeName = (n: string) => xmlEsc(n.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  const files: { name: string; data: Uint8Array }[] = [
    {
      name: '[Content_Types].xml',
      data: utf8(`${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + sheets.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
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
        + `<sheets>${sheets.map((s, i) => `<sheet name="${safeName(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>`
        + '</workbook>'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: utf8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + sheets.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
        + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
        + '</Relationships>'),
    },
    { name: 'xl/styles.xml', data: utf8(stylesXml()) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(s)) })),
  ];
  return zipStore(files);
}
