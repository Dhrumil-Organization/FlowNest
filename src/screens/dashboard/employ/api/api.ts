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
  const query = buildQuery(params);
  const url = `${baseUrl}${endpoint}${query ? `?${query}` : ''}`;
  console.log("API calling:", url);

  const token = await AsyncStorage.getItem("access_token");
  if (token == null || String(token).trim() === "") {
    throw new Error("Authentication token is unavailable. Please sign in again.");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const raw = await response.text();
    let payload: any = null;
    if (raw.trim() !== "") {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }

    console.log("API response:", { status: response.status, ok: response.ok, payload });

    if (!response.ok) {
      const backendMessage = payload?.message || payload?.error || payload?.code;
      throw new Error(
        backendMessage
          ? `${backendMessage} (HTTP ${response.status}${payload?.code ? ` · ${payload.code}` : ''})`
          : `HTTP ${response.status}`
      );
    }

    if (payload == null) {
      throw new Error(`Empty or invalid JSON response from ${endpoint}.`);
    }

    return payload;
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

  /** Payments Made: recorded vouchers, separate from uncleared Payment To Pay. */
  getOwnerPaymentsMade: (params: any = {}) =>
    fetchJSON(`/getOwnerDashboard`, { report_type: 'payments_made', view: 'owner', ...params }),

  /**
   * Financial-year Sales for one ERP financial-year database.
   * The caller supplies an anchor date inside the same FY as from_date/to_date;
   * Laravel resolves the database using its normal date-driven YearNo flow.
   */
  getOwnerFySales: (params = {}) =>
    fetchJSON(`/getOwnerDashboard`, {
      report_type: 'fy_sales',
      ...params,
    }),

  /** Financial-year checked Production, using the same dashboard endpoint. */
  getOwnerFyOutstanding: (params = {}) =>
    fetchJSON(`/getOwnerDashboard`, { report_type: 'fy_outstanding', ...params }),

  /** FY Outstanding drilldowns: explicitly forward required query parameters. */
  getOwnerFyOutstandingDetail: (params: {
    date: string;
    prptype: string;
    view?: string;
    outstanding_detail: 'customers' | 'invoices';
    outstanding_exec: string;
    outstanding_party?: string;
  }) => fetchJSON(`/getOwnerDashboard`, {
    report_type: 'fy_outstanding',
    date: params.date,
    prptype: params.prptype,
    view: params.view || 'owner',
    outstanding_detail: params.outstanding_detail,
    outstanding_exec: params.outstanding_exec,
    ...(params.outstanding_party ? { outstanding_party: params.outstanding_party } : {}),
  }),

  getOwnerFyProduction: (params = {}) =>
    fetchJSON(`/getOwnerDashboard`, {
      report_type: 'fy_production',
      ...params,
    }),

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

  getCreditorDashboardSummary: (prptype, partycode, date = getToday(), options: any = {}) =>
    fetchJSON(`/creditor-dashboard/summary`, {
      prptype, partycode, date,
      date_basis: options?.dateBasis,
      number_basis: options?.numberBasis,
    }),

  getCreditorPosition: (prptype, partycode, date = getToday()) =>
    fetchJSON(`/creditor-dashboard/position/analytics`, { prptype, partycode, date }),

  getCreditorPayments: (prptype, partycode, date = getToday(), limit = 200, fromdate: any = null) =>
    fetchJSON(`/creditor-dashboard/payments/transactions`, { prptype, partycode, date, fromdate, limit }),

  getCreditorPaymentSettlements: (prptype, partycode, date = getToday(), limit = 500, fromdate: any = null) =>
    fetchJSON(`/creditor-dashboard/payments/settlements`, { prptype, partycode, date, fromdate, limit }),

  getCreditorOutstandingBills: (prptype, partycode, date = getToday(), limit = 500) =>
    fetchJSON(`/creditor-dashboard/outstanding/bills`, { prptype, partycode, date, limit }),

  getCreditorPurchaseTransactions: (
    prptype, partycode, date = getToday(), dateBasis = 'inward_date',
    numberBasis = 'inward_no', limit = 500
  ) => fetchJSON(`/creditor-dashboard/purchase/transactions`, {
    prptype, partycode, date, date_basis: dateBasis, number_basis: numberBasis, limit,
  }),

  getCreditorPurchaseAnalytics: (
    prptype, partycode, date = getToday(), dateBasis = 'inward_date',
    fromdate: any = null, todate: any = null
  ) => fetchJSON(`/creditor-dashboard/purchase/analytics`, {
    prptype, partycode, date, date_basis: dateBasis, fromdate, todate,
  }),

  getCreditorPurchaseRateComparison: (
    prptype, partycode, itemcode, date = getToday(), dateBasis = 'inward_date'
  ) => fetchJSON(`/creditor-dashboard/purchase/rate-comparison`, {
    prptype, partycode, itemcode, date, date_basis: dateBasis,
  }),

  getCreditorPurchaseOrderAnalytics: (
    prptype, partycode, date = getToday(), fromdate: any = null, todate: any = null
  ) => fetchJSON(`/creditor-dashboard/purchase-orders/analytics`, {
    prptype, partycode, date, fromdate, todate,
  }),

  getCreditorPendingPurchaseOrders: (
    prptype, partycode, date = getToday(), limit = 500
  ) => fetchJSON(`/creditor-dashboard/purchase-orders/pending`, {
    prptype, partycode, date, limit,
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