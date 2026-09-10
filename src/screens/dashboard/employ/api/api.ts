// // screens/dashboard/employ/api/api.js
// // Central API service for the Employ Dashboard section.
// // Reuses the same API base + auth pattern already used by the rest of the app
// // (see @/src/api/client.ts) instead of the old '../../../../common/API/dynamicAPI'
// // path, which does not exist inside this project.
// // import { initNewErpAPI } from "@/src/api/client";
// import AsyncStorage from "@/common/utils/compatibleStorage";

// const NEW_ERP_API_URLS = {
//   sudamo_knits: 'https://apig.tms-webapp.com',
//   rayons: 'https://apiy.tms-webapp.com',
// } as const;

// export type NewErpProperty = keyof typeof NEW_ERP_API_URLS;

// export let API_BASE_URL: string = NEW_ERP_API_URLS.sudamo_knits;
// export let API: string = API_BASE_URL;

// export async function initNewErpAPI(): Promise<string> {
//   const property = await AsyncStorage.getItem('selected_property');
//   API_BASE_URL = resolveNewErpApiBaseUrl(property);
//   API = API_BASE_URL;

//   console.log('NEW ERP API initialized:', { property, api: API_BASE_URL });
//   return API_BASE_URL;
// }

// const apiBase = initNewErpAPI();
// console.log("NEW ERP API initialized1122:", JSON.stringify(apiBase), apiBase);
// const BASE_URL = `${apiBase}/api`; // ← change here if the Employ Dashboard endpoints live elsewhere

// const getToday = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

// const buildQuery = (params = {}) =>
//   Object.entries(params)
//     .filter(
//       ([, value]) =>
//         value !== undefined && value !== null && String(value) !== ""
//     )
//     .map(
//       ([key, value]) =>
//         `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
//     )
//     .join("&");

// const fetchJSON = async (url) => {
//   console.log("APi calling:", url);
//   try {
//     const token = await AsyncStorage.getItem("access_token");
//     if (token == null) return;
//     const response = await fetch(url, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     console.log("APi respnse:", response);
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return await response.json();
//   } catch (err) {
//     console.error("API Error:", err);
//     throw err;
//   }
// };

// export const api = {
//   /** Returns logged-in user with role flags */
//   getMe: () => fetchJSON(`${BASE_URL}/auth/me`),

//   /**
//    * Owner dashboard — all sections
//    * @param {string} date  YYYY-MM-DD  (default: today)
//    */
//   getOwnerDashboard: (date = getToday(), getUserPrptype) =>
//     fetchJSON(
//       `${BASE_URL}/getOwnerDashboard?date=${date}&prptype=${getUserPrptype}`
//     ),

//   /**
//    * Card-specific Owner Dashboard report/drill-down.
//    * Uses the same Laravel route as getOwnerDashboard so no new API route is
//    * required. report_type: sales | collection | outstanding.
//    */
//   getOwnerCardReport: (params = {}) =>
//     fetchJSON(`${BASE_URL}/getOwnerDashboard?${buildQuery(params)}`),

//   /**
//    * Sales exec detail dashboard
//    * @param {number} execId
//    * @param {string} date   YYYY-MM-DD
//    */
//   getExecDashboard: (execId, date = getToday(), getUserPrptype, options = {}) =>
//     fetchJSON(
//       `${BASE_URL}/getSalesExeDashboard?${buildQuery({
//         exec_id:
//           execId === undefined ||
//           execId === null ||
//           String(execId).trim() === ""
//             ? 0
//             : execId,
//         date,
//         prptype: getUserPrptype,
//         view: options?.view,
//         my_exec_id: options?.myExecId,
//         exec_scope: options?.execScope,
//       })}`
//     ),

//   /**
//    * Party detail dashboard
//    * @param {number} partyId
//    * @param {number} execId   (for breadcrumb context)
//    * @param {string} date
//    */
//   getPartyDashboard: (
//     partyId,
//     execId,
//     date = getToday(),
//     getUserPrptype,
//     execScope = ""
//   ) =>
//     fetchJSON(
//       `${BASE_URL}/getPartyDashboard?${buildQuery({
//         party_id: partyId,
//         exec_id: execId,
//         exec_scope: execScope,
//         date,
//         prptype: getUserPrptype,
//       })}`
//     ),
// };

// /** Display amount using the dashboard-wide Compact / Actual preference. */
// export const formatAmount = (amount, mode = "compact") => {
//   const n = Number(amount || 0);
//   const safe = Number.isFinite(n) ? n : 0;
//   const abs = Math.abs(safe);
//   const sign = safe < 0 ? "-" : "";

