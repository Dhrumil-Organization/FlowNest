// FILE: src/components/NewAccountRequestNEW/api.ts
// Every HTTP call of New Account Request — same URL paths, methods, headers, keys and
// response paths as legacy components/NewAccountRequest/index.tsx, but host = `API` prop
// and bearer = `token` prop (legacy imported API from common/API/dynamicAPI).
//
//   POST ${API}/api/accountreqauthbrowse     body { txntype:'newaccountrequest', referrer:'dashboard' }
//        headers Authorization, Content-Type: application/json, X-Requested-with: XMLHttpRequest
//        rows = response.data.response.data  (only when response.data.success and length > 0)
//   GET  ${API}/api/accountreqauthsingle     params = row (minus uid) + { CrLimit, CrDay, IsAuth, referrer:'dashboard',
//        txntype:'newaccountrequest', action:'edit' }   (built by model.authPayload)
//        headers Authorization, Content-Type: application/json, Accept: application/json
//        result = response.data.success / response.data.message
//   POST ${API}/api/new_account_reuest_print body { prpcode, yearno, accname, printTypes:['new_account_request'],
//        printFormat:'one' }                 (endpoint misspelling is the real one)
//        headers Authorization, Content-Type: application/json, X-Requested-with: XMLHttpRequest
//        pdf url = response.data.results.new_account_request
//   GET  ${API}/api/get_criterion            params { prpcodes:[prpcode], prptype, yearno, strcode:'', parcodes:[parcode],
//        txntype:'newaccountrequest', fetch:'dr' }      rows = response.data.response.data
//        NOTE: legacy defines this call (handleListIconClick) but no button of the legacy screen
//        triggers it and its result is never rendered. Ported here for parity, not wired to the UI.
//
// AsyncStorage: none (the legacy component reads nothing from storage).
import axios from 'axios';
import { Row } from './model';

export type Api = { API: string; token: string };

/** legacy fetchData */
export async function browseAccountRequests({ API, token }: Api): Promise<Row[]> {
  const payload = { txntype: 'newaccountrequest', referrer: 'dashboard' };
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-with': 'XMLHttpRequest',
  };
  const response = await axios.post(`${API}/api/accountreqauthbrowse`, payload, { headers });
  if (response.data.success && response.data.response?.data?.length > 0) return response.data.response.data;
  return [];
}

/** legacy getRequestConfig */
const reqConfig = (token: string, params: Row) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  params,
});

/** legacy handleConfirmAction: approve (IsAuth 1) / reject (IsAuth 2). Returns the axios response. */
export async function authAccountRequest({ API, token }: Api, payload: Row) {
  return axios.get(`${API}/api/accountreqauthsingle`, reqConfig(token, { ...payload }));
}

/** legacy handleCallURL: returns the PDF url (may be undefined, exactly like legacy). */
export async function printAccountRequest({ API, token }: Api, item: Row): Promise<string | undefined> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-with': 'XMLHttpRequest',
  };
  const apiResp = await axios.post(
    `${API}/api/new_account_reuest_print`,
    {
      prpcode: item.prpcode,
      yearno: item.yearno,
      accname: item.AccName,
      printTypes: ['new_account_request'],
      printFormat: 'one',
    },
    { headers },
  );
  return apiResp?.data?.results?.new_account_request;
}

/** legacy handleListIconClick (unreachable from the legacy UI — see header note). */
export async function fetchPartyList(
  { API, token }: Api, prpcode: string, prptype: string, yearno: string, parcode: string,
): Promise<Row[]> {
  const historyPayload = {
    prpcodes: [prpcode],
    prptype: prptype,
    yearno: yearno,
    strcode: '',
    parcodes: [parcode],
    txntype: 'newaccountrequest',
    fetch: 'dr',
  };
  const response = await axios.get(`${API}/api/get_criterion`, reqConfig(token, { ...historyPayload }));
  if (response.data.success && response.data.response?.data?.length > 0) return response.data.response.data;
  return [];
}
