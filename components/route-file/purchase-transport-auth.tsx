import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

import WarehouseStack from '@/components/Warehouse/WarehouseStack';

export default function PurchaseTransportAuthScreen() {
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [userid, setUserid] = useState(0);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            const u = await AsyncStorage.getItem('user_details');

            setToken(t || '');

            // 'user_details' aapke baaki screens me jaise store hota hai (string ya JSON) —
            // usi pattern ko follow karo. Agar JSON hai to yaha parse karke
            // username / userid nikaal lo, warna jo bhi aapka existing key hai wo use karo.
            try {
                const parsed = u ? JSON.parse(u) : null;
                setUsername(parsed?.username || u || 'User');
                setUserid(parsed?.userid || parsed?.UserId || 0);
            } catch {
                setUsername(u || 'User');
            }
        };
        load();
    }, []);

    return (
        <WarehouseStack
            token={token}
            username={username}
            userid={userid}
            isConnected={isConnected}
        />
    );
}
