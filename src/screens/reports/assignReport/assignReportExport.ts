// FILE: src/screens/reports/assignReport/assignReportExport.ts
// A saved setting that exports (web: export = pdf / excel + filename + filedata base64):
//   web    PDF opens in a new tab, Excel downloads — exactly as the web Reports screen does
//   phone  the file is written and the share sheet opens (save to Files / Drive, WhatsApp, mail…)
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const b64ToBytes = (b64: string): Uint8Array => {
  const g: any = globalThis;
  const bin = g.atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export async function saveExportFile(file: { name: string; kind: string; base64: string }): Promise<string> {
  const kind = String(file.kind || '').toLowerCase();
  const mime = MIME[kind] || 'application/octet-stream';
  const name = file.name || (kind === 'pdf' ? 'report.pdf' : 'report.xlsx');
  if (Platform.OS === 'web') {
    const g: any = globalThis;
    const url = g.URL.createObjectURL(new g.Blob([b64ToBytes(file.base64)], { type: mime }));
    if (kind === 'pdf') {
      const w = g.window.open(url, '_blank');
      if (!w) {
        const a = g.document.createElement('a'); a.href = url; a.download = name; g.document.body.appendChild(a); a.click(); a.remove();
      }
    } else {
      const a = g.document.createElement('a'); a.href = url; a.download = name; g.document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => g.URL.revokeObjectURL(url), 60000);
    return kind === 'pdf' ? `PDF opened: ${name}` : `Downloaded: ${name}`;
  }
  const path = `${FileSystem.cacheDirectory}${name.replace(/[\\/:*?"<>|]+/g, '_')}`;
  await FileSystem.writeAsStringAsync(path, file.base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: mime, dialogTitle: name, UTI: kind === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet' });
    return `File ready: ${name}`;
  }
  return `File saved: ${path}`;
}
