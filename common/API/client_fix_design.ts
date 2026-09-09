// src/api/client.ts  (or common/API/client.ts — match your path)
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API, initAPI } from './dynamicAPI';

// const API = 'https://apig.tms-webapp.com';
// const initAPI = async (): Promise<string> => {
//     return API;
// }
const cleanBase = (value?: string | null) => {
    const raw = String(value || API || '').trim();
    return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
};

export const BASE_URL = `${cleanBase(API)}/api`;

const client: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const base = cleanBase(await initAPI());
    config.baseURL = `${base}/api`;

    const token = await AsyncStorage.getItem('access_token');
    config.headers['x-platform'] = 'mob';

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('API REQUEST', {
        method: config.method,
        baseURL: config.baseURL,
        url: config.url,
        params: config.params,
    });

    return config;
});

client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<any>) => {
        console.log('API ERROR', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
            method: error.config?.method,
            baseURL: error.config?.baseURL,
            url: error.config?.url,
            params: error.config?.params,
        });
        return Promise.reject(error);
    }
);

// ── Types ────────────────────────────────────────────────────
export interface YarnLine {
    mi_id: string;
    blend_ratio: string | null;
    epi?: number;
    ppi?: number;
    ends?: number;
    sizing?: boolean;
    name: string;
    sys: string;
    cnt: number;
    base_price?: number;
    price?: number;
}

export interface Design {
    id: string;
    code: string;
    category: string;
    type: 'YD' | 'PD';
    weave?: string;
    reed_space: number;
    greige_width?: number;
    width_basis?: 'reed' | 'greige';
    warp_shrink: number;
    fin_width?: number;
    gf_shrink: number;
    warp_wastage?: number;
    weft_wastage?: number;
    finish_locked: boolean;
    note?: string;
    warp_yarns: YarnLine[];
    weft_yarns: YarnLine[];
    selvedge_yarns?: YarnLine[];
    epi_total?: number;
    ppi_total?: number;
    cw_count?: number;
    latest_cost?: number;

    // Engineering ↔ ERP persistence identity
    dsn_code?: string;
    source_prpcode?: string;
    source_yearno?: string | number;
    erp_sync_status?: string;
    erp_synced_at?: string;

    // Legacy/API compatibility fields
    DsnCode?: string;
    DsnName?: string;
    ItmCode?: string;
    ItmName?: string;
    tag?: string;
}


export interface Alias {
    id: string; // or index
    name: string;
  }
  
  // Props for AliasesTab
  export interface AliasesTabProps {
    design: Design | null;
    // onNavigateToCatalog: () => void;
  }
  

export interface SubDesign {
    id: string;
    md_id: string;
    code: string;
    commercial_name?: string;
    warp_colors: any[];
    weft_colors: any[];
    warp_patterns: { color_name: string; hex?: string; thread_count: number }[];
    weft_patterns: { color_name: string; hex?: string; thread_count: number }[];
}

export interface YarnMainRow {
    row_type: 'main';
    selectable: true;
    mi_id: string;
    itm_code: null;
    m_itm_code: string;
    main_yarn_code: string;
    name: string;
    prp_code: string;
    str_code: string;
    variant_count: number;
    available_blends: string[];
}

export interface YarnMaster {
    row_type?: 'item';
    selectable?: true;
    mi_id: string;
    itm_code: string;
    m_itm_code: string;
    main_yarn_code: string;
    is_main_yarn_item?: boolean;
    prp_code: string;
    str_code: string;
    name: string;
    sys: string;
    cnt: number;
    ply?: number;
    price: number;
    blend_ratio?: string;
    w_blend_per?: string;
    w_name_code?: string;
    itm_name?: string;
    count_source?: string;
    engineering_warning?: string | null;
    fibre?: string;
    w_count_type?: number;
    w_count?: number;
    w_denier?: number;
    denier?: number;
    w_ply?: number;
}

export interface YarnHelpMeta {
    mode: 'main' | 'items';
    prpcode: string;
    strcode: string;
    limit: number;
    count: number;
    search?: string;
    main_yarn_code?: string;
    candidate_count?: number;
    family_count?: number;
}

export interface YarnHelpResponse<T> {
    success: boolean;
    data: T[];
    message?: string;
    meta?: YarnHelpMeta;
}

