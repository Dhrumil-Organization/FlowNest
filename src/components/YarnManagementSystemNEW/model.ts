// FILE: src/components/YarnManagementSystemNEW/model.ts
// Pure rules of the legacy Yarn Management System (components/YarnManagementSystem/index.tsx):
// yarn code / name composition, denier formulas, validations, request payload builders and
// the yarnitemshow → form mapping helpers. Every expression is copied from legacy; the legacy
// function name is given next to each helper so it can be reviewed side by side.

export type Row = Record<string, any>;
export type YarnTab = 'Spun' | 'Filaments';
export type Screen = 'LIST' | 'SPUN_FORM' | 'FILAMENT_FORM' | 'SUB_ITEM' | 'BROWSE' | 'PARTY';
export type SubItemTab = 'LIST' | 'CREATE';
export type DeleteTargetType = 'MAIN' | 'SUB';
export type DeleteResultType = 'SUCCESS' | 'PERMISSION' | 'ERROR';
export type BlendRow = { id: string; name: string; per: string };

export const TXN = 'yarn_creation_item_master';

/* ------------------------------------------------------------------ */
/* Empty forms (legacy useState initial values / reset objects)        */
/* ------------------------------------------------------------------ */

export const emptySpunForm = (): Row => ({
  blend: '',
  count: '',
  ply: '',
  linkitmcode: '',
  denier: '',
  blend_id: '',
  count_id: '',
  ply_id: '',
  ItmCode: '',
  count_no: '',
  others: '',
});

export const emptyFilamentForm = (): Row => ({
  blend: '',
  count: '',
  ply: '',
  linkitmcode: '',
  denier: '',
  blend_id: '',
  count_id: '',
  ply_id: '',
  ItmCode: '',
  type_id: '',
  type: '',
  lustre_id: '',
  lustre: '',
  other_id: '',
  name: '',
  count_no: '',
  others: '',
});

export const emptySubItemForm = (): Row => ({
  blend: '',
  count: '',
  ply: '',
  linkitmcode: '',
  denier: '',
  blend_id: '',
  count_id: '',
  ply_id: '',
  ItmCode: '',
  type_id: '',
  type: '',
  lustre_id: '',
  lustre: '',
  other_id: '',
  name: '',
  Per: '',
  mitmcode: '',
  WBlend: '',
  WYarnType: '',
  WNameCode: '',
  others: '',
  subtype_id: '',
  subtype_name: '',
  count_no: '',
});

export const emptyPartyForm = (): Row => ({ accountname: '', acccode: '', ItemName: '' });

/* ------------------------------------------------------------------ */
/* Input masks                                                         */
/* ------------------------------------------------------------------ */

/** Count text box (Spun / Filament): digits only. */
export const COUNT_REGEX = /^[0-9]*$/;
/** Denier text box (Spun / Filament): decimal number. */
export const DENIER_REGEX = /^[0-9]*\.?[0-9]*$/;

/* ------------------------------------------------------------------ */
/* Code / name composition                                             */
/* ------------------------------------------------------------------ */

/** legacy buildMainItem — SPUN main item name: "<count>/<ply> <count type> <blend names> <other>". */
export const buildMainItem = (values: Row): string => {
  const { count_no, count, ply, blend, others } = values;

  if (!count_no || !count || !ply || !blend) return '';

  let blendStr: any = '';

  if (Array.isArray(blend)) {
    blendStr = blend
      .map((b: any) => (typeof b === 'object' ? b?.name : b))
      .filter(Boolean)
      .join(' ');
  } else if (typeof blend === 'object') {
    blendStr = blend?.name || '';
  } else {
    blendStr = blend;
  }

  return [`${count_no}/${ply}`, count, blendStr, others]
    .filter((val) => val && val.toString().trim() !== '')
    .join(' ');
};

/** legacy filamentbuildMainItem — FILAMENT main item name: "<count>/<ply> <count type> <lustre> <type> <other>". */
export const filamentbuildMainItem = (values: Row): string => {
  const { count_no, count, ply, lustre, type, others } = values;

  if (!count_no || !count || !ply || !lustre || !type) return '';

  return `${count_no}/${ply} ${count} ${lustre} ${type} ${others || ''}`.trim();
};

/** legacy getTotalPercentage. */
export const getTotalPercentage = (list: BlendRow[]): number =>
  list.reduce((sum, item) => sum + Number(item.per || 0), 0);

