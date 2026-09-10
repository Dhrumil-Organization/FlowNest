import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import Footer from '@/components/Footer';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
import SalesOrderTracking from '@/components/SalesOrderTracking';
import SalesOrderSaveSuccess from '@/components/YarnSalesOrder/SalesOrderSaveSuccess'
import SalesOrderItemList from '@/components/YarnSalesOrder/SalesOrderItemList';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');

            setToken(t || '');
            setUsername(u || 'User');
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <SalesOrderItemList token={token || ''} username={username} />
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}