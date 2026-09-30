// FILE: src/components/PriceListNEW/api.ts
// API calls for NEW ERP Price List — byte-for-byte the same requests as the
// legacy src/components/PriceList/index.tsx (YarnRateListData / handleInlineSave).
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type PriceRow = {
  ItmCode: string;
  ItmName: string;
  PLDate: string; // yyyymmdd
  PLRate: any;
  Status?: any;
  [k: string]: any;
};

/** GET ${API}/api/get_price_list — legacy YarnRateListData(month). */
export async function fetchPriceList(API: string, token: string, month: string): Promise<PriceRow[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');

  const payload = {
    prptype: userPtype,
    prpcode: 'MTX',
    yearno: yno,
    strcode: '002',
    txntype: 'mob_price_list',
    month: month,
  };

  const response = await axios.get(`${API}/api/get_price_list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    params: payload,
  });

  return response?.data?.data || [];
}

/** POST ${API}/api/save_price_list — legacy handleInlineSave. `rate` is sent
 *  exactly as typed (string), like legacy. */
export async function savePriceRate(API: string, token: string, itemCode: string, date: string, value: string) {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');

  const payload = {
    prptype: userPtype,
    prpcode: 'MTX',
    yearno: yno,
    itmcode: itemCode,
    date: date,
    rate: value,
    txntype: 'mob_price_list',
  };

  return axios.post(`${API}/api/save_price_list`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
}
