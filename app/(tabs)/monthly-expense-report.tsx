import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import Footer from '@/components/Footer';
import MonthlyExpenseReport from '@/components/MonthlyExpenseReport';

export default function CRLimit_Request_Container() {
    // const { deviceId, username } = useAuth();
    const [deviceId, setDeviceId] = useState();
    const [username, setUsername] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('cache_deviceId');
            const u = await AsyncStorage.getItem('user_details');

            setDeviceId(t as any);
            setUsername(u || 'User');
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <MonthlyExpenseReport deviceId={deviceId || ''} username={username} />
            <Footer/>
            {/* </AuthProvider> */}
        </>
    );
}