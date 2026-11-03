// FILE: src/screens/reports/assignReport/reportFiles.ts
// Assign Report → make / save / print the Excel and PDF of the loaded report (what the screen shows).
//   Web      the file is downloaded by the browser (PDF also previewed inside the page on desktop browsers)
//   Android / iOS  the file is written and the share sheet opens (save to Files / Drive, WhatsApp, mail…);
//                  the PDF is made by expo-print from the same layout (reportPdf.ts → buildPdfHtml)
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ExportInput, fileBase } from './reportExportModel';
import { buildPdfBytes, buildPdfHtml, paperOf } from './reportPdf';
import { buildSheet, toBase64, xlsxBytes, XSheet } from './reportXlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function downloadOnWeb(bytes: Uint8Array, fileName: string, mime: string) {
  const g: any = globalThis;
  const url = g.URL.createObjectURL(new g.Blob([bytes], { type: mime }));
  const link = g.document.createElement('a');
  link.href = url;
  link.download = fileName;
  g.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => g.URL.revokeObjectURL(url), 4000);
}

async function shareFile(uri: string, mime: string, uti: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: title, UTI: uti });
}

/** lets the loader paint before a big file is built */
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 30));

/* ---------------------------------- Excel --------------------------------- */

export type PreparedExcel = { fileName: string; sheet: XSheet; bytes: Uint8Array };

export async function prepareExcel(input: ExportInput): Promise<PreparedExcel> {
  await nextFrame();
  const sheet = buildSheet(input);
  return { fileName: `${fileBase(input)}.xlsx`, sheet, bytes: xlsxBytes(sheet) };
}

export async function saveExcel(file: PreparedExcel, title: string): Promise<void> {
  if (Platform.OS === 'web') { downloadOnWeb(file.bytes, file.fileName, XLSX_MIME); return; }
  const path = `${FileSystem.cacheDirectory}${file.fileName}`;
  await FileSystem.writeAsStringAsync(path, toBase64(file.bytes), { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, XLSX_MIME, 'org.openxmlformats.spreadsheetml.sheet', title);
}

/* ----------------------------------- PDF ---------------------------------- */

export type PreparedPdf = {
  fileName: string;
  /** the page (phone: preview + expo-print source; phone browsers: preview) */
  html: string;
  /** web: the finished file and a blob: URL for the preview */
  bytes?: Uint8Array;
  url?: string;
  /** web: the browser can show a PDF inside the page (desktop browsers) */
  inlinePdf?: boolean;
  paper: { w: number; h: number };
};

export async function preparePdf(input: ExportInput): Promise<PreparedPdf> {
  await nextFrame();
  const fileName = `${fileBase(input)}.pdf`;
  const html = buildPdfHtml(input);
  const paper = paperOf(input);
  if (Platform.OS === 'web') {
    const bytes = buildPdfBytes(input);
    const g: any = globalThis;
    return {
      fileName, html, bytes, paper,
      url: g.URL.createObjectURL(new g.Blob([bytes], { type: 'application/pdf' })),
      inlinePdf: g.navigator?.pdfViewerEnabled === true,
    };
  }
  return { fileName, html, paper };
}

export function releasePdf(file: PreparedPdf | null) {
  if (file?.url) (globalThis as any).URL.revokeObjectURL(file.url);
}

export async function savePdf(file: PreparedPdf, title: string): Promise<void> {
  if (Platform.OS === 'web') { if (file.bytes) downloadOnWeb(file.bytes, file.fileName, 'application/pdf'); return; }
  const made = await Print.printToFileAsync({ html: file.html, width: Math.round(file.paper.w), height: Math.round(file.paper.h), base64: false });
  let uri = made.uri;
  try {
    const named = `${FileSystem.cacheDirectory}${file.fileName}`;
    await FileSystem.deleteAsync(named, { idempotent: true });
    await FileSystem.copyAsync({ from: made.uri, to: named });
    uri = named;
  } catch {
    // keep expo-print's name
  }
  await shareFile(uri, 'application/pdf', 'com.adobe.pdf', title);
}

export async function printPdf(file: PreparedPdf): Promise<void> {
  if (Platform.OS === 'web') {
    const win = (globalThis as any).open?.('', '_blank');
    if (!win) throw new Error('Allow pop-ups for this site to print the report.');
    win.document.open();
    win.document.write(file.html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    return;
  }
  await Print.printAsync({ html: file.html, orientation: Print.Orientation.landscape });
}
