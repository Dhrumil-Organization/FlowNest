// FILE: src/components/SalesChallanPackingSlipNEW/WebCameraScanner.tsx
// Native (iOS / Android app) stub — the browser version is WebCameraScanner.web.tsx.
// On the app the camera always goes through expo-camera (see ScanDevices.tsx).
import React from 'react';

export const hasWebBarcodeDetector = () => false;

export default function WebCameraScanner(_props: { onScan: (code: string) => void; enabled: boolean; torch: boolean; onBack?: () => void }): React.ReactElement | null {
  return null;
}
