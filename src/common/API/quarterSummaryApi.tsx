import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import AsyncStorage from '@/common/utils/compatibleStorage';

// Resolved per call from the LIVE shared host (apig/apiy).
const getApiBaseUrl = () => `${API}/api`;

export async function getQuarterSummary({
  fy = '2026-2027',
  quarter = 'Q1',
  type = 'ALL',
  unit = 'KG',
  prp_code = 'SK',
  str_code = '5',
  party_code = '',
}) {
  const token = await AsyncStorage.getItem('access_token');

  const response = await axios.post(
    `${getApiBaseUrl()}/quarter-summary`,
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