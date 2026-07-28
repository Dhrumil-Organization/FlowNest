// screens/dashboard/employ/api/api.js
// Central API service for the Employ Dashboard section.
// Reuses the same API base + auth pattern already used by the rest of the app
// (see @/src/api/client.ts) instead of the old '../../../../common/API/dynamicAPI'
// path, which does not exist inside this project.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API } from '@/src/api/client';

const BASE_URL = `${API}/api`; // ← change here if the Employ Dashboard endpoints live elsewhere

const getToday = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const fetchJSON = async (url) => {
  console.log('APi calling:', url);
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token == null) return;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(response);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
};

export const api = {
  /** Returns logged-in user with role flags */
  getMe: () => fetchJSON(`${BASE_URL}/auth/me`),

  /**
   * Owner dashboard — all sections
   * @param {string} date  YYYY-MM-DD  (default: today)
   */
  getOwnerDashboard: (date = getToday(), getUserPrptype) =>
    fetchJSON(`${BASE_URL}/getOwnerDashboard?date=${date}&prptype=${getUserPrptype}`),

  /**
   * Sales exec detail dashboard
   * @param {number} execId
   * @param {string} date   YYYY-MM-DD
   */
  getExecDashboard: (execId, date = getToday(), getUserPrptype) =>
    fetchJSON(`${BASE_URL}/getSalesExeDashboard?exec_id=${execId || 0}&date=${date}&prptype=${getUserPrptype}`),

  /**
   * Party detail dashboard
   * @param {number} partyId
   * @param {number} execId   (for breadcrumb context)
   * @param {string} date
   */
  getPartyDashboard: (partyId, execId, date = getToday(), getUserPrptype) =>
    fetchJSON(
      `${BASE_URL}/getPartyDashboard?party_id=${partyId}&exec_id=${execId}&date=${date}&prptype=${getUserPrptype}`,
    ),
};

/** Format number to Indian lakh/crore display */
export const formatAmount = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

export const formatAmountShort = (amount) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};
