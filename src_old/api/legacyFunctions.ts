import axios from 'axios';
import { API_BASE_URL } from './client';

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'x-platform': 'mob' });

export async function fetchPropertyData(token: string) {
  const res = await axios.get(`${API_BASE_URL}/api/property`, { headers: headers(token) });
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
export const fetchAllPropertyData = fetchPropertyData;
export async function fetchAllYeardata(token: string, prpcode: string) {
  const res = await axios.get(`${API_BASE_URL}/api/year`, { headers: headers(token), params: { prpcode } });
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
export async function fetchAllStoredata(token: string, prpcode?: string) {
  const res = await axios.get(`${API_BASE_URL}/api/store`, { headers: headers(token), params: { prpcode } });
  return res.data?.response?.data || res.data?.data || res.data?.response || [];
}
