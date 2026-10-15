// FILE: src/components/OwnerDashboardNEW/fonts.ts
// Font of this module = the "Order tracking" reference page: Archivo (body) + Archivo Narrow (page headings).
// Web : loaded from Google Fonts by loadOwnerFonts() (called once from index.tsx).
// Mobile: undefined -> the phone's own font is used (to get Archivo on the phone too, load it with
//         expo-font + @expo-google-fonts/archivo and put the family names here).
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

export const FONT: string | undefined = web ? "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" : undefined;
export const FONT_HEAD: string | undefined = web ? "'Archivo Narrow', 'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" : undefined;

export function loadOwnerFonts() {
  if (!web || typeof document === 'undefined' || document.getElementById('owner-dashboard-fonts')) return;
  const link = document.createElement('link');
  link.id = 'owner-dashboard-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@500;600;700&display=swap';
  document.head.appendChild(link);
}
