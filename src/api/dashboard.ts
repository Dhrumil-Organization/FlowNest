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
