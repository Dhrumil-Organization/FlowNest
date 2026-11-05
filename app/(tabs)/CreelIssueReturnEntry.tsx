import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
import CreelIssueReturnEntry from '@/components/CreelIssueReturn/CreelIssueReturnEntry';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [rightsMenuApps, setrightsMenuApps] = useState([]);

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            // const r = await AsyncStorage.getItem('rightsMenuApps');
            const r = await AsyncStorage.getItem('rightsMenuApps');

            const parsedData = r ? JSON.parse(r) : [];

            setToken(t || '');
            setUsername(u || 'User');
            setrightsMenuApps(parsedData)
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <CreelIssueReturnEntry token={token || ''} username={username}/>
            {/* <Footer /> */}
            {/* </AuthProvider> */}
        </>
    );
}