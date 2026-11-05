// FILE: src/components/PoyRateEntryNEW/api.ts
// POY Rate Entry API calls — identical to legacy src/components/PoyRateEntry/index.tsx:
//   GET  ${API}/api/get_price_list_poy_items   (params: prptype, prpcode 'MTX', yearno, strcode '001',
//                                               txntype 'mob_poy_rate_entry', appfrom = formatDate(date))
//   POST ${API}/api/save_price_list_poy_items  (body: prptype, prpcode, yearno, strcode '001',
//                                               txntype 'mob_poy_rate_entry', rate, srno, itmcode, itmname, appfrom)
// AsyncStorage keys read (as legacy): 'user_prptype', 'yno'.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { formatDate, PoyItem } from './model';

export type Session = { prptype: string | null; yno: string | null };

/** Legacy reads both keys fresh before every load / save. */
export const readSession = async (): Promise<Session> => {
  const prptype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  return { prptype, yno };
};

export async function fetchPoyItems(API: string, token: string, session: Session, date: Date): Promise<PoyItem[]> {
  const payload = {
    prptype: session.prptype,
    prpcode: 'MTX',
    yearno: session.yno,
    strcode: '001',
    txntype: 'mob_poy_rate_entry',
    appfrom: formatDate(date),
  };
  const res = await axios.get(`${API}/api/get_price_list_poy_items`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    params: payload,
  });
  return res?.data?.data || [];
}

/** Returns the raw response data; caller applies the legacy error rules. */
export async function savePoyItem(API: string, token: string, session: Session, item: PoyItem, amount: string) {
  const payload = {
    prptype: session.prptype,
    prpcode: item?.PrpCode || '',
    yearno: session.yno,
    strcode: '001',
    txntype: 'mob_poy_rate_entry',
    rate: amount, // string, as legacy
    srno: item?.RSrNo,
    itmcode: item?.ItmCode,
    itmname: item?.ItmName,
    appfrom: item?.AppFrom,
  };
  const res = await axios.post(`${API}/api/save_price_list_poy_items`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
  return res?.data;
}

/** Legacy success check on the save response. */
export const isSaveError = (data: any) =>
  data?.success === false || data?.status === false || data?.error === true;
