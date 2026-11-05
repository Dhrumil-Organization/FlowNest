import { API } from '@/common/API/dynamicAPI';
import axios from 'axios';

/**
 * Modify / Delete / Search helpers for Sudamo Production Orders.
 *
 * RULE: once a Production Order is authorised (isauth = 1) it can no longer be
 * modified or deleted. The UI hides the buttons, and before every save/delete
 * we re-read the order from the server so an order authorised by someone else
 * in the meantime is still blocked. The backend must enforce the same rule.
 */

// ---- Endpoints (change here if your backend routes differ) -----------------
export const PO_SHOW_URL = () => `${API}/api/prodorderwebnew/show`;
export const PO_UPDATE_URL = () => `${API}/api/prodorderwebnew/update`;
export const PO_DELETE_URL = () => `${API}/api/prodorderwebnew/delete`;
export const PO_TXNTYPE = 'production_order_sudo';

// ---- Authorisation state -----------------------------------------------------
export const isAuthorisedPO = (item: any): boolean => {
    if (!item) return false;
    if (String(item.isauth ?? '').trim() === '1') return true;
    if (item.isProcessed && item.actionType === 'accept') return true;
    return false;
};

/** Can this order still be modified / deleted? */
export const canChangePO = (item: any): boolean => !!item && !isAuthorisedPO(item) && !item.isProcessed;

const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
});

const keyParams = (item: any) => ({
    uid: item.uid,
    prpcode: item.prpcode,
    yearno: item.yearno,
    strcode: item.greystrcode || item.strcode || '',
    prptype: item.prptype || 'S',
    txntype: PO_TXNTYPE,
});

/**
 * Re-reads the order from the server and throws if it is already authorised.
 * Returns the saved header row (main[0]) when available.
 */
export const assertNotAuthorised = async (item: any, token: string) => {
    const response = await axios.get(PO_SHOW_URL(), {
        headers: authHeaders(token),
        params: { ...keyParams(item), action: 'view' },
    });
    if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Production Order could not be loaded.');
    }
    const main = response?.data?.data?.main?.[0];
    if (main && String(main.uid ?? main.UId) !== String(item.uid)) {
        throw new Error('Loaded Production Order does not match the selected one.');
    }
    if (main && String(main.isauth ?? main.IsAuth ?? '').trim() === '1') {
        throw new Error('This Production Order is already authorised and can no longer be modified or deleted.');
    }
    return main || null;
};

export type POEditFields = {
    qty: string;
    rate: string;
    shkperc: string;
    expdate: string;
    remark: string;
};

export const updateProductionOrder = async (item: any, fields: POEditFields, token: string) => {
    await assertNotAuthorised(item, token);
    const payload = {
        ...keyParams(item),
        action: 'edit',
        referrer: 'dashboard',
        qty: fields.qty,
        rate: fields.rate,
        shkperc: fields.shkperc,
        expdate: fields.expdate,
        remark: fields.remark,
    };
    const response = await axios.post(PO_UPDATE_URL(), payload, { headers: authHeaders(token) });
    if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Production Order could not be updated.');
    }
    return response.data;
};

export const deleteProductionOrder = async (item: any, token: string) => {
    await assertNotAuthorised(item, token);
    const payload = { ...keyParams(item), action: 'delete', referrer: 'dashboard' };
    const response = await axios.post(PO_DELETE_URL(), payload, { headers: authHeaders(token) });
    if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Production Order could not be deleted.');
    }
    return response.data;
};

// ---- Search ------------------------------------------------------------------
export type POSearchField = 'all' | 'design' | 'order';

export const PO_SEARCH_FIELDS: { key: POSearchField; label: string; placeholder: string }[] = [
    { key: 'all', label: 'All', placeholder: 'Search design, production order, item, shade…' },
    { key: 'design', label: 'Design', placeholder: 'Search by design no. / name…' },
    { key: 'order', label: 'Production order', placeholder: 'Search by production order no.…' },
];

const DESIGN_KEYS = ['dsnname', 'dsncode', 'orderdesign', 'costdsnname', 'costdsncode', 'sampleno'];
const ORDER_KEYS = ['vouno', 'nvoudate', 'uid'];

export const matchesPOSearch = (item: any, query: string, field: POSearchField): boolean => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const has = (v: any) => v !== undefined && v !== null && String(v).toLowerCase().includes(q);
    if (field === 'design') return DESIGN_KEYS.some((k) => has(item?.[k]));
    if (field === 'order') return ORDER_KEYS.some((k) => has(item?.[k]));
    return Object.entries(item || {}).some(([k, v]) => k !== 'partyList' && typeof v !== 'object' && has(v));
};
