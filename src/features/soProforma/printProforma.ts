// FILE: src/features/soProforma/printProforma.ts
// Prints the proforma HTML on the device: web → a print window ("Save as PDF" works there); phone → expo-print.
import * as Print from 'expo-print';
import { Platform } from 'react-native';

export async function printProformaHtml(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (!w) throw new Error('The print window was blocked - allow pop-ups for this site.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  await Print.printAsync({ html });
}
