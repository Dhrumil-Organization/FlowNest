import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import CreditLimitRequestNEW from '../../components/CreditLimitRequestNEW';

/** Credit Limit Request screen wrapper. Keeps auth/session loading consistent
 * with the migrated Production screens. */
export function CreditLimitRequestScreen() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('User');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_details'),
      ]);
      if (!mounted) return;
      setToken(storedToken || '');
      setUsername(storedUser || 'User');
    })();
    return () => { mounted = false; };
  }, []);

  return <CreditLimitRequestNEW token={token} username={username} />;
}

export default CreditLimitRequestScreen;
