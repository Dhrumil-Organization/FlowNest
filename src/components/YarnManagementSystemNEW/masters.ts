// FILE: src/components/YarnManagementSystemNEW/masters.ts
// Defaults + master lists of the Yarn Management System as one hook (part of the index.tsx state
// machine, split out only to keep index readable). Each function is the legacy fetch of the same
// name: it reads AsyncStorage 'user_prptype' first, raises the shared isLoading flag, calls the
// endpoint and stores body.data.data (or [] when success is false / the list is empty).
// Like legacy, the functions read `activeTab` and the defaults (`FormState`) from the render
// they were created in.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useState } from 'react';
import {
  Api,
  getItems,
  getParties,
  getYarnBlend,
  getYarnCount,
  getYarnDefault,
  getYarnLustre,
  getYarnMasterItems,
  getYarnOther,
  getYarnPly,
  getYarnType,
  getYarnTypeSubItem,
} from './api';
import { defaultPayload, itemParams, masterItemParams, masterParams, partyParams, Row, YarnTab } from './model';

export const getPrpType = () => AsyncStorage.getItem('user_prptype');

export function useYarnMasters(api: Api, activeTab: YarnTab, setIsLoading: (v: boolean) => void) {
  // prpcode / yarnstrcode / yearno from getyarndefault (legacy FormState.values).
  const [FormState, setFormState] = useState<{ values: Row }>({
    values: { prpcode: '', yarnstrcode: '', yearno: '' },
  });
  const [blenddata, setblenddata] = useState<Row[]>([]);
  const [countdata, setcountdata] = useState<Row[]>([]);
  const [plydata, setplydata] = useState<Row[]>([]);
  const [typedata, settypedata] = useState<Row[]>([]);
  const [lustredata, setlustredata] = useState<Row[]>([]);
  const [othersdata, setothersdata] = useState<Row[]>([]);
  const [itemdata, setitemdata] = useState<Row[]>([]);
  const [mitemdata, setmitemdata] = useState<Row[]>([]);
  const [mappedData, setMappedData] = useState<Row[]>([]);
  const [subitemtypedata, setsubitemtypedata] = useState<Row[]>([]);
  const [partydata, setpartydata] = useState<Row[]>([]);

  /** POST getyarndefault → default property / yarn store / year (legacy soshow). */
  const soshow = async () => {
    const userPtype = await getPrpType();

    try {
      setIsLoading(true);

      const body = await getYarnDefault(api, defaultPayload(userPtype));

      const main = body?.data?.main || {};

      if (body?.success && main) {
        setFormState((prev) => ({
          ...prev,
          values: {
            ...prev.values,
            prpcode: main.prpcode || '',
            yarnstrcode: main.yarnstrcode || '',
            yearno: main.yearno || '',
          },
        }));
      }
    } catch (error) {
      console.log('API getyarndefault error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Shared body of legacy fetchBlenddata / fetchBlendply / fetchtype / fetchlustre /
   *  fetchOthresdata / fetchyarntype. */
  const loadMaster = async (call: (a: Api, params: Row) => Promise<any>, set: (rows: Row[]) => void, tag: string) => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await call(api, masterParams(userPtype, activeTab));

      const rows = body?.data?.data || [];
      if (body?.success && body?.data?.data?.length > 0) {
        set(rows);
      } else {
        set([]);
      }
    } catch (error) {
      console.log(`API ${tag} error:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlenddata = () => loadMaster(getYarnBlend, setblenddata, 'yarnblend');
  const fetchBlendply = () => loadMaster(getYarnPly, setplydata, 'yarnply');
  const fetchtype = () => loadMaster(getYarnType, settypedata, 'yarntype');
  const fetchlustre = () => loadMaster(getYarnLustre, setlustredata, 'yarnlustre');
  const fetchOthresdata = () => loadMaster(getYarnOther, setothersdata, 'yarnother');
  const fetchyarntype = () => loadMaster(getYarnTypeSubItem, setsubitemtypedata, 'yarntypesubitem');

  /** GET yarncount. Also RETURNS the fresh rows — callers must not read `countdata` right after
   *  this call because the state is not committed yet (legacy fetchBlendcount). */
  const fetchBlendcount = async (): Promise<Row[]> => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getYarnCount(api, masterParams(userPtype, activeTab));

      const rows = Array.isArray(body?.data?.data) ? body.data.data : [];

      if (body?.success && rows.length > 0) {
        setcountdata(rows);
        return rows;
      }

      setcountdata([]);
      return [];
    } catch (error) {
      console.log('API getyarncount error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /** GET getyarnmasteritem for the sub item form; returns mapped_data only on success (legacy fetchmitem). */
  const fetchmitem = async (): Promise<Row[] | undefined> => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getYarnMasterItems(api, masterItemParams(userPtype, FormState.values.yarnstrcode, activeTab));

      const rows = body?.data?.data || [];
      const mapped = body?.data?.mapped_data || [];
      if (body?.success && body?.data?.data?.length > 0) {
        setmitemdata(rows);
        setMappedData(mapped);

        return mapped;
      } else {
        setmitemdata([]);
        setMappedData([]);
      }
    } catch (error) {
      console.log('API getyarnmasteritem error:', error);
    } finally {
      setIsLoading(false);
    }
    return undefined;
  };

  /** GET getitem — link item master, loaded together with the main forms (legacy fetchItemdata). */
  const fetchItemdata = async () => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getItems(api, itemParams(userPtype, FormState.values));

      const rows = body.response.data || [];
      if (body?.success && body.response.data.length > 0) {
        setitemdata(rows);
      } else {
        setitemdata([]);
      }
    } catch (error) {
      console.log('API getitem error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** GET accountbasic — parties of the PARTY step (legacy fetchpartydata). */
  const fetchpartydata = async () => {
    const userPtype = await getPrpType();
    try {
      setIsLoading(true);

      const body = await getParties(api, partyParams(userPtype, FormState.values));

      const rows = body?.response?.data || [];
      if (body?.success && body?.response?.data?.length > 0) {
        setpartydata(rows);
      } else {
        setpartydata([]);
      }
    } catch (error) {
      console.log('API accountbasic error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    FormState,
    blenddata,
    countdata,
    plydata,
    typedata,
    lustredata,
    othersdata,
    itemdata,
    mitemdata,
    mappedData,
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
  };
}
