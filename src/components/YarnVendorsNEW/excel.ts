// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/excel.ts
//
// The vendor list as an Excel workbook. The sheet is described as plain data
// (SheetSpec) and written by the app's own .xlsx writer
// (VisitorsReportNEW/xlsxLite.ts — real .xlsx with colours, frozen header,
// filter). The on-screen preview draws the SAME SheetSpec, so what the user
// previews is exactly what is downloaded.
//
//   Web   : the browser downloads the file.
//   Phone : the file is written to the cache and the share sheet opens
//           (Save to Files / Drive, WhatsApp, mail…).
// ─────────────────────────────────────────────────────────────
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { buildXlsx, c, Cell, colName, SheetSpec, toBase64 } from '../VisitorsReportNEW/xlsxLite';
import { SearchResult, Vendor } from './api';
import { COMPANY } from './config';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Col = { title: string; width: number; kind?: 'strong' | 'center'; value: (v: Vendor, i: number) => string | number };

/** The fixed columns of the list (same order in the preview and in the file). */
export const COLUMNS: Col[] = [
  { title: 'Sr', width: 5, kind: 'center', value: (_v, i) => i + 1 },
  { title: 'Yarn Item', width: 26, value: (v) => v.searched_item },
  { title: 'Searched In', width: 14, value: (v) => v.searched_area },
  { title: 'Party Name', width: 30, kind: 'strong', value: (v) => v.party_name },
  { title: 'Party Item Name', width: 34, value: (v) => v.party_item_name },
  { title: 'Rate', width: 16, value: (v) => v.rate },
  { title: 'Contact No', width: 20, value: (v) => v.contact_no },
  { title: 'Address', width: 44, value: (v) => v.address },
  { title: 'City', width: 14, value: (v) => v.city },
  { title: 'State', width: 14, value: (v) => v.state },
  { title: 'Remarks', width: 28, value: (v) => v.remarks },
  { title: 'Source', width: 46, value: (v) => v.source_url },
];

/** Rows above the data: company, title, search details, notice, blank, header. */
export const HEADER_ROWS = 6;

export const NOTICE =
  'Collected by AI from public web listings. Verify party, contact and rate before dealing — rates are as listed online and may be old.';

/** Entered values that were really searched (skipped ones left out). */
export const searchedItems = (r: SearchResult) => r.items.filter((it) => !r.skippedItems.includes(it));
export const searchedCities = (r: SearchResult) => r.cities.filter((ct) => !r.skippedCities.includes(ct));

export function buildSheet(result: SearchResult, generatedBy: string): SheetSpec {
  const n = COLUMNS.length;
  const blank = (count: number): Cell[] => Array.from({ length: count }, () => c('', 'blank'));
  const pad = (first: Cell): Cell[] => [first, ...blank(n - 1)];

  const meta = [
    `Item: ${searchedItems(result).join(', ') || result.item}`,
    `Area: ${searchedCities(result).join(', ') || result.area}`,
    `Parties: ${result.vendors.length}`,
    result.searchedAt ? `Searched: ${result.searchedAt}` : '',
    generatedBy ? `By: ${generatedBy}` : '',
  ].filter(Boolean).join('   |   ');

  const rows: Cell[][] = [
    pad(c(COMPANY, 'eyebrow')),
    pad(c('Yarn Vendors', 'title')),
    pad(c(meta, 'meta')),
    pad(c(NOTICE, 'meta')),
    blank(n),
    COLUMNS.map((col) => c(col.title, 'head')),
  ];

  result.vendors.forEach((vendor, i) => {
    const alt = i % 2 === 1;
    rows.push(COLUMNS.map((col) => {
      const style = col.kind === 'strong' ? (alt ? 'strongAlt' : 'strong') : col.kind === 'center' ? (alt ? 'centerAlt' : 'center') : alt ? 'cellAlt' : 'cell';
      return c(col.value(vendor, i), style);
    }));
  });

  const last = colName(n - 1);
  return {
    name: 'Yarn Vendors',
    cols: COLUMNS.map((col) => col.width),
    rows,
    heights: { 1: 26, [HEADER_ROWS - 1]: 22 },
    freezeRow: HEADER_ROWS,
    filter: `A${HEADER_ROWS}:${last}${rows.length}`,
    merges: [`A1:${last}1`, `A2:${last}2`, `A3:${last}3`, `A4:${last}4`],
  };
}

const slug = (text: string) => text.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'Yarn';

export function excelFileName(result: SearchResult): string {
  const stamp = (result.searchedAt || '').replace(/[^0-9]/g, '').slice(0, 12);
  const its = searchedItems(result);
  const cts = searchedCities(result);
  const itemPart = its.length > 1 ? `${its.length}_items` : slug(its[0] || result.item);
  const areaPart = cts.length > 1 ? `${cts.length}_cities` : slug(cts[0] || (result.cities.length ? result.area : 'All India'));
  return `Yarn_Vendors_${itemPart}_${areaPart}${stamp ? `_${stamp}` : ''}.xlsx`;
}

/** Build the .xlsx and hand it to the user (download on web, share sheet on phone). */
export async function downloadExcel(result: SearchResult, generatedBy: string): Promise<void> {
  const bytes = buildXlsx([buildSheet(result, generatedBy)]);
  const fileName = excelFileName(result);

  if (Platform.OS === 'web') {
    const g: any = globalThis;
    const url = g.URL.createObjectURL(new g.Blob([bytes], { type: XLSX_MIME }));
    const link = g.document.createElement('a');
    link.href = url;
    link.download = fileName;
    g.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => g.URL.revokeObjectURL(url), 4000);
    return;
  }

  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(path, { mimeType: XLSX_MIME, dialogTitle: 'Yarn Vendors', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}