/** legacy buildSubItem — SUB item name: "<count>/<ply> <blend name per%> … <other>", only when the blend total is 100. */
export const buildSubItem = (values: Row, blendList: BlendRow[]): string => {
  const { count_no, ply, others } = values;

  if (!count_no || !ply) return '';

  const total = blendList.reduce((sum, item) => sum + Number(item.per || 0), 0);

  if (blendList.length > 0 && total !== 100) {
    return '';
  }

  let blendPart = '';

  if (blendList?.length > 0) {
    blendPart = blendList.map((b) => `${b.name}${b.per ? ` ${b.per}%` : ''}`).join(' ');
  }

  return `${count_no}/${ply} ${blendPart} ${others || ''}`.trim();
};

/* ------------------------------------------------------------------ */
/* Denier                                                              */
/* ------------------------------------------------------------------ */

/** Evaluates the count-type formula exactly as legacy did (`eval` of the formula text
 *  after replacing the words `Count` and `ply`). */
const evalFormula = (formula: string, count: number, ply: number): any => {
  const expr = formula.replace(/Count/g, String(count)).replace(/ply/g, String(ply));
  // eslint-disable-next-line no-eval
  return eval(expr);
};

/** legacy roundDenier — always round UP to the nearest 5. */
export const roundDenier = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  return String(Math.ceil(value / 5) * 5);
};

/** legacy calculateDenier (SPUN): formula of the selected count type, rounded up to 5. */
export const calculateDenier = (values: Row, formula: any): string => {
  const count = parseFloat(values.count_no);
  const ply = parseFloat(values.ply);

  if (!count || !ply || !formula) return '';

  try {
    const result = evalFormula(formula, count, ply);
    return roundDenier(Number(result));
  } catch (e) {
    console.log('Formula error:', e);
    return '';
  }
};

/** legacy calculatefilamentDenier (FILAMENT): formula result with 2 decimals (no rounding to 5).
 *  Display fix: legacy returned the text "NaN" when the selected count type had an empty /
 *  non-numeric formula; '' is returned instead. */
export const calculatefilamentDenier = (values: Row, formula: any): string => {
  const count = Number(values.count_no);
  const ply = Number(values.ply);
  if (!count || !ply) return '';

  try {
    const result = evalFormula(formula, count, ply);
    const num = Number(result);
    if (Number.isNaN(num)) return '';
    return num.toFixed(2);
  } catch (e) {
    console.log('Formula error:', e);
    return '';
  }
};

/** legacy calculateSubitemDenier (SUB ITEM): formula restored on the form, else the count master
 *  formula (by WCounttype / count_id, else by count type name); rounded up to 5. */
export const calculateSubitemDenier = (values: Row, countdata: Row[]): string => {
  const count = Number(values.count_no);
  const ply = Number(values.ply);

  if (!count || !ply) return '';

  const countType =
    countdata?.find((ct) => String(ct?.id ?? '') === String(values?.WCounttype ?? values?.count_id ?? '')) ||
    countdata?.find((ct) => String(ct?.name ?? '') === String(values?.count ?? ''));

  const formula = String(values?.formula || countType?.formula || '').trim();

  if (!formula) return '';

  try {
    const result = evalFormula(formula, count, ply);
    return roundDenier(Number(result));
  } catch (error) {
    console.log('Sub Item Formula Error:', error);
    return '';
  }
};

/* ------------------------------------------------------------------ */
/* Validations (message text = legacy alert text; title is "Validation") */
/* ------------------------------------------------------------------ */

/** legacy validateSpunForm. */
export const validateSpunForm = (spunForm: Row): string | null => {
  if (!spunForm.blend_id) return 'Please select Blend';
  if (!spunForm.count_no) return 'Please Enter Count Value';
  if (!spunForm.count_id) return 'Please select Count';
  if (!spunForm.ply_id) return 'Please select Ply';
  return null;
};

/** legacy validateFilamentForm. */
export const validateFilamentForm = (filamentForm: Row): string | null => {
  if (!filamentForm.blend_id) return 'Please select Blend';
  if (!filamentForm.count_id) return 'Please select Count Type';
  if (!filamentForm.count_no) return 'Please enter Count value';
  if (!filamentForm.ply_id) return 'Please select Ply';
  if (!filamentForm.type_id) return 'Please Filament select Type';
  if (!filamentForm.lustre_id) return 'Please select Lustre';
  return null;
};

