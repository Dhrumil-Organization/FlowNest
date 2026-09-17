import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import DailyCollectionReport from '../../components/DailyCollectionReportNEW';

export function DailyCollectionReportScreen() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('User');
  const [rightsMenuApps, setrightsMenuApps] = useState([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [storedToken, storedUser, storedRights] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_details'),
        AsyncStorage.getItem('rightsMenuApps'),
      ]);
      if (!mounted) return;
      setToken(storedToken || '');
      setUsername(storedUser || 'User');
      setrightsMenuApps(storedRights || '');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return <DailyCollectionReport token={token} isConnected={true} username={username} rightsMenuApps={rightsMenuApps && rightsMenuApps[0]?.pages[0]?.children || []} />;
}
