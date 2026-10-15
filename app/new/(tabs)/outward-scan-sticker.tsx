import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { OutwardScanStickerScreen } from '@/src/screens/production/OutwardScanStickerScreen';

export default function OutwardScanStickerRoute() {
  return (
    <PermissionRouteGuard resource="production.outward_scan_sticker" action="view">
      <OutwardScanStickerScreen />
    </PermissionRouteGuard>
  );
}