/** legacy subitemvalidate — returns the alert message, or null when valid. */
export const validateSubItem = (subitemform: Row, blendList: BlendRow[]): string | null => {
  if (!subitemform.WNameCode) return 'Yarn Main Code required';

  if (!blendList || blendList.length === 0) return 'Please select blend';

  let total = 0;

  for (let i = 0; i < blendList.length; i++) {
    const per = Number(blendList[i].per);

    if (!per || per <= 0) return `Enter valid % for ${blendList[i].name}`;

    total += per;
  }

  if (total !== 100) return `Total percentage must be 100. Current: ${total}`;

  if (!subitemform.count_no) return 'Please enter count value';
  if (!subitemform.ply_id) return 'Please select Ply';
  if (!subitemform.subtype_id) return 'Please enter yarn type';
  if (!subitemform.linkitmcode) return 'Please enter Sub Item Name';

  return null;
};

/** legacy partyitemvalidation. */
export const validatePartyItem = (partyForm: Row): string | null => {
  if (!partyForm.acccode) return 'Party Can not be blank';
  if (!partyForm.ItemName) return 'Please enter Item value';
  return null;
};

/* ------------------------------------------------------------------ */
/* Request params / payloads (key order = legacy)                      */
/* ------------------------------------------------------------------ */

const yarnTypeOf = (tab: any) => (tab == 'Spun' ? '1' : '2');

/** legacy getCurrentFinancialYear — two-digit closing year of the running financial year. */
export const getCurrentFinancialYear = (): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
  return financialYear.toString().substring(2);
};

/** POST getyarndefault body. */
export const defaultPayload = (userPtype: any): Row => ({ prptype: userPtype, return_json_data: '1' });

/** yarnblend / yarncount / yarnply / yarntype / yarnlustre / yarnother / yarntypesubitem params. */
export const masterParams = (userPtype: any, activeTab: YarnTab): Row => ({
  prptype: userPtype,
  category: yarnTypeOf(activeTab),
  txntype: TXN,
});

/** getyarnmasteritem params used by legacy fetchmitem (sub item form). */
export const masterItemParams = (userPtype: any, yarnstrcode: any, activeTab: YarnTab): Row => ({
  prptype: userPtype,
  strcode: yarnstrcode,
  yarntype: yarnTypeOf(activeTab),
  txntype: TXN,
});

/** getyarnmasteritem params used by legacy fetchbrowse (main list). Store falls back to '002'. */
export const mainListParams = (userPtype: any, yarnstrcode: any, tabValue: YarnTab): Row => ({
  prptype: userPtype,
  strcode: yarnstrcode || '002',
  txntype: TXN,
  yarntype: yarnTypeOf(tabValue),
});

/** getitem params (legacy fetchItemdata — yearno is the literal "27"). */
export const itemParams = (userPtype: any, values: Row): Row => ({
  strcode: values.yarnstrcode,
  prptype: userPtype,
  prpcode: values.prpcode,
  yearno: '27',
});

/** accountbasic params (legacy fetchpartydata). */
export const partyParams = (userPtype: any, values: Row): Row => ({
  prpcode: values.prpcode,
  prptype: userPtype,
  yearno: values.yearno || getCurrentFinancialYear(),
  strcode: values.yarnstrcode,
  txntype: TXN,
  partytype: 'p',
  type: 'P',
  page: '',
  limit: '',
  search: '',
  isceo: '',
  partype: '',
  grntype: '',
  parcode: '',
  fetch: '',
  acccode: '',
  billdate: '',
  strtype: '',
  isfaint: '',
});

/** yarnitemshow params. */
export const showParams = (itmcode: any, strcode: any, userPtype: any): Row => ({
  itmcode,
  strcode,
  prptype: userPtype,
});

/** legacy fetchSubItemList prptype: the row's own property type, else the user's. */
export const rowPrpType = (item: Row | null | undefined, userPtype: any): any =>
  item?.prptype ?? item?.PrpType ?? item?.PRPTYPE ?? item?.WPrpType ?? userPtype;

/** yarnwbrowse params of the Sub Item list (legacy fetchSubItemList). */
export const subListParams = (item: Row, userPtype: any): Row => ({
  txntype: TXN,
  mitmcode: item.itmcode,
  prptype: rowPrpType(item, userPtype),
});

/** yarnwbrowse params of the Browse screen (legacy fetchbrowsedata). */
export const browseSubParams = (item: Row, userPtype: any): Row => ({
  prptype: userPtype,
  mitmcode: item.itmcode,
  txntype: TXN,
});

