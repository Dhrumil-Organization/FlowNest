import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';

/** Existing WftIssue API wrapper.
 *  Keep the existing backend endpoints/payload conventions used by WftIssue.
 */
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

const toResult = (body: any): ApiResult => {
    const payload = payloadOf(body);
    const ok = body?.success === true || body?.success === 1 || body?.status === true;
    return {
        ok,
        message: body?.message || payload?.message || '',
        payload,
        errorCode: payload?.error_code,
    };
};

async function post(token: string, path: string, data: any): Promise<ApiResult> {
    try {
        const res = await axios.post(`${API}/api/${path}`, data, {
            headers: headers(token),
            timeout: 30000,
        });
        return toResult(res.data);
    } catch (e: any) {
        if (e?.response?.data) return toResult(e.response.data);
        return {
            ok: false,
            message: e?.code === 'ECONNABORTED'
                ? 'Network is slow. Try again.'
                : 'No connection to server.',
            payload: {},
            errorCode: 'NETWORK',
        };
    }
}

async function getList(token: string, path: string, params: any): Promise<any[]> {
    try {
        const res = await axios.get(`${API}/api/${path}`, {
            headers: headers(token),
            params,
            timeout: 30000,
        });
        return listOf(res.data);
    } catch (e) {
        console.log(`${path} error`, e);
        return [];
    }
}

/* --------------------------------------------------------------------------
 * Existing WftIssue APIs
 * -------------------------------------------------------------------------- */

// Existing: get_carton_search
export const searchCartons = (t: string, prpcode: string, yearno: any, search: string) =>
    post(t, 'get_carton_search', {
        prpcode,
        yearno,
        strcode: '002',
        mitmcode: '',
        txntype: 'beam_weft_issue',
        searchcarton: search,
    });

// Existing carton APIs do not have the new `weft_carton_balance` route.
// Use get_carton_search for the exact carton and normalize the first match.
export const cartonBalance = async (
    t: string,
    prpcode: string,
    yearno: any,
    cartno: string,
    hint: any = {},
): Promise<ApiResult> => {
    try {
        const res = await axios.post(`${API}/api/get_carton_search`, {
            prpcode,
            yearno,
            strcode: '002',
            mitmcode: hint?.MItmCode || hint?.mitmcode || '',
            txntype: 'beam_weft_issue',
            searchcarton: cartno,
        }, { headers: headers(t), timeout: 30000 });

        const result = toResult(res.data);
        const rows = listOf(res.data);
        const exact = rows.find((x: any) =>
            String(x?.CartNo ?? x?.cartonNo ?? '').trim() === String(cartno).trim()
        ) || rows[0];

        if (!exact) {
            return {
                ok: false,
                message: result.message || 'Carton not found.',
                payload: { data: null, lines: [] },
                errorCode: result.errorCode,
            };
        }

        return {
            ok: result.ok,
            message: result.message,
            errorCode: result.errorCode,
            payload: {
                ...result.payload,
                data: exact,
                lines: result.payload?.lines || [],
            },
        };
    } catch (e: any) {
        if (e?.response?.data) return toResult(e.response.data);
        return {
            ok: false,
            message: e?.code === 'ECONNABORTED' ? 'Network is slow. Try again.' : 'No connection to server.',
            payload: {},
            errorCode: 'NETWORK',
        };
    }
};

// Existing show API is used by WftIssue for issue data.
// The caller only needs a preview object; return the existing SHOW response.
export const findIssue = async (
    t: string,
    prpcode: string,
    issdate: string,
    beamuid: any,
    dsncode: any,
) => {
    // Existing SHOW API requires the parent UID, so there is no direct
    // beam+design preview endpoint in the old API set. Return an empty preview
    // rather than calling the new custom endpoint.
    return {
        ok: true,
        message: '',
        payload: { data: null },
        errorCode: undefined,
    } as ApiResult;
};

// Existing: add_creel_data
export const saveLine = (t: string, body: any) => {
    const carton = {
        uid: body?.uid || '',
        CartNo: body?.CartNo || '',
        Chees: body?.Chees ?? '',
        Wt: body?.Wt ?? '',
        PUId: body?.PUId ?? '',
        PSrNo: body?.PSrNo ?? '',
        PSubSr: body?.PSubSr ?? '',
        TranType: body?.TranType ?? '',
        ItmCode: body?.ItmCode ?? '',
        MerCode: body?.MerCode ?? '',
        GrdCode: body?.GrdCode ?? '',
        ShdCode: body?.ShdCode ?? '',
        Denier: body?.Denier ?? '',
        ExpProdQty: body?.ExpProdQty ?? 0,
        DsnRcpSrNo: body?.DsnRcpSrNo ?? '',
        DsnCode: body?.DsnCode ?? '',
    };

    return post(t, 'add_creel_data', {
        PrpCode: body?.prpcode,
        YearNo: body?.yearno,
        BeamUId: body?.BeamUId,
        StkType: body?.StkType,
        Issdate: body?.IssDate,
        SetupDate: body?.IssDate,
        uid: '',
        strcode: '002',
        txntype: 'beam_weft_issue',
        RecipeUId: '2',
        DsnCode: body?.DsnCode,
        ExpProdQtyType: body?.ExpProdQtyType,
        Cartons: [carton],
    });
};

