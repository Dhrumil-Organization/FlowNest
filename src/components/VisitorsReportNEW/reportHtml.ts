// FILE: src/components/VisitorsReportNEW/reportHtml.ts
// The Visitors Report as a colourful A4-landscape HTML page. Used for:
//   - Print (web + phone)
//   - the PDF on Android / iOS (expo-print turns this page into the file)
//   - the PDF preview on Android / iOS (WebView shows this page)
// Same design as the web PDF (reportPdf.ts): navy title band, KPI tiles,
// banded register with coloured stay + status pills and small photos, then
// month-wise / year-wise / day-wise totals and a summary page with bars. Every script (Hindi, Gujarati…) prints correctly.
import { displayName, fmtDate, fmtDuration, fmtTime, labelOf, PURPOSES, statusOf, stayMinutes } from '../VisitorsNEW/model';
import { BRAND, ExportInput, kpiTiles, STATUS_COLOR, STATUS_TEXT } from './exportModel';
import { PDF_MAX_DAYS } from './reportPdf';
import { PeriodRow, Slice, sumPeriods } from './reportModel';

const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Main text + a grey second line (no empty line when the first is missing). */
const two = (main: string, sub: string) =>
  [main ? esc(main) : '', sub ? `<span class="m">${esc(sub)}</span>` : ''].filter(Boolean).join('<br>');