export interface CostInputs {
    price_map: Record<string, number>;
    dye_map: Record<string, number>;
    weaving_rate: number;
    rpm: number;
    eff: number;
    greige_brok: number;
    dyeing_proc: number;
    finished_brok: number;
    cut_pack: number;
}

export interface ComputeResult {
    warp_rows: any[];
    weft_rows: any[];
    snap_rm: number;
    snap_weaving_cost: number;
    snap_greige_mfg: number;
    snap_greige_brok_amt: number;
    snap_greige_price: number;
    snap_greige_kg: number;
    snap_greige_glm: number;
    snap_has_fin: boolean;
    snap_finished_price: number;
    snap_finished_kg: number;
    snap_final_cost: number;
    snap_ppi_loom: number;
    snap_ppi_table: number;
    snap_prod_day: number;
    snap_rm_pct: number;
    snap_weave_pct: number;
    warp_cost: number;
    weft_cost: number;
    greige_width: number;
    shrink_impact: number;
}

export interface CostingRecord {
    id: string;
    md_id: string;
    code: string;
    type: 'YD' | 'PD';
    category: string;
    inputs: CostInputs;
    snap: {
        rm: number;
        weaving_cost: number;
        greige_mfg: number;
        greige_price: number;
        greige_kg: number;
        has_fin: boolean;
        finished_price?: number;
        finished_kg?: number;
        final_cost: number;
        ppi_loom: number;
        ppi_table: number;
        prod_day: number;
        rm_pct: number;
        weave_pct: number;
    };
    yarn_lines: any[];
    created_at: string;
}

export interface GetItemRequest {
    prpcode: string;
    yearno: string;
    strcode: string;
    txntype: string;
    isall: number;
    ttype: number[];
    fetch: string;
    billdate: string;
    itmcode: string;
}

export interface GetItemResponse {
    success: boolean;
    // data: any[];
    response: {
        data: GetItem[];
    };
    message?: string;
}

export interface GetItem {
    ItmCode: string;
    ItmName: string;
    UOM?: string;
    Denier?: string;
    Rate?: string;
    HsnCode?: string;
    GSTGrpCode?: string;
    tag?: string;
}

type DesignListParams = {
    category?: string;
    search?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    yearno?: string;
};

type DesignListResponse = {
    success: boolean;
    data: Design[] | {
        data: Design[];
        total?: number;
        page?: number;
        limit?: number;
        per_page?: number;
        total_pages?: number;
    };
    meta?: {
        page?: number;
        per_page?: number;
        count?: number;
        has_more?: boolean;
    };
};

