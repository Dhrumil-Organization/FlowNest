// import { PermissionRouteGuard } from '@/src/core/navigation';
// import { BeamGaitingScreen } from '@/src/screens/production/beam-gaiting/BeamGaitingScreen';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import React from 'react';

// export default function BeamGaitingRoute() {
//   const token = useAppSessionStore((state) => state.token) || '';
//   const user = useAppSessionStore((state) => state.user);
//   return (
//     <PermissionRouteGuard resource="beam_gaiting">
//       <BeamGaitingScreen token={token} username={user?.name || user?.first_name || ''} />
//     </PermissionRouteGuard>
//   );
// }
