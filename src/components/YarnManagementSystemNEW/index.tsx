// FILE: src/components/YarnManagementSystemNEW/index.tsx
// NEW ERP — Yarn Management System (yarn code standardisation).
// Replaces legacy components/YarnManagementSystem/index.tsx (+ CustomDrawer.tsx),
// legacy route app/(tabs)/yarn-management-system.tsx (passed token, username).
//
// Steps (legacy `currentScreen`, one rendered at a time, in-screen back row + Android back):
//   LIST           Spun / Filament tabs, "search all fields" (28/2 also matches 2/28), main item
//                  cards, ⋮ → Modify Main Item / Create Sub Item / Browse Item / Delete Item
//   SPUN_FORM      add / modify a Spun main item      (Blend*, Count Type*, Count*, Ply*, Other, Main Item*, Denier*)
//   FILAMENT_FORM  add / modify a Filament main item  (+ Filament Type*, Lustre*)
//   SUB_ITEM/LIST  sub items of the main item, ⋮ → Modify / Browse Item / Delete, "Create New Sub Item"
//   SUB_ITEM/CREATE create / modify a sub item (blend % rows + Yarn Type editable, rest read-only)
//   PARTY          party item-name mapping of a sub item (add + list)
//   BROWSE         legacy "Sub Item List → + party mapping" screen (kept; legacy only reaches it
//                  from its own code paths, see report)
//
// Endpoints (all `${API}/api/...`, Bearer token prop; payload builders in model.ts, calls in api.ts):
//   POST getyarndefault     { prptype, return_json_data:'1' }                 → data.main {prpcode, yarnstrcode, yearno}
//   GET  getyarnmasteritem  { prptype, strcode(|| '002'), txntype, yarntype } → data.data            (main list)
//   GET  getyarnmasteritem  { prptype, strcode, yarntype, txntype }           → data.data, data.mapped_data (sub item form)
//   GET  yarnblend | yarncount | yarnply | yarntype | yarnlustre | yarnother | yarntypesubitem
//                           { prptype, category:'1'|'2', txntype }            → data.data
//   GET  getitem            { strcode, prptype, prpcode, yearno:'27' }        → response.data
//   GET  accountbasic       { prpcode, prptype, yearno, strcode, txntype, partytype:'p', type:'P', …blanks } → response.data
//   GET  yarnitemshow       { itmcode, strcode, prptype }                     → data.maindata[0]
//   GET  yarnwbrowse        { txntype, mitmcode, prptype } (sub list) | { prptype, mitmcode, txntype } (browse) → data.maindata
//   POST yarnadd / yarncreationmodify  main item (modify adds itmcode)        → success, message, data.data.itmcode
//   POST addyarnsubitem / yarncreationmodify (txntype 'SUBITEM')  sub item    → success, message, data.data.itmcode
//   POST yarnitemdelete     { prptype, itmcode, strcode, txntype }            → success + response.{status,message}
//   POST yarnitemd1add      { prptype, parcode, parname, itmcode, itmname, txntype, yarntype, strcode }
//   GET  yarnitemd1browse   { itmcode, prptype, strcode, txntype, yarntype, prpcode:'SIP' } → data.maindata
//   GET  get_criterion      { fetch:'prptype', txntype }  — exists in api.ts only; legacy defined it
//                           (fetchPropertyGroup) but never called it.
// txntype is 'yarn_creation_item_master' everywhere except the sub item modify ('SUBITEM').
// AsyncStorage read: 'user_prptype' (before every call, as legacy).
//
// Call moments are the legacy ones: mount / tab change → getyarndefault then the main list;
// opening a main form → the seven form masters (once prpcode + yarnstrcode are known);
// "Create New Sub Item" → yarnitemshow, then getyarndefault + getyarnmasteritem + yarncount +
// yarnply + yarnother + yarntypesubitem together. State is read through plain render closures
// exactly like legacy, so the same values (including the '002' store fallback of the very first
// list load) are sent.
//
// Deliberate deviations (all presentation / platform):
//   • The bearer is the `token` prop (legacy also re-read AsyncStorage 'access_token' as a
//     fallback for a transiently empty prop; ErpSessionGate guarantees the prop here).
//   • No own header / status bar / gradients; legacy full-screen modes are in-component steps.
//   • Android hardware back is also handled on the main forms and BROWSE (legacy handled only
//     SUB_ITEM and PARTY).
//   • Legacy CustomDrawer (property / store / year drawer) is not ported: legacy never opens it
//     (openDrawer is never called), so it was dead UI.
//   • Delete confirmation can be dismissed with the sheet's close button / scrim (legacy had its
//     Cancel button commented out and could only be dismissed with Android back).
//   • Filament denier shows '' instead of the text "NaN" when the count type has no usable formula.
//   • The sub item list shows its skeleton during its own yarnwbrowse load too (legacy only
//     during the shared isLoading flag), and the add-sub-item OK handler no longer leaves the
//     shared isLoading flag raised (legacy left that list stuck on its skeleton after an add).
//
// Files: api.ts (calls) · model.ts (rules, payloads, yarnitemshow → form mapping) · masters.ts
// (defaults + master lists hook) · deleteFlow.tsx (delete hook + sheets) · MainList / MainItemForm /
// SubItemList / SubItemForm / PartyStep / DeleteSheets / ui (presentation).
import { AppAlert } from '@/common/utils/appAlert';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import {
  Api,
  getYarnItemD1Browse,
  getYarnItemShow,
  getYarnMasterItems,
  getYarnSubItems,
  postAddYarnSubItem,
  postYarnAdd,
  postYarnCreationModify,
  postYarnItemD1Add,
} from './api';
import { useYarnDelete } from './deleteFlow';
import MainItemForm from './MainItemForm';
import MainList from './MainList';
import { getPrpType, useYarnMasters } from './masters';
import {
  BlendRow,
  browseSubParams,
  emptyFilamentForm,
  emptyPartyForm,
  emptySpunForm,
  emptySubItemForm,
  filamentPayload,
  filamentShowFields,
  filterMainItems,
  findCountType,
  mainBaseForm,
  mainBlendItems,
  mainCountType,
  mainListParams,
  matchSubCountType,
  partyAddPayload,
  partyBrowseParams,
  Row,
  Screen,
  showParams,
  spunPayload,
  subCountType,
  subFormFromMainShow,
  subFormFromSubShow,
  subItemAddPayload,
  subItemModifyPayload,
  SubItemTab,
  subListParams,
  validateFilamentForm,
  validatePartyItem,
  validateSpunForm,
  validateSubItem,
  YarnTab,
} from './model';
import PartyStep from './PartyStep';
import SubItemForm from './SubItemForm';
import SubItemList from './SubItemList';
import { ActionSheet, y } from './ui';

