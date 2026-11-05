// FILE: src/screens/samplingHub/samplingPhoto.ts
// Identification photo of a garment sample: camera (phone) / file picker (web), shrunk to a small JPEG data URL
// (720 px, quality 0.62 — as in the artifact) so it fits the API limit. Same approach as VisitorsNEW/photos.ts.
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const MAX_SIDE = 720;
const QUALITY = 0.62;

function shrinkOnWeb(uri: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new (globalThis as any).Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = (globalThis as any).document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.onerror = () => resolve('');
      img.src = uri;
    } catch {
      resolve('');
    }
  });
}

async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (Platform.OS === 'web') return shrinkOnWeb(asset.uri);
  const landscape = (asset.width || 0) >= (asset.height || 0);
  const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: landscape ? { width: MAX_SIDE } : { height: MAX_SIDE } }], {
    compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true,
  });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : '';
}

/** camera on phones (gallery when `fromGallery`), file picker on web. '' when cancelled. */
export async function takeSamplePhoto(fromGallery = false): Promise<string> {
  if (Platform.OS !== 'web' && !fromGallery) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is off — allow it in the phone settings, or choose a photo from the gallery.');
  }
  const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false } as any;
  const res = Platform.OS === 'web' || fromGallery ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
  if (res.canceled || !res.assets?.length) return '';
  return shrink(res.assets[0]);
}
