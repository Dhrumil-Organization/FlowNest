import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
import SalesAnalysis from '@/components/SalesAnalysis';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [getUserPrptype, setUserPrp] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const p = await AsyncStorage.getItem('user_prptype');

            setToken(t || '');
            setUsername(u || 'User');
            setUserPrp(p || '')
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <SalesAnalysis token={token || ''} username={username} getUserPrptype={getUserPrptype} />
            {/* <Footer /> */}
            {/* </AuthProvider> */}
        </>
    );
}