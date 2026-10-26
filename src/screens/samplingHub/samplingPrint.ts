// FILE: src/screens/samplingHub/samplingPrint.ts
// QR sticker print for the Sampling Hub — EXACTLY the Checking Scanner print path:
//   printers  GET {API}/api/printers (x-api-key)  → createCheckingScannerApi(...).printers()  (same normalised list)
//   preview   POST PRINTSTICKER { data:[rows], IskgQty:0, printype:'Preview', PrintFormat:4, printerName }
//             → NodePrintController → Node → { success, mode:'Preview', pdfBase64 } (the label exactly as printed)
//   print     POST PRINTSTICKER { …, printype:'Print' } → Node grey label on the chosen printer
//   last printer remembered under the Checking Scanner key 'lastSelectedPrinter'.
// The label rows come from the API (POST /sampling_hub/sticker): Checking Scanner row shape with PrpCode / UId /
// SrNo 1 / TakaNo = Sample No., so the Node QR reads PRPCODE~UID~1~0~44~SAMPLENO and the Sampling Hub scanner
// opens the sample from it.
import * as Dyn from '@/common/API/dynamicAPI';
import axios from 'axios';
import { createCheckingScannerApi, LAST_PRINTER_KEY, Printer, storage } from '../checkingScannerNew/checkingScannerApi';

export type { Printer };
export const PRINT_FORMAT = 4;          // Checking Scanner sticker (60 × 60 mm)
export const MAX_COPIES = 20;

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'x-api-key': 'PRINT_SECRET_123',
});

export async function loadPrinters(API: string, token: string): Promise<{ printers: Printer[]; selected: string }> {
  const printers = await createCheckingScannerApi(API, token).printers();
  const saved = (await storage.get(LAST_PRINTER_KEY)) || '';
  const def = printers.find((p) => p.Name === saved) || printers.find((p) => p.IsDefault || p.isDefault || p.Default) || printers[0];
  return { printers, selected: def ? def.Name : '' };
}
export const rememberPrinter = (name: string) => storage.set(LAST_PRINTER_KEY, name);

/** rows × copies, sample by sample (A A B B, so a sheet of copies stays together) */
export const withCopies = (rows: any[], copies: number) => {
  const n = Math.max(1, Math.min(MAX_COPIES, Math.round(copies) || 1));
  return rows.flatMap((r) => Array.from({ length: n }, () => r));
};

const sendSticker = async (rows: any[], printype: 'Preview' | 'Print', printerName: string, token: string) => {
  const body = { data: rows, IskgQty: 0, printype, PrintFormat: PRINT_FORMAT, printerName: printerName || '', txntype: 'sampling_hub' };
  const res = await axios.post(Dyn.PRINTSTICKER, body, { headers: headers(token), timeout: printype === 'Preview' ? 60000 : 30000 });
  return res.data;
};

/** the label as the printer server renders it (PDF, base64) */
export async function previewSticker(rows: any[], printerName: string, token: string): Promise<string> {
  const d = await sendSticker(rows.slice(0, 1), 'Preview', printerName, token);
  const b64 = String(d?.pdfBase64 || d?.data?.pdfBase64 || '');
  if (!d?.success || !b64) throw new Error(d?.message || 'The print server did not return a preview.');
  return b64;
}

export async function printSticker(rows: any[], printerName: string, token: string): Promise<{ printed: number; message: string }> {
  if (!printerName) throw new Error('Select the printer first.');
  if (!rows.length) throw new Error('Nothing to print.');
  const d = await sendSticker(rows, 'Print', printerName, token);
  if (!d?.success) throw new Error(d?.message || 'The printer did not accept the stickers.');
  const printed = Number(d?.printed) || rows.length;
  return { printed, message: `${printed} sticker${printed !== 1 ? 's' : ''} sent to ${printerName}.` };
}

export const printErr = (e: any) => String(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Print failed.');

/** what the Node QR encodes for a sample (checking sticker format) — shown in the app preview */
export const stickerQrText = (prpcode: string, uid: string, id: string) => `${prpcode}~${uid}~1~0~44~${id}`;