export function buildReportHtml(input: ExportInput): string {
  const rows = input.visits.map((v, i) => {
    const status = statusOf(v, input.now);
    const sc = STATUS_COLOR[status];
    const thumbs = v.photos.slice(0, 3).map((p) => `<img src="${esc(p.uri)}" alt="">`).join('');
    const more = v.photos.length > 3 ? `<span class="m">+${v.photos.length - 3}</span>` : '';
    return `
    <tr>
      <td class="r m">${i + 1}</td>
      <td>${esc(v.visitNo)}</td>
      <td>${esc(fmtDate(v.inAt))}</td>
      <td><b>${esc(displayName(v))}</b>${v.mobile ? `<br><span class="m">${esc(v.mobile)}</span>` : ''}</td>
      <td>${esc(v.company)}</td>
      <td>${two(labelOf(PURPOSES, v.purpose), v.purposeNote)}</td>
      <td>${esc(v.hostName)}</td>
      <td>${esc(fmtTime(v.inAt))}</td>
      <td>${v.outAt ? esc(fmtTime(v.outAt)) : '<span class="m">–</span>'}</td>
      <td class="r"><b style="color:#${sc.fg}">${esc(fmtDuration(stayMinutes(v, input.now)))}</b></td>
      <td class="c"><span class="pill" style="background:#${sc.bg};color:#${sc.fg}">${esc(STATUS_TEXT[status])}</span></td>
      <td class="p">${thumbs}${more}</td>
    </tr>`;
  }).join('');

  const tiles = kpiTiles(input.kpis, fmtDuration(input.kpis.avgStay)).map((t) => `
    <div class="tile" style="border-top-color:#${t.color}">
      <div class="tl">${esc(t.label)}</div>
      <div class="tv"><b style="color:#${t.color}">${esc(t.value)}</b><span>${esc(t.sub)}</span></div>
    </div>`).join('');

  const panel = (title: string, data: Slice[], color: string, limit = 9) => {
    const max = Math.max(...data.map((d) => d.count), 1);
    const list = data.slice(0, limit).map((d) => `
      <div class="bar">
        <div class="bt"><b${d.key ? '' : ' class="m"'}>${esc(d.label)}</b><span><b>${d.count}</b> &nbsp;<i>${d.pct.toFixed(0)}%</i></span></div>
        <div class="track"><div class="fill" style="width:${Math.max(1, (d.count / max) * 100)}%;background:#${d.key ? color : BRAND.muted}"></div></div>
      </div>`).join('');
    return `<div class="panel"><h3>${esc(title)}</h3>${list || '<div class="m">No data.</div>'}</div>`;
  };

  const periodTable = (title: string, first: string, data: PeriodRow[]) => {
    const t = sumPeriods(data);
    const tr = (r: PeriodRow, total: boolean) => `
      <tr class="${total ? 'tot' : r.visits ? '' : 'zero'}">
        <td><b>${esc(r.label)}</b></td><td class="r"><b>${r.visits}</b></td><td class="r">${r.persons}</td>
        <td class="r">${total ? '' : r.unique}</td><td class="r">${r.out}</td><td class="r">${r.inside}</td>
        <td class="r">${r.out ? esc(fmtDuration(r.avgStay)) : '–'}</td>
      </tr>`;
    return `<div class="ptable"><h3>${esc(title)}</h3><table>
      <thead><tr><th>${esc(first)}</th><th class="r">VISITS</th><th class="r">PERSONS</th><th class="r">UNIQUE</th><th class="r">WENT OUT</th><th class="r">INSIDE</th><th class="r">AVG STAY</th></tr></thead>
      <tbody>${data.map((r) => tr(r, false)).join('') || '<tr><td colspan="7" class="m">No visits.</td></tr>'}${data.length ? tr(t, true) : ''}</tbody>
    </table></div>`;
  };
  const monthTotal = input.monthRows.reduce((sum, r) => sum + r.visits, 0) || 1;
  const monthSlices: Slice[] = input.monthRows.map((r) => ({ key: r.key, label: r.label, count: r.visits, pct: (r.visits / monthTotal) * 100 }));
  const dayWise = input.dayRows.length <= PDF_MAX_DAYS
    ? periodTable(`Day-wise · ${input.period}`, 'DAY', input.dayRows)
    : `<div class="ptable"><h3>Day-wise</h3><div class="m">Day-wise has ${input.dayRows.length} days for this period — it is in the “Day-wise” sheet of the Excel file. Choose a month (or a shorter period) to print the days here.</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title)}</title>
<style>
  @page { size: A4 landscape; margin: 9mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; color: #${BRAND.ink}; font-size: 10px; margin: 0; }
  .band { background: #${BRAND.navy}; color: #fff; padding: 12px 14px; border-bottom: 3px solid #${BRAND.copper}; display: flex; justify-content: space-between; align-items: flex-end; border-radius: 4px 4px 0 0; }
  .eyebrow { font-size: 9px; letter-spacing: 1.2px; color: #${BRAND.copper}; font-weight: bold; }
  h1 { font-size: 21px; margin: 4px 0 0; }
  .right { text-align: right; }
  .period { font-size: 12px; font-weight: bold; }
  .gen { font-size: 8.5px; color: #BAC4D0; margin-top: 3px; }
  .flt { font-size: 8.5px; color: #F0C8A0; margin-top: 2px; }
  .tiles { display: flex; gap: 7px; margin: 10px 0; }
  .tile { flex: 1; background: #${BRAND.alt}; border-top: 4px solid; border-radius: 5px; padding: 6px 8px; }
  .tl { font-size: 7.5px; font-weight: bold; color: #${BRAND.muted}; letter-spacing: 0.4px; }
  .tv { display: flex; justify-content: space-between; align-items: baseline; margin-top: 3px; }
  .tv b { font-size: 17px; }
  .tv span { font-size: 7.5px; color: #${BRAND.muted}; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: #${BRAND.navy}; color: #fff; text-align: left; padding: 5px 6px; font-size: 8px; letter-spacing: 0.4px; }
  td { border-bottom: 1px solid #${BRAND.line}; padding: 5px 6px; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #${BRAND.alt}; }
  tr { page-break-inside: avoid; }
  .c { text-align: center; } .r { text-align: right; }
  .m { color: #${BRAND.muted}; font-size: 9px; font-weight: normal; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 9px; font-size: 8.5px; font-weight: bold; white-space: nowrap; }
  .p { white-space: nowrap; }
  .p img { width: 28px; height: 28px; object-fit: cover; border-radius: 4px; margin-right: 3px; vertical-align: middle; }
  .summary { page-break-before: always; padding-top: 2px; }
  .summary h2 { font-size: 15px; color: #${BRAND.navy}; margin: 0 0 8px; }
  .panels { display: flex; flex-wrap: wrap; gap: 16px 22px; }
  .panel { width: calc(50% - 11px); page-break-inside: avoid; }
  .panel h3 { font-size: 11.5px; color: #${BRAND.navy}; margin: 0 0 7px; padding-bottom: 4px; border-bottom: 1.5px solid #${BRAND.copper}; }
  .bar { margin-bottom: 6px; }
  .bt { display: flex; justify-content: space-between; font-size: 9.5px; }
  .bt i { color: #${BRAND.muted}; font-style: normal; font-size: 8.5px; }
  .track { height: 5px; background: #${BRAND.alt}; border-radius: 3px; margin-top: 2px; overflow: hidden; }
  .fill { height: 5px; border-radius: 3px; }
  .ptable { flex: 1; min-width: 46%; }
  .ptable h3 { font-size: 11.5px; color: #${BRAND.navy}; margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1.5px solid #${BRAND.copper}; }
  .ptable td, .ptable th { padding: 4px 6px; }
  tr.zero td { color: #${BRAND.muted}; }
  tr.zero td b { font-weight: normal; }
  tbody tr.tot td { background: #${BRAND.greyBg}; font-weight: bold; border-top: 1.5px solid #${BRAND.navy}; }
  .foot { margin-top: 8px; color: #${BRAND.muted}; font-size: 8px; border-top: 1px solid #${BRAND.line}; padding-top: 4px; }
  @media screen { body { padding: 10px; background: #fff; } }
</style></head><body>
  <div class="band">
    <div><div class="eyebrow">${esc(input.company)}</div><h1>${esc(input.title)}</h1></div>
    <div class="right">
      <div class="period">${esc(input.period)}</div>
      <div class="gen">Generated ${esc(fmtDate(input.now))} ${esc(fmtTime(input.now))} by ${esc(input.generatedBy)}</div>
      ${input.filtersText ? `<div class="flt">Filters: ${esc(input.filtersText)}</div>` : ''}
    </div>
  </div>
  <div class="tiles">${tiles}</div>
  <table>
    <thead><tr>
      <th class="r">#</th><th>PASS NO.</th><th>DATE</th><th>VISITOR</th><th>COMPANY</th><th>PURPOSE</th>
      <th>TO MEET</th><th>IN</th><th>OUT</th><th class="r">STAY</th><th class="c">STATUS</th><th>PHOTOS</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="12" class="c m">No visits in this period.</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <h2>Month-wise and year-wise</h2>
    <div class="panels">
      ${periodTable(`Month-wise ${input.monthYear}`, 'MONTH', input.monthRows)}
      ${periodTable('Year-wise (all years)', 'YEAR', input.yearRows)}
    </div>
  </div>
  <div class="summary">
    <h2>Day-wise</h2>
    ${dayWise}
  </div>
  <div class="summary">
    <h2>Summary</h2>
    <div class="panels">
      ${panel('Purpose of visit', input.purposes, BRAND.copper)}
      ${panel('Whom they came to meet', input.hosts, BRAND.navy)}
      ${panel('Top companies', input.companies, BRAND.purple)}
      ${panel(`Visits by month · ${input.monthYear}`, monthSlices, BRAND.blue, 12)}
    </div>
    <div class="foot">${esc(input.company)} · ${esc(input.title)} · ${esc(input.period)}</div>
  </div>
</body></html>`;
}
