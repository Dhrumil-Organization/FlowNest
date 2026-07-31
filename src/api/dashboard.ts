import { ApiClient } from './client';

export type DashboardView = 'owner' | 'my';
export type DashboardMetricKey = 'SALES_ORDER' | 'BILLING' | 'COLLECTION';

export type DashboardCard = {
  key: DashboardMetricKey;
  label: string;
  target: number;
  actual: number;
  remaining: number;
  excess: number;
  achievement_pct: number;
  target_configured: boolean;
  target_source: string;
  status: 'NOT_CONFIGURED' | 'IN_PROGRESS' | 'ACHIEVED' | string;
};

export type DashboardScope = {
  configured: boolean;
  scope_type: string;
  executive_codes: string[];
  message: string;
};

export type DashboardPeriod = {
  yearno: number;
  monthno: string;
  month_name: string;
  label: string;
  from_date: string;
  to_date: string;
  from_ymd: number;
  to_ymd: number;
};

export type TargetCardResponse = {
  success: boolean;
  response: {
    configured: boolean;
    view: DashboardView;
    scope: DashboardScope;
    period: DashboardPeriod;
    filters?: {
      prptype?: string;
      prpcodes?: string[];
      yearno?: number;
      monthno?: string;
      strcodes?: string[];
    };
    cards: DashboardCard[];
    totals?: Record<string, number>;
    message: string;
  };
  message: string;
};

export type AnalyticsExecutiveRow = {
  executive_code: string;
  executive_name: string;
  target: number;
  actual: number;
  remaining: number;
  achievement_pct: number;
  metric: DashboardMetricKey;
};

export type AnalyticsPartyRow = {
  party_code: string;
  party_name: string;
  target: number;
  actual: number;
  remaining: number;
  achievement_pct: number;
  metric: DashboardMetricKey;
};


export type AnalyticsDesignRow = {
  executive_code: string;
  executive_name: string;
  party_code: string;
  party_name: string;
  design_code: string;
  design_name: string;
  document_count: number;
  qty: number;
  amount: number;
  metric: DashboardMetricKey;
};

export type AnalyticsDocumentRow = {
  executive_code: string;
  executive_name: string;
  party_code: string;
  party_name: string;
  document_uid: string;
  document_no: string;
  document_date: string | number;
  prp_code: string;
  qty: number;
  amount: number;
  metric: DashboardMetricKey;
};

export type AnalyticsLineRow = {
  executive_code: string;
  executive_name: string;
  party_code: string;
  party_name: string;
  design_code: string;
  design_name: string;
  document_uid: string;
  document_no: string;
  document_date: string | number;
  prp_code: string;
  line_no: string | number;
  qty: number;
  amount: number;
  metric: DashboardMetricKey;
};

type AnalyticsListResponse<T, L extends string> = {
  success: boolean;
  response: {
    configured: boolean;
    metric: DashboardMetricKey;
    level: L;
    view: DashboardView;
    scope: DashboardScope;
    period: DashboardPeriod;
    filters?: Record<string, unknown>;
    data: T[];
    message: string;
  };
  message: string;
};

export type AnalyticsDesignsResponse = AnalyticsListResponse<AnalyticsDesignRow, 'designs'>;
export type AnalyticsDocumentsResponse = AnalyticsListResponse<AnalyticsDocumentRow, 'documents'>;
export type AnalyticsLinesResponse = AnalyticsListResponse<AnalyticsLineRow, 'lines'>;

export type ReconciliationSide = {
  difference: number;
  status: string;
  meaning: string;
};

export type CollectionReconciliation = {
  card_target: number;
  executive_target_total: number;
  target_difference: number;
  card_actual: number;
  executive_actual_total: number;
  actual_difference: number;
  tolerance: number;
  is_reconciled: boolean;
  status: string;
  difference_details?: {
    target?: ReconciliationSide;
    actual?: ReconciliationSide;
    possible_causes?: string[];
  };
};

export type AnalyticsExecutivesResponse = {
  success: boolean;
  response: {
    configured: boolean;
    metric: DashboardMetricKey;
    level: 'executives';
    view: DashboardView;
    scope: DashboardScope;
    period: DashboardPeriod;
    filters?: Record<string, unknown>;
    data: AnalyticsExecutiveRow[];
    reconciliation?: CollectionReconciliation;
    message: string;
  };
  message: string;
};

