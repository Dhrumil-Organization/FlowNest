import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';

const monthList = (count = 6) => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
    out.push({ key, label: d.toLocaleDateString('en-US',{month:'short'}), shortLabel: d.toLocaleDateString('en-US',{month:'short'}), fullLabel: d.toLocaleDateString('en-US',{month:'long',year:'numeric'}) });
  }
  return out;
};

export function useExpenseData({ token, apiBase } = {}) {
  const months = useMemo(() => monthList(6), []);
  const [states, setStates] = useState(() => Object.fromEntries(months.map(m => [m.key,{status:'loading',data:null,error:null}])));

  const loadMonth = useCallback(async (month) => {
    setStates(p => ({...p,[month.key]:{...p[month.key],status:'loading',error:null}}));
    try {
      const res = await axios.get(`${apiBase || API_BASE_URL}/api/expense-dashboard`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'x-platform': 'mob' },
        params: { month: month.key },
      });
      const data = res.data?.response?.data || res.data?.response || res.data?.data || null;
      setStates(p => ({...p,[month.key]:{status:'done',data,error:null}}));
    } catch (error) {
      setStates(p => ({...p,[month.key]:{status:'error',data:null,error}}));
    }
  }, [token, apiBase]);

  const refresh = useCallback(() => { if (token) months.forEach(loadMonth); }, [token,months,loadMonth]);
  const retryMonth = useCallback((key) => { const m=months.find(x=>x.key===key); if(m) loadMonth(m); }, [months,loadMonth]);
  useEffect(() => { refresh(); }, [refresh]);
  const loadedCount = Object.values(states).filter(s => s.status === 'done').length;
  return { months, states, loadedCount, total: months.length, refresh, retryMonth };
}
