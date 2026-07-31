import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
import DailyCollectionReport from '@/components/DailyCollectionReport';
import CreelManagementSystem from '@/components/CreelManagementSystem';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [rightsMenuApps, setrightsMenuApps] = useState([]);
    const [userId, setUserId] = useState<string | number>('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            // const r = await AsyncStorage.getItem('rightsMenuApps');
            const r = await AsyncStorage.getItem('rightsMenuApps');
            const id = await AsyncStorage.getItem('user_id');

            const parsedData = r ? JSON.parse(r) : [];

            setToken(t || '');
            setUsername(u || 'User');
            setrightsMenuApps(parsedData);
            setUserId(id || 0)
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <CreelManagementSystem token={token || ''} username={username} userid={userId} />
            {/* <Footer /> */}
            {/* </AuthProvider> */}
        </>
    );
}