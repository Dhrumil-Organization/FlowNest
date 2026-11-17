// FILE: src/features/support/download.ts
// Excel downloads of the Support Desk (built on the server, any number of rows).
// Web: browser download. Phone / tablet: saved to the app cache and opened in the share sheet
// (save to Files / Drive, WhatsApp, e-mail …).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { exportUrl } from './api';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** the file name the server chose (Content-Disposition), else the fallback */
function nameFrom(header: string | null | undefined, fallback: string) {
  const m = String(header || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : fallback;
}

async function download(url: string, headers: Record<string, string>, fallback: string) {
  if (Platform.OS === 'web') {
    const g: any = globalThis;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      let msg = 'Export failed.';
      try { msg = (await r.json()).message || msg; } catch { /* not json */ }
      throw new Error(msg);
    }
    const name = nameFrom(r.headers.get('Content-Disposition'), fallback);
    const blob = await r.blob();
    const href = g.URL.createObjectURL(blob);
    const a = g.document.createElement('a');
    a.href = href;
    a.download = name;
    g.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => g.URL.revokeObjectURL(href), 4000);
    return name;
  }
  const path = `${FileSystem.cacheDirectory}${fallback}`;
  const res = await FileSystem.downloadAsync(url, path, { headers });
  if (res.status !== 200) {
    let msg = 'Export failed.';
    try { msg = JSON.parse(await FileSystem.readAsStringAsync(res.uri)).message || msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: XLSX, dialogTitle: fallback, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  }
  return fallback;
}

/** fallback file name from the params, e.g. support-desk-2026-11.xlsx */
export function excelName(prefix: string, params: Record<string, string>) {
  const f = params.from || '';
  const t = params.to || '';
  let p = new Date().toISOString().slice(0, 10);
  if (f && t) p = f === t ? `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}` : f.slice(0, 6) === t.slice(0, 6) && f.endsWith('01') ? `${f.slice(0, 4)}-${f.slice(4, 6)}` : `${f}_to_${t}`;
  return `${prefix}-${p}.xlsx`;
}

/** IT Desk: every card for the period + filters */
export function downloadExcel(base: string, token: string, params: Record<string, string>) {
  return download(exportUrl(base, params), { 'X-Support-Token': token }, excelName('support-desk', params));
}

/** Raise ticket: the user's own tickets */
export function downloadMyTickets(base: string, bearer: string, property: string, params: Record<string, string>) {
  return download(exportUrl(base, params, 'client-export'), { Authorization: `Bearer ${bearer}`, 'X-Erp-Property': property, Accept: 'application/json' }, excelName('my-tickets', params));
}
