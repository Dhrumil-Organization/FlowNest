import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './client';

export type YarnMaster = any;
export type Design = any;
export type SubDesign = any;
export type GetItem = any;
export type CostInputs = any;
export type ComputeResult = any;

const client = axios.create({ baseURL: `${API_BASE_URL}/api` });
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  config.headers = config.headers || {};
  config.headers.Accept = 'application/json';
  config.headers['Content-Type'] = 'application/json';
  config.headers['x-platform'] = 'mob';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Keep all endpoint names in one place. If your existing Laravel route differs,
// change only this map; migrated screens remain untouched.
export const LEGACY_ROUTES = {
  designList: '/designs',
  designDetail: (id: string | number) => `/designs/${id}`,
  designCreate: '/designs',
  designUpdate: (id: string | number) => `/designs/${id}`,
  designColourway: (id: string | number) => `/designs/${id}/colourways`,
  designYarns: '/yarns',
  designDyeing: '/design-yarn-dyeing',
  itemList: '/getitem',
  designOptions: '/design-options',
  costingCompute: '/costing/compute',
  costingSave: '/costing/save',
  costingHistory: '/costing/history',
  costingVariance: (id: string | number) => `/costing/variance/${id}`,
  realCostingDashboard: '/real-costing-chain/dashboard',
} as const;

export const DesignAPI = {
  list: (params?: any) => client.get(LEGACY_ROUTES.designList, { params }),
  get: (id: string | number) => client.get(LEGACY_ROUTES.designDetail(id)),
  create: (body: any) => client.post(LEGACY_ROUTES.designCreate, body),
  update: (id: string | number, body: any) => client.put(LEGACY_ROUTES.designUpdate(id), body),
  addColourway: (id: string | number, body: any) => client.post(LEGACY_ROUTES.designColourway(id), body),
  yarns: (params?: any) => client.get(LEGACY_ROUTES.designYarns, { params }),
  yarnDyeing: (body: any) => client.post(LEGACY_ROUTES.designDyeing, body),
};

export const ItemAPI = {
  getItem: (params?: any) => client.get(LEGACY_ROUTES.itemList, { params }),
};

export const CostingAPI = {
  compute: (body: any) => client.post(LEGACY_ROUTES.costingCompute, body),
  save: (body: any) => client.post(LEGACY_ROUTES.costingSave, body),
  history: () => client.get(LEGACY_ROUTES.costingHistory),
  variance: (id: string | number) => client.get(LEGACY_ROUTES.costingVariance(id)),
};

export const RealCostingChainAPI = {
  dashboard: (params?: any) => client.get(LEGACY_ROUTES.realCostingDashboard, { params }),
};

export default client;
