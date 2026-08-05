import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'x-platform': 'mob' });
const requestConfig = (token: string, params?: Record<string, any>) => ({ headers: headers(token), params, timeout: 30000 });

export async function fetchPropertyData(token: string) {
  const res = await axios.get(`${API}/api/property`, requestConfig(token));
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
export const fetchAllPropertyData = fetchPropertyData;
export async function fetchAllYeardata(token: string, prpcode: string) {
  const res = await axios.get(`${API}/api/year`, requestConfig(token, { prpcode }));
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
export async function fetchAllStoredata(token: string, prpcode?: string) {
  const res = await axios.get(`${API}/api/store`, requestConfig(token, { prpcode }));
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