export type AnalyticsPartiesResponse = {
  success: boolean;
  response: {
    configured: boolean;
    metric: DashboardMetricKey;
    level: 'parties';
    view: DashboardView;
    scope: DashboardScope;
    period: DashboardPeriod;
    filters?: Record<string, unknown>;
    data: AnalyticsPartyRow[];
    message: string;
  };
  message: string;
};


export type ExpenseDashboardPeriod = {
  yearno: number;
  monthno: string;
  month_start_ymd: number;
  upto_date_ymd: number;
  label: string;
  working_days: number;
  ongoing: boolean;
};

export type ExpenseDashboardSummary = {
  total_cost: number;
  cost_per_pick: number;
  avg_picks: number;
  production_mtr: number;
  cost_per_machine_day: number;
  units: number;
  unit_rate: number;
  costing_looms: number;
  producing_looms_diagnostic: number;
  machine_days: number;
};

export type ExpenseDashboardComposition = {
  electricity: number;
  salary: number;
  stores: number;
  total: number;
};

export type ExpenseDashboardProduction = {
  mw_rapier_mtr: number;
  sip_rapier_mtr: number;
  sip_waterjet_mtr: number;
  rapier_total_mtr: number;
  total_mtr: number;
};

export type ExpenseDashboardData = {
  period: ExpenseDashboardPeriod;
  summary: ExpenseDashboardSummary;
  composition: ExpenseDashboardComposition;
  production: ExpenseDashboardProduction;
  unit_reconciliation: Record<string, unknown>;
  division: Record<string, unknown>;
  picks: Record<string, unknown>;
  meta: Record<string, unknown>;
};

export type ExpenseDashboardCardResponse = {
  success: boolean;
  response: {
    data: ExpenseDashboardData;
  };
  message: string;
};

export type ExpenseDashboardCardParams = {
  prptype: string;
  yearno: string | number;
  monthno: string | number;
  date?: string;
  refresh?: 0 | 1;
};

export type TargetCardParams = {
  prptype: string;
  yearno: string | number;
  monthno: string | number;
  view: DashboardView;
  upto_date?: string;
};

export type AnalyticsExecutivesParams = TargetCardParams & {
  metric: DashboardMetricKey;
  executive_code?: string;
};

export type AnalyticsPartiesParams = TargetCardParams & {
  metric: DashboardMetricKey;
  executive_code?: string;
  party_code?: string;
};


export type AnalyticsDrilldownParams = TargetCardParams & {
  metric: Exclude<DashboardMetricKey, 'COLLECTION'>;
  executive_code?: string;
  party_code?: string;
  design_code?: string;
  document_uid?: string;
};

function query(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export const DashboardAPI = {
  targetCard(params: TargetCardParams) {
    return ApiClient.get<TargetCardResponse>(
      `/api/mobile-dashboard/target-card?${query(params)}`,
    );
  },


  expenseCard(params: ExpenseDashboardCardParams) {
    return ApiClient.get<ExpenseDashboardCardResponse>(
      `/api/mobile-dashboard/expense-card?${query(params)}`,
    );
  },

  analyticsExecutives(params: AnalyticsExecutivesParams) {
    return ApiClient.get<AnalyticsExecutivesResponse>(
      `/api/mobile-dashboard/target-card/analytics-executives?${query(params)}`,
    );
  },


  analyticsDesigns(params: AnalyticsDrilldownParams) {
    return ApiClient.get<AnalyticsDesignsResponse>(
      `/api/mobile-dashboard/target-card/designs?${query(params)}`,
    );
  },

  analyticsDocuments(params: AnalyticsDrilldownParams) {
    return ApiClient.get<AnalyticsDocumentsResponse>(
      `/api/mobile-dashboard/target-card/documents?${query(params)}`,
    );
  },

  analyticsLines(params: AnalyticsDrilldownParams) {
    return ApiClient.get<AnalyticsLinesResponse>(
      `/api/mobile-dashboard/target-card/lines?${query(params)}`,
    );
  },

  analyticsParties(params: AnalyticsPartiesParams) {
    return ApiClient.get<AnalyticsPartiesResponse>(
      `/api/mobile-dashboard/target-card/parties?${query(params)}`,
    );
  },
};
