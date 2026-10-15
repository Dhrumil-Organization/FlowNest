import React from 'react';
import { OutwardScanStickerView } from '../outwardScanSticker/OutwardScanStickerView';

// Outward Scan Sticker — grey store job inward by scanning the fusion (checking) sticker.
// Backend: GreyScanInwardController (POST /api/grey_scan_inward/*); property + year from the login context.
// Rights: production.outward_scan_sticker (view · add · edit · delete).
export function OutwardScanStickerScreen() {
  return <OutwardScanStickerView />;
}
