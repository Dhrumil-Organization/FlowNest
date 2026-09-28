import AsyncStorage from '@/common/utils/compatibleStorage';
import axios, { AxiosError } from 'axios';
import { resolveNewErpApiBaseUrl } from '@/src/api/client';

export type ExpenseDashboardData = {
    period: { yearno: number; monthno: string; month_start_ymd: number; upto_date_ymd: number; requested_upto_ymd?: number; complete_through_ymd?: number | null; last_expense_entry_ymd?: number | null; label: string; display_range?: string; working_days: number; ongoing: boolean; coverage_status?: 'complete' | 'partial' | 'incomplete'; is_complete?: boolean; pending_expenses?: Array<{ key: string; label: string; last_entered_ymd?: number | null; pending_from_ymd: number; pending_to_ymd: number; pending_days: number }>; source_coverage?: Record<string, number | null> };
    summary: { total_cost: number; cost_per_pick: number; avg_picks: number; production_mtr: number; cost_per_machine_day: number; units: number; unit_rate: number; costing_looms: number; producing_looms_diagnostic: number; machine_days: number };
    composition: { electricity: number; salary: number; stores: number; total: number };
    production: { mw_rapier_mtr: number; sip_rapier_mtr: number; sip_waterjet_mtr: number; rapier_total_mtr: number; total_mtr: number; latest_date_ymd?: number | null; daily_trend?: Array<{ date_ymd: number; day: string; rapier_mtr: number; waterjet_mtr: number; combined_mtr: number; mw_rapier_mtr: number; sip_rapier_mtr: number }> };
    utilities?: { total_kwh:number; unit_rate:number; total_amount:number; rate_rows?: Array<Record<string, unknown>>; [key:string]:unknown };
    trends?: { expense_daily?: Array<Record<string, any>>; utility_daily?: Array<Record<string, any>>; stores_daily_basis?: string; maintenance_included?: boolean; other_included?: boolean; source_rule?: string };
    division: Record<string, any>;
    unit_reconciliation: Record<string, unknown>;
    picks: Record<string, unknown>;
    meta: Record<string, unknown>;
};

type Envelope = { success: boolean; response?: { data?: ExpenseDashboardData } | null; message?: string };

export async function fetchExpenseDashboardCard(args: {
    token: string; prptype?: string; yearno: number | string; monthno: number | string;
    date?: string; refresh?: boolean; prpcodes?: string[] | string;
}): Promise<ExpenseDashboardData> {
    if (!String(args.token || '').trim()) throw new Error('Authentication token is missing.');
    try {
        // FIX: this was a hardcoded 'https://apig.tms-webapp.com' (the Sudamo
        // host) regardless of which property the user is logged into, so a
        // Rayons session's expense dashboard card silently called the wrong
        // ERP server. Resolve it fresh from selected_property, same as every
        // other New ERP API call.
        const selectedProperty = await AsyncStorage.getItem('selected_property');
        const API = resolveNewErpApiBaseUrl(selectedProperty);
        const res = await axios.get<Envelope>(`${API}/api/mobile-dashboard/expense-card`, {
            headers: {
                Authorization: `Bearer ${args.token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'x-platform': 'mob',
            },
            params: {
                prptype: String(args.prptype || 'S').toUpperCase(),
                yearno: String(args.yearno),
                monthno: String(args.monthno).padStart(2, '0'),
                date: args.date || undefined,
                refresh: args.refresh ? 1 : 0,
                prpcodes: args.prpcodes || [],
            },
            timeout: 30000,
        });
        // Never log bearer tokens in production.
        const params = {
            prptype: String(args.prptype || 'S').toUpperCase(),
            yearno: String(args.yearno),
            monthno: String(args.monthno).padStart(2, '0'),
            date: args.date || undefined,
            refresh: args.refresh ? 1 : 0,
            prpcodes: args.prpcodes,
        };

        if (__DEV__) console.log("Expense dashboard API", params);
        const data = res.data?.response?.data;
        if (!res.data?.success || !data) {
            throw new Error(res.data?.message || 'Production cost data is unavailable.');
        }
        return data;
    } catch (error) {
        const e = error as AxiosError<Envelope>;
        if (e.response?.data?.message) throw new Error(e.response.data.message);
        if (e.code === 'ECONNABORTED') throw new Error('The production cost request timed out.');
        if (!e.response) throw new Error('Unable to connect to the server.');
        throw error instanceof Error ? error : new Error('Unable to load production cost.');
    }
}
