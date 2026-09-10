import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import YarnManagementSystem from '@/components/YarnManagementSystem';

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
            <YarnManagementSystem token={token || ''} username={username} />
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}