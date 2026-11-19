// FILE: src/features/support/capture.ts
// Pictures for tickets:
//   captureScreen()  a picture of the screen the user is on (web: the page, phone: the app screen)
//   pickPictures()   photos / screenshots from the gallery or files
// Every picture is made into a small JPEG (max 1600 px) before upload.
// The Raise-ticket draft keeps the pictures + the screen they came from, so a user can open
// several screens, capture each, and send them all in one ticket.
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { create } from 'zustand';

const MAX_SIDE = 1600;
const QUALITY = 0.72;

export type Shot = { id: string; uri: string; name: string; from?: string; width?: number; height?: number };
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function shrinkOnWeb(uri: string): Promise<{ uri: string; width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const img = new (globalThis as any).Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = (globalThis as any).document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ uri: canvas.toDataURL('image/jpeg', QUALITY), width: canvas.width, height: canvas.height });
      };
      img.onerror = () => resolve({ uri, width: 0, height: 0 });
      img.src = uri;
    } catch {
      resolve({ uri, width: 0, height: 0 });
    }
  });
}

async function shrinkNative(uri: string, w?: number, h?: number) {
  const landscape = (w || 0) >= (h || 0);
  const big = Math.max(w || 0, h || 0) > MAX_SIDE || !w;
  const out = await ImageManipulator.manipulateAsync(
    uri,
    big ? [{ resize: landscape ? { width: MAX_SIDE } : { height: MAX_SIDE } }] : [],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return { uri: out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri, width: out.width, height: out.height };
}

/** a picture of the current screen as a data URL (null when the device cannot do it) */
export async function captureScreen(): Promise<{ uri: string; width: number; height: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-view-shot');
    const ViewShot = mod.default || mod;
    if (Platform.OS === 'web') {
      const uri: string = await Promise.race([
        ViewShot.captureScreen({ format: 'png', quality: 1, result: 'data-uri' }),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      return await shrinkOnWeb(uri);
    }
    const tmp: string = await ViewShot.captureScreen({ format: 'jpg', quality: 0.9, result: 'tmpfile' });
    return await shrinkNative(tmp.startsWith('file:') ? tmp : `file://${tmp}`);
  } catch (e) {
    console.log('[support] screen capture failed', (e as any)?.message);
    return null;
  }
}

/** pick one or more pictures */
export async function pickPictures(limit = 6): Promise<{ uri: string; name: string; width: number; height: number }[]> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.85,
  });
  if (r.canceled || !r.assets?.length) return [];
  const out = [];
  for (const a of r.assets.slice(0, limit)) {
    const s = Platform.OS === 'web' ? await shrinkOnWeb(a.uri) : await shrinkNative(a.uri, a.width, a.height);
    out.push({ ...s, name: a.fileName || `picture-${uid()}.jpg` });
  }
  return out;
}

/** take a photo with the camera (phones) */
export async function takePhoto(): Promise<{ uri: string; name: string; width: number; height: number } | null> {
  if (Platform.OS !== 'web') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return null;
  }
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const s = Platform.OS === 'web' ? await shrinkOnWeb(a.uri) : await shrinkNative(a.uri, a.width, a.height);
  return { ...s, name: `photo-${uid()}.jpg` };
}

/* ------------------------- Raise-ticket draft ------------------------- */
type Draft = {
  shots: Shot[];
  fromRoute: string; // screen the ticket was started from (module auto-detect)
  addShot: (s: Omit<Shot, 'id'>) => void;
  removeShot: (id: string) => void;
  setFrom: (route: string) => void;
  clear: () => void;
};
export const useTicketDraft = create<Draft>((set) => ({
  shots: [],
  fromRoute: '',
  addShot: (s) => set((d) => ({ shots: [...d.shots, { ...s, id: uid() }].slice(-8) })),
  removeShot: (id) => set((d) => ({ shots: d.shots.filter((x) => x.id !== id) })),
  setFrom: (fromRoute) => set({ fromRoute }),
  clear: () => set({ shots: [], fromRoute: '' }),
}));
