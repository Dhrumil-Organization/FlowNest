// FILE: src/components/VisitorsReportNEW/reportPdf.ts
// The Visitors Report as a colourful PDF (WEB — drawn with pdfLite.ts):
//   page 1…n  navy title band, six KPI tiles, register table with banded
//             rows, coloured stay + status pills and small photos
//   then      Month-wise + Year-wise totals, Day-wise totals
//   last page Summary — purpose, whom to meet, top companies, visits by month (bars)
//   every page footer with "Page x of y"
// The bytes are shown in the in-app preview and downloaded unchanged.
// Phones build the same design from reportHtml.ts with expo-print.
import { displayName, fmtDate, fmtDuration, fmtTime, labelOf, PURPOSES, statusOf, stayMinutes, Visit } from '../VisitorsNEW/model';
import { BRAND, ExportInput, kpiTiles, STATUS_COLOR, STATUS_TEXT } from './exportModel';
import { hex, PdfLite, Rgb, textWidth, wrapText } from './pdfLite';
import { PeriodRow, Slice, sumPeriods } from './reportModel';
import { fromBase64 } from './xlsxLite';

const NAVY = hex(BRAND.navy);
const COPPER = hex(BRAND.copper);
const INK = hex(BRAND.ink);
const MUTED = hex(BRAND.muted);
const LINE = hex(BRAND.line);
const ALT = hex(BRAND.alt);
const WHITE: Rgb = [255, 255, 255];

const PHOTOS_PER_ROW = 2;
const MAX_PHOTOS = 120; // keeps the file small on long periods

/** JPEG bytes of the first photos of each visit (uri → bytes). Photos that cannot be read are skipped. */
export async function loadPhotoBytes(visits: Visit[]): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  const wanted: string[] = [];
  visits.forEach((v) => v.photos.slice(0, PHOTOS_PER_ROW).forEach((p) => { if (wanted.length < MAX_PHOTOS) wanted.push(p.uri); }));
  await Promise.all(wanted.map(async (uri) => {
    try {
      if (/^data:image\/jpe?g;base64,/i.test(uri)) {
        out.set(uri, fromBase64(uri.slice(uri.indexOf(',') + 1)));
      } else if (/^https?:/i.test(uri)) {
        const res = await fetch(uri);
        if (res.ok) out.set(uri, new Uint8Array(await res.arrayBuffer()));
      }
    } catch {
      // photo not reachable (e.g. the server does not allow it) → the row shows only the count
    }
  }));
  return out;
}

type Line = { t: string; bold?: boolean; color?: Rgb };
type Col = { title: string; w: number; align?: 'left' | 'right' | 'center' };

const COLS: Col[] = [
  { title: '#', w: 22, align: 'right' },
  { title: 'PASS NO.', w: 64 },
  { title: 'DATE', w: 58 },
  { title: 'VISITOR', w: 112 },
  { title: 'COMPANY', w: 108 },
  { title: 'PURPOSE', w: 100 },
  { title: 'TO MEET', w: 80 },
  { title: 'IN', w: 44 },
  { title: 'OUT', w: 44 },
  { title: 'STAY', w: 44, align: 'right' },
  { title: 'STATUS', w: 58, align: 'center' },
  { title: 'PHOTOS', w: 52 },
];

/** Day-wise is printed up to this many days; longer periods have it in the Excel file. */
export const PDF_MAX_DAYS = 62;

