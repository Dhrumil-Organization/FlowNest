import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const BASE_URL = 'http://192.168.13.100:8000/api';

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// attach Bearer token on every request
client.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── types ─────────────────────────────────────────────────────
export interface YarnLine {
    mi_id: string; blend_ratio: string | null;
    epi?: number; ppi?: number;
    name: string; sys: string; cnt: number; base_price: number;
}

export interface Design {
    id: string; code: string; category: string;
    type: 'YD' | 'PD'; weave?: string;
    reed_space: number; warp_shrink: number;
    fin_width?: number; gf_shrink: number;
    finish_locked: boolean; note?: string;
    warp_yarns: YarnLine[];
    weft_yarns: YarnLine[];
    epi_total?: number; ppi_total?: number;
    cw_count?: number; latest_cost?: number;
}

export interface SubDesign {
    id: string; md_id: string; code: string;
    commercial_name?: string;
    warp_colors: any[]; weft_colors: any[];
    warp_patterns: { color_name: string; hex?: string; thread_count: number }[];
    weft_patterns: { color_name: string; hex?: string; thread_count: number }[];
}

export interface YarnMaster {
    mi_id: string; name: string; sys: string;
    cnt: number; price: number;
}

export interface CostInputs {
    price_map: Record<string, number>;
    dye_map:   Record<string, number>;
    weaving_rate: number; rpm: number; eff: number;
    greige_brok: number; dyeing_proc: number;
    finished_brok: number; cut_pack: number;
}

export interface ComputeResult {
    warp_rows: any[]; weft_rows: any[];
    snap_rm: number; snap_weaving_cost: number;
    snap_greige_mfg: number; snap_greige_brok_amt: number;
    snap_greige_price: number; snap_greige_kg: number;
    snap_greige_glm: number; snap_has_fin: boolean;
    snap_finished_price: number; snap_finished_kg: number;
    snap_final_cost: number; snap_ppi_loom: number;
    snap_ppi_table: number; snap_prod_day: number;
    snap_rm_pct: number; snap_weave_pct: number;
    warp_cost: number; weft_cost: number;
    greige_width: number; shrink_impact: number;
}

export interface CostingRecord {
    id: string; md_id: string; code: string;
    type: 'YD' | 'PD'; category: string;
    inputs: CostInputs;
    snap: {
        rm: number; weaving_cost: number;
        greige_mfg: number; greige_price: number; greige_kg: number;
        has_fin: boolean; finished_price?: number; finished_kg?: number;
        final_cost: number; ppi_loom: number; ppi_table: number;
        prod_day: number; rm_pct: number; weave_pct: number;
    };
    yarn_lines: any[];
    created_at: string;
}

// ── Design API ───────────────────────────────────────────────
export const DesignAPI = {
    list: (params?: { category?: string; search?: string }) =>
        client.get<{ success: boolean; data: Design[] }>('/designs', { params }),

    get: (id: string) =>
        client.get<{ success: boolean; data: Design }>(`/designs/${id}`),

    create: (body: Partial<Design> & { warp_yarns: any[]; weft_yarns: any[] }) =>
        client.post<{ success: boolean; data: Design }>('/designs', body),

    update: (id: string, body: Partial<Design>) =>
        client.put<{ success: boolean; data: Design }>(`/designs/${id}`, body),

    colourways: (mdId: string) =>
        client.get<{ success: boolean; data: SubDesign[] }>(`/designs/${mdId}/colourways`),

    addColourway: (mdId: string, body: Partial<SubDesign>) =>
        client.post<{ success: boolean; data: SubDesign }>(`/designs/${mdId}/colourways`, body),

    updateColourway: (sdId: string, body: Partial<SubDesign>) =>
        client.put<{ success: boolean; data: SubDesign }>(`/colourways/${sdId}`, body),

    yarns: () =>
        client.get<{ success: boolean; data: YarnMaster[] }>('/yarns'),

    yarnDyeing: (miId: string) =>
        client.get<{ success: boolean; data: { average: number; recent: any[] } }>(`/yarns/${miId}/dyeing`),
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
