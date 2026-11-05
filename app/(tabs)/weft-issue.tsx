import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import Footer from '@/components/Footer';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// import YarnPurchaseOrder from '@/components/YarnPurchaseOrder_old';
import YarnManagementSystem from '@/components/YarnManagementSystem';
import WftIssue from '@/components/WftIssue';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [getUserId, setUserId] = useState();

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const p = await AsyncStorage.getItem('user_id');

            setToken(t || '');
            setUsername(u || 'User');
            setUserId(p);
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <WftIssue token={token || ''} username={username} userid={getUserId}/>
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}