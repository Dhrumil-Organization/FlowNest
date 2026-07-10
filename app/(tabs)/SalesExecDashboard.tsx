import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// import SalesOrderTracking from '@/components/SalesOrderTracking';
import SalesExecDashboard from '@/components/EmployDashboard/rn-app/screens/SalesExecDashboardScreen';

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
            <SalesExecDashboard token={token || ''} username={username}/>
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}