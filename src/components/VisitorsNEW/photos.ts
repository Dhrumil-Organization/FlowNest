// FILE: src/components/VisitorsNEW/photos.ts
// Camera / gallery for visitor photos (face, visiting card, material, other).
// Works on Android, iOS and web (expo-image-picker — on a phone
// browser "camera" opens the phone camera, on a desktop it opens the file
// picker). Every photo is shrunk to a small JPEG so many photos can be taken
// per visitor without slowing the phone or the upload.
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { PhotoKind, uid, VisitPhoto } from './model';

const MAX_SIDE = 1100;
const QUALITY = 0.55;

export class PhotoPermissionError extends Error {}

/** Web: resize with a canvas. */
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
      img.onerror = () => resolve(uri);
      img.src = uri;
    } catch {
      resolve(uri);
    }
  });
}

async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (Platform.OS === 'web') return shrinkOnWeb(asset.uri);
  try {
    const landscape = (asset.width || 0) >= (asset.height || 0);
    const out = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: landscape ? { width: MAX_SIDE } : { height: MAX_SIDE } }],
      { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
  } catch {
    return asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
  }
}

const toPhoto = async (asset: ImagePicker.ImagePickerAsset, kind: PhotoKind): Promise<VisitPhoto> => ({
  id: uid('ph'), kind, uri: await shrink(asset), takenAt: new Date().toISOString(),
});

/** Open the camera and return ONE photo (null when cancelled). */
export async function takePhoto(kind: PhotoKind): Promise<VisitPhoto | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new PhotoPermissionError('CAMERA_PERMISSION_DENIED');
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toPhoto(result.assets[0], kind);
}

/** Pick one or many photos from the gallery / files. */
export async function pickPhotos(kind: PhotoKind): Promise<VisitPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsMultipleSelection: true,
    selectionLimit: 10,
  });
  if (result.canceled || !result.assets?.length) return [];
  return Promise.all(result.assets.map((a) => toPhoto(a, kind)));
}
