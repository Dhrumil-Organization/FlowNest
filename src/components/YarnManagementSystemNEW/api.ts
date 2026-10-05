// FILE: src/components/YarnManagementSystemNEW/api.ts
// Every HTTP call of the legacy Yarn Management System
// (components/YarnManagementSystem/index.tsx, route app/(tabs)/yarn-management-system.tsx),
// using the API / token props instead of the global dynamicAPI host.
//
// Headers: every call sends { Authorization: Bearer <token>, Content-Type: application/json,
// Accept: application/json } (legacy getRequestConfig / inline POST headers), except
// get_criterion which legacy sent with Authorization only.
// Each function returns the raw response body (`response.data`); the caller reads the same
// response path legacy read (given per function). Params / body objects are built in model.ts
// with the legacy key order; `prptype` is AsyncStorage 'user_prptype' read by the caller.
//
//   GET  /api/get_criterion      { fetch:'prptype', txntype }                       → body.response.data   (legacy fetchPropertyGroup — defined but never invoked in legacy)
//   POST /api/getyarndefault     { prptype, return_json_data:'1' }                  → body.data.main {prpcode, yarnstrcode, yearno}
//   GET  /api/yarnblend          { prptype, category:'1'|'2', txntype }             → body.data.data
//   GET  /api/yarncount          { prptype, category, txntype }                     → body.data.data  (rows carry `formula`)
//   GET  /api/yarnply            { prptype, category, txntype }                     → body.data.data
//   GET  /api/yarntype           { prptype, category, txntype }                     → body.data.data
//   GET  /api/yarnlustre         { prptype, category, txntype }                     → body.data.data
//   GET  /api/yarnother          { prptype, category, txntype }                     → body.data.data
//   GET  /api/yarntypesubitem    { prptype, category, txntype }                     → body.data.data
//   GET  /api/getitem            { strcode, prptype, prpcode, yearno:'27' }         → body.response.data
//   GET  /api/getyarnmasteritem  { prptype, strcode, txntype, yarntype }            → body.data.data (+ body.data.mapped_data)   main list
//   GET  /api/getyarnmasteritem  { prptype, strcode, yarntype, txntype }            → body.data.data, body.data.mapped_data     sub item form
//   GET  /api/accountbasic       { prpcode, prptype, yearno, strcode, txntype, partytype:'p', type:'P', …blank keys } → body.response.data
//   GET  /api/yarnitemshow       { itmcode, strcode, prptype }                      → body.data.maindata[0]
//   GET  /api/yarnwbrowse        { txntype, mitmcode, prptype } | { prptype, mitmcode, txntype } → body.data.maindata
//   POST /api/yarnadd            main item body (model.spunPayload / filamentPayload)             → body.success, body.message, body.data.data.itmcode
//   POST /api/yarncreationmodify same body + itmcode (main) | model.subItemModifyPayload (sub)    → body.success, body.message, body.data.data.itmcode
//   POST /api/addyarnsubitem     model.subItemAddPayload                             → body.success, body.message, body.data.data.itmcode
//   POST /api/yarnitemdelete     { prptype, itmcode, strcode, txntype }              → body.success + body.response.{status,message}
//   POST /api/yarnitemd1add      { prptype, parcode, parname, itmcode, itmname, txntype, yarntype, strcode } → body.success, body.message
//   GET  /api/yarnitemd1browse   { itmcode, prptype, strcode, txntype, yarntype, prpcode:'SIP' }  → body.data.maindata
import axios from 'axios';
import { Row } from './model';

export type Api = { API: string; token: string };

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token || ''}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

const get = async ({ API, token }: Api, path: string, params: Row): Promise<any> => {
  const response = await axios.get(`${API}/api/${path}`, { headers: jsonHeaders(token), params });
  return response?.data;
};

const post = async ({ API, token }: Api, path: string, body: Row): Promise<any> => {
  const response = await axios.post(`${API}/api/${path}`, body, { headers: jsonHeaders(token) });
  return response?.data;
};