/** yarnitemd1browse params (legacy fetchpartybrowse). */
export const partyBrowseParams = (itmcode: any, userPtype: any, yarnstrcode: any, tabValue: YarnTab): Row => ({
  itmcode: itmcode,
  prptype: userPtype,
  strcode: yarnstrcode,
  txntype: TXN,
  yarntype: yarnTypeOf(tabValue),
  prpcode: 'SIP',
});

const joinBlend = (blend_id: any) => (Array.isArray(blend_id) ? blend_id.join('/') : blend_id || '');

/** POST yarnadd / yarncreationmodify body for a SPUN main item (legacy handleaddspun). */
export const spunPayload = (
  spunForm: Row,
  userPtype: any,
  activeTab: YarnTab,
  yarnstrcode: any,
  isModifyMode: boolean,
): Row => ({
  maincode: spunForm.linkitmcode,
  denier: spunForm.denier,
  blend: joinBlend(spunForm.blend_id),
  counttype: spunForm.count_id,
  ply: spunForm.ply_id,
  linkitmcode: spunForm.ItmCode || '',
  prptype: userPtype,
  txntype: TXN,
  yarntype: yarnTypeOf(activeTab),
  strcode: yarnstrcode,
  count: spunForm.count_no,
  other: spunForm.others,
  ...(isModifyMode ? { itmcode: spunForm.ItmCode || '' } : {}),
});

/** POST yarnadd / yarncreationmodify body for a FILAMENT main item (legacy handleaddfilament). */
export const filamentPayload = (
  filamentForm: Row,
  userPtype: any,
  activeTab: YarnTab,
  yarnstrcode: any,
  isModifyMode: boolean,
): Row => ({
  maincode: filamentForm.linkitmcode,
  denier: filamentForm.denier,
  blend: joinBlend(filamentForm.blend_id),
  counttype: filamentForm.count_id,
  ply: filamentForm.ply_id,
  linkitmcode: filamentForm.ItmCode || '',
  other: filamentForm.others,
  lustre: filamentForm.lustre_id,
  type: filamentForm.type_id,
  prptype: userPtype,
  txntype: TXN,
  yarntype: yarnTypeOf(activeTab),
  strcode: yarnstrcode,
  count: filamentForm.count_no,
  ...(isModifyMode ? { itmcode: filamentForm.ItmCode || '' } : {}),
});

const blendNames = (blendList: BlendRow[]) =>
  [...blendList].map((b) => ({
    id: b.id,
    name: b.name,
    per: Number(b.per || 0),
  }));

/** POST addyarnsubitem body (legacy handlesubitemadd). */
export const subItemAddPayload = (subitemform: Row, blendList: BlendRow[], userPtype: any, yarnstrcode: any): Row => ({
  maincode: subitemform.linkitmcode,
  denier: subitemform.denier,
  blendid: subitemform.WBlend,
  count: subitemform.count_no,
  ply: subitemform.ply_id,
  mitmcode: subitemform.mitmcode || '',
  blend_names: blendNames(blendList),
  prptype: userPtype,
  txntype: TXN,
  yarntype: subitemform.WYarnType,
  strcode: yarnstrcode,
  linkitmcode: subitemform.ItmCode || '',
  other: subitemform.others || '',
  subyarntype: subitemform.subtype_id || '',
});

/** POST yarncreationmodify body for a SUB item (legacy handleModifySubItem — txntype is 'SUBITEM'). */
export const subItemModifyPayload = (
  subitemform: Row,
  blendList: BlendRow[],
  userPtype: any,
  yarnstrcode: any,
): Row => ({
  maincode: subitemform.linkitmcode,
  denier: subitemform.denier,
  blend: joinBlend(subitemform.blend_id),
  count: subitemform.count_no,
  ply: subitemform.ply_id,
  mitmcode: subitemform.mitmcode || '',
  blend_names: blendNames(blendList),
  prptype: userPtype,
  txntype: 'SUBITEM',
  yarntype: subitemform.WYarnType,
  strcode: yarnstrcode,
  linkitmcode: subitemform.ItmCode || '',
  other: subitemform.others || '',
  subyarntype: subitemform.subtype_id || '',
  itmcode: subitemform.ItmCode || '',
});

