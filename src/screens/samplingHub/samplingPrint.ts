// FILE: src/screens/samplingHub/samplingPrint.ts
// QR sticker print for the Sampling Hub — the Taka label path (same API as the taka sticker print):
//   printers  GET {API}/api/printers (x-api-key)  → createCheckingScannerApi(...).printers()  (same normalised list)
//   preview   POST {API}/api/taka-preview-label { printType: 6, rows }            → { success, pdfBase64 }
//   print     POST {API}/api/taka-print-label   { printerName, printType: 6, rows } → Node prints on the chosen printer
//   last printer remembered under the Checking Scanner key 'lastSelectedPrinter'.
// The rows come from the API (POST /sampling_hub/sticker), one per sample, in the Taka row shape:
//   { uid, ref_uid, prptype, prpcode, beamuid, beamno, strcode, islasttaka, isfirsttaka, yearno, printid, printno,
//     printjson, print_status, copy_no, kind, id, type, design, width, gsm, blend, name, remarks }
//   printid / beamno = Sample ID (printed above the QR) · printjson = what the QR carries ({"takano":"GAR-0012",…})
//   kind SAMPLE + the sticker text from the New Design master: design, width, gsm, blend, name, remarks
//   COPIES n → n row objects per sample, copy_no 1..n
import axios from 'axios';
import { createCheckingScannerApi, LAST_PRINTER_KEY, Printer, storage } from '../checkingScannerNew/checkingScannerApi';

export type { Printer };
export const PRINT_TYPE = 6;          // Sampling Hub sample sticker
export const MAX_COPIES = 20;

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'x-api-key': 'PRINT_SECRET_123',
});
const base = (API: string) => String(API || '').replace(/\/+$/, '');

export async function loadPrinters(API: string, token: string): Promise<{ printers: Printer[]; selected: string }> {
  const printers = await createCheckingScannerApi(API, token).printers();
  const saved = (await storage.get(LAST_PRINTER_KEY)) || '';
  const def = printers.find((p) => p.Name === saved) || printers.find((p) => p.IsDefault || p.isDefault || p.Default) || printers[0];
  return { printers, selected: def ? def.Name : '' };
}
export const rememberPrinter = (name: string) => storage.set(LAST_PRINTER_KEY, name);

/** rows × copies, sample by sample (A A B B, so a sheet of copies stays together); copy_no 1..n per sample */
export const withCopies = (rows: any[], copies: number) => {
  const n = Math.max(1, Math.min(MAX_COPIES, Math.round(copies) || 1));
  return rows.flatMap((r) => Array.from({ length: n }, (_, i) => ({ ...r, copy_no: i + 1 })));
};

const str = (v: any) => (v == null ? '' : String(v));
/** exactly the Taka label row (same keys, same order) + the sticker text keys; nothing else is sent */
const clean = (r: any) => ({
  uid: String(r.uid ?? ''),
  ref_uid: String(r.ref_uid ?? r.uid ?? ''),
  prptype: String(r.prptype ?? ''),
  prpcode: String(r.prpcode ?? ''),
  beamuid: String(r.beamuid ?? r.uid ?? ''),
  beamno: String(r.beamno ?? ''),
  strcode: String(r.strcode ?? ''),
  islasttaka: Number(r.islasttaka) || 0,
  isfirsttaka: Number(r.isfirsttaka) || 0,
  yearno: String(r.yearno ?? ''),
  printid: String(r.printid ?? ''),
  printno: Number(r.printno) || 1,
  printjson: String(r.printjson ?? ''),
  print_status: str(r.print_status) || 'PENDING',
  copy_no: Number(r.copy_no) || 1,
  kind: str(r.kind) || 'SAMPLE',
  id: str(r.id),
  type: str(r.type),
  design: str(r.design),
  width: str(r.width),
  gsm: str(r.gsm),
  blend: str(r.blend),
  name: str(r.name),
  remarks: str(r.remarks),
});

/** the label as the printer server renders it (PDF, base64) */
export async function previewSticker(API: string, rows: any[], token: string): Promise<string> {
  // all rows × copies (copy_no 1..n) — the print server makes one combined PDF of them
  const body = { printType: PRINT_TYPE, rows: rows.map(clean) };
  const res = await axios.post(`${base(API)}/api/taka-preview-label`, body, { headers: headers(token), timeout: 60000 });
  const d = res.data;
  const b64 = String(d?.pdfBase64 || d?.data?.pdfBase64 || '');
  if (!d?.success || !b64) throw new Error(d?.message || 'The print server did not return a preview.');
  return b64;
}

export async function printSticker(API: string, rows: any[], printerName: string, token: string): Promise<{ printed: number; message: string }> {
  if (!printerName) throw new Error('Select the printer first.');
  if (!rows.length) throw new Error('Nothing to print.');
  const body = { printerName, printType: PRINT_TYPE, rows: rows.map(clean) };
  const res = await axios.post(`${base(API)}/api/taka-print-label`, body, { headers: headers(token), timeout: 120000 });
  const d = res.data;
  if (!d?.success) throw new Error(d?.message || 'The printer did not accept the stickers.');
  const printed = Number(d?.printed) || rows.length;
  return { printed, message: `${printed} sticker${printed !== 1 ? 's' : ''} sent to ${printerName}.` };
}

export const printErr = (e: any) => String(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Print failed.');

/** what the QR on the sticker carries for a sample (same text the API puts in printjson) */
export const stickerQrText = (prpcode: string, uid: string, id: string, yearno: string) =>
  JSON.stringify({ prpcode, beamuid: uid, beamno: id, takano: id, yearno });
