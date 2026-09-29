import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';

// The existing endpoints return the payload in different wrappers
// (res.data.data, res.data.response, res.data.data.data). These helpers accept all of them.

export type ApiResult = { ok: boolean; message: string; payload: any; errorCode?: string };

const headers = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-with': 'XMLHttpRequest',
});

const payloadOf = (body: any) => body?.response ?? body?.data ?? body ?? {};

export const listOf = (body: any): any[] => {
    const tries = [body?.data?.data, body?.response?.data, body?.data, body?.response, body];
    for (const t of tries) if (Array.isArray(t)) return t;
    return [];
};

const isSuccessValue = (v: any) =>
    v === true || v === 1 || v === '1' ||
    v === 'true' || v === 'TRUE' ||
    v === 'success' || v === 'SUCCESS' ||
    v === 'ok' || v === 'OK';

const toResult = (body: any): ApiResult => {
    const payload = payloadOf(body);
    // Different controller versions wrap success/status one level deeper.
    // Treat an explicit success flag anywhere in the common response wrappers as success.
    const ok =
        isSuccessValue(body?.success) ||
        isSuccessValue(body?.status) ||
        isSuccessValue(body?.response?.success) ||
        isSuccessValue(body?.response?.status) ||
        isSuccessValue(body?.data?.success) ||
        isSuccessValue(body?.data?.status) ||
        isSuccessValue(payload?.success) ||
        isSuccessValue(payload?.status);

    return {
        ok,
        message: body?.message || body?.response?.message || body?.data?.message || payload?.message || '',
        payload,
        errorCode: payload?.error_code
    };
};

async function post(token: string, path: string, data: any): Promise<ApiResult> {
    try {
        const res = await axios.post(`${API}/api/${path}`, data, { headers: headers(token), timeout: 30000 });
        return toResult(res.data);
    } catch (e: any) {
        if (e?.response?.data) return toResult(e.response.data);
        return { ok: false, message: e?.code === 'ECONNABORTED' ? 'Network is slow. Try again.' : 'No connection to server.', payload: {}, errorCode: 'NETWORK' };
    }
}

async function getList(token: string, path: string, params: any): Promise<any[]> {
    try {
        const res = await axios.get(`${API}/api/${path}`, { headers: headers(token), params, timeout: 30000 });
        return listOf(res.data);
    } catch (e) {
        console.log(`${path} error`, e);
        return [];
    }
}

/* ---------- new carton-first endpoints (WeftCartonIssueController) ---------- */

export const searchCartons = (t: string, prpcode: string, yearno: any, search: string) =>
    post(t, 'weft_carton_search', { prpcode, yearno, search });

export const cartonBalance = (t: string, prpcode: string, yearno: any, cartno: string, hint: any = {}) =>
    post(t, 'weft_carton_balance', {
        prpcode, yearno, cartno,
        puid: hint.PUId ?? '', psrno: hint.PSrNo ?? '', psubsr: hint.PSubSr ?? '', trantype: hint.TranType ?? '',
    });

export const findIssue = (t: string, prpcode: string, issdate: string, beamuid: any, dsncode: any) =>
    post(t, 'weft_find_issue', { prpcode, issdate, beamuid, dsncode });

export const saveLine = (t: string, body: any) => post(t, 'weft_line_save', body);
export const modifyLine = (t: string, body: any) => post(t, 'weft_line_modify', body);
export const deleteLine = (t: string, body: any) => post(t, 'weft_line_delete', body);
export const deleteIssue = (t: string, body: any) => post(t, 'weft_issue_delete', body);
export const issueList = (t: string, body: any) => post(t, 'weft_issue_list', body);

/* ---------- existing help endpoints (same params as AddWeftIssueDetail) ---------- */

export const fetchBeams = (t: string, prpcode: string, yearno: any, dmy: string) =>
    getList(t, 'beam_for_weftissue_help', { prpcode, yearno, strcode: '002', txntype: 'beam_weft_issue', date: dmy, uid: '' });

export const fetchDesigns = (t: string, prpcode: string, yearno: any, dmy: string, stktype: string, beamuid: any) =>
    getList(t, 'orderdesign_for_weftissue_help', { prpcode, yearno, txntype: 'beam_weft_issue', date: dmy, uid: '', stktype, beamuid });

export const fetchRecipe = (t: string, prpcode: string, yearno: any, dsncode: any, stktype: string) =>
    getList(t, 'designwise_mainitem_for_weftissue_help', {
        prpcode, yearno, txntype: 'weft_selvedge_issue', dsncode, stktype,
    });

export const itemDetailFromCarton = (
    token: string,
    prpcode: string,
    yearno: any,
    parsedData: any
) =>
    post(token, 'get_item_detail_from_carton', {
        prpcode,
        yearno,
        strcode: parsedData?.yarnstrcode ?? '',
        itmcode: parsedData?.ItmCode ?? '',
        mercode: parsedData?.MerCode ?? '',
        grdcode: parsedData?.GrdCode ?? '',
        shdcode: parsedData?.ShdCode ?? '',
    });

/** Fetch expected production quantity from the issue-qty history API. */
export async function fetchExpProdQty(t: string, p: {
    prpcode: string; yearno: any; reqqty: any; itmcode: any; shdcode: any;
    srno: any; beamuid: any; dsncode: any; IssUId?: any;
}): Promise<number> {
    try {
        const res = await axios.get(`${API}/api/getExpectedWeftIssue`, {
            headers: headers(t),
            params: {
                prpcode: p.prpcode,
                yearno: p.yearno,
                txntype: 'beam_weft_issue',
                reqqty: p.reqqty,
                itmcode: p.itmcode,
                shdcode: p.shdcode,
                srno: p.srno || '',
                beamuid: p.beamuid,
                dsncode: p.dsncode,
                IssUId: p.IssUId ?? '',
            },
            timeout: 20000,
        });

        const arr = listOf(res.data);
        return Number(arr?.[0]?.ExpProdQty) || 0;
    } catch (e) {
        console.log('getExpectedWeftIssue error', e);
        return 0;
    }
}
