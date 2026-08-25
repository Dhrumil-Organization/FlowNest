// screens/dashboard/employ/api/api.js
// Central API service for the Employ Dashboard section.
// Reuses the same API base + auth pattern already used by the rest of the app
// (see @/src/api/client.ts) instead of the old '../../../../common/API/dynamicAPI'
// path, which does not exist inside this project.
import { API_BASE_URL as API } from '@/src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = `${API}/api`; // ← change here if the Employ Dashboard endpoints live elsewhere

const getToday = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const buildQuery = (params = {}) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

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
    console.log('APi respnse:', response);
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
   * Card-specific Owner Dashboard report/drill-down.
   * Uses the same Laravel route as getOwnerDashboard so no new API route is
   * required. report_type: sales | collection | outstanding.
   */
  getOwnerCardReport: (params = {}) =>
    fetchJSON(`${BASE_URL}/getOwnerDashboard?${buildQuery(params)}`),

  /**
   * Sales exec detail dashboard
   * @param {number} execId
   * @param {string} date   YYYY-MM-DD
   */
  getExecDashboard: (execId, date = getToday(), getUserPrptype, options = {}) =>
    fetchJSON(
      `${BASE_URL}/getSalesExeDashboard?${buildQuery({
        exec_id: execId === undefined || execId === null || String(execId).trim() === '' ? 0 : execId,
        date,
        prptype: getUserPrptype,
        view: options?.view,
        my_exec_id: options?.myExecId,
        exec_scope: options?.execScope,
      })}`,
    ),

  /**
   * Party detail dashboard
   * @param {number} partyId
   * @param {number} execId   (for breadcrumb context)
   * @param {string} date
   */
  getPartyDashboard: (partyId, execId, date = getToday(), getUserPrptype, execScope = '') =>
    fetchJSON(
      `${BASE_URL}/getPartyDashboard?${buildQuery({
        party_id: partyId,
        exec_id: execId,
        exec_scope: execScope,
        date,
        prptype: getUserPrptype,
      })}`,
    ),
};

/** Display amount using the dashboard-wide Compact / Actual preference. */
export const formatAmount = (amount, mode = 'compact') => {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '-' : '';

  if (mode === 'actual') {
    return `${sign}₹${abs.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;
  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatAmountActual = amount => formatAmount(amount, 'actual');
export const formatAmountShort = amount => formatAmount(amount, 'compact');
