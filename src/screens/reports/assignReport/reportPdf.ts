// FILE: src/screens/reports/assignReport/reportPdf.ts
// Assign Report → the PDF, laid out as the screen grid (landscape):
//   every page: report name + generated time, setting · dates, rows · filters, then the column header again
//   rows with grid lines, banding and the screen's row colours, long text wrapped (up to 3 lines)
//   group lines, sub totals and the grand TOTAL, "Page x of y" at the bottom
// Paper: A4 landscape; a report with many columns goes to A3 landscape so the text stays readable.
//
//   buildPdfBytes()  the file on WEB (PdfLite — src/components/VisitorsReportNEW/pdfLite.ts, no library)
//   buildPdfHtml()   the same layout as a page: Android / iOS make the PDF from it with expo-print
//                    (prints every script, e.g. Hindi), and phone browsers preview it.
import { hex, PdfLite, Rgb, wrapText } from '@/src/components/VisitorsReportNEW/pdfLite';
import { cellTint } from './assignReportModel';
import {
  buildLines, cellText, ExportInput, metaLines, solidHex, stamp, subLabel, totalLabel, totalText,
} from './reportExportModel';

const C = {
  ink: hex('1A1514'), muted: hex('6B655F'), navy: hex('0D1B2A'), white: hex('FFFFFF'), copper: hex('C87533'),
  band: hex('F8F5F1'), line: hex('D9D3CC'), group: hex('FBF0E4'), sub: hex('F0EDE8'),
};

export type Paper = { name: 'A4' | 'A3'; w: number; h: number };
const A4: Paper = { name: 'A4', w: 841.89, h: 595.28 };
const A3: Paper = { name: 'A3', w: 1190.55, h: 841.89 };
const M = 24; // page margin (pt)

/** paper, column widths (pt) and font size for the shown columns */
export function pdfLayout(input: ExportInput) {
  const natural = input.cols.reduce((s, c) => s + c.width * 0.75, 0) || 1;
  const paper = natural > (A4.w - 2 * M) * 1.35 ? A3 : A4;
  const avail = paper.w - 2 * M;
  const scale = avail / natural;
  const font = Math.max(5.2, Math.min(8.5, 8 * scale));
  const widths = input.cols.map((c) => c.width * 0.75 * scale);
  return { paper, widths, font, avail };
}

/* ---------------------------------- web ----------------------------------- */

