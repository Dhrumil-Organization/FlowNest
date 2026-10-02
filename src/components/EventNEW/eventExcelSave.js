// eventExcelSave.js
// Saves / shares the generated .xlsx on every platform:
//   Web      -> normal browser download
//   Android  -> user picks a folder once (Storage Access Framework), file is written there
//   iOS      -> share sheet ("Save to Files", WhatsApp, Mail …)
import { Platform } from 'react-native';
// Expo SDK 54+: the classic API (EncodingType, StorageAccessFramework) lives in /legacy
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { bytesToBase64 } from './eventExcelBuilder';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Writes the file into the app cache and returns its file:// uri (native only).
async function writeToCache(bytes, fileName) {
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/** Open the share sheet (native) for the workbook. */
export async function shareExcel(bytes, fileName) {
  if (Platform.OS === 'web') return downloadExcel(bytes, fileName);
  const uri = await writeToCache(bytes, fileName);
  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, message: 'Sharing is not available on this device.' };
  }
  await Sharing.shareAsync(uri, {
    mimeType: XLSX_MIME,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: fileName,
  });
  return { ok: true, shared: true };
}

/** Download / save the workbook. Returns { ok, message?, cancelled?, shared? }. */
export async function downloadExcel(bytes, fileName) {
  if (Platform.OS === 'web') {
    const blob = new Blob([bytes], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, message: `${fileName} downloaded.` };
  }

  if (Platform.OS === 'android') {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return { ok: false, cancelled: true };
    const target = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri,
      fileName.replace(/\.xlsx$/i, ''),
      XLSX_MIME
    );
    await FileSystem.writeAsStringAsync(target, bytesToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { ok: true, message: `${fileName} saved to the selected folder.` };
  }

  // iOS: the share sheet is the standard way to save ("Save to Files")
  return shareExcel(bytes, fileName);
}
