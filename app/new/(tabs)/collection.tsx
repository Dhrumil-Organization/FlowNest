// import AsyncStorage from '@/common/utils/compatibleStorage';
// import React, { useEffect, useState } from 'react';

// // import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// // import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// // import SalesOrderTracking from '@/components/SalesOrderTracking';
// import CollectionList from '@/components/CollectionList';

// export default function CRLimit_Request_Container() {
//     // const { token, username } = useAuth();
//     const [token, setToken] = useState('');
//     const [username, setUsername] = useState('');

//     useEffect(() => {
//         const load = async () => {
//             const t = await AsyncStorage.getItem('access_token');
//             const u = await AsyncStorage.getItem('user_details');

//             setToken(t || '');
//             setUsername(u || 'User');
//         };
//         load();
//     }, []);

//     return (
//         <>
//             {/* <AuthProvider> */}
//             <CollectionList token={token || ''} username={username} />
//             {/* <Footer/> */}
//             {/* </AuthProvider> */}
//         </>
//     );
// }

import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CollectionScreen } from '@/src/screens/production/CollectionScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.collection" action="view">
      <CollectionScreen />
    </PermissionRouteGuard>
  );
}