export function buildPdfBytes(input: ExportInput): Uint8Array {
  const { paper, widths, font, avail } = pdfLayout(input);
  const pdf = new PdfLite(paper.w, paper.h);
  const cols = input.cols;
  const first = cols[0];
  const pad = 3;
  const lh = font * 1.22;
  const bottom = paper.h - M - 14;
  const xs: number[] = [];
  widths.reduce((x, w) => { xs.push(x); return x + w; }, M);
  const meta = metaLines(input);
  let y = 0;

  const lines3 = (text: string, w: number, bold = false) => {
    const ls = wrapText(text, font, Math.max(4, w - 2 * pad), bold);
    if (ls.length <= 3) return ls;
    const cut = ls.slice(0, 3);
    cut[2] = `${cut[2].replace(/.{0,3}$/, '')}...`;
    return cut;
  };
  const textAt = (t: string, i: number, top: number, align: 'left' | 'center' | 'right', bold: boolean, color: Rgb) => {
    const x = align === 'right' ? xs[i] + widths[i] - pad : align === 'center' ? xs[i] + widths[i] / 2 : xs[i] + pad;
    pdf.text(t, x, top, font, { bold, color, align });
  };
  const gridLines = (top: number, h: number) => {
    pdf.line(M, top + h, M + avail, top + h, C.line, 0.4);
    xs.forEach((x) => pdf.line(x, top, x, top + h, C.line, 0.4));
    pdf.line(M + avail, top, M + avail, top + h, C.line, 0.4);
  };

  const pageHead = () => {
    pdf.text(input.reportName || 'Report', M, M + 10, 13, { bold: true, color: C.navy });
    pdf.text(`Generated ${stamp(input.now)}`, paper.w - M, M + 10, 7.5, { color: C.muted, align: 'right' });
    let t = M + 22;
    meta.slice(0, 2).forEach((m) => {
      wrapText(m, 7.5, avail).slice(0, 2).forEach((l) => { pdf.text(l, M, t, 7.5, { color: C.muted }); t += 9.5; });
    });
    pdf.line(M, t - 4, M + avail, t - 4, C.copper, 0.8);
    y = t + 2;
    // column header
    const heads = cols.map((c, i) => lines3(c.header, widths[i], true));
    const h = Math.max(1, ...heads.map((l) => l.length)) * lh + 6;
    pdf.rect(M, y, avail, h, C.navy);
    heads.forEach((ls, i) => ls.forEach((l, k) => textAt(l, i, y + 3 + font + k * lh - 1, cols[i].align, true, C.white)));
    xs.slice(1).forEach((x) => pdf.line(x, y, x, y + h, hex('3A4756'), 0.4));
    y += h;
  };
  const room = (h: number) => {
    if (y + h <= bottom) return;
    pdf.addPage();
    pageHead();
  };

  pageHead();
  const all = buildLines(input);
  if (!all.length) {
    pdf.text(input.totalRows ? 'Nothing matches the filters.' : 'No data for this setting and period.', M + 4, y + 16, 9, { color: C.muted });
  }
  all.forEach((ln) => {
    if (ln.kind === 'group') {
      const h = lh + 6;
      room(h + lh + 6); // keep the group line with its first row
      pdf.rect(M, y, avail, h, C.group);
      pdf.text(`${ln.label}   (${ln.count} row${ln.count !== 1 ? 's' : ''})`, M + pad + ln.depth * 10, y + 3 + font, font, { bold: true, color: C.copper });
      pdf.line(M, y + h, M + avail, y + h, C.line, 0.4);
      pdf.line(M, y, M, y + h, C.line, 0.4);
      pdf.line(M + avail, y, M + avail, y + h, C.line, 0.4);
      y += h;
      return;
    }
    if (ln.kind === 'row') {
      const texts = cols.map((c, i) => lines3(cellText(c, ln.row[c.name]), widths[i]));
      const h = Math.max(1, ...texts.map((l) => l.length)) * lh + 5;
      room(h);
      const bg = solidHex(ln.tint);
      if (bg) pdf.rect(M, y, avail, h, hex(bg));
      else if (ln.band) pdf.rect(M, y, avail, h, C.band);
      cols.forEach((c, i) => {
        const t = solidHex(cellTint(c, ln.row[c.name]));
        if (t) pdf.rect(xs[i], y, widths[i], h, hex(t));
      });
      texts.forEach((ls, i) => ls.forEach((l, k) => textAt(l, i, y + 2.5 + font + k * lh - 1, cols[i].align, false, C.ink)));
      gridLines(y, h);
      y += h;
      return;
    }
    const isTotal = ln.kind === 'total';
    const label = isTotal ? totalLabel(first, ln.count) : subLabel(first, ln.label);
    const texts = cols.map((c, i) => (i === 0 && label ? lines3(label, widths[i], true) : [totalText(c, ln.totals)]));
    const h = Math.max(1, ...texts.map((l) => l.length)) * lh + 6;
    room(h);
    pdf.rect(M, y, avail, h, isTotal ? C.navy : C.sub);
    texts.forEach((ls, i) => ls.forEach((l, k) => textAt(l, i, y + 3 + font + k * lh - 1, i === 0 && label ? 'left' : cols[i].align, true, isTotal ? C.white : C.copper)));
    gridLines(y, h);
    y += h;
  });

  // footer on every page
  const pages = pdf.pageCount;
  for (let i = 0; i < pages; i += 1) {
    pdf.setPage(i);
    pdf.line(M, paper.h - M - 6, paper.w - M, paper.h - M - 6, C.line, 0.4);
    pdf.text(`${input.reportName}${input.settingName ? ` · ${input.settingName}` : ''}`, M, paper.h - M + 3, 7, { color: C.muted });
    pdf.text(`Page ${i + 1} of ${pages}`, paper.w - M, paper.h - M + 3, 7, { color: C.muted, align: 'right' });
  }
  return pdf.build();
}

