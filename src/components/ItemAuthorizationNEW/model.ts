// FILE: src/components/ItemAuthorizationNEW/model.ts
// Pure logic of Item Authorization, copied 1:1 from the legacy screen
// (src/components/ItemAuthorization/index.tsx) so the legacy folder can be
// deleted later: financial-year code, payloads, search, remark edit rules.

export type Row = Record<string, any>;

export type MainTab = 'requests' | 'history' | 'verify';
export type ItemAction = 'accept' | 'reject' | 'list' | 'pending' | 'verifyreject';
export type PartyTab = 'party' | 'history';

/** atype sent to /api/itembrowse per tab (legacy: requests 'B', history 'h', verify 'A'). */
export const TAB_ATYPE: Record<MainTab, string> = { requests: 'B', history: 'h', verify: 'A' };

export const TAB_META: Record<MainTab, { label: string; search: string; empty: string }> = {
  requests: { label: 'Request', search: 'Search Item Authorization ...', empty: 'No request data found!' },
  history: { label: 'History', search: 'Search Item history...', empty: 'No history data found!' },
  verify: { label: 'Verify', search: 'Search item verify...', empty: 'No verify data found!' },
};

export const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

/** legacy getCurrentFinancialYear: FY starts in April → last 2 digits of the FY END year ("26" for Apr-2025..Mar-2026). */
export const getCurrentFinancialYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
  return financialYear.toString().substring(2);
};

/** GET /api/itembrowse params (identical for all three tabs except atype). */
export const browseParams = (tab: MainTab, strcode: string) => ({
  txntype: 'app_item_master_auth',
  referrer: 'dashboard',
  prptype: 'R',
  yearno: getCurrentFinancialYear(),
  strcode: strcode || '',
  atype: TAB_ATYPE[tab],
});

/** legacy search: filterKey is always 'all' → any value (String(v)) contains the query, case-insensitive. */
export const searchRows = <R extends Row>(rows: R[], q: string): R[] => {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(needle)));
};

export type EditMap = { [ItmCode: string]: { aremark?: string; aremarkRaw?: string; [k: string]: any } };

/** legacy handleEdit(…, 'aremark', text): stores the text as-is plus a "<field>Raw" copy without ₹ and commas. */
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

/** POST /api/authitem body — legacy handleConfirmAction (row without d1 + overrides). */
export const authPayload = (item: Row, action: ItemAction, edits: EditMap): Row | 'null' => {
  const removed1: Row = { ...item };
  delete removed1['d1'];
  const common = {
    remark: edits[removed1.ItmCode]?.aremark || (removed1.aremark || ''),
    prptype: 'R',
    referrer: 'dashboard',
    itmcode: removed1.ItmCode,
    // legacy quirk kept: reads `strCode` (lower-case s) from the row
    strcode: removed1.strCode,
    yearno: getCurrentFinancialYear(),
    action: 'edit',
    txntype: 'app_item_master_auth',
  };
  // keep legacy key order: spread row, remark, prptype, isauth, referrer, itmcode, strcode, yearno, action, txntype, atype
  const build = (isauth: number, atype: string) => ({
    ...removed1,
    remark: common.remark,
    prptype: common.prptype,
    isauth,
    referrer: common.referrer,
    itmcode: common.itmcode,
    strcode: common.strcode,
    yearno: common.yearno,
    action: common.action,
    txntype: common.txntype,
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
