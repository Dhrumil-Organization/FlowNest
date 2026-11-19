// FILE: src/features/repackingIssue/scanner.ts
// Urovo hardware scan engine → carton entry. Uses the existing WarehouseNEW bridge
// (no-op on web / iOS / devices without the native module, so it is web-safe).
// Keyboard-wedge scanners and desktop keyboards also work through the Carton No box.
import { useUrovoScanner, triggerUrovoScan, type UrovoStatus } from '@/src/components/WarehouseNEW/useUrovoScanner';

export function useRepackScanner(onScan: (code: string) => void, enabled: boolean): UrovoStatus {
  return useUrovoScanner(value => {
    if (enabled) onScan(String(value ?? '').trim());
  });
}

export { triggerUrovoScan };
export type { UrovoStatus };