// ── Design API ───────────────────────────────────────────────
export const DesignAPI = {
    list: (params: DesignListParams = {}) => {
        const page = Number(params.page || 1);
        const perPage = Number(params.per_page || params.limit || 50);

        return client.get<DesignListResponse>('/designs', {
            params: {
                yearno: params.yearno || '27',
                page,
                per_page: perPage,
                limit: perPage,
                category: params.category,
                search: params.search,
            },
        });
    },

    get: (id: string) =>
        client.get<{ success: boolean; data: Design }>(`/designs/${id}`, {
            params: { yearno: '27' },
        }),

	create: (body: any) =>
		client.post<{ success: boolean; data: Design }>(
			'/designs',
			body,
			{
				params: {
					yearno: body.yearno || body.YearNo || '27',
					prpcode: body.prpcode || body.PrpCode || 'SIP',
					strcode: body.strcode || body.StrCode || '002',
				},
			}
		),

	update: (id: string, body: any) =>
		client.put<{ success: boolean; data: Design }>(
			`/designs/${id}`,
			body,
			{
				params: {
					yearno: body.yearno || body.YearNo || '27',
					prpcode: body.prpcode || body.PrpCode || 'SIP',
					strcode: body.strcode || body.StrCode || '002',
				},
			}
		),
		
    colourways: (mdId: string) =>
        client.get<{ success: boolean; data: SubDesign[] }>(`/designs/${mdId}/colourways`, {
            params: { yearno: '27' },
        }),

    addColourway: (mdId: string, body: Partial<SubDesign>) =>
        client.post<{ success: boolean; data: SubDesign }>(`/designs/${mdId}/colourways`, body, {
            params: { yearno: '27' },
        }),

    updateColourway: (sdId: string, body: Partial<SubDesign>) =>
        client.put<{ success: boolean; data: SubDesign }>(`/colourways/${sdId}`, body, {
            params: { yearno: '27' },
        }),

    mainYarns: (params: {
        limit?: number;
        search?: string;
        yearno?: string;
        prpcode?: string;
        strcode?: string;
    } = {}) =>
        client.get<YarnHelpResponse<YarnMainRow>>('/yarns', {
            params: {
                mode: 'main',
                yearno: params.yearno || '27',
                prpcode: params.prpcode || 'SIP',
                strcode: params.strcode || '002',
                limit: params.limit || 100,
                search: params.search,
            },
        }),

    yarnItems: (params: {
        main_yarn_code: string;
        limit?: number;
        search?: string;
        yearno?: string;
        prpcode?: string;
        strcode?: string;
    }) =>
        client.get<YarnHelpResponse<YarnMaster>>('/yarns', {
            params: {
                mode: 'items',
                yearno: params.yearno || '27',
                prpcode: params.prpcode || 'SIP',
                strcode: params.strcode || '002',
                main_yarn_code: params.main_yarn_code,
                limit: params.limit || 250,
                search: params.search,
            },
        }),

    /*
     * Backward-compatible generic call for older screens.
     */
    yarns: (params: {
        mode?: 'main' | 'items';
        main_yarn_code?: string;
        limit?: number;
        search?: string;
        yearno?: string;
        prpcode?: string;
        strcode?: string;
    } = {}) =>
        client.get<YarnHelpResponse<YarnMainRow | YarnMaster>>('/yarns', {
            params: {
                mode: params.mode || (params.main_yarn_code ? 'items' : 'main'),
                yearno: params.yearno || '27',
                prpcode: params.prpcode || 'SIP',
                strcode: params.strcode || '002',
                main_yarn_code: params.main_yarn_code,
                limit: params.limit || (params.main_yarn_code ? 250 : 100),
                search: params.search,
            },
        }),

    yarnDyeing: (miId: string) =>
        client.get<{ success: boolean; data: { average: number; recent: any[] } }>(`/yarns/${miId}/dyeing`, {
            params: { yearno: '27' },
        }),
};

// ── Costing API ──────────────────────────────────────────────
export const CostingAPI = {
    compute: (body: { md_id: string } & CostInputs) =>
        client.post<{ success: boolean; data: ComputeResult }>('/costing/compute', body),

    save: (body: { md_id: string } & CostInputs) =>
        client.post<{ success: boolean; data: ComputeResult & { id: string } }>('/costing/save', body),

    history: (mdId?: string) =>
        client.get<{ success: boolean; data: any[] }>('/costing/history', { params: { md_id: mdId } }),

    get: (id: string) =>
        client.get<{ success: boolean; data: CostingRecord }>(`/costing/${id}`),

    variance: (mdId: string) =>
        client.get<{ success: boolean; data: { records: any[]; variance: any } }>('/costing/variance', { params: { md_id: mdId } }),
};

export const ItemAPI = {
    getItem: (params: GetItemRequest) =>
        client.get<GetItemResponse>('/getitem', { params }),
};

export const RealCostingChainAPI = {
  dashboard: (params: {
    prpcode?: string;
    yearno?: string;
    strcode?: string;
    from_date?: string;
    to_date?: string;
    dsncode?: string;
    order_uid?: string;
  }) =>
    client.get('/real-costing-chain/dashboard', {
      params: {
        prpcode: params.prpcode || 'SIP',
        yearno: params.yearno || '27',
        strcode: params.strcode || '',
        from_date: params.from_date,
        to_date: params.to_date,
        dsncode: params.dsncode || '',
        order_uid: params.order_uid || '',
      },
    }),

  designDrilldown: (params: {
    prpcode?: string;
    yearno?: string;
    dsncode: string | number;
    from_date?: string;
    to_date?: string;
  }) =>
    client.get('/real-costing-chain/design-drilldown', {
      params: {
        prpcode: params.prpcode || 'SIP',
        yearno: params.yearno || '27',
        dsncode: params.dsncode,
        from_date: params.from_date,
        to_date: params.to_date,
      },
    }),
};

export default client;