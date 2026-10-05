// FILE: src/components/QuarterSummaryNEW/api.ts
// Every HTTP call of the Quarter Summary screen.
// Legacy source : common/API/quarterSummaryApi.tsx (getQuarterSummary)
//                 used by components/QuarterWiseDispatch/QuarterSummaryScreen.tsx
// Legacy route  : app/(tabs)/QuarterWiseDispatch.tsx
//
// Endpoint (identical path / method / headers / body keys / key order / defaults):
//   POST {API}/api/quarter-summary
//     headers: Authorization: Bearer <token>, Accept: application/json, Content-Type: application/json
//     body   : { fy, quarter, type, unit, prp_code, str_code, party_code }
//     defaults: fy '2026-2027', quarter 'Q1', type 'ALL', unit 'KG', prp_code 'SK', str_code '5', party_code ''
//     returns: response.data (whole body) — the screen reads summary, dispatch_performance, carry_forward,
//              same_quarter_dispatch, previous_quarter_dispatch, monthly_summary, top_parties, parties, quarter.label
//
// Deviation: legacy read the bearer from AsyncStorage `access_token` and the host from the global
// dynamicAPI `API`; here both are the `token` / `API` props (same values, injected by ErpSessionGate).
// No AsyncStorage key is read or written by this module.
import axios from 'axios';

export type QuarterSummaryParams = {
  fy?: string;
  quarter?: string;
  type?: string;
  unit?: string;
  prp_code?: string;
  str_code?: string;
  party_code?: string;
};

export async function getQuarterSummary(
  API: string,
  token: string,
  {
    fy = '2026-2027',
    quarter = 'Q1',
    type = 'ALL',
    unit = 'KG',
    prp_code = 'SK',
    str_code = '5',
    party_code = '',
  }: QuarterSummaryParams = {},
): Promise<any> {
  const response = await axios.post(
    `${API}/api/quarter-summary`,
    {
      fy,
      quarter,
      type,
      unit,
      prp_code,
      str_code,
      party_code,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
}
