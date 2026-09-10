import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

// import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import Footer from '@/components/Footer';
import SnapView from '@/components/SnapView';

export default function CRLimit_Request_Container() {
    const [token, setToken] = useState('');
    const [deviceId, setDeviceId] = useState();
    const [username, setUsername] = useState('');

    useEffect(() => {
        const load = async () => {
            const a = await AsyncStorage.getItem('access_token');
            const t = await AsyncStorage.getItem('cache_deviceId');
            const u = await AsyncStorage.getItem('user_details');

            setToken(a || '');
            setDeviceId(t as any);
            setUsername(u || 'User');
        };
        load();
    }, []);

    return (
        <>
            {/* <AuthProvider> */}
            <SnapView token={token || ''} deviceId={deviceId || ''} username={username} />
            <Footer/>
            {/* </AuthProvider> */}
        </>
    );
}