type Props = { token: string; API: string; username?: string };

export default function YarnManagementSystemNEW({ token, API }: Props) {
  const api: Api = { API, token };

  /* ------------------------------- loaders ------------------------------- */
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mainItemFormLoading, setMainItemFormLoading] = useState(false);
  const [subItemFormLoading, setSubItemFormLoading] = useState(false);
  const [subItemListLoading, setSubItemListLoading] = useState(false);
  const [subItemSaveLoading, setSubItemSaveLoading] = useState(false);

  /* ------------------------------- forms ------------------------------- */
  const [spunForm, setSpunForm] = useState<Row>(emptySpunForm());
  const [filamentForm, setFilamentForm] = useState<Row>(emptyFilamentForm());
  const [subitemform, setsubitemform] = useState<Row>(emptySubItemForm());
  const [blendList, setBlendList] = useState<BlendRow[]>([{ id: '', name: '', per: '' }]);
  const [partyForm, setpartyForm] = useState<Row>(emptyPartyForm());
  const [selectedblend, setselectedblend] = useState<Row[]>([]);
  const [selectedfilamentblend, setselectedfilamentblend] = useState<Row[]>([]);

  /* ------------------------------- lists ------------------------------- */
  const [activeTab, setActiveTab] = useState<YarnTab>('Spun');
  const [data, setdata] = useState<Row[]>([]);
  const [browsedata, setbrowsedata] = useState<Row[]>([]);
  const [browserpartydata, setbrowserpartydata] = useState<Row[]>([]);

  /* ------------------------------- navigation ------------------------------- */
  const [currentScreen, setCurrentScreen] = useState<Screen>('LIST');
  const [subItemTab, setSubItemTab] = useState<SubItemTab>('LIST');
  const [subItemParent, setSubItemParent] = useState<Row | null>(null);
  const [browseParentItem, setBrowseParentItem] = useState<Row | null>(null);
  const [selectedBrowseItem, setSelectedBrowseItem] = useState<Row | null>(null);
  const [partyReturnToSubItemList, setPartyReturnToSubItemList] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [actionItem, setActionItem] = useState<Row | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [modifyItemName, setModifyItemName] = useState('');

  /* ------------------------------- defaults + masters ------------------------------- */
  const {
    FormState,
    blenddata,
    countdata,
    plydata,
    typedata,
    lustredata,
    subitemtypedata,
    partydata,
    soshow,
    fetchBlenddata,
    fetchBlendcount,
    fetchBlendply,
    fetchtype,
    fetchlustre,
    fetchOthresdata,
    fetchyarntype,
    fetchmitem,
    fetchItemdata,
    fetchpartydata,
  } = useYarnMasters(api, activeTab, setIsLoading);

  /* ------------------------------------------------------------------ */
  /* Lists                                                               */
  /* ------------------------------------------------------------------ */

  /** GET getyarnmasteritem — the main list of the given tab (legacy fetchbrowse). */
  const fetchbrowse = async (tabValue: YarnTab) => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getYarnMasterItems(api, mainListParams(userPtype, FormState.values.yarnstrcode, tabValue));

      const rows = body?.data?.data || [];
      if (body?.success && body?.data?.data?.length > 0) {
        setdata(rows);
      } else {
        setdata([]);
      }
    } catch (error) {
      console.log('API getyarnmasteritem error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  /** GET yarnwbrowse — sub items of the main item (legacy fetchSubItemList). */
  const fetchSubItemList = async (item: Row | null) => {
    if (!item?.itmcode) {
      AppAlert.alert('Error', 'Main item code not found.');
      setbrowsedata([]);
      setRefreshing(false);
      return;
    }

    const userPtype = await getPrpType();

    try {
      setSubItemListLoading(true);

      const body = await getYarnSubItems(api, subListParams(item, userPtype));

      const list = Array.isArray(body?.data?.maindata) ? body.data.maindata : [];

      setbrowsedata(list);
    } catch (error) {
      console.log('Sub Item yarnwbrowse error:', error);
      setbrowsedata([]);
    } finally {
      setSubItemListLoading(false);
      setRefreshing(false);
    }
  };

  /** GET yarnitemd1browse — party item names already mapped to a sub item (legacy fetchpartybrowse). */
  const fetchpartybrowse = async (tabValue: YarnTab, itmcode: any) => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getYarnItemD1Browse(
        api,
        partyBrowseParams(itmcode, userPtype, FormState.values.yarnstrcode, tabValue),
      );

      const rows = body?.data?.maindata || [];
      if (body?.success && body?.data?.maindata?.length > 0) {
        setbrowserpartydata(rows);
      } else {
        setbrowserpartydata([]);
      }
    } catch (error) {
      console.log('API yarnitemd1browse error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** GET yarnwbrowse — BROWSE step list (legacy fetchbrowsedata). */
  const fetchbrowsedata = async (item: Row) => {
    setBrowseParentItem(item);
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getYarnSubItems(api, browseSubParams(item, userPtype));

      const rows = Array.isArray(body?.data?.maindata) ? body.data.maindata : [];
      if (body?.success && body?.data?.maindata?.length > 0) {
        setbrowsedata(rows);
      } else {
        setbrowsedata([]);
      }
      setCurrentScreen('BROWSE');
    } catch (error) {
      console.log('API yarnwbrowse error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Delete (hook: confirmation → yarnitemdelete → result → refresh)      */
  /* ------------------------------------------------------------------ */

  const del = useYarnDelete({
    api,
    yarnstrcode: FormState.values.yarnstrcode,
    onDeleted: async (targetType) => {
      if (targetType === 'MAIN') {
        await fetchbrowse(activeTab);
      } else if (subItemParent?.itmcode) {
        await fetchSubItemList(subItemParent);
      }
    },
  });

  /* ------------------------------------------------------------------ */
  /* Resets / navigation                                                 */
  /* ------------------------------------------------------------------ */

  const closeActionMenu = () => {
    setShowActionMenu(false);
    setActionItem(null);
  };

  // ADD must always start from a clean form (legacy resetYarnForms).
  const resetYarnForms = () => {
    setSpunForm(emptySpunForm());
    setselectedblend([]);
    setFilamentForm(emptyFilamentForm());
    setselectedfilamentblend([]);
    setIsModifyMode(false);
  };

  const goToListScreen = () => {
    resetYarnForms();
    setCurrentScreen('LIST');
    setSubItemTab('LIST');
    setSubItemParent(null);
    setPartyReturnToSubItemList(false);
    closeActionMenu();
  };

  // Sub Item list exit: back to the main list and refresh it (legacy goToSubItemMainList).
  const goToSubItemMainList = () => {
    resetYarnForms();
    setCurrentScreen('LIST');
    setSubItemTab('LIST');
    setSubItemParent(null);
    closeActionMenu();
    fetchbrowse(activeTab);
  };

  // Back / Cancel on the Sub Item form: return to the Sub Item LIST and refresh it.
  const goBackFromSubItemForm = () => {
    closeActionMenu();
    setIsLoading(false);
    setSubItemFormLoading(false);
    setSubItemSaveLoading(false);
    setIsModifyMode(false);
    setSubItemTab('LIST');
    setCurrentScreen('SUB_ITEM');

    if (subItemParent?.itmcode) {
      fetchSubItemList(subItemParent);
    }
  };

  const goBackFromParty = () => {
    closeActionMenu();

    if (partyReturnToSubItemList) {
      // Return to the exact Sub Item LIST from which Browse Item was opened.
      setSubItemTab('LIST');
      setCurrentScreen('SUB_ITEM');

      if (subItemParent?.itmcode) {
        fetchSubItemList(subItemParent);
      }
    } else {
      setCurrentScreen('BROWSE');
    }
  };

  /* ------------------------------------------------------------------ */
  /* Main item: add / modify                                             */
  /* ------------------------------------------------------------------ */

  const handleAddClick = async () => {
    setCardSearch('');
    setModifyItemName('');

    // ADD must never inherit data from the previous MODIFY operation.
    resetYarnForms();

    await soshow();
    setIsModifyMode(false);
    setCurrentScreen(activeTab === 'Spun' ? 'SPUN_FORM' : 'FILAMENT_FORM');
  };

  /** Modify Main Item: GET yarnitemshow and map it into the Spun / Filament form. */
  const handleModifyItem = async (item: Row | null) => {
    closeActionMenu();

    setModifyItemName(String(item?.WNameCode || item?.itmname || item?.ItmName || item?.name || 'Selected Item'));

    const itmcode = item?.itmcode;
    const strcode = FormState.values.yarnstrcode;
    const userPtype = await getPrpType();

    if (!itmcode) {
      AppAlert.alert('Error', 'Item code not found.');
      return;
    }

    try {
      // Show the form immediately with its own loader while yarnitemshow is fetching.
      setIsLoading(false);
      setMainItemFormLoading(true);
      setCurrentScreen(activeTab === 'Spun' ? 'SPUN_FORM' : 'FILAMENT_FORM');

      const body = await getYarnItemShow(api, showParams(itmcode, strcode, userPtype));

      const mainItem = body?.data?.maindata?.[0];

      if (!body?.success || !mainItem) {
        AppAlert.alert('Warning', body?.message || 'Item details not found.');
        return;
      }

      const blendItems = mainBlendItems(mainItem, blenddata);

      // Match Count Type by id / name; when the loaded master cannot give its name + formula,
      // wait for a fresh yarncount and match against that response directly.
      const { countTypeId, countTypeName } = mainCountType(mainItem);
      let selectedCountObj = findCountType(Array.isArray(countdata) ? countdata : [], countTypeId, countTypeName);

      if (countTypeId && (!selectedCountObj?.name || !selectedCountObj?.formula)) {
        const freshCountData = await fetchBlendcount();
        if (Array.isArray(freshCountData) && freshCountData.length > 0) {
          selectedCountObj = findCountType(freshCountData, countTypeId, countTypeName);
        }
      }

      const baseForm = mainBaseForm(mainItem, itmcode, blendItems, selectedCountObj, plydata);

      if (activeTab === 'Spun') {
        setIsModifyMode(true);
        setselectedblend(blendItems);
        setSpunForm((prev) => ({
          ...prev,
          ...baseForm,
        }));
        setCurrentScreen('SPUN_FORM');
      } else {
        setIsModifyMode(true);
        setselectedfilamentblend(blendItems);
        setFilamentForm((prev) => ({
          ...prev,
          ...baseForm,
          ...filamentShowFields(mainItem, typedata, lustredata),
        }));
        setCurrentScreen('FILAMENT_FORM');
      }
    } catch (error) {
      console.log('yarnitemshow error:', error);
      setCurrentScreen('LIST');
      AppAlert.alert('Error', 'Unable to load item details.');
    } finally {
      setIsLoading(false);
      setMainItemFormLoading(false);
    }
  };

  /** POST yarnadd (add) / yarncreationmodify (modify) — Spun (legacy handleaddspun). */
  const handleaddspun = async () => {
    const userPtype = await getPrpType();
    const errorMessage = validateSpunForm(spunForm);
    if (errorMessage) {
      AppAlert.alert('Validation', errorMessage);
      return;
    }
    try {
      setIsLoading(true);
      const Payload = spunPayload(spunForm, userPtype, activeTab, FormState.values.yarnstrcode, isModifyMode);

      const body = isModifyMode ? await postYarnCreationModify(api, Payload) : await postYarnAdd(api, Payload);

      if (body?.success) {
        const savedItemCode = body?.data?.data?.itmcode || spunForm.ItmCode || spunForm.linkitmcode;

        AppAlert.alert(
          'Success',
          isModifyMode ? `Item ${savedItemCode} modified successfully.` : `Item ${savedItemCode} Saved successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setIsLoading(true);
                setSpunForm(emptySpunForm());
                setselectedblend([]);
                setCurrentScreen('LIST');
                fetchbrowse(activeTab);
                setIsLoading(false);
              },
            },
          ],
        );
      } else if (body?.success === false) {
        AppAlert.alert('Warning', body?.message);
      }
    } catch (error) {
      console.log('API yarnadd / yarncreationmodify error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** POST yarnadd (add) / yarncreationmodify (modify) — Filament (legacy handleaddfilament). */
  const handleaddfilament = async () => {
    const userPtype = await getPrpType();

    const errorMessage = validateFilamentForm(filamentForm);
    if (errorMessage) {
      AppAlert.alert('Validation', errorMessage);
      return;
    }

    try {
      setIsLoading(true);

      const Payload = filamentPayload(filamentForm, userPtype, activeTab, FormState.values.yarnstrcode, isModifyMode);

      const body = isModifyMode ? await postYarnCreationModify(api, Payload) : await postYarnAdd(api, Payload);

      if (body?.success === true) {
        const savedItemCode = body?.data?.data?.itmcode || filamentForm.ItmCode || filamentForm.linkitmcode;

        AppAlert.alert(
          'Success',
          isModifyMode ? `Item ${savedItemCode} modified successfully.` : `Item ${savedItemCode} saved successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setFilamentForm(emptyFilamentForm());
                setselectedfilamentblend([]);
                setCurrentScreen('LIST');
                setIsModifyMode(false);
                fetchbrowse(activeTab);
              },
            },
          ],
        );
      } else if (body?.success === false) {
        AppAlert.alert('Warning', body?.message);
      }
    } catch (error) {
      console.log('API error:', error);
      AppAlert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Sub items                                                           */
  /* ------------------------------------------------------------------ */

  /** "Create Sub Item" / "Browse Item" of a main item: open its Sub Item list. */
  const handleSubItemCreate = async (item: Row | null) => {
    closeActionMenu();
    setSubItemParent(item);
    setSubItemTab('LIST');
    setCurrentScreen('SUB_ITEM');
    await fetchSubItemList(item);
  };

  /** "Create New Sub Item": load the main item (yarnitemshow) and prefill the form. */
  const handleOpenSubItemForm = async (item: Row | null = subItemParent) => {
    const parentItem = item || subItemParent;
    if (!parentItem) {
      AppAlert.alert('Error', 'Main item not found.');
      return;
    }

    const mainCode = parentItem?.itmcode;
    const strcode = FormState.values.yarnstrcode;
    const userPtype = await getPrpType();

    if (!mainCode) {
      AppAlert.alert('Error', 'Main item code not found.');
      return;
    }

    try {
      // Show the CREATE form skeleton immediately.
      setSubItemFormLoading(true);

      setSubItemParent(parentItem);
      setModifyItemName('');
      setIsModifyMode(false);
      setSubItemTab('CREATE');
      setCurrentScreen('SUB_ITEM');

      // The main item code is sent as itmcode.
      const body = await getYarnItemShow(api, showParams(mainCode, strcode, userPtype));

      const showItem = body?.data?.maindata?.[0];

      if (!body?.success || !showItem) {
        AppAlert.alert('Warning', body?.message || 'Main item details not found.');
        return;
      }

      // Load the remaining masters; the fetchmitem (mapped_data) and fetchBlendcount (fresh
      // count rows) results are used by the mapping below.
      const [, mapped, freshCountData] = await Promise.all([
        soshow(),
        fetchmitem(),
        fetchBlendcount(),
        fetchBlendply(),
        fetchOthresdata(),
        fetchyarntype(),
      ]);

      const countMasterList: Row[] =
        Array.isArray(freshCountData) && freshCountData.length > 0
          ? freshCountData
          : Array.isArray(countdata)
            ? countdata
            : [];

      const next = subFormFromMainShow({ showItem, parentItem, mainCode, mapped, countMasterList, plydata });

      setBlendList(next.blendList);
      setsubitemform((prev) => ({
        ...prev,
        ...next.values,
      }));

      setSubItemFormLoading(false);
    } catch (error) {
      console.log('Create New Sub Item yarnitemshow error:', error);
      setSubItemFormLoading(false);
      setSubItemTab('LIST');
      setCurrentScreen('SUB_ITEM');
      AppAlert.alert('Error', 'Unable to load main item details.');
    }
  };

  /** Sub Item list → Modify: load the sub item (yarnitemshow) and map it into the form. */
  const handleSubItemModifyShow = async (item: Row | null) => {
    const parent = subItemParent;
    setModifyItemName(String(item?.WNameCode || item?.itmname || item?.ItmName || item?.name || 'Selected Sub Item'));
    const itmcode = item?.itmcode;
    const strcode = FormState.values.yarnstrcode;
    const userPtype = await getPrpType();

    if (!itmcode) {
      AppAlert.alert('Error', 'Sub item code not found.');
      return;
    }

    try {
      setIsLoading(true);

      const body = await getYarnItemShow(api, showParams(itmcode, strcode, userPtype));

      const showItem = body?.data?.maindata?.[0];

      if (!body?.success || !showItem) {
        AppAlert.alert('Warning', body?.message || 'Sub item details not found.');
        return;
      }

      setModifyItemName(
        String(showItem?.itmname || item?.WNameCode || item?.itmname || item?.ItmName || 'Selected Sub Item'),
      );

      // Restore Count Type + formula. When the loaded count master is stale / empty, fetch
      // yarncount and match against the fresh response.
      const { apiCountTypeId, apiCountTypeName } = subCountType(showItem);
      let matchedCountType = matchSubCountType(
        Array.isArray(countdata) ? countdata : [],
        apiCountTypeId,
        apiCountTypeName,
        { count: showItem?.count },
      );

      if (apiCountTypeId && (!matchedCountType?.name || !matchedCountType?.formula)) {
        const freshCountData = await fetchBlendcount();
        if (Array.isArray(freshCountData) && freshCountData.length > 0) {
          matchedCountType = matchSubCountType(freshCountData, apiCountTypeId, apiCountTypeName);
        }
      }

      const next = subFormFromSubShow({ showItem, item, parent, itmcode, matchedCountType, plydata });

      setBlendList(next.blendList);
      setsubitemform(next.update);

      setIsModifyMode(true);
      setSubItemTab('CREATE');
    } catch (error) {
      console.log('Sub Item Modify Show error:', error);
      AppAlert.alert('Error', 'Unable to load sub item details.');
    } finally {
      setIsLoading(false);
    }
  };

  /** OK of the add / modify success alerts: clear the form and return to the Sub Item list. */
  const afterSubItemSaved = () => {
    setsubitemform(emptySubItemForm());
    setBlendList([]);
    setIsModifyMode(false);
    setSubItemFormLoading(false);
    setSubItemTab('LIST');
    setCurrentScreen('SUB_ITEM');
    if (subItemParent?.itmcode) {
      fetchSubItemList(subItemParent);
    }
  };

  /** POST yarncreationmodify — update a sub item (legacy handleModifySubItem). */
  const handleModifySubItem = async () => {
    const userPtype = await getPrpType();
    const message = validateSubItem(subitemform, blendList);
    if (message) {
      AppAlert.alert('Validation', message);
      return;
    }

    try {
      setSubItemSaveLoading(true);

      const Payload = subItemModifyPayload(subitemform, blendList, userPtype, FormState.values.yarnstrcode);

      const body = await postYarnCreationModify(api, Payload);

      if (body?.success) {
        const savedItemCode = body?.data?.data?.itmcode || subitemform.ItmCode || '';

        AppAlert.alert('Success', `Sub Item ${savedItemCode} updated successfully.`, [
          { text: 'OK', onPress: afterSubItemSaved },
        ]);
      } else {
        AppAlert.alert('Warning', body?.message || 'Unable to update Sub Item.');
      }
    } catch (error) {
      console.log('Sub Item modify error:', error);
      AppAlert.alert('Error', 'Unable to update Sub Item.');
    } finally {
      setSubItemSaveLoading(false);
    }
  };

  /** POST addyarnsubitem — create a sub item (legacy handlesubitemadd). */
  const handlesubitemadd = async () => {
    const userPtype = await getPrpType();
    const message = validateSubItem(subitemform, blendList);
    if (message) {
      AppAlert.alert('Validation', message);
      return;
    }

    try {
      setSubItemSaveLoading(true);
      const Payload = subItemAddPayload(subitemform, blendList, userPtype, FormState.values.yarnstrcode);

      const body = await postAddYarnSubItem(api, Payload);

      if (body?.success) {
        const newItemCode = body?.data?.data?.itmcode;
        AppAlert.alert('Success', `Item ${newItemCode} Saved successfully.`, [
          // Legacy also called setIsLoading(true) here and never cleared it, which left the
          // Sub Item list stuck on its skeleton after an add; the list's own loader is used instead.
          { text: 'OK', onPress: afterSubItemSaved },
        ]);
      } else if (body?.success === false) {
        AppAlert.alert('Warning', body?.message);
      }
    } catch (error) {
      console.log('API addyarnsubitem error:', error);
    } finally {
      setSubItemSaveLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Party mapping                                                       */
  /* ------------------------------------------------------------------ */

  /** Sub Item list → Browse Item: open the party mapping of the sub item. */
  const handleBrowseItem = async (item: Row | null) => {
    closeActionMenu();

    // Remember that it was opened from the Sub Item LIST so Back / Cancel returns there.
    const openedFromSubItemList = currentScreen === 'SUB_ITEM' && subItemTab === 'LIST';
    setPartyReturnToSubItemList(openedFromSubItemList);
    setBrowseParentItem(item);
    setSelectedBrowseItem(item);
    await fetchpartydata();
    await fetchpartybrowse(activeTab, item?.itmcode);

    setpartyForm(emptyPartyForm());
    setCurrentScreen('PARTY');
  };

  /** POST yarnitemd1add — map the party's item name to the selected sub item (legacy handleaddparty). */
  const handleaddparty = async () => {
    const userPtype = await getPrpType();
    const message = validatePartyItem(partyForm);
    if (message) {
      AppAlert.alert('Validation', message);
      return;
    }
    if (!selectedBrowseItem?.itmcode) {
      AppAlert.alert('Error', 'Please select item from list');
      return;
    }
    try {
      setIsLoading(true);
      const Payload = partyAddPayload(
        partyForm,
        selectedBrowseItem,
        userPtype,
        subitemform,
        FormState.values.yarnstrcode,
      );

      const body = await postYarnItemD1Add(api, Payload);

      if (body?.success) {
        AppAlert.alert('Success', `Item Saved successfully.`, [
          {
            text: 'OK',
            onPress: async () => {
              setpartyForm(emptyPartyForm());

              await fetchpartybrowse(activeTab, selectedBrowseItem?.itmcode);
            },
          },
        ]);
      } else if (body?.success === false) {
        AppAlert.alert('Warning', body?.message);
      }
    } catch (error) {
      console.log('API yarnitemd1add error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Effects                                                             */
  /* ------------------------------------------------------------------ */

  // Mount + tab change: defaults first, then the main list.
  useEffect(() => {
    if (!token) return;
    const loadData = async () => {
      await soshow();
      await fetchbrowse(activeTab);
    };

    loadData();
  }, [activeTab, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Master lists of the main Spun / Filament forms (never prefetched for the other steps).
  useEffect(() => {
    if (!token) return;

    if (currentScreen !== 'SPUN_FORM' && currentScreen !== 'FILAMENT_FORM') {
      return;
    }

    if (FormState.values.prpcode && FormState.values.yarnstrcode) {
      fetchBlenddata();
      fetchBlendcount();
      fetchBlendply();
      fetchtype();
      fetchlustre();
      fetchOthresdata();
      fetchItemdata();
    }
  }, [FormState.values.prpcode, FormState.values.yarnstrcode, activeTab, token, currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android hardware back for the in-component steps (re-subscribed every render so the
  // handlers always see the current state).
  useEffect(() => {
    if (currentScreen === 'LIST') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'SUB_ITEM') {
        if (subItemTab === 'CREATE') {
          goBackFromSubItemForm();
        } else {
          goToSubItemMainList();
        }
      } else if (currentScreen === 'PARTY') {
        goBackFromParty();
      } else {
        goToListScreen();
      }
      return true;
    });

    return () => subscription.remove();
  });

  const filteredData = useMemo(() => filterMainItems(data, cardSearch), [data, cardSearch]);

  const onTab = (tab: YarnTab) => {
    setActiveTab(tab);
    setdata([]);
    setCurrentScreen('LIST');
    fetchbrowse(tab);
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  const isMainForm = currentScreen === 'SPUN_FORM' || currentScreen === 'FILAMENT_FORM';
  const isSpunForm = currentScreen === 'SPUN_FORM';
  const subList = currentScreen === 'SUB_ITEM' && subItemTab === 'LIST';
  const openMenu = (item: Row) => {
    setActionItem(item);
    setShowActionMenu(true);
  };

  return (
    <View style={y.root}>
      {isMainForm ? (
        <MainItemForm
          isSpun={isSpunForm}
          isModifyMode={isModifyMode}
          modifyItemName={modifyItemName}
          form={isSpunForm ? spunForm : filamentForm}
          setForm={isSpunForm ? setSpunForm : setFilamentForm}
          selectedBlend={isSpunForm ? selectedblend : selectedfilamentblend}
          setSelectedBlend={isSpunForm ? setselectedblend : setselectedfilamentblend}
          blenddata={blenddata}
          countdata={countdata}
          plydata={plydata}
          typedata={typedata}
          lustredata={lustredata}
          loadingItem={mainItemFormLoading}
          onBack={goToListScreen}
          onSubmit={isSpunForm ? handleaddspun : handleaddfilament}
        />
      ) : subList ? (
        <SubItemList
          mode="manage"
          parent={subItemParent}
          rows={browsedata}
          loading={isLoading || subItemListLoading}
          refreshing={refreshing}
          onRefresh={() => {
            if (!subItemParent?.itmcode) {
              setRefreshing(false);
              return;
            }
            setRefreshing(true);
            fetchSubItemList(subItemParent);
          }}
          onBack={goToSubItemMainList}
          onRowAction={openMenu}
          onFooter={() => handleOpenSubItemForm(subItemParent)}
        />
      ) : currentScreen === 'SUB_ITEM' ? (
        <SubItemForm
          isModifyMode={isModifyMode}
          modifyItemName={modifyItemName}
          form={subitemform}
          setForm={setsubitemform}
          blendList={blendList}
          setBlendList={setBlendList}
          subitemtypedata={subitemtypedata}
          formLoading={subItemFormLoading}
          saving={subItemSaveLoading}
          submitDisabled={isLoading}
          onBack={goBackFromSubItemForm}
          onSubmit={isModifyMode ? handleModifySubItem : handlesubitemadd}
        />
      ) : currentScreen === 'BROWSE' ? (
        <SubItemList
          mode="browse"
          parent={browseParentItem}
          rows={browsedata}
          loading={subItemListLoading}
          refreshing={refreshing}
          onRefresh={() => {
            if (!browseParentItem?.itmcode) {
              setRefreshing(false);
              return;
            }
            setRefreshing(true);
            fetchbrowsedata(browseParentItem);
          }}
          onBack={goToListScreen}
          onRowAction={async (item) => {
            setSelectedBrowseItem(item);
            await fetchpartydata();
            await fetchpartybrowse(activeTab, item.itmcode);
            setCurrentScreen('PARTY');
          }}
          onFooter={goToListScreen}
        />
      ) : currentScreen === 'PARTY' ? (
        <PartyStep
          item={browseParentItem}
          partydata={partydata}
          partyForm={partyForm}
          setPartyForm={setpartyForm}
          rows={browserpartydata}
          onBack={goBackFromParty}
          onAdd={handleaddparty}
        />
      ) : (
        <MainList
          activeTab={activeTab}
          onTab={onTab}
          search={cardSearch}
          onSearch={setCardSearch}
          rows={filteredData}
          loading={isLoading}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchbrowse(activeTab);
          }}
          onAdd={handleAddClick}
          onMenu={openMenu}
        />
      )}

      {/* Main item actions (LIST step). */}
      <ActionSheet
        open={currentScreen === 'LIST' && showActionMenu && !!actionItem}
        onClose={closeActionMenu}
        title="Item Actions"
        subtitle={actionItem?.WNameCode || actionItem?.mitmcode || 'Selected yarn item'}
        actions={[
          { icon: 'edit', label: 'Modify Main Item', onPress: () => handleModifyItem(actionItem) },
          { icon: 'add-box', label: 'Create Sub Item', onPress: () => handleSubItemCreate(actionItem) },
          // Browse Item opens the same Sub Items list as Create Sub Item (legacy).
          { icon: 'folder-open', label: 'Browse Item', onPress: () => handleSubItemCreate(actionItem) },
          {
            icon: 'delete-outline',
            label: 'Delete Item',
            danger: true,
            onPress: () => {
              const item = actionItem;
              closeActionMenu();
              del.askDelete(item, 'MAIN');
            },
          },
        ]}
      />

      {/* Sub item actions (SUB_ITEM / LIST step). */}
      <ActionSheet
        open={subList && showActionMenu && !!actionItem?.itmcode}
        onClose={closeActionMenu}
        title="Sub Item Actions"
        subtitle={actionItem?.WNameCode || actionItem?.itmname || 'Selected sub item'}
        actions={[
          {
            icon: 'edit',
            label: 'Modify',
            onPress: () => {
              setShowActionMenu(false);
              handleSubItemModifyShow(actionItem);
            },
          },
          {
            icon: 'folder-open',
            label: 'Browse Item',
            onPress: () => {
              setShowActionMenu(false);
              handleBrowseItem(actionItem);
            },
          },
          {
            icon: 'delete-outline',
            label: 'Delete',
            danger: true,
            onPress: () => {
              const item = actionItem;
              closeActionMenu();
              del.askDelete(item, 'SUB');
            },
          },
        ]}
      />

      {/* Delete confirmation + API result — above every step. */}
      {del.sheets}
    </View>
  );
}
