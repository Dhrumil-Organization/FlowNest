// FILE: src/components/ProcessCompleteAuthNEW/api.ts
// HTTP calls of the Process Complete Auth screen — same URLs, methods, headers
// and bodies as legacy src/components/ProcessCompleteAuth/index.tsx and the
// common/API/Functions.tsx helpers (fetchAllPropertyData / fetchAllYeardata),
// but using the `API` host + `token` passed in by ErpSessionGate.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;

/** headers used by legacy get/insert_process_complete_data */
const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});

/** headers used by legacy fetchAll* helpers */
const masterHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/javascript',
  Accept: 'application/json',
});

/** legacy "safe data extraction" of the fetchAll* helpers */
const pickList = (data: any): Row[] => {
  if (data?.response?.data && Array.isArray(data.response.data)) return data.response.data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

/** legacy fetchAllPropertyData(token): reads AsyncStorage 'user_prptype',
 *  GET get_criterion?prptype=<userPtype>&txntype=''&fetch=prp — returns [] on error. */
export async function fetchAllPropertyData(API: string, token: string): Promise<Row[]> {
  try {
    const userPtype = await AsyncStorage.getItem('user_prptype');
    const response = await axios.get(`${API}/api/get_criterion?prptype=${userPtype}&txntype=''&fetch=prp`, {
      headers: masterHeaders(token),
      params: null,
    });
    return pickList(response.data);
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchpropertyGroupData error', error);
    return [];
  }
}

/** legacy fetchAllYeardata(token, prpcd): GET getyear { prpcode } — returns [] on error. */
export async function fetchAllYeardata(API: string, token: string, prpcd = ''): Promise<Row[]> {
  try {
    const response = await axios.get(`${API}/api/getyear`, {
      headers: masterHeaders(token),
      params: { prpcode: prpcd },
    });
    return pickList(response.data);
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchAllYeardata error', error);
    return [];
  }
}

/** legacy handleConfirmAction: POST get_process_complete_data. Returns response.data as-is. */
export async function getProcessCompleteData(API: string, token: string, ptye: any): Promise<any> {
  const payload = {
    chkldcldata: 1,
    chkrpt: 0,
    prptype: ptye,
    txntype: 'mobile_api',
  };
  console.log('get_process_complete_data API payload', payload);
  const response = await axios.post(`${API}/api/get_process_complete_data`, payload, { headers: jsonHeaders(token) });
  return response.data;
}

/** legacy handleSave: POST insert_process_complete_data with the single selected row. */
export async function insertProcessCompleteData(API: string, token: string, prptype: any, item: Row): Promise<any> {
  const payloadData = {
    prptype,
    yearno: item.YearNo,
    prpcode: item.PrpCode,
    txntype: 'mobile_api',
    chkldcldata: 1,
    chkrpt: 0,
    rows: [item],
  };
  console.log('insert_process_complete_data API payload', payloadData);
  const response = await axios.post(`${API}/api/insert_process_complete_data`, payloadData, { headers: jsonHeaders(token) });
  return response.data;
}
