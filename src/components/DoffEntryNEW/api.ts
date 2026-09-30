// FILE: src/components/DoffEntryNEW/api.ts
// Every HTTP call of the legacy Doff Entry screen, using the API/token props.
// fetchProperties / fetchYears / fetchStores are exact copies of
// fetchAllPropertyData / fetchAllYeardata / fetchAllStoredata from
// src/common/API/Functions.tsx (same URL, params, headers, AsyncStorage key
// 'user_prptype', same "safe extraction" and [] on error) — re-implemented here
// only so they use the API prop instead of the global dynamicAPI host.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { Row } from './model';

export type Api = { API: string; token: string };

const extract = (data: any): Row[] => {
  if (data?.response?.data && Array.isArray(data.response.data)) return data.response.data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/** GET /api/get_criterion?prptype=<user_prptype>&txntype=''&fetch=prp  (legacy fetchAllPropertyData — the literal '' is legacy). */
export async function fetchProperties({ API, token }: Api): Promise<Row[]> {
  try {
    const userPtype = await AsyncStorage.getItem('user_prptype');
    const response = await axios.get(`${API}/api/get_criterion?prptype=${userPtype}&txntype=''&fetch=prp`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/javascript', Accept: 'application/json' },
      params: null,
    });
    return extract(response.data);
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchpropertyGroupData error', error);
    return [];
  }
}

/** GET /api/getyear { prpcode }  (legacy fetchAllYeardata). */
export async function fetchYears({ API, token }: Api, prpcd = ''): Promise<Row[]> {
  try {
    const response = await axios.get(`${API}/api/getyear`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/javascript', Accept: 'application/json' },
      params: { prpcode: prpcd },
    });
    return extract(response.data);
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchAllYeardata error', error);
    return [];
  }
}

/** GET /api/getstore { prpcode, yearno, txntype, prptype:<user_prptype> } + x-platform: mob  (legacy fetchAllStoredata). */
export async function fetchStores({ API, token }: Api, prp = '', yrno = '', txn = ''): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  try {
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params: { prpcode: prp, yearno: yrno, txntype: txn, prptype: userPtype },
    });
    return extract(response.data);
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchAllStoredata error', error);
    return [];
  }
}

/** GET /api/get_criterion with fetch = 'mer' | 'itm' | 'machine'. Returns the raw body (caller checks success + response.data). */
export async function getCriterion({ API, token }: Api, params: Row): Promise<any> {
  const respo = await axios.get(`${API}/api/get_criterion`, { headers: jsonHeaders(token), params });
  return respo.data;
}

/** GET /api/proddoffshow — body.data.main (doff rows) and body.data.mainnew (template row for a new doff). */
export async function prodDoffShow({ API, token }: Api, params: Row): Promise<any> {
  const respo = await axios.get(`${API}/api/proddoffshow`, { headers: jsonHeaders(token), params });
  return respo.data;
}

/** POST /api/proddoffadd | proddoffedit | proddoffdelete — headers exactly as legacy (no Accept). */
export async function postDoff({ API, token }: Api, path: 'proddoffadd' | 'proddoffedit' | 'proddoffdelete', body: Row): Promise<any> {
  const response = await axios.post(`${API}/api/${path}`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return response.data;
}

export const apiErrorText = (error: any) => 'API failed: ' + (error?.response?.data?.message || error?.message);
