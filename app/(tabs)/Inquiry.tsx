import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import Footer from '@/components/Footer';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// import SalesOrderTracking from '@/components/SalesOrderTracking';
import SalesOrderTrackingPartyDetails from '@/components/SalesOrderTracking/SOPartyDetails/SOPartyDetails';
import CollectionList from '@/components/CollectionList';
import Collection from '@/components/Collection';
import CollectionEdit from '@/components/CollectionEdit';
import DashboardScreen from '@/src_inquiry/screens/DashboardScreen';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [getUsertype, setUsertype] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const p = await AsyncStorage.getItem('user_prptype');

            setToken(t || '');
            setUsername(u || 'User');
            setUsertype(p || '')
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <DashboardScreen token={token || ''} username={username} getUserId={getUsertype} />
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}