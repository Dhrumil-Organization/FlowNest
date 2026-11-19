// FILE: src/features/soProforma/printHtml.ts
// A4 Proforma Invoice as HTML. The device prints it (web: browser print → "Save as PDF"; phone: expo-print),
// so no server print type is needed. Company / bank lines come from PI_COMPANY below until a master exists.
import { fmt2, fmtQ, num, r3 } from '../beamInOut/logic';
import type { TaxCalcLine } from '../beamInOut/logic';
import { amountInWords, toDMY } from './logic';
import type { PiLine } from './types';

/** fill these per property (or load them from the property master later) */
export const PI_COMPANY: Record<string, { name?: string; address?: string; gstin?: string; bank?: string }> = {
  // SIP: { name: 'Sudamo Impex Pvt. Ltd.', address: '…', gstin: '…', bank: 'Bank: … A/c: … IFSC: …' },
};

export interface PiPrintData {
  prpCode: string;
  prpName: string;
  no: string;
  date: string;
  validTill: string;
  soNo: string;
  soDate: string;
  party: string;
  parCode: string;
  lines: PiLine[];
  tax: TaxCalcLine[];
  gross: number;
  net: number;
  remark: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function proformaHtml(d: PiPrintData): string {
  const co = PI_COMPANY[d.prpCode] ?? {};
  const lines = d.lines.filter(l => r3(num(l.qty)) > 0);
  const totQty = r3(lines.reduce((s, l) => s + r3(num(l.qty)), 0));
  const taxRows = d.tax.filter(t => !t.off && t.signed !== 0);
  const body = lines
    .map(
      (l, i) => `<tr><td class="c">${i + 1}</td><td>${esc(l.name)}</td><td class="c">${esc(l.hsn)}</td>
        <td class="r">${fmtQ(num(l.qty))}</td><td class="r">${fmt2(l.rate)}</td><td class="r">${fmt2(num(l.qty) * l.rate)}</td></tr>`,
    )
    .join('');
  const taxes = taxRows
    .map(t => `<tr><td>${t.taxMode === '-' ? 'Less: ' : ''}${esc(t.taxName)}${!t.manual && num(t.per) ? ` @ ${num(t.per)}%` : ''}</td><td class="r">${fmt2(t.signed)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Proforma ${esc(d.no)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; }
  .co { text-align: center; border-bottom: 2px solid #0D1B2A; padding-bottom: 6px; }
  .co h1 { margin: 0; font-size: 20px; letter-spacing: .5px; }
  .co div { font-size: 11px; color: #333; }
  .ttl { text-align: center; font-weight: 800; font-size: 15px; letter-spacing: 2px; margin: 10px 0; }
  .grid { display: flex; border: 1px solid #555; }
  .grid > div { flex: 1; padding: 6px 8px; }
  .grid > div + div { border-left: 1px solid #555; }
  .lbl { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: .5px; }
  .big { font-weight: 700; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #555; padding: 5px 6px; vertical-align: top; }
  th { background: #E9EDF2; font-size: 11px; }
  .r { text-align: right; white-space: nowrap; } .c { text-align: center; }
  .sum { width: 46%; margin-left: auto; }
  .sum td { border: none; border-bottom: 1px solid #ddd; }
  .net td { font-weight: 800; font-size: 14px; border-top: 2px solid #111; }
  .words { margin-top: 8px; font-weight: 700; }
  .box { border: 1px solid #555; padding: 6px 8px; margin-top: 8px; min-height: 40px; white-space: pre-wrap; }
  .sign { display: flex; justify-content: space-between; margin-top: 40px; }
  .sign div { width: 40%; text-align: center; border-top: 1px solid #555; padding-top: 4px; }
  .note { margin-top: 8px; font-size: 10px; color: #555; text-align: center; }
</style></head><body>
  <div class="co"><h1>${esc(co.name || d.prpName || d.prpCode)}</h1>
    ${co.address ? `<div>${esc(co.address)}</div>` : ''}${co.gstin ? `<div>GSTIN: ${esc(co.gstin)}</div>` : ''}</div>
  <div class="ttl">PROFORMA INVOICE</div>
  <div class="grid">
    <div><div class="lbl">To</div><div class="big">${esc(d.party)}</div><div>${esc(d.parCode)}</div></div>
    <div>
      <div><span class="lbl">Proforma No.</span> <b>${esc(d.no)}</b></div>
      <div><span class="lbl">Date</span> <b>${esc(toDMY(d.date))}</b></div>
      ${d.validTill ? `<div><span class="lbl">Valid till</span> <b>${esc(toDMY(d.validTill))}</b></div>` : ''}
      <div><span class="lbl">Against S.O.</span> <b>${esc(d.soNo)}</b> dt. ${esc(toDMY(d.soDate))}</div>
    </div>
  </div>
  <table>
    <thead><tr><th style="width:34px">#</th><th>Description</th><th style="width:70px">HSN</th><th style="width:90px">Qty</th><th style="width:80px">Rate</th><th style="width:100px">Amount</th></tr></thead>
    <tbody>${body}
      <tr><td></td><td class="r"><b>Total</b></td><td></td><td class="r"><b>${fmtQ(totQty)}</b></td><td></td><td class="r"><b>${fmt2(d.gross)}</b></td></tr>
    </tbody>
  </table>
  <table class="sum">
    <tr><td>Gross</td><td class="r">${fmt2(d.gross)}</td></tr>
    ${taxes}
    <tr class="net"><td>Net Amount</td><td class="r">₹ ${fmt2(d.net)}</td></tr>
  </table>
  <div class="words">${esc(amountInWords(d.net))}</div>
  <div class="box"><span class="lbl">Bank details</span><br>${esc(co.bank || '')}</div>
  <div class="box"><span class="lbl">Terms / Remarks</span><br>${esc(d.remark)}</div>
  <div class="sign"><div>Receiver's signature</div><div>For ${esc(co.name || d.prpName || d.prpCode)}<br><br>Authorised signatory</div></div>
  <div class="note">This is a proforma invoice for advance / reference only. It is not a tax invoice; the final invoice may differ.</div>
</body></html>`;
}