export function buildPdfBytes(input: ExportInput, photos: Map<string, Uint8Array> = new Map()): Uint8Array {
  const doc = new PdfLite();
  const left = 28;
  const tableW = COLS.reduce((s, c) => s + c.w, 0);
  const right = left + tableW;
  const bottom = doc.height - 40;
  const size = 7.5;
  const lineH = 9.5;
  let y = 0;

  const imageIds = new Map<string, number>();
  photos.forEach((bytes, uri) => { const id = doc.addJpeg(bytes); if (id >= 0) imageIds.set(uri, id); });

  /* ------------------------------ title band ----------------------------- */
  const band = (subtitle: string, tall: boolean) => {
    const h = tall ? 70 : 44;
    doc.rect(0, 0, doc.width, h, NAVY);
    doc.rect(0, h, doc.width, 3, COPPER);
    doc.text(input.company, left, tall ? 24 : 17, 8, { bold: true, color: COPPER });
    doc.text(subtitle, left, tall ? 50 : 34, tall ? 21 : 14, { bold: true, color: WHITE });
    doc.text(input.period, right, tall ? 28 : 19, tall ? 11 : 9.5, { bold: true, color: WHITE, align: 'right' });
    doc.text(`Generated ${fmtDate(input.now)} ${fmtTime(input.now)} by ${input.generatedBy}`, right, tall ? 43 : 33, 7.5, { color: [186, 196, 208], align: 'right' });
    if (tall && input.filtersText) {
      const f = wrapText(`Filters: ${input.filtersText}`, 7.5, 420)[0];
      doc.text(f, right, 56, 7.5, { color: [240, 200, 160], align: 'right' });
    }
    y = h + 3;
  };

  const tableHead = () => {
    doc.rect(left, y, tableW, 18, NAVY);
    let x = left;
    COLS.forEach((c) => {
      const tx = c.align === 'right' ? x + c.w - 5 : c.align === 'center' ? x + c.w / 2 : x + 5;
      doc.text(c.title, tx, y + 12, 6.8, { bold: true, color: WHITE, align: c.align });
      x += c.w;
    });
    y += 18;
  };

  /* -------------------------------- page 1 ------------------------------- */
  band(input.title, true);

  // KPI tiles
  const tiles = kpiTiles(input.kpis, fmtDuration(input.kpis.avgStay));
  const gap = 8;
  const tileW = (tableW - gap * (tiles.length - 1)) / tiles.length;
  y += 12;
  tiles.forEach((tile, i) => {
    const x = left + i * (tileW + gap);
    const color = hex(tile.color);
    doc.roundRect(x, y, tileW, 44, 5, ALT);
    doc.roundRect(x, y, tileW, 5, 2.5, color);
    doc.rect(x, y + 2.5, tileW, 2.5, color);
    doc.text(tile.label, x + 8, y + 17, 6.5, { bold: true, color: MUTED });
    doc.text(tile.value, x + 8, y + 35, 15, { bold: true, color });
    doc.text(tile.sub, x + tileW - 8, y + 35, 6.5, { color: MUTED, align: 'right' });
  });
  y += 44 + 12;
  tableHead();

  /* ------------------------------- register ------------------------------ */
  if (!input.visits.length) {
    doc.text('No visits in this period.', left + 5, y + 16, 9, { color: MUTED });
    y += 26;
  }
  input.visits.forEach((v, i) => {
    const status = statusOf(v, input.now);
    const sc = STATUS_COLOR[status];
    const wrap = (text: string, n: number, bold = false, color?: Rgb): Line[] =>
      (text ? wrapText(text, size, COLS[n].w - 10, bold).map((t) => ({ t, bold, color })) : []);
    const cells: Line[][] = [
      [{ t: String(i + 1), color: MUTED }],
      wrap(v.visitNo, 1),
      wrap(fmtDate(v.inAt), 2),
      [...wrap(displayName(v), 3, true), ...wrap(v.mobile, 3, false, MUTED)],
      wrap(v.company, 4),
      [...wrap(labelOf(PURPOSES, v.purpose), 5), ...wrap(v.purposeNote, 5, false, MUTED)],
      wrap(v.hostName, 6),
      wrap(fmtTime(v.inAt), 7),
      wrap(v.outAt ? fmtTime(v.outAt) : '-', 8, false, v.outAt ? undefined : MUTED),
      [{ t: fmtDuration(stayMinutes(v, input.now)), bold: true, color: hex(sc.fg) }],
      [],
      [],
    ];
    const thumbs = v.photos.slice(0, PHOTOS_PER_ROW).map((p) => imageIds.get(p.uri)).filter((id): id is number => id !== undefined);
    const lines = Math.max(...cells.map((c) => c.length), 1);
    const h = Math.max(lines * lineH + 9, thumbs.length ? 26 : 22);

    if (y + h > bottom) {
      doc.addPage();
      band(`${input.title} (continued)`, false);
      y += 10;
      tableHead();
    }
    if (i % 2 === 1) doc.rect(left, y, tableW, h, ALT);

    let x = left;
    cells.forEach((cell, n) => {
      const c = COLS[n];
      cell.forEach((ln, k) => {
        const tx = c.align === 'right' ? x + c.w - 5 : x + 5;
        doc.text(ln.t, tx, y + 12 + k * lineH, size, { bold: ln.bold, color: ln.color || INK, align: c.align === 'right' ? 'right' : 'left' });
      });
      if (n === 10) {
        // status pill
        const label = STATUS_TEXT[status];
        const pw = Math.min(c.w - 6, textWidth(label, 6.6, true) + 12);
        doc.roundRect(x + (c.w - pw) / 2, y + 4.5, pw, 12, 6, hex(sc.bg));
        doc.text(label, x + c.w / 2, y + 13, 6.6, { bold: true, color: hex(sc.fg), align: 'center' });
      }
      if (n === 11) {
        thumbs.forEach((id, k) => doc.image(id, x + 4 + k * 19, y + 4, 17, 17));
        const more = v.photos.length - thumbs.length;
        if (v.photos.length && more > 0) {
          doc.text(thumbs.length ? `+${more}` : String(v.photos.length), x + 4 + thumbs.length * 19, y + 15, 6.5, { bold: true, color: MUTED });
        }
      }
      x += c.w;
    });
    doc.line(left, y + h, right, y + h, LINE);
    y += h;
  });

  /* ------------------- day-wise · month-wise · year-wise ------------------ */
  const P_COLS: { title: string; w: number; get: (r: PeriodRow) => string }[] = [
    { title: 'VISITS', w: 0.13, get: (r) => String(r.visits) },
    { title: 'PERSONS', w: 0.13, get: (r) => String(r.persons) },
    { title: 'UNIQUE', w: 0.13, get: (r) => (r.key === 'total' ? '' : String(r.unique)) },
    { title: 'WENT OUT', w: 0.13, get: (r) => String(r.out) },
    { title: 'INSIDE', w: 0.11, get: (r) => String(r.inside) },
    { title: 'AVG STAY', w: 0.14, get: (r) => (r.out ? fmtDuration(r.avgStay) : '-') },
  ];
  /** One totals table; continues on a new page when it does not fit. Returns the y after it. */
  const periodTable = (title: string, first: string, data: PeriodRow[], px: number, pw: number, startY: number): number => {
    let py = startY;
    const head = () => {
      doc.rect(px, py, pw, 16, NAVY);
      doc.text(first, px + 5, py + 11, 6.8, { bold: true, color: WHITE });
      let cx = px + pw * 0.23;
      P_COLS.forEach((c) => { cx += pw * c.w; doc.text(c.title, cx - 5, py + 11, 6.4, { bold: true, color: WHITE, align: 'right' }); });
      py += 16;
    };
    const line = (r: PeriodRow, i: number, total: boolean) => {
      if (total) doc.rect(px, py, pw, 15, hex(BRAND.greyBg));
      else if (i % 2 === 1) doc.rect(px, py, pw, 15, ALT);
      doc.text(wrapText(r.label, 7.5, pw * 0.23 - 8, true)[0], px + 5, py + 10.5, 7.5, { bold: true, color: r.visits || total ? INK : MUTED });
      let cx = px + pw * 0.23;
      P_COLS.forEach((c, n) => {
        cx += pw * c.w;
        doc.text(c.get(r), cx - 5, py + 10.5, 7.5, { bold: total || n === 0, color: r.visits || total ? INK : MUTED, align: 'right' });
      });
      doc.line(px, py + 15, px + pw, py + 15, LINE);
      py += 15;
    };
    doc.text(title, px, py + 10, 10.5, { bold: true, color: NAVY });
    doc.rect(px, py + 15, pw, 1.2, COPPER);
    py += 22;
    head();
    if (!data.length) { doc.text('No visits.', px + 5, py + 12, 8, { color: MUTED }); py += 20; }
    data.forEach((r, i) => {
      if (py + 15 > bottom) {
        doc.addPage();
        band(`${input.title} - ${title} (continued)`, false);
        py = y + 14;
        head();
      }
      line(r, i, false);
    });
    if (data.length) line(sumPeriods(data), 0, true);
    return py;
  };

  doc.addPage();
  band(`${input.title} - Month-wise and year-wise`, false);
  const half = (tableW - 24) / 2;
  const pTop = y + 14;
  periodTable(`Month-wise ${input.monthYear}`, 'MONTH', input.monthRows, left, half, pTop);
  periodTable('Year-wise (all years)', 'YEAR', input.yearRows, left + half + 24, half, pTop);

  doc.addPage();
  band(`${input.title} - Day-wise`, false);
  if (input.dayRows.length <= PDF_MAX_DAYS) {
    periodTable(`Day-wise - ${input.period}`, 'DAY', input.dayRows, left, tableW, y + 14);
  } else {
    doc.text(`Day-wise has ${input.dayRows.length} days for this period.`, left, y + 30, 10, { bold: true, color: NAVY });
    doc.text('It is in the "Day-wise" sheet of the Excel file. Choose a month (or a shorter period) to print the days here.', left, y + 46, 9, { color: MUTED });
  }

  /* -------------------------------- summary ------------------------------ */
  doc.addPage();
  band(`${input.title} - Summary`, false);
  const panelW = (tableW - 24) / 2;
  const panel = (title: string, data: Slice[], color: Rgb, px: number, py: number, max9 = 9) => {
    doc.text(title, px, py + 10, 10.5, { bold: true, color: NAVY });
    doc.rect(px, py + 15, panelW, 1.2, COPPER);
    const max = Math.max(...data.map((d) => d.count), 1);
    const list = data.slice(0, max9);
    const gapY = max9 > 9 ? 16 : 21;
    if (!list.length) doc.text('No data.', px, py + 34, 8, { color: MUTED });
    list.forEach((d, k) => {
      const ry = py + 26 + k * gapY;
      doc.text(wrapText(d.label, 8, panelW - 90)[0], px, ry + 6, 8, { bold: true, color: d.key ? INK : MUTED });
      doc.text(String(d.count), px + panelW - 44, ry + 6, 8, { bold: true, color: INK, align: 'right' });
      doc.text(`${d.pct.toFixed(0)}%`, px + panelW, ry + 6, 7.5, { color: MUTED, align: 'right' });
      doc.roundRect(px, ry + 10, panelW, 4, 2, ALT);
      if (d.count > 0) doc.roundRect(px, ry + 10, Math.max(4, (d.count / max) * panelW), 4, 2, d.key ? color : MUTED);
    });
  };
  const top = y + 18;
  const monthTotal = input.monthRows.reduce((sum, r) => sum + r.visits, 0) || 1;
  const monthSlices: Slice[] = input.monthRows.map((r) => ({ key: r.key, label: r.label, count: r.visits, pct: (r.visits / monthTotal) * 100 }));
  panel('Purpose of visit', input.purposes, COPPER, left, top);
  panel('Whom they came to meet', input.hosts, NAVY, left + panelW + 24, top);
  panel('Top companies', input.companies, hex(BRAND.purple), left, top + 232);
  panel(`Visits by month - ${input.monthYear}`, monthSlices, hex(BRAND.blue), left + panelW + 24, top + 232, 12);

  /* -------------------------------- footers ------------------------------ */
  const pages = doc.pageCount;
  for (let p = 0; p < pages; p += 1) {
    doc.setPage(p);
    doc.line(left, doc.height - 26, right, doc.height - 26, LINE);
    doc.text(`${input.company}  -  ${input.title}  -  ${input.period}`, left, doc.height - 15, 7, { color: MUTED });
    doc.text(`Page ${p + 1} of ${pages}`, right, doc.height - 15, 7, { bold: true, color: MUTED, align: 'right' });
  }
  return doc.build();
}