// Existing: modify_creel_data
export const modifyLine = (t: string, body: any) =>
    post(t, 'modify_creel_data', {
        PrpCode: body?.prpcode,
        YearNo: body?.yearno,
        uid: body?.uid,
        SrNo: body?.srno,
        SubSr: body?.subsr,
        OldChees: body?.OldChees,
        OldQty: body?.OldQty,
        BeamUId: body?.BeamUId,
        DsnCode: body?.DsnCode,
        DsnRcpSrNo: body?.DsnRcpSrNo,
        Chees: body?.Chees,
        Wt: body?.Wt,
        ExpProdQty: body?.ExpProdQty,
        ExpProdQtyType: body?.ExpProdQtyType,
        txntype: 'beam_weft_issue',
    });

// Existing: delete_creel_single_data
export const deleteLine = (t: string, body: any) =>
    post(t, 'delete_creel_single_data', {
        cartonno: body?.cartonno || body?.CartNo || '',
        srno: body?.srno ?? body?.SrNo ?? '',
        subsrno: body?.subsr ?? body?.SubSr ?? '',
        uid: body?.uid || '',
        prpcode: body?.prpcode,
        yearno: body?.yearno,
        txntype: 'beam_weft_issue',
    });

// Existing: delete_creel_data
export const deleteIssue = (t: string, body: any) =>
    post(t, 'delete_creel_data', {
        prpcode: body?.prpcode,
        yearno: body?.yearno,
        uid: body?.uid,
    });

// Existing: get_yarn_issue_browse
export const issueList = (t: string, body: any) =>
    post(t, 'get_yarn_issue_browse', {
        prptype: body?.prptype || '',
        prpcode: body?.prpcode,
        strcode: '002',
        yearno: body?.yearno,
        txntype: 'beam_weft_issue',
        fromdate: body?.fromdate || body?.issdate || '',
        todate: body?.todate || body?.issdate || '',
        status: body?.status || '',
        ExpProdQtyType: body?.ExpProdQtyType || '1',
    });

/* Existing help APIs */

export const fetchBeams = (t: string, prpcode: string, yearno: any, dmy: string) =>
    getList(t, 'beam_for_weftissue_help', {
        prpcode, yearno, strcode: '002', txntype: 'beam_weft_issue', date: dmy, uid: ''
    });

export const fetchDesigns = (t: string, prpcode: string, yearno: any, dmy: string, stktype: string, beamuid: any) =>
    getList(t, 'orderdesign_for_weftissue_help', {
        prpcode, yearno, txntype: 'beam_weft_issue', date: dmy, uid: '', stktype, beamuid
    });

export const fetchRecipe = (t: string, prpcode: string, yearno: any, dsncode: any) =>
    getList(t, 'designwise_mainitem_for_weftissue_help', {
        prpcode, yearno, txntype: 'weft_selvedge_issue', dsncode
    });

/** Existing: get_expprodqty_from_issueqty */
export async function fetchExpProdQty(t: string, p: {
    prpcode: string; yearno: any; wt: any; itmcode: any; shdcode: any;
    dsnrcpsrno: any; beamuid: any; dsncode: any;
}): Promise<number> {
    try {
        const res = await axios.get(`${API}/api/get_expprodqty_from_issueqty`, {
            headers: headers(t),
            params: {
                PrpCode: p.prpcode,
                YearNo: p.yearno,
                txntype: 'beam_weft_issue',
                WfIssQty: p.wt,
                MRUId: '0',
                MRSrNo: '0',
                ItmCode: p.itmcode,
                ShdCode: p.shdcode,
                PlnWfSrNo: p.dsnrcpsrno,
                beamuid: p.beamuid,
                dsncode: p.dsncode,
            },
            timeout: 20000,
        });
        const arr = listOf(res.data);
        return Number(arr?.[0]?.ExpProdQty) || 0;
    } catch (e) {
        return 0;
    }
}