//   if (mode === "actual") {
//     return `${sign}₹${abs.toLocaleString("en-IN", {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     })}`;
//   }

//   if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
//   if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
//   if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;
//   return `${sign}₹${abs.toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`;
// };

// export const formatAmountActual = (amount) => formatAmount(amount, "actual");
// export const formatAmountShort = (amount) => formatAmount(amount, "compact");

// screens/dashboard/employ/api/api.js
// Central API service for the Employ Dashboard section.
import AsyncStorage from "@/common/utils/compatibleStorage";

const NEW_ERP_API_URLS = {
  sudamo_knits: 'https://apig.tms-webapp.com',
  rayons: 'https://apiy.tms-webapp.com',
} as const;
// const NEW_ERP_API_URLS = {
//   sudamo_knits: 'http://192.168.13.100:4017',
//   rayons: 'http://192.168.13.100:4017',
// } as const;

export type NewErpProperty = keyof typeof NEW_ERP_API_URLS;

export let API_BASE_URL: string = NEW_ERP_API_URLS.sudamo_knits;
export let API: string = API_BASE_URL;

export function resolveNewErpApiBaseUrl(property: string | null | undefined): string {
  return property === 'rayons'
    ? NEW_ERP_API_URLS.rayons
    : NEW_ERP_API_URLS.sudamo_knits;
}

// Initialize API_BASE_URL and BASE_URL asynchronously
export async function initNewErpAPI(): Promise<string> {
  const property = await AsyncStorage.getItem('selected_property');
  API_BASE_URL = resolveNewErpApiBaseUrl(property);
  API = API_BASE_URL;

  console.log('NEW ERP API initialized:', { property, api: API_BASE_URL });
  return API_BASE_URL;
}

// Dynamically resolve BASE_URL at runtime
export async function getBaseUrl(): Promise<string> {
  const property = await AsyncStorage.getItem('selected_property');
  const baseUrl = resolveNewErpApiBaseUrl(property);
  console.log('NEW ERP API initialized2111:', { baseUrl }); 
  return `${baseUrl}/api`;
}

const getToday = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const buildQuery = (params = {}) =>
  Object.entries(params)
    .filter(
      ([, value]) =>
        value !== undefined && value !== null && String(value) !== ""
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

const fetchJSON = async (endpoint: string, params = {}) => {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${endpoint}?${buildQuery(params)}`;
  console.log("API calling:", url);
  try {
    const token = await AsyncStorage.getItem("access_token");
    if (token == null) return;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("API response:", response);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
};

export const api = {
  /** Returns logged-in user with role flags */
  getMe: () => fetchJSON(`/auth/me`),

  /**
   * Owner dashboard — all sections
   * @param {string} date  YYYY-MM-DD  (default: today)
   */
  getOwnerDashboard: (date = getToday(), getUserPrptype) =>
    fetchJSON(`/getOwnerDashboard`, { date, prptype: getUserPrptype }),

  /**
   * Card-specific Owner Dashboard report/drill-down.
   * Uses the same Laravel route as getOwnerDashboard so no new API route is
   * required. report_type: sales | collection | outstanding.
   */
  getOwnerCardReport: (params = {}) =>
    fetchJSON(`/getOwnerDashboard`, params),

  /**
   * Sales exec detail dashboard
   * @param {number} execId
   * @param {string} date   YYYY-MM-DD
   */
  getExecDashboard: (execId, date = getToday(), getUserPrptype, options = {}) =>
    fetchJSON(`/getSalesExeDashboard`, {
      exec_id:
        execId === undefined ||
        execId === null ||
        String(execId).trim() === ""
          ? 0
          : execId,
      date,
      prptype: getUserPrptype,
      view: options?.view,
      my_exec_id: options?.myExecId,
      exec_scope: options?.execScope,
    }),

  /**
   * Party detail dashboard
   * @param {number} partyId
   * @param {number} execId   (for breadcrumb context)
   * @param {string} date
   */
  getPartyDashboard: (
    partyId,
    execId,
    date = getToday(),
    getUserPrptype,
    execScope = ""
  ) =>
    fetchJSON(`/getPartyDashboard`, {
      party_id: partyId,
      exec_id: execId,
      exec_scope: execScope,
      date,
      prptype: getUserPrptype,
    }),
};

/** Display amount using the dashboard-wide Compact / Actual preference. */
export const formatAmount = (amount, mode = "compact") => {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";

  if (mode === "actual") {
    return `${sign}₹${abs.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatAmountActual = (amount) => formatAmount(amount, "actual");
export const formatAmountShort = (amount) => formatAmount(amount, "compact");