/** POST yarnitemd1add body (legacy handleaddparty). */
export const partyAddPayload = (
  partyForm: Row,
  selectedBrowseItem: Row | null,
  userPtype: any,
  subitemform: Row,
  yarnstrcode: any,
): Row => ({
  prptype: userPtype,
  parcode: partyForm.acccode,
  parname: partyForm.accountname,
  itmcode: selectedBrowseItem?.itmcode,
  itmname: partyForm.ItemName,
  txntype: TXN,
  yarntype: subitemform.WYarnType,
  strcode: yarnstrcode,
});

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

/** legacy confirmDeleteItem item code: a SUB row always uses its own itmcode. */
export const deleteItemCode = (deleteTarget: Row | null, deleteTargetType: DeleteTargetType): any =>
  deleteTargetType === 'SUB'
    ? deleteTarget?.itmcode || ''
    : deleteTarget?.itmcode || deleteTarget?.mitmcode || deleteTarget?.ItmCode || '';

/** POST yarnitemdelete body. */
export const deletePayload = (deleteTarget: Row | null, itemCode: any, userPtype: any, yarnstrcode: any): Row => ({
  prptype: rowPrpType(deleteTarget, userPtype),
  itmcode: itemCode,
  strcode: yarnstrcode || '',
  txntype: TXN,
});

/** legacy yarnitemdelete response reading: success:true alone is NOT a delete — the API status
 *  must be 'P' or the message must clearly say the record was deleted. */
export const readDeleteResponse = (body: any): { message: string; isDeleteSuccess: boolean } => {
  const responseData = body || {};
  const responseObject = responseData?.response || responseData?.data?.response || {};
  const message =
    responseObject?.message || responseData?.message || responseData?.data?.message || 'Delete response received.';

  const normalizedMessage = String(message).trim().toLowerCase();
  const responseStatus = String(responseObject?.status ?? '').trim().toUpperCase();

  const hasExplicitDeleteSuccessMessage =
    normalizedMessage.includes('delete successful') ||
    normalizedMessage.includes('deleted successfully') ||
    normalizedMessage.includes('delete successfully') ||
    normalizedMessage.includes('successfully deleted');

  const isDeleteSuccess =
    responseData?.success === true && (responseStatus === 'P' || hasExplicitDeleteSuccessMessage);

  return { message: String(message), isDeleteSuccess };
};

/** Names shown in the delete confirmation (legacy YarnDeletePermissionModal). */
export const deleteItemName = (item: Row | null): string =>
  item?.WNameCode || item?.itmname || item?.ItmName || 'Selected Item';

export const deleteItemCodeLabel = (item: Row | null, itemType: DeleteTargetType): string =>
  item?.itmcode || (itemType === 'SUB' ? '' : item?.mitmcode || item?.ItmCode) || '-';

/* ------------------------------------------------------------------ */
/* yarnitemshow → form helpers                                         */
/* ------------------------------------------------------------------ */

/** legacy findByIdOrName (handleModifyItem). */
export const findByIdOrName = (list: Row[] | null | undefined, value: any, keys: string[] = ['id', 'name']): Row | null => {
  if (!value && value !== 0) return null;

  const stringValue = String(value);
  return (list || []).find((obj) => keys.some((key) => String(obj?.[key] ?? '') === stringValue)) || null;
};

/** legacy findPly (handleModifyItem): by ply value, else by id. */
export const findPly = (plydata: Row[] | null | undefined, value: any): Row | null => {
  if (!value && value !== 0) return null;
  const stringValue = String(value);
  return (
    (plydata || []).find(
      (obj) => String(obj?.ply ?? '') === stringValue || String(obj?.id ?? '') === stringValue,
    ) || null
  );
};

/** legacy handleModifyItem: count / ply are the two leading parts of maincode "67/7 Wors …". */
export const splitMainCode = (maincode: any): { countNo: string; plyValue: string } => {
  const mainCodeParts = String(maincode || '').trim().match(/^([^/\s]+)\/([^\s]+)\s+(.*)$/);
  return { countNo: mainCodeParts?.[1] || '', plyValue: mainCodeParts?.[2] || '' };
};

/** legacy handleModifyItem: BlendDisplay rows when the API sends them, else the "11/10" id list
 *  of `blend`, each matched against the loaded blend master. */
