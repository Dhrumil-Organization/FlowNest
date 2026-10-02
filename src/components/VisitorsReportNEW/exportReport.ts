// FILE: src/components/VisitorsReportNEW/exportReport.ts
// Export of the Visitors Report (right: production.visitors_report → export).
// Everything uses exactly what is on screen (period + search + filters + sort).
//
//   Excel  prepareExcel() → preview data + file bytes   → saveExcel()
//          Real .xlsx with colours (xlsxLite.ts): Register, Visitors, Summary.
//   PDF    preparePdf()   → preview source + file        → savePdf()
//          Web: the PDF bytes (reportPdf.ts) — previewed in the page (desktop
//          browsers; phone browsers preview the same design as a page) and
//          downloaded unchanged. Phone: the HTML (reportHtml.ts) is previewed
//          in a WebView and expo-print turns the same HTML into the PDF file.
//   Print  printReport()  → print dialog (same HTML).
//
// ExportPreview.tsx is the screen that shows the preview with the Download button.
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ExportInput, fileStamp } from './exportModel';
import { buildReportHtml } from './reportHtml';
import { buildPdfBytes, loadPhotoBytes } from './reportPdf';
import { buildSheets } from './reportSheets';
import { buildXlsx, SheetSpec, toBase64 } from './xlsxLite';

export type { ExportInput } from './exportModel';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Web: save bytes as a file through the browser. */
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

/** Phone: write the file and open the share sheet (save to Files / Drive, WhatsApp, mail…). */
async function shareFile(uri: string, mime: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: 'Visitors Report', UTI: uti });
}

/* ---------------------------------- Excel -------------------------------- */

export type PreparedExcel = { fileName: string; sheets: SheetSpec[]; bytes: Uint8Array };

export function prepareExcel(input: ExportInput): PreparedExcel {
  const sheets = buildSheets(input);
  return { fileName: `Visitors_Report_${fileStamp(input.now)}.xlsx`, sheets, bytes: buildXlsx(sheets) };
}

export async function saveExcel(file: PreparedExcel): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(file.bytes, file.fileName, XLSX_MIME);
    return;
  }
  const path = `${FileSystem.cacheDirectory}${file.fileName}`;
  await FileSystem.writeAsStringAsync(path, toBase64(file.bytes), { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, XLSX_MIME, 'org.openxmlformats.spreadsheetml.sheet');
}

/* ----------------------------------- PDF --------------------------------- */

export type PreparedPdf = {
  fileName: string;
  /** Web: the finished file + a blob: URL the preview shows. */
  bytes?: Uint8Array;
  url?: string;
  /**
   * The report page. Phone: shown in the preview and converted by expo-print.
   * Web: shown in the preview when the browser cannot display a PDF inside a
   * page (phone browsers) — same design as the PDF.
   */
  html: string;
  /** Web: true when the browser has a built-in PDF viewer (desktop browsers). */
  inlinePdf?: boolean;
};

export async function preparePdf(input: ExportInput): Promise<PreparedPdf> {
  const fileName = `Visitors_Report_${fileStamp(input.now)}.pdf`;
  if (Platform.OS === 'web') {
    const bytes = buildPdfBytes(input, await loadPhotoBytes(input.visits));
    const g: any = globalThis;
    return {
      fileName,
      bytes,
      url: g.URL.createObjectURL(new g.Blob([bytes], { type: 'application/pdf' })),
      html: buildReportHtml(input),
      inlinePdf: g.navigator?.pdfViewerEnabled === true,
    };
  }
  return { fileName, html: buildReportHtml(input) };
}

/** Free the preview URL (web). */
export function releasePdf(file: PreparedPdf | null) {
  if (file?.url) (globalThis as any).URL.revokeObjectURL(file.url);
}

export async function savePdf(file: PreparedPdf): Promise<void> {
  if (Platform.OS === 'web') {
    if (file.bytes) downloadOnWeb(file.bytes, file.fileName, 'application/pdf');
    return;
  }
  // A4 landscape in points
  const made = await Print.printToFileAsync({ html: file.html, width: 842, height: 595, base64: false });
  // give the file a readable name (expo-print returns a random one)
  let uri = made.uri;
  try {
    const named = `${FileSystem.cacheDirectory}${file.fileName}`;
    await FileSystem.copyAsync({ from: made.uri, to: named });
    uri = named;
  } catch {
    // keep the original name
  }
  await shareFile(uri, 'application/pdf', 'com.adobe.pdf');
}

/* ---------------------------------- Print -------------------------------- */

export async function printReport(input: ExportInput): Promise<void> {
  const html = buildReportHtml(input);
  if (Platform.OS === 'web') {
    const win = (globalThis as any).open?.('', '_blank');
    if (!win) throw new Error('Allow pop-ups for this site to print the report.');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    return;
  }
  await Print.printAsync({ html, orientation: Print.Orientation.landscape });
}
