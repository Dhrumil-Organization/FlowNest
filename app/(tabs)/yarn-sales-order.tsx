import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// import YarnPurchaseOrder from '@/components/YarnPurchaseOrder_old';

import YarnSalesOrder from '@/components/YarnSalesOrder/YarnSalesOrder';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState<string | number>('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const id = await AsyncStorage.getItem('user_id');
            console.log('user_details raw =>', u, id);

            setToken(t || '');
            setUsername(u || 'User');
            setUserId(id || 0)
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <YarnSalesOrder token={token || ''} isConnected={true} username={username} userid={userId} />
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}