/** GET /api/get_criterion — property types (legacy fetchPropertyGroup; kept for parity, legacy never called it). */
export async function getPropertyTypes({ API, token }: Api): Promise<any> {
  const response = await axios.get(`${API}/api/get_criterion`, {
    params: { fetch: 'prptype', txntype: 'yarn_creation_item_master' },
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  return response?.data;
}

/** POST /api/getyarndefault — default property / yarn store / year (legacy soshow). */
export const getYarnDefault = (api: Api, body: Row) => post(api, 'getyarndefault', body);

export type MasterPath =
  | 'yarnblend'
  | 'yarncount'
  | 'yarnply'
  | 'yarntype'
  | 'yarnlustre'
  | 'yarnother'
  | 'yarntypesubitem';

/** GET /api/yarnblend | yarncount | yarnply | yarntype | yarnlustre | yarnother | yarntypesubitem. */
export const getYarnMaster = (api: Api, path: MasterPath, params: Row) => get(api, path, params);

/** GET /api/yarnblend (legacy fetchBlenddata). */
export const getYarnBlend = (api: Api, params: Row) => getYarnMaster(api, 'yarnblend', params);
/** GET /api/yarncount (legacy fetchBlendcount). */
export const getYarnCount = (api: Api, params: Row) => getYarnMaster(api, 'yarncount', params);
/** GET /api/yarnply (legacy fetchBlendply). */
export const getYarnPly = (api: Api, params: Row) => getYarnMaster(api, 'yarnply', params);
/** GET /api/yarntype (legacy fetchtype). */
export const getYarnType = (api: Api, params: Row) => getYarnMaster(api, 'yarntype', params);
/** GET /api/yarnlustre (legacy fetchlustre). */
export const getYarnLustre = (api: Api, params: Row) => getYarnMaster(api, 'yarnlustre', params);
/** GET /api/yarnother (legacy fetchOthresdata). */
export const getYarnOther = (api: Api, params: Row) => getYarnMaster(api, 'yarnother', params);
/** GET /api/yarntypesubitem (legacy fetchyarntype). */
export const getYarnTypeSubItem = (api: Api, params: Row) => getYarnMaster(api, 'yarntypesubitem', params);

/** GET /api/getitem (legacy fetchItemdata). */
export const getItems = (api: Api, params: Row) => get(api, 'getitem', params);

/** GET /api/getyarnmasteritem (legacy fetchbrowse — main list, and fetchmitem — sub item form). */
export const getYarnMasterItems = (api: Api, params: Row) => get(api, 'getyarnmasteritem', params);

/** GET /api/accountbasic (legacy fetchpartydata). */
export const getParties = (api: Api, params: Row) => get(api, 'accountbasic', params);

/** GET /api/yarnitemshow — one main / sub item (legacy handleModifyItem, handleOpenSubItemForm, handleSubItemModifyShow). */
export const getYarnItemShow = (api: Api, params: Row) => get(api, 'yarnitemshow', params);

/** GET /api/yarnwbrowse — sub items of a main item (legacy fetchSubItemList, fetchbrowsedata). */
export const getYarnSubItems = (api: Api, params: Row) => get(api, 'yarnwbrowse', params);

/** POST /api/yarnadd — create a Spun / Filament main item. */
export const postYarnAdd = (api: Api, body: Row) => post(api, 'yarnadd', body);

/** POST /api/yarncreationmodify — modify a main item or a sub item. */
export const postYarnCreationModify = (api: Api, body: Row) => post(api, 'yarncreationmodify', body);

/** POST /api/addyarnsubitem — create a sub item. */
export const postAddYarnSubItem = (api: Api, body: Row) => post(api, 'addyarnsubitem', body);

/** POST /api/yarnitemdelete — delete a main / sub item. */
export const postYarnItemDelete = (api: Api, body: Row) => post(api, 'yarnitemdelete', body);

/** POST /api/yarnitemd1add — map a party item name to a sub item. */
export const postYarnItemD1Add = (api: Api, body: Row) => post(api, 'yarnitemd1add', body);

/** GET /api/yarnitemd1browse — party item names mapped to a sub item. */
export const getYarnItemD1Browse = (api: Api, params: Row) => get(api, 'yarnitemd1browse', params);