/* --------------------------------- html ----------------------------------- */

const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPdfHtml(input: ExportInput): string {
  const { paper, widths, font } = pdfLayout(input);
  const total = widths.reduce((s, w) => s + w, 0) || 1;
  const cols = input.cols;
  const first = cols[0];
  const n = Math.max(1, cols.length);
  const al = (a: string) => (a === 'right' ? 'r' : a === 'center' ? 'c' : '');
  const body = buildLines(input).map((ln) => {
    if (ln.kind === 'group') {
      return `<tr class="grp"><td colspan="${n}" style="padding-left:${4 + ln.depth * 12}px">${esc(ln.label)} <span>(${ln.count} row${ln.count !== 1 ? 's' : ''})</span></td></tr>`;
    }
    if (ln.kind === 'row') {
      const bg = solidHex(ln.tint);
      return `<tr class="${ln.band && !bg ? 'band' : ''}"${bg ? ` style="background:#${bg}"` : ''}>${cols.map((c) => {
        const t = solidHex(cellTint(c, ln.row[c.name]));
        return `<td class="${al(c.align)}"${t ? ` style="background:#${t}"` : ''}>${esc(cellText(c, ln.row[c.name]))}</td>`;
      }).join('')}</tr>`;
    }
    const isTotal = ln.kind === 'total';
    const label = isTotal ? totalLabel(first, ln.count) : subLabel(first, ln.label);
    return `<tr class="${isTotal ? 'tot' : 'sub'}">${cols.map((c, i) => (i === 0 && label
      ? `<td>${esc(label)}</td>`
      : `<td class="${al(c.align)}">${esc(totalText(c, ln.totals))}</td>`)).join('')}</tr>`;
  }).join('');
  const empty = input.rows.length ? '' : `<tr><td colspan="${n}" class="empty">${input.totalRows ? 'Nothing matches the filters.' : 'No data for this setting and period.'}</td></tr>`;
  const meta = metaLines(input);
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(input.reportName)}</title>
<style>
  @page { size: ${paper.name} landscape; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 10px; font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Devanagari', Arial, sans-serif; color: #1A1514; background: #fff; }
  @media print { body { padding: 0; } }
  h1 { font-size: 17px; margin: 0; color: #0D1B2A; }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .gen { font-size: 10px; color: #6B655F; white-space: nowrap; }
  .meta { font-size: 10px; color: #6B655F; margin-top: 3px; }
  .rule { border: 0; border-top: 1.5px solid #C87533; margin: 6px 0 6px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${font.toFixed(1)}pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #0D1B2A; color: #fff; font-weight: 700; text-align: left; padding: 4px 4px; border: 0.5pt solid #3A4756; vertical-align: middle; word-wrap: break-word; }
  td { padding: 3px 4px; border: 0.5pt solid #D9D3CC; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
  .r { text-align: right; } .c { text-align: center; }
  td.r { font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.band td { background: #F8F5F1; }
  tr.grp td { background: #FBF0E4; color: #C87533; font-weight: 700; }
  tr.grp td span { color: #6B655F; font-weight: 600; }
  tr.sub td { background: #F0EDE8; color: #C87533; font-weight: 700; }
  tr.tot td { background: #0D1B2A; color: #fff; font-weight: 700; }
  .empty { text-align: center; color: #6B655F; padding: 18px; }
</style></head><body>
<div class="top"><h1>${esc(input.reportName || 'Report')}</h1><div class="gen">Generated ${esc(stamp(input.now))}</div></div>
${meta.slice(0, 2).map((m) => `<div class="meta">${esc(m)}</div>`).join('')}
<hr class="rule"/>
<table>
  <colgroup>${widths.map((w) => `<col style="width:${((w / total) * 100).toFixed(3)}%"/>`).join('')}</colgroup>
  <thead><tr>${cols.map((c) => `<th class="${al(c.align)}">${esc(c.header)}</th>`).join('')}</tr></thead>
  <tbody>${body}${empty}</tbody>
</table>
</body></html>`;
}

/** expo-print page size (points) for the layout */
export const paperOf = (input: ExportInput) => pdfLayout(input).paper;
