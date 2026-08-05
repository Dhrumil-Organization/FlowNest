// import { PermissionRouteGuard } from '@/src/core/navigation';
// import { BeamCloseScreen } from '@/src/screens/production/beam-close/BeamCloseScreen';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import React from 'react';

// export default function BeamCloseRoute() {
//   const token = useAppSessionStore((state) => state.token) || '';
//   const user = useAppSessionStore((state) => state.user);
//   return (
//     <PermissionRouteGuard resource="beam_close">
//       <BeamCloseScreen token={token} isConnected={true} username={user?.name || user?.first_name || ''} />
//     </PermissionRouteGuard>
//   );
// }
