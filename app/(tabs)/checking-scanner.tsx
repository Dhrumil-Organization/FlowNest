import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
// import GreyPurchaseOrder from '@/components/GreyPurchaseOrder';
// import SalesOrderTracking from '@/components/SalesOrderTracking';
import CheckingScanner from '@/components/CheckingScanner';

export default function CRLimit_Request_Container() {
    // const { token, username } = useAuth();
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [newuser, setNewUser] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            const n = await AsyncStorage.getItem('new_user');

            setToken(t || '');
            setUsername(u || 'User');
            setNewUser(n || 'false')
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            {/* {newuser === 'true' ? (
                <CheckingScannerNew token={token || ''} username={username} />
            ) : ( */}
                <CheckingScanner token={token || ''} username={username} />
             {/* )} */}

            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}