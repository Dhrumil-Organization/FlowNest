import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OrdersScreen from './index';

// ── Set your real values here ─────────────────────────────────────
const TOKEN    = 'your-bearer-token-here';
const API_BASE = 'https://erp.sharpskillit.com/api';
// ─────────────────────────────────────────────────────────────────

export default function OrdersScreenTestEntry() {
  return (
    <SafeAreaProvider>
      <OrdersScreen token={TOKEN} apiBase={API_BASE} />
    </SafeAreaProvider>
  );
}