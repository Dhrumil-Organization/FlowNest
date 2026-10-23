import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SamplingHubView } from '@/src/screens/samplingHub/SamplingHubView';

// Sampling Hub — samples + QR stickers, scan & move, movement log (rights: production.sampling_hub)
export default function SamplingHubRoute() {
  return (
    <PermissionRouteGuard resource="production.sampling_hub" action="view">
      <SamplingHubView />
    </PermissionRouteGuard>
  );
}