export const mainBlendItems = (mainItem: Row, blenddata: Row[]): Row[] => {
  const apiBlendDisplay = Array.isArray(mainItem?.BlendDisplay) ? mainItem.BlendDisplay : [];

  let blendItems: Row[] = apiBlendDisplay
    .map((b: Row) => ({
      ...b,
      id: b?.id ?? b?.blendid ?? b?.code,
      name: b?.name ?? b?.blend ?? b?.BlendName ?? '',
    }))
    .filter((b: Row) => b.id !== undefined && b.id !== null);

  if (blendItems.length === 0 && mainItem?.blend) {
    const blendIds = String(mainItem.blend)
      .split(/[\/,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    blendItems = blendIds.map((id) => findByIdOrName(blenddata, id) || { id, name: id });
  } else {
    blendItems = blendItems.map((apiBlend) => findByIdOrName(blenddata, apiBlend.id) || apiBlend);
  }

  return blendItems;
};

/** legacy sub item forms: BlendDisplay → blend rows with their percentages. */
export const subBlendRows = (showItem: Row): BlendRow[] =>
  Array.isArray(showItem?.BlendDisplay)
    ? showItem.BlendDisplay.map((blend: Row) => ({
        id: String(blend?.id ?? ''),
        name: blend?.name || '',
        per: String(blend?.per ?? ''),
      })).filter((blend: BlendRow) => blend.name)
    : [];

/** legacy sub item forms: WPly → ply master row (by ply, else id), else a plain {id, ply}. */
export const subPlySelection = (plydata: Row[], apiPly: string): any => {
  const matchedPly =
    (plydata || []).find((p) => String(p?.ply ?? '') === apiPly) ||
    (plydata || []).find((p) => String(p?.id ?? '') === apiPly);
  return matchedPly || (apiPly ? { id: apiPly, ply: apiPly } : []);
};

/* ------------------------------------------------------------------ */
/* Main list search                                                    */
/* ------------------------------------------------------------------ */

/** legacy getSearchVariants — "28/2" also matches "2/28". */
export const getSearchVariants = (value: any): string[] => {
  const text = String(value ?? '').toLowerCase().trim();

  if (!text) return [];

  const variants = [text];

  const slashPattern = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g;

  let match;

  while ((match = slashPattern.exec(text)) !== null) {
    const first = match[1];
    const second = match[2];

    const original = `${first}/${second}`;
    const reversed = `${second}/${first}`;

    variants.push(text.replace(original, reversed));
  }

  return [...new Set(variants)];
};

/** legacy filteredData — every field of the row is searched. */
export const filterMainItems = (data: Row[], cardSearch: string): Row[] => {
  const search = cardSearch.trim().toLowerCase();

  if (!search) return data;

  return data.filter((item) => {
    const allValues = Object.values(item || {});

    return allValues.some((value) => {
      const variants = getSearchVariants(value);

      return variants.some((text) => text.includes(search));
    });
  });
};

/** Text of a picker row / selected value: the legacy dropdown joined its label keys with " • ". */
export const labelOf = (item: Row | null | undefined, keys: string[]): string =>
  item ? keys.map((k) => String(item[k] ?? '')).filter(Boolean).join(' • ') : '';

/* ------------------------------------------------------------------ */
/* yarnitemshow → form objects                                         */
/* ------------------------------------------------------------------ */

/** legacy handleModifyItem: Count Type id / name of a main item (never the Count value). */
export const mainCountType = (mainItem: Row): { countTypeId: string; countTypeName: string } => ({
  countTypeId: String(mainItem?.counttype ?? mainItem?.CountTypeId ?? mainItem?.WCounttype ?? ''),
  countTypeName: String(mainItem?.CountType ?? mainItem?.counttypeName ?? ''),
});

/** legacy handleModifyItem: count master row by id, else by name. */
export const findCountType = (countMasterData: Row[], countTypeId: string, countTypeName: string): Row | null =>
  findByIdOrName(countMasterData, countTypeId) || findByIdOrName(countMasterData, countTypeName);

/** legacy handleModifyItem `baseForm`: the fields shared by the Spun and Filament modify forms.
 *  count_no = the Count value (API `count`, else the leading part of maincode);
 *  count / count_id / formula = the Count Type master row (fallback: the API id / name);
 *  ply / ply_id = the ply master row matched with the ply part of maincode (fallback: that text). */
export const mainBaseForm = (
  mainItem: Row,
  itmcode: any,
  blendItems: Row[],
  matchedCountObj: Row | null,
  plydata: Row[],
): Row => {
  const { countNo, plyValue } = splitMainCode(mainItem?.maincode);
  const { countTypeId, countTypeName } = mainCountType(mainItem);
  const countValue = String(mainItem?.count ?? '');
  const otherValue = mainItem?.other || '';

  const selectedCountObj = matchedCountObj || {
    id: countTypeId,
    name: countTypeName || countTypeId,
    formula: '',
  };

  const selectedPlyObj = findPly(plydata, plyValue) || {
    id: plyValue,
    ply: plyValue,
  };

  return {
    ItmCode: String(mainItem?.itmcode || itmcode),
    linkitmcode: mainItem?.maincode || '',
    denier: mainItem?.denier || '',
    count_no: countValue || countNo,
    count: selectedCountObj?.name || countTypeName,
    count_id: selectedCountObj?.id || countTypeId,
    formula: selectedCountObj?.formula || '',
    ply: selectedPlyObj?.ply || plyValue,
    ply_id: selectedPlyObj?.id || '',
    blend: blendItems.map((b) => b?.name).filter(Boolean),
    blend_id: blendItems.map((b) => b?.id).filter(Boolean),
    others: otherValue,
  };
};

/** legacy handleModifyItem (Filament branch): Type / Lustre matched by id or text, plus the
 *  fields the filament form resets. */
export const filamentShowFields = (mainItem: Row, typedata: Row[], lustredata: Row[]): Row => {
  const selectedTypeObj =
    findByIdOrName(typedata, mainItem?.Type, ['id', 'type']) ||
    (mainItem?.Type ? { id: mainItem.Type, type: mainItem.Type } : null);

  const selectedLustreObj =
    findByIdOrName(lustredata, mainItem?.Lustre, ['id', 'lustre']) ||
    (mainItem?.Lustre ? { id: mainItem.Lustre, lustre: mainItem.Lustre } : null);

  return {
    type_id: selectedTypeObj?.id || '',
    type: selectedTypeObj?.type || mainItem?.Type || '',
    lustre_id: selectedLustreObj?.id || '',
    lustre: selectedLustreObj?.lustre || mainItem?.Lustre || '',
    other_id: '',
    name: '',
    others: mainItem?.other || '',
  };
};

/** legacy handleOpenSubItemForm ("Create New Sub Item"): blend rows + form values from the MAIN
 *  item's yarnitemshow row. Blend rows come from BlendDisplay; when it is empty, from the
 *  getyarnmasteritem mapped_data row of the same blend id + main item (a single blend gets 100%). */
export const subFormFromMainShow = (args: {
  showItem: Row;
  parentItem: Row;
  mainCode: any;
  mapped: Row[] | undefined;
  countMasterList: Row[];
  plydata: Row[];
}): { blendList: BlendRow[]; values: Row } => {
  const { showItem, parentItem, mainCode, mapped, countMasterList, plydata } = args;

  const apiBlendList = subBlendRows(showItem);

  const selectedBlendId = String(showItem?.blend ?? parentItem?.WBlend ?? '');

  // CountTypeId is the count master id — restores the formula used by the denier rule.
  const selectedCountId = String(showItem?.CountTypeId ?? parentItem?.WCounttype ?? '');

  const selectedCountObj =
    countMasterList.find((ct) => String(ct?.id ?? '') === selectedCountId) ||
    countMasterList.find((ct) => String(ct?.name ?? '') === String(showItem?.CountType ?? '')) ||
    null;

  const selectedCountFormula = selectedCountObj?.formula || '';

  const blendObj = (mapped || []).find(
    (b) => String(b.blendid) === selectedBlendId && String(b.itmcode) === String(mainCode),
  );

  let fallbackBlendList: BlendRow[] = [];
  if (blendObj?.blend_names?.length > 0) {
    fallbackBlendList = (blendObj as Row).blend_names.map((b: Row) => ({
      id: String(b.id ?? ''),
      name: b.name || '',
      per: '',
    }));

    if (fallbackBlendList.length === 1) {
      fallbackBlendList[0].per = '100';
    }
  }

  const blendList = apiBlendList.length > 0 ? apiBlendList : fallbackBlendList;

  const apiPly = String(showItem?.WPly ?? '');
  const selectedPly = subPlySelection(plydata, apiPly);

  const apiSubTypeId = String(showItem?.subyarntype ?? '');
  const apiSubTypeName = String(showItem?.subyarntypename ?? '');

  return {
    blendList,
    values: {
      WNameCode: showItem?.itmname || parentItem?.WNameCode || '',
      WBlend: selectedBlendId,
      WYarnType: parentItem?.WYarnType || '',
      mitmcode: mainCode,
      WCounttype: selectedCountId,
      ItmCode: mainCode,
      linkitmcode: showItem?.maincode || '',
      denier: String(showItem?.denier ?? ''),
      formula: selectedCountFormula,
      blend: blendList.map((blend) => blend.name),
      blend_id: blendList.map((blend) => blend.id),
      count: String(showItem?.CountType ?? showItem?.count ?? ''),
      count_no: String(showItem?.count ?? ''),
      count_id: selectedCountId,
      ply: apiPly,
      ply_id: selectedPly?.id ? String(selectedPly.id) : apiPly,
      subtype_id: apiSubTypeId,
      subtype_name: apiSubTypeName,
      others: showItem?.other ?? '',
      name: showItem?.itmname || '',
    },
  };
};

/** legacy handleSubItemModifyShow: Count Type id / name of a sub item. */
export const subCountType = (showItem: Row): { apiCountTypeId: string; apiCountTypeName: string } => ({
  apiCountTypeId: String(showItem?.CountTypeId ?? showItem?.WCounttype ?? showItem?.counttype ?? ''),
  apiCountTypeName: String(showItem?.CountType ?? showItem?.counttypeName ?? ''),
});

/** legacy handleSubItemModifyShow: count master row by id, by name, and (first pass only) by the
 *  count value. */
export const matchSubCountType = (
  countMasterList: Row[],
  apiCountTypeId: string,
  apiCountTypeName: string,
  byCount?: { count: any },
): Row | null =>
  countMasterList.find((ct) => String(ct?.id ?? '') === apiCountTypeId) ||
  countMasterList.find((ct) => String(ct?.name ?? '') === apiCountTypeName) ||
  (byCount ? countMasterList.find((ct) => String(ct?.name ?? '') === String(byCount.count ?? '')) : undefined) ||
  null;

/** legacy handleSubItemModifyShow: blend rows + the form updater from the SUB item's
 *  yarnitemshow row (`parent` = main item of the list, `item` = the tapped list row). */
export const subFormFromSubShow = (args: {
  showItem: Row;
  item: Row | null;
  parent: Row | null;
  itmcode: any;
  matchedCountType: Row | null;
  plydata: Row[];
}): { blendList: BlendRow[]; update: (prev: Row) => Row } => {
  const { showItem, item, parent, itmcode, matchedCountType, plydata } = args;

  const blendList = subBlendRows(showItem);

  const apiPly = String(showItem?.WPly ?? '');
  const selectedPly = subPlySelection(plydata, apiPly);

  const { apiCountTypeId, apiCountTypeName } = subCountType(showItem);
  const restoredCountTypeId = String(matchedCountType?.id ?? apiCountTypeId ?? '');
  const restoredCountTypeName = String(matchedCountType?.name ?? apiCountTypeName ?? apiCountTypeId ?? '');
  const restoredCountFormula = String(matchedCountType?.formula ?? showItem?.formula ?? '');

  const apiSubTypeId = String(showItem?.subyarntype ?? '');
  const apiSubTypeName = String(showItem?.subyarntypename ?? '');

  return {
    blendList,
    update: (prev: Row) => ({
      ...prev,
      WNameCode: parent?.WNameCode || showItem?.itmname || '',
      WBlend: showItem?.blend ?? '',
      WYarnType: parent?.WYarnType || item?.WYarnType || prev.WYarnType || '',
      mitmcode: parent?.itmcode || item?.mitmcode || prev.mitmcode || '',
      ItmCode: String(showItem?.itmcode || itmcode),
      linkitmcode: showItem?.maincode || '',
      denier: String(showItem?.denier ?? ''),
      formula: restoredCountFormula,
      WCounttype: restoredCountTypeId,
      blend: blendList.map((blend) => blend.name),
      blend_id: blendList.map((blend) => blend.id),
      // count = Count Type NAME; count_no = the numeric Count.
      count: restoredCountTypeName,
      count_no: String(showItem?.count ?? ''),
      count_id: restoredCountTypeId,
      ply: apiPly,
      ply_id: selectedPly?.id ? String(selectedPly.id) : apiPly,
      subtype_id: apiSubTypeId,
      subtype_name: apiSubTypeName,
      others: showItem?.other ?? '',
      name: showItem?.itmname || '',
    }),
  };
};
