// FILE: src/components/DesignAuthorizationNEW/model.ts
// Pure logic of Design Authorization, copied 1:1 from the legacy screen
// (components/DesignAuthorization/index.tsx): tab meta, browse params,
// search, remark edit rule, POST payloads and validation.

export type Row = Record<string, any>;

export type MainTab = 'requests' | 'history' | 'verify';
export type ItemAction = 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
export type PartyTab = 'party' | 'history';

/** atype sent to /api/itembrowse per tab (legacy: requests 'B', history 'h', verify 'A'). */
export const TAB_ATYPE: Record<MainTab, string> = { requests: 'B', history: 'h', verify: 'A' };

/** Tab labels, search placeholders (legacy HeaderBar) and empty texts — legacy wording. */
export const TAB_META: Record<MainTab, { label: string; search: string; empty: string }> = {
  requests: { label: 'Request', search: 'Search Design ...', empty: 'No request data found!' },
  history: { label: 'History', search: 'Search Item history...', empty: 'No history data found!' },
  verify: { label: 'Verify', search: 'Search item verify...', empty: 'No verify data found!' },
};

export const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

/** legacy store guard: `typeof StrCode == 'undefined' || StrCode == null || StrCode == ''`. */
export const isNoStore = (strCode: any) => typeof strCode == 'undefined' || strCode == null || strCode == '';

/** GET /api/itembrowse params — legacy key order; yearno = AsyncStorage 'yno'. */
export const browseParams = (tab: MainTab, yno: string | null, strcode: string) => ({
  txntype: 'app_item_master_auth',
  referrer: 'dashboard',
  prptype: 'R',
  yearno: yno,
  strcode: strcode || '',
  atype: TAB_ATYPE[tab],
});

/** legacy fetchData: every Request row gets `itemNameArray: []` (it then travels in the POST body too). */
export const withItemNameArray = (rows: Row[]): Row[] => rows.map((item) => ({ ...item, itemNameArray: [] }));

/** legacy search: filterKey is always 'all' → any value (String(v)) contains the query, case-insensitive. */
export const searchRows = <R extends Row>(rows: R[], q: string): R[] => {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(needle)));
};

export type EditMap = { [ItmCode: string]: { aremark?: string; aremarkRaw?: string; [k: string]: any } };

/** legacy handleEdit(ItmCode, 'aremark', text): stores the text as-is plus "aremarkRaw" without ₹ and commas. */
export const applyRemarkEdit = (prev: EditMap, itmCode: string, text: string): EditMap => ({
  ...prev,
  [itmCode]: {
    ...prev[itmCode],
    aremark: text,
    aremarkRaw: text.replace(/[₹,]/g, ''),
  },
});

export const ACTION_TITLE: Record<ItemAction, string> = {
  accept: 'Confirm Accept',
  pending: 'Confirm Pending',
  reject: 'Confirm Reject',
  verifyreject: 'Confirm Reject',
  list: '',
};

/** POST /api/authitem body — legacy handleConfirmAction: row without `d1` + overrides, legacy key order.
 *  Accept isauth 1 / atype B · Verify-Pending 0 / A · Reject 2 / B · Verify-Reject 2 / A.
 *  Legacy quirks kept: yearno is the literal "26"; strcode reads `strCode` (lower-case s) from the row. */
export const authPayload = (item: Row, action: ItemAction, edits: EditMap): Row | 'null' => {
  const removed1: Row = { ...item };
  delete removed1['d1'];
  const build = (isauth: number, atype: string) => ({
    ...removed1,
    remark: edits[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
    prptype: 'R',
    isauth,
    referrer: 'dashboard',
    itmcode: removed1.ItmCode,
    strcode: removed1.strCode,
    yearno: '26',
    action: 'edit',
    txntype: 'app_item_master_auth',
    atype,
  });
  if (action === 'accept') return build(1, 'B');
  if (action === 'pending') return build(0, 'A');
  if (action === 'reject') return build(2, 'B');
  if (action === 'verifyreject') return build(2, 'A');
  return 'null';
};

/** legacy handleValidation: for pending / verifyreject the payload's `aremark`
 *  (the row's stored remark — NOT the typed `remark`) must be non-empty. */
export const validateAuth = (payload: any, action: ItemAction): string | null => {
  const remark = payload?.aremark?.toString().trim();
  if (action === 'pending' || action === 'verifyreject') {
    if (!remark) return 'Auth Remark cannot be empty for Item.: ' + payload?.ItmCode;
  }
  return null;
};

/** IsAuth '1' authorised / '2' rejected / else pending (legacy card borders + party-history stamps). */
export const authTone = (isAuth: any): 'ok' | 'rej' | 'pend' => {
  const v = str(isAuth);
  return v === '1' ? 'ok' : v === '2' ? 'rej' : 'pend';
};
