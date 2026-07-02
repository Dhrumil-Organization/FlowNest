import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
import SalesAnalysis from '@/components/SalesAnalysis';
import OrdersScreen from '@/components/SalesOrderNew';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [getUserPrptype, setUserPrp] = useState('');
    const [getUserId, setUserId] = useState();

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const p = await AsyncStorage.getItem('user_prptype');
            const i = await AsyncStorage.getItem('user_id');

            setToken(t || '');
            setUsername(u || 'User');
            setUserPrp(p || '')
            setUserId(p)
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <OrdersScreen token={token || ''} username={username} userid={getUserId} />
            {/* <Footer /> */}
            {/* </AuthProvider> */}
        </>
    );
}