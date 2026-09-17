// src/utils/expoScannerHelper.ts
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

export {
    CameraView as Camera,
    useCameraPermissions as useCameraPermission,
};

export type { BarcodeScanningResult };

// ✅ Stand-in for `useCameraDevice('back')` — just returns a truthy marker
export const useCameraDevice = (facing: 'back' | 'front') => {
    return facing === 'back' ? { id: 'back' } : { id: 'front' };
};
