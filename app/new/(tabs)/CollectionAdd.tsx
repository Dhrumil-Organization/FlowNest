// import AsyncStorage from '@/common/utils/compatibleStorage';
// import React, { useEffect, useState } from 'react';

// // import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import Footer from '@/components/Footer';
// // import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// // import SalesOrderTracking from '@/components/SalesOrderTracking';
// import SalesOrderTrackingPartyDetails from '@/components/SalesOrderTracking/SOPartyDetails/SOPartyDetails';
// import CollectionList from '@/components/CollectionList';
// import Collection from '@/components/Collection';

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
//             <Collection token={token || ''} username={username} />
//             {/* <Footer/> */}
//             {/* </AuthProvider> */}
//         </>
//     );
// }

import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CollectionAddScreen } from '@/src/screens/production/CollectionAddScreen';

export default function PurchaseOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.Collection" action="view">
      <CollectionAddScreen />
    </PermissionRouteGuard>
  );
}