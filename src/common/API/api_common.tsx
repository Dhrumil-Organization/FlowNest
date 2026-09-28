import AsyncStorage from '@/common/utils/compatibleStorage';
import { useEffect, useState } from 'react';
import { resolveNewErpApiBaseUrl } from '../../api/client';
// import CreditLimitRequestNEW from '../../components/CreditLimitRequestNEW';

/** Credit Limit Request screen wrapper. Keeps auth/session loading consistent
 * with the migrated Production screens. */
export default function Common_API() {
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('User');
    const [API, setAPI] = useState('User');
    // let API: string = '';
    useEffect(() => {
        if (!API) return;
        let mounted = true;
        void (async () => {
            const [storedToken, storedProperty] = await Promise.all([
                AsyncStorage.getItem('access_token'),
                AsyncStorage.getItem('user_details'),
                AsyncStorage.getItem('selected_property'),
            ]);
            if (!mounted) return;
            setToken(storedToken || '');
            // setUsername(storedUser || 'User');
            const API_URL = resolveNewErpApiBaseUrl(storedProperty);
            setAPI(API_URL);
        })();
        return () => { mounted = false, API };
    }, [API]);

    return API;
}

// export default Common_API;
