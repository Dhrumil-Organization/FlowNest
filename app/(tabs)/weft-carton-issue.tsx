import AsyncStorage from '@/common/utils/compatibleStorage';
import WeftCartonIssueScreen from '@/components/WeftCartonIssue/WeftCartonIssueScreen';
import React, { useEffect, useState } from 'react';

export default function weftcartonissue() {
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
            <WeftCartonIssueScreen token={token || ''} username={username} userid={getUserId}/>
            {/* <Footer/> */}
            {/* </AuthProvider> */}
        </>
    );
}