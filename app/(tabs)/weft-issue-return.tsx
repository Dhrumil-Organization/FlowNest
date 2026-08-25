import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import WeftIssueReturn from '@/components/WeftIssueReturn/WeftIssueReturn';

export default function WeftIssueReturnContainer() {
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
        <WeftIssueReturn
            token={token}
            username={username}
        />
    );
}