import React from 'react';
import OrdersScreen from './OrdersScreen';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { API_BASE_URL } from '../../api/client';
export default function OrdersEntry(){
  const token=useAppSessionStore(s=>s.token)||'';
  const user=useAppSessionStore(s=>s.user);
  return <OrdersScreen token={token} apiBase={API_BASE_URL} userid={user?.id || 0}/>;
}
