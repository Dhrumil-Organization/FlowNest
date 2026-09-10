import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';

import { API } from '@/common/API/dynamicAPI';
import AppNavigator from '@/components/SalesOrderDashboard/AppNavigator';

export default function SalesOrderDashboardScreen() {
    const [token, setToken] = useState('');
    const [apiBase, setApiBase] = useState('');

    useEffect(() => {
        const load = async () => {
            const t = await AsyncStorage.getItem('access_token');
            // Agar aapke project me base url alag se AsyncStorage/env me store hoti hai
            // to yaha se utha lo, warna common/API/dynamicAPI wala API object hi
            // andar ke screens (StockScreen etc) use kar rahe hai — apiBase sirf
            // useExpenseData hook (ExpenseScreen) ke liye chahiye.
            const base = await AsyncStorage.getItem('api_base_url');

            setToken(t || '');
            setApiBase(base || '');
        };
        load();
    }, []);

    return <AppNavigator token={token} apiBase={API} />;
}
