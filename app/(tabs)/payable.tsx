import Footer from '@/components/Footer';
import Payable from '@/components/Payable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

export default function Receivables_Container() {
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');
            setToken(t || '');
            setUsername(u || 'User');
            setIsLoading(false); // Set loading to false after fetching
        };
        load();
    }, []);

    if (isLoading) {
        return <ActivityIndicator size="large" />; // Show a loader while fetching
    }

    return (
        <>
            <Payable token={token} username={username} />
            {/* <Footer /> */}
        </>
